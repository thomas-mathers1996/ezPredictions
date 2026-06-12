import {
  cacheHeader,
  createApiError,
  fetchTeamById,
  fetchTeamForm,
  getSingleQueryValue,
  sendJson,
} from './_footballData';
import type { ApiRequest, ApiResponse } from './_types';

const TEAM_FORM_CACHE = cacheHeader(60 * 60, 60 * 15);

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method && req.method !== 'GET') {
    sendJson(res, 405, createApiError('VALIDATION_ERROR', 'Only GET requests are supported.'), 'no-store');
    return;
  }

  const teamId = Number(getSingleQueryValue(req.query.teamId ?? req.query.id));

  if (!Number.isInteger(teamId) || teamId <= 0) {
    sendJson(res, 400, createApiError('VALIDATION_ERROR', 'A valid team ID is required.'), 'no-store');
    return;
  }

  const teamResult = await fetchTeamById(teamId);

  if (!teamResult.ok) {
    sendJson(res, teamResult.status, teamResult.error, 'no-store');
    return;
  }

  const formResult = await fetchTeamForm(teamResult.data);

  if (!formResult.ok) {
    sendJson(res, formResult.status, formResult.error, 'no-store');
    return;
  }

  if (formResult.data.matchesAnalysed === 0) {
    sendJson(res, 404, createApiError('NO_DATA', 'No recent matches are available for this team.'), 'no-store');
    return;
  }

  sendJson(res, 200, { ok: true, data: formResult.data }, TEAM_FORM_CACHE);
}
