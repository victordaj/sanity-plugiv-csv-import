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
  switch (field.type) {
    case 'number':
      if (isNaN(parseFloat(val))) {
        issues.push({
          row: rowIndex,
          field: field.path,
          type: 'error',
          message: `Invalid number: "${val}"`,
        })
      }
      break

    case 'boolean': {
      const validBooleans = ['true', 'false', '1', '0', 'yes', 'no', 'y', 'n']
      if (!validBooleans.includes(val.toLowerCase().trim())) {
        issues.push({
          row: rowIndex,
          field: field.path,
          type: 'error',
          message: `Invalid boolean: "${val}". Use true/false, 1/0, yes/no`,
        })
      }
      break
    }

    case 'date':
    case 'datetime': {
      const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/
      if (!dateRegex.test(val.trim())) {
        issues.push({
          row: rowIndex,
          field: field.path,
          type: 'error',
          message: `Invalid date format. Use ISO 8601 (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)`,
        })
      } else {
        const date = new Date(val.trim())
        if (isNaN(date.getTime())) {
          issues.push({
            row: rowIndex,
            field: field.path,
            type: 'error',
            message: `Invalid date value`,
          })
        }
      }
      break
    }

    case 'url':
      try {
        new URL(val.trim())
      } catch {
        issues.push({
          row: rowIndex,
          field: field.path,
          type: 'error',
          message: `Invalid URL: "${val}"`,
        })
      }
      break

    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(val.trim())) {
        issues.push({
          row: rowIndex,
          field: field.path,
          type: 'error',
          message: `Invalid email: "${val}"`,
        })
      }
      break
    }

    case 'reference': {
      // Check if reference config exists for this field
      const config = referenceConfig.find((c) => c.fieldPath === field.path)
      const hasArrowNotation = val.includes('→')
      if (!config && !hasArrowNotation) {
        issues.push({
          row: rowIndex,
          field: field.path,
          type: 'warning',
          message: `Reference field has no match configuration`,
        })
      }
      break
    }

    case 'geopoint': {
      const parts = val.split(',').map((p) => p.trim())
      if (parts.length !== 2) {
        issues.push({
          row: rowIndex,
          field: field.path,
          type: 'error',
          message: `Invalid geopoint format. Use "lat,lng"`,
        })
      } else {
        const lat = parseFloat(parts[0])
        const lng = parseFloat(parts[1])
        if (isNaN(lat) || isNaN(lng)) {
          issues.push({
            row: rowIndex,
            field: field.path,
            type: 'error',
            message: `Invalid geopoint coordinates`,
          })
        } else if (lat < -90 || lat > 90) {
          issues.push({
            row: rowIndex,
            field: field.path,
            type: 'error',
            message: `Latitude must be between -90 and 90`,
          })
        } else if (lng < -180 || lng > 180) {
          issues.push({
            row: rowIndex,
            field: field.path,
            type: 'error',
            message: `Longitude must be between -180 and 180`,
          })
        }
      }
      break
    }

    case 'image':
      // Just a warning that image needs to be uploaded
      issues.push({
        row: rowIndex,
        field: field.path,
        type: 'warning',
        message: `Image "${val}" must be uploaded`,
      })
      break

    case 'slug':
      // Validate slug format (no spaces, lowercase recommended)
      if (/\s/.test(val)) {
        issues.push({
          row: rowIndex,
          field: field.path,
          type: 'warning',
          message: `Slug contains spaces: "${val}"`,
        })
      }
      break

    default:
      // No validation for unknown types
      break
  }

  // Validate arrays
  if (field.isArray && val.includes('|')) {
    const items = val.split('|').map((v) => v.trim())
    // Check each item for basic validity based on array item type
    if (field.of?.[0]?.type === 'number') {
      for (const item of items) {
        if (isNaN(parseFloat(item))) {
          issues.push({
            row: rowIndex,
            field: field.path,
            type: 'error',
            message: `Array contains invalid number: "${item}"`,
          })
        }
      }
    }
  }

  return issues
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
