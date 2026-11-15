import { describe, expect, it } from 'vitest';

import { withDefaultAddressRelation } from './lib';

const A = '0x1111111111111111111111111111111111111111';
const B = '0x2222222222222222222222222222222222222222';

describe('withDefaultAddressRelation', () => {
  it('defaults to AND when both from and to are set', () => {
    const r = withDefaultAddressRelation({ from_address_hashes_to_include: [ A ], to_address_hashes_to_include: [ B ] });
    expect(r.address_relation).toBe('and');
  });

  it('keeps an explicit choice', () => {
    const r = withDefaultAddressRelation({
      from_address_hashes_to_include: [ A ],
      to_address_hashes_to_include: [ B ],
      address_relation: 'or',
    });
    expect(r.address_relation).toBe('or');
  });

  it('leaves a single-sided filter alone', () => {
    expect(withDefaultAddressRelation({ to_address_hashes_to_include: [ B ] }).address_relation).toBeUndefined();
  });

  it('keeps OR for "involving X" links that pass the same address on both sides', () => {
    const r = withDefaultAddressRelation({ from_address_hashes_to_include: [ A ], to_address_hashes_to_include: [ A ] });
    expect(r.address_relation).toBeUndefined();
  });

  it('ignores exclude lists', () => {
    const r = withDefaultAddressRelation({ from_address_hashes_to_include: [ A ], to_address_hashes_to_exclude: [ B ] });
    expect(r.address_relation).toBeUndefined();
  });
});
