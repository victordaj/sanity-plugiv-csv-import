import {describe, expect, it, vi} from 'vitest'

import {render} from '../../test-utils'
import {ImageUploader} from '../ImageUploader'

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
})
