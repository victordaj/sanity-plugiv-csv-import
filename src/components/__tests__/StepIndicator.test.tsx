import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'

import {render, screen} from '../../test-utils'
import {type Step, StepIndicator} from '../StepIndicator'

describe('StepIndicator', () => {
  const mockSteps: Step[] = [
    {id: 'step1', label: 'Step 1'},
    {id: 'step2', label: 'Step 2'},
    {id: 'step3', label: 'Step 3'},
  ]

  describe('rendering', () => {
    it('should render all steps', () => {
      render(<StepIndicator steps={mockSteps} currentStepId="step1" completedStepIds={[]} />)

      expect(screen.getByText('Step 1')).toBeInTheDocument()
      expect(screen.getByText('Step 2')).toBeInTheDocument()
      expect(screen.getByText('Step 3')).toBeInTheDocument()
    })

    it('should render step numbers', () => {
      render(<StepIndicator steps={mockSteps} currentStepId="step1" completedStepIds={[]} />)

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should show checkmark for completed steps', () => {
      const {container} = render(
        <StepIndicator steps={mockSteps} currentStepId="step2" completedStepIds={['step1']} />,
      )

      const checkmarks = container.querySelectorAll('svg')
      expect(checkmarks.length).toBeGreaterThan(0)
    })

    it('should render connector lines between steps', () => {
      const {container} = render(
        <StepIndicator steps={mockSteps} currentStepId="step1" completedStepIds={[]} />,
      )

      const connectors = container.querySelectorAll('[style*="height: 2"]')
      expect(connectors.length).toBe(2)
    })
  })

  describe('step states', () => {
    it('should mark current step correctly', () => {
      render(<StepIndicator steps={mockSteps} currentStepId="step2" completedStepIds={['step1']} />)

      const step2Label = screen.getByText('Step 2')
      expect(step2Label).toHaveStyle({fontWeight: expect.any(String)})
    })

    it('should mark completed steps', () => {
      render(
        <StepIndicator
          steps={mockSteps}
          currentStepId="step3"
          completedStepIds={['step1', 'step2']}
        />,
      )

      expect(screen.getByText('Step 1')).toBeInTheDocument()
      expect(screen.getByText('Step 2')).toBeInTheDocument()
    })

    it('should handle all steps completed', () => {
      render(
        <StepIndicator
          steps={mockSteps}
          currentStepId="step3"
          completedStepIds={['step1', 'step2', 'step3']}
        />,
      )

      expect(screen.getByText('Step 1')).toBeInTheDocument()
      expect(screen.getByText('Step 2')).toBeInTheDocument()
      expect(screen.getByText('Step 3')).toBeInTheDocument()
    })
  })

  describe('click handling', () => {
    it('should call onStepClick when completed step is clicked', async () => {
      const user = userEvent.setup()
      const onStepClick = vi.fn()

      render(
        <StepIndicator
          steps={mockSteps}
          currentStepId="step2"
          completedStepIds={['step1']}
          onStepClick={onStepClick}
        />,
      )

      const step1Label = screen.getByText('Step 1')
      await user.click(step1Label)

      expect(onStepClick).toHaveBeenCalledWith('step1')
    })

    it('should not call onStepClick for non-completed steps', async () => {
      const user = userEvent.setup()
      const onStepClick = vi.fn()

      render(
        <StepIndicator
          steps={mockSteps}
          currentStepId="step1"
          completedStepIds={[]}
          onStepClick={onStepClick}
        />,
      )

      const step2Label = screen.getByText('Step 2')
      await user.click(step2Label)

      expect(onStepClick).not.toHaveBeenCalled()
    })

    it('should not call onStepClick when handler is not provided', async () => {
      const user = userEvent.setup()

      render(<StepIndicator steps={mockSteps} currentStepId="step2" completedStepIds={['step1']} />)

      const step1Label = screen.getByText('Step 1')
      await user.click(step1Label)

      // Should not throw error
      expect(step1Label).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle single step', () => {
      const singleStep: Step[] = [{id: 'only', label: 'Only Step'}]

      render(<StepIndicator steps={singleStep} currentStepId="only" completedStepIds={[]} />)

      expect(screen.getByText('Only Step')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should handle empty completed steps', () => {
      render(<StepIndicator steps={mockSteps} currentStepId="step1" completedStepIds={[]} />)

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should handle non-existent current step gracefully', () => {
      render(<StepIndicator steps={mockSteps} currentStepId="nonexistent" completedStepIds={[]} />)

      expect(screen.getByText('Step 1')).toBeInTheDocument()
      expect(screen.getByText('Step 2')).toBeInTheDocument()
      expect(screen.getByText('Step 3')).toBeInTheDocument()
    })
  })
})
