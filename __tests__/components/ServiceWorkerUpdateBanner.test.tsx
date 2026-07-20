import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/hooks/useServiceWorkerUpdate', () => ({
  useServiceWorkerUpdate: jest.fn(),
}));

import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';
import ServiceWorkerUpdateBanner from '@/components/ServiceWorkerUpdateBanner';

const mockUseServiceWorkerUpdate = useServiceWorkerUpdate as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ServiceWorkerUpdateBanner', () => {
  it('renders nothing when no update is available', () => {
    mockUseServiceWorkerUpdate.mockReturnValue({
      updateAvailable: false,
      reload: jest.fn(),
      dismiss: jest.fn(),
    });
    const { container } = render(<ServiceWorkerUpdateBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the prompt and wires the Reload button', () => {
    const reload = jest.fn();
    mockUseServiceWorkerUpdate.mockReturnValue({
      updateAvailable: true,
      reload,
      dismiss: jest.fn(),
    });
    render(<ServiceWorkerUpdateBanner />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('New version available.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('wires the Dismiss button', () => {
    const dismiss = jest.fn();
    mockUseServiceWorkerUpdate.mockReturnValue({
      updateAvailable: true,
      reload: jest.fn(),
      dismiss,
    });
    render(<ServiceWorkerUpdateBanner />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss update notification' }),
    );
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
