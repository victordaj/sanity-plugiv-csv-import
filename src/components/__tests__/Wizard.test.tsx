import {type Schema} from 'sanity'
import {describe, expect, it, vi} from 'vitest'

import {render} from '../../test-utils'
import {Wizard} from '../Wizard'

// Mock Sanity hooks
vi.mock('sanity', () => ({
  useSchema: vi.fn(() => ({
    getTypeNames: () => [],
    get: () => ({name: 'test', title: 'Test', type: 'document'}),
  })),
  useClient: vi.fn(() => ({
    fetch: vi.fn(),
    create: vi.fn(),
    assets: {upload: vi.fn()},
  })),
}))

describe('Wizard', () => {
  const mockSchema = {
    get: vi.fn(() => ({
      name: 'post',
      title: 'Post',
      type: 'document',
      fields: [],
    })),
  }

  const defaultProps = {
    documentTypes: [{name: 'post', title: 'Post'}],
    schema: mockSchema as unknown as Schema,
  }

  it('should render component', () => {
    const {container} = render(<Wizard {...defaultProps} />)
    expect(container).toBeTruthy()
  })

  it('should show type selection initially', () => {
    const {container} = render(<Wizard {...defaultProps} />)
    const text = container.textContent
    expect(text).toContain('Post')
  })
})
