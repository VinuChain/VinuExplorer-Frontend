import { chakra } from '@chakra-ui/react';
import React from 'react';

import type { EntityTag } from './types';

import { Image } from 'toolkit/chakra/image';
import IconSvg from 'ui/shared/IconSvg';

import { isCategoryTagType } from './utils';

interface Props {
  data: EntityTag;
  ignoreColor?: boolean;
}

const EntityTagIcon = ({ data, ignoreColor }: Props) => {

  const iconColor = data.meta?.textColor && !ignoreColor ? data.meta.textColor : 'icon.secondary';
  const nameIconFallback = <IconSvg name="publictags_slim" boxSize={ 3 } color={ iconColor }/>;
  const hashFallback = <chakra.span color={ iconColor }>#</chakra.span>;
  const hasHashFallback = isCategoryTagType(data.tagType);

  if (data.meta?.tagIcon) {
    const fallback = (() => {
      if (data.tagType === 'name') {
        return nameIconFallback;
      }

      if (hasHashFallback) {
        return hashFallback;
      }

      return undefined;
    })();

    return (
      <Image
        boxSize={ 3 }
        src={ data.meta.tagIcon }
        alt={ `${ data.name } icon` }
        fallback={ fallback }
      />
    );
  }

  if (data.tagType === 'name') {
    return nameIconFallback;
  }

  if (hasHashFallback) {
    return hashFallback;
  }

  return null;
};

export default React.memo(EntityTagIcon);
