import {type ReferenceMatchConfig} from '../components/ReferenceConfig'
import {getCellValue, isEmptyValue} from './csvParser'
import {type SchemaField} from './schemaUtils'

export interface ValidationIssue {
  row: number
  field: string
  type: 'error' | 'warning'
  message: string
}

export interface ValidationResult {
  isValid: boolean
  validRowCount: number
  issues: ValidationIssue[]
  rowValidation: boolean[] // true/false for each row
}

export interface ValidatorOptions {
  schemaFields: SchemaField[]
  referenceConfig: ReferenceMatchConfig[]
  strictMode?: boolean // If true, warnings become errors
}

/**
 * Fallback URL validation for environments without URL.canParse
 * Uses try-catch around URL constructor to validate
 */
function isValidUrlFallback(url: string): boolean {
  try {
    // eslint-disable-next-line no-new -- URL constructor is used for validation
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Context object for field validation to reduce parameter passing
 */
interface FieldValidationContext {
  row: number
  field: string
  value: string
}

/**
 * Helper to create a validation issue
 */
function createIssue(
  ctx: FieldValidationContext,
  type: 'error' | 'warning',
  message: string,
): ValidationIssue {
  return {row: ctx.row, field: ctx.field, type, message}
}

/**
 * Validate number field
 */
function validateNumber(ctx: FieldValidationContext): ValidationIssue | null {
  if (isNaN(parseFloat(ctx.value))) {
    return createIssue(ctx, 'error', `Invalid number: "${ctx.value}"`)
  }
  return null
}

/**
 * Validate boolean field
 */
function validateBoolean(ctx: FieldValidationContext): ValidationIssue | null {
  const validBooleans = ['true', 'false', '1', '0', 'yes', 'no', 'y', 'n']
  if (!validBooleans.includes(ctx.value.toLowerCase().trim())) {
    return createIssue(ctx, 'error', `Invalid boolean: "${ctx.value}". Use true/false, 1/0, yes/no`)
  }
  return null
}

/**
 * Validate date/datetime field
 */
function validateDate(ctx: FieldValidationContext): ValidationIssue | null {
  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/
  const trimmedVal = ctx.value.trim()

  if (dateRegex.test(trimmedVal)) {
    // Format valid, verify the value is parseable
    const date = new Date(trimmedVal)
    if (isNaN(date.getTime())) {
      return createIssue(ctx, 'error', `Invalid date value`)
    }
    return null
  }
  // Format doesn't match ISO 8601
  return createIssue(
    ctx,
    'error',
    `Invalid date format. Use ISO 8601 (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)`,
  )
}

/**
 * Validate URL field
 */
function validateUrl(ctx: FieldValidationContext): ValidationIssue | null {
  const trimmedUrl = ctx.value.trim()
  const isValidUrl = URL.canParse ? URL.canParse(trimmedUrl) : isValidUrlFallback(trimmedUrl)
  if (!isValidUrl) {
    return createIssue(ctx, 'error', `Invalid URL: "${ctx.value}"`)
  }
  return null
}

/**
 * Validate email field
 */
function validateEmail(ctx: FieldValidationContext): ValidationIssue | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(ctx.value.trim())) {
    return createIssue(ctx, 'error', `Invalid email: "${ctx.value}"`)
  }
  return null
}

/**
 * Validate reference field
 */
function validateReference(
  ctx: FieldValidationContext,
  referenceConfig: ReferenceMatchConfig[],
): ValidationIssue | null {
  const config = referenceConfig.find((c) => c.fieldPath === ctx.field)
  const hasArrowNotation = ctx.value.includes('→')
  if (!config && !hasArrowNotation) {
    return createIssue(ctx, 'warning', `Reference field has no match configuration`)
  }
  return null
}

/**
 * Validate geopoint field
 */
function validateGeopoint(ctx: FieldValidationContext): ValidationIssue | null {
  const parts = ctx.value.split(',').map((p) => p.trim())
  if (parts.length !== 2) {
    return createIssue(ctx, 'error', `Invalid geopoint format. Use "lat,lng"`)
  }

  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])
  if (isNaN(lat) || isNaN(lng)) {
    return createIssue(ctx, 'error', `Invalid geopoint coordinates`)
  }
  if (lat < -90 || lat > 90) {
    return createIssue(ctx, 'error', `Latitude must be between -90 and 90`)
  }
  if (lng < -180 || lng > 180) {
    return createIssue(ctx, 'error', `Longitude must be between -180 and 180`)
  }
  return null
}

/**
 * Validate slug field
 */
function validateSlug(ctx: FieldValidationContext): ValidationIssue | null {
  if (/\s/.test(ctx.value)) {
    return createIssue(ctx, 'warning', `Slug contains spaces: "${ctx.value}"`)
  }
  return null
}

/**
 * Validate array items
 */
function validateArrayItems(ctx: FieldValidationContext, field: SchemaField): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!field.isArray || !ctx.value.includes('|')) {
    return issues
  }

  const items = ctx.value.split('|').map((v) => v.trim())
  // Check each item for basic validity based on array item type
  if (field.of?.[0]?.type === 'number') {
    for (const item of items) {
      if (isNaN(parseFloat(item))) {
        issues.push(createIssue(ctx, 'error', `Array contains invalid number: "${item}"`))
      }
    }
  }
  return issues
}

/**
 * Validate CSV data against schema
 */
export function validateCsvData(
  headers: string[],
  rows: Record<string, string>[],
  options: ValidatorOptions,
): ValidationResult {
  const issues: ValidationIssue[] = []
  const rowValidation: boolean[] = []

  // Validate headers first
  const headerIssues = validateHeaders(headers, options.schemaFields)
  issues.push(...headerIssues)

  // Validate each row
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    const rowIssues = validateRow(row, rowIndex, options)
    issues.push(...rowIssues)

    // Row is valid if it has no errors (warnings are OK)
    const hasErrors = rowIssues.some((i) => i.type === 'error')
    rowValidation.push(!hasErrors)
  }

  const validRowCount = rowValidation.filter(Boolean).length
  const hasErrors = issues.some((i) => i.type === 'error')

  return {
    isValid: !hasErrors,
    validRowCount,
    issues,
    rowValidation,
  }
}

/**
 * Validate CSV headers against schema fields
 */
function validateHeaders(headers: string[], schemaFields: SchemaField[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Check for required fields in headers
  for (const field of schemaFields) {
    if (field.required) {
      const hasField = headers.some(
        (h) => h === field.path || h.startsWith(`${field.path}→`) || h === `${field.path}.alt`,
      )
      if (!hasField) {
        issues.push({
          row: -1, // -1 indicates header issue
          field: field.path,
          type: 'warning',
          message: `Required field "${field.path}" not found in CSV headers`,
        })
      }
    }
  }

  // Check for unknown fields (warning only)
  const knownPaths = new Set<string>()
  for (const field of schemaFields) {
    knownPaths.add(field.path)
    knownPaths.add(`${field.path}.alt`) // For image alt text
    // Add nested field paths
    if (field.fields) {
      for (const subField of field.fields) {
        knownPaths.add(`${field.path}.${subField.name}`)
      }
    }
  }
  knownPaths.add('_id') // Special field

  for (const header of headers) {
    // Skip reference notation headers (field→matchField)
    const basePath = header.includes('→') ? header.split('→')[0] : header

    if (!knownPaths.has(basePath) && !knownPaths.has(header)) {
      issues.push({
        row: -1,
        field: header,
        type: 'warning',
        message: `Unknown column "${header}" - will be ignored`,
      })
    }
  }

  return issues
}

/**
 * Validate a single row
 */
function validateRow(
  row: Record<string, string>,
  rowIndex: number,
  options: ValidatorOptions,
): ValidationIssue[] {
  const {schemaFields, referenceConfig} = options
  const issues: ValidationIssue[] = []

  for (const field of schemaFields) {
    const fieldIssues = validateField(row, rowIndex, field, referenceConfig)
    issues.push(...fieldIssues)
  }

  return issues
}

/**
 * Validate a single field value
 * Uses extracted helper functions for each field type to keep complexity manageable
 */
function validateField(
  row: Record<string, string>,
  rowIndex: number,
  field: SchemaField,
  referenceConfig: ReferenceMatchConfig[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const value = getCellValue(row, field.path)

  // Check required
  if (field.required && isEmptyValue(value)) {
    issues.push({
      row: rowIndex,
      field: field.path,
      type: 'error',
      message: `Required field is empty`,
    })
    return issues // No point validating further if required and empty
  }

  // Skip validation if empty and not required
  if (isEmptyValue(value) || value === undefined) {
    return issues
  }

  // Type-specific validation - value is guaranteed to be string here
  const val = value as string
  const ctx: FieldValidationContext = {row: rowIndex, field: field.path, value: val}

  // Validate by type using extracted helper functions
  const typeIssue = validateFieldByType(ctx, field.type, referenceConfig)
  if (typeIssue) {
    issues.push(typeIssue)
  }

  // Validate array items if applicable
  issues.push(...validateArrayItems(ctx, field))

  return issues
}

/**
 * Route validation to the appropriate type-specific validator
 */
function validateFieldByType(
  ctx: FieldValidationContext,
  type: string,
  referenceConfig: ReferenceMatchConfig[],
): ValidationIssue | null {
  switch (type) {
    case 'number':
      return validateNumber(ctx)
    case 'boolean':
      return validateBoolean(ctx)
    case 'date':
    case 'datetime':
      return validateDate(ctx)
    case 'url':
      return validateUrl(ctx)
    case 'email':
      return validateEmail(ctx)
    case 'reference':
      return validateReference(ctx, referenceConfig)
    case 'geopoint':
      return validateGeopoint(ctx)
    case 'slug':
      return validateSlug(ctx)
    case 'image':
      // Image fields always get a warning that the image must be uploaded
      return createIssue(ctx, 'warning', `Image "${ctx.value}" must be uploaded`)
    default:
      return null // No validation for unknown types
  }
}

/**
 * Quick validation check - just returns true/false
 */
export function isValidCsvData(
  headers: string[],
  rows: Record<string, string>[],
  options: ValidatorOptions,
): boolean {
  const result = validateCsvData(headers, rows, options)
  return result.isValid
}

/**
 * Get validation summary counts
 */
export function getValidationSummary(result: ValidationResult): {
  total: number
  valid: number
  invalid: number
  errors: number
  warnings: number
} {
  const errors = result.issues.filter((i) => i.type === 'error').length
  const warnings = result.issues.filter((i) => i.type === 'warning').length
  const invalid = result.rowValidation.filter((v) => !v).length

  return {
    total: result.rowValidation.length,
    valid: result.validRowCount,
    invalid,
    errors,
    warnings,
  }
}
