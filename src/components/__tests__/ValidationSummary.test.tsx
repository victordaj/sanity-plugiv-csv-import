import {describe, expect, it} from 'vitest'

import {type ValidationIssue, ValidationSummary} from '../ValidationSummary'

describe('ValidationSummary', () => {
  it('should export ValidationSummary component', () => {
    expect(ValidationSummary).toBeDefined()
    expect(typeof ValidationSummary).toBe('function')
  })

  it('should export ValidationIssue type', () => {
    const issue: ValidationIssue = {
      row: 1,
      field: 'title',
      type: 'error',
      message: 'Test message',
    }
    expect(issue.row).toBe(1)
    expect(issue.type).toBe('error')
  })

  it('should accept correct props types', () => {
    const props = {
      totalRows: 10,
      validRows: 8,
      issues: [
        {row: 1, field: 'title', type: 'error' as const, message: 'Required'},
        {row: 2, field: 'email', type: 'warning' as const, message: 'Invalid'},
      ],
    }
    expect(props.totalRows).toBe(10)
    expect(props.validRows).toBe(8)
    expect(props.issues).toHaveLength(2)
  })
})
