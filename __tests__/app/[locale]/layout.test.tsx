import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LocaleLayout, {
  generateMetadata,
  generateStaticParams,
} from '@/app/[locale]/layout';

const setRequestLocale = jest.fn();

jest.mock('next-intl/server', () => ({
  setRequestLocale: (...args: unknown[]) => setRequestLocale(...args),
}));

const mockHeaders = new Map<string, string>();

jest.mock('next/headers', () => ({
  headers: jest.fn().mockImplementation(async () => ({
    get: (key: string) => mockHeaders.get(key) ?? null,
  })),
}));

describe('LocaleLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHeaders.clear();
    process.env.NEXT_PUBLIC_APP_URL = 'https://scoutoff.app';
  });

  it('renders its children unchanged', () => {
    render(
      <LocaleLayout params={{ locale: 'fr' }}>
        <p>Locale-scoped content</p>
      </LocaleLayout>,
    );

    expect(screen.getByText('Locale-scoped content')).toBeInTheDocument();
  });

  it('sets the request locale from params', () => {
    render(
      <LocaleLayout params={{ locale: 'sw' }}>
        <p>content</p>
      </LocaleLayout>,
    );

    expect(setRequestLocale).toHaveBeenCalledWith('sw');
  });

  it('generates static params for every supported locale', () => {
    expect(generateStaticParams()).toEqual([
      { locale: 'en' },
      { locale: 'fr' },
      { locale: 'sw' },
    ]);
  });

  describe('generateMetadata', () => {
    it('returns canonical URL from x-pathname header', async () => {
      mockHeaders.set('x-pathname', '/en/scout/abc123');

      const metadata = await generateMetadata();

      expect(metadata).toEqual({
        alternates: {
          canonical: 'https://scoutoff.app/en/scout/abc123',
        },
      });
    });

    it('falls back to root when x-pathname header is absent', async () => {
      const metadata = await generateMetadata();

      expect(metadata).toEqual({
        alternates: {
          canonical: 'https://scoutoff.app/',
        },
      });
    });

    it('uses NEXT_PUBLIC_APP_URL as the origin', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
      mockHeaders.set('x-pathname', '/fr/player/42');

      const metadata = await generateMetadata();

      expect(metadata).toEqual({
        alternates: {
          canonical: 'https://example.com/fr/player/42',
        },
      });
    });
  });
});
