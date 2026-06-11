export type GoalScore = 0 | 1 | 2 | 3;

export type OracleMetrics = {
  tacticalEntropy: number;
  goalProbability: number;
  midfieldResonance: number;
  defensiveDensity: number;
  strikerConfidence: number;
  crowdPressure: number;
  chaosCoefficient: number;
  octopusCertainty: number;
};

export type OracleStatistic = {
  label: string;
  value: string;
};

export type PredictionResult = {
  homeTeam: string;
  awayTeam: string;
  normalizedHomeTeam: string;
  normalizedAwayTeam: string;
  seedInput: string;
  seed: number;
  homeScore: GoalScore;
  awayScore: GoalScore;
  outcome: 'home' | 'away' | 'draw';
  outcomeLabel: string;
  confidence: number;
  metrics: OracleMetrics;
  analysisSentence: string;
  supportingStatistics: OracleStatistic[];
  mode: 'oracle' | 'chaos';
};

const PUNCTUATION_PATTERN = /[^\p{L}\p{N}\s]/gu;

export function formatTeamNameForDisplay(teamName: string): string {
  return teamName.trim().replace(/\s+/g, ' ');
}

export function normalizeTeamName(teamName: string): string {
  return formatTeamNameForDisplay(teamName)
    .toLowerCase()
    .replace(PUNCTUATION_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function areTeamsIdentical(homeTeam: string, awayTeam: string): boolean {
  const normalizedHome = normalizeTeamName(homeTeam);
  const normalizedAway = normalizeTeamName(awayTeam);

  return normalizedHome.length > 0 && normalizedHome === normalizedAway;
}

export function stableStringHash(input: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

export function createSeedInput(homeTeam: string, awayTeam: string): string {
  return `home:${normalizeTeamName(homeTeam)}|away:${normalizeTeamName(awayTeam)}`;
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function weightedScore(randomValue: number, advantage = 0): GoalScore {
  const adjustedValue = clamp(randomValue + advantage, 0, 0.999999);

  if (adjustedValue < 0.3) {
    return 0;
  }

  if (adjustedValue < 0.68) {
    return 1;
  }

  if (adjustedValue < 0.9) {
    return 2;
  }

  return 3;
}

function percentage(random: () => number, minimum: number, maximum: number): number {
  return Math.round(minimum + random() * (maximum - minimum));
}

function buildMetrics(random: () => number): OracleMetrics {
  return {
    tacticalEntropy: percentage(random, 31, 92),
    goalProbability: percentage(random, 37, 88),
    midfieldResonance: percentage(random, 28, 96),
    defensiveDensity: percentage(random, 33, 91),
    strikerConfidence: percentage(random, 26, 94),
    crowdPressure: percentage(random, 35, 98),
    chaosCoefficient: percentage(random, 12, 87),
    octopusCertainty: percentage(random, 51, 99),
  };
}

function outcomeFor(homeScore: GoalScore, awayScore: GoalScore): PredictionResult['outcome'] {
  if (homeScore > awayScore) {
    return 'home';
  }

  if (awayScore > homeScore) {
    return 'away';
  }

  return 'draw';
}

function createOutcomeLabel(
  outcome: PredictionResult['outcome'],
  homeTeam: string,
  awayTeam: string,
): string {
  if (outcome === 'home') {
    return `Predicted winner: ${homeTeam}`;
  }

  if (outcome === 'away') {
    return `Predicted winner: ${awayTeam}`;
  }

  return 'Predicted deadlock: probability refuses to choose sides';
}

function createAnalysisSentence(
  random: () => number,
  outcome: PredictionResult['outcome'],
  homeTeam: string,
  awayTeam: string,
): string {
  const homeAngles = [
    'midfield resonance',
    'touchline gravity',
    'continental momentum',
    'pressing geometry',
  ];
  const awayAngles = [
    'atmospheric momentum',
    'counter-attack voltage',
    'defensive density',
    'late-phase chaos',
  ];
  const verbs = ['overcame', 'neutralised', 'outlasted', 'bent'];
  const drawNouns = [
    'a perfectly symmetrical tactical fog',
    'mutual resistance in the probability field',
    'two timelines refusing to separate',
    'a deadlocked octopus consensus',
  ];

  const homeAngle = homeAngles[Math.floor(random() * homeAngles.length)];
  const awayAngle = awayAngles[Math.floor(random() * awayAngles.length)];
  const verb = verbs[Math.floor(random() * verbs.length)];

  if (outcome === 'home') {
    return `${homeTeam}'s superior ${homeAngle} ${verb} a dangerous surge in ${awayTeam}'s ${awayAngle}.`;
  }

  if (outcome === 'away') {
    return `${awayTeam}'s elevated ${awayAngle} ${verb} the home-side distortion surrounding ${homeTeam}'s ${homeAngle}.`;
  }

  const drawNoun = drawNouns[Math.floor(random() * drawNouns.length)];
  return `${homeTeam} and ${awayTeam} generated ${drawNoun}, leaving the Oracle no lawful winner to announce.`;
}

function createSupportingStatistics(
  random: () => number,
  outcome: PredictionResult['outcome'],
  homeTeam: string,
  awayTeam: string,
): OracleStatistic[] {
  const advantageTeam = outcome === 'away' ? awayTeam : homeTeam;
  const advantage = outcome === 'draw' ? '0%' : `${advantageTeam} +${percentage(random, 7, 24)}%`;
  const homePossession = percentage(random, 44, 58);
  const awayPossession = 100 - homePossession;

  return [
    {
      label: 'Tactical advantage',
      value: advantage,
    },
    {
      label: 'Expected possession',
      value: `${homePossession}% / ${awayPossession}%`,
    },
    {
      label: 'Timeline agreement',
      value: `${percentage(random, 61, 91)}%`,
    },
  ];
}

function createConfidence(random: () => number, homeScore: GoalScore, awayScore: GoalScore): number {
  const margin = Math.abs(homeScore - awayScore);
  const baseConfidence = percentage(random, 56, 86);
  const marginBonus = margin * 4;
  const drawPenalty = margin === 0 ? 4 : 0;

  return Math.round(clamp(baseConfidence + marginBonus - drawPenalty, 51, 96));
}

export function createPrediction(homeTeamInput: string, awayTeamInput: string): PredictionResult {
  const homeTeam = formatTeamNameForDisplay(homeTeamInput);
  const awayTeam = formatTeamNameForDisplay(awayTeamInput);
  const normalizedHomeTeam = normalizeTeamName(homeTeam);
  const normalizedAwayTeam = normalizeTeamName(awayTeam);

  if (!normalizedHomeTeam || !normalizedAwayTeam) {
    throw new Error('Both teams must be provided before consulting the Oracle.');
  }

  if (normalizedHomeTeam === normalizedAwayTeam) {
    throw new Error('The Oracle requires two different teams.');
  }

  const seedInput = createSeedInput(homeTeam, awayTeam);
  const seed = stableStringHash(seedInput);
  const random = createSeededRandom(seed);
  let homeScore = weightedScore(random(), 0.035);
  let awayScore = weightedScore(random(), -0.005);

  if (homeScore === 0 && awayScore === 0) {
    const drawCorrection = random();

    if (drawCorrection < 0.52) {
      homeScore = 1;
    } else if (drawCorrection < 0.78) {
      awayScore = 1;
    }
  }

  const metrics = buildMetrics(random);
  const outcome = outcomeFor(homeScore, awayScore);

  return {
    homeTeam,
    awayTeam,
    normalizedHomeTeam,
    normalizedAwayTeam,
    seedInput,
    seed,
    homeScore,
    awayScore,
    outcome,
    outcomeLabel: createOutcomeLabel(outcome, homeTeam, awayTeam),
    confidence: createConfidence(random, homeScore, awayScore),
    metrics,
    analysisSentence: createAnalysisSentence(random, outcome, homeTeam, awayTeam),
    supportingStatistics: createSupportingStatistics(random, outcome, homeTeam, awayTeam),
    mode: 'oracle',
  };
}

function secureRandomUnit(): number {
  const cryptoSource = globalThis.crypto;

  if (cryptoSource?.getRandomValues) {
    const values = new Uint32Array(1);
    cryptoSource.getRandomValues(values);
    return values[0] / 4294967296;
  }

  return createSeededRandom(stableStringHash(`${Date.now()}:${performance.now()}`))();
}

export function createChaosOverride(previousResult: PredictionResult): PredictionResult {
  const homeScore = weightedScore(secureRandomUnit()) as GoalScore;
  const awayScore = weightedScore(secureRandomUnit()) as GoalScore;
  const outcome = outcomeFor(homeScore, awayScore);
  const confidence = Math.round(49 + secureRandomUnit() * 48);

  return {
    ...previousResult,
    homeScore,
    awayScore,
    outcome,
    outcomeLabel: 'CHAOS OVERRIDE ACTIVE',
    confidence,
    analysisSentence: `Reality has been forcibly renegotiated: ${previousResult.homeTeam} and ${previousResult.awayTeam} now obey the unstable chaos protocol.`,
    supportingStatistics: [
      {
        label: 'Tactical advantage',
        value: outcome === 'draw' ? 'Volatile equilibrium' : `${outcome === 'home' ? previousResult.homeTeam : previousResult.awayTeam} +${Math.round(secureRandomUnit() * 31 + 3)}%`,
      },
      {
        label: 'Expected possession',
        value: `${Math.round(secureRandomUnit() * 24 + 38)}% / classified`,
      },
      {
        label: 'Timeline agreement',
        value: `${Math.round(secureRandomUnit() * 44 + 39)}%`,
      },
    ],
    mode: 'chaos',
  };
}
