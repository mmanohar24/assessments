import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

test('rendering App with initial route /settings shows the Settings tab heading, not Memory', () => {
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <App />
    </MemoryRouter>
  )
  expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: /learned traits/i })).not.toBeInTheDocument()
})

test('rendering App at / redirects to /memory', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>
  )
  expect(screen.queryByRole('heading', { name: /settings/i })).not.toBeInTheDocument()
})
