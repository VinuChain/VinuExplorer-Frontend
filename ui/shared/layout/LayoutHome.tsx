import { chakra } from '@chakra-ui/react';
import React from 'react';

import type { Props } from './types';

import AppErrorBoundary from 'ui/shared/AppError/AppErrorBoundary';
import HeaderAlert from 'ui/snippets/header/HeaderAlert';
import HeaderMobile from 'ui/snippets/header/HeaderMobile';

import * as Layout from './components';

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
            { /* main outside the boundary - see Layout.tsx. Home and
              * OpSuperchainHome each carried this landmark themselves, which
              * put it inside the boundary; it is unstyled, so hoisting it here
              * changes nothing visually and covers both. */ }
            <chakra.main id="main" tabIndex={ -1 }>
              <AppErrorBoundary>
                { children }
              </AppErrorBoundary>
            </chakra.main>
          </Layout.MainColumn>
        </Layout.MainArea>
        <Layout.Footer/>
      </Layout.Container>
    </Layout.Root>
  );
};

export default LayoutHome;
