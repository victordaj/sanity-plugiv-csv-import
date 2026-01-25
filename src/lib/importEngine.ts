import {type SanityClient} from 'sanity'

import {type DuplicateStrategy} from '../components/DuplicateOptions'
import {type TransformedDocument, type TransformResult} from './documentTransformer'

export interface ImportOptions {
  client: SanityClient
  documentType: string
  duplicateStrategy: DuplicateStrategy
  batchSize?: number
  onProgress?: (processed: number, total: number) => void
}

export interface ImportResult {
  row: number
  success: boolean
  documentId?: string
  documentTitle?: string
  error?: string
  skipped?: boolean
}

export interface ImportSummary {
  total: number
  created: number
  updated: number
  skipped: number
  failed: number
  results: ImportResult[]
}

/**
 * Reference resolution cache to avoid repeated queries
 */
interface ReferenceCache {
  [key: string]: string | null // matchKey -> documentId
}

/**
 * Import transformed documents into Sanity
 */
export async function importDocuments(
  transformResults: TransformResult[],
  options: ImportOptions,
): Promise<ImportSummary> {
  const {client, duplicateStrategy, batchSize = 10, onProgress} = options
  const results: ImportResult[] = []
  const referenceCache: ReferenceCache = {}

  // Use an object for counters to avoid closure issues in loop
  const counters = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  }

  const total = transformResults.length

  /**
   * Process a single transform result and update counters
   */
  async function processResult(result: TransformResult, rowIndex: number): Promise<ImportResult> {
    // Skip rows that failed transformation
    if (!result.success || !result.document) {
      counters.failed++
      return {
        row: rowIndex,
        success: false,
        error: result.errors.join('; ') || 'Transformation failed',
      }
    }

    try {
      const importResult = await importSingleDocument(
        result.document,
        rowIndex,
        duplicateStrategy,
        client,
        referenceCache,
      )

      if (importResult.skipped) {
        counters.skipped++
      } else if (importResult.success) {
        if (result.document._id) {
          counters.updated++
        } else {
          counters.created++
        }
      } else {
        counters.failed++
      }

      return importResult
    } catch (err) {
      counters.failed++
      return {
        row: rowIndex,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  // Process in batches
  for (let i = 0; i < transformResults.length; i += batchSize) {
    const batch = transformResults.slice(i, Math.min(i + batchSize, transformResults.length))

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map((result, batchIndex) => processResult(result, i + batchIndex)),
    )

    results.push(...batchResults)

    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, total), total)
    }
  }

  return {
    total,
    created: counters.created,
    updated: counters.updated,
    skipped: counters.skipped,
    failed: counters.failed,
    results,
  }
}

/**
 * Extract a display title from a document
 */
function extractDocumentTitle(document: TransformedDocument): string | undefined {
  // Common title field names in order of preference
  const titleFields = ['title', 'name', 'headline', 'label', 'heading', 'subject']

  for (const field of titleFields) {
    const value = document[field]
    if (typeof value === 'string' && value.trim()) {
      // Truncate long titles
      const title = value.trim()
      return title.length > 50 ? `${title.substring(0, 47)}...` : title
    }
  }

  return undefined
}

/**
 * Import a single document
 */
async function importSingleDocument(
  document: TransformedDocument,
  rowIndex: number,
  duplicateStrategy: DuplicateStrategy,
  client: SanityClient,
  referenceCache: ReferenceCache,
): Promise<ImportResult> {
  // Resolve any pending references
  const resolvedDoc = await resolveReferences(document, client, referenceCache)

  // Extract title for display
  const documentTitle = extractDocumentTitle(resolvedDoc)

  // Handle duplicate strategy
  if (document._id) {
    // Document has explicit ID
    const existing = await client.getDocument(document._id as string)

    if (existing) {
      switch (duplicateStrategy) {
        case 'skip':
          return {
            row: rowIndex,
            success: true,
            documentId: document._id as string,
            documentTitle,
            skipped: true,
          }
        case 'update': {
          // Update existing document
          const updated = await client
            .patch(document._id as string)
            .set(resolvedDoc)
            .commit()
          return {
            row: rowIndex,
            success: true,
            documentId: updated._id,
            documentTitle,
          }
        }
        case 'create': {
          // Create with new ID
          delete resolvedDoc._id
          const newDoc = await client.create(resolvedDoc)
          return {
            row: rowIndex,
            success: true,
            documentId: newDoc._id,
            documentTitle,
          }
        }
        default:
          // Fall through to create new document
          break
      }
    }
  }

  // Create new document
  const created = await client.create(resolvedDoc)
  return {
    row: rowIndex,
    success: true,
    documentId: created._id,
    documentTitle,
  }
}

/**
 * Resolve reference placeholders to actual document IDs
 */
async function resolveReferences(
  document: TransformedDocument,
  client: SanityClient,
  cache: ReferenceCache,
): Promise<TransformedDocument> {
  const resolved = {...document}

  for (const [key, value] of Object.entries(resolved)) {
    if (isReferencePlaceholder(value)) {
      const resolvedRef = await resolveReference(value, client, cache)
      if (resolvedRef) {
        resolved[key] = resolvedRef
      } else {
        // Remove unresolved references
        delete resolved[key]
      }
    } else if (Array.isArray(value)) {
      resolved[key] = await Promise.all(
        value.map(async (item) => {
          if (isReferencePlaceholder(item)) {
            return (await resolveReference(item, client, cache)) || null
          }
          return item
        }),
      )
      // Filter out nulls from unresolved references
      resolved[key] = (resolved[key] as unknown[]).filter((v) => v !== null)
    } else if (typeof value === 'object' && value !== null) {
      resolved[key] = await resolveReferences(value as TransformedDocument, client, cache)
    }
  }

  return resolved
}

/**
 * Check if a value is a reference placeholder
 */
function isReferencePlaceholder(value: unknown): value is {_type: 'reference'; _ref: string} {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_type' in value &&
    (value as Record<string, unknown>)._type === 'reference' &&
    '_ref' in value &&
    typeof (value as Record<string, unknown>)._ref === 'string' &&
    ((value as Record<string, unknown>)._ref as string).startsWith('__RESOLVE__')
  )
}

/**
 * Resolve a single reference placeholder
 */
async function resolveReference(
  placeholder: {_type: 'reference'; _ref: string},
  client: SanityClient,
  cache: ReferenceCache,
): Promise<{_type: 'reference'; _ref: string} | null> {
  // Parse placeholder: __RESOLVE__value__BY__field__TYPE__type
  const match = placeholder._ref.match(/__RESOLVE__(.+)__BY__(.+)__TYPE__(.+)/)
  if (!match) {
    return null
  }

  const [, matchValue, matchField, documentType] = match
  const cacheKey = `${documentType}:${matchField}:${matchValue}`

  // Check cache
  if (cacheKey in cache) {
    const cachedId = cache[cacheKey]
    return cachedId ? {_type: 'reference', _ref: cachedId} : null
  }

  // Query for matching document
  const query = `*[_type == $type && ${matchField} == $value][0]._id`
  const documentId = await client.fetch<string | null>(query, {
    type: documentType,
    value: matchValue,
  })

  // Cache result
  cache[cacheKey] = documentId

  if (!documentId) {
    console.warn(`Reference not found: ${documentType} where ${matchField} = "${matchValue}"`)
    return null
  }

  return {_type: 'reference', _ref: documentId}
}

/**
 * Upload an image to Sanity and return the asset ID
 */
export async function uploadImage(client: SanityClient, file: File): Promise<string> {
  const asset = await client.assets.upload('image', file, {
    filename: file.name,
  })
  return asset._id
}

/**
 * Upload multiple images and return a map of filename -> asset ID
 */
export async function uploadImages(
  client: SanityClient,
  files: File[],
  onProgress?: (uploaded: number, total: number) => void,
): Promise<Map<string, string>> {
  const result = new Map<string, string>()

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const assetId = await uploadImage(client, file)
      result.set(file.name, assetId)
    } catch (err) {
      console.error(`Failed to upload image ${file.name}:`, err)
    }

    if (onProgress) {
      onProgress(i + 1, files.length)
    }
  }

  return result
}

/**
 * Preview import - dry run without actually creating documents
 */
export async function previewImport(
  transformResults: TransformResult[],
  client: SanityClient,
): Promise<{
  valid: number
  invalid: number
  referencesResolvable: number
  referencesUnresolvable: number
}> {
  let valid = 0
  let invalid = 0
  let referencesResolvable = 0
  let referencesUnresolvable = 0

  const referenceCache: ReferenceCache = {}

  for (const result of transformResults) {
    if (result.success && result.document) {
      valid++

      // Check references
      for (const value of Object.values(result.document)) {
        if (isReferencePlaceholder(value)) {
          const resolved = await resolveReference(value, client, referenceCache)
          if (resolved) {
            referencesResolvable++
          } else {
            referencesUnresolvable++
          }
        }
      }
    } else {
      invalid++
    }
  }

  return {valid, invalid, referencesResolvable, referencesUnresolvable}
}
