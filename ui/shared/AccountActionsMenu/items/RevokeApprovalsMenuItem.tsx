import { useRouter } from 'next/router';
import React from 'react';

import type { ItemProps } from '../types';

import { MenuItem } from 'toolkit/chakra/menu';
import IconSvg from 'ui/shared/IconSvg';

import ButtonItem from '../parts/ButtonItem';

const RevokeApprovalsMenuItem = ({ hash, type }: ItemProps) => {
  const router = useRouter();

  const handleClick = React.useCallback(() => {
    router.push({ pathname: '/essential-dapps/[id]', query: { id: 'revoke', address: hash } });
  }, [ hash, router ]);

  switch (type) {
    case 'button': {
      return <ButtonItem label="Check approvals" icon="revoke" onClick={ handleClick }/>;
    }
    case 'menu_item': {
      return (
        <MenuItem onClick={ handleClick } value="check-approvals">
          <IconSvg name="revoke" boxSize={ 6 }/>
          <span>Check approvals</span>
        </MenuItem>
      );
    }
  }
};

export default React.memo(RevokeApprovalsMenuItem);
