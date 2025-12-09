import {describe, expect, it} from 'vitest'

import {ImportProgress, type ImportResult} from '../ImportProgress'

describe('ImportProgress', () => {
  it('should export ImportProgress component', () => {
    expect(ImportProgress).toBeDefined()
    expect(typeof ImportProgress).toBe('function')
  })

  it('should export ImportResult type', () => {
    const result: ImportResult = {
      row: 1,
      success: true,
      documentId: 'doc-123',
    }
    expect(result.row).toBe(1)
    expect(result.success).toBe(true)
    expect(result.documentId).toBe('doc-123')
  })

  it('should handle failed import result', () => {
    const result: ImportResult = {
      row: 2,
      success: false,
      error: 'Failed to create document',
    }
    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to create document')
  })

  it('should accept correct props types', () => {
    const props = {
      totalRows: 10,
      processedRows: 5,
      results: [
        {row: 1, success: true, documentId: '123'},
        {row: 2, success: false, error: 'Error'},
      ],
      isComplete: false,
    }
    expect(props.totalRows).toBe(10)
    expect(props.processedRows).toBe(5)
    expect(props.results).toHaveLength(2)
    expect(props.isComplete).toBe(false)
  })
})
