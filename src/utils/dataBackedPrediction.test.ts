import { describe, expect, it } from 'vitest';
import { PredictionDataPayload, TeamForm } from '../types/footballData';
import {
  createDataBackedPrediction,
  createOracleFallbackPrediction,
  hasEnoughDataForPrediction,
} from './dataBackedPrediction';

const baseForm: TeamForm = {
  teamId: 1,
  teamName: 'Home FC',
  matchesAnalysed: 5,
  wins: 3,
  draws: 1,
  losses: 1,
  goalsScored: 8,
  goalsConceded: 5,
  averageGoalsScored: 1.6,
  averageGoalsConceded: 1,
  recentForm: 'WWDLW',
  homeResults: {
    matches: 3,
    wins: 2,
    draws: 1,
    losses: 0,
    goalsScored: 5,
    goalsConceded: 2,
  },
  awayResults: {
    matches: 2,
    wins: 1,
    draws: 0,
    losses: 1,
    goalsScored: 3,
    goalsConceded: 3,
  },
};

function makePayload(overrides: Partial<PredictionDataPayload> = {}): PredictionDataPayload {
  return {
    competition: {
      id: 2021,
      code: 'PL',
      name: 'Premier League',
    },
    homeTeam: {
      id: 1,
      name: 'Home FC',
      shortName: 'Home',
      tla: 'HOM',
      crest: null,
      areaName: 'England',
    },
    awayTeam: {
      id: 2,
      name: 'Away FC',
      shortName: 'Away',
      tla: 'AWY',
      crest: null,
      areaName: 'England',
    },
    homeForm: baseForm,
    awayForm: {
      ...baseForm,
      teamId: 2,
      teamName: 'Away FC',
      wins: 2,
      draws: 2,
      losses: 1,
      goalsScored: 7,
      goalsConceded: 6,
      averageGoalsScored: 1.4,
      averageGoalsConceded: 1.2,
      recentForm: 'DWWLD',
      homeResults: {
        matches: 2,
        wins: 1,
        draws: 1,
        losses: 0,
        goalsScored: 3,
        goalsConceded: 2,
      },
      awayResults: {
        matches: 3,
        wins: 1,
        draws: 1,
        losses: 1,
        goalsScored: 4,
        goalsConceded: 4,
      },
    },
    standings: {
      totalTeams: 20,
      home: {
        teamId: 1,
        position: 4,
        points: 68,
        playedGames: 38,
      },
      away: {
        teamId: 2,
        position: 8,
        points: 55,
        playedGames: 38,
      },
    },
    ...overrides,
  };
}

describe('data backed prediction utility', () => {
  it('keeps data backed scores between 0 and 3', () => {
    const prediction = createDataBackedPrediction(makePayload());

    expect(prediction.homeScore).toBeGreaterThanOrEqual(0);
    expect(prediction.homeScore).toBeLessThanOrEqual(3);
    expect(prediction.awayScore).toBeGreaterThanOrEqual(0);
    expect(prediction.awayScore).toBeLessThanOrEqual(3);
    expect(prediction.mode).toBe('data');
  });

  it('is deterministic for the same underlying API information', () => {
    expect(createDataBackedPrediction(makePayload())).toEqual(createDataBackedPrediction(makePayload()));
  });

  it('does not guarantee a home win from home advantage', () => {
    const payload = makePayload({
      homeForm: {
        ...baseForm,
        wins: 1,
        draws: 0,
        losses: 4,
        goalsScored: 3,
        goalsConceded: 11,
        averageGoalsScored: 0.6,
        averageGoalsConceded: 2.2,
        recentForm: 'LLLLW',
      },
      awayForm: {
        ...baseForm,
        teamId: 2,
        teamName: 'Away FC',
        wins: 5,
        draws: 0,
        losses: 0,
        goalsScored: 12,
        goalsConceded: 2,
        averageGoalsScored: 2.4,
        averageGoalsConceded: 0.4,
        recentForm: 'WWWWW',
      },
      standings: null,
    });

    const prediction = createDataBackedPrediction(payload);

    expect(prediction.outcome).not.toBe('home');
  });

  it('works without standings data', () => {
    const prediction = createDataBackedPrediction(makePayload({ standings: null }));

    expect(prediction.mode).toBe('data');
    expect(prediction.dataDetails.competitionName).toBe('Premier League');
  });

  it('detects missing recent match data and creates fallback predictions', () => {
    const payload = makePayload({
      homeForm: {
        ...baseForm,
        matchesAnalysed: 0,
        recentForm: 'No recent matches',
      },
    });

    expect(hasEnoughDataForPrediction(payload)).toBe(false);
    expect(createOracleFallbackPrediction('Home FC', 'Away FC', 'No recent matches available.').mode).toBe('fallback');
  });
});
