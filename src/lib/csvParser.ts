import Papa from 'papaparse'

export interface ParsedCsvData {
  headers: string[]
  rows: Record<string, string>[]
  rawData: string[][]
  rowCount: number
}

export interface CsvParseError {
  type: string
  code: string
  message: string
  row?: number
}

export interface CsvParseResult {
  success: boolean
  data?: ParsedCsvData
  errors?: CsvParseError[]
}

const MAX_ROWS = 500

/**
 * Parse a CSV file and return structured data
 */
export function parseCsvFile(file: File): Promise<CsvParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const errors: CsvParseError[] = []

        // Check for parse errors
        if (results.errors && results.errors.length > 0) {
          for (const error of results.errors) {
            errors.push({
              type: error.type,
              code: error.code,
              message: error.message,
              row: error.row,
            })
          }
        }

        // Get rows (skip the tips row if present)
        let rows = results.data as Record<string, string>[]

        // Check if first row looks like tips (contains words like "Required", "Optional", etc.)
        if (rows.length > 0) {
          const firstRow = rows[0]
          const firstRowValues = Object.values(firstRow)
          const looksLikeTips = firstRowValues.some(
            (value) =>
              typeof value === 'string' &&
              (value.toLowerCase().includes('required') ||
                value.toLowerCase().includes('optional') ||
                value.toLowerCase().includes('format') ||
                value.toLowerCase().includes('comma-separated')),
          )

          if (looksLikeTips) {
            rows = rows.slice(1)
          }
        }

        // Check row limit
        if (rows.length > MAX_ROWS) {
          errors.push({
            type: 'RowLimit',
            code: 'TooManyRows',
            message: `CSV has ${rows.length} rows, but the maximum allowed is ${MAX_ROWS}. Please split your data into smaller files.`,
          })
          resolve({success: false, errors})
          return
        }

        // Get headers
        const headers = results.meta.fields || []

        // Build raw data array
        const rawData: string[][] = [headers]
        for (const row of rows) {
          const rowArray = headers.map((h) => row[h] || '')
          rawData.push(rowArray)
        }

        resolve({
          success: errors.length === 0,
          data: {
            headers,
            rows,
            rawData,
            rowCount: rows.length,
          },
          errors: errors.length > 0 ? errors : undefined,
        })
      },
      error: (error) => {
        resolve({
          success: false,
          errors: [
            {
              type: 'ParseError',
              code: 'Failed',
              message: error.message,
            },
          ],
        })
      },
    })
  })
}

/**
 * Parse a CSV string and return structured data
 */
export function parseCsvString(csvContent: string): CsvParseResult {
  const results = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  })

  const errors: CsvParseError[] = []

  if (results.errors && results.errors.length > 0) {
    for (const error of results.errors) {
      errors.push({
        type: error.type,
        code: error.code,
        message: error.message,
        row: error.row,
      })
    }
  }

  let rows = results.data as Record<string, string>[]

  // Skip tips row
  if (rows.length > 0) {
    const firstRow = rows[0]
    const firstRowValues = Object.values(firstRow)
    const looksLikeTips = firstRowValues.some(
      (value) =>
        typeof value === 'string' &&
        (value.toLowerCase().includes('required') || value.toLowerCase().includes('optional')),
    )

    if (looksLikeTips) {
      rows = rows.slice(1)
    }
  }

  if (rows.length > MAX_ROWS) {
    errors.push({
      type: 'RowLimit',
      code: 'TooManyRows',
      message: `CSV has ${rows.length} rows, but the maximum allowed is ${MAX_ROWS}.`,
    })
    return {success: false, errors}
  }

  const headers = results.meta.fields || []

  const rawData: string[][] = [headers]
  for (const row of rows) {
    const rowArray = headers.map((h) => row[h] || '')
    rawData.push(rowArray)
  }

  return {
    success: errors.length === 0,
    data: {
      headers,
      rows,
      rawData,
      rowCount: rows.length,
    },
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Get a cell value from a row, handling reference column notation
 * (e.g., "author→person.email" maps to a value for author field)
 */
export function getCellValue(
  row: Record<string, string>,
  fieldPath: string,
  headers?: string[],
): string | undefined {
  // Direct match
  if (row[fieldPath] !== undefined) {
    return row[fieldPath]
  }

  // If headers provided, check for reference notation (fieldPath→targetType.matchField)
  if (headers) {
    const referenceHeader = headers.find((h) => h.startsWith(`${fieldPath}→`))
    if (referenceHeader && row[referenceHeader] !== undefined) {
      return row[referenceHeader]
    }
  } else {
    // Search through row keys for reference notation
    for (const key of Object.keys(row)) {
      if (key.startsWith(`${fieldPath}→`)) {
        return row[key]
      }
    }
  }

  return undefined
}

/**
 * Check if a string value is empty/null
 */
export function isEmptyValue(value: string | undefined | null): boolean {
  if (value === undefined || value === null) return true
  const trimmed = value.trim()
  return trimmed === '' || trimmed.toLowerCase() === 'null'
}

/**
 * Split a comma-separated value into an array
 */
export function splitArrayValue(value: string): string[] {
  if (isEmptyValue(value)) return []
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v !== '')
}
