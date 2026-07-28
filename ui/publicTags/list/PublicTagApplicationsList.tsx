import { Box, Text, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import React from 'react';

import type { PublicTagApplicationRow, PublicTagApplicationStatus } from 'types/api/publicTagSubmissions';

import appConfig from 'configs/app';
import getQueryParamString from 'lib/router/getQueryParamString';
import { PUBLIC_TAG_APPLICATION_ROW } from 'stubs/publicTagSubmissions';
import { generateListStub } from 'stubs/utils';
import { Button } from 'toolkit/chakra/button';
import { ACTION_BAR_HEIGHT_DESKTOP } from 'ui/shared/ActionBar';
import DataListDisplay from 'ui/shared/DataListDisplay';
import useQueryWithPages from 'ui/shared/pagination/useQueryWithPages';
import StickyPaginationWithText from 'ui/shared/StickyPaginationWithText';

import PublicTagApplicationEditModal from './PublicTagApplicationEditModal';
import PublicTagApplicationsListItem from './PublicTagApplicationsListItem';
import PublicTagApplicationsStatusFilter from './PublicTagApplicationsStatusFilter';
import PublicTagApplicationsTable from './PublicTagApplicationsTable';
import { isPublicTagApplicationEditable } from './utils';

const parseStatusParam = (s: string): PublicTagApplicationStatus | undefined => {
  return s === 'pending' || s === 'processing' || s === 'approved' || s === 'rejected' ? s : undefined;
};

const PublicTagApplicationsList = () => {
  const router = useRouter();
  const [ editItem, setEditItem ] = React.useState<PublicTagApplicationRow | null>(null);
  const [ statusFilter, setStatusFilter ] = React.useState<PublicTagApplicationStatus | undefined>(
    () => parseStatusParam(getQueryParamString(router.query.status)),
  );

  // Statically optimized Next.js pages start with empty router.query and populate it
  // once router.isReady flips to true. Re-sync statusFilter from the URL then, so deep
  // links like ?status=approved are honored on the first fetch.
  React.useEffect(() => {
    if (!router.isReady) {
      return;
    }
    const next = parseStatusParam(getQueryParamString(router.query.status));
    setStatusFilter((current) => (current === next ? current : next));
  }, [ router.isReady, router.query.status ]);

  const { data, isError, isPlaceholderData, pagination, onFilterChange, refetch } = useQueryWithPages({
    resourceName: 'admin:public_tag_applications_list',
    pathParams: { chainId: appConfig.chain.id },
    filters: statusFilter ? { status: statusFilter } : undefined,
    options: {
      placeholderData: generateListStub<'admin:public_tag_applications_list'>(
        PUBLIC_TAG_APPLICATION_ROW,
        5,
        { next_page_params: null },
      ),
    },
  });

  const handleStatusChange = React.useCallback((status: PublicTagApplicationStatus | undefined) => {
    setStatusFilter(status);
    onFilterChange({ status });
  }, [ onFilterChange ]);

  const handleRetry = React.useCallback(() => {
    refetch();
  }, [ refetch ]);

  const handleEdit = React.useCallback((item: PublicTagApplicationRow) => {
    if (isPublicTagApplicationEditable(item)) {
      setEditItem(item);
    }
  }, []);

  const handleEditModalClose = React.useCallback(() => {
    setEditItem(null);
  }, []);

  const handleEditOpenChange = React.useCallback(({ open }: { open: boolean }) => {
    if (!open) {
      handleEditModalClose();
    }
  }, [ handleEditModalClose ]);

  const content = data?.items ? (
    <>
      <Box hideFrom="lg">
        { data.items.map((item, index) => (
          <PublicTagApplicationsListItem
            key={ String(item.id) + (isPlaceholderData ? index : '') }
            item={ item }
            isLoading={ isPlaceholderData }
            onEdit={ handleEdit }
          />
        )) }
      </Box>
      <Box hideBelow="lg">
        <PublicTagApplicationsTable
          items={ data.items }
          top={ pagination.isVisible ? ACTION_BAR_HEIGHT_DESKTOP : 0 }
          isLoading={ isPlaceholderData }
          onEdit={ handleEdit }
        />
      </Box>
    </>
  ) : null;

  const filterElement = (
    <PublicTagApplicationsStatusFilter
      value={ statusFilter }
      onChange={ handleStatusChange }
    />
  );

  const actionBar = pagination.isVisible ? (
    <StickyPaginationWithText
      text={ null }
      pagination={ pagination }
    />
  ) : null;

  return (
    <>
      <Box mb={ 4 }>
        { filterElement }
      </Box>
      <DataListDisplay
        isError={ isError }
        itemsNum={ data?.items.length }
        emptyText=""
        actionBar={ actionBar }
      >
        { content }
      </DataListDisplay>
      { isError && (
        <Button variant="outline" size="sm" onClick={ handleRetry } mt={ 3 }>
          Retry
        </Button>
      ) }
      { isError !== true && data?.items.length === 0 && (
        <VStack mt={ 8 } gap={ 2 }>
          <Text color="text.secondary" textAlign="center">
            No requests yet — submit one from the <strong>Submit new tag</strong> tab.
          </Text>
        </VStack>
      ) }
      { editItem && (
        <PublicTagApplicationEditModal
          item={ editItem }
          open={ Boolean(editItem) }
          onOpenChange={ handleEditOpenChange }
        />
      ) }
    </>
  );
};

export default PublicTagApplicationsList;
