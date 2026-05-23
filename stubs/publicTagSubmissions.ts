import type { PublicTagApplicationRow } from 'types/api/publicTagSubmissions';

import { ADDRESS_HASH } from './addressParams';

export const PUBLIC_TAG_APPLICATION_ROW: PublicTagApplicationRow = {
  id: 1,
  address_hash: ADDRESS_HASH,
  tag_name: 'Example Tag',
  tag_type: 'name',
  company_name: 'Example Corp',
  company_website: 'https://example.com',
  description: 'A test tag for display purposes',
  status: 'pending',
  inserted_at: '2026-05-20T10:00:00.000000Z',
  reject_reason: null,
  meta: {
    bgColor: '#ff1493',
    textColor: '#ffffff',
    tagUrl: 'https://example.com',
    tagIcon: 'https://example.com/icon.png',
    tooltipDescription: 'Example tooltip',
    ownerStatement: 'owner',
  },
};
