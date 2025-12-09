import {describe, expect, it} from 'vitest'

import {getCellValue, isEmptyValue, parseCsvString, splitArrayValue} from '../csvParser'

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
      const rows = Array.from({length: 501}, (_, i) => `User${i},user${i}@example.com`).join('\n')
      const csv = `${headers}\n${rows}`

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
})
