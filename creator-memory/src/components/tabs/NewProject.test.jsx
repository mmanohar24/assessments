import { render, screen, fireEvent } from '@testing-library/react'
import NewProject from './NewProject'

test('pill reads "5 of 5 applied" by default, and "0 of 5 applied" once all toggles are off', () => {
  render(<NewProject />)
  expect(screen.getByText('5 of 5 applied')).toBeInTheDocument()
  screen.getAllByRole('switch').forEach((sw) => fireEvent.click(sw))
  expect(screen.getByText('0 of 5 applied')).toBeInTheDocument()
})

test('toggling one card off updates the pill to 4 of 5', () => {
  render(<NewProject />)
  fireEvent.click(screen.getAllByRole('switch')[0])
  expect(screen.getByText('4 of 5 applied')).toBeInTheDocument()
})
