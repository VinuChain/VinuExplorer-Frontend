import { Box, chakra, Flex } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import React from 'react';

import { Skeleton } from 'toolkit/chakra/skeleton';
import CopyToClipboard from 'ui/shared/CopyToClipboard';

// Monaco is ~500KB minified+gzipped and is only needed on contract code and
// snippet-rendering pages. Lazy-load it so the rest of the explorer doesn't
// pay for it on every page transition.
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
