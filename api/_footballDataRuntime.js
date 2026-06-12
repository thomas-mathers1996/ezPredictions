const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';
const RECENT_MATCH_LIMIT = 10;

export function cacheHeader(seconds, staleSeconds) {
  return `public, s-maxage=${seconds}, stale-while-revalidate=${staleSeconds}`;
}

export function createApiError(code, message) {
  return {
    ok: false,
    code,
    message,
    fallbackRecommended: true,
  };
}

export function sendJson(res, statusCode, body, cacheControl) {
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (typeof res.status === 'function') {
    res.status(statusCode).json(body);
    return;
  }

  res.statusCode = statusCode;
  res.end(JSON.stringify(body));
}

export async function withSafeJson(handler, res) {
  try {
    await handler();
  } catch {
    sendJson(
      res,
      500,
      createApiError('UPSTREAM_ERROR', 'Football data API function failed safely. Oracle fallback is available.'),
      'no-store',
    );
  }
}

export function getSingleQueryValue(value) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function footballDataFetch(path, mapResponse, fetcher) {
  const token = process.env.FOOTBALL_DATA_API_KEY?.trim();

  if (!token) {
    return {
      ok: false,
      status: 503,
      error: createApiError('CONFIGURATION_ERROR', 'Football data is not configured. Oracle fallback is available.'),
    };
  }

  try {
    const activeFetcher = fetcher ?? globalThis.fetch?.bind(globalThis);

    if (!activeFetcher) {
      return {
        ok: false,
        status: 502,
        error: createApiError('UPSTREAM_ERROR', 'Football data runtime is unavailable. Oracle fallback is available.'),
      };
    }

    const response = await activeFetcher(`${FOOTBALL_DATA_BASE_URL}${path}`, {
      headers: {
        'X-Auth-Token': token,
        Accept: 'application/json',
      },
    });

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

    const payload = await response.json();
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
  } catch {
    return {
      ok: false,
      status: 502,
      error: createApiError('UPSTREAM_ERROR', 'Football data is unavailable. Oracle fallback is available.'),
    };
  }
}

export function mapCompetitionsResponse(payload) {
  const competitions = getArray(payload, 'competitions');
  return competitions ? competitions.map(mapCompetition).filter(Boolean) : null;
}

export function mapTeamsResponse(payload) {
  const teams = getArray(payload, 'teams');
  return teams ? teams.map(mapTeam).filter(Boolean) : null;
}

export function mapMatchesResponse(teamId, teamName, payload) {
  const matches = getArray(payload, 'matches');

  if (!matches) {
    return null;
  }

  const recentMatches = matches
    .map(mapMatch)
    .filter(Boolean)
    .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)
    .slice(0, RECENT_MATCH_LIMIT);

  return calculateTeamForm(teamId, teamName, recentMatches);
}

export function mapStandingsResponse(payload) {
  if (!isRecord(payload) || !Array.isArray(payload.standings)) {
    return null;
  }

  return payload.standings
    .flatMap((standing) => (isRecord(standing) && Array.isArray(standing.table) ? standing.table : []))
    .map(mapStandingRow)
    .filter(Boolean);
}

export function calculateTeamForm(teamId, teamName, matches) {
  const homeResults = createEmptyVenueForm();
  const awayResults = createEmptyVenueForm();
  const totals = {
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
    const venue = isHome ? homeResults : awayResults;

    totals.matchesAnalysed += 1;
    totals.goalsScored += goalsFor;
    totals.goalsConceded += goalsAgainst;
    venue.matches += 1;
    venue.goalsScored += goalsFor;
    venue.goalsConceded += goalsAgainst;

    if (goalsFor > goalsAgainst) {
      totals.wins += 1;
      venue.wins += 1;
      totals.recentForm += 'W';
    } else if (goalsFor < goalsAgainst) {
      totals.losses += 1;
      venue.losses += 1;
      totals.recentForm += 'L';
    } else {
      totals.draws += 1;
      venue.draws += 1;
      totals.recentForm += 'D';
    }
  }

  return {
    teamId,
    teamName,
    matchesAnalysed: totals.matchesAnalysed,
    wins: totals.wins,
    draws: totals.draws,
    losses: totals.losses,
    goalsScored: totals.goalsScored,
    goalsConceded: totals.goalsConceded,
    averageGoalsScored: average(totals.goalsScored, totals.matchesAnalysed),
    averageGoalsConceded: average(totals.goalsConceded, totals.matchesAnalysed),
    recentForm: totals.recentForm || 'No recent matches',
    homeResults,
    awayResults,
  };
}

export function fetchTeamById(teamId) {
  return footballDataFetch(`/teams/${teamId}`, mapTeam);
}

export function fetchTeamForm(team) {
  return footballDataFetch(
    `/teams/${team.id}/matches?status=FINISHED&limit=${RECENT_MATCH_LIMIT}`,
    (payload) => mapMatchesResponse(team.id, team.name, payload),
  );
}

export async function fetchStandings(competition) {
  if (!competition) {
    return {
      ok: true,
      data: null,
    };
  }

  const result = await footballDataFetch(`/competitions/${encodeURIComponent(competition)}/standings`, mapStandingsResponse);

  if (!result.ok && result.status === 404) {
    return {
      ok: true,
      data: null,
    };
  }

  return result;
}

export function createPredictionPayload(competition, homeTeam, awayTeam, homeForm, awayForm, standings) {
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

function mapCompetition(competition) {
  if (!isRecord(competition)) {
    return null;
  }

  const id = numberOrNull(competition.id);
  const name = stringOrNull(competition.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    code: stringOrNull(competition.code) ?? String(id),
    name,
    emblem: stringOrNull(competition.emblem),
    areaName: isRecord(competition.area) ? stringOrNull(competition.area.name) ?? 'Unknown area' : 'Unknown area',
  };
}

function mapTeam(team) {
  if (!isRecord(team)) {
    return null;
  }

  const id = numberOrNull(team.id);
  const name = stringOrNull(team.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    shortName: stringOrNull(team.shortName) ?? name,
    tla: stringOrNull(team.tla),
    crest: stringOrNull(team.crest),
    areaName: isRecord(team.area) ? stringOrNull(team.area.name) ?? 'Unknown area' : 'Unknown area',
  };
}

function mapMatch(match) {
  if (!isRecord(match)) {
    return null;
  }

  const homeTeam = isRecord(match.homeTeam) ? match.homeTeam : null;
  const awayTeam = isRecord(match.awayTeam) ? match.awayTeam : null;
  const fullTime = isRecord(match.score?.fullTime) ? match.score.fullTime : null;
  const id = numberOrNull(match.id);
  const utcDate = stringOrNull(match.utcDate);
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
    competitionName: isRecord(match.competition) ? stringOrNull(match.competition.name) : null,
    homeTeamId,
    homeTeamName,
    awayTeamId,
    awayTeamName,
    homeGoals,
    awayGoals,
  };
}

function mapStandingRow(row) {
  if (!isRecord(row)) {
    return null;
  }

  const teamId = isRecord(row.team) ? numberOrNull(row.team.id) : null;
  const position = numberOrNull(row.position);
  const points = numberOrNull(row.points);
  const playedGames = numberOrNull(row.playedGames);

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

function createEmptyVenueForm() {
  return {
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsScored: 0,
    goalsConceded: 0,
  };
}

function getArray(payload, key) {
  return isRecord(payload) && Array.isArray(payload[key]) ? payload[key] : null;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function stringOrNull(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function numberOrNull(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function average(total, count) {
  return count > 0 ? Number((total / count).toFixed(2)) : 0;
}
