import { render, screen, fireEvent } from '@testing-library/react'
import Memory from './Memory'

test('only one trait row is expanded at a time, including re-clicking the open row to close it', () => {
  render(<Memory />)
  const pacing = screen.getByRole('button', { name: /Pacing/ })
  const music = screen.getByRole('button', { name: /Music/ })
  fireEvent.click(pacing)
  expect(pacing).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(music)
  expect(pacing).toHaveAttribute('aria-expanded', 'false')
  expect(music).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(music)
  expect(music).toHaveAttribute('aria-expanded', 'false')
})

test('renders the 4 stat chips and a threshold slider defaulting to 85', () => {
  render(<Memory />)
  expect(screen.getByText('247')).toBeInTheDocument()
  expect(screen.getByText('94%')).toBeInTheDocument() // Consistency Score
  expect(screen.getByText('87%')).toBeInTheDocument()
  expect(screen.getByText('6')).toBeInTheDocument()
  expect(screen.getByRole('slider')).toHaveValue('85')
})
