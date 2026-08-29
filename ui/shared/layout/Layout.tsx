/* eslint-disable consistent-default-export-name/default-export-match-filename */
import React from 'react';

import type { Props } from './types';

import AppErrorBoundary from 'ui/shared/AppError/AppErrorBoundary';
import HeaderAlert from 'ui/snippets/header/HeaderAlert';
import HeaderDesktop from 'ui/snippets/header/HeaderDesktop';
import HeaderMobile from 'ui/snippets/header/HeaderMobile';

import * as Layout from './components';

const LayoutDefault = ({ children }: Props) => {
  return (
    <Layout.Root content={ children }>
      <Layout.Container>
        <Layout.TopRow/>
        <Layout.NavBar/>
        <HeaderMobile/>
        <Layout.MainArea>
          <Layout.SideBar/>
          <Layout.MainColumn>
            <HeaderAlert/>
            <HeaderDesktop/>
            { /* The main landmark wraps the boundary rather than sitting
              * inside it. AppErrorBoundary replaces its whole subtree when it
              * catches, so with #main inside, a crashed page removed the
              * target that the skip link in Container - which is outside the
              * boundary and still rendered - points at, leaving keyboard users
              * stranded in the nav on exactly the screen they most need to
              * leave. This way the error screen renders inside main. */ }
            <Layout.Content>
              <AppErrorBoundary>
                { children }
              </AppErrorBoundary>
            </Layout.Content>
          </Layout.MainColumn>
        </Layout.MainArea>
        <Layout.Footer/>
      </Layout.Container>
    </Layout.Root>
  );
};

export default LayoutDefault;
