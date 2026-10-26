import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from './Sidebar'

test('marks the current route link as active', () => {
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <Sidebar />
    </MemoryRouter>
  )
  expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'Memory' })).not.toHaveAttribute('aria-current', 'page')
})

test('each nav link renders an icon, and its label is hidden below the md breakpoint', () => {
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  )
  const settingsLink = screen.getByRole('link', { name: 'Settings' })
  expect(settingsLink.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
  expect(screen.getByText('Settings')).toHaveClass('hidden', 'md:inline')
})

test('mobile toggle opens a full-width sheet', () => {
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  )
  fireEvent.click(screen.getByLabelText('Toggle navigation'))
  expect(screen.getByRole('navigation')).toHaveClass('w-full')
})
