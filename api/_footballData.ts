import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  FootballCompetition,
  FootballTeam,
  HomeAwayForm,
  PredictionDataPayload,
  RecentMatch,
  StandingsEntry,
  TeamForm,
} from '../src/types/footballData';
import type { ApiResponse } from './_types';

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';
const RECENT_MATCH_LIMIT = 10;

type Fetcher = typeof fetch;

type FootballDataResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      status: number;
      error: ApiErrorResponse;
    };

type ExternalCompetition = {
  id?: unknown;
  code?: unknown;
  name?: unknown;
  emblem?: unknown;
  area?: {
    name?: unknown;
  };
};

type ExternalTeam = {
  id?: unknown;
  name?: unknown;
  shortName?: unknown;
  tla?: unknown;
  crest?: unknown;
  area?: {
    name?: unknown;
  };
};

type ExternalMatch = {
  id?: unknown;
  utcDate?: unknown;
  status?: unknown;
  competition?: {
    name?: unknown;
  };
  homeTeam?: {
    id?: unknown;
    name?: unknown;
  };
  awayTeam?: {
    id?: unknown;
    name?: unknown;
  };
  score?: {
    fullTime?: {
      home?: unknown;
      away?: unknown;
    };
  };
};

type ExternalStandingRow = {
  position?: unknown;
  team?: {
    id?: unknown;
  };
  points?: unknown;
  playedGames?: unknown;
};

export function sendJson<T>(res: ApiResponse, statusCode: number, body: ApiSuccessResponse<T> | ApiErrorResponse, cacheHeader: string): void {
  res.setHeader('Cache-Control', cacheHeader);
  res.status(statusCode).json(body);
}

export function cacheHeader(seconds: number, staleSeconds: number): string {
  return `public, s-maxage=${seconds}, stale-while-revalidate=${staleSeconds}`;
}

export async function footballDataFetch<T>(
  path: string,
  mapResponse: (payload: unknown) => T | null,
  fetcher: Fetcher = fetch,
): Promise<FootballDataResult<T>> {
  const token = process.env.FOOTBALL_DATA_API_KEY;

  if (!token) {
    return {
      ok: false,
      status: 503,
      error: createApiError('CONFIGURATION_ERROR', 'Football data is not configured. Oracle fallback is available.'),
    };
  }

  let response: Response;

  try {
    response = await fetcher(`${FOOTBALL_DATA_BASE_URL}${path}`, {
      headers: {
        'X-Auth-Token': token,
      },
    });
  } catch {
    return {
      ok: false,
      status: 502,
      error: createApiError('UPSTREAM_ERROR', 'Football data is unavailable. Oracle fallback is available.'),
    };
  }

  if (response.status === 429) {
    return {
      ok: false,
      status: 429,
      error: createApiError('RATE_LIMITED', 'Football data rate limit reached. Oracle fallback is available.'),
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status >= 500 ? 502 : response.status,
      error: createApiError('UPSTREAM_ERROR', 'Football data request failed. Oracle fallback is available.'),
    };
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      status: 502,
      error: createApiError('UNEXPECTED_RESPONSE', 'Football data returned an unexpected response. Oracle fallback is available.'),
    };
  }

  const mapped = mapResponse(payload);

  if (!mapped) {
    return {
      ok: false,
      status: 502,
      error: createApiError('UNEXPECTED_RESPONSE', 'Football data returned incomplete information. Oracle fallback is available.'),
    };
  }

  return {
    ok: true,
    data: mapped,
  };
}

export function createApiError(code: ApiErrorResponse['code'], message: string): ApiErrorResponse {
  return {
    ok: false,
    code,
    message,
    fallbackRecommended: true,
  };
}

export function getSingleQueryValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function mapCompetitionsResponse(payload: unknown): FootballCompetition[] | null {
  const competitions = getArray(payload, 'competitions');

  if (!competitions) {
    return null;
  }

  return competitions.map(mapCompetition).filter((competition): competition is FootballCompetition => Boolean(competition));
}

export function mapTeamsResponse(payload: unknown): FootballTeam[] | null {
  const teams = getArray(payload, 'teams');

  if (!teams) {
    return null;
  }

  return teams.map(mapTeam).filter((team): team is FootballTeam => Boolean(team));
}

export function mapMatchesResponse(teamId: number, teamName: string, payload: unknown): TeamForm | null {
  const matches = getArray(payload, 'matches');

  if (!matches) {
    return null;
  }

  const recentMatches = matches
    .map(mapMatch)
    .filter((match): match is RecentMatch => Boolean(match))
    .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)
    .slice(0, RECENT_MATCH_LIMIT);

  return calculateTeamForm(teamId, teamName, recentMatches);
}

export function mapStandingsResponse(payload: unknown): StandingsEntry[] | null {
  if (!isRecord(payload) || !Array.isArray(payload.standings)) {
    return null;
  }

  const table = payload.standings
    .flatMap((standing) => (isRecord(standing) && Array.isArray(standing.table) ? standing.table : []))
    .map(mapStandingRow)
    .filter((row): row is StandingsEntry => Boolean(row));

  return table;
}

export function calculateTeamForm(teamId: number, teamName: string, matches: RecentMatch[]): TeamForm {
  const baseHomeAway: HomeAwayForm = {
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsScored: 0,
    goalsConceded: 0,
  };
  const homeResults = { ...baseHomeAway };
  const awayResults = { ...baseHomeAway };
  const results = {
    matchesAnalysed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsScored: 0,
    goalsConceded: 0,
    recentForm: '',
  };

  for (const match of matches) {
    const isHome = match.homeTeamId === teamId;
    const goalsFor = isHome ? match.homeGoals : match.awayGoals;
    const goalsAgainst = isHome ? match.awayGoals : match.homeGoals;
    const venueResults = isHome ? homeResults : awayResults;

    results.matchesAnalysed += 1;
    results.goalsScored += goalsFor;
    results.goalsConceded += goalsAgainst;
    venueResults.matches += 1;
    venueResults.goalsScored += goalsFor;
    venueResults.goalsConceded += goalsAgainst;

    if (goalsFor > goalsAgainst) {
      results.wins += 1;
      venueResults.wins += 1;
      results.recentForm += 'W';
    } else if (goalsFor < goalsAgainst) {
      results.losses += 1;
      venueResults.losses += 1;
      results.recentForm += 'L';
    } else {
      results.draws += 1;
      venueResults.draws += 1;
      results.recentForm += 'D';
    }
  }

  return {
    teamId,
    teamName,
    matchesAnalysed: results.matchesAnalysed,
    wins: results.wins,
    draws: results.draws,
    losses: results.losses,
    goalsScored: results.goalsScored,
    goalsConceded: results.goalsConceded,
    averageGoalsScored: average(results.goalsScored, results.matchesAnalysed),
    averageGoalsConceded: average(results.goalsConceded, results.matchesAnalysed),
    recentForm: results.recentForm || 'No recent matches',
    homeResults,
    awayResults,
  };
}

export async function fetchTeamForm(team: FootballTeam, fetcher: Fetcher = fetch): Promise<FootballDataResult<TeamForm>> {
  return footballDataFetch(
    `/teams/${team.id}/matches?status=FINISHED&limit=${RECENT_MATCH_LIMIT}`,
    (payload) => mapMatchesResponse(team.id, team.name, payload),
    fetcher,
  );
}

export async function fetchTeamById(teamId: number, fetcher: Fetcher = fetch): Promise<FootballDataResult<FootballTeam>> {
  return footballDataFetch(`/teams/${teamId}`, mapTeam, fetcher);
}

export async function fetchStandings(
  competition: string | null,
  fetcher: Fetcher = fetch,
): Promise<FootballDataResult<StandingsEntry[] | null>> {
  if (!competition) {
    return {
      ok: true,
      data: null,
    };
  }

  const result = await footballDataFetch(`/competitions/${encodeURIComponent(competition)}/standings`, mapStandingsResponse, fetcher);

  if (!result.ok && result.status === 404) {
    return {
      ok: true,
      data: null,
    };
  }

  return result;
}

export function createPredictionPayload(
  competition: string | null,
  homeTeam: FootballTeam,
  awayTeam: FootballTeam,
  homeForm: TeamForm,
  awayForm: TeamForm,
  standings: StandingsEntry[] | null,
): PredictionDataPayload {
  const homeStanding = standings?.find((entry) => entry.teamId === homeTeam.id) ?? null;
  const awayStanding = standings?.find((entry) => entry.teamId === awayTeam.id) ?? null;

  return {
    competition: {
      id: numberOrNull(competition),
      code: competition && Number.isNaN(Number(competition)) ? competition : null,
      name: competition,
    },
    homeTeam,
    awayTeam,
    homeForm,
    awayForm,
    standings: standings
      ? {
          totalTeams: standings.length,
          home: homeStanding,
          away: awayStanding,
        }
      : null,
  };
}

function mapCompetition(competition: unknown): FootballCompetition | null {
  if (!isRecord(competition)) {
    return null;
  }

  const candidate = competition as ExternalCompetition;
  const id = numberOrNull(candidate.id);
  const name = stringOrNull(candidate.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    code: stringOrNull(candidate.code) ?? String(id),
    name,
    emblem: stringOrNull(candidate.emblem),
    areaName: isRecord(candidate.area) ? stringOrNull(candidate.area.name) ?? 'Unknown area' : 'Unknown area',
  };
}

function mapTeam(team: unknown): FootballTeam | null {
  if (!isRecord(team)) {
    return null;
  }

  const candidate = team as ExternalTeam;
  const id = numberOrNull(candidate.id);
  const name = stringOrNull(candidate.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    shortName: stringOrNull(candidate.shortName) ?? name,
    tla: stringOrNull(candidate.tla),
    crest: stringOrNull(candidate.crest),
    areaName: isRecord(candidate.area) ? stringOrNull(candidate.area.name) ?? 'Unknown area' : 'Unknown area',
  };
}

function mapMatch(match: unknown): RecentMatch | null {
  if (!isRecord(match)) {
    return null;
  }

  const candidate = match as ExternalMatch;
  const id = numberOrNull(candidate.id);
  const utcDate = stringOrNull(candidate.utcDate);
  const homeTeam = isRecord(candidate.homeTeam) ? candidate.homeTeam : null;
  const awayTeam = isRecord(candidate.awayTeam) ? candidate.awayTeam : null;
  const fullTime = isRecord(candidate.score?.fullTime) ? candidate.score.fullTime : null;
  const homeTeamId = numberOrNull(homeTeam?.id);
  const awayTeamId = numberOrNull(awayTeam?.id);
  const homeTeamName = stringOrNull(homeTeam?.name);
  const awayTeamName = stringOrNull(awayTeam?.name);
  const homeGoals = numberOrNull(fullTime?.home);
  const awayGoals = numberOrNull(fullTime?.away);

  if (!id || !utcDate || !homeTeamId || !awayTeamId || !homeTeamName || !awayTeamName || homeGoals === null || awayGoals === null) {
    return null;
  }

  return {
    id,
    utcDate,
    competitionName: isRecord(candidate.competition) ? stringOrNull(candidate.competition.name) : null,
    homeTeamId,
    homeTeamName,
    awayTeamId,
    awayTeamName,
    homeGoals,
    awayGoals,
  };
}

function mapStandingRow(row: unknown): StandingsEntry | null {
  if (!isRecord(row)) {
    return null;
  }

  const candidate = row as ExternalStandingRow;
  const team = isRecord(candidate.team) ? candidate.team : null;
  const teamId = numberOrNull(team?.id);
  const position = numberOrNull(candidate.position);
  const points = numberOrNull(candidate.points);
  const playedGames = numberOrNull(candidate.playedGames);

  if (!teamId || !position || points === null || playedGames === null) {
    return null;
  }

  return {
    teamId,
    position,
    points,
    playedGames,
  };
}

function getArray(payload: unknown, key: string): unknown[] | null {
  if (!isRecord(payload) || !Array.isArray(payload[key])) {
    return null;
  }

  return payload[key];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function average(total: number, count: number): number {
  return count > 0 ? Number((total / count).toFixed(2)) : 0;
}
