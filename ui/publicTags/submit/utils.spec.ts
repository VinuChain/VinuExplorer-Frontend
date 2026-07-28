import { describe, it, expect } from 'vitest';

import * as mocks from './mocks';
import {
  convertFormDataToRequestsBody,
  convertTagApiFieldsToFormFields,
  convertUpdateFormDataToRequestBody,
  getFormDefaultValues,
  getPublicTagFormKey,
  getUpdateTarget,
  groupSubmitResult,
} from './utils';

describe('function convertFormDataToRequestsBody()', () => {
  it('should convert form data to requests body', () => {
    const formData = {
      ...mocks.baseFields,
      addresses: [ { hash: mocks.address1 }, { hash: mocks.address2 } ],
      tags: [ convertTagApiFieldsToFormFields(mocks.tag1), convertTagApiFieldsToFormFields(mocks.tag2) ],
    };
    const result = convertFormDataToRequestsBody(formData);
    expect(result).toMatchObject([
      { address: mocks.address1, name: mocks.tag1.name, tagType: mocks.tag1.tagType },
      { address: mocks.address1, name: mocks.tag2.name, tagType: mocks.tag2.tagType },
      { address: mocks.address2, name: mocks.tag1.name, tagType: mocks.tag1.tagType },
      { address: mocks.address2, name: mocks.tag2.name, tagType: mocks.tag2.tagType },
    ]);
  });
});

describe('function convertUpdateFormDataToRequestBody()', () => {
  it('locks identity and sends only nonblank visual changes', () => {
    const formData = {
      ...mocks.baseFields,
      addresses: [ { hash: '0xattacker' } ],
      tags: [ {
        name: 'Retargeted name',
        type: [ 'protocol' as const ],
        url: '   ',
        iconUrl: 'https://assets.example/new-icon.png',
        bgColor: undefined,
        textColor: '#123456',
        tooltipDescription: '',
      } ],
    };

    const result = convertUpdateFormDataToRequestBody(formData, {
      address: mocks.address1,
      label: 'canonical-tag-label',
      displayName: 'Canonical tag',
    });

    expect(result).toEqual({
      requesterName: mocks.baseFields.requesterName,
      requesterEmail: mocks.baseFields.requesterEmail,
      companyName: mocks.baseFields.companyName,
      companyWebsite: mocks.baseFields.companyWebsite,
      address: mocks.address1,
      name: 'canonical-tag-label',
      submissionType: 'update',
      meta: {
        tagIcon: 'https://assets.example/new-icon.png',
        textColor: '#123456',
      },
    });
    expect(result).not.toHaveProperty('tagType');
    expect(result).not.toHaveProperty('description');
  });
});

describe('function getUpdateTarget()', () => {
  it('preserves the exact tag label and address from the action link', () => {
    expect(getUpdateTarget({
      submissionType: 'update',
      address: mocks.address1,
      tagLabel: 'vir-official',
      tagName: 'Vinu Republic',
    })).toEqual({
      address: mocks.address1,
      label: 'vir-official',
      displayName: 'Vinu Republic',
    });
  });

  it('rejects incomplete update links', () => {
    expect(getUpdateTarget({ submissionType: 'update', address: mocks.address1 })).toBeUndefined();
  });
});

describe('function getFormDefaultValues()', () => {
  const updateQuery = {
    submissionType: 'update',
    address: mocks.address1,
    tagLabel: 'vir-official',
    tagName: 'Vinu Republic',
  };
  const retrySubmission = {
    requesterName: 'Retry Person',
    requesterEmail: 'retry@example.com',
    companyName: 'Retry Co',
    companyWebsite: 'https://retry.example',
    address: mocks.address1,
    name: 'vir-official',
    submissionType: 'update' as const,
    meta: {
      tagUrl: 'https://vir.example',
      tagIcon: 'https://vir.example/icon.png',
      bgColor: '#112233',
      textColor: '#fefefe',
      tooltipDescription: 'VIR retry',
    },
  };

  it('restores a failed update from memory without making the target editable', () => {
    expect(getFormDefaultValues(updateQuery, undefined, retrySubmission)).toMatchObject({
      addresses: [ { hash: mocks.address1 } ],
      requesterName: 'Retry Person',
      requesterEmail: 'retry@example.com',
      companyName: 'Retry Co',
      companyWebsite: 'https://retry.example',
      tags: [ {
        name: 'vir-official',
        type: [ 'name' ],
        url: 'https://vir.example',
        iconUrl: 'https://vir.example/icon.png',
        bgColor: '#112233',
        textColor: '#fefefe',
        tooltipDescription: 'VIR retry',
      } ],
    });
  });

  it('does not carry a failed update into a different immutable target', () => {
    const defaults = getFormDefaultValues({
      ...updateQuery,
      address: mocks.address2,
      tagLabel: 'another-tag',
      tagName: 'Another tag',
    }, undefined, retrySubmission);

    expect(defaults.requesterName).toBeUndefined();
    expect(defaults.addresses).toEqual([ { hash: mocks.address2 } ]);
    expect(defaults.tags).toEqual([ {
      name: 'another-tag',
      type: [ 'name' ],
      url: undefined,
      iconUrl: undefined,
      bgColor: undefined,
      textColor: undefined,
      tooltipDescription: undefined,
    } ]);
  });
});

describe('function getPublicTagFormKey()', () => {
  it('remounts when mode or immutable update target changes', () => {
    const createKey = getPublicTagFormKey({});
    const firstUpdateKey = getPublicTagFormKey({
      submissionType: 'update',
      address: mocks.address1,
      tagLabel: 'vir-official',
      tagName: 'Vinu Republic',
    });
    const secondUpdateKey = getPublicTagFormKey({
      submissionType: 'update',
      address: mocks.address2,
      tagLabel: 'another-tag',
      tagName: 'Another tag',
    });

    expect(createKey).not.toBe(firstUpdateKey);
    expect(firstUpdateKey).not.toBe(secondUpdateKey);
  });

  it('does not remount when only the cosmetic display name changes', () => {
    const friendlyNameKey = getPublicTagFormKey({
      submissionType: 'update',
      address: mocks.address1,
      tagLabel: 'vir-official',
      tagName: 'Vinu Republic',
    });
    const labelFallbackKey = getPublicTagFormKey({
      submissionType: 'update',
      address: mocks.address1,
      tagLabel: 'vir-official',
      tagName: 'vir-official',
    });

    expect(friendlyNameKey).toBe(labelFallbackKey);
  });
});

describe('function groupSubmitResult()', () => {
  it('group success result', () => {
    const result = groupSubmitResult(mocks.allSuccessResponses);
    expect(result).toMatchObject({
      requesterName: mocks.baseFields.requesterName,
      requesterEmail: mocks.baseFields.requesterEmail,
      companyName: mocks.baseFields.companyName,
      companyWebsite: mocks.baseFields.companyWebsite,
      items: [
        {
          error: null,
          addresses: [ mocks.address1, mocks.address2, mocks.address3, mocks.address4, mocks.address5 ],
          tags: [ mocks.tag1, mocks.tag2, mocks.tag3 ],
        },
      ],
    });
  });

  it('group result with error', () => {
    const result = groupSubmitResult(mocks.mixedResponses);
    expect(result).toMatchObject({
      requesterName: mocks.baseFields.requesterName,
      requesterEmail: mocks.baseFields.requesterEmail,
      companyName: mocks.baseFields.companyName,
      companyWebsite: mocks.baseFields.companyWebsite,
      items: [
        {
          error: null,
          addresses: [ mocks.address1 ],
          tags: [ mocks.tag1 ],
        },
        {
          error: null,
          addresses: [ mocks.address3 ],
          tags: [ mocks.tag3 ],
        },
        {
          error: 'Some error',
          addresses: [ mocks.address1, mocks.address2 ],
          tags: [ mocks.tag2, mocks.tag3 ],
        },
        {
          error: 'Some error',
          addresses: [ mocks.address3 ],
          tags: [ mocks.tag1 ],
        },
        {
          error: 'Another nasty error',
          addresses: [ mocks.address3 ],
          tags: [ mocks.tag2 ],
        },
      ],
    });
  });
});
