import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateTeamForm,
  footballDataFetch,
  mapCompetitionsResponse,
  mapMatchesResponse,
  mapStandingsResponse,
  mapTeamsResponse,
} from './_footballData';
import { RecentMatch } from '../src/types/footballData';

const matches: RecentMatch[] = [
  {
    id: 1,
    utcDate: '2026-01-01T00:00:00Z',
    competitionName: 'Test League',
    homeTeamId: 10,
    homeTeamName: 'Home FC',
    awayTeamId: 20,
    awayTeamName: 'Away FC',
    homeGoals: 2,
    awayGoals: 1,
  },
  {
    id: 2,
    utcDate: '2026-01-02T00:00:00Z',
    competitionName: 'Test League',
    homeTeamId: 30,
    homeTeamName: 'Other FC',
    awayTeamId: 10,
    awayTeamName: 'Home FC',
    homeGoals: 0,
    awayGoals: 0,
  },
  {
    id: 3,
    utcDate: '2026-01-03T00:00:00Z',
    competitionName: 'Test League',
    homeTeamId: 10,
    homeTeamName: 'Home FC',
    awayTeamId: 40,
    awayTeamName: 'Fourth FC',
    homeGoals: 1,
    awayGoals: 3,
  },
];

beforeEach(() => {
  vi.stubEnv('FOOTBALL_DATA_API_KEY', 'test-token');
});

describe('football-data API mapping utilities', () => {
  it('maps competitions to safe fields', () => {
    const mapped = mapCompetitionsResponse({
      competitions: [
        {
          id: 2021,
          code: 'PL',
          name: 'Premier League',
          emblem: 'https://example.com/pl.svg',
          area: { name: 'England' },
        },
      ],
    });

    expect(mapped).toEqual([
      {
        id: 2021,
        code: 'PL',
        name: 'Premier League',
        emblem: 'https://example.com/pl.svg',
        areaName: 'England',
      },
    ]);
  });

  it('maps teams and allows missing crest URLs', () => {
    const mapped = mapTeamsResponse({
      teams: [
        {
          id: 10,
          name: 'Home FC',
          shortName: 'Home',
          tla: 'HOM',
          area: { name: 'Korea Republic' },
        },
      ],
    });

    expect(mapped?.[0]).toMatchObject({
      id: 10,
      name: 'Home FC',
      shortName: 'Home',
      tla: 'HOM',
      crest: null,
      areaName: 'Korea Republic',
    });
  });

  it('calculates goals, conceded goals, form, and home/away records', () => {
    const form = calculateTeamForm(10, 'Home FC', matches);

    expect(form.matchesAnalysed).toBe(3);
    expect(form.wins).toBe(1);
    expect(form.draws).toBe(1);
    expect(form.losses).toBe(1);
    expect(form.goalsScored).toBe(3);
    expect(form.goalsConceded).toBe(4);
    expect(form.averageGoalsScored).toBe(1);
    expect(form.averageGoalsConceded).toBe(1.33);
    expect(form.recentForm).toBe('WDL');
    expect(form.homeResults.matches).toBe(2);
    expect(form.awayResults.matches).toBe(1);
  });

  it('maps recent matches into a team form response', () => {
    const form = mapMatchesResponse(10, 'Home FC', {
      matches: matches.map((match) => ({
        id: match.id,
        utcDate: match.utcDate,
        competition: { name: match.competitionName },
        homeTeam: { id: match.homeTeamId, name: match.homeTeamName },
        awayTeam: { id: match.awayTeamId, name: match.awayTeamName },
        score: { fullTime: { home: match.homeGoals, away: match.awayGoals } },
      })),
    });

    expect(form?.recentForm).toBe('WDL');
  });

  it('maps standings when available and handles missing standings data', () => {
    expect(mapStandingsResponse({ standings: [] })).toEqual([]);
    expect(
      mapStandingsResponse({
        standings: [
          {
            table: [
              {
                position: 1,
                team: { id: 10 },
                points: 80,
                playedGames: 38,
              },
            ],
          },
        ],
      }),
    ).toEqual([{ teamId: 10, position: 1, points: 80, playedGames: 38 }]);
  });

  it('handles football-data.org error responses and rate limits safely', async () => {
    const rateLimited = await footballDataFetch('/competitions', mapCompetitionsResponse, async () => new Response('{}', { status: 429 }));

    expect(rateLimited.ok).toBe(false);
    if (!rateLimited.ok) {
      expect(rateLimited.status).toBe(429);
      expect(rateLimited.error.code).toBe('RATE_LIMITED');
    }
  });

  it('handles missing environment variable without calling football-data.org', async () => {
    vi.stubEnv('FOOTBALL_DATA_API_KEY', '');
    const fetcher = vi.fn();
    const result = await footballDataFetch('/competitions', mapCompetitionsResponse, fetcher);

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFIGURATION_ERROR');
    }
  });

  it('handles a missing runtime fetch implementation safely', async () => {
    const originalFetch = globalThis.fetch;
    Reflect.deleteProperty(globalThis, 'fetch');

    try {
      const result = await footballDataFetch('/competitions', mapCompetitionsResponse);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UPSTREAM_ERROR');
        expect(result.error.message).toContain('runtime is unavailable');
      }
    } finally {
      Object.defineProperty(globalThis, 'fetch', {
        configurable: true,
        writable: true,
        value: originalFetch,
      });
    }
  });
});
