import { chakra } from '@chakra-ui/react';
import React from 'react';

import type { Props } from './types';

import AppErrorBoundary from 'ui/shared/AppError/AppErrorBoundary';
import HeaderAlert from 'ui/snippets/header/HeaderAlert';
import HeaderMobile from 'ui/snippets/header/HeaderMobile';

import * as Layout from './components';

const ErrorMain = ({ children }: { children: React.ReactNode }) => (
  <chakra.main id="main" tabIndex={ -1 }>{ children }</chakra.main>
);

const LayoutHome = ({ children }: Props) => {
  return (
    <Layout.Root content={ children }>
      <Layout.Container>
        <Layout.TopRow/>
        <Layout.NavBar/>
        <HeaderMobile hideSearchButton/>
        <Layout.MainArea>
          <Layout.SideBar/>
          <Layout.MainColumn
            paddingTop={{ base: 3, lg: 6 }}
          >
            <HeaderAlert mb={ 3 }/>
            { /* The landmark stays on the page rather than moving here.
              * Layout.Root returns its content prop directly until mounted, so
              * a landmark placed in this layout is absent from the
              * server-rendered and no-JS output entirely. Home and
              * OpSuperchainHome keep theirs, which covers that path.
              *
              * That leaves the error path, where the boundary replaces the
              * children that carry it - so the error screen gets its own via
              * the Container the boundary already accepts. Exactly one #main
              * exists either way. */ }
            <AppErrorBoundary Container={ ErrorMain }>
              { children }
            </AppErrorBoundary>
          </Layout.MainColumn>
        </Layout.MainArea>
        <Layout.Footer/>
      </Layout.Container>
    </Layout.Root>
  );
};

export default LayoutHome;
