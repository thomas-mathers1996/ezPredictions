import {
  DataBackedPrediction,
  FallbackPrediction,
  PredictionDataPayload,
  TeamForm,
} from '../types/footballData';
import {
  GoalScore,
  OracleMetrics,
  PredictionResult,
  createPrediction,
  stableStringHash,
} from './prediction';

const MINIMUM_MATCHES_PER_TEAM = 3;

type WeightedInput = {
  value: number | null;
  weight: number;
};

type TeamStrength = {
  total: number;
  form: number;
  attack: number;
  defence: number;
  league: number | null;
  venue: number | null;
};

export function hasEnoughDataForPrediction(data: PredictionDataPayload): boolean {
  return (
    data.homeForm.matchesAnalysed >= MINIMUM_MATCHES_PER_TEAM &&
    data.awayForm.matchesAnalysed >= MINIMUM_MATCHES_PER_TEAM
  );
}

export function createDataBackedPrediction(data: PredictionDataPayload): DataBackedPrediction {
  if (!hasEnoughDataForPrediction(data)) {
    throw new Error('No recent matches available for a data backed prediction.');
  }

  const homeStrength = calculateTeamStrength(data.homeForm, data.standings?.home ?? null, data.standings?.totalTeams ?? null, 'home');
  const awayStrength = calculateTeamStrength(data.awayForm, data.standings?.away ?? null, data.standings?.totalTeams ?? null, 'away');
  const homeExpectedGoals = calculateExpectedGoals(
    data.homeForm.averageGoalsScored,
    data.awayForm.averageGoalsConceded,
    homeStrength.total - awayStrength.total,
    0.18,
  );
  const awayExpectedGoals = calculateExpectedGoals(
    data.awayForm.averageGoalsScored,
    data.homeForm.averageGoalsConceded,
    awayStrength.total - homeStrength.total,
    0,
  );
  let homeScore = toGoalScore(homeExpectedGoals);
  let awayScore = toGoalScore(awayExpectedGoals);

  if (homeScore === 0 && awayScore === 0) {
    if (homeExpectedGoals >= awayExpectedGoals) {
      homeScore = 1;
    } else {
      awayScore = 1;
    }
  }

  const outcome = getOutcome(homeScore, awayScore);
  const homeName = data.homeTeam.name;
  const awayName = data.awayTeam.name;
  const confidence = calculateConfidence(homeStrength.total, awayStrength.total, data.homeForm.matchesAnalysed, data.awayForm.matchesAnalysed);
  const seedInput = `data:${data.competition.code ?? data.competition.id ?? 'unknown'}|home:${data.homeTeam.id}|away:${data.awayTeam.id}|${data.homeForm.recentForm}|${data.awayForm.recentForm}|${homeScore}-${awayScore}`;

  return {
    homeTeam: homeName,
    awayTeam: awayName,
    normalizedHomeTeam: String(data.homeTeam.id),
    normalizedAwayTeam: String(data.awayTeam.id),
    seedInput,
    seed: stableStringHash(seedInput),
    homeScore,
    awayScore,
    outcome,
    outcomeLabel: createOutcomeLabel(outcome, homeName, awayName),
    confidence,
    metrics: createDramaticMetrics(homeStrength, awayStrength),
    analysisSentence: createDataAnalysisSentence(outcome, homeName, awayName, data),
    supportingStatistics: [
      {
        label: 'Recent Form Matrix',
        value: `${data.homeForm.recentForm} / ${data.awayForm.recentForm}`,
      },
      {
        label: 'Goal Probability Field',
        value: `${homeExpectedGoals.toFixed(1)} / ${awayExpectedGoals.toFixed(1)}`,
      },
      {
        label: 'Timeline Agreement',
        value: `${confidence}%`,
      },
    ],
    mode: 'data',
    dataDetails: {
      label: 'DATA BACKED ORACLE PREDICTION',
      competitionName: data.competition.name,
      matchesAnalysed: {
        home: data.homeForm.matchesAnalysed,
        away: data.awayForm.matchesAnalysed,
      },
      recentForm: {
        home: data.homeForm.recentForm,
        away: data.awayForm.recentForm,
      },
      averages: {
        homeScored: data.homeForm.averageGoalsScored,
        homeConceded: data.homeForm.averageGoalsConceded,
        awayScored: data.awayForm.averageGoalsScored,
        awayConceded: data.awayForm.averageGoalsConceded,
      },
      realMetrics: [
        {
          label: 'Home average goals scored',
          value: data.homeForm.averageGoalsScored.toFixed(2),
        },
        {
          label: 'Away average goals scored',
          value: data.awayForm.averageGoalsScored.toFixed(2),
        },
        {
          label: 'Home recent form',
          value: data.homeForm.recentForm,
        },
        {
          label: 'Away recent form',
          value: data.awayForm.recentForm,
        },
      ],
      entertainmentMetrics: [
        {
          label: 'Attacking Momentum',
          value: `${Math.round(((homeStrength.attack + awayStrength.attack) / 2) * 100)}%`,
        },
        {
          label: 'Defensive Structural Integrity',
          value: `${Math.round(((homeStrength.defence + awayStrength.defence) / 2) * 100)}%`,
        },
        {
          label: 'Home Turf Resonance',
          value: `${Math.round((homeStrength.venue ?? 0.5) * 100)}%`,
        },
      ],
    },
  };
}

export function createOracleFallbackPrediction(
  homeTeam: string,
  awayTeam: string,
  reason: string,
  competitionName: string | null = null,
): FallbackPrediction {
  const fallback = createPrediction(homeTeam, awayTeam);

  return {
    ...fallback,
    mode: 'fallback',
    outcomeLabel: fallback.outcomeLabel,
    analysisSentence: `${fallback.analysisSentence} Limited verified match data was available, so the Oracle used its deterministic fallback model.`,
    dataDetails: {
      label: 'ORACLE FALLBACK PREDICTION',
      competitionName,
      matchesAnalysed: {
        home: 0,
        away: 0,
      },
      recentForm: {
        home: 'Unavailable',
        away: 'Unavailable',
      },
      averages: {
        homeScored: 0,
        homeConceded: 0,
        awayScored: 0,
        awayConceded: 0,
      },
      realMetrics: [
        {
          label: 'Verified data status',
          value: 'Unavailable',
        },
      ],
      entertainmentMetrics: [
        {
          label: 'Algorithmic Octopus Adjustment',
          value: 'Fallback engaged',
        },
      ],
      fallbackReason: reason,
    },
  };
}

function calculateTeamStrength(
  form: TeamForm,
  standing: { position: number } | null,
  totalTeams: number | null,
  venue: 'home' | 'away',
): TeamStrength {
  const formScore = form.matchesAnalysed > 0 ? (form.wins * 3 + form.draws) / (form.matchesAnalysed * 3) : 0;
  const attackScore = clamp(form.averageGoalsScored / 3, 0, 1);
  const defenceScore = clamp(1 - form.averageGoalsConceded / 3, 0, 1);
  const leagueScore =
    standing && totalTeams && totalTeams > 1
      ? clamp(1 - (standing.position - 1) / (totalTeams - 1), 0, 1)
      : null;
  const venueForm = venue === 'home' ? form.homeResults : form.awayResults;
  const venueScore =
    venueForm.matches > 0 ? (venueForm.wins * 3 + venueForm.draws) / (venueForm.matches * 3) : null;

  return {
    total: weightedAverage([
      { value: formScore, weight: 30 },
      { value: attackScore, weight: 25 },
      { value: defenceScore, weight: 20 },
      { value: leagueScore, weight: 15 },
      { value: venueScore, weight: 10 },
    ]),
    form: formScore,
    attack: attackScore,
    defence: defenceScore,
    league: leagueScore,
    venue: venueScore,
  };
}

function weightedAverage(inputs: WeightedInput[]): number {
  const usableInputs = inputs.filter((input): input is { value: number; weight: number } => input.value !== null);
  const totalWeight = usableInputs.reduce((sum, input) => sum + input.weight, 0);

  if (totalWeight === 0) {
    return 0.5;
  }

  return usableInputs.reduce((sum, input) => sum + input.value * input.weight, 0) / totalWeight;
}

function calculateExpectedGoals(averageScored: number, opponentAverageConceded: number, strengthDelta: number, homeAdvantage: number): number {
  return clamp(averageScored * 0.58 + opponentAverageConceded * 0.42 + strengthDelta * 0.65 + homeAdvantage, 0, 3);
}

function toGoalScore(value: number): GoalScore {
  return Math.min(3, Math.max(0, Math.round(value))) as GoalScore;
}

function calculateConfidence(homeStrength: number, awayStrength: number, homeMatches: number, awayMatches: number): number {
  const dataDepth = Math.min(homeMatches, awayMatches, 10) / 10;
  const separation = Math.abs(homeStrength - awayStrength);

  return Math.round(clamp(56 + dataDepth * 19 + separation * 24, 52, 91));
}

function createDramaticMetrics(homeStrength: TeamStrength, awayStrength: TeamStrength): OracleMetrics {
  return {
    tacticalEntropy: Math.round((1 - Math.abs(homeStrength.total - awayStrength.total)) * 100),
    goalProbability: Math.round(((homeStrength.attack + awayStrength.attack) / 2) * 100),
    midfieldResonance: Math.round(((homeStrength.form + awayStrength.form) / 2) * 100),
    defensiveDensity: Math.round(((homeStrength.defence + awayStrength.defence) / 2) * 100),
    strikerConfidence: Math.round(Math.max(homeStrength.attack, awayStrength.attack) * 100),
    crowdPressure: Math.round((homeStrength.venue ?? 0.5) * 100),
    chaosCoefficient: Math.round((1 - Math.abs(homeStrength.total - awayStrength.total)) * 72),
    octopusCertainty: Math.round(clamp((homeStrength.league ?? awayStrength.league ?? 0.58) * 100, 32, 94)),
  };
}

function createDataAnalysisSentence(
  outcome: PredictionResult['outcome'],
  homeTeam: string,
  awayTeam: string,
  data: PredictionDataPayload,
): string {
  const competition = data.competition.name ? ` in ${data.competition.name}` : '';

  if (outcome === 'draw') {
    return `${homeTeam} and ${awayTeam} produced a balanced recent form matrix${competition}, so the Oracle foresees a stubborn draw.`;
  }

  const winner = outcome === 'home' ? homeTeam : awayTeam;
  const loser = outcome === 'home' ? awayTeam : homeTeam;
  return `${winner}'s recent goals and form profile outpaced ${loser}'s defensive resistance${competition}.`;
}

function createOutcomeLabel(outcome: PredictionResult['outcome'], homeTeam: string, awayTeam: string): string {
  if (outcome === 'home') {
    return `Predicted winner: ${homeTeam}`;
  }

  if (outcome === 'away') {
    return `Predicted winner: ${awayTeam}`;
  }

  return 'Predicted draw: recent data refuses to choose sides';
}

function getOutcome(homeScore: GoalScore, awayScore: GoalScore): PredictionResult['outcome'] {
  if (homeScore > awayScore) {
    return 'home';
  }

  if (awayScore > homeScore) {
    return 'away';
  }

  return 'draw';
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
