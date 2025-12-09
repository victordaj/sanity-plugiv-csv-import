import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {render, screen} from '../../test-utils'
import {DuplicateOptions, type DuplicateStrategy} from '../DuplicateOptions'

describe('DuplicateOptions', () => {
  const mockOnStrategyChange = vi.fn()

  const defaultProps = {
    duplicateCount: 0,
    onStrategyChange: mockOnStrategyChange,
    selectedStrategy: 'skip' as DuplicateStrategy,
  }

  beforeEach(() => {
    mockOnStrategyChange.mockClear()
  })

  describe('rendering', () => {
    it('should render all strategy options', () => {
      render(<DuplicateOptions {...defaultProps} />)

      expect(screen.getByText('Skip duplicates')).toBeInTheDocument()
      expect(screen.getByText('Update existing')).toBeInTheDocument()
      expect(screen.getByText('Create all as new')).toBeInTheDocument()
    })

    it('should render strategy descriptions', () => {
      render(<DuplicateOptions {...defaultProps} />)

      expect(
        screen.getByText(/Do not import rows that match existing documents/),
      ).toBeInTheDocument()
      expect(screen.getByText(/Update existing documents with new data/)).toBeInTheDocument()
      expect(screen.getByText(/Create all rows as new documents/)).toBeInTheDocument()
    })

    it('should render title', () => {
      render(<DuplicateOptions {...defaultProps} />)

      expect(screen.getByText('Duplicate Handling Strategy')).toBeInTheDocument()
    })
  })

  describe('duplicate count warning', () => {
    it('should show warning when duplicates are found', () => {
      render(<DuplicateOptions {...defaultProps} duplicateCount={5} />)

      expect(screen.getByText('5 potential duplicates found')).toBeInTheDocument()
    })

    it('should use singular form for one duplicate', () => {
      render(<DuplicateOptions {...defaultProps} duplicateCount={1} />)

      expect(screen.getByText('1 potential duplicate found')).toBeInTheDocument()
    })

    it('should not show warning when no duplicates', () => {
      render(<DuplicateOptions {...defaultProps} duplicateCount={0} />)

      expect(screen.queryByText(/potential duplicate/)).not.toBeInTheDocument()
    })

    it('should show contextual message about duplicates', () => {
      render(<DuplicateOptions {...defaultProps} duplicateCount={3} />)

      expect(
        screen.getByText(/Some rows in your CSV may match existing documents/),
      ).toBeInTheDocument()
    })
  })

  describe('strategy selection', () => {
    it('should show selected strategy as checked', () => {
      render(<DuplicateOptions {...defaultProps} selectedStrategy="update" />)

      const radios = screen.getAllByRole('radio')
      const updateRadio = radios[1]

      expect(updateRadio).toBeChecked()
    })

    it('should show skip as selected by default', () => {
      render(<DuplicateOptions {...defaultProps} selectedStrategy="skip" />)

      const radios = screen.getAllByRole('radio')
      const skipRadio = radios[0]

      expect(skipRadio).toBeChecked()
    })

    it('should call onStrategyChange when clicking a strategy card', async () => {
      const user = userEvent.setup()
      render(<DuplicateOptions {...defaultProps} selectedStrategy="skip" />)

      const updateOption = screen.getByText('Update existing')
      await user.click(updateOption)

      expect(mockOnStrategyChange).toHaveBeenCalledWith('update')
    })

    it('should call onStrategyChange when clicking radio button', async () => {
      const user = userEvent.setup()
      render(<DuplicateOptions {...defaultProps} selectedStrategy="skip" />)

      const radios = screen.getAllByRole('radio')
      const createRadio = radios[2]

      await user.click(createRadio)

      expect(mockOnStrategyChange).toHaveBeenCalledWith('create')
    })
  })

  describe('update strategy note', () => {
    it('should show note when update strategy is selected', () => {
      render(<DuplicateOptions {...defaultProps} selectedStrategy="update" />)

      expect(screen.getByText(/requires an/)).toBeInTheDocument()
      expect(screen.getByText('_id')).toBeInTheDocument()
    })

    it('should not show note when skip strategy is selected', () => {
      render(<DuplicateOptions {...defaultProps} selectedStrategy="skip" />)

      expect(screen.queryByText(/requires an/)).not.toBeInTheDocument()
    })

    it('should not show note when create strategy is selected', () => {
      render(<DuplicateOptions {...defaultProps} selectedStrategy="create" />)

      expect(screen.queryByText(/requires an/)).not.toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('should handle multiple strategy changes', async () => {
      const user = userEvent.setup()
      render(<DuplicateOptions {...defaultProps} selectedStrategy="skip" />)

      const updateOption = screen.getByText('Update existing')
      await user.click(updateOption)

      const createOption = screen.getByText('Create all as new')
      await user.click(createOption)

      expect(mockOnStrategyChange).toHaveBeenCalledTimes(2)
      expect(mockOnStrategyChange).toHaveBeenNthCalledWith(1, 'update')
      expect(mockOnStrategyChange).toHaveBeenNthCalledWith(2, 'create')
    })

    it('should allow clicking the same strategy multiple times', async () => {
      const user = userEvent.setup()
      render(<DuplicateOptions {...defaultProps} selectedStrategy="skip" />)

      const skipOption = screen.getByText('Skip duplicates')
      await user.click(skipOption)
      await user.click(skipOption)

      expect(mockOnStrategyChange).toHaveBeenCalledTimes(2)
      expect(mockOnStrategyChange).toHaveBeenCalledWith('skip')
    })
  })
})
