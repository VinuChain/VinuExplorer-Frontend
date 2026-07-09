import type { NextApiRequest, NextApiResponse } from 'next';
import * as promClient from 'prom-client';

const isEnabled = process.env.PROMETHEUS_METRICS_ENABLED === 'true';

isEnabled && promClient.collectDefaultMetrics({ prefix: 'frontend_' });

export default async function metricsHandler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).send('Method Not Allowed');
    return;
  }

  if (!isEnabled) {
    res.status(404).send('Prometheus metrics are disabled');
    return;
  }

  const metrics = await promClient.register.metrics();
  res.setHeader('Content-Type', promClient.register.contentType);
  res.status(200).send(metrics);
}
