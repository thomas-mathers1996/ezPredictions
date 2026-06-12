import {
  cacheHeader,
  footballDataFetch,
  mapCompetitionsResponse,
  sendJson,
  withSafeJson,
} from './_footballData';
import type { ApiRequest, ApiResponse } from './_types';

const COMPETITIONS_CACHE = cacheHeader(60 * 60 * 24, 60 * 60 * 6);

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  await withSafeJson(async () => {
    if (req.method && req.method !== 'GET') {
      sendJson(res, 405, {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Only GET requests are supported.',
        fallbackRecommended: true,
      }, 'no-store');
      return;
    }

    const result = await footballDataFetch('/competitions', mapCompetitionsResponse);

    if (!result.ok) {
      sendJson(res, result.status, result.error, 'no-store');
      return;
    }

    sendJson(res, 200, { ok: true, data: result.data }, COMPETITIONS_CACHE);
  }, res);
}
