import React from 'react';

import type { PublicTagApplicationRow } from 'types/api/publicTagSubmissions';

import { Button } from 'toolkit/chakra/button';
import AddressEntity from 'ui/shared/entities/address/AddressEntity';
import ListItemMobileGrid from 'ui/shared/ListItemMobile/ListItemMobileGrid';
import TimeWithTooltip from 'ui/shared/time/TimeWithTooltip';

import PublicTagApplicationPreview from './PublicTagApplicationPreview';
import PublicTagApplicationStatusBadge from './PublicTagApplicationStatusBadge';
import { getPublicTagApplicationTypeLabel, isPublicTagApplicationEditable } from './utils';

interface Props {
  item: PublicTagApplicationRow;
  isLoading?: boolean;
  onEdit?: (item: PublicTagApplicationRow) => void;
}

const PublicTagApplicationsListItem = ({ item, isLoading, onEdit }: Props) => {
  const handleEdit = React.useCallback(() => {
    onEdit?.(item);
  }, [ item, onEdit ]);

  return (
    <ListItemMobileGrid.Container gridTemplateColumns="100px auto">

      <ListItemMobileGrid.Label isLoading={ isLoading }>Address</ListItemMobileGrid.Label>
      <ListItemMobileGrid.Value>
        <AddressEntity
          address={{ hash: item.address_hash }}
          truncation="constant"
          isLoading={ isLoading }
          fontWeight={ 600 }
          noIcon
        />
      </ListItemMobileGrid.Value>

      <ListItemMobileGrid.Label isLoading={ isLoading }>Preview</ListItemMobileGrid.Label>
      <ListItemMobileGrid.Value>
        <PublicTagApplicationPreview item={ item } size="sm"/>
      </ListItemMobileGrid.Value>

      <ListItemMobileGrid.Label isLoading={ isLoading }>Type</ListItemMobileGrid.Label>
      <ListItemMobileGrid.Value>
        <span>{ getPublicTagApplicationTypeLabel(item) }</span>
      </ListItemMobileGrid.Value>

      <ListItemMobileGrid.Label isLoading={ isLoading }>Status</ListItemMobileGrid.Label>
      <ListItemMobileGrid.Value>
        <PublicTagApplicationStatusBadge status={ item.status } reason={ item.reject_reason }/>
      </ListItemMobileGrid.Value>

      <ListItemMobileGrid.Label isLoading={ isLoading }>Submitted</ListItemMobileGrid.Label>
      <ListItemMobileGrid.Value>
        <TimeWithTooltip
          timestamp={ item.inserted_at }
          isLoading={ isLoading }
          color="text.secondary"
        />
      </ListItemMobileGrid.Value>

      { onEdit && !isLoading && isPublicTagApplicationEditable(item) && (
        <>
          <ListItemMobileGrid.Label isLoading={ isLoading }>&nbsp;</ListItemMobileGrid.Label>
          <ListItemMobileGrid.Value>
            <Button variant="link" size="sm" onClick={ handleEdit }>Edit</Button>
          </ListItemMobileGrid.Value>
        </>
      ) }

    </ListItemMobileGrid.Container>
  );
};

export default React.memo(PublicTagApplicationsListItem);
