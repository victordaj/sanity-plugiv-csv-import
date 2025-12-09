import {describe, expect, it, vi} from 'vitest'

import {render} from '../../test-utils'
import {CsvUploader} from '../CsvUploader'

describe('CsvUploader', () => {
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

  const defaultProps = {
    schemaFields: mockSchemaFields,
    onCsvParsed: vi.fn(),
  }

  it('should render component', () => {
    const {container} = render(<CsvUploader {...defaultProps} />)
    expect(container).toBeTruthy()
  })

  it('should show upload instructions', () => {
    const {container} = render(<CsvUploader {...defaultProps} />)
    const text = container.textContent
    expect(text).toContain('CSV')
  })
})
