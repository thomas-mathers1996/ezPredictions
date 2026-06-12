import {
  ApiErrorResponse,
  ApiSuccessResponse,
  FootballCompetition,
  FootballTeam,
  PredictionDataPayload,
  TeamForm,
} from '../types/footballData';

export class FootballDataClientError extends Error {
  readonly code: ApiErrorResponse['code'];
  readonly fallbackRecommended: boolean;

  constructor(error: ApiErrorResponse) {
    super(error.message);
    this.name = 'FootballDataClientError';
    this.code = error.code;
    this.fallbackRecommended = error.fallbackRecommended;
  }
}

export async function loadCompetitions(): Promise<FootballCompetition[]> {
  return requestApi<FootballCompetition[]>('/api/competitions');
}

export async function loadTeams(competition: string): Promise<FootballTeam[]> {
  return requestApi<FootballTeam[]>(`/api/teams?competition=${encodeURIComponent(competition)}`);
}

export async function loadTeamForm(teamId: number): Promise<TeamForm> {
  return requestApi<TeamForm>(`/api/team-form?teamId=${encodeURIComponent(String(teamId))}`);
}

export async function loadPredictionData(
  homeTeamId: number,
  awayTeamId: number,
  competition: string,
): Promise<PredictionDataPayload> {
  const params = new URLSearchParams({
    homeTeamId: String(homeTeamId),
    awayTeamId: String(awayTeamId),
    competition,
  });

  return requestApi<PredictionDataPayload>(`/api/prediction-data?${params.toString()}`);
}

async function requestApi<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch {
    throw new FootballDataClientError({
      ok: false,
      code: 'UPSTREAM_ERROR',
      message: 'Football data is unavailable. Oracle fallback is available.',
      fallbackRecommended: true,
    });
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new FootballDataClientError({
      ok: false,
      code: 'UNEXPECTED_RESPONSE',
      message: 'Unexpected response received. Oracle fallback is available.',
      fallbackRecommended: true,
    });
  }

  if (isApiErrorResponse(payload)) {
    throw new FootballDataClientError(payload);
  }

  if (!response.ok || !isApiSuccessResponse<T>(payload)) {
    throw new FootballDataClientError({
      ok: false,
      code: 'UNEXPECTED_RESPONSE',
      message: 'Unexpected response received. Oracle fallback is available.',
      fallbackRecommended: true,
    });
  }

  return payload.data;
}

function isApiSuccessResponse<T>(payload: unknown): payload is ApiSuccessResponse<T> {
  return isRecord(payload) && payload.ok === true && 'data' in payload;
}

function isApiErrorResponse(payload: unknown): payload is ApiErrorResponse {
  return (
    isRecord(payload) &&
    payload.ok === false &&
    typeof payload.code === 'string' &&
    typeof payload.message === 'string' &&
    payload.fallbackRecommended === true
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
