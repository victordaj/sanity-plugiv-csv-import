import {describe, expect, it} from 'vitest'

import {render} from '../../test-utils'
import {ImportProgress, type ImportResult} from '../ImportProgress'

describe('ImportProgress', () => {
  const defaultProps = {
    totalRows: 10,
    processedRows: 0,
    results: [] as ImportResult[],
    isComplete: false,
  }

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

  it('should render the component', () => {
    const {container} = render(<ImportProgress {...defaultProps} />)
    expect(container).toBeTruthy()
  })

  it('should show importing message when not complete', () => {
    const {container} = render(<ImportProgress {...defaultProps} />)
    expect(container.textContent).toContain('Importing Documents...')
  })

  it('should show success message when complete with no errors', () => {
    const {container} = render(
      <ImportProgress
        {...defaultProps}
        isComplete
        processedRows={3}
        results={[
          {row: 0, success: true, documentId: 'doc-1'},
          {row: 1, success: true, documentId: 'doc-2'},
          {row: 2, success: true, documentId: 'doc-3'},
        ]}
      />,
    )
    expect(container.textContent).toContain('Import Completed Successfully')
  })

  it('should show error message when complete with errors', () => {
    const {container} = render(
      <ImportProgress
        {...defaultProps}
        isComplete
        processedRows={2}
        results={[
          {row: 0, success: true, documentId: 'doc-1'},
          {row: 1, success: false, error: 'Failed'},
        ]}
      />,
    )
    expect(container.textContent).toContain('Import Completed with Errors')
  })

  it('should display progress percentage', () => {
    const {container} = render(
      <ImportProgress {...defaultProps} totalRows={10} processedRows={5} />,
    )
    expect(container.textContent).toContain('50%')
  })

  it('should display document count progress', () => {
    const {container} = render(
      <ImportProgress {...defaultProps} totalRows={10} processedRows={3} />,
    )
    expect(container.textContent).toContain('3 of 10 documents')
  })

  describe('live row progress', () => {
    it('should show "Waiting for import to start" when no results', () => {
      const {container} = render(<ImportProgress {...defaultProps} results={[]} />)
      expect(container.textContent).toContain('Waiting for import to start')
    })

    it('should show Live badge when import is in progress', () => {
      const {container} = render(
        <ImportProgress
          {...defaultProps}
          results={[{row: 0, success: true, documentId: 'doc-1'}]}
        />,
      )
      expect(container.textContent).toContain('Live')
    })

    it('should show Complete badge when import is finished', () => {
      const {container} = render(
        <ImportProgress
          {...defaultProps}
          isComplete
          results={[{row: 0, success: true, documentId: 'doc-1'}]}
        />,
      )
      expect(container.textContent).toContain('Complete')
    })

    it('should display row numbers for each result', () => {
      const {container} = render(
        <ImportProgress
          {...defaultProps}
          results={[
            {row: 0, success: true, documentId: 'doc-1'},
            {row: 1, success: true, documentId: 'doc-2'},
            {row: 2, success: false, error: 'Error message'},
          ]}
        />,
      )
      expect(container.textContent).toContain('Row 1')
      expect(container.textContent).toContain('Row 2')
      expect(container.textContent).toContain('Row 3')
    })

    it('should display document title when available', () => {
      const {container} = render(
        <ImportProgress
          {...defaultProps}
          results={[{row: 0, success: true, documentId: 'doc-1', documentTitle: 'My Article'}]}
        />,
      )
      expect(container.textContent).toContain('My Article')
    })

    it('should display document ID when no title available', () => {
      const {container} = render(
        <ImportProgress
          {...defaultProps}
          results={[{row: 0, success: true, documentId: 'doc-123'}]}
        />,
      )
      expect(container.textContent).toContain('doc-123')
    })

    it('should display error message for failed rows', () => {
      const {container} = render(
        <ImportProgress
          {...defaultProps}
          results={[{row: 0, success: false, error: 'Validation failed'}]}
        />,
      )
      expect(container.textContent).toContain('Validation failed')
    })

    it('should show OK badge for successful rows', () => {
      const {container} = render(
        <ImportProgress
          {...defaultProps}
          results={[{row: 0, success: true, documentId: 'doc-1'}]}
        />,
      )
      expect(container.textContent).toContain('OK')
    })

    it('should show Error badge for failed rows', () => {
      const {container} = render(
        <ImportProgress {...defaultProps} results={[{row: 0, success: false, error: 'Failed'}]} />,
      )
      expect(container.textContent).toContain('Error')
    })

    it('should show processing indicator when not complete', () => {
      const {container} = render(
        <ImportProgress
          {...defaultProps}
          totalRows={5}
          processedRows={2}
          results={[
            {row: 0, success: true, documentId: 'doc-1'},
            {row: 1, success: true, documentId: 'doc-2'},
          ]}
        />,
      )
      expect(container.textContent).toContain('Processing row 3')
    })

    it('should not show processing indicator when complete', () => {
      const {container} = render(
        <ImportProgress
          {...defaultProps}
          totalRows={2}
          processedRows={2}
          isComplete
          results={[
            {row: 0, success: true, documentId: 'doc-1'},
            {row: 1, success: true, documentId: 'doc-2'},
          ]}
        />,
      )
      expect(container.textContent).not.toContain('Processing row')
    })
  })

  describe('success and error counts', () => {
    it('should display success count', () => {
      const {container} = render(
        <ImportProgress
          {...defaultProps}
          results={[
            {row: 0, success: true, documentId: 'doc-1'},
            {row: 1, success: true, documentId: 'doc-2'},
            {row: 2, success: false, error: 'Failed'},
          ]}
        />,
      )
      expect(container.textContent).toContain('2')
      expect(container.textContent).toContain('success')
    })

    it('should display error count when there are failures', () => {
      const {container} = render(
        <ImportProgress
          {...defaultProps}
          results={[
            {row: 0, success: true, documentId: 'doc-1'},
            {row: 1, success: false, error: 'Failed 1'},
            {row: 2, success: false, error: 'Failed 2'},
          ]}
        />,
      )
      expect(container.textContent).toContain('failed')
    })
  })

  describe('error details section', () => {
    it('should show detailed error section when complete with errors', () => {
      const {container} = render(
        <ImportProgress
          {...defaultProps}
          isComplete
          results={[{row: 0, success: false, error: 'Detailed error message'}]}
        />,
      )
      expect(container.textContent).toContain('Failed Imports')
      expect(container.textContent).toContain('Detailed error message')
    })

    it('should not show error details section when no errors', () => {
      const {container} = render(
        <ImportProgress
          {...defaultProps}
          isComplete
          results={[{row: 0, success: true, documentId: 'doc-1'}]}
        />,
      )
      expect(container.textContent).not.toContain('Failed Imports')
    })
  })

  describe('success summary', () => {
    it('should show success summary when complete with successes', () => {
      const {container} = render(
        <ImportProgress
          {...defaultProps}
          isComplete
          results={[
            {row: 0, success: true, documentId: 'doc-1'},
            {row: 1, success: true, documentId: 'doc-2'},
          ]}
        />,
      )
      expect(container.textContent).toContain('2 documents created successfully')
    })

    it('should use singular form for one document', () => {
      const {container} = render(
        <ImportProgress
          {...defaultProps}
          isComplete
          results={[{row: 0, success: true, documentId: 'doc-1'}]}
        />,
      )
      expect(container.textContent).toContain('1 document created successfully')
    })
  })
})
