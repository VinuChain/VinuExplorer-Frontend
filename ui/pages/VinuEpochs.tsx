import { Box } from '@chakra-ui/react';
import React from 'react';

import { generateListStub } from 'stubs/utils';
import { VINU_EPOCH_ITEM } from 'stubs/vinuEpoch';
import ActionBar, { ACTION_BAR_HEIGHT_DESKTOP } from 'ui/shared/ActionBar';
import DataListDisplay from 'ui/shared/DataListDisplay';
import PageTitle from 'ui/shared/Page/PageTitle';
import Pagination from 'ui/shared/pagination/Pagination';
import useQueryWithPages from 'ui/shared/pagination/useQueryWithPages';
import VinuEpochsListItem from 'ui/vinuEpochs/VinuEpochsListItem';
import VinuEpochsTable from 'ui/vinuEpochs/VinuEpochsTable';

const VinuEpochsPageContent = () => {
  const epochsQuery = useQueryWithPages({
    resourceName: 'general:vinu_epochs',
    options: {
      placeholderData: generateListStub<'general:vinu_epochs'>(VINU_EPOCH_ITEM, 50, {
        next_page_params: { from: 7836 },
      }),
    },
  });

  const actionBar = epochsQuery.pagination.isVisible ? (
    <ActionBar mt={ -6 }>
      <Pagination ml="auto" { ...epochsQuery.pagination }/>
    </ActionBar>
  ) : null;

  const isLoading = epochsQuery.isPlaceholderData;

  const content = (() => {
    return epochsQuery.data?.items ? (
      <>
        <Box hideBelow="lg">
          <VinuEpochsTable items={ epochsQuery.data.items } isLoading={ isLoading } top={ ACTION_BAR_HEIGHT_DESKTOP }/>
        </Box>
        <Box hideFrom="lg">
          { epochsQuery.data.items.map((item, index) => (
            <VinuEpochsListItem
              key={ String(item.number) + (isLoading ? String(index) : '') }
              item={ item }
              isLoading={ isLoading }
            />
          )) }
        </Box>
      </>
    ) : null;
  })();

  return (
    <>
      <PageTitle title="Staking epochs" withTextAd/>
      <DataListDisplay
        isError={ epochsQuery.isError }
        itemsNum={ epochsQuery.data?.items.length }
        emptyText="There are no epochs."
        actionBar={ actionBar }
      >
        { content }
      </DataListDisplay>
    </>
  );
};

export default VinuEpochsPageContent;
