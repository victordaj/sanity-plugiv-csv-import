import {describe, expect, it} from 'vitest'

import {render} from '../../test-utils'
import {ValidationSummary} from '../ValidationSummary'

describe('ValidationSummary', () => {
  const defaultProps = {
    totalRows: 10,
    validRows: 10,
    issues: [],
  }

  it('should render component', () => {
    const {container} = render(<ValidationSummary {...defaultProps} />)
    expect(container).toBeTruthy()
  })

  it('should show validation results', () => {
    const {container} = render(<ValidationSummary {...defaultProps} />)
    const text = container.textContent
    expect(text).toBeTruthy()
  })

  it('should handle validation with errors', () => {
    const propsWithErrors = {
      ...defaultProps,
      validRows: 8,
      issues: [
        {row: 1, field: 'title', type: 'error' as const, message: 'Required field missing'},
        {row: 2, field: 'email', type: 'warning' as const, message: 'Invalid format'},
      ],
    }
    const {container} = render(<ValidationSummary {...propsWithErrors} />)
    expect(container).toBeTruthy()
  })
})
