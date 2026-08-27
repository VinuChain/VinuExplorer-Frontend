import type { IncomingMessage } from 'http';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import fetchApi, { getForwardedHeaders } from './fetchApi';

const nodeFetch = vi.hoisted(() => vi.fn());

vi.mock('node-fetch', () => ({
  'default': nodeFetch,
  AbortError: class AbortError extends Error {},
}));

vi.mock('nextjs/utils/logger', () => ({
  httpLogger: { logger: { info: vi.fn(), error: vi.fn() } },
}));

function createRequest(headers: Record<string, string>, remoteAddress?: string) {
  return { headers, socket: { remoteAddress } } as unknown as IncomingMessage;
}

describe('getForwardedHeaders()', () => {
  it('forwards the ingress-provided X-Real-IP plus the socket address', () => {
    const headers = getForwardedHeaders(createRequest({ 'x-real-ip': '203.0.113.7' }, '::ffff:127.0.0.1'));

    expect(headers).toEqual({ 'x-forwarded-for': '203.0.113.7, 127.0.0.1' });
  });

  it('ignores the caller-controlled X-Forwarded-For chain', () => {
    const headers = getForwardedHeaders(
      createRequest({ 'x-forwarded-for': '198.51.100.1, 10.0.0.2', 'x-real-ip': '203.0.113.7' }, '127.0.0.1'),
    );

    expect(headers).toEqual({ 'x-forwarded-for': '203.0.113.7, 127.0.0.1' });
  });

  it('starts the chain from the socket address when there is no incoming header', () => {
    expect(getForwardedHeaders(createRequest({}, '198.51.100.9'))).toEqual({ 'x-forwarded-for': '198.51.100.9' });
  });

  it('sends nothing when no address is known', () => {
    expect(getForwardedHeaders(createRequest({}))).toEqual({});
  });
});

describe('fetchApi()', () => {
  beforeEach(() => {
    nodeFetch.mockReset();
    nodeFetch.mockResolvedValue({ status: 200, json: async() => ({ backend_version: '1.0.0' }) });
  });

  it('forwards the client ip chain to the API', async() => {
    const req = createRequest({ 'x-real-ip': '203.0.113.7' }, '127.0.0.1');

    const data = await fetchApi({ resource: 'general:config_backend_version', req });

    const [ url, init ] = nodeFetch.mock.calls[0];
    expect(url).toBe('https://localhost:3003/api/v2/config/backend-version');
    expect(init.headers).toEqual({ 'x-forwarded-for': '203.0.113.7, 127.0.0.1' });
    expect(data).toEqual({ backend_version: '1.0.0' });
  });
});
