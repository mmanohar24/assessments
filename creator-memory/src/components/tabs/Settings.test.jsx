import { render, screen, fireEvent } from '@testing-library/react'
import Settings from './Settings'

test('renders correct default toggle states and flips one on click', () => {
  render(<Settings />)
  expect(screen.getByRole('switch', { name: 'Auto-apply memories' })).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByRole('switch', { name: 'Notify when new pattern detected' })).toHaveAttribute('aria-checked', 'false')
  fireEvent.click(screen.getByRole('switch', { name: 'Notify when new pattern detected' }))
  expect(screen.getByRole('switch', { name: 'Notify when new pattern detected' })).toHaveAttribute('aria-checked', 'true')
})
