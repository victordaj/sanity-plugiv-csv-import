import {describe, expect, it} from 'vitest'

import {type ReferenceMatchConfig} from '../../components/ReferenceConfig'
import {type TransformOptions, transformAllRows, transformRow} from '../documentTransformer'
import {type SchemaField} from '../schemaUtils'

// Helper to create schema fields
function createField(overrides: Partial<SchemaField> = {}): SchemaField {
  return {
    name: 'testField',
    path: 'testField',
    type: 'string',
    title: 'Test Field',
    required: false,
    isArray: false,
    isReference: false,
    isImage: false,
    ...overrides,
  }
}

// Helper to create transform options
function createOptions(overrides: Partial<TransformOptions> = {}): TransformOptions {
  return {
    schemaFields: [],
    referenceConfig: [],
    documentType: 'post',
    uploadedImages: new Map(),
    ...overrides,
  }
}

describe('documentTransformer', () => {
  describe('transformRow', () => {
    it('should create document with correct _type', () => {
      const row = {title: 'Hello'}
      const options = createOptions({
        schemaFields: [createField({name: 'title', path: 'title'})],
        documentType: 'article',
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?._type).toBe('article')
    })

    it('should transform string fields', () => {
      const row = {title: '  Hello World  '}
      const options = createOptions({
        schemaFields: [createField({name: 'title', path: 'title', type: 'string'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?.title).toBe('Hello World')
    })

    it('should transform number fields', () => {
      const row = {count: '42'}
      const options = createOptions({
        schemaFields: [createField({name: 'count', path: 'count', type: 'number'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?.count).toBe(42)
    })

    it('should handle invalid number fields', () => {
      const row = {count: 'not-a-number'}
      const options = createOptions({
        schemaFields: [createField({name: 'count', path: 'count', type: 'number'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('invalid number')
    })

    it('should transform boolean fields', () => {
      const truthy = ['true', 'TRUE', '1', 'yes', 'Yes', 'Y']
      const falsy = ['false', 'FALSE', '0', 'no', 'No', 'N', '']

      for (const val of truthy) {
        const row = {active: val}
        const options = createOptions({
          schemaFields: [createField({name: 'active', path: 'active', type: 'boolean'})],
        })
        const result = transformRow(row, 0, options)
        expect(result.document?.active).toBe(true)
      }

      for (const val of falsy) {
        const row = {active: val}
        const options = createOptions({
          schemaFields: [createField({name: 'active', path: 'active', type: 'boolean'})],
        })
        const result = transformRow(row, 0, options)
        // Empty string returns undefined, other falsy values return false
        if (val === '') {
          expect(result.document?.active).toBeUndefined()
        } else {
          expect(result.document?.active).toBe(false)
        }
      }
    })

    it('should transform slug fields', () => {
      const row = {slug: 'my-article-slug'}
      const options = createOptions({
        schemaFields: [createField({name: 'slug', path: 'slug', type: 'slug'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?.slug).toEqual({_type: 'slug', current: 'my-article-slug'})
    })

    it('should transform date fields with valid ISO format', () => {
      const row = {publishedAt: '2024-01-15'}
      const options = createOptions({
        schemaFields: [createField({name: 'publishedAt', path: 'publishedAt', type: 'date'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?.publishedAt).toBe('2024-01-15')
    })

    it('should transform datetime fields with valid ISO format', () => {
      const row = {createdAt: '2024-01-15T10:30:00'}
      const options = createOptions({
        schemaFields: [createField({name: 'createdAt', path: 'createdAt', type: 'datetime'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?.createdAt).toBe('2024-01-15T10:30:00')
    })

    it('should handle invalid date format', () => {
      const row = {publishedAt: '15/01/2024'}
      const options = createOptions({
        schemaFields: [createField({name: 'publishedAt', path: 'publishedAt', type: 'date'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('invalid date format')
    })

    it('should handle required fields', () => {
      const row = {title: ''}
      const options = createOptions({
        schemaFields: [createField({name: 'title', path: 'title', required: true})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('required but empty')
    })

    it('should handle _id from CSV', () => {
      const row = {_id: 'existing-doc-id', title: 'Hello'}
      const options = createOptions({
        schemaFields: [createField({name: 'title', path: 'title'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?._id).toBe('existing-doc-id')
    })

    it('should handle nested fields with dot notation', () => {
      const row = {'seo.title': 'SEO Title', 'seo.description': 'SEO Description'}
      const options = createOptions({
        schemaFields: [
          createField({name: 'title', path: 'seo.title', type: 'string'}),
          createField({name: 'description', path: 'seo.description', type: 'string'}),
        ],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      const seo = result.document?.seo as {title: string; description: string}
      expect(seo.title).toBe('SEO Title')
      expect(seo.description).toBe('SEO Description')
    })

    it('should handle array fields', () => {
      const row = {tags: 'tag1, tag2, tag3'}
      const options = createOptions({
        schemaFields: [createField({name: 'tags', path: 'tags', type: 'string', isArray: true})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?.tags).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('should handle URL fields with validation', () => {
      const validRow = {website: 'https://example.com'}
      const invalidRow = {website: 'not-a-url'}

      const options = createOptions({
        schemaFields: [createField({name: 'website', path: 'website', type: 'url'})],
      })

      const validResult = transformRow(validRow, 0, options)
      expect(validResult.success).toBe(true)
      expect(validResult.document?.website).toBe('https://example.com')

      const invalidResult = transformRow(invalidRow, 0, options)
      expect(invalidResult.success).toBe(false)
      expect(invalidResult.errors[0]).toContain('invalid URL')
    })

    it('should handle email fields with validation', () => {
      const validRow = {email: 'test@example.com'}
      const invalidRow = {email: 'not-an-email'}

      const options = createOptions({
        schemaFields: [createField({name: 'email', path: 'email', type: 'email'})],
      })

      const validResult = transformRow(validRow, 0, options)
      expect(validResult.success).toBe(true)
      expect(validResult.document?.email).toBe('test@example.com')

      const invalidResult = transformRow(invalidRow, 0, options)
      expect(invalidResult.success).toBe(false)
      expect(invalidResult.errors[0]).toContain('invalid email')
    })

    it('should handle image fields with uploaded images', () => {
      const uploadedImages = new Map([['image.jpg', 'image-asset-id-123']])

      const row = {mainImage: 'image.jpg'}
      const options = createOptions({
        schemaFields: [
          createField({name: 'mainImage', path: 'mainImage', type: 'image', isImage: true}),
        ],
        uploadedImages,
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      const image = result.document?.mainImage as {
        _type: string
        asset: {_type: string; _ref: string}
      }
      expect(image._type).toBe('image')
      expect(image.asset._ref).toBe('image-asset-id-123')
    })

    it('should handle image with alt text', () => {
      const uploadedImages = new Map([['photo.png', 'photo-asset-id']])

      const row = {mainImage: 'photo.png', 'mainImage.alt': 'A beautiful photo'}
      const options = createOptions({
        schemaFields: [
          createField({name: 'mainImage', path: 'mainImage', type: 'image', isImage: true}),
        ],
        uploadedImages,
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      const image = result.document?.mainImage as {_type: string; alt: string}
      expect(image.alt).toBe('A beautiful photo')
    })

    it('should handle reference fields with config', () => {
      const row = {'author→person.email': 'author@example.com'}
      const options = createOptions({
        schemaFields: [
          createField({name: 'author', path: 'author', type: 'reference', isReference: true}),
        ],
        referenceConfig: [
          {fieldPath: 'author', targetType: 'person', matchField: 'email'},
        ] as ReferenceMatchConfig[],
      })

      const result = transformRow(row, 0, options)

      // Reference fields return a pending reference that needs resolution
      expect(result.document?.author).toBeDefined()
    })

    it('should handle multiple fields in one row', () => {
      const row = {
        title: 'Test Post',
        body: 'Content here',
        published: 'true',
        count: '10',
      }
      const options = createOptions({
        schemaFields: [
          createField({name: 'title', path: 'title', type: 'string'}),
          createField({name: 'body', path: 'body', type: 'text'}),
          createField({name: 'published', path: 'published', type: 'boolean'}),
          createField({name: 'count', path: 'count', type: 'number'}),
        ],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?.title).toBe('Test Post')
      expect(result.document?.body).toBe('Content here')
      expect(result.document?.published).toBe(true)
      expect(result.document?.count).toBe(10)
    })

    it('should skip empty optional fields', () => {
      const row = {title: 'Hello', description: ''}
      const options = createOptions({
        schemaFields: [
          createField({name: 'title', path: 'title'}),
          createField({name: 'description', path: 'description', required: false}),
        ],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?.title).toBe('Hello')
      expect(result.document?.description).toBeUndefined()
    })

    it('should handle text fields', () => {
      const row = {body: 'Long text content here\nWith newlines'}
      const options = createOptions({
        schemaFields: [createField({name: 'body', path: 'body', type: 'text'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?.body).toBe('Long text content here\nWith newlines')
    })

    it('should handle geopoint fields', () => {
      const row = {location: '40.7128,-74.0060'}
      const options = createOptions({
        schemaFields: [createField({name: 'location', path: 'location', type: 'geopoint'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      const geo = result.document?.location as {_type: string; lat: number; lng: number}
      expect(geo._type).toBe('geopoint')
      expect(geo.lat).toBe(40.7128)
      expect(geo.lng).toBe(-74.006)
    })

    it('should handle invalid geopoint format', () => {
      const row = {location: 'not-valid'}
      const options = createOptions({
        schemaFields: [createField({name: 'location', path: 'location', type: 'geopoint'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('geopoint')
    })

    it('should handle geopoint with invalid latitude', () => {
      const row = {location: '95,-74.006'} // lat > 90
      const options = createOptions({
        schemaFields: [createField({name: 'location', path: 'location', type: 'geopoint'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('latitude')
    })

    it('should handle geopoint with invalid longitude', () => {
      const row = {location: '40,-200'} // lng > 180
      const options = createOptions({
        schemaFields: [createField({name: 'location', path: 'location', type: 'geopoint'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('longitude')
    })

    it('should handle reference with arrow notation in value', () => {
      const row = {author: 'john-doe→name'}
      const options = createOptions({
        schemaFields: [
          createField({
            name: 'author',
            path: 'author',
            type: 'reference',
            isReference: true,
            referenceTo: 'person',
          }),
        ],
        referenceConfig: [],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      const ref = result.document?.author as {_type: string; _ref: string}
      expect(ref._type).toBe('reference')
      expect(ref._ref).toContain('john-doe')
      expect(ref._ref).toContain('name')
    })

    it('should handle reference without config (error)', () => {
      const row = {author: 'some-value'}
      const options = createOptions({
        schemaFields: [
          createField({
            name: 'author',
            path: 'author',
            type: 'reference',
            isReference: true,
            referenceTo: 'person',
          }),
        ],
        referenceConfig: [],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('match field')
    })

    it('should handle image not found in uploaded images', () => {
      const row = {mainImage: 'missing.jpg'}
      const options = createOptions({
        schemaFields: [
          createField({name: 'mainImage', path: 'mainImage', type: 'image', isImage: true}),
        ],
        uploadedImages: new Map(),
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('not found in uploaded images')
    })

    it('should handle array of numbers', () => {
      const row = {scores: '10, 20, 30'}
      const options = createOptions({
        schemaFields: [
          createField({
            name: 'scores',
            path: 'scores',
            type: 'number',
            isArray: true,
            of: [{type: 'number'}],
          }),
        ],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?.scores).toEqual([10, 20, 30])
    })

    it('should handle array of references', () => {
      const row = {categories: 'cat1, cat2, cat3'}
      const options = createOptions({
        schemaFields: [
          createField({
            name: 'categories',
            path: 'categories',
            type: 'reference',
            isArray: true,
            isReference: true,
            referenceTo: 'category',
            of: [{type: 'reference'}],
          }),
        ],
        referenceConfig: [{fieldPath: 'categories', targetType: 'category', matchField: 'slug'}],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      const refs = result.document?.categories as Array<{_type: string; _ref: string}>
      expect(refs).toHaveLength(3)
      expect(refs[0]._type).toBe('reference')
    })

    it('should handle datetime with timezone', () => {
      const row = {eventTime: '2024-01-15T10:30:00Z'}
      const options = createOptions({
        schemaFields: [createField({name: 'eventTime', path: 'eventTime', type: 'datetime'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?.eventTime).toBe('2024-01-15T10:30:00Z')
    })

    it('should handle datetime with offset', () => {
      const row = {eventTime: '2024-01-15T10:30:00+05:30'}
      const options = createOptions({
        schemaFields: [createField({name: 'eventTime', path: 'eventTime', type: 'datetime'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?.eventTime).toBe('2024-01-15T10:30:00+05:30')
    })

    it('should handle datetime with milliseconds', () => {
      const row = {eventTime: '2024-01-15T10:30:00.123Z'}
      const options = createOptions({
        schemaFields: [createField({name: 'eventTime', path: 'eventTime', type: 'datetime'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?.eventTime).toBe('2024-01-15T10:30:00.123Z')
    })

    it('should handle object fields with nested structure', () => {
      // Object fields are handled by creating nested path structure directly
      const row = {'seo.title': 'SEO Title', 'seo.description': 'SEO Desc'}
      const options = createOptions({
        schemaFields: [
          createField({name: 'title', path: 'seo.title', type: 'string'}),
          createField({name: 'description', path: 'seo.description', type: 'string'}),
        ],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      const seo = result.document?.seo as {title: string; description: string}
      expect(seo.title).toBe('SEO Title')
      expect(seo.description).toBe('SEO Desc')
    })

    it('should not include empty object fields', () => {
      const row = {'address.street': '', 'address.city': ''}
      const options = createOptions({
        schemaFields: [
          createField({
            name: 'address',
            path: 'address',
            type: 'object',
            fields: [
              {name: 'street', type: 'string', title: 'Street', required: false},
              {name: 'city', type: 'string', title: 'City', required: false},
            ],
          }),
        ],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?.address).toBeUndefined()
    })

    it('should process object field with nested values using path notation', () => {
      // Object fields are processed via the nested path approach
      const row = {'meta.author': 'John', 'meta.views': '100'}
      const options = createOptions({
        schemaFields: [
          createField({name: 'author', path: 'meta.author', type: 'string'}),
          createField({name: 'views', path: 'meta.views', type: 'number'}),
        ],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      const meta = result.document?.meta as {author: string; views: number}
      expect(meta.author).toBe('John')
      expect(meta.views).toBe(100)
    })

    it('should handle object without fields definition', () => {
      const row = {data: 'something'}
      const options = createOptions({
        schemaFields: [
          createField({
            name: 'data',
            path: 'data',
            type: 'object',
            // No fields defined
          }),
        ],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
    })

    it('should handle empty array value', () => {
      const row = {tags: ''}
      const options = createOptions({
        schemaFields: [createField({name: 'tags', path: 'tags', type: 'string', isArray: true})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      expect(result.document?.tags).toBeUndefined()
    })

    it('should handle deeply nested path values', () => {
      const row = {'a.b.c': 'deep value'}
      const options = createOptions({
        schemaFields: [createField({name: 'c', path: 'a.b.c', type: 'string'})],
      })

      const result = transformRow(row, 0, options)

      expect(result.success).toBe(true)
      const doc = result.document as {a: {b: {c: string}}}
      expect(doc.a.b.c).toBe('deep value')
    })
  })

  describe('transformAllRows', () => {
    it('should transform multiple rows', () => {
      const rows = [
        {title: 'Post 1', count: '10'},
        {title: 'Post 2', count: '20'},
        {title: 'Post 3', count: '30'},
      ]
      const options = createOptions({
        schemaFields: [
          createField({name: 'title', path: 'title', type: 'string'}),
          createField({name: 'count', path: 'count', type: 'number'}),
        ],
      })

      const results = transformAllRows(rows, options)

      expect(results).toHaveLength(3)
      expect(results[0].document?.title).toBe('Post 1')
      expect(results[1].document?.title).toBe('Post 2')
      expect(results[2].document?.title).toBe('Post 3')
    })

    it('should preserve row indices', () => {
      const rows = [{title: 'Post 1'}, {title: ''}, {title: 'Post 3'}]
      const options = createOptions({
        schemaFields: [createField({name: 'title', path: 'title', type: 'string', required: true})],
      })

      const results = transformAllRows(rows, options)

      expect(results).toHaveLength(3)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[2].success).toBe(true)
    })
  })
})
