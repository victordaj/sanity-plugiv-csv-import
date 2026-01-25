import {type Schema} from 'sanity'
import {describe, expect, it, vi} from 'vitest'

import {type SchemaField} from '../../lib/schemaUtils'
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

  const mockSchemaFields: SchemaField[] = [
    {
      name: 'title',
      path: 'title',
      type: 'string',
      title: 'Title',
      required: true,
      isArray: false,
      isReference: false,
      isImage: false,
      isRichText: false,
    },
  ]

  const defaultProps = {
    documentTypes: [
      {name: 'post', title: 'Post'},
      {name: 'author', title: 'Author'},
    ],
    selectedType: '',
    schemaFields: [] as SchemaField[],
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

  it('should show schema fields when type is selected', () => {
    const {container} = render(
      <TypeSelector {...defaultProps} selectedType="post" schemaFields={mockSchemaFields} />,
    )
    expect(container.textContent).toContain('title')
  })

  it('should show rich text indicator when field is rich text', () => {
    const richTextFields: SchemaField[] = [
      {
        name: 'body',
        path: 'body',
        type: 'block',
        title: 'Body',
        required: false,
        isArray: true,
        isReference: false,
        isImage: false,
        isRichText: true,
      },
    ]
    const {container} = render(
      <TypeSelector {...defaultProps} selectedType="post" schemaFields={richTextFields} />,
    )
    expect(container.textContent).toContain('Markdown')
    expect(container.textContent).toContain('Rich Text Fields Detected')
  })
})
