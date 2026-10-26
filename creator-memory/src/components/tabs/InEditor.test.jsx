import { render, screen, fireEvent } from '@testing-library/react'
import InEditor from './InEditor'

test('clicking Apply or Dismiss hides the annotation card', () => {
  render(<InEditor />)
  expect(screen.getByText(/confidence/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
  expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument()
})

test('clicking a [mem: Pacing] chip opens its tooltip, clicking again closes it', () => {
  render(<InEditor />)
  const chip = screen.getAllByRole('button', { name: '[mem: Pacing]' })[0]
  fireEvent.click(chip)
  expect(screen.getByRole('tooltip')).toBeInTheDocument()
  fireEvent.click(chip)
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
})
