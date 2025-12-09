import {type Schema} from 'sanity'
import {describe, expect, it, vi} from 'vitest'

import {render} from '../../test-utils'
import {ReferenceConfig} from '../ReferenceConfig'

// Mock useSchema
vi.mock('sanity', () => ({
  useSchema: vi.fn(() => ({
    getTypeNames: () => ['person'],
    get: () => ({
      name: 'person',
      title: 'Person',
      type: 'document',
      fields: [{name: 'email', type: 'string'}],
    }),
  })),
}))

describe('ReferenceConfig', () => {
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

  const mockSchema = {
    get: vi.fn(() => ({
      name: 'person',
      title: 'Person',
      type: 'document',
      fields: [{name: 'email', type: 'string'}],
    })),
  }

  // Use a stable mock function to avoid infinite re-renders
  const mockOnConfigured = vi.fn()

  const defaultProps = {
    schemaFields: mockSchemaFields,
    schema: mockSchema as unknown as Schema,
    onConfigured: mockOnConfigured,
  }

  it('should render component with reference fields', () => {
    const {container} = render(<ReferenceConfig {...defaultProps} />)
    expect(container).toBeTruthy()
    // Should call onConfigured when initialized
    expect(mockOnConfigured).toHaveBeenCalled()
  })

  it('should handle no reference fields', () => {
    const propsWithoutRefs = {
      ...defaultProps,
      schemaFields: mockSchemaFields.filter((f) => !f.isReference),
    }
    const {container} = render(<ReferenceConfig {...propsWithoutRefs} />)
    expect(container).toBeTruthy()
  })
})
