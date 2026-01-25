import {describe, expect, it, vi} from 'vitest'

import {type TransformResult} from '../documentTransformer'
import {importDocuments, previewImport, uploadImage, uploadImages} from '../importEngine'

// Noop function for mock implementations
const noop = () => {
  /* intentionally empty */
}

// Mock SanityClient
function createMockClient(overrides: Record<string, unknown> = {}) {
  return {
    getDocument: vi.fn().mockResolvedValue(null),
    fetch: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((doc) => Promise.resolve({...doc, _id: 'new-doc-id'})),
    patch: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        commit: vi.fn().mockResolvedValue({_id: 'updated-doc-id'}),
      }),
    }),
    assets: {
      upload: vi.fn().mockResolvedValue({_id: 'image-asset-id'}),
    },
    ...overrides,
  }
}

describe('importDocuments', () => {
  it('should create documents for valid transform results', async () => {
    const client = createMockClient()
    const results: TransformResult[] = [
      {
        success: true,
        document: {_type: 'post', title: 'Test Post'},
        errors: [],
        warnings: [],
      },
    ]

    const summary = await importDocuments(results, {
      client: client as never,
      documentType: 'post',
      duplicateStrategy: 'create',
    })

    expect(summary.total).toBe(1)
    expect(summary.created).toBe(1)
    expect(summary.failed).toBe(0)
    expect(client.create).toHaveBeenCalledWith({_type: 'post', title: 'Test Post'})
  })

  it('should skip failed transform results', async () => {
    const client = createMockClient()
    const results: TransformResult[] = [
      {
        success: false,
        document: null,
        errors: ['Invalid data'],
        warnings: [],
      },
    ]

    const summary = await importDocuments(results, {
      client: client as never,
      documentType: 'post',
      duplicateStrategy: 'create',
    })

    expect(summary.total).toBe(1)
    expect(summary.failed).toBe(1)
    expect(summary.created).toBe(0)
    expect(client.create).not.toHaveBeenCalled()
  })

  it('should skip existing documents with skip strategy when _id matches', async () => {
    // Note: Skip strategy only works when document has explicit _id
    const client = createMockClient({
      getDocument: vi.fn().mockResolvedValue({_id: 'existing-doc', _type: 'post', title: 'Old'}),
    })
    const results: TransformResult[] = [
      {
        success: true,
        document: {_id: 'existing-doc', _type: 'post', title: 'Test'},
        errors: [],
        warnings: [],
      },
    ]

    const summary = await importDocuments(results, {
      client: client as never,
      documentType: 'post',
      duplicateStrategy: 'skip',
    })

    expect(summary.skipped).toBe(1)
    expect(summary.created).toBe(0)
    expect(client.create).not.toHaveBeenCalled()
  })

  it('should create documents with skip strategy when no _id is provided', async () => {
    // Without _id, skip strategy falls back to create
    const client = createMockClient()
    const results: TransformResult[] = [
      {
        success: true,
        document: {_type: 'post', title: 'Test', slug: {_type: 'slug', current: 'test'}},
        errors: [],
        warnings: [],
      },
    ]

    const summary = await importDocuments(results, {
      client: client as never,
      documentType: 'post',
      duplicateStrategy: 'skip',
    })

    // Without _id, document is created (no duplicate detection)
    expect(summary.created).toBe(1)
    expect(client.create).toHaveBeenCalled()
  })

  it('should update existing documents with update strategy when _id matches', async () => {
    // Note: Update strategy requires explicit _id to match documents
    const client = createMockClient({
      getDocument: vi.fn().mockResolvedValue({_id: 'existing-doc', _type: 'post', title: 'Old'}),
    })
    const results: TransformResult[] = [
      {
        success: true,
        document: {_id: 'existing-doc', _type: 'post', title: 'Updated Title'},
        errors: [],
        warnings: [],
      },
    ]

    const summary = await importDocuments(results, {
      client: client as never,
      documentType: 'post',
      duplicateStrategy: 'update',
    })

    // Document found by _id and patched - counts as updated
    expect(summary.updated).toBe(1)
    expect(client.patch).toHaveBeenCalledWith('existing-doc')
  })

  it('should create documents with update strategy when no _id is provided', async () => {
    // Without _id, update strategy falls back to create
    const client = createMockClient()
    const results: TransformResult[] = [
      {
        success: true,
        document: {_type: 'post', title: 'New Post', slug: {_type: 'slug', current: 'test'}},
        errors: [],
        warnings: [],
      },
    ]

    const summary = await importDocuments(results, {
      client: client as never,
      documentType: 'post',
      duplicateStrategy: 'update',
    })

    // Without _id, document is created (no duplicate detection)
    expect(summary.created).toBe(1)
    expect(client.create).toHaveBeenCalled()
  })

  it('should create new documents with create strategy even for duplicates', async () => {
    const client = createMockClient({
      fetch: vi.fn().mockResolvedValue('existing-id'),
    })
    const results: TransformResult[] = [
      {
        success: true,
        document: {_type: 'post', title: 'Test', slug: {_type: 'slug', current: 'test'}},
        errors: [],
        warnings: [],
      },
    ]

    const summary = await importDocuments(results, {
      client: client as never,
      documentType: 'post',
      duplicateStrategy: 'create',
    })

    expect(summary.created).toBe(1)
    expect(client.create).toHaveBeenCalled()
  })

  it('should call onProgress callback', async () => {
    const client = createMockClient()
    const onProgress = vi.fn()
    const results: TransformResult[] = [
      {success: true, document: {_type: 'post', title: 'Test 1'}, errors: [], warnings: []},
      {success: true, document: {_type: 'post', title: 'Test 2'}, errors: [], warnings: []},
    ]

    await importDocuments(results, {
      client: client as never,
      documentType: 'post',
      duplicateStrategy: 'create',
      batchSize: 1,
      onProgress,
    })

    expect(onProgress).toHaveBeenCalled()
  })

  it('should process documents in batches', async () => {
    const client = createMockClient()
    const results: TransformResult[] = Array.from({length: 25}, (_, i) => ({
      success: true,
      document: {_type: 'post', title: `Post ${i}`},
      errors: [],
      warnings: [],
    }))

    const summary = await importDocuments(results, {
      client: client as never,
      documentType: 'post',
      duplicateStrategy: 'create',
      batchSize: 10,
    })

    expect(summary.total).toBe(25)
    expect(summary.created).toBe(25)
  })

  it('should handle errors during document creation', async () => {
    const client = createMockClient({
      create: vi.fn().mockRejectedValue(new Error('Network error')),
    })
    const results: TransformResult[] = [
      {success: true, document: {_type: 'post', title: 'Test'}, errors: [], warnings: []},
    ]

    const summary = await importDocuments(results, {
      client: client as never,
      documentType: 'post',
      duplicateStrategy: 'create',
    })

    expect(summary.failed).toBe(1)
    expect(summary.results[0].error).toBe('Network error')
  })

  it('should check for existing document by _id', async () => {
    const client = createMockClient({
      getDocument: vi.fn().mockResolvedValue({_id: 'custom-id', _type: 'post'}),
    })
    const results: TransformResult[] = [
      {
        success: true,
        document: {_id: 'custom-id', _type: 'post', title: 'Test'},
        errors: [],
        warnings: [],
      },
    ]

    const summary = await importDocuments(results, {
      client: client as never,
      documentType: 'post',
      duplicateStrategy: 'skip',
    })

    expect(client.getDocument).toHaveBeenCalledWith('custom-id')
    expect(summary.skipped).toBe(1)
  })

  it('should count updated docs when document has explicit _id', async () => {
    const client = createMockClient({
      getDocument: vi.fn().mockResolvedValue({_id: 'doc-123', _type: 'post'}),
    })
    const results: TransformResult[] = [
      {
        success: true,
        document: {_id: 'doc-123', _type: 'post', title: 'Updated'},
        errors: [],
        warnings: [],
      },
    ]

    const summary = await importDocuments(results, {
      client: client as never,
      documentType: 'post',
      duplicateStrategy: 'update',
    })

    expect(summary.updated).toBe(1)
  })

  // Note: Unique field lookup (by slug, email, etc.) is not currently implemented.
  // Duplicate detection only works when documents have explicit _id fields.
  // Future enhancement: Add uniqueField option to ImportOptions for field-based matching.
})

describe('uploadImage', () => {
  it('should upload image and return asset ID', async () => {
    const client = createMockClient()
    const file = new File(['test'], 'test.jpg', {type: 'image/jpeg'})

    const assetId = await uploadImage(client as never, file)

    expect(assetId).toBe('image-asset-id')
    expect(client.assets.upload).toHaveBeenCalledWith('image', file, {filename: 'test.jpg'})
  })
})

describe('uploadImages', () => {
  it('should upload multiple images', async () => {
    const client = createMockClient({
      assets: {
        upload: vi
          .fn()
          .mockResolvedValueOnce({_id: 'asset-1'})
          .mockResolvedValueOnce({_id: 'asset-2'}),
      },
    })
    const files = [
      new File(['test1'], 'image1.jpg', {type: 'image/jpeg'}),
      new File(['test2'], 'image2.jpg', {type: 'image/jpeg'}),
    ]

    const result = await uploadImages(client as never, files)

    expect(result.size).toBe(2)
    expect(result.get('image1.jpg')).toBe('asset-1')
    expect(result.get('image2.jpg')).toBe('asset-2')
  })

  it('should call onProgress for each upload', async () => {
    const client = createMockClient()
    const onProgress = vi.fn()
    const files = [
      new File(['test1'], 'image1.jpg', {type: 'image/jpeg'}),
      new File(['test2'], 'image2.jpg', {type: 'image/jpeg'}),
    ]

    await uploadImages(client as never, files, onProgress)

    expect(onProgress).toHaveBeenCalledWith(1, 2)
    expect(onProgress).toHaveBeenCalledWith(2, 2)
  })

  it('should continue on upload error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(noop)
    const client = createMockClient({
      assets: {
        upload: vi
          .fn()
          .mockRejectedValueOnce(new Error('Upload failed'))
          .mockResolvedValueOnce({_id: 'asset-2'}),
      },
    })
    const files = [
      new File(['test1'], 'image1.jpg', {type: 'image/jpeg'}),
      new File(['test2'], 'image2.jpg', {type: 'image/jpeg'}),
    ]

    const result = await uploadImages(client as never, files)

    expect(result.size).toBe(1)
    expect(result.get('image2.jpg')).toBe('asset-2')
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('previewImport', () => {
  it('should count valid and invalid results', async () => {
    const client = createMockClient()
    const results: TransformResult[] = [
      {success: true, document: {_type: 'post', title: 'Valid'}, errors: [], warnings: []},
      {success: false, document: null, errors: ['Error'], warnings: []},
      {success: true, document: {_type: 'post', title: 'Valid 2'}, errors: [], warnings: []},
    ]

    const preview = await previewImport(results, client as never)

    expect(preview.valid).toBe(2)
    expect(preview.invalid).toBe(1)
  })

  it('should check resolvable references', async () => {
    const client = createMockClient({
      fetch: vi.fn().mockResolvedValue('resolved-id'),
    })
    const results: TransformResult[] = [
      {
        success: true,
        document: {
          _type: 'post',
          author: {_type: 'reference', _ref: '__RESOLVE__john__BY__name__TYPE__author'},
        },
        errors: [],
        warnings: [],
      },
    ]

    const preview = await previewImport(results, client as never)

    expect(preview.referencesResolvable).toBe(1)
    expect(preview.referencesUnresolvable).toBe(0)
  })

  it('should count unresolvable references', async () => {
    const client = createMockClient({
      fetch: vi.fn().mockResolvedValue(null),
    })
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(noop)

    const results: TransformResult[] = [
      {
        success: true,
        document: {
          _type: 'post',
          author: {_type: 'reference', _ref: '__RESOLVE__unknown__BY__name__TYPE__author'},
        },
        errors: [],
        warnings: [],
      },
    ]

    const preview = await previewImport(results, client as never)

    expect(preview.referencesResolvable).toBe(0)
    expect(preview.referencesUnresolvable).toBe(1)
    consoleWarn.mockRestore()
  })

  it('should use reference cache on second lookup', async () => {
    const fetchMock = vi.fn().mockResolvedValue('cached-id')
    const client = createMockClient({
      fetch: fetchMock,
    })
    const results: TransformResult[] = [
      {
        success: true,
        document: {
          _type: 'post',
          author: {_type: 'reference', _ref: '__RESOLVE__john__BY__name__TYPE__author'},
        },
        errors: [],
        warnings: [],
      },
      {
        success: true,
        document: {
          _type: 'post',
          author: {_type: 'reference', _ref: '__RESOLVE__john__BY__name__TYPE__author'},
        },
        errors: [],
        warnings: [],
      },
    ]

    await previewImport(results, client as never)

    // Should only fetch once due to caching
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('document resolution', () => {
  it('should resolve array references', async () => {
    const client = createMockClient({
      fetch: vi.fn().mockResolvedValue('resolved-id'),
    })
    const results: TransformResult[] = [
      {
        success: true,
        document: {
          _type: 'post',
          categories: [
            {_type: 'reference', _ref: '__RESOLVE__cat1__BY__slug__TYPE__category'},
            {_type: 'reference', _ref: '__RESOLVE__cat2__BY__slug__TYPE__category'},
          ],
        },
        errors: [],
        warnings: [],
      },
    ]

    const summary = await importDocuments(results, {
      client: client as never,
      documentType: 'post',
      duplicateStrategy: 'create',
    })

    expect(summary.created).toBe(1)
  })

  it('should handle nested object references', async () => {
    const client = createMockClient({
      fetch: vi.fn().mockResolvedValue('nested-id'),
    })
    const results: TransformResult[] = [
      {
        success: true,
        document: {
          _type: 'post',
          metadata: {
            author: {_type: 'reference', _ref: '__RESOLVE__jane__BY__email__TYPE__person'},
          },
        },
        errors: [],
        warnings: [],
      },
    ]

    const summary = await importDocuments(results, {
      client: client as never,
      documentType: 'post',
      duplicateStrategy: 'create',
    })

    expect(summary.created).toBe(1)
  })

  it('should handle malformed reference placeholder', async () => {
    const client = createMockClient()
    const results: TransformResult[] = [
      {
        success: true,
        document: {
          _type: 'post',
          author: {_type: 'reference', _ref: '__RESOLVE__malformed'},
        },
        errors: [],
        warnings: [],
      },
    ]

    const preview = await previewImport(results, client as never)

    // Malformed placeholder returns unresolvable
    expect(preview.referencesUnresolvable).toBe(1)
  })

  it('should filter out null from unresolved array references', async () => {
    const client = createMockClient({
      fetch: vi.fn().mockResolvedValueOnce('found-id').mockResolvedValueOnce(null),
    })
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(noop)

    const results: TransformResult[] = [
      {
        success: true,
        document: {
          _type: 'post',
          categories: [
            {_type: 'reference', _ref: '__RESOLVE__found__BY__slug__TYPE__category'},
            {_type: 'reference', _ref: '__RESOLVE__notfound__BY__slug__TYPE__category'},
          ],
        },
        errors: [],
        warnings: [],
      },
    ]

    const summary = await importDocuments(results, {
      client: client as never,
      documentType: 'post',
      duplicateStrategy: 'create',
    })

    expect(summary.created).toBe(1)
    consoleWarn.mockRestore()
  })
})
