import type { OrganizationSchema, SiteSchema, WebSiteSchema } from './types';

import type { Route } from 'nextjs-routes';

import config from 'configs/app';

// Cross-property sameAs links — mirrors what VinuChain-Landing SeoHead.tsx uses.
const SAME_AS_LINKS = [
  'https://www.vinuchain.org',
  'https://vinuchain.vinuswap.org',
  'https://www.vinufinance.app',
  'https://vinufoundation.org',
];

/**
 * Generates Organization + WebSite JSON-LD schemas for the landing route.
 * Returns undefined for every other route.
 */
export default function generateSiteSchema(pathname: Route['pathname']): Array<SiteSchema> | undefined {
  if (pathname !== '/') {
    return undefined;
  }

  const baseUrl = config.app.baseUrl;

  const organization: OrganizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'VinuExplorer',
    url: baseUrl,
    sameAs: SAME_AS_LINKS,
  };

  const webSite: WebSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'VinuExplorer',
    url: baseUrl,
  };

  return [ organization, webSite ];
}
