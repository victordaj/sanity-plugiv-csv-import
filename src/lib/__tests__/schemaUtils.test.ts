import {describe, expect, it} from 'vitest'

import {
  getImageFields,
  getMatchableFields,
  getReferenceFields,
  getSchemaFields,
  getTopLevelFields,
  hasImageFields,
  hasReferenceFields,
  type SchemaField,
} from '../schemaUtils'

// Mock schema factory for testing
function createMockSchema(types: Record<string, unknown>) {
  return {
    get: (typeName: string) => types[typeName] || null,
  } as unknown as import('sanity').Schema
}

function createMockField(config: {
  name: string
  type: string | object
  title?: string
  validation?: unknown
}) {
  return {
    name: config.name,
    type:
      typeof config.type === 'string'
        ? {name: config.type, title: config.title}
        : {...config.type, title: config.title},
  }
}

// Helper to extract field names without nested callbacks
function getNames(fields: SchemaField[]): string[] {
  return fields.map((f) => f.name)
}

function getPaths(fields: SchemaField[]): string[] {
  return fields.map((f) => f.path)
}

describe('schemaUtils', () => {
  describe('getSchemaFields', () => {
    it('should return empty array for non-existent type', () => {
      const schema = createMockSchema({})
      const fields = getSchemaFields(schema, 'nonExistent')
      expect(fields).toEqual([])
    })

    it('should extract simple string fields', () => {
      const schema = createMockSchema({
        post: {
          name: 'post',
          type: 'document',
          fields: [createMockField({name: 'title', type: 'string', title: 'Title'})],
        },
      })

      const fields = getSchemaFields(schema, 'post')

      expect(fields).toHaveLength(1)
      expect(fields[0].name).toBe('title')
      expect(fields[0].path).toBe('title')
      expect(fields[0].type).toBe('string')
    })

    it('should skip fields starting with underscore', () => {
      const schema = createMockSchema({
        post: {
          name: 'post',
          type: 'document',
          fields: [
            createMockField({name: '_hidden', type: 'string'}),
            createMockField({name: 'title', type: 'string'}),
          ],
        },
      })

      const fields = getSchemaFields(schema, 'post')

      expect(fields).toHaveLength(1)
      expect(fields[0].name).toBe('title')
    })

    it('should identify reference fields', () => {
      const schema = createMockSchema({
        post: {
          name: 'post',
          type: 'document',
          fields: [
            createMockField({
              name: 'author',
              type: {name: 'reference', to: [{type: 'person'}]},
            }),
          ],
        },
      })

      const fields = getSchemaFields(schema, 'post')

      expect(fields).toHaveLength(1)
      expect(fields[0].name).toBe('author')
      expect(fields[0].isReference).toBe(true)
      expect(fields[0].referenceTarget).toContain('person')
    })

    it('should identify image fields', () => {
      const schema = createMockSchema({
        post: {
          name: 'post',
          type: 'document',
          fields: [createMockField({name: 'mainImage', type: 'image'})],
        },
      })

      const fields = getSchemaFields(schema, 'post')

      expect(fields).toHaveLength(1)
      expect(fields[0].name).toBe('mainImage')
      expect(fields[0].isImage).toBe(true)
    })

    it('should identify array fields', () => {
      const schema = createMockSchema({
        post: {
          name: 'post',
          type: 'document',
          fields: [
            createMockField({
              name: 'tags',
              type: {name: 'array', of: [{type: 'string'}]},
            }),
          ],
        },
      })

      const fields = getSchemaFields(schema, 'post')

      expect(fields).toHaveLength(1)
      expect(fields[0].name).toBe('tags')
      expect(fields[0].isArray).toBe(true)
      expect(fields[0].of).toEqual([{type: 'string'}])
    })

    it('should extract reference targets with type property', () => {
      const schema = createMockSchema({
        post: {
          name: 'post',
          type: 'document',
          fields: [
            createMockField({
              name: 'author',
              type: {name: 'reference', to: [{type: 'person'}, {type: 'organization'}]},
            }),
          ],
        },
      })

      const fields = getSchemaFields(schema, 'post')

      expect(fields[0].referenceTarget).toEqual(['person', 'organization'])
      expect(fields[0].referenceTo).toBe('person')
    })

    it('should handle array of references', () => {
      const schema = createMockSchema({
        post: {
          name: 'post',
          type: 'document',
          fields: [
            createMockField({
              name: 'relatedPosts',
              type: {
                name: 'array',
                of: [{type: 'reference', to: [{type: 'post'}]}],
              },
            }),
          ],
        },
      })

      const fields = getSchemaFields(schema, 'post')

      expect(fields).toHaveLength(1)
      expect(fields[0].isReference).toBe(true)
      expect(fields[0].isArray).toBe(true)
    })

    it('should handle array of images', () => {
      const schema = createMockSchema({
        post: {
          name: 'post',
          type: 'document',
          fields: [
            createMockField({
              name: 'gallery',
              type: {name: 'array', of: [{type: 'image'}]},
            }),
          ],
        },
      })

      const fields = getSchemaFields(schema, 'post')

      expect(fields).toHaveLength(1)
      expect(fields[0].isImage).toBe(true)
      expect(fields[0].isArray).toBe(true)
    })

    it('should handle reference targets with name property', () => {
      const schema = createMockSchema({
        post: {
          name: 'post',
          type: 'document',
          fields: [
            createMockField({
              name: 'author',
              type: {name: 'reference', to: [{name: 'person'}]},
            }),
          ],
        },
      })

      const fields = getSchemaFields(schema, 'post')

      expect(fields[0].referenceTarget).toContain('person')
    })

    it('should handle reference targets as strings', () => {
      const schema = createMockSchema({
        post: {
          name: 'post',
          type: 'document',
          fields: [
            createMockField({
              name: 'author',
              type: {name: 'reference', to: ['person', 'organization']},
            }),
          ],
        },
      })

      const fields = getSchemaFields(schema, 'post')

      expect(fields[0].referenceTarget).toContain('person')
      expect(fields[0].referenceTarget).toContain('organization')
    })

    it('should handle array of references with nested to targets', () => {
      const schema = createMockSchema({
        post: {
          name: 'post',
          type: 'document',
          fields: [
            createMockField({
              name: 'authors',
              type: {
                name: 'array',
                of: [{type: 'reference', to: [{type: 'person'}, {name: 'org'}]}],
              },
            }),
          ],
        },
      })

      const fields = getSchemaFields(schema, 'post')

      expect(fields[0].isReference).toBe(true)
      expect(fields[0].referenceTarget).toContain('person')
      expect(fields[0].referenceTarget).toContain('org')
    })

    it('should handle array of references with string targets', () => {
      const schema = createMockSchema({
        post: {
          name: 'post',
          type: 'document',
          fields: [
            createMockField({
              name: 'categories',
              type: {
                name: 'array',
                of: [{type: 'reference', to: ['category']}],
              },
            }),
          ],
        },
      })

      const fields = getSchemaFields(schema, 'post')

      expect(fields[0].referenceTarget).toContain('category')
    })

    it('should get correct array item type', () => {
      const schema = createMockSchema({
        post: {
          name: 'post',
          type: 'document',
          fields: [
            createMockField({
              name: 'numbers',
              type: {name: 'array', of: [{type: 'number'}]},
            }),
          ],
        },
      })

      const fields = getSchemaFields(schema, 'post')

      expect(fields[0].type).toBe('number')
      expect(fields[0].of).toEqual([{type: 'number'}])
    })

    it('should handle array with string type directly', () => {
      const schema = createMockSchema({
        post: {
          name: 'post',
          type: 'document',
          fields: [
            createMockField({
              name: 'items',
              type: {name: 'array', of: ['string']},
            }),
          ],
        },
      })

      const fields = getSchemaFields(schema, 'post')

      expect(fields[0].type).toBe('string')
    })

    it('should handle required validation rule', () => {
      const schema = createMockSchema({
        post: {
          name: 'post',
          type: 'document',
          fields: [
            {
              name: 'title',
              type: {
                name: 'string',
                validation: 'required',
              },
            },
          ],
        },
      })

      const fields = getSchemaFields(schema, 'post')

      expect(fields[0].required).toBe(true)
    })
  })

  describe('hasImageFields', () => {
    it('should return true when image fields exist', () => {
      const fields: SchemaField[] = [
        {
          name: 'mainImage',
          path: 'mainImage',
          type: 'image',
          title: 'Main Image',
          required: false,
          isArray: false,
          isReference: false,
          isImage: true,
        },
      ]

      expect(hasImageFields(fields)).toBe(true)
    })

    it('should return false when no image fields exist', () => {
      const fields: SchemaField[] = [
        {
          name: 'title',
          path: 'title',
          type: 'string',
          title: 'Title',
          required: false,
          isArray: false,
          isReference: false,
          isImage: false,
        },
      ]

      expect(hasImageFields(fields)).toBe(false)
    })

    it('should return false for empty array', () => {
      expect(hasImageFields([])).toBe(false)
    })
  })

  describe('hasReferenceFields', () => {
    it('should return true when reference fields exist', () => {
      const fields: SchemaField[] = [
        {
          name: 'author',
          path: 'author',
          type: 'reference',
          title: 'Author',
          required: false,
          isArray: false,
          isReference: true,
          isImage: false,
          referenceTarget: ['person'],
        },
      ]

      expect(hasReferenceFields(fields)).toBe(true)
    })

    it('should return false when no reference fields exist', () => {
      const fields: SchemaField[] = [
        {
          name: 'title',
          path: 'title',
          type: 'string',
          title: 'Title',
          required: false,
          isArray: false,
          isReference: false,
          isImage: false,
        },
      ]

      expect(hasReferenceFields(fields)).toBe(false)
    })
  })

  describe('getTopLevelFields', () => {
    it('should filter out nested fields', () => {
      const fields: SchemaField[] = [
        {
          name: 'title',
          path: 'title',
          type: 'string',
          title: 'Title',
          required: false,
          isArray: false,
          isReference: false,
          isImage: false,
        },
        {
          name: 'title',
          path: 'seo.title',
          type: 'string',
          title: 'SEO Title',
          required: false,
          isArray: false,
          isReference: false,
          isImage: false,
        },
        {
          name: 'mainImage',
          path: 'mainImage',
          type: 'image',
          title: 'Main Image',
          required: false,
          isArray: false,
          isReference: false,
          isImage: true,
        },
      ]

      const topLevel = getTopLevelFields(fields)

      expect(topLevel).toHaveLength(2)
      expect(getPaths(topLevel)).toEqual(['title', 'mainImage'])
    })

    it('should return empty array for all nested fields', () => {
      const fields: SchemaField[] = [
        {
          name: 'title',
          path: 'seo.title',
          type: 'string',
          title: 'Title',
          required: false,
          isArray: false,
          isReference: false,
          isImage: false,
        },
      ]

      expect(getTopLevelFields(fields)).toHaveLength(0)
    })
  })

  describe('getMatchableFields', () => {
    it('should return string, slug, email, and url fields', () => {
      const schema = createMockSchema({
        person: {
          name: 'person',
          type: 'document',
          fields: [
            createMockField({name: 'name', type: 'string'}),
            createMockField({name: 'email', type: 'email'}),
            createMockField({name: 'slug', type: 'slug'}),
            createMockField({name: 'website', type: 'url'}),
            createMockField({name: 'age', type: 'number'}),
            createMockField({name: 'bio', type: 'text'}),
          ],
        },
      })

      const matchable = getMatchableFields(schema, 'person')

      expect(matchable).toHaveLength(4)
      expect(getNames(matchable)).toContain('name')
      expect(getNames(matchable)).toContain('email')
      expect(getNames(matchable)).toContain('slug')
      expect(getNames(matchable)).toContain('website')
      expect(getNames(matchable)).not.toContain('age')
      expect(getNames(matchable)).not.toContain('bio')
    })

    it('should return empty array for non-existent type', () => {
      const schema = createMockSchema({})
      const matchable = getMatchableFields(schema, 'nonExistent')
      expect(matchable).toEqual([])
    })
  })

  describe('getImageFields', () => {
    it('should return only image fields', () => {
      const fields: SchemaField[] = [
        {
          name: 'title',
          path: 'title',
          type: 'string',
          title: 'Title',
          required: false,
          isArray: false,
          isReference: false,
          isImage: false,
        },
        {
          name: 'mainImage',
          path: 'mainImage',
          type: 'image',
          title: 'Main Image',
          required: false,
          isArray: false,
          isReference: false,
          isImage: true,
        },
        {
          name: 'gallery',
          path: 'gallery',
          type: 'image',
          title: 'Gallery',
          required: false,
          isArray: true,
          isReference: false,
          isImage: true,
        },
      ]

      const imageFields = getImageFields(fields)

      expect(imageFields).toHaveLength(2)
      expect(getNames(imageFields)).toEqual(['mainImage', 'gallery'])
    })
  })

  describe('getReferenceFields', () => {
    it('should return only reference fields', () => {
      const fields: SchemaField[] = [
        {
          name: 'title',
          path: 'title',
          type: 'string',
          title: 'Title',
          required: false,
          isArray: false,
          isReference: false,
          isImage: false,
        },
        {
          name: 'author',
          path: 'author',
          type: 'reference',
          title: 'Author',
          required: false,
          isArray: false,
          isReference: true,
          isImage: false,
          referenceTarget: ['person'],
        },
        {
          name: 'categories',
          path: 'categories',
          type: 'reference',
          title: 'Categories',
          required: false,
          isArray: true,
          isReference: true,
          isImage: false,
          referenceTarget: ['category'],
        },
      ]

      const referenceFields = getReferenceFields(fields)

      expect(referenceFields).toHaveLength(2)
      expect(getNames(referenceFields)).toEqual(['author', 'categories'])
    })
  })
})
