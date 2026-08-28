import Head from 'next/head';
import React from 'react';

import type { Route } from 'nextjs-routes';
import type { Props as PageProps } from 'nextjs/getServerSideProps/handlers';

import config from 'configs/app';
import * as metadata from 'lib/metadata';

interface Props<Pathname extends Route['pathname']> {
  pathname: Pathname;
  query?: PageProps<Pathname>['query'];
  apiData?: PageProps<Pathname>['apiData'];
}

const PageMetadata = <Pathname extends Route['pathname']>(props: Props<Pathname>) => {
  const { title, description, opengraph, canonical, siteJsonLd } = metadata.generate(props, props.apiData);

  return (
    <Head>
      <title>{ title }</title>
      <meta name="description" content={ description }/>
      { canonical && <link rel="canonical" href={ canonical }/> }

      { /* OG TAGS */ }
      <meta property="og:title" content={ opengraph.title }/>
      { opengraph.description && <meta property="og:description" content={ opengraph.description }/> }
      <meta property="og:image" content={ opengraph.imageUrl }/>
      <meta property="og:type" content="website"/>

      { /* Twitter Meta Tags */ }
      <meta name="twitter:card" content="summary_large_image"/>
      <meta property="twitter:domain" content={ config.app.host }/>
      <meta name="twitter:title" content={ opengraph.title }/>
      { opengraph.description && <meta name="twitter:description" content={ opengraph.description }/> }
      <meta property="twitter:image" content={ opengraph.imageUrl }/>

      { /* `maximum-scale=1` used to be set here to stop iOS auto-zooming when a
           sub-16px input takes focus. That silently disabled pinch-zoom for
           everyone, which axe reports as a critical `meta-viewport` violation on
           every page and fails WCAG 2.1 AA 1.4.4 (Resize Text) — a real barrier
           for low-vision users, traded against a cosmetic annoyance on one
           platform. Zoom stays enabled; the correct cure for the iOS behaviour is
           a 16px font on mobile inputs, not taking zoom away from everybody. */ }
      <meta name="viewport" content="width=device-width, initial-scale=1"/>

      { /* JSON-LD structured data — rendered SSR so crawlers see it in the initial HTML */ }
      { siteJsonLd?.map((schema, index) => (
        <script
          key={ `ld-json-${ index }` }
          type="application/ld+json"

          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )) }
    </Head>
  );
};

export default PageMetadata;
