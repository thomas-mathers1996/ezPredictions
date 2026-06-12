import { PredictionResult } from '../utils/prediction';

export type FootballCompetition = {
  id: number;
  code: string;
  name: string;
  emblem: string | null;
  areaName: string;
};

export type FootballTeam = {
  id: number;
  name: string;
  shortName: string;
  tla: string | null;
  crest: string | null;
  areaName: string;
};

export type RecentMatch = {
  id: number;
  utcDate: string;
  competitionName: string | null;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homeGoals: number;
  awayGoals: number;
};

export type HomeAwayForm = {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
};

export type TeamForm = {
  teamId: number;
  teamName: string;
  matchesAnalysed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  averageGoalsScored: number;
  averageGoalsConceded: number;
  recentForm: string;
  homeResults: HomeAwayForm;
  awayResults: HomeAwayForm;
};

export type StandingsEntry = {
  teamId: number;
  position: number;
  points: number;
  playedGames: number;
};

export type PredictionDataPayload = {
  competition: {
    id: number | null;
    code: string | null;
    name: string | null;
  };
  homeTeam: FootballTeam;
  awayTeam: FootballTeam;
  homeForm: TeamForm;
  awayForm: TeamForm;
  standings: {
    totalTeams: number;
    home: StandingsEntry | null;
    away: StandingsEntry | null;
  } | null;
};

export type ApiErrorResponse = {
  ok: false;
  code:
    | 'CONFIGURATION_ERROR'
    | 'VALIDATION_ERROR'
    | 'RATE_LIMITED'
    | 'UPSTREAM_ERROR'
    | 'NO_DATA'
    | 'UNEXPECTED_RESPONSE';
  message: string;
  fallbackRecommended: true;
};

export type ApiSuccessResponse<T> = {
  ok: true;
  data: T;
};

export type PredictionApiResponse = ApiSuccessResponse<PredictionDataPayload> | ApiErrorResponse;

export type DataBackedDetails = {
  label: 'DATA BACKED ORACLE PREDICTION' | 'ORACLE FALLBACK PREDICTION';
  competitionName: string | null;
  matchesAnalysed: {
    home: number;
    away: number;
  };
  recentForm: {
    home: string;
    away: string;
  };
  averages: {
    homeScored: number;
    homeConceded: number;
    awayScored: number;
    awayConceded: number;
  };
  realMetrics: Array<{
    label: string;
    value: string;
  }>;
  entertainmentMetrics: Array<{
    label: string;
    value: string;
  }>;
  fallbackReason?: string;
};

export type DataBackedPrediction = PredictionResult & {
  mode: 'data';
  dataDetails: DataBackedDetails;
};

export type FallbackPrediction = PredictionResult & {
  mode: 'fallback';
  dataDetails: DataBackedDetails;
};
