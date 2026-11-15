import { castArray } from 'es-toolkit/compat';

import type { AdvancedFilterAge, AdvancedFilterParams } from 'types/api/advancedFilter';

import dayjs from 'lib/date/dayjs';
import { HOUR, DAY, MONTH } from 'toolkit/utils/consts';

import type { ColumnsIds } from './constants';
import { ADVANCED_FILTER_TYPES, TABLE_COLUMNS } from './constants';

export function getDurationFromAge(age: AdvancedFilterAge) {
  switch (age) {
    case '1h':
      return HOUR;
    case '24h':
      return DAY;
    case '7d':
      return DAY * 7;
    case '1m':
      return MONTH;
    case '3m':
      return MONTH * 3;
    case '6m':
      return MONTH * 6;
  }
}

function getFilterValueWithNames(values?: Array<string>, names?: Array<string>) {
  if (!names) {
    return castArray(values).join(', ');
  } else if (Array.isArray(names) && Array.isArray(values)) {
    return names.map((n, i) => n ? n : values[i]).join(', ');
  } else {
    return names;
  }
}

const filterParamNames: Record<keyof AdvancedFilterParams, string> = {
  // we don't show address_relation as filter tag
  address_relation: '',
  age: 'Age',
  age_from: 'Date from',
  age_to: 'Date to',
  amount_from: 'Amount from',
  amount_to: 'Amount to',
  from_address_hashes_to_exclude: 'From Exc',
  from_address_hashes_to_include: 'From',
  methods: 'Methods',
  methods_names: '',
  to_address_hashes_to_exclude: 'To Exc',
  to_address_hashes_to_include: 'To',
  token_contract_address_hashes_to_exclude: 'Asset Exc',
  token_contract_symbols_to_exclude: '',
  token_contract_address_hashes_to_include: 'Asset',
  token_contract_symbols_to_include: '',
  transaction_types: 'Type',
};

export function getFilterTags(filters: AdvancedFilterParams) {
  const filtersToShow = { ...filters };
  if (filtersToShow.age) {
    filtersToShow.age_from = undefined;
    filtersToShow.age_to = undefined;
  }

  return (Object.entries(filtersToShow) as Array<[keyof AdvancedFilterParams, AdvancedFilterParams[keyof AdvancedFilterParams]]>).map(([ key, value ]) => {
    if (!value) {
      return;
    }
    const name = filterParamNames[key as keyof AdvancedFilterParams];
    if (!name) {
      return;
    }
    let valueStr;
    switch (key) {
      case 'methods': {
        valueStr = getFilterValueWithNames(filtersToShow.methods, filtersToShow.methods_names);
        break;
      }
      case 'transaction_types': {
        valueStr = castArray(value).map(i => ADVANCED_FILTER_TYPES.find(t => t.id === i)?.name).filter(Boolean).join(', ');
        break;
      }
      case 'token_contract_address_hashes_to_exclude': {
        valueStr = getFilterValueWithNames(filtersToShow.token_contract_address_hashes_to_exclude, filtersToShow.token_contract_symbols_to_exclude);
        break;
      }
      case 'token_contract_address_hashes_to_include': {
        valueStr = getFilterValueWithNames(filtersToShow.token_contract_address_hashes_to_include, filtersToShow.token_contract_symbols_to_include);
        break;
      }
      case 'age_from': {
        valueStr = dayjs(filtersToShow.age_from).format('YYYY-MM-DD');
        break;
      }
      case 'age_to': {
        valueStr = dayjs(filtersToShow.age_to).format('YYYY-MM-DD');
        break;
      }
      default: {
        valueStr = castArray(value).join(', ');
      }
    }
    if (!valueStr) {
      return;
    }

    return {
      key: key as keyof AdvancedFilterParams,
      name,
      value: valueStr,
    };
  }).filter(Boolean);
}

// With different From and To addresses, people expect rows matching both. The
// API default is OR, which lists rows matching either side, so pick AND until
// the user chooses otherwise. The same address on both sides is the "involving
// X" link from address pages and must stay OR. Exclude lists behave the same
// under AND and OR, so they are ignored here.
export function withDefaultAddressRelation(filters: AdvancedFilterParams): AdvancedFilterParams {
  const from = filters.from_address_hashes_to_include?.map((h) => h.toLowerCase()) ?? [];
  const to = filters.to_address_hashes_to_include?.map((h) => h.toLowerCase()) ?? [];
  const sameSet = from.length === to.length && from.every((h) => to.includes(h));
  if (from.length && to.length && !sameSet && !filters.address_relation) {
    return { ...filters, address_relation: 'and' };
  }
  return filters;
}

// Column choices live in the URL as `hide_columns=fee,method` so a shared link
// keeps them. Hidden (not visible) ids are stored, so the default URL stays clean.
export const HIDE_COLUMNS_PARAM = 'hide_columns';

export function getColumnsFromQuery(value: string | Array<string> | undefined): Record<ColumnsIds, boolean> {
  const hidden = new Set((Array.isArray(value) ? value.join(',') : value || '').split(',').filter(Boolean));
  return Object.fromEntries(TABLE_COLUMNS.map((c) => [ c.id, !hidden.has(c.id) ])) as Record<ColumnsIds, boolean>;
}

export function getHiddenColumnsQuery(columns: Record<ColumnsIds, boolean>): string | undefined {
  const hidden = TABLE_COLUMNS.filter((c) => !columns[c.id]).map((c) => c.id);
  return hidden.length ? hidden.join(',') : undefined;
}
