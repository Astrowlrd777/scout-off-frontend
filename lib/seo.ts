import { headers } from 'next/headers';
import type { Metadata } from 'next';

/**
 * Returns the base URL for the application from environment or a sensible default.
 */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://scoutoff.app';
}

/**
 * Constructs the full canonical URL for the current request.
 *
 * Reads the `x-pathname` header (set by middleware) to determine the current
 * path, then prepends the app origin. Falls back to the root path if the
 * header is absent.
 */
export async function getCanonicalUrl(): Promise<URL> {
  const baseUrl = getBaseUrl();
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/';
  return new URL(pathname, baseUrl);
}

/**
 * Generates SEO metadata including a canonical URL for the current page.
 *
 * Designed for use in layout/page `generateMetadata` functions.
 *
 * @example
 * ```ts
 * // app/[locale]/layout.tsx
 * export async function generateMetadata(): Promise<Metadata> {
 *   return seoMetadata();
 * }
 * ```
 */
export async function seoMetadata(): Promise<Metadata> {
  const canonical = await getCanonicalUrl();

  return {
    alternates: {
      canonical: canonical.toString(),
    },
  };
}
