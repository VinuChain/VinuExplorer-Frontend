import { describe, it, expect } from 'vitest';

import * as mocks from './mocks';
import {
  convertFormDataToRequestsBody,
  convertTagApiFieldsToFormFields,
  convertUpdateFormDataToRequestBody,
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
