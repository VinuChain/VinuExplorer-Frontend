import { compile } from 'path-to-regexp';

import type { ApiResource } from 'lib/api/types';
import type { ExternalChainExtended } from 'types/externalChains';

import config from 'configs/app';

import getResourceParams from './getResourceParams';
import isNeedProxy from './isNeedProxy';
import type { ResourceName, ResourcePathParams } from './resources';

function getOrigin(url: string | undefined) {
  if (!url) {
    return;
  }

  try {
    return new URL(url).origin;
  } catch {}
}

function getAppBaseUrl() {
  if (config.app.baseUrl) {
    return config.app.baseUrl;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
}

export function shouldProxyResource(apiEndpoint: string, resource: ApiResource, noProxy?: boolean): boolean {
  if (noProxy) {
    return false;
  }

  if (isNeedProxy()) {
    return true;
  }

  if (!resource.sessionAuth) {
    return false;
  }

  const appOrigin = getOrigin(getAppBaseUrl());
  const apiOrigin = getOrigin(apiEndpoint);

  return Boolean(appOrigin && apiOrigin && appOrigin !== apiOrigin);
}

export default function buildUrl<R extends ResourceName>(
  resourceFullName: R,
  pathParams?: ResourcePathParams<R>,
  queryParams?: Record<string, string | Array<string> | number | boolean | null | undefined>,
  noProxy?: boolean,
  chain?: ExternalChainExtended,
): string {
  const { api, resource } = getResourceParams(resourceFullName, chain);
  const shouldProxy = shouldProxyResource(api.endpoint, resource, noProxy);
  const baseUrl = shouldProxy ? getAppBaseUrl() : api.endpoint;
  const basePath = api.basePath ?? '';
  const path = shouldProxy ? '/node-api/proxy' + basePath + resource.path : basePath + resource.path;
  const url = new URL(compile(path)(pathParams), baseUrl);

  queryParams && Object.entries(queryParams).forEach(([ key, value ]) => {
    // there are some pagination params that can be null or false for the next page
    value !== undefined && value !== '' && url.searchParams.append(key, String(value));
  });

  return url.toString();
}
