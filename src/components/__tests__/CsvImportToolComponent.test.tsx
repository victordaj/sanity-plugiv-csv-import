import {describe, expect, it, vi} from 'vitest'

import {render} from '../../test-utils'
import {CsvImportToolComponent} from '../CsvImportToolComponent'

// Mock useSchema and useClient
vi.mock('sanity', () => ({
  useSchema: vi.fn(() => ({
    getTypeNames: () => [],
    get: () => ({name: 'test', title: 'Test', type: 'document'}),
  })),
  useClient: vi.fn(() => ({
    fetch: vi.fn(),
    create: vi.fn(),
  })),
}))

describe('CsvImportToolComponent', () => {
  it('should render component', () => {
    const {container} = render(<CsvImportToolComponent />)
    expect(container).toBeTruthy()
  })

  it('should show welcome or import screen', () => {
    const {container} = render(<CsvImportToolComponent />)
    const text = container.textContent
    expect(text).toContain('CSV Import')
  })
})
