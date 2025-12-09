import {type ReferenceMatchConfig} from '../components/ReferenceConfig'
import {getCellValue, isEmptyValue, splitArrayValue} from './csvParser'
import {type SchemaField} from './schemaUtils'

export interface TransformOptions {
  schemaFields: SchemaField[]
  referenceConfig: ReferenceMatchConfig[]
  documentType: string
  uploadedImages: Map<string, string> // filename -> asset ID
}

export interface TransformedDocument {
  _type: string
  [key: string]: unknown
}

export interface TransformResult {
  success: boolean
  document?: TransformedDocument
  errors: string[]
}

/**
 * Transforms a CSV row into a Sanity document
 */
export function transformRow(
  row: Record<string, string>,
  rowIndex: number,
  options: TransformOptions,
): TransformResult {
  const {schemaFields, referenceConfig, documentType, uploadedImages} = options
  const errors: string[] = []
  const document: TransformedDocument = {_type: documentType}

  // Build a map of field paths to their schema info
  const fieldMap = new Map<string, SchemaField>()
  for (const field of schemaFields) {
    fieldMap.set(field.path, field)
  }

  // Process each schema field
  for (const field of schemaFields) {
    try {
      const value = processField(row, field, referenceConfig, uploadedImages, errors)
      if (value !== undefined) {
        setNestedValue(document, field.path, value)
      }
    } catch (err) {
      errors.push(`Field "${field.path}": ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // Handle _id if present in CSV
  if (row._id && !isEmptyValue(row._id)) {
    document._id = row._id.trim()
  }

  return {
    success: errors.length === 0,
    document,
    errors,
  }
}

/**
 * Process a single field from the CSV row
 */
function processField(
  row: Record<string, string>,
  field: SchemaField,
  referenceConfig: ReferenceMatchConfig[],
  uploadedImages: Map<string, string>,
  errors: string[],
): unknown {
  const rawValue = getCellValue(row, field.path)

  if (isEmptyValue(rawValue)) {
    if (field.required) {
      errors.push(`Field "${field.path}" is required but empty`)
    }
    return undefined
  }

  // Handle arrays
  if (field.isArray) {
    return processArrayField(row, field, referenceConfig, uploadedImages, errors)
  }

  // Handle by type
  switch (field.type) {
    case 'string':
    case 'text':
    case 'slug':
      return processStringField(rawValue ?? '', field)
    case 'number':
      return processNumberField(rawValue ?? '', field, errors)
    case 'boolean':
      return processBooleanField(rawValue ?? '')
    case 'date':
    case 'datetime':
      return processDateField(rawValue ?? '', field, errors)
    case 'reference':
      return processReferenceField(rawValue ?? '', field, referenceConfig, errors)
    case 'image':
      return processImageField(row, field, uploadedImages, errors)
    case 'url':
      return processUrlField(rawValue ?? '', field, errors)
    case 'email':
      return processEmailField(rawValue ?? '', field, errors)
    case 'geopoint':
      return processGeopointField(rawValue ?? '', field, errors)
    case 'object':
      return processObjectField(row, field, referenceConfig, uploadedImages, errors)
    default:
      return rawValue
  }
}

/**
 * Process string fields including slug
 */
function processStringField(value: string, field: SchemaField): unknown {
  if (field.type === 'slug') {
    return {_type: 'slug', current: value.trim()}
  }
  return value.trim()
}

/**
 * Process number fields
 */
function processNumberField(
  value: string,
  field: SchemaField,
  errors: string[],
): number | undefined {
  const num = parseFloat(value)
  if (isNaN(num)) {
    errors.push(`Field "${field.path}" has invalid number: "${value}"`)
    return undefined
  }
  return num
}

/**
 * Process boolean fields
 */
function processBooleanField(value: string): boolean {
  const lower = value.toLowerCase().trim()
  return ['true', '1', 'yes', 'y'].includes(lower)
}

/**
 * Process date and datetime fields (ISO 8601 format)
 */
function processDateField(value: string, field: SchemaField, errors: string[]): string | undefined {
  const trimmed = value.trim()

  // Validate ISO 8601 format
  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/
  if (!dateRegex.test(trimmed)) {
    errors.push(
      `Field "${field.path}" has invalid date format: "${value}". Use ISO 8601 (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)`,
    )
    return undefined
  }

  const date = new Date(trimmed)
  if (isNaN(date.getTime())) {
    errors.push(`Field "${field.path}" has invalid date: "${value}"`)
    return undefined
  }

  return trimmed
}

/**
 * Process reference fields using the reference notation (value→matchField)
 */
function processReferenceField(
  value: string,
  field: SchemaField,
  referenceConfig: ReferenceMatchConfig[],
  errors: string[],
): unknown {
  const trimmed = value.trim()

  // Check if it's already a reference ID (starts with underscore or looks like an ID)
  if (trimmed.startsWith('_') || /^[a-zA-Z0-9-_]+$/.test(trimmed)) {
    // Could be a direct ID, but we need to mark it for resolution
    // The import engine will resolve this
  }

  // Parse reference notation: value→matchField or just value
  const arrowIndex = trimmed.indexOf('→')
  let matchValue: string
  let matchField: string | undefined

  if (arrowIndex !== -1) {
    matchValue = trimmed.slice(0, arrowIndex).trim()
    matchField = trimmed.slice(arrowIndex + 1).trim()
  } else {
    matchValue = trimmed
    // Find match field from config
    const config = referenceConfig.find((c) => c.fieldPath === field.path)
    matchField = config?.matchField
  }

  if (!matchField) {
    errors.push(`Field "${field.path}" reference needs a match field configured`)
    return undefined
  }

  // Return a placeholder that will be resolved by the import engine
  return {
    _type: 'reference',
    _ref: `__RESOLVE__${matchValue}__BY__${matchField}__TYPE__${field.referenceTo || 'unknown'}`,
  }
}

/**
 * Process image fields
 */
function processImageField(
  row: Record<string, string>,
  field: SchemaField,
  uploadedImages: Map<string, string>,
  errors: string[],
): unknown {
  const filename = getCellValue(row, field.path)
  const altText = getCellValue(row, `${field.path}.alt`)

  if (isEmptyValue(filename) || !filename) {
    return undefined
  }

  const assetId = uploadedImages.get(filename.trim())
  if (!assetId) {
    errors.push(`Field "${field.path}": Image "${filename}" not found in uploaded images`)
    return undefined
  }

  const image: Record<string, unknown> = {
    _type: 'image',
    asset: {
      _type: 'reference',
      _ref: assetId,
    },
  }

  if (altText && !isEmptyValue(altText)) {
    image.alt = altText.trim()
  }

  return image
}

/**
 * Process URL fields
 */
function processUrlField(value: string, field: SchemaField, errors: string[]): string | undefined {
  const trimmed = value.trim()
  try {
    new URL(trimmed)
    return trimmed
  } catch {
    errors.push(`Field "${field.path}" has invalid URL: "${value}"`)
    return undefined
  }
}

/**
 * Process email fields
 */
function processEmailField(
  value: string,
  field: SchemaField,
  errors: string[],
): string | undefined {
  const trimmed = value.trim()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    errors.push(`Field "${field.path}" has invalid email: "${value}"`)
    return undefined
  }
  return trimmed
}

/**
 * Process geopoint fields (lat,lng format)
 */
function processGeopointField(value: string, field: SchemaField, errors: string[]): unknown {
  const parts = value.split(',').map((p) => p.trim())
  if (parts.length !== 2) {
    errors.push(`Field "${field.path}" has invalid geopoint format: "${value}". Use "lat,lng"`)
    return undefined
  }

  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])

  if (isNaN(lat) || isNaN(lng)) {
    errors.push(`Field "${field.path}" has invalid geopoint values: "${value}"`)
    return undefined
  }

  if (lat < -90 || lat > 90) {
    errors.push(`Field "${field.path}" has invalid latitude: ${lat}. Must be between -90 and 90`)
    return undefined
  }

  if (lng < -180 || lng > 180) {
    errors.push(`Field "${field.path}" has invalid longitude: ${lng}. Must be between -180 and 180`)
    return undefined
  }

  return {
    _type: 'geopoint',
    lat,
    lng,
  }
}

/**
 * Process object fields (nested)
 */
function processObjectField(
  row: Record<string, string>,
  field: SchemaField,
  referenceConfig: ReferenceMatchConfig[],
  uploadedImages: Map<string, string>,
  errors: string[],
): unknown {
  if (!field.fields || field.fields.length === 0) {
    return undefined
  }

  const obj: Record<string, unknown> = {}
  let hasValue = false

  for (const subField of field.fields) {
    const fullPath = `${field.path}.${subField.name}`
    const subSchemaField: SchemaField = {
      name: subField.name,
      type: subField.type,
      path: fullPath,
      title: subField.title,
      required: subField.required,
      isArray: subField.isArray,
      isReference: subField.isReference,
      isImage: subField.isImage,
    }
    const value = processField(row, subSchemaField, referenceConfig, uploadedImages, errors)
    if (value !== undefined) {
      obj[subField.name] = value
      hasValue = true
    }
  }

  return hasValue ? obj : undefined
}

/**
 * Process array fields
 */
function processArrayField(
  row: Record<string, string>,
  field: SchemaField,
  referenceConfig: ReferenceMatchConfig[],
  uploadedImages: Map<string, string>,
  errors: string[],
): unknown[] | undefined {
  const rawValue = getCellValue(row, field.path)

  if (isEmptyValue(rawValue) || !rawValue) {
    return undefined
  }

  const values = splitArrayValue(rawValue)
  if (values.length === 0) {
    return undefined
  }

  // Get the array item type
  const itemType = field.of?.[0]?.type || 'string'

  const results: unknown[] = []
  for (const value of values) {
    const itemField: SchemaField = {
      name: field.name,
      type: itemType,
      path: field.path,
      title: field.title,
      required: false,
      isArray: false,
      isReference: field.isReference,
      isImage: field.isImage,
      referenceTo: field.of?.[0]?.type === 'reference' ? field.referenceTo : undefined,
    }

    const processed = processField(
      {...row, [field.path]: value},
      itemField,
      referenceConfig,
      uploadedImages,
      errors,
    )

    if (processed !== undefined) {
      results.push(processed)
    }
  }

  return results.length > 0 ? results : undefined
}

/**
 * Set a nested value in an object using dot notation path
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!(part in current)) {
      current[part] = {}
    }
    current = current[part] as Record<string, unknown>
  }

  current[parts[parts.length - 1]] = value
}

/**
 * Transform all CSV rows into Sanity documents
 */
export function transformAllRows(
  rows: Record<string, string>[],
  options: TransformOptions,
): TransformResult[] {
  return rows.map((row, index) => transformRow(row, index, options))
}
