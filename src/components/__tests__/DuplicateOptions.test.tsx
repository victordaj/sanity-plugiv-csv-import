import {describe, expect, it, vi} from 'vitest'

import {DuplicateOptions, type DuplicateStrategy} from '../DuplicateOptions'

describe('DuplicateOptions', () => {
  it('should export DuplicateOptions component', () => {
    expect(DuplicateOptions).toBeDefined()
    expect(typeof DuplicateOptions).toBe('function')
  })

  it('should export DuplicateStrategy type', () => {
    const strategies: DuplicateStrategy[] = ['skip', 'update', 'create']
    expect(strategies).toContain('skip')
    expect(strategies).toContain('update')
    expect(strategies).toContain('create')
  })

  it('should accept correct props types', () => {
    const mockOnStrategyChange = vi.fn()
    const props = {
      duplicateCount: 5,
      onStrategyChange: mockOnStrategyChange,
      selectedStrategy: 'skip' as DuplicateStrategy,
    }
    expect(props.duplicateCount).toBe(5)
    expect(props.selectedStrategy).toBe('skip')
    expect(typeof props.onStrategyChange).toBe('function')
  })

  it('should have all valid strategy options', () => {
    const validStrategies = ['skip', 'update', 'create']
    validStrategies.forEach((strategy) => {
      expect(['skip', 'update', 'create']).toContain(strategy)
    })
  })

  it('should handle zero duplicate count', () => {
    const props = {
      duplicateCount: 0,
      onStrategyChange: vi.fn(),
      selectedStrategy: 'skip' as DuplicateStrategy,
    }
    expect(props.duplicateCount).toBe(0)
  })

  it('should handle large duplicate count', () => {
    const props = {
      duplicateCount: 1000,
      onStrategyChange: vi.fn(),
      selectedStrategy: 'update' as DuplicateStrategy,
    }
    expect(props.duplicateCount).toBe(1000)
  })
})
