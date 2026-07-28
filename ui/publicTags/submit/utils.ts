import { pickBy, isEqual } from 'es-toolkit';

import type {
  FormFieldTag,
  FormFields,
  FormSubmitResult,
  FormSubmitResultGrouped,
  FormSubmitResultItemGrouped,
  PublicTagUpdateTarget,
  SubmitRequestBody,
} from './types';
import type { UserInfo } from 'types/api/account';

import type { Route } from 'nextjs-routes';

import getQueryParamString from 'lib/router/getQueryParamString';

export function convertFormDataToRequestsBody(data: FormFields): Array<SubmitRequestBody> {
  const result: Array<SubmitRequestBody> = [];

  for (const address of data.addresses) {
    for (const tag of data.tags) {
      result.push({
        requesterName: data.requesterName,
        requesterEmail: data.requesterEmail,
        companyName: data.companyName,
        companyWebsite: data.companyWebsite,
        address: address.hash,
        name: tag.name,
        tagType: tag.type[0],
        description: data.description,
        meta: pickBy({
          bgColor: tag.bgColor,
          textColor: tag.textColor,
          tagUrl: tag.url,
          tagIcon: tag.iconUrl,
          tooltipDescription: tag.tooltipDescription,
          ownerStatement: data.ownership,
          addressSource: data.addressSource,
        }, Boolean),
      });
    }
  }

  return result;
}

export function convertUpdateFormDataToRequestBody(data: FormFields, target: PublicTagUpdateTarget): SubmitRequestBody {
  const tag = data.tags[0];
  const visualMeta = {
    bgColor: tag?.bgColor,
    textColor: tag?.textColor,
    tagUrl: tag?.url,
    tagIcon: tag?.iconUrl,
    tooltipDescription: tag?.tooltipDescription,
  };

  return {
    requesterName: data.requesterName,
    requesterEmail: data.requesterEmail,
    companyName: data.companyName,
    companyWebsite: data.companyWebsite,
    address: target.address,
    name: target.label,
    submissionType: 'update',
    meta: pickBy(visualMeta, (value) => typeof value === 'string' && value.trim().length > 0),
  };
}

export function convertTagApiFieldsToFormFields(tag: Pick<SubmitRequestBody, 'name' | 'tagType' | 'meta'>): FormFieldTag {
  return {
    name: tag.name,
    type: [ tag.tagType ?? 'name' ],
    url: tag.meta.tagUrl,
    iconUrl: tag.meta.tagIcon,
    bgColor: tag.meta.bgColor,
    textColor: tag.meta.textColor,
    tooltipDescription: tag.meta.tooltipDescription,
  };
}

export function groupSubmitResult(data: FormSubmitResult | undefined): FormSubmitResultGrouped | undefined {
  if (!data) {
    return;
  }

  const _items: Array<FormSubmitResultItemGrouped> = [];

  // group by error and address
  for (const item of data) {
    const itemError = item.status === 'error' ? item.error : null;
    const existingItem = _items.find(({ error, addresses }) => error === itemError && addresses.length === 1 && addresses[0] === item.payload.address);
    if (existingItem) {
      existingItem.tags.push({ name: item.payload.name, tagType: item.payload.tagType, meta: item.payload.meta });
      continue;
    }

    _items.push({
      error: itemError,
      addresses: [ item.payload.address ],
      tags: [ { name: item.payload.name, tagType: item.payload.tagType, meta: item.payload.meta } ],
    });
  }

  const items: Array<FormSubmitResultItemGrouped> = [];

  // merge items with the same error and tags
  for (const item of _items) {
    const existingItem = items.find(({ error, tags }) => error === item.error && isEqual(tags, item.tags));
    if (existingItem) {
      existingItem.addresses.push(...item.addresses);
      continue;
    }

    items.push(item);
  }

  return {
    requesterName: data[0].payload.requesterName,
    requesterEmail: data[0].payload.requesterEmail,
    companyName: data[0].payload.companyName,
    companyWebsite: data[0].payload.companyWebsite,
    submissionType: data[0].payload.submissionType,
    items: items.sort((a, b) => {
      if (a.error && !b.error) {
        return 1;
      }
      if (!a.error && b.error) {
        return -1;
      }
      return 0;
    }),
  };
}

export function getFormDefaultValues(
  query: Route['query'],
  userInfo: UserInfo | undefined,
  retrySubmission?: SubmitRequestBody,
) {
  const updateTarget = getUpdateTarget(query);
  const matchingRetry = updateTarget &&
    retrySubmission?.submissionType === 'update' &&
    retrySubmission.address.toLowerCase() === updateTarget.address.toLowerCase() &&
    retrySubmission.name === updateTarget.label ?
    retrySubmission :
    undefined;

  return {
    addresses: updateTarget ? [ { hash: updateTarget.address } ] : getAddressesFromQuery(query),
    requesterName: matchingRetry?.requesterName || getQueryParamString(query?.requesterName) || userInfo?.nickname || userInfo?.name || undefined,
    requesterEmail: matchingRetry?.requesterEmail || getQueryParamString(query?.requesterEmail) || userInfo?.email || undefined,
    companyName: matchingRetry?.companyName ?? getQueryParamString(query?.companyName),
    companyWebsite: matchingRetry?.companyWebsite ?? getQueryParamString(query?.companyWebsite),
    // 'generic' is the first item in the curated Category Label
    // dropdown (PublicTagsSubmitFieldTagType.ALLOWED_CATEGORY_TYPES) —
    // any name-tag default would be rejected at validation since
    // 'name' is no longer offered to submitters.
    tags: [ {
      name: updateTarget?.label ?? '',
      type: [ updateTarget ? 'name' as const : 'generic' as const ],
      url: matchingRetry?.meta.tagUrl,
      iconUrl: matchingRetry?.meta.tagIcon,
      bgColor: matchingRetry?.meta.bgColor,
      textColor: matchingRetry?.meta.textColor,
      tooltipDescription: matchingRetry?.meta.tooltipDescription,
    } ],
  };
}

export function getPublicTagFormKey(query: Route['query']): string {
  const updateTarget = getUpdateTarget(query);

  if (!updateTarget) {
    return isUpdateMode(query) ? 'invalid-update' : 'create';
  }

  return JSON.stringify([
    'update',
    updateTarget.address.toLowerCase(),
    updateTarget.label,
  ]);
}

export function isUpdateMode(query: Route['query']): boolean {
  return getQueryParamString(query?.submissionType) === 'update';
}

export function getUpdateTarget(query: Route['query']): PublicTagUpdateTarget | undefined {
  if (!isUpdateMode(query)) {
    return;
  }

  const address = getQueryParamString(query?.address);
  const label = getQueryParamString(query?.tagLabel);

  if (!address || !label) {
    return;
  }

  return {
    address,
    label,
    displayName: getQueryParamString(query?.tagName) || label,
  };
}

function getAddressesFromQuery(query: Route['query']) {
  if (!query?.addresses) {
    return [ { hash: '' } ];
  }

  if (Array.isArray(query.addresses)) {
    return query.addresses.map((hash) => ({ hash }));
  }

  return [ { hash: query.addresses } ];
}
