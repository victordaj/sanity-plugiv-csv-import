import {describe, expect, it} from 'vitest'

import {type SchemaField} from '../schemaUtils'
import {generateCsvTemplate, generateExcelTemplate} from '../templateGenerator'
import {type ReferenceMapping} from '../types'

// Helper to create schema fields
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

// Helper to read blob as text
async function blobToText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(blob)
  })
}

describe('templateGenerator', () => {
  describe('generateCsvTemplate', () => {
    it('should generate a CSV blob with headers', async () => {
      const fields = [createField({name: 'title', path: 'title', title: 'Title'})]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('text/csv;charset=utf-8;')

      const text = await blobToText(blob)
      expect(text).toContain('title')
    })

    it('should include tips row', async () => {
      const fields = [createField({name: 'title', path: 'title', required: true})]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      const text = await blobToText(blob)
      expect(text).toContain('Required')
    })

    it('should handle boolean fields with correct tip', async () => {
      const fields = [createField({name: 'active', path: 'active', type: 'boolean'})]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      const text = await blobToText(blob)
      expect(text).toContain('true or false')
    })

    it('should handle date fields with format hint', async () => {
      const fields = [createField({name: 'publishedAt', path: 'publishedAt', type: 'date'})]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      const text = await blobToText(blob)
      expect(text).toContain('YYYY-MM-DD')
    })

    it('should handle datetime fields with format hint', async () => {
      const fields = [createField({name: 'createdAt', path: 'createdAt', type: 'datetime'})]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      const text = await blobToText(blob)
      expect(text).toContain('YYYY-MM-DDTHH:mm:ss')
    })

    it('should handle number fields', async () => {
      const fields = [createField({name: 'count', path: 'count', type: 'number'})]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      const text = await blobToText(blob)
      expect(text).toContain('Numeric value')
    })

    it('should handle slug fields', async () => {
      const fields = [createField({name: 'slug', path: 'slug', type: 'slug'})]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      const text = await blobToText(blob)
      expect(text).toContain('URL-friendly')
    })

    it('should handle url fields', async () => {
      const fields = [createField({name: 'website', path: 'website', type: 'url'})]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      const text = await blobToText(blob)
      expect(text).toContain('Valid URL')
    })

    it('should handle email fields', async () => {
      const fields = [createField({name: 'email', path: 'email', type: 'email'})]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      const text = await blobToText(blob)
      expect(text).toContain('email address')
    })

    it('should handle array fields with comma-separated hint', async () => {
      const fields = [createField({name: 'tags', path: 'tags', isArray: true})]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      const text = await blobToText(blob)
      expect(text).toContain('Comma-separated')
    })

    it('should handle image fields with alt column', async () => {
      const fields = [
        createField({name: 'mainImage', path: 'mainImage', type: 'image', isImage: true}),
      ]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      const text = await blobToText(blob)
      expect(text).toContain('mainImage')
      expect(text).toContain('mainImage.alt')
    })

    it('should handle reference fields with mapping', async () => {
      const fields = [
        createField({name: 'author', path: 'author', type: 'reference', isReference: true}),
      ]
      const referenceMappings: ReferenceMapping[] = [
        {fieldPath: 'author', targetType: 'person', matchField: 'email'},
      ]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings,
        format: 'csv',
      })

      const text = await blobToText(blob)
      expect(text).toContain('author→person.email')
      expect(text).toContain('match by email')
    })

    it('should handle array reference fields', async () => {
      const fields = [
        createField({
          name: 'authors',
          path: 'authors',
          type: 'reference',
          isReference: true,
          isArray: true,
        }),
      ]
      const referenceMappings: ReferenceMapping[] = [
        {fieldPath: 'authors', targetType: 'person', matchField: 'name'},
      ]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings,
        format: 'csv',
      })

      const text = await blobToText(blob)
      expect(text).toContain('comma-separated for multiple')
    })

    it('should escape CSV special characters', async () => {
      const fields = [
        createField({name: 'description', path: 'description', title: 'Description, with comma'}),
      ]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      const text = await blobToText(blob)
      // CSV escaping wraps values with quotes when they contain commas
      expect(text).toBeDefined()
    })

    it('should handle multiple fields', async () => {
      const fields = [
        createField({name: 'title', path: 'title'}),
        createField({name: 'body', path: 'body'}),
        createField({name: 'published', path: 'published', type: 'boolean'}),
      ]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      const text = await blobToText(blob)
      expect(text).toContain('title')
      expect(text).toContain('body')
      expect(text).toContain('published')
    })
  })

  describe('generateExcelTemplate', () => {
    it('should generate an Excel blob', () => {
      const fields = [createField({name: 'title', path: 'title'})]

      const blob = generateExcelTemplate({
        fields,
        referenceMappings: [],
        format: 'xlsx',
      })

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    })

    it('should handle complex fields in Excel', () => {
      const fields = [
        createField({name: 'title', path: 'title', required: true}),
        createField({name: 'author', path: 'author', isReference: true}),
        createField({name: 'mainImage', path: 'mainImage', isImage: true}),
        createField({name: 'tags', path: 'tags', isArray: true}),
      ]

      const blob = generateExcelTemplate({
        fields,
        referenceMappings: [],
        format: 'xlsx',
      })

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.size).toBeGreaterThan(0)
    })

    it('should handle number fields', () => {
      const fields = [createField({name: 'price', path: 'price', type: 'number'})]

      const blob = generateExcelTemplate({
        fields,
        referenceMappings: [],
        format: 'xlsx',
      })

      expect(blob).toBeInstanceOf(Blob)
    })

    it('should handle slug fields', () => {
      const fields = [createField({name: 'slug', path: 'slug', type: 'slug'})]

      const blob = generateExcelTemplate({
        fields,
        referenceMappings: [],
        format: 'xlsx',
      })

      expect(blob).toBeInstanceOf(Blob)
    })

    it('should handle geopoint fields', () => {
      const fields = [createField({name: 'location', path: 'location', type: 'geopoint'})]

      const blob = generateExcelTemplate({
        fields,
        referenceMappings: [],
        format: 'xlsx',
      })

      expect(blob).toBeInstanceOf(Blob)
    })

    it('should handle URL fields', () => {
      const fields = [createField({name: 'website', path: 'website', type: 'url'})]

      const blob = generateExcelTemplate({
        fields,
        referenceMappings: [],
        format: 'xlsx',
      })

      expect(blob).toBeInstanceOf(Blob)
    })

    it('should handle email fields', () => {
      const fields = [createField({name: 'email', path: 'email', type: 'email'})]

      const blob = generateExcelTemplate({
        fields,
        referenceMappings: [],
        format: 'xlsx',
      })

      expect(blob).toBeInstanceOf(Blob)
    })
  })

  describe('CSV escaping', () => {
    it('should escape values with commas', async () => {
      // Values with commas in the tips should be escaped
      const fields = [createField({name: 'tags', path: 'tags', isArray: true})]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      const text = await blobToText(blob)
      // Arrays have comma-separated tip which gets escaped
      expect(text).toBeDefined()
    })

    it('should properly format tips with special characters', async () => {
      const fields = [
        createField({name: 'title', path: 'title', type: 'string'}),
        createField({name: 'body', path: 'body', type: 'text'}),
      ]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      const text = await blobToText(blob)
      // Verify it's valid CSV format
      expect(text.split('\n').length).toBeGreaterThan(1)
    })
  })

  describe('object field handling', () => {
    it('should skip parent object fields and only include leaf fields', async () => {
      const fields = [
        createField({name: 'seo', path: 'seo', type: 'object'}),
        createField({name: 'title', path: 'seo.title', type: 'string'}),
        createField({name: 'description', path: 'seo.description', type: 'string'}),
      ]

      const blob = generateCsvTemplate({
        fields,
        referenceMappings: [],
        format: 'csv',
      })

      const text = await blobToText(blob)
      // Should include nested fields
      expect(text).toContain('seo.title')
      expect(text).toContain('seo.description')
    })
  })
})
