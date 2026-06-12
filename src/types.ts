import { PredictionResult } from './utils/prediction';

export type AppPhase = 'input' | 'analysis' | 'result';

export type ProphecyRecord = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  timestamp: string;
  mode: PredictionResult['mode'];
  result: PredictionResult;
};

export type ToastMessage = {
  id: number;
  message: string;
  tone?: 'info' | 'success' | 'error';
};
