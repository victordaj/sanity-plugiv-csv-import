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
 * Fields to check for duplicates (in order of priority)
 */
const DUPLICATE_CHECK_FIELDS = ['_id', 'slug.current', 'slug', 'email', 'name', 'title', 'sku']

/**
 * Find a unique field in the document to use for duplicate checking
 */
function findUniqueField(document: TransformedDocument): {field: string; value: string} | null {
  for (const field of DUPLICATE_CHECK_FIELDS) {
    if (field === 'slug.current' && document.slug && typeof document.slug === 'object') {
      const slugObj = document.slug as {current?: string}
      if (slugObj.current) {
        return {field: 'slug.current', value: slugObj.current}
      }
    } else if (field in document && document[field]) {
      const value = document[field]
      if (typeof value === 'string') {
        return {field, value}
      }
    }
  }
  return null
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

  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  const total = transformResults.length

  // Process in batches
  for (let i = 0; i < transformResults.length; i += batchSize) {
    const batch = transformResults.slice(i, Math.min(i + batchSize, transformResults.length))

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (result, batchIndex) => {
        const rowIndex = i + batchIndex

        // Skip rows that failed transformation
        if (!result.success || !result.document) {
          failed++
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
            skipped++
          } else if (importResult.success) {
            if (result.document._id) {
              updated++
            } else {
              created++
            }
          } else {
            failed++
          }

          return importResult
        } catch (err) {
          failed++
          return {
            row: rowIndex,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          }
        }
      }),
    )

    results.push(...batchResults)

    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, total), total)
    }
  }

  return {
    total,
    created,
    updated,
    skipped,
    failed,
    results,
  }
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
  const docType = resolvedDoc._type as string

  // Find unique field for duplicate checking
  const uniqueField = findUniqueField(resolvedDoc)

  // Check for existing document
  let existingId: string | null = null

  if (document._id) {
    // Document has explicit ID
    const existing = await client.getDocument(document._id as string)
    if (existing) {
      existingId = document._id as string
    }
  } else if (uniqueField && duplicateStrategy !== 'create') {
    // Query for existing document by unique field
    const query = `*[_type == $type && ${uniqueField.field} == $value][0]._id`
    existingId = await client.fetch<string | null>(query, {
      type: docType,
      value: uniqueField.value,
    })
  }

  // Handle based on duplicate strategy
  if (existingId) {
    switch (duplicateStrategy) {
      case 'skip':
        return {
          row: rowIndex,
          success: true,
          documentId: existingId,
          skipped: true,
        }
      case 'update': {
        // Update existing document - remove _id and _type for patch
        const {_id: _updateId, _type: _updateType, ...updateFields} = resolvedDoc
        const updated = await client.patch(existingId).set(updateFields).commit()
        return {
          row: rowIndex,
          success: true,
          documentId: updated._id,
        }
      }
      case 'create':
        // Create with new ID (fall through to create)
        break
      default:
        // Unknown strategy, fall through to create
        break
    }
  }

  // Create new document - remove _id to let Sanity generate it
  const {_id: _createId, ...createFields} = resolvedDoc
  const created = await client.create(createFields)
  return {
    row: rowIndex,
    success: true,
    documentId: created._id,
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
