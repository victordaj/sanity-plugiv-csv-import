import {describe, expect, it} from 'vitest'

import {type ReferenceMatchConfig} from '../../components/ReferenceConfig'
import {type SchemaField} from '../schemaUtils'
import {
  getValidationSummary,
  isValidCsvData,
  validateCsvData,
  type ValidationIssue,
} from '../validator'

// Helper to create a minimal schema field
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

// Helper functions to avoid nested callbacks in lint
function filterByField(issues: ValidationIssue[], field: string): ValidationIssue[] {
  return issues.filter((issue) => issue.field === field)
}

function filterByMessage(issues: ValidationIssue[], substring: string): ValidationIssue[] {
  return issues.filter((issue) => issue.message.includes(substring))
}

function hasFieldMatch(issues: ValidationIssue[], field: string): boolean {
  return issues.some((issue) => issue.field === field)
}

describe('validator', () => {
  describe('validateCsvData', () => {
    it('should return valid for empty rows with no required fields', () => {
      const headers = ['name']
      const rows: Record<string, string>[] = []
      const options = {
        schemaFields: [createField({name: 'name', path: 'name'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)

      expect(result.isValid).toBe(true)
      expect(result.validRowCount).toBe(0)
    })

    it('should validate rows with all required fields present', () => {
      const headers = ['title', 'content']
      const rows = [{title: 'Hello', content: 'World'}]
      const options = {
        schemaFields: [
          createField({name: 'title', path: 'title', required: true}),
          createField({name: 'content', path: 'content'}),
        ],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)

      expect(result.isValid).toBe(true)
      expect(result.validRowCount).toBe(1)
    })

    it('should report error for missing required field value', () => {
      const headers = ['title', 'content']
      const rows = [{title: '', content: 'World'}]
      const options = {
        schemaFields: [
          createField({name: 'title', path: 'title', required: true}),
          createField({name: 'content', path: 'content'}),
        ],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)

      expect(result.isValid).toBe(false)
      expect(result.validRowCount).toBe(0)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          row: 0,
          field: 'title',
          type: 'error',
          message: 'Required field is empty',
        }),
      )
    })

    it('should warn about missing required field in headers', () => {
      const headers = ['content']
      const rows = [{content: 'World'}]
      const options = {
        schemaFields: [
          createField({name: 'title', path: 'title', required: true}),
          createField({name: 'content', path: 'content'}),
        ],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          row: -1,
          field: 'title',
          type: 'warning',
          message: expect.stringContaining('Required field "title" not found'),
        }),
      )
    })

    it('should warn about unknown columns', () => {
      const headers = ['title', 'unknownColumn']
      const rows = [{title: 'Hello', unknownColumn: 'ignored'}]
      const options = {
        schemaFields: [createField({name: 'title', path: 'title'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          row: -1,
          field: 'unknownColumn',
          type: 'warning',
          message: expect.stringContaining('Unknown column'),
        }),
      )
    })

    it('should validate multiple rows independently', () => {
      const headers = ['title']
      const rows = [
        {title: 'Valid'},
        {title: ''}, // Invalid - empty required
        {title: 'Also Valid'},
      ]
      const options = {
        schemaFields: [createField({name: 'title', path: 'title', required: true})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)

      expect(result.validRowCount).toBe(2)
      expect(result.rowValidation).toEqual([true, false, true])
    })

    it('should not flag _id column as unknown', () => {
      const headers = ['_id', 'title']
      const rows = [{_id: 'existing-doc-id', title: 'Hello'}]
      const options = {
        schemaFields: [createField({name: 'title', path: 'title'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)

      // _id should not trigger "unknown column" warning
      const idIssues = filterByField(result.issues, '_id')
      expect(idIssues).toHaveLength(0)
    })

    it('should handle reference notation in headers', () => {
      const headers = ['title', 'author→person.email']
      const rows = [{title: 'Hello', 'author→person.email': 'author@example.com'}]
      const options = {
        schemaFields: [
          createField({name: 'title', path: 'title'}),
          createField({name: 'author', path: 'author', type: 'reference'}),
        ],
        referenceConfig: [
          {fieldPath: 'author', targetType: 'person', matchField: 'email'},
        ] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)

      // Reference notation should be recognized, not flagged as unknown
      const unknownWarnings = filterByMessage(result.issues, 'Unknown')
      const authorUnknown = hasFieldMatch(unknownWarnings, 'author→person.email')
      expect(authorUnknown).toBe(false)
    })

    it('should handle image alt text columns', () => {
      const headers = ['title', 'mainImage', 'mainImage.alt']
      const rows = [{title: 'Hello', mainImage: 'image.jpg', 'mainImage.alt': 'Alt text'}]
      const options = {
        schemaFields: [
          createField({name: 'title', path: 'title'}),
          createField({name: 'mainImage', path: 'mainImage', type: 'image', isImage: true}),
        ],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)

      // .alt suffix should be recognized for image fields
      const altIssues = filterByField(result.issues, 'mainImage.alt')
      expect(altIssues).toHaveLength(0)
    })

    // URL validation tests
    it('should validate URL fields - valid URL', () => {
      const headers = ['website']
      const rows = [{website: 'https://example.com'}]
      const options = {
        schemaFields: [createField({name: 'website', path: 'website', type: 'url'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      const urlErrors = filterByMessage(result.issues, 'Invalid URL')
      expect(urlErrors).toHaveLength(0)
    })

    it('should validate URL fields - invalid URL', () => {
      const headers = ['website']
      const rows = [{website: 'not-a-valid-url'}]
      const options = {
        schemaFields: [createField({name: 'website', path: 'website', type: 'url'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Invalid URL'),
        }),
      )
    })

    // Email validation tests
    it('should validate email fields - valid email', () => {
      const headers = ['email']
      const rows = [{email: 'test@example.com'}]
      const options = {
        schemaFields: [createField({name: 'email', path: 'email', type: 'email'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      const emailErrors = filterByMessage(result.issues, 'Invalid email')
      expect(emailErrors).toHaveLength(0)
    })

    it('should validate email fields - invalid email', () => {
      const headers = ['email']
      const rows = [{email: 'not-an-email'}]
      const options = {
        schemaFields: [createField({name: 'email', path: 'email', type: 'email'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Invalid email'),
        }),
      )
    })

    // Number validation tests
    it('should validate number fields - valid number', () => {
      const headers = ['count']
      const rows = [{count: '42'}]
      const options = {
        schemaFields: [createField({name: 'count', path: 'count', type: 'number'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      const numberErrors = filterByMessage(result.issues, 'Invalid number')
      expect(numberErrors).toHaveLength(0)
    })

    it('should validate number fields - invalid number', () => {
      const headers = ['count']
      const rows = [{count: 'not-a-number'}]
      const options = {
        schemaFields: [createField({name: 'count', path: 'count', type: 'number'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Invalid number'),
        }),
      )
    })

    // Date validation tests
    it('should validate date fields - valid ISO date', () => {
      const headers = ['publishedAt']
      const rows = [{publishedAt: '2024-01-15'}]
      const options = {
        schemaFields: [createField({name: 'publishedAt', path: 'publishedAt', type: 'date'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      const dateErrors = filterByMessage(result.issues, 'Invalid date')
      expect(dateErrors).toHaveLength(0)
    })

    it('should validate date fields - invalid date format', () => {
      const headers = ['publishedAt']
      const rows = [{publishedAt: '15/01/2024'}]
      const options = {
        schemaFields: [createField({name: 'publishedAt', path: 'publishedAt', type: 'date'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Invalid date'),
        }),
      )
    })

    it('should validate datetime fields with ISO format', () => {
      const headers = ['createdAt']
      const rows = [{createdAt: '2024-01-15T10:30:00Z'}]
      const options = {
        schemaFields: [createField({name: 'createdAt', path: 'createdAt', type: 'datetime'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      const dateErrors = filterByMessage(result.issues, 'Invalid date')
      expect(dateErrors).toHaveLength(0)
    })

    // Geopoint validation tests
    it('should validate geopoint fields - valid coordinates', () => {
      const headers = ['location']
      const rows = [{location: '37.7749,-122.4194'}]
      const options = {
        schemaFields: [createField({name: 'location', path: 'location', type: 'geopoint'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      const geoErrors = filterByMessage(result.issues, 'geopoint')
      expect(geoErrors).toHaveLength(0)
    })

    it('should validate geopoint fields - invalid format', () => {
      const headers = ['location']
      const rows = [{location: 'invalid-format'}]
      const options = {
        schemaFields: [createField({name: 'location', path: 'location', type: 'geopoint'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Invalid geopoint format'),
        }),
      )
    })

    it('should validate geopoint fields - invalid latitude', () => {
      const headers = ['location']
      const rows = [{location: '95.0,-122.4194'}] // lat > 90
      const options = {
        schemaFields: [createField({name: 'location', path: 'location', type: 'geopoint'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Latitude must be between'),
        }),
      )
    })

    it('should validate geopoint fields - invalid longitude', () => {
      const headers = ['location']
      const rows = [{location: '37.7749,-200.0'}] // lng < -180
      const options = {
        schemaFields: [createField({name: 'location', path: 'location', type: 'geopoint'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Longitude must be between'),
        }),
      )
    })

    it('should validate geopoint fields - non-numeric coordinates', () => {
      const headers = ['location']
      const rows = [{location: 'abc,def'}]
      const options = {
        schemaFields: [createField({name: 'location', path: 'location', type: 'geopoint'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Invalid geopoint coordinates'),
        }),
      )
    })

    // Slug validation tests
    it('should warn about slug with spaces', () => {
      const headers = ['slug']
      const rows = [{slug: 'my slug with spaces'}]
      const options = {
        schemaFields: [createField({name: 'slug', path: 'slug', type: 'slug'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('Slug contains spaces'),
        }),
      )
    })

    it('should accept valid slug without spaces', () => {
      const headers = ['slug']
      const rows = [{slug: 'my-valid-slug'}]
      const options = {
        schemaFields: [createField({name: 'slug', path: 'slug', type: 'slug'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      const slugWarnings = filterByMessage(result.issues, 'Slug contains spaces')
      expect(slugWarnings).toHaveLength(0)
    })

    // Image validation tests
    it('should warn that image needs to be uploaded', () => {
      const headers = ['mainImage']
      const rows = [{mainImage: 'photo.jpg'}]
      const options = {
        schemaFields: [
          createField({name: 'mainImage', path: 'mainImage', type: 'image', isImage: true}),
        ],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('must be uploaded'),
        }),
      )
    })

    // Reference validation tests
    it('should warn about reference field without config', () => {
      const headers = ['author']
      const rows = [{author: 'some-author-value'}]
      const options = {
        schemaFields: [
          createField({name: 'author', path: 'author', type: 'reference', isReference: true}),
        ],
        referenceConfig: [] as ReferenceMatchConfig[], // No config
      }

      const result = validateCsvData(headers, rows, options)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('no match configuration'),
        }),
      )
    })

    it('should not warn about reference with arrow notation', () => {
      const headers = ['author']
      const rows = [{author: 'john@example.com→email'}]
      const options = {
        schemaFields: [
          createField({name: 'author', path: 'author', type: 'reference', isReference: true}),
        ],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      const refWarnings = filterByMessage(result.issues, 'no match configuration')
      expect(refWarnings).toHaveLength(0)
    })

    // Array validation tests
    it('should validate array of numbers with pipe separator', () => {
      const headers = ['scores']
      const rows = [{scores: '10|20|30'}]
      const options = {
        schemaFields: [
          createField({
            name: 'scores',
            path: 'scores',
            type: 'number',
            isArray: true,
            of: [{type: 'number'}],
          }),
        ],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      const arrayErrors = filterByMessage(result.issues, 'invalid number')
      expect(arrayErrors).toHaveLength(0)
    })

    it('should error on array with invalid number values', () => {
      const headers = ['scores']
      const rows = [{scores: '10|abc|30'}]
      const options = {
        schemaFields: [
          createField({
            name: 'scores',
            path: 'scores',
            type: 'number',
            isArray: true,
            of: [{type: 'number'}],
          }),
        ],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Array contains invalid number'),
        }),
      )
    })

    // Boolean validation - no error expected for any value (parsed as truthy/falsy)
    it('should accept boolean field values', () => {
      const headers = ['active']
      const rows = [{active: 'true'}, {active: 'false'}, {active: '1'}, {active: '0'}]
      const options = {
        schemaFields: [createField({name: 'active', path: 'active', type: 'boolean'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      expect(result.isValid).toBe(true)
    })
  })

  describe('isValidCsvData', () => {
    it('should return true for valid data', () => {
      const headers = ['title']
      const rows = [{title: 'Hello'}]
      const options = {
        schemaFields: [createField({name: 'title', path: 'title'})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const isValid = isValidCsvData(headers, rows, options)
      expect(isValid).toBe(true)
    })

    it('should return false for invalid data', () => {
      const headers = ['title']
      const rows = [{title: ''}]
      const options = {
        schemaFields: [createField({name: 'title', path: 'title', required: true})],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const isValid = isValidCsvData(headers, rows, options)
      expect(isValid).toBe(false)
    })
  })

  describe('getValidationSummary', () => {
    it('should return correct summary counts', () => {
      const headers = ['title', 'count']
      const rows = [
        {title: 'Valid', count: '10'},
        {title: '', count: '20'}, // Invalid - missing required
        {title: 'Also Valid', count: 'not-a-number'}, // Invalid - bad number
      ]
      const options = {
        schemaFields: [
          createField({name: 'title', path: 'title', required: true}),
          createField({name: 'count', path: 'count', type: 'number'}),
        ],
        referenceConfig: [] as ReferenceMatchConfig[],
      }

      const result = validateCsvData(headers, rows, options)
      const summary = getValidationSummary(result)

      expect(summary.total).toBe(3)
      expect(summary.valid).toBe(1)
      expect(summary.invalid).toBe(2)
      expect(summary.errors).toBeGreaterThan(0)
    })
  })
})
