import {
  cacheHeader,
  createApiError,
  createPredictionPayload,
  fetchStandings,
  fetchTeamById,
  fetchTeamForm,
  getSingleQueryValue,
  sendJson,
  withSafeJson,
} from '../src/server/footballData';
import type { ApiRequest, ApiResponse } from '../src/server/apiTypes';

const PREDICTION_DATA_CACHE = cacheHeader(60 * 10, 60 * 10);

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  await withSafeJson(async () => {
    if (req.method && req.method !== 'GET') {
      sendJson(res, 405, createApiError('VALIDATION_ERROR', 'Only GET requests are supported.'), 'no-store');
      return;
    }

    const homeTeamId = Number(getSingleQueryValue(req.query.homeTeamId));
    const awayTeamId = Number(getSingleQueryValue(req.query.awayTeamId));
    const competition = getSingleQueryValue(req.query.competition ?? req.query.competitionCode);

    if (!Number.isInteger(homeTeamId) || homeTeamId <= 0 || !Number.isInteger(awayTeamId) || awayTeamId <= 0) {
      sendJson(res, 400, createApiError('VALIDATION_ERROR', 'Valid homeTeamId and awayTeamId query parameters are required.'), 'no-store');
      return;
    }

    if (homeTeamId === awayTeamId) {
      sendJson(res, 400, createApiError('VALIDATION_ERROR', 'Home and away teams must be different.'), 'no-store');
      return;
    }

    if (competition && !/^[A-Za-z0-9_-]+$/.test(competition)) {
      sendJson(res, 400, createApiError('VALIDATION_ERROR', 'Competition must be a valid code or ID.'), 'no-store');
      return;
    }

    const [homeTeamResult, awayTeamResult] = await Promise.all([
      fetchTeamById(homeTeamId),
      fetchTeamById(awayTeamId),
    ]);

    if (!homeTeamResult.ok) {
      sendJson(res, homeTeamResult.status, homeTeamResult.error, 'no-store');
      return;
    }

    if (!awayTeamResult.ok) {
      sendJson(res, awayTeamResult.status, awayTeamResult.error, 'no-store');
      return;
    }

    const [homeFormResult, awayFormResult, standingsResult] = await Promise.all([
      fetchTeamForm(homeTeamResult.data),
      fetchTeamForm(awayTeamResult.data),
      fetchStandings(competition),
    ]);

    if (!homeFormResult.ok) {
      sendJson(res, homeFormResult.status, homeFormResult.error, 'no-store');
      return;
    }

    if (!awayFormResult.ok) {
      sendJson(res, awayFormResult.status, awayFormResult.error, 'no-store');
      return;
    }

    if (!standingsResult.ok) {
      sendJson(res, standingsResult.status, standingsResult.error, 'no-store');
      return;
    }

    if (homeFormResult.data.matchesAnalysed === 0 || awayFormResult.data.matchesAnalysed === 0) {
      sendJson(res, 404, createApiError('NO_DATA', 'No recent matches are available for one or both teams.'), 'no-store');
      return;
    }

    sendJson(
      res,
      200,
      {
        ok: true,
        data: createPredictionPayload(
          competition,
          homeTeamResult.data,
          awayTeamResult.data,
          homeFormResult.data,
          awayFormResult.data,
          standingsResult.data,
        ),
      },
      PREDICTION_DATA_CACHE,
    );
  }, res);
}
