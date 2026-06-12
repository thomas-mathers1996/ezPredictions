import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PredictionResult } from '../utils/prediction';
import { PredictionResultView } from './PredictionResultView';

function renderResult(homeTeam: string, awayTeam: string, homeScore = 2, awayScore = 1) {
  const result: PredictionResult = {
    homeTeam,
    awayTeam,
    normalizedHomeTeam: homeTeam.toLowerCase(),
    normalizedAwayTeam: awayTeam.toLowerCase(),
    seedInput: `${homeTeam}:${awayTeam}`,
    seed: 123,
    homeScore: homeScore as PredictionResult['homeScore'],
    awayScore: awayScore as PredictionResult['awayScore'],
    outcome: homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw',
    outcomeLabel: homeScore > awayScore ? `Predicted winner: ${homeTeam}` : 'Predicted draw',
    confidence: 81,
    metrics: {
      tacticalEntropy: 50,
      goalProbability: 50,
      midfieldResonance: 50,
      defensiveDensity: 50,
      strikerConfidence: 50,
      crowdPressure: 50,
      chaosCoefficient: 50,
      octopusCertainty: 50,
    },
    analysisSentence: `${homeTeam} and ${awayTeam} were evaluated by the Oracle.`,
    supportingStatistics: [
      { label: 'Tactical advantage', value: `${homeTeam} +12%` },
      { label: 'Expected possession', value: '51% / 49%' },
      { label: 'Timeline agreement', value: '81%' },
    ],
    mode: 'fallback',
  };

  render(
    <PredictionResultView
      onChaosOverride={vi.fn()}
      onPredictAnother={vi.fn()}
      onShare={vi.fn()}
      result={result}
      resultRef={createRef<HTMLElement>()}
    />,
  );
}

describe('PredictionResultView responsive score layout', () => {
  it('renders a short team name completely', () => {
    renderResult('EC Bahia', 'Flamengo');

    expect(screen.getByText('EC BAHIA')).toBeInTheDocument();
    expect(screen.getByText('FLAMENGO')).toBeInTheDocument();
  });

  it('renders a long team name completely without truncation or ellipsis', () => {
    renderResult('EC Bahia', 'SC Corinthians Paulista');

    const longName = screen.getByText('SC CORINTHIANS PAULISTA');
    expect(longName).toBeInTheDocument();
    expect(longName).toHaveClass('team-name-long');
    expect(longName.textContent).not.toContain('...');
    expect(longName.textContent).not.toContain('…');
  });

  it('renders two long team names with separate aligned scores', () => {
    renderResult('Club Atletico River Plate', 'SC Corinthians Paulista');

    const scoreboard = screen.getByLabelText(/predicted score/i);
    expect(within(scoreboard).getByText('CLUB ATLETICO RIVER PLATE')).toHaveClass('team-name-long');
    expect(within(scoreboard).getByText('SC CORINTHIANS PAULISTA')).toHaveClass('team-name-long');
    expect(within(scoreboard).getByText('2')).toHaveClass('score-box');
    expect(within(scoreboard).getByText('1')).toHaveClass('score-box');
  });

  it('renders a long team name with a score of 3', () => {
    renderResult('SC Corinthians Paulista', 'Club Atletico Mineiro', 3, 2);

    const scoreboard = screen.getByLabelText(/predicted score/i);
    expect(within(scoreboard).getByText('SC CORINTHIANS PAULISTA')).toBeInTheDocument();
    expect(within(scoreboard).getByText('3')).toHaveClass('score-box');
  });
});
