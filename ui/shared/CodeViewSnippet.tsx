import { Box, chakra, Flex } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import React from 'react';

import { Skeleton } from 'toolkit/chakra/skeleton';
import CopyToClipboard from 'ui/shared/CopyToClipboard';

// Monaco is ~500 KB minified+gzipped and only renders for snippet / code
// views. Lazy-load it via next/dynamic so the rest of the explorer doesn't
// pay for it. The Skeleton fallback matches the dimensions of the eventual
// editor (500 px tall, full width) so layout doesn't shift while the chunk
// is in flight.
const CodeEditor = dynamic(() => import('ui/shared/monaco/CodeEditor'), {
  ssr: false,
  loading: () => <Skeleton loading height="500px" w="100%"/>,
});

interface Props {
  data: string;
  copyData?: string;
  language: string;
  title?: string;
  className?: string;
  rightSlot?: React.ReactNode;
  isLoading?: boolean;
}

const CodeViewSnippet = ({ data, copyData, language, title, className, rightSlot, isLoading }: Props) => {

  const editorData = React.useMemo(() => {
    return [ { file_path: 'index', source_code: data } ];
  }, [ data ]);

  return (
    <Box className={ className } as="section" title={ title }>
      { (title || rightSlot) && (
        <Flex justifyContent={ title ? 'space-between' : 'flex-end' } alignItems="center" mb={ 3 }>
          { title && <Skeleton loading={ isLoading } fontWeight={ 500 }>{ title }</Skeleton> }
          { rightSlot }
          <CopyToClipboard text={ copyData ?? data } isLoading={ isLoading }/>
        </Flex>
      ) }
      { isLoading ? <Skeleton loading height="500px" w="100%"/> : <CodeEditor data={ editorData } language={ language }/> }
    </Box>
  );
};

export default React.memo(chakra(CodeViewSnippet));
