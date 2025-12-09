import {describe, expect, it} from 'vitest'

import {type ReferenceMatchConfig} from '../../components/ReferenceConfig'
import {type SchemaField} from '../schemaUtils'
import {validateCsvData, type ValidationIssue} from '../validator'

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
  })
})
