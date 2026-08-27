import { pick, pickBy } from 'es-toolkit';
import type { NextApiRequest, NextApiResponse } from 'next';

import fetchFactory from 'nextjs/utils/fetchProxy';

import appConfig from 'configs/app';
import multichainConfig from 'configs/multichain';

function toOrigin(endpoint: string | undefined) {
  try {
    return endpoint ? new URL(endpoint).origin : undefined;
  } catch {
    return;
  }
}

// SSRF guard: the target host comes from the caller-controlled "x-endpoint" header (or a protocol-relative path),
// so the proxy only forwards to origins that are present in the server-side config
export function getAllowedOrigins(): Set<string> {
  const apis = [ appConfig.apis, ...(multichainConfig()?.chains ?? []).map((chain) => chain.app_config.apis) ];
  const origins = apis
    .flatMap((item) => Object.values(item))
    .map((api) => toOrigin(api?.endpoint))
    .filter((origin): origin is string => Boolean(origin));

  return new Set(origins);
}

const handler = async(nextReq: NextApiRequest, nextRes: NextApiResponse) => {
  if (!nextReq.url) {
    nextRes.status(500).json({ error: 'no url provided' });
    return;
  }

  const url = (() => {
    try {
      return new URL(
        nextReq.url.replace(/^\/node-api\/proxy/, ''),
        nextReq.headers['x-endpoint']?.toString() || appConfig.apis.general?.endpoint,
      );
    } catch {
      return;
    }
  })();

  if (!url || !getAllowedOrigins().has(url.origin)) {
    nextRes.status(400).json({ error: 'Requested endpoint is not allowed' });
    return;
  }

  const apiRes = await fetchFactory(nextReq)(
    url.toString(),
    pickBy(pick(nextReq, [ 'body', 'method' ]), Boolean),
  );

  // proxy some headers from API
  const HEADERS_TO_PROXY = [
    'x-request-id',
    'content-type',
    'bypass-429-option',
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset',
    'api-v2-temp-token',
  ];

  HEADERS_TO_PROXY.forEach((header) => {
    const value = apiRes.headers.get(header);
    value && nextRes.setHeader(header, value);
  });

  const setCookie = apiRes.headers.raw()['set-cookie'];
  setCookie?.forEach((value) => {
    nextRes.appendHeader('set-cookie', value);
  });

  nextRes.status(apiRes.status).send(apiRes.body);
};

export default handler;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};
