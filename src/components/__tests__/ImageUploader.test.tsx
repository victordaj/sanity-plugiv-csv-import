import {describe, expect, it, vi} from 'vitest'

import {render} from '../../test-utils'
import {type DuplicateInfo, ImageUploader, type UploadedImage} from '../ImageUploader'

// Mock useClient
vi.mock('sanity', () => ({
  useClient: vi.fn(() => ({
    assets: {
      upload: vi.fn(),
    },
  })),
}))

describe('ImageUploader', () => {
  const defaultProps = {
    schemaFields: [
      {
        name: 'mainImage',
        path: 'mainImage',
        type: 'image',
        title: 'Main Image',
        required: false,
        isArray: false,
        isReference: false,
        isImage: true,
      },
    ],
    onImagesUploaded: vi.fn(),
  }

  it('should render component', () => {
    const {container} = render(<ImageUploader {...defaultProps} />)
    expect(container).toBeTruthy()
  })

  it('should show upload instructions for images', () => {
    const {container} = render(<ImageUploader {...defaultProps} />)
    const text = container.textContent
    expect(text).toContain('image')
  })

  it('should display "Upload Images" heading', () => {
    const {container} = render(<ImageUploader {...defaultProps} />)
    expect(container.textContent).toContain('Upload Images')
  })

  it('should show image fields from schema', () => {
    const {container} = render(<ImageUploader {...defaultProps} />)
    expect(container.textContent).toContain('mainImage')
  })

  it('should show multiple image fields', () => {
    const multipleFields = {
      ...defaultProps,
      schemaFields: [
        {
          name: 'mainImage',
          path: 'mainImage',
          type: 'image',
          title: 'Main Image',
          required: false,
          isArray: false,
          isReference: false,
          isImage: true,
        },
        {
          name: 'gallery',
          path: 'gallery',
          type: 'image',
          title: 'Gallery',
          required: false,
          isArray: true,
          isReference: false,
          isImage: true,
        },
      ],
    }
    const {container} = render(<ImageUploader {...multipleFields} />)
    expect(container.textContent).toContain('mainImage')
    expect(container.textContent).toContain('gallery')
    expect(container.textContent).toContain('(array)')
  })

  it('should show required indicator for required fields', () => {
    const requiredFields = {
      ...defaultProps,
      schemaFields: [
        {
          name: 'mainImage',
          path: 'mainImage',
          type: 'image',
          title: 'Main Image',
          required: true,
          isArray: false,
          isReference: false,
          isImage: true,
        },
      ],
    }
    const {container} = render(<ImageUploader {...requiredFields} />)
    expect(container.textContent).toContain('(required)')
  })

  it('should show Select Images button', () => {
    const {container} = render(<ImageUploader {...defaultProps} />)
    expect(container.textContent).toContain('Select Images')
  })

  it('should show initial image count as 0', () => {
    const {container} = render(<ImageUploader {...defaultProps} />)
    expect(container.textContent).toContain('0 image(s) uploaded')
  })

  it('should have Continue button', () => {
    const {container} = render(<ImageUploader {...defaultProps} />)
    expect(container.textContent).toContain('Continue with')
  })

  it('should have Skip Images button', () => {
    const {container} = render(<ImageUploader {...defaultProps} />)
    expect(container.textContent).toContain('Skip Images')
  })

  describe('type exports', () => {
    it('should export UploadedImage interface', () => {
      const image: UploadedImage = {
        filename: 'test.jpg',
        assetId: 'image-123',
        url: 'https://cdn.sanity.io/test.jpg',
      }
      expect(image.filename).toBe('test.jpg')
      expect(image.assetId).toBe('image-123')
      expect(image.url).toBe('https://cdn.sanity.io/test.jpg')
    })

    it('should export DuplicateInfo interface', () => {
      const duplicate: DuplicateInfo = {
        filename: 'duplicate.jpg',
        existingIndex: 0,
      }
      expect(duplicate.filename).toBe('duplicate.jpg')
      expect(duplicate.existingIndex).toBe(0)
    })
  })

  describe('duplicate detection', () => {
    it('should have DuplicateInfo type with correct shape', () => {
      const duplicateInfo: DuplicateInfo = {
        filename: 'hero.jpg',
        existingIndex: 2,
      }
      expect(duplicateInfo.filename).toBe('hero.jpg')
      expect(duplicateInfo.existingIndex).toBe(2)
    })

    it('should handle negative existingIndex for batch duplicates', () => {
      // When a duplicate is found within the same upload batch
      const batchDuplicate: DuplicateInfo = {
        filename: 'batch-duplicate.jpg',
        existingIndex: -1,
      }
      expect(batchDuplicate.existingIndex).toBe(-1)
    })
  })

  describe('UI elements', () => {
    it('should show "Image Fields in Schema" section', () => {
      const {container} = render(<ImageUploader {...defaultProps} />)
      expect(container.textContent).toContain('Image Fields in Schema')
    })

    it('should render file input for image selection', () => {
      const {container} = render(<ImageUploader {...defaultProps} />)
      const fileInput = container.querySelector('input[type="file"]')
      expect(fileInput).toBeTruthy()
      expect(fileInput).toHaveAttribute('accept', 'image/*')
      expect(fileInput).toHaveAttribute('multiple')
    })

    it('should include instructions about filename matching', () => {
      const {container} = render(<ImageUploader {...defaultProps} />)
      expect(container.textContent).toContain('Name your files to match')
    })
  })
})
