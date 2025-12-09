import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'

import {type SchemaField} from '../../lib/schemaUtils'
import {render, screen} from '../../test-utils'
import {type ReferenceMatchConfig} from '../ReferenceConfig'
import {TemplateBar} from '../TemplateBar'

// Mock the templateGenerator module
vi.mock('../../lib/templateGenerator', () => ({
  downloadTemplate: vi.fn(),
}))

describe('TemplateBar', () => {
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
    },
  ]

  const mockReferenceConfig: ReferenceMatchConfig[] = []

  const defaultProps = {
    documentType: 'post',
    documentTypeTitle: 'Post',
    schemaFields: mockSchemaFields,
    referenceConfig: mockReferenceConfig,
    visible: true,
  }

  describe('visibility', () => {
    it('should render when visible is true and has schema fields', () => {
      render(<TemplateBar {...defaultProps} />)
      expect(screen.getByText(/Download template for/)).toBeInTheDocument()
    })

    it('should not render when visible is false', () => {
      render(<TemplateBar {...defaultProps} visible={false} />)
      expect(screen.queryByText(/Download template for/)).not.toBeInTheDocument()
    })

    it('should not render when documentType is empty', () => {
      render(<TemplateBar {...defaultProps} documentType="" />)
      expect(screen.queryByText(/Download template for/)).not.toBeInTheDocument()
    })

    it('should not render when schemaFields is empty', () => {
      render(<TemplateBar {...defaultProps} schemaFields={[]} />)
      expect(screen.queryByText(/Download template for/)).not.toBeInTheDocument()
    })
  })

  describe('rendering', () => {
    it('should display document type title', () => {
      render(<TemplateBar {...defaultProps} />)
      expect(screen.getByText('Post')).toBeInTheDocument()
    })

    it('should render Excel download button', () => {
      render(<TemplateBar {...defaultProps} />)
      expect(screen.getByText('Excel (.xlsx)')).toBeInTheDocument()
    })

    it('should render CSV download button', () => {
      render(<TemplateBar {...defaultProps} />)
      expect(screen.getByText('CSV')).toBeInTheDocument()
    })

    it('should show download icon', () => {
      const {container} = render(<TemplateBar {...defaultProps} />)
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('download functionality', () => {
    it('should call downloadTemplate with xlsx format when Excel button clicked', async () => {
      const {downloadTemplate} = await import('../../lib/templateGenerator')
      const user = userEvent.setup()

      render(<TemplateBar {...defaultProps} />)
      const excelButton = screen.getByText('Excel (.xlsx)')
      await user.click(excelButton)

      expect(downloadTemplate).toHaveBeenCalledWith(
        mockSchemaFields,
        mockReferenceConfig,
        'post',
        'xlsx',
      )
    })

    it('should call downloadTemplate with csv format when CSV button clicked', async () => {
      const {downloadTemplate} = await import('../../lib/templateGenerator')
      const user = userEvent.setup()

      render(<TemplateBar {...defaultProps} />)
      const csvButton = screen.getByText('CSV')
      await user.click(csvButton)

      expect(downloadTemplate).toHaveBeenCalledWith(
        mockSchemaFields,
        mockReferenceConfig,
        'post',
        'csv',
      )
    })
  })

  describe('edge cases', () => {
    it('should handle complex schema fields', () => {
      const complexFields: SchemaField[] = [
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

      render(<TemplateBar {...defaultProps} schemaFields={complexFields} />)
      expect(screen.getByText(/Download template for/)).toBeInTheDocument()
    })

    it('should handle reference configurations', () => {
      const refConfig: ReferenceMatchConfig[] = [
        {fieldPath: 'author', targetType: 'person', matchField: 'email'},
      ]

      render(<TemplateBar {...defaultProps} referenceConfig={refConfig} />)
      expect(screen.getByText(/Download template for/)).toBeInTheDocument()
    })
  })
})
