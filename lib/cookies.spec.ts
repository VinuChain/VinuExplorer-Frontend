import { describe, it, expect, beforeEach, vi } from 'vitest';

import { NAMES, getDefaultAttributes, remove, set } from './cookies';

const { mockSet, mockRemove, appConfig } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockRemove: vi.fn(),
  appConfig: { protocol: 'https' as string | undefined },
}));

vi.mock('js-cookie', () => ({
  'default': { set: mockSet, remove: mockRemove, get: vi.fn() },
}));

vi.mock('configs/app', () => ({
  'default': { app: appConfig },
}));

describe('lib/cookies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appConfig.protocol = 'https';
  });

  describe('getDefaultAttributes', () => {
    it('sets Secure on https', () => {
      expect(getDefaultAttributes()).toEqual({ path: '/', secure: true });
    });

    it('does not set Secure on http (localhost dev)', () => {
      appConfig.protocol = 'http';
      expect(getDefaultAttributes()).toEqual({ path: '/', secure: false });
    });

    it('defaults to Secure when NEXT_PUBLIC_APP_PROTOCOL is unset', () => {
      appConfig.protocol = undefined;
      expect(getDefaultAttributes()).toEqual({ path: '/', secure: true });
    });
  });

  describe('set', () => {
    it('passes default attributes to js-cookie', () => {
      set(NAMES.TXS_SORT, 'value');
      expect(mockSet).toHaveBeenCalledWith(NAMES.TXS_SORT, 'value', { path: '/', secure: true });
    });

    it('keeps caller attributes and does not set Secure on http', () => {
      appConfig.protocol = 'http';
      set(NAMES.API_TOKEN, 'token', { expires: 1 });
      expect(mockSet).toHaveBeenCalledWith(NAMES.API_TOKEN, 'token', { path: '/', secure: false, expires: 1 });
    });
  });

  describe('remove', () => {
    it('passes default attributes to js-cookie', () => {
      remove(NAMES.API_TOKEN);
      expect(mockRemove).toHaveBeenCalledWith(NAMES.API_TOKEN, { path: '/', secure: true });
    });
  });
});
