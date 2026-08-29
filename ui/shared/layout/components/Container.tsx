import { Box, chakra } from '@chakra-ui/react';
import React from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

const Container = ({ children, className }: Props) => {
  return (
    <Box
      className={ className }
      minWidth={{ base: '100vw', lg: 'fit-content' }}
      m="0 auto"
      bgColor="bg.primary"
    >
      { /* WCAG 2.4.1 Bypass Blocks. Roughly 25 top-bar and side-nav stops come
        * before the content on every page, and Container is the shared root of
        * every layout, so this is the first tab stop everywhere.
        *
        * A plain anchor rather than toolkit's Link: next/link routes a hash
        * through router.scrollToHash, which calls scrollIntoView and never
        * focuses the target - the page would scroll while keyboard focus stayed
        * in the nav, which is the opposite of the point. */ }
      <chakra.a
        href="#main"
        srOnly
        _focus={{
          position: 'fixed',
          top: 2,
          left: 2,
          w: 'auto',
          h: 'auto',
          clip: 'auto',
          overflow: 'visible',
          m: 0,
          px: 4,
          py: 2,
          zIndex: 'banner',
          bg: 'bg.primary',
          color: 'link.primary',
          borderWidth: '1px',
          borderRadius: 'md',
        }}
      >
        Skip to main content
      </chakra.a>
      { children }
    </Box>
  );
};

export default React.memo(chakra(Container));
