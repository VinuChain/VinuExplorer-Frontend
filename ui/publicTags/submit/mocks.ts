import type { FormSubmitResultItem } from './types';

export const address1 = '0xd789a607CEac2f0E14867de4EB15b15C9FFB5851';
export const address2 = '0xd789a607CEac2f0E14867de4EB15b15C9FFB5852';
export const address3 = '0xd789a607CEac2f0E14867de4EB15b15C9FFB5853';
export const address4 = '0xd789a607CEac2f0E14867de4EB15b15C9FFB5854';
export const address5 = '0xd789a607CEac2f0E14867de4EB15b15C9FFB5855';

export const baseFields = {
  requesterName: 'John Doe',
  requesterEmail: 'jonh.doe@duck.me',
  companyName: 'DuckDuckMe',
  companyWebsite: 'https://duck.me',
  ownership: 'owner' as const,
  addressSource: undefined,
  description: 'Quack quack',
};

export const tag1 = {
  name: 'Unicorn Uproar',
  tagType: 'name' as const,
  meta: {
    tagUrl: 'https://example.com',
    bgColor: '#ff1493',
    textColor: '#FFFFFF',
    tooltipDescription: undefined,
  },
};

export const tag2 = {
  name: 'Hello',
  tagType: 'generic' as const,
  meta: {
    tooltipDescription: 'Hello, it is me... I was wondering if after all these years you would like to meet',
  },
};

export const tag3 = {
  name: 'duck owner 🦆',
  tagType: 'classifier' as const,
  meta: {
    bgColor: '#fff300',
  },
};

import { PUBLIC_TAG_APPLICATION_ROW } from 'stubs/publicTagSubmissions';

export const allSuccessResponses: Array<FormSubmitResultItem> = [
  address1,
  address2,
  address3,
  address4,
  address5,
]
  .map((address) => ([ tag1, tag2, tag3 ].map((tag) => ({
    status: 'ok' as const,
    payload: {
      ...baseFields,
      ...tag,
      address,
    },
    submission: PUBLIC_TAG_APPLICATION_ROW,
  }))))
  .flat();

export const mixedResponses: Array<FormSubmitResultItem> = [
  // address1
  {
    status: 'ok' as const,
    payload: { address: address1, ...tag1, ...baseFields },
    submission: PUBLIC_TAG_APPLICATION_ROW,
  },
  {
    status: 'error' as const,
    payload: { address: address1, ...tag2, ...baseFields },
    error: 'Some error',
  },
  {
    status: 'error' as const,
    payload: { address: address1, ...tag3, ...baseFields },
    error: 'Some error',
  },
  // address2
  {
    status: 'error' as const,
    payload: { address: address2, ...tag2, ...baseFields },
    error: 'Some error',
  },
  {
    status: 'error' as const,
    payload: { address: address2, ...tag3, ...baseFields },
    error: 'Some error',
  },
  // address3
  {
    status: 'error' as const,
    payload: { address: address3, ...tag1, ...baseFields },
    error: 'Some error',
  },
  {
    status: 'error' as const,
    payload: { address: address3, ...tag2, ...baseFields },
    error: 'Another nasty error',
  },
  {
    status: 'ok' as const,
    payload: { address: address3, ...tag3, ...baseFields },
    submission: PUBLIC_TAG_APPLICATION_ROW,
  },
];
