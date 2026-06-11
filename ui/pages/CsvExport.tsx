import { Flex } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import React from 'react';

import { AddressFromToFilterValues } from 'types/api/address';
import type { CsvExportParams } from 'types/client/address';

import config from 'configs/app';
import type { ResourceName } from 'lib/api/resources';
import useApiQuery from 'lib/api/useApiQuery';
import { useMultichainContext } from 'lib/contexts/multichain';
import throwOnAbsentParamError from 'lib/errors/throwOnAbsentParamError';
import throwOnResourceLoadError from 'lib/errors/throwOnResourceLoadError';
import useIsMobile from 'lib/hooks/useIsMobile';
import { ContentLoader } from 'toolkit/components/loaders/ContentLoader';
import { nbsp } from 'toolkit/utils/htmlEntities';
import CsvExportForm from 'ui/csvExport/CsvExportForm';
import AddressEntity from 'ui/shared/entities/address/AddressEntity';
import TokenEntity from 'ui/shared/entities/token/TokenEntity';
import ChainIcon from 'ui/shared/externalChains/ChainIcon';
import PageTitle from 'ui/shared/Page/PageTitle';

interface ExportTypeEntity {
  text: string;
  resource: ResourceName;
  fileNameTemplate: string;
  filterType?: CsvExportParams['filterType'];
  filterValues?: Readonly<Array<CsvExportParams['filterValue']>>;
}

const EXPORT_TYPES: Record<CsvExportParams['type'], ExportTypeEntity> = {
  transactions: {
    text: 'transactions',
    resource: 'general:address_csv_export_txs',
    fileNameTemplate: 'transactions',
    filterType: 'address',
    filterValues: AddressFromToFilterValues,
  },
  'internal-transactions': {
    text: 'internal transactions',
    resource: 'general:address_csv_export_internal_txs',
    fileNameTemplate: 'internal_transactions',
    filterType: 'address',
    filterValues: AddressFromToFilterValues,
  },
  'token-transfers': {
    text: 'token transfers',
    resource: 'general:address_csv_export_token_transfers',
    fileNameTemplate: 'token_transfers',
    filterType: 'address',
    filterValues: AddressFromToFilterValues,
  },
  logs: {
    text: 'logs',
    resource: 'general:address_csv_export_logs',
    fileNameTemplate: 'logs',
    filterType: 'topic',
  },
  holders: {
    text: 'holders',
    resource: 'general:token_csv_export_holders',
    fileNameTemplate: 'holders',
  },
  distribution: {
    text: 'holders distribution',
    resource: 'general:token_csv_export_distribution',
    fileNameTemplate: 'holders_distribution',
  },
  'holder-chart': {
    text: 'holder count history',
    resource: 'general:token_csv_export_holder_chart',
    fileNameTemplate: 'holder_chart',
  },
  'epoch-rewards': {
    text: 'epoch rewards',
    resource: 'general:address_csv_export_celo_election_rewards',
    fileNameTemplate: 'epoch_rewards',
  },
};

const TOKEN_SCOPED_EXPORT_TYPES = new Set<CsvExportParams['type']>([ 'holders', 'distribution', 'holder-chart' ]);

const isCorrectExportType = (type: string): type is CsvExportParams['type'] => Object.keys(EXPORT_TYPES).includes(type);

const CsvExport = () => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const multichainContext = useMultichainContext();
  const chainConfig = multichainContext?.chain.app_config || config;

  const addressHash = router.query.address?.toString() || '';
  const exportTypeParam = router.query.type?.toString() || '';
  const exportTypeKey = isCorrectExportType(exportTypeParam) ? exportTypeParam : null;
  const isExportTypeEnabled = Boolean(exportTypeKey && (exportTypeKey !== 'epoch-rewards' || chainConfig.features.celo.isEnabled));
  const exportType = exportTypeKey && isExportTypeEnabled ? EXPORT_TYPES[exportTypeKey] : null;
  const filterTypeFromQuery = router.query.filterType?.toString() || null;
  const filterValueFromQuery = router.query.filterValue?.toString();
  const periodFromQuery = router.query.period?.toString() || null;

  const addressQuery = useApiQuery('general:address', {
    pathParams: { hash: addressHash },
    queryOptions: {
      enabled: Boolean(addressHash),
    },
  });

  const isTokenScopedExport = Boolean(exportTypeKey && isExportTypeEnabled && TOKEN_SCOPED_EXPORT_TYPES.has(exportTypeKey));

  const tokenQuery = useApiQuery('general:token', {
    pathParams: { hash: addressHash },
    queryOptions: {
      enabled: Boolean(addressHash) && isTokenScopedExport,
    },
  });

  const configQuery = useApiQuery('general:config_csv_export', {
    queryOptions: {
      enabled: Boolean(addressHash),
    },
  });

  const isLoading = addressQuery.isPending || configQuery.isPending || (isTokenScopedExport && tokenQuery.isPending);

  throwOnAbsentParamError(addressHash);
  throwOnAbsentParamError(exportType);

  if (!exportType) {
    return null;
  }

  const filterType = filterTypeFromQuery === exportType.filterType ? filterTypeFromQuery : null;
  const filterValue = (() => {
    if (!filterType || !filterValueFromQuery) {
      return null;
    }

    if (exportType.filterValues && !exportType.filterValues?.includes(filterValueFromQuery)) {
      return null;
    }

    return filterValueFromQuery;
  })();

  const content = (() => {
    throwOnResourceLoadError(addressQuery);

    if (isLoading) {
      return <ContentLoader/>;
    }

    return (
      <CsvExportForm
        hash={ addressHash }
        resource={ exportType.resource }
        exportType={ exportTypeKey && isExportTypeEnabled ? exportTypeKey : undefined }
        filterType={ filterType }
        filterValue={ filterValue }
        fileNameTemplate={ exportType.fileNameTemplate }
        period={ periodFromQuery }
      />
    );
  })();

  const description = (() => {
    if (isLoading) {
      return null;
    }

    const chainInfo = multichainContext?.chain ? (
      <Flex display="inline-flex" alignItems="center" columnGap={ 2 }>
        <span>on</span>
        <ChainIcon data={ multichainContext.chain }/>
        <span>{ multichainContext.chain.app_config.chain.name }</span>
      </Flex>
    ) : null;

    const limit = (configQuery.data?.limit || 10_000).toLocaleString(undefined, { maximumFractionDigits: 3, notation: 'compact' });

    if (isTokenScopedExport && tokenQuery.data) {
      const holdersTail = exportTypeParam === 'holders' ?
        <span>Exports are limited to the top { limit } holders by amount held.</span> :
        null;
      return (
        <Flex mb={ 10 } whiteSpace="pre-wrap" flexWrap="wrap">
          <span>Export { exportType.text } for token </span>
          <TokenEntity
            token={ tokenQuery.data }
            truncation={ isMobile ? 'constant' : 'dynamic' }
            w="fit-content"
            maxW={{ base: '100%', lg: '400px' }}
            noCopy
            noSymbol
          />
          { chainInfo }
          <span> to CSV file. </span>
          { holdersTail }
        </Flex>
      );
    }

    if (!addressQuery.data) {
      return null;
    }

    return (
      <Flex mb={ 10 } whiteSpace="pre-wrap" flexWrap="wrap">
        <span>Export { exportType.text } for address </span>
        <AddressEntity
          address={ addressQuery.data }
          truncation={ isMobile ? 'constant' : 'dynamic' }
          noCopy
        />
        <span>{ nbsp }</span>
        { filterType && filterValue && <span>with applied filter by { filterType } ({ filterValue })</span> }
        { chainInfo }
        <span> to CSV file. </span>
        <span>Exports are limited to the last { limit } { exportType.text }.</span>
      </Flex>
    );
  })();

  return (
    <>
      <PageTitle title="Export data to CSV file"/>
      { description }
      { content }
    </>
  );
};

export default CsvExport;
