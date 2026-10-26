import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import HelpDrawer from './HelpDrawer'

test('renders nothing when closed, and calls onClose on close-button and backdrop clicks', () => {
  const onClose = vi.fn()
  const { rerender } = render(<HelpDrawer isOpen={false} onClose={onClose} />)
  expect(screen.queryByLabelText('Close help')).not.toBeInTheDocument()
  rerender(<HelpDrawer isOpen={true} onClose={onClose} />)
  expect(screen.getByRole('heading', { name: 'Confidence Threshold' })).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Close help'))
  expect(onClose).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByTestId('help-drawer-backdrop'))
  expect(onClose).toHaveBeenCalledTimes(2)
})
