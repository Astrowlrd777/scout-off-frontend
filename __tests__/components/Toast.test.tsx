import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { useEffect } from 'react';
import { ToastProvider, useToast } from '@/components/ui/Toast';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

function ToastTestApp() {
  const toast = useToast();

  useEffect(() => {
    toast.show({ message: 'Initial toast', variant: 'info' });
  }, [toast]);

  return (
    <div>
      <button
        onClick={() =>
          toast.show({ message: 'Success message', variant: 'success' })
        }
      >
        Show Success
      </button>
      <button
        onClick={() =>
          toast.show({ message: 'Error message', variant: 'error' })
        }
      >
        Show Error
      </button>
      <button
        onClick={() => toast.show({ message: 'Info message', variant: 'info' })}
      >
        Show Info
      </button>
      <button
        onClick={() =>
          toast.show({ message: 'Warning message', variant: 'warning' })
        }
      >
        Show Warning
      </button>
    </div>
  );
}

describe('Toast notifications', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders a toast when show is called', () => {
    render(
      <ToastProvider>
        <ToastTestApp />
      </ToastProvider>,
    );

    expect(screen.getByRole('alert').textContent).toContain('Initial toast');
  });

  it('renders variant-specific icon and border for success', () => {
    render(
      <ToastProvider>
        <ToastTestApp />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText(/show success/i));

    const successMessage = screen.getByText('Success message');
    expect(successMessage).toBeTruthy();
    const toast = screen
      .getAllByRole('alert')
      .find((node) => node.textContent?.includes('Success message'));
    expect(toast).toBeDefined();
    expect(toast?.className).toContain('border-brand-green');
    expect(toast?.textContent).toContain('✓');
  });

  it('automatically dismisses a toast after 4 seconds', () => {
    render(
      <ToastProvider>
        <ToastTestApp />
      </ToastProvider>,
    );

    expect(screen.getByText('Initial toast')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(screen.queryByText('Initial toast')).toBeNull();
  });

  it('removes a toast immediately when the close button is clicked', () => {
    render(
      <ToastProvider>
        <ToastTestApp />
      </ToastProvider>,
    );

    const closeButton = screen.getByRole('button', {
      name: /dismiss notification/i,
    });
    fireEvent.click(closeButton);

    expect(screen.queryByText('Initial toast')).toBeNull();
  });

  it('limits visible toasts to a maximum of 3 items', () => {
    render(
      <ToastProvider>
        <ToastTestApp />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText(/show success/i));
    fireEvent.click(screen.getByText(/show error/i));
    fireEvent.click(screen.getByText(/show info/i));
    fireEvent.click(screen.getByText(/show warning/i));

    const toastMessages = screen
      .queryAllByRole('alert')
      .map((element) => element.textContent ?? '');

    expect(toastMessages).toHaveLength(3);
    expect(toastMessages.some((text) => text.includes('Initial toast'))).toBe(
      false,
    );
    expect(toastMessages.some((text) => text.includes('Success message'))).toBe(
      false,
    );
    expect(toastMessages.some((text) => text.includes('Warning message'))).toBe(
      true,
    );
    expect(toastMessages.some((text) => text.includes('Error message'))).toBe(
      true,
    );
    expect(toastMessages.some((text) => text.includes('Info message'))).toBe(
      true,
    );
  });

  it('stacks multiple toasts fired in quick succession and dismisses each independently', () => {
    render(
      <ToastProvider>
        <ToastTestApp />
      </ToastProvider>,
    );

    // Clear the initial toast so it doesn't interfere with the 3-toast cap.
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('Initial toast')).toBeNull();

    fireEvent.click(screen.getByText(/show success/i));
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    fireEvent.click(screen.getByText(/show error/i));
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    fireEvent.click(screen.getByText(/show info/i));

    // All three toasts are visible simultaneously as distinct, stacked nodes
    // rather than overlapping/replacing one another.
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(3);

    const stack = alerts[0].parentElement;
    expect(stack).not.toBeNull();
    expect(stack?.className).toMatch(/flex-col/);
    expect(stack?.className).toMatch(/gap-3/);
    alerts.forEach((alert) => {
      expect(alert.parentElement).toBe(stack);
    });

    // Success (shown first) dismisses on its own timer without shifting
    // the still-active Error/Info toasts.
    act(() => {
      jest.advanceTimersByTime(1000); // t = 4000ms since Success shown
    });
    expect(screen.queryByText('Success message')).toBeNull();
    expect(screen.getByText('Error message')).toBeTruthy();
    expect(screen.getByText('Info message')).toBeTruthy();

    // Error dismisses next, independently of Info.
    act(() => {
      jest.advanceTimersByTime(1500); // t = 4000ms since Error shown
    });
    expect(screen.queryByText('Error message')).toBeNull();
    expect(screen.getByText('Info message')).toBeTruthy();

    // Info dismisses last, on its own schedule.
    act(() => {
      jest.advanceTimersByTime(1500); // t = 4000ms since Info shown
    });
    expect(screen.queryByText('Info message')).toBeNull();
  });
});
