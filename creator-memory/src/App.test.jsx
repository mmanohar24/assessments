import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

test('rendering App with initial route /memory shows "Learned Traits", not Settings', () => {
  render(
    <MemoryRouter initialEntries={['/memory']}>
      <App />
    </MemoryRouter>
  )
  expect(screen.getByRole('heading', { name: 'Learned Traits' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Settings' })).not.toBeInTheDocument()
})

test('rendering App with initial route /settings shows the Settings tab heading, not Learned Traits', () => {
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <App />
    </MemoryRouter>
  )
  expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Learned Traits' })).not.toBeInTheDocument()
})

test('rendering App at / redirects to /memory', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>
  )
  expect(screen.getByRole('heading', { name: 'Learned Traits' })).toBeInTheDocument()
})

test('rendering App at an unknown route redirects to /memory instead of rendering blank', () => {
  render(
    <MemoryRouter initialEntries={['/nope']}>
      <App />
    </MemoryRouter>
  )
  expect(screen.getByRole('heading', { name: 'Learned Traits' })).toBeInTheDocument()
})

test('route transitions stack in the same grid cell instead of adding layout height', () => {
  render(
    <MemoryRouter initialEntries={['/memory']}>
      <App />
    </MemoryRouter>
  )
  const heading = screen.getByRole('heading', { name: 'Learned Traits' })
  const animatedLayer = heading.closest('.col-start-1')
  expect(animatedLayer).toHaveClass('row-start-1')
  expect(animatedLayer.parentElement).toHaveClass('grid')
})

test('clicking the header Help button opens the HelpDrawer', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  )
  fireEvent.click(screen.getByLabelText('Help'))
  expect(screen.getByRole('heading', { name: 'Confidence Threshold' })).toBeInTheDocument()
})
