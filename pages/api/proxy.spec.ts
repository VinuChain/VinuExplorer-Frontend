import type { NextApiRequest, NextApiResponse } from 'next';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import handler, { getAllowedOrigins } from './proxy';

const upstreamFetch = vi.hoisted(() => vi.fn());

vi.mock('nextjs/utils/fetchProxy', () => ({
  'default': () => upstreamFetch,
}));

type MockResponse = {
  body?: unknown;
  statusCode: number;
  status: (statusCode: number) => MockResponse;
  json: (body: unknown) => MockResponse;
  send: (body: unknown) => MockResponse;
  setHeader: (name: string, value: string) => MockResponse;
  appendHeader: (name: string, value: string) => MockResponse;
};

function createResponse() {
  const res = { statusCode: 200 } as MockResponse;

  res.status = vi.fn((statusCode: number) => {
    res.statusCode = statusCode;
    return res;
  });
  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res;
  });
  res.send = vi.fn((body: unknown) => {
    res.body = body;
    return res;
  });
  res.setHeader = vi.fn(() => res);
  res.appendHeader = vi.fn(() => res);

  return res as unknown as NextApiResponse;
}

function createRequest(url: string, headers: Record<string, string> = {}) {
  return { url, method: 'GET', headers, cookies: {} } as unknown as NextApiRequest;
}

beforeEach(() => {
  upstreamFetch.mockReset();
  upstreamFetch.mockResolvedValue({
    status: 200,
    body: 'ok',
    headers: { get: () => null, raw: () => ({}) },
  });
});

describe('getAllowedOrigins()', () => {
  it('contains the configured API origins and nothing else', () => {
    const origins = getAllowedOrigins();

    expect(origins.has('https://localhost:3003')).toBe(true);
    expect(origins.has('https://localhost:3006')).toBe(true);
    expect(origins.has('https://mainnet.vinuexplorer.org')).toBe(false);
    expect(origins.has('http://169.254.169.254')).toBe(false);
  });
});

describe('/api/proxy', () => {
  it('rejects targets outside the configured API origins without fetching', async() => {
    const cases = [
      createRequest('/node-api/proxy/api/v2/stats', { 'x-endpoint': 'https://mainnet.vinuexplorer.org' }),
      createRequest('/node-api/proxy/api/v2/stats', { 'x-endpoint': 'http://169.254.169.254' }),
      createRequest('/node-api/proxy/api/v2/stats', { 'x-endpoint': 'not a url' }),
      createRequest('/node-api/proxy//evil.example/api/v2/stats'),
    ];

    for (const req of cases) {
      const res = createResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(400);
    }

    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('forwards to the general API when no x-endpoint is given', async() => {
    const res = createResponse();

    await handler(createRequest('/node-api/proxy/api/v2/stats'), res);

    expect(upstreamFetch.mock.calls[0][0]).toBe('https://localhost:3003/api/v2/stats');
    expect(res.statusCode).toBe(200);
  });

  it('forwards to another configured API when x-endpoint names it', async() => {
    const res = createResponse();

    await handler(createRequest('/node-api/proxy/api/v1/chains/1/metadata-submissions/tag/42', { 'x-endpoint': 'https://localhost:3006' }), res);

    expect(upstreamFetch.mock.calls[0][0]).toBe('https://localhost:3006/api/v1/chains/1/metadata-submissions/tag/42');
    expect(res.statusCode).toBe(200);
  });
});
