import {fireEvent} from '@testing-library/react'
import {describe, expect, it} from 'vitest'

import {render} from '../../test-utils'
import {CsvPreview} from '../CsvPreview'

describe('CsvPreview', () => {
  const mockHeaders = ['title', 'author', 'category', 'published']
  const mockRows = [
    {title: 'Article 1', author: 'John Doe', category: 'Tech', published: 'true'},
    {title: 'Article 2', author: 'Jane Smith', category: 'Science', published: 'false'},
    {title: 'Article 3', author: 'Bob Wilson', category: 'Sports', published: 'true'},
  ]

  const defaultProps = {
    headers: mockHeaders,
    rows: mockRows,
  }

  it('should render the component', () => {
    const {container} = render(<CsvPreview {...defaultProps} />)
    expect(container).toBeTruthy()
  })

  it('should display "Data Preview" heading', () => {
    const {container} = render(<CsvPreview {...defaultProps} />)
    expect(container.textContent).toContain('Data Preview')
  })

  it('should show row count badge', () => {
    const {container} = render(<CsvPreview {...defaultProps} />)
    expect(container.textContent).toContain('3 rows')
  })

  it('should show column count badge', () => {
    const {container} = render(<CsvPreview {...defaultProps} />)
    expect(container.textContent).toContain('4 columns')
  })

  it('should render all headers', () => {
    const {container} = render(<CsvPreview {...defaultProps} />)
    mockHeaders.forEach((header) => {
      expect(container.textContent).toContain(header)
    })
  })

  it('should render row data', () => {
    const {container} = render(<CsvPreview {...defaultProps} />)
    expect(container.textContent).toContain('Article 1')
    expect(container.textContent).toContain('John Doe')
    expect(container.textContent).toContain('Tech')
  })

  it('should show row numbers starting from 1', () => {
    const {container} = render(<CsvPreview {...defaultProps} />)
    const cells = container.querySelectorAll('td')
    // First cell in first row should be "1"
    const firstRowNumber = cells[0]
    expect(firstRowNumber.textContent).toBe('1')
  })

  it('should truncate long values', () => {
    const longValueRows = [
      {
        title:
          'This is a very long title that should be truncated after forty characters for display',
        author: 'Author',
        category: 'Cat',
        published: 'true',
      },
    ]
    const {container} = render(<CsvPreview headers={mockHeaders} rows={longValueRows} />)
    expect(container.textContent).toContain('...')
  })

  it('should show dash for empty values', () => {
    const emptyValueRows = [{title: 'Article', author: '', category: 'Cat', published: 'true'}]
    const {container} = render(<CsvPreview headers={mockHeaders} rows={emptyValueRows} />)
    expect(container.textContent).toContain('—')
  })

  describe('pagination', () => {
    const manyRows = Array.from({length: 25}, (_, i) => ({
      title: `Article ${i + 1}`,
      author: `Author ${i + 1}`,
      category: 'Category',
      published: 'true',
    }))

    it('should show pagination when rows exceed page size', () => {
      const {container} = render(<CsvPreview headers={mockHeaders} rows={manyRows} />)
      expect(container.textContent).toContain('Page 1 of 3')
    })

    it('should show row range in pagination', () => {
      const {container} = render(<CsvPreview headers={mockHeaders} rows={manyRows} />)
      expect(container.textContent).toContain('Showing rows 1–10 of 25')
    })

    it('should navigate to next page', () => {
      const {container} = render(<CsvPreview headers={mockHeaders} rows={manyRows} />)

      const nextButton = container.querySelector('button[title="Next page"]')
      expect(nextButton).toBeTruthy()

      fireEvent.click(nextButton!)

      expect(container.textContent).toContain('Page 2 of 3')
      expect(container.textContent).toContain('Showing rows 11–20 of 25')
    })

    it('should navigate to previous page', () => {
      const {container} = render(<CsvPreview headers={mockHeaders} rows={manyRows} />)

      // Go to page 2 first
      const nextButton = container.querySelector('button[title="Next page"]')
      fireEvent.click(nextButton!)

      // Then go back
      const prevButton = container.querySelector('button[title="Previous page"]')
      fireEvent.click(prevButton!)

      expect(container.textContent).toContain('Page 1 of 3')
    })

    it('should disable previous button on first page', () => {
      const {container} = render(<CsvPreview headers={mockHeaders} rows={manyRows} />)

      const prevButton = container.querySelector('button[title="Previous page"]')
      expect(prevButton).toHaveAttribute('data-disabled', 'true')
    })

    it('should disable next button on last page', () => {
      const {container} = render(<CsvPreview headers={mockHeaders} rows={manyRows} />)

      // Navigate to last page
      const nextButton = container.querySelector('button[title="Next page"]')
      fireEvent.click(nextButton!) // Page 2
      fireEvent.click(nextButton!) // Page 3 (last)

      expect(nextButton).toHaveAttribute('data-disabled', 'true')
    })
  })

  describe('preview limit', () => {
    const manyRowsForLimit = Array.from({length: 100}, (_, i) => ({
      title: `Article ${i + 1}`,
      author: `Author ${i + 1}`,
      category: 'Category',
      published: 'true',
    }))

    it('should respect maxPreviewRows prop', () => {
      const {container} = render(
        <CsvPreview headers={mockHeaders} rows={manyRowsForLimit} maxPreviewRows={20} />,
      )

      // Should show 20 in pagination, not 100
      expect(container.textContent).toContain('of 20')
    })

    it('should show warning when rows exceed preview limit', () => {
      const {container} = render(
        <CsvPreview headers={mockHeaders} rows={manyRowsForLimit} maxPreviewRows={50} />,
      )

      expect(container.textContent).toContain('All 100 rows will be validated and imported')
    })
  })

  it('should not show pagination for small datasets', () => {
    const {container} = render(<CsvPreview {...defaultProps} />)
    expect(container.textContent).not.toContain('Page')
  })
})
