import type { ApiResource } from '../../types';
import type { LabelDirectoryResponse } from 'types/api/labelDirectory';

export const GENERAL_API_LABEL_RESOURCES = {
  labels_categories: {
    path: '/api/v2/labels/categories',
  },
} satisfies Record<string, ApiResource>;

export type GeneralApiLabelResourceName = `general:${ keyof typeof GENERAL_API_LABEL_RESOURCES }`;

/* eslint-disable @stylistic/indent */
export type GeneralApiLabelResourcePayload<R extends GeneralApiLabelResourceName> =
R extends 'general:labels_categories' ? LabelDirectoryResponse :
never;
/* eslint-enable @stylistic/indent */
