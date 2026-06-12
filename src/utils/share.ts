import { PredictionResult } from './prediction';

export function createResultShareText(result: PredictionResult): string {
  return [
    'The Football Oracle predicts:',
    '',
    `${result.homeTeam} ${result.homeScore}`,
    `${result.awayTeam} ${result.awayScore}`,
    '',
    `Oracle confidence: ${result.confidence}%`,
  ].join('\n');
}
