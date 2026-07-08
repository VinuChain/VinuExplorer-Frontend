import type { NextApiRequest, NextApiResponse } from 'next';

import { afterEach, describe, expect, it, vi } from 'vitest';

const collectDefaultMetrics = vi.hoisted(() => vi.fn());
const registryMetrics = vi.hoisted(() => vi.fn());

vi.mock('prom-client', () => ({
  collectDefaultMetrics,
  register: {
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
    metrics: registryMetrics,
  },
}));

type MockResponse = {
  body?: unknown;
  headers: Record<string, string | number | ReadonlyArray<string>>;
  send: (body: unknown) => MockResponse;
  setHeader: (name: string, value: string | number | ReadonlyArray<string>) => MockResponse;
  status: (statusCode: number) => MockResponse;
  statusCode: number;
};

function createResponse() {
  const res = {
    headers: {},
    statusCode: 200,
  } as MockResponse;

  res.setHeader = vi.fn((name: string, value: string | number | ReadonlyArray<string>) => {
    res.headers[name] = value;
    return res;
  });
  res.status = vi.fn((statusCode: number) => {
    res.statusCode = statusCode;
    return res;
  });
  res.send = vi.fn((body: unknown) => {
    res.body = body;
    return res;
  });

  return res;
}

async function loadHandler(enabled: boolean) {
  vi.resetModules();
  collectDefaultMetrics.mockClear();
  registryMetrics.mockReset();
  process.env.PROMETHEUS_METRICS_ENABLED = enabled ? 'true' : 'false';

  const metricsModule = await import('./metrics');
  return metricsModule.default;
}

afterEach(() => {
  delete process.env.PROMETHEUS_METRICS_ENABLED;
});

describe('/api/metrics', () => {
  it('returns Prometheus output with scrape-safe headers when enabled', async() => {
    const handler = await loadHandler(true);
    const res = createResponse();

    registryMetrics.mockResolvedValue('# HELP frontend_test_metric Test metric\nfrontend_test_metric 1\n');

    await handler({ method: 'GET' } as NextApiRequest, res as unknown as NextApiResponse);

    expect(collectDefaultMetrics).toHaveBeenCalledWith({ prefix: 'frontend_' });
    expect(registryMetrics).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.headers).toMatchObject({
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    });
    expect(res.body).toContain('frontend_test_metric 1');
  });

  it('returns an explicit disabled response without reading registry metrics', async() => {
    const handler = await loadHandler(false);
    const res = createResponse();

    await handler({ method: 'GET' } as NextApiRequest, res as unknown as NextApiResponse);

    expect(collectDefaultMetrics).not.toHaveBeenCalled();
    expect(registryMetrics).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
    expect(res.headers).toMatchObject({
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    });
    expect(res.body).toBe('Prometheus metrics are disabled');
  });

  it('rejects non-scrape methods before reading registry metrics', async() => {
    const handler = await loadHandler(true);
    const res = createResponse();

    await handler({ method: 'POST' } as NextApiRequest, res as unknown as NextApiResponse);

    expect(registryMetrics).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(405);
    expect(res.headers).toMatchObject({
      Allow: 'GET',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    });
    expect(res.body).toBe('Method Not Allowed');
  });
});
