import {type Schema} from 'sanity'
import {describe, expect, it, vi} from 'vitest'

import {render} from '../../test-utils'
import {TypeSelector} from '../TypeSelector'

describe('TypeSelector', () => {
  const mockSchema = {
    get: vi.fn((typeName: string) => ({
      name: typeName,
      title: typeName.charAt(0).toUpperCase() + typeName.slice(1),
      type: 'document',
      fields: [],
    })),
  }

  const defaultProps = {
    documentTypes: [
      {name: 'post', title: 'Post'},
      {name: 'author', title: 'Author'},
    ],
    selectedType: '',
    onTypeSelect: vi.fn(),
    schema: mockSchema as unknown as Schema,
  }

  it('should render component', () => {
    const {container} = render(<TypeSelector {...defaultProps} />)
    expect(container).toBeTruthy()
  })

  it('should show document types', () => {
    const {container} = render(<TypeSelector {...defaultProps} />)
    const text = container.textContent
    expect(text).toContain('Post')
  })

  it('should handle selected type', () => {
    const {container} = render(<TypeSelector {...defaultProps} selectedType="post" />)
    expect(container).toBeTruthy()
  })
})
