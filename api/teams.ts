import {
  cacheHeader,
  createApiError,
  footballDataFetch,
  getSingleQueryValue,
  mapTeamsResponse,
  sendJson,
} from './_footballData';
import type { ApiRequest, ApiResponse } from './_types';

const TEAMS_CACHE = cacheHeader(60 * 60 * 24, 60 * 60 * 6);

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method && req.method !== 'GET') {
    sendJson(res, 405, createApiError('VALIDATION_ERROR', 'Only GET requests are supported.'), 'no-store');
    return;
  }

  const competition = getSingleQueryValue(req.query.competition ?? req.query.code ?? req.query.id);

  if (!competition || !/^[A-Za-z0-9_-]+$/.test(competition)) {
    sendJson(res, 400, createApiError('VALIDATION_ERROR', 'A valid competition code or ID is required.'), 'no-store');
    return;
  }

  const result = await footballDataFetch(`/competitions/${encodeURIComponent(competition)}/teams`, mapTeamsResponse);

  if (!result.ok) {
    sendJson(res, result.status, result.error, 'no-store');
    return;
  }

  sendJson(res, 200, { ok: true, data: result.data }, TEAMS_CACHE);
}
