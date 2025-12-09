import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'

import {render, screen} from '../../test-utils'
import {WelcomeScreen} from '../WelcomeScreen'

describe('WelcomeScreen', () => {
  describe('rendering', () => {
    it('should render title', () => {
      const onGetStarted = vi.fn()
      render(<WelcomeScreen onGetStarted={onGetStarted} />)
      expect(screen.getByText('CSV Import')).toBeInTheDocument()
    })

    it('should render description', () => {
      const onGetStarted = vi.fn()
      render(<WelcomeScreen onGetStarted={onGetStarted} />)
      expect(screen.getByText(/Bulk import data from CSV or Excel files/)).toBeInTheDocument()
    })

    it('should render Get Started button', () => {
      const onGetStarted = vi.fn()
      render(<WelcomeScreen onGetStarted={onGetStarted} />)
      expect(screen.getByText('Get Started')).toBeInTheDocument()
    })
  })

  describe('steps', () => {
    it('should render step 1', () => {
      const onGetStarted = vi.fn()
      render(<WelcomeScreen onGetStarted={onGetStarted} />)
      expect(screen.getByText('1. Select & Download')).toBeInTheDocument()
      expect(screen.getByText(/Choose a document type/)).toBeInTheDocument()
    })

    it('should render step 2', () => {
      const onGetStarted = vi.fn()
      render(<WelcomeScreen onGetStarted={onGetStarted} />)
      expect(screen.getByText('2. Fill Your Data')).toBeInTheDocument()
      expect(screen.getByText(/Add your data to the template/)).toBeInTheDocument()
    })

    it('should render step 3', () => {
      const onGetStarted = vi.fn()
      render(<WelcomeScreen onGetStarted={onGetStarted} />)
      expect(screen.getByText('3. Upload & Import')).toBeInTheDocument()
      expect(screen.getByText(/Upload your CSV and import/)).toBeInTheDocument()
    })

    it('should show all step icons', () => {
      const onGetStarted = vi.fn()
      const {container} = render(<WelcomeScreen onGetStarted={onGetStarted} />)
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('features', () => {
    it('should list row limit feature', () => {
      const onGetStarted = vi.fn()
      render(<WelcomeScreen onGetStarted={onGetStarted} />)
      expect(screen.getByText(/Up to 500 rows/)).toBeInTheDocument()
    })

    it('should list references and images feature', () => {
      const onGetStarted = vi.fn()
      render(<WelcomeScreen onGetStarted={onGetStarted} />)
      expect(screen.getByText(/References & Images/)).toBeInTheDocument()
    })

    it('should list validation preview feature', () => {
      const onGetStarted = vi.fn()
      render(<WelcomeScreen onGetStarted={onGetStarted} />)
      expect(screen.getByText(/Validation preview/)).toBeInTheDocument()
    })

    it('should list duplicate handling feature', () => {
      const onGetStarted = vi.fn()
      render(<WelcomeScreen onGetStarted={onGetStarted} />)
      expect(screen.getByText(/Duplicate handling/)).toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('should call onGetStarted when button is clicked', async () => {
      const onGetStarted = vi.fn()
      const user = userEvent.setup()

      render(<WelcomeScreen onGetStarted={onGetStarted} />)
      const button = screen.getByText('Get Started')
      await user.click(button)

      expect(onGetStarted).toHaveBeenCalledTimes(1)
    })

    it('should call onGetStarted multiple times if clicked multiple times', async () => {
      const onGetStarted = vi.fn()
      const user = userEvent.setup()

      render(<WelcomeScreen onGetStarted={onGetStarted} />)
      const button = screen.getByText('Get Started')
      await user.click(button)
      await user.click(button)

      expect(onGetStarted).toHaveBeenCalledTimes(2)
    })
  })
})
