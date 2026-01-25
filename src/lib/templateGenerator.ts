import * as XLSX from 'xlsx'

import {type SchemaField} from './schemaUtils'
import {type ReferenceMapping} from './types'

export interface TemplateOptions {
  fields: SchemaField[]
  referenceMappings: ReferenceMapping[]
  format: 'xlsx' | 'csv'
}

interface ColumnConfig {
  header: string
  tip: string
  fieldPath: string
}

/**
 * Generate column configurations from schema fields
 */
function generateColumns(
  fields: SchemaField[],
  referenceMappings: ReferenceMapping[],
): ColumnConfig[] {
  const columns: ColumnConfig[] = []

  for (const field of fields) {
    // Skip nested fields that are part of flattened objects
    // We only want the leaf fields
    const isLeafField = !fields.some(
      (f) => f.path.startsWith(`${field.path}.`) && f.path !== field.path,
    )

    if (!isLeafField && field.type === 'object') {
      continue
    }

    const column = createColumnConfig(field, referenceMappings)
    columns.push(column)

    // Add alt text column for images
    if (field.isImage) {
      columns.push({
        header: `${field.path}.alt`,
        tip: 'Optional: Alt text for image',
        fieldPath: `${field.path}.alt`,
      })
    }
  }

  return columns
}

function createColumnConfig(
  field: SchemaField,
  referenceMappings: ReferenceMapping[],
): ColumnConfig {
  let header = field.path
  let tip = ''

  // Required indicator
  const requiredText = field.required ? 'Required' : 'Optional'

  // Type-specific tips
  if (field.isReference) {
    const mapping = referenceMappings.find((m) => m.fieldPath === field.path)
    if (mapping) {
      header = `${field.path}→${mapping.targetType}.${mapping.matchField}`
      tip = `${requiredText}: Reference - match by ${mapping.matchField}`
    } else {
      tip = `${requiredText}: Reference`
    }

    if (field.isArray) {
      tip += ' (comma-separated for multiple)'
    }
  } else if (field.isRichText) {
    tip = `${requiredText}: Rich text - supports Markdown (**bold**, *italic*, [links](url), # headings)`
  } else if (field.isImage) {
    tip = `${requiredText}: Image filename (upload images first)`
  } else if (field.type === 'boolean') {
    tip = `${requiredText}: Use true or false`
  } else if (field.type === 'date') {
    tip = `${requiredText}: Date format YYYY-MM-DD`
  } else if (field.type === 'datetime') {
    tip = `${requiredText}: DateTime format YYYY-MM-DDTHH:mm:ss`
  } else if (field.type === 'number') {
    tip = `${requiredText}: Numeric value`
  } else if (field.type === 'slug') {
    tip = `${requiredText}: URL-friendly text (auto-generated from title if empty)`
  } else if (field.type === 'url') {
    tip = `${requiredText}: Valid URL (https://...)`
  } else if (field.type === 'email') {
    tip = `${requiredText}: Valid email address`
  } else if (field.isArray) {
    tip = `${requiredText}: Comma-separated values`
  } else {
    tip = requiredText
  }

  return {
    header,
    tip,
    fieldPath: field.path,
  }
}

/**
 * Generate an Excel (.xlsx) template
 */
export function generateExcelTemplate(options: TemplateOptions): Blob {
  const columns = generateColumns(options.fields, options.referenceMappings)

  // Create worksheet data
  const headers = columns.map((c) => c.header)
  const tips = columns.map((c) => c.tip)

  const worksheetData = [headers, tips]

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

  // Set column widths
  const colWidths = columns.map((c) => ({
    wch: Math.max(c.header.length, c.tip.length, 20),
  }))
  worksheet['!cols'] = colWidths

  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Template')

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Generate a CSV template
 */
export function generateCsvTemplate(options: TemplateOptions): Blob {
  const columns = generateColumns(options.fields, options.referenceMappings)

  // Create CSV content
  const headers = columns.map((c) => escapeCSV(c.header)).join(',')
  const tips = columns.map((c) => escapeCSV(c.tip)).join(',')

  const csvContent = `${headers}\n${tips}`

  return new Blob([csvContent], {type: 'text/csv;charset=utf-8;'})
}

/**
 * Escape a value for CSV
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate and download a template
 */
export function downloadTemplate(
  fields: SchemaField[],
  referenceMappings: ReferenceMapping[],
  documentTypeName: string,
  format: 'xlsx' | 'csv',
): void {
  const options: TemplateOptions = {
    fields,
    referenceMappings,
    format,
  }

  const filename = `${documentTypeName}-import-template.${format}`

  if (format === 'xlsx') {
    const blob = generateExcelTemplate(options)
    downloadBlob(blob, filename)
  } else {
    const blob = generateCsvTemplate(options)
    downloadBlob(blob, filename)
  }
}
