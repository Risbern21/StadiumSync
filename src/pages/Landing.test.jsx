import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Landing from './Landing';

describe('Landing Component', () => {
  it('renders the branding and text correctly', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    expect(screen.getByText('Stadium')).toBeInTheDocument();
    expect(screen.getByText('Sync')).toBeInTheDocument();
    expect(screen.getByText(/Real-time event coordination/i)).toBeInTheDocument();
  });

  it('contains correctly mapped links to coordinator and attendee paths', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /Coordinator/i })).toHaveAttribute('href', '/coordinator/login');
    expect(screen.getByRole('link', { name: /Attendee/i })).toHaveAttribute('href', '/attendee');
  });
});
