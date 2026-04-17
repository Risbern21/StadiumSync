import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AttendeeGate from './AttendeeGate';

// Intercept Firebase calls before React renders
vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn(),
    onSnapshot: vi.fn((docRef, callback) => {
      // Setup a fake active event inside the callback
      callback({
        exists: () => true,
        data: () => ({ code: 'WINNER', eventName: 'Championship', active: true })
      });
      return vi.fn(); // Mock unsubscribe function
    }),
  };
});

// Mock the local firebase configuration exports
vi.mock('../firebase', () => ({
  db: {},
}));

describe('AttendeeGate Component', () => {
  // Clear persistent state between tests
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('renders the form correctly', () => {
    render(
      <MemoryRouter>
        <AttendeeGate />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Enter Event Code/i);
    expect(screen.getByPlaceholderText('e.g. ABC123')).toBeInTheDocument();
  });

  it('prevents submission when input is less than 4 characters', () => {
    render(
      <MemoryRouter>
        <AttendeeGate />
      </MemoryRouter>
    );
    
    const input = screen.getByPlaceholderText('e.g. ABC123');
    const button = screen.getByRole('button', { name: /Join Event/i });

    expect(button).toBeDisabled();
    fireEvent.change(input, { target: { value: 'XYZ' } });
    expect(button).toBeDisabled();
  });

  it('displays an error for an invalid event code', () => {
    render(
      <MemoryRouter>
        <AttendeeGate />
      </MemoryRouter>
    );
    const input = screen.getByPlaceholderText('e.g. ABC123');
    const button = screen.getByRole('button', { name: /Join Event/i });

    fireEvent.change(input, { target: { value: 'LOSER12' } });
    fireEvent.click(button);

    expect(screen.getByText(/Invalid event code/i)).toBeInTheDocument();
  });

  it('successfully logs the attendee in and navigates when correct code is submitted', () => {
    render(
      <MemoryRouter initialEntries={['/attendee']}>
        <Routes>
          <Route path="/attendee" element={<AttendeeGate />} />
          <Route path="/attendee/view" element={<div data-testid="attendee-dashboard">Mock Dashboard View</div>} />
        </Routes>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('e.g. ABC123');
    const button = screen.getByRole('button', { name: /Join Event/i });

    fireEvent.change(input, { target: { value: 'WINNER' } });
    fireEvent.click(button);

    // Verify it navigated properly
    expect(screen.getByTestId('attendee-dashboard')).toBeInTheDocument();
    
    // Verify standard persistence acts correctly 
    expect(sessionStorage.getItem('ss_event_code')).toBe('WINNER');
  });
});
