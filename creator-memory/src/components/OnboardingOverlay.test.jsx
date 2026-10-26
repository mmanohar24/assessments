import { render, screen, fireEvent } from '@testing-library/react'
import OnboardingOverlay from './OnboardingOverlay'

test('shows step 1 on first visit, advances through steps, and Get started persists the flag', () => {
  localStorage.clear()
  render(<OnboardingOverlay />)
  expect(screen.getByText('Your editing style, remembered.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByText('Four views, one workflow.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByText('Memory markers guide your edits.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
  expect(localStorage.getItem('cm_onboarded')).toBe('true')
  expect(screen.queryByText('Memory markers guide your edits.')).not.toBeInTheDocument()
})

test('does not show the overlay when cm_onboarded is already set', () => {
  localStorage.setItem('cm_onboarded', 'true')
  render(<OnboardingOverlay />)
  expect(screen.queryByText('Your editing style, remembered.')).not.toBeInTheDocument()
})

test('Skip persists the flag and closes immediately from step 1', () => {
  localStorage.clear()
  render(<OnboardingOverlay />)
  fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
  expect(localStorage.getItem('cm_onboarded')).toBe('true')
  expect(screen.queryByText('Your editing style, remembered.')).not.toBeInTheDocument()
})
