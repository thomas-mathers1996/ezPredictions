import { describe, expect, it } from 'vitest';
import {
  areTeamsIdentical,
  createChaosOverride,
  createPrediction,
  createSeedInput,
  createSeededRandom,
  normalizeTeamName,
  stableStringHash,
  weightedScore,
} from './prediction';

describe('prediction utilities', () => {
  it('normalizes team names for seed generation', () => {
    expect(normalizeTeamName('  Korea!!!   Republic  ')).toBe('korea republic');
    expect(normalizeTeamName('New---Zealand')).toBe('newzealand');
    expect(normalizeTeamName('A.F.C.  Test')).toBe('afc test');
  });

  it('creates a stable unsigned hash', () => {
    expect(stableStringHash('home:korea|away:new zealand')).toBe(
      stableStringHash('home:korea|away:new zealand'),
    );
    expect(stableStringHash('home:korea|away:new zealand')).toBeGreaterThanOrEqual(0);
  });

  it('returns deterministic predictions for the same teams', () => {
    const firstPrediction = createPrediction('Korea', 'New Zealand');
    const secondPrediction = createPrediction(' Korea ', 'New    Zealand');

    expect(secondPrediction).toEqual(firstPrediction);
  });

  it('uses team order when creating the seed', () => {
    expect(createSeedInput('Korea', 'New Zealand')).not.toBe(
      createSeedInput('New Zealand', 'Korea'),
    );
    expect(createPrediction('Korea', 'New Zealand').seed).not.toBe(
      createPrediction('New Zealand', 'Korea').seed,
    );
  });

  it('keeps scores between 0 and 3', () => {
    const teams = [
      ['Korea', 'New Zealand'],
      ['Brazil', 'Japan'],
      ['Norway', 'Canada'],
      ['Ghana', 'Chile'],
      ['France', 'Morocco'],
    ];

    for (const [homeTeam, awayTeam] of teams) {
      const prediction = createPrediction(homeTeam, awayTeam);

      expect(prediction.homeScore).toBeGreaterThanOrEqual(0);
      expect(prediction.homeScore).toBeLessThanOrEqual(3);
      expect(prediction.awayScore).toBeGreaterThanOrEqual(0);
      expect(prediction.awayScore).toBeLessThanOrEqual(3);
    }
  });

  it('maps weighted score thresholds to the expected goal values', () => {
    expect(weightedScore(0)).toBe(0);
    expect(weightedScore(0.299)).toBe(0);
    expect(weightedScore(0.3)).toBe(1);
    expect(weightedScore(0.679)).toBe(1);
    expect(weightedScore(0.68)).toBe(2);
    expect(weightedScore(0.899)).toBe(2);
    expect(weightedScore(0.9)).toBe(3);
    expect(weightedScore(0.999)).toBe(3);
  });

  it('supports deterministic seeded pseudo-random values', () => {
    const firstRandom = createSeededRandom(12345);
    const secondRandom = createSeededRandom(12345);

    expect([firstRandom(), firstRandom(), firstRandom()]).toEqual([
      secondRandom(),
      secondRandom(),
      secondRandom(),
    ]);
  });

  it('detects identical teams after normalization', () => {
    expect(areTeamsIdentical('  Korea FC!! ', 'korea   fc')).toBe(true);
    expect(areTeamsIdentical('Korea', 'New Zealand')).toBe(false);
    expect(areTeamsIdentical('', '')).toBe(false);
  });

  it('returns the required prediction data structure', () => {
    const prediction = createPrediction('Korea', 'New Zealand');

    expect(prediction).toMatchObject({
      homeTeam: 'Korea',
      awayTeam: 'New Zealand',
      normalizedHomeTeam: 'korea',
      normalizedAwayTeam: 'new zealand',
      seedInput: 'home:korea|away:new zealand',
      mode: 'oracle',
    });
    expect(prediction.metrics).toHaveProperty('tacticalEntropy');
    expect(prediction.supportingStatistics).toHaveLength(3);
    expect(prediction.analysisSentence.length).toBeGreaterThan(20);
    expect(prediction.confidence).toBeGreaterThanOrEqual(51);
    expect(prediction.confidence).toBeLessThanOrEqual(96);
  });

  it('keeps chaos override scores within boundaries', () => {
    const prediction = createPrediction('Korea', 'New Zealand');

    for (let index = 0; index < 20; index += 1) {
      const chaosPrediction = createChaosOverride(prediction);

      expect(chaosPrediction.homeScore).toBeGreaterThanOrEqual(0);
      expect(chaosPrediction.homeScore).toBeLessThanOrEqual(3);
      expect(chaosPrediction.awayScore).toBeGreaterThanOrEqual(0);
      expect(chaosPrediction.awayScore).toBeLessThanOrEqual(3);
      expect(chaosPrediction.outcomeLabel).toBe('CHAOS OVERRIDE ACTIVE');
      expect(chaosPrediction.mode).toBe('chaos');
    }
  });
});
