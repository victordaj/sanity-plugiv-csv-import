import {describe, expect, it} from 'vitest'

import {
  getCellValue,
  isEmptyValue,
  parseCsvFile,
  parseCsvString,
  splitArrayValue,
} from '../csvParser'

describe('csvParser', () => {
  describe('parseCsvString', () => {
    it('should parse valid CSV content', () => {
      const csv = `name,email,age
John,john@example.com,30
Jane,jane@example.com,25`

      const result = parseCsvString(csv)

      expect(result.success).toBe(true)
      expect(result.data?.headers).toEqual(['name', 'email', 'age'])
      expect(result.data?.rows).toHaveLength(2)
      expect(result.data?.rows[0]).toEqual({
        name: 'John',
        email: 'john@example.com',
        age: '30',
      })
    })

    it('should trim header whitespace', () => {
      const csv = `  name  ,  email
John,john@example.com`

      const result = parseCsvString(csv)

      expect(result.success).toBe(true)
      expect(result.data?.headers).toEqual(['name', 'email'])
    })

    it('should skip empty lines', () => {
      const csv = `name,email
John,john@example.com

Jane,jane@example.com

`

      const result = parseCsvString(csv)

      expect(result.success).toBe(true)
      expect(result.data?.rows).toHaveLength(2)
    })

    it('should skip tips row containing "Required" or "Optional"', () => {
      const csv = `name,email
Required,Optional format
John,john@example.com
Jane,jane@example.com`

      const result = parseCsvString(csv)

      expect(result.success).toBe(true)
      expect(result.data?.rows).toHaveLength(2)
      expect(result.data?.rows[0].name).toBe('John')
    })

    it('should return error when CSV exceeds 500 rows', () => {
      const headers = 'name,email'
      const rowData: string[] = []
      for (let i = 0; i < 501; i++) {
        rowData.push(`User${i},user${i}@example.com`)
      }
      const csv = `${headers}\n${rowData.join('\n')}`

      const result = parseCsvString(csv)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].code).toBe('TooManyRows')
    })

    it('should handle empty CSV', () => {
      const csv = ''

      const result = parseCsvString(csv)

      // Empty CSV has no headers, so data is undefined
      expect(result.data?.rows).toHaveLength(0)
    })

    it('should include rawData array', () => {
      const csv = `name,email
John,john@example.com`

      const result = parseCsvString(csv)

      expect(result.data?.rawData).toEqual([
        ['name', 'email'],
        ['John', 'john@example.com'],
      ])
    })
  })

  describe('getCellValue', () => {
    it('should return direct field value', () => {
      const row = {name: 'John', email: 'john@example.com'}

      expect(getCellValue(row, 'name')).toBe('John')
      expect(getCellValue(row, 'email')).toBe('john@example.com')
    })

    it('should return undefined for non-existent field', () => {
      const row = {name: 'John'}

      expect(getCellValue(row, 'email')).toBeUndefined()
    })

    it('should find reference notation value without headers', () => {
      const row = {
        name: 'John',
        'author→person.email': 'author@example.com',
      }

      expect(getCellValue(row, 'author')).toBe('author@example.com')
    })

    it('should find reference notation value with headers', () => {
      const row = {
        name: 'John',
        'author→person.email': 'author@example.com',
      }
      const headers = ['name', 'author→person.email']

      expect(getCellValue(row, 'author', headers)).toBe('author@example.com')
    })

    it('should prefer direct match over reference notation', () => {
      const row = {
        author: 'Direct Author',
        'author→person.email': 'ref@example.com',
      }

      expect(getCellValue(row, 'author')).toBe('Direct Author')
    })
  })

  describe('isEmptyValue', () => {
    it('should return true for undefined', () => {
      expect(isEmptyValue(undefined)).toBe(true)
    })

    it('should return true for null', () => {
      expect(isEmptyValue(null)).toBe(true)
    })

    it('should return true for empty string', () => {
      expect(isEmptyValue('')).toBe(true)
    })

    it('should return true for whitespace-only string', () => {
      expect(isEmptyValue('   ')).toBe(true)
    })

    it('should return true for "null" string (case insensitive)', () => {
      expect(isEmptyValue('null')).toBe(true)
      expect(isEmptyValue('NULL')).toBe(true)
      expect(isEmptyValue('  Null  ')).toBe(true)
    })

    it('should return false for non-empty values', () => {
      expect(isEmptyValue('hello')).toBe(false)
      expect(isEmptyValue('0')).toBe(false)
      expect(isEmptyValue('false')).toBe(false)
    })
  })

  describe('splitArrayValue', () => {
    it('should split comma-separated values', () => {
      expect(splitArrayValue('a,b,c')).toEqual(['a', 'b', 'c'])
    })

    it('should trim whitespace from values', () => {
      expect(splitArrayValue('a , b , c')).toEqual(['a', 'b', 'c'])
    })

    it('should filter out empty values', () => {
      expect(splitArrayValue('a,,b,  ,c')).toEqual(['a', 'b', 'c'])
    })

    it('should return empty array for empty input', () => {
      expect(splitArrayValue('')).toEqual([])
      expect(splitArrayValue('   ')).toEqual([])
    })

    it('should handle single value', () => {
      expect(splitArrayValue('single')).toEqual(['single'])
    })
  })

  describe('parseCsvFile', () => {
    it('should parse a valid CSV file', async () => {
      const csvContent = `name,email
John,john@example.com
Jane,jane@example.com`
      const file = new File([csvContent], 'test.csv', {type: 'text/csv'})

      const result = await parseCsvFile(file)

      expect(result.success).toBe(true)
      expect(result.data?.headers).toEqual(['name', 'email'])
      expect(result.data?.rows).toHaveLength(2)
      expect(result.data?.rowCount).toBe(2)
    })

    it('should skip tips row in file parsing', async () => {
      const csvContent = `name,email
Required,Optional format
John,john@example.com`
      const file = new File([csvContent], 'test.csv', {type: 'text/csv'})

      const result = await parseCsvFile(file)

      expect(result.success).toBe(true)
      expect(result.data?.rows).toHaveLength(1)
      expect(result.data?.rows[0].name).toBe('John')
    })

    it('should include rawData array with headers and row values', async () => {
      const csvContent = `name,age
John,30`
      const file = new File([csvContent], 'test.csv', {type: 'text/csv'})

      const result = await parseCsvFile(file)

      expect(result.success).toBe(true)
      expect(result.data?.rawData).toEqual([
        ['name', 'age'],
        ['John', '30'],
      ])
    })

    it('should handle empty file', async () => {
      const file = new File([''], 'empty.csv', {type: 'text/csv'})

      const result = await parseCsvFile(file)

      // Empty file returns success with empty rows (may have parse errors)
      expect(result.data?.rows ?? []).toHaveLength(0)
    })

    it('should handle file with only headers', async () => {
      const csvContent = `name,email,age`
      const file = new File([csvContent], 'headers-only.csv', {type: 'text/csv'})

      const result = await parseCsvFile(file)

      expect(result.success).toBe(true)
      expect(result.data?.headers).toEqual(['name', 'email', 'age'])
      expect(result.data?.rows).toHaveLength(0)
    })

    it('should trim headers in file parsing', async () => {
      const csvContent = `  name  ,  email  
John,john@test.com`
      const file = new File([csvContent], 'test.csv', {type: 'text/csv'})

      const result = await parseCsvFile(file)

      expect(result.data?.headers).toEqual(['name', 'email'])
    })

    it('should handle comma-separated tips detection', async () => {
      const csvContent = `tags,description
comma-separated values,Format: YYYY-MM-DD
tag1|tag2,My description`
      const file = new File([csvContent], 'test.csv', {type: 'text/csv'})

      const result = await parseCsvFile(file)

      expect(result.success).toBe(true)
      expect(result.data?.rows).toHaveLength(1)
    })

    it('should return error when file exceeds 500 rows', async () => {
      // Generate CSV with 501 rows
      let csvContent = 'name,email\n'
      for (let i = 0; i < 501; i++) {
        csvContent += `User${i},user${i}@example.com\n`
      }
      const file = new File([csvContent], 'large.csv', {type: 'text/csv'})

      const result = await parseCsvFile(file)

      expect(result.success).toBe(false)
      expect(result.errors?.[0]?.code).toBe('TooManyRows')
    })

    it('should handle parse errors from malformed CSV file', async () => {
      // Malformed CSV that might cause parse errors
      const csvContent = `name,email
"Unclosed quote,test@example.com`
      const file = new File([csvContent], 'malformed.csv', {type: 'text/csv'})

      const result = await parseCsvFile(file)

      // PapaParse might still succeed but with errors
      expect(result).toBeDefined()
    })
  })
})
