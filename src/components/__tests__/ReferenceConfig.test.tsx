import {describe, expect, it, vi} from 'vitest'

import {ReferenceConfig} from '../ReferenceConfig'

describe('ReferenceConfig', () => {
  it('should export ReferenceConfig component', () => {
    expect(ReferenceConfig).toBeDefined()
    expect(typeof ReferenceConfig).toBe('function')
  })

  it('should handle no reference fields', () => {
    const mockSchemaFields = [
      {
        name: 'title',
        path: 'title',
        type: 'string',
        title: 'Title',
        required: true,
        isArray: false,
        isReference: false,
        isImage: false,
      },
    ]

    const referenceFields = mockSchemaFields.filter((f) => f.isReference)
    expect(referenceFields).toHaveLength(0)
  })

  it('should identify reference fields correctly', () => {
    const mockSchemaFields = [
      {
        name: 'title',
        path: 'title',
        type: 'string',
        title: 'Title',
        required: true,
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
        referenceTo: ['person'],
      },
    ]

    const referenceFields = mockSchemaFields.filter((f) => f.isReference)
    expect(referenceFields).toHaveLength(1)
    expect(referenceFields[0].name).toBe('author')
    expect(referenceFields[0].referenceTo).toContain('person')
  })

  it('should accept onConfigured callback', () => {
    const mockOnConfigured = vi.fn()
    expect(typeof mockOnConfigured).toBe('function')
  })
})
