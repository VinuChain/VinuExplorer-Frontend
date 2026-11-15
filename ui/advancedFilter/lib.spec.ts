import { describe, expect, it } from 'vitest';

import { getColumnsFromQuery, getHiddenColumnsQuery, withDefaultAddressRelation } from './lib';

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

describe('column settings in the URL', () => {
  it('shows every column when the parameter is absent', () => {
    expect(Object.values(getColumnsFromQuery(undefined)).every(Boolean)).toBe(true);
  });

  it('hides the listed columns and ignores unknown ids', () => {
    const cols = getColumnsFromQuery('fee,method,nope');
    expect(cols.fee).toBe(false);
    expect(cols.method).toBe(false);
    expect(cols.age).toBe(true);
    expect('nope' in cols).toBe(false);
  });

  it('round-trips and omits the parameter when nothing is hidden', () => {
    expect(getHiddenColumnsQuery(getColumnsFromQuery('fee,method'))).toBe('method,fee');
    expect(getHiddenColumnsQuery(getColumnsFromQuery(undefined))).toBeUndefined();
  });
});
