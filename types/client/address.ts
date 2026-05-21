import type { AddressFromToFilter } from 'types/api/address';

export type HolderChartPeriod = '24h' | '7d' | '30d' | '90d';

export type CsvExportParams = {
  type: 'transactions' | 'internal-transactions' | 'token-transfers';
  filterType?: 'address';
  filterValue?: AddressFromToFilter;
} | {
  type: 'logs';
  filterType?: 'topic';
  filterValue?: string;
} | {
  type: 'holders';
  filterType?: undefined;
  filterValue?: undefined;
} | {
  type: 'distribution';
  filterType?: undefined;
  filterValue?: undefined;
} | {
  type: 'holder-chart';
  filterType?: undefined;
  filterValue?: undefined;
  period?: HolderChartPeriod;
} | {
  type: 'epoch-rewards';
  filterType?: undefined;
  filterValue?: undefined;
};
