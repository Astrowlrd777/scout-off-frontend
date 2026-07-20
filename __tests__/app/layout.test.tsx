import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RootLayout, { metadata } from '@/app/layout';

jest.mock('next-intl/server', () => ({
  getMessages: jest.fn().mockResolvedValue({ app_title: 'ScoutOff' }),
}));

jest.mock('next-intl', () => ({
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="intl-provider">{children}</div>
  ),
}));

jest.mock('@/components/Navbar', () => ({
  __esModule: true,
  default: () => <nav data-testid="navbar">Navbar</nav>,
}));

jest.mock('@/components/ContractPausedBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="contract-paused-banner" />,
}));

jest.mock('@/components/ConfigWarningBanner', () => ({
  __esModule: true,
  default: ({ warnings }: { warnings: unknown[] }) =>
    warnings.length > 0 ? (
      <div data-testid="config-warning-banner" />
    ) : null,
}));

jest.mock('@/components/ui/Toast', () => ({
  __esModule: true,
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="toast-provider">{children}</div>
  ),
}));

jest.mock('@/context/WalletContext', () => ({
  __esModule: true,
  WalletProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="wallet-provider">{children}</div>
  ),
}));

describe('RootLayout', () => {
  // Rendering a top-level <html>/<body> tree via RTL's render() (which mounts
  // into a <div>) triggers a benign DOM-nesting warning from React; silence it.
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders providers, navbar, banner, and children inside main content', async () => {
    const element = await RootLayout({
      children: <p>Page content</p>,
      params: { locale: 'fr' },
    });

    render(<>{element}</>);

    expect(screen.getByTestId('intl-provider')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-provider')).toBeInTheDocument();
    expect(screen.getByTestId('toast-provider')).toBeInTheDocument();
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('contract-paused-banner')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.getByText('Skip to main content')).toHaveAttribute(
      'href',
      '#main-content',
    );
  });

  it('defaults the locale to "en" when no locale param is provided', async () => {
    const element = await RootLayout({ children: <p>No locale</p> });

    const { container } = render(<>{element}</>);

    expect(container.querySelector('html')).toHaveAttribute('lang', 'en');
  });

  it('exposes SEO metadata for the app', () => {
    expect(metadata.title).toBe('ScoutOff — Decentralized Football Scouting');
    expect(metadata.openGraph?.url).toBe('https://scoutoff.app');
  });

  it('renders ConfigWarningBanner when config is invalid', async () => {
    // Set NEXT_PUBLIC_CONTRACT_ID to empty to trigger the warning
    const prev = process.env.NEXT_PUBLIC_CONTRACT_ID;
    delete process.env.NEXT_PUBLIC_CONTRACT_ID;

    try {
      const element = await RootLayout({
        children: <p>Content</p>,
        params: { locale: 'en' },
      });

      render(<>{element}</>);

      expect(
        screen.getByTestId('config-warning-banner'),
      ).toBeInTheDocument();
    } finally {
      process.env.NEXT_PUBLIC_CONTRACT_ID = prev;
    }
  });

  it('hides ConfigWarningBanner when config is valid', async () => {
    const prev = process.env.NEXT_PUBLIC_CONTRACT_ID;
    process.env.NEXT_PUBLIC_CONTRACT_ID = 'CCTOLI...test123';

    try {
      const element = await RootLayout({
        children: <p>Content</p>,
        params: { locale: 'en' },
      });

      render(<>{element}</>);

      expect(
        screen.queryByTestId('config-warning-banner'),
      ).not.toBeInTheDocument();
    } finally {
      process.env.NEXT_PUBLIC_CONTRACT_ID = prev;
    }
  });
});
