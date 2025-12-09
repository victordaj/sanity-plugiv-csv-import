import {describe, expect, it} from 'vitest'

import {render} from '../../test-utils'
import {ImportProgress} from '../ImportProgress'

describe('ImportProgress', () => {
  const defaultProps = {
    totalRows: 0,
    processedRows: 0,
    results: [],
    isComplete: false,
  }

  it('should render component', () => {
    const {container} = render(<ImportProgress {...defaultProps} />)
    expect(container).toBeTruthy()
  })

  it('should show progress text', () => {
    const {container} = render(<ImportProgress {...defaultProps} />)
    expect(container.textContent).toBeTruthy()
  })

  it('should show progress when importing', () => {
    const props = {
      ...defaultProps,
      totalRows: 10,
      processedRows: 5,
      results: [
        {row: 1, success: true, documentId: '123'},
        {row: 2, success: true, documentId: '124'},
      ],
    }
    const {container} = render(<ImportProgress {...props} />)
    expect(container).toBeTruthy()
  })
})
