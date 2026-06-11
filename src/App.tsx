import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  OracleMetrics,
  PredictionResult,
  areTeamsIdentical,
  createChaosOverride,
  createPrediction,
  formatTeamNameForDisplay,
} from './utils/prediction';

const ANALYSIS_STAGES = [
  'Establishing tactical uplink',
  'Scanning historical football timelines',
  'Calculating expected vibes',
  'Measuring continental momentum',
  'Analysing atmospheric ball resistance',
  'Consulting the algorithmic octopus',
  'Simulating 8,492,113 alternate matches',
  'Correcting for suspicious referee energy',
  'Collapsing probability waveform',
  'Finalising mathematically inevitable result',
] as const;

const METRIC_LABELS: Array<[keyof OracleMetrics, string]> = [
  ['tacticalEntropy', 'Tactical entropy'],
  ['goalProbability', 'Goal probability'],
  ['midfieldResonance', 'Midfield resonance'],
  ['defensiveDensity', 'Defensive density'],
  ['strikerConfidence', 'Striker confidence'],
  ['crowdPressure', 'Crowd pressure'],
  ['chaosCoefficient', 'Chaos coefficient'],
  ['octopusCertainty', 'Octopus certainty'],
];

const HISTORY_STORAGE_KEY = 'football-oracle:recent-prophecies';

type AppPhase = 'input' | 'analysis' | 'result';

type ProphecyRecord = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  timestamp: string;
  mode: PredictionResult['mode'];
};

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

function loadHistory(): ProphecyRecord[] {
  try {
    const storedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);

    if (!storedHistory) {
      return [];
    }

    const parsedHistory: unknown = JSON.parse(storedHistory);

    if (!Array.isArray(parsedHistory)) {
      return [];
    }

    return parsedHistory.filter(isProphecyRecord).slice(0, 5);
  } catch {
    return [];
  }
}

function isProphecyRecord(record: unknown): record is ProphecyRecord {
  if (!record || typeof record !== 'object') {
    return false;
  }

  const candidate = record as Partial<ProphecyRecord>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.homeTeam === 'string' &&
    typeof candidate.awayTeam === 'string' &&
    typeof candidate.homeScore === 'number' &&
    typeof candidate.awayScore === 'number' &&
    typeof candidate.timestamp === 'string' &&
    (candidate.mode === 'oracle' || candidate.mode === 'chaos')
  );
}

function clampMetric(value: number): number {
  return Math.min(Math.max(Math.round(value), 0), 100);
}

function createLiveMetrics(
  metrics: OracleMetrics | null,
  progress: number,
  pulse: number,
): OracleMetrics {
  const baseMetrics: OracleMetrics =
    metrics ??
    ({
      tacticalEntropy: 47,
      goalProbability: 52,
      midfieldResonance: 49,
      defensiveDensity: 58,
      strikerConfidence: 45,
      crowdPressure: 62,
      chaosCoefficient: 38,
      octopusCertainty: 71,
    } satisfies OracleMetrics);

  return METRIC_LABELS.reduce((nextMetrics, [key], index) => {
    const oscillation = Math.sin((progress + pulse * 3 + index * 19) / 13) * 8;
    nextMetrics[key] = clampMetric(baseMetrics[key] + oscillation);
    return nextMetrics;
  }, {} as OracleMetrics);
}

function OracleHeader() {
  return (
    <header className="oracle-header">
      <div>
        <p className="eyebrow">Predictive football command interface</p>
        <h1>THE FOOTBALL ORACLE</h1>
        <p className="subtitle">Advanced Match Outcome Intelligence System</p>
      </div>
      <div className="status-pill" aria-label="Oracle status: online">
        <span className="status-light" aria-hidden="true" />
        ORACLE ONLINE
      </div>
    </header>
  );
}

type TeamFormProps = {
  homeTeam: string;
  awayTeam: string;
  formError: string;
  canPredict: boolean;
  onHomeTeamChange: (value: string) => void;
  onAwayTeamChange: (value: string) => void;
  onSubmit: () => void;
  onSwapTeams: () => void;
};

function TeamForm({
  homeTeam,
  awayTeam,
  formError,
  canPredict,
  onHomeTeamChange,
  onAwayTeamChange,
  onSubmit,
  onSwapTeams,
}: TeamFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <section className="panel input-panel" aria-labelledby="input-title">
      <div className="panel-heading">
        <p className="panel-code">MATCH VECTOR ENTRY</p>
        <h2 id="input-title">Select competing timelines</h2>
      </div>
      <form className="team-form" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label className="team-field">
            <span>HOME TEAM</span>
            <input
              value={homeTeam}
              onChange={(event) => onHomeTeamChange(event.target.value)}
              placeholder="Korea"
              autoComplete="off"
            />
          </label>
          <button
            className="swap-button"
            type="button"
            onClick={onSwapTeams}
            aria-label="Swap home and away teams"
          >
            <span aria-hidden="true">HOME/AWAY</span>
            SWAP
          </button>
          <label className="team-field">
            <span>AWAY TEAM</span>
            <input
              value={awayTeam}
              onChange={(event) => onAwayTeamChange(event.target.value)}
              placeholder="New Zealand"
              autoComplete="off"
            />
          </label>
        </div>

        {formError ? (
          <p className="form-error" role="alert">
            {formError}
          </p>
        ) : (
          <p className="form-hint">
            Enter two different teams. The home vector matters to the Oracle.
          </p>
        )}

        <button className="primary-button" type="submit" disabled={!canPredict}>
          INITIATE PREDICTION
        </button>
      </form>
    </section>
  );
}

function RadarScanner() {
  return (
    <div className="radar" aria-hidden="true">
      <div className="radar-ring radar-ring-one" />
      <div className="radar-ring radar-ring-two" />
      <div className="radar-ring radar-ring-three" />
      <div className="radar-crosshair" />
      <div className="radar-sweep" />
      <div className="radar-core" />
    </div>
  );
}

type AnalysisPanelProps = {
  homeTeam: string;
  awayTeam: string;
  progress: number;
  stageIndex: number;
  liveMetrics: OracleMetrics;
  reducedMotion: boolean;
};

function AnalysisPanel({
  homeTeam,
  awayTeam,
  progress,
  stageIndex,
  liveMetrics,
  reducedMotion,
}: AnalysisPanelProps) {
  const activeStage = ANALYSIS_STAGES[Math.min(stageIndex, ANALYSIS_STAGES.length - 1)];

  return (
    <section className="panel analysis-panel" aria-labelledby="analysis-title">
      <div className="analysis-topline">
        <div>
          <p className="panel-code">ACTIVE PROPHECY SEQUENCE</p>
          <h2 id="analysis-title">
            {homeTeam || 'Home'} vs {awayTeam || 'Away'}
          </h2>
        </div>
        <div className="analysis-percent" aria-hidden="true">
          {progress}%
        </div>
      </div>

      <div className="analysis-grid">
        <RadarScanner />
        <div className="analysis-feed">
          <p className="stage-label" aria-live="polite">
            {activeStage}
          </p>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Oracle analysis progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <ol className="stage-list" aria-label="Analysis stages">
            {ANALYSIS_STAGES.map((stage, index) => (
              <li
                className={index < stageIndex ? 'complete' : index === stageIndex ? 'active' : ''}
                key={stage}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {stage}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="metric-grid" aria-label="Live fictional analysis metrics">
        {METRIC_LABELS.map(([key, label]) => (
          <div className="metric" key={key}>
            <span>{label}</span>
            <strong>{liveMetrics[key]}%</strong>
            <div className="metric-bar" aria-hidden="true">
              <span style={{ width: `${liveMetrics[key]}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="motion-note">
        {reducedMotion
          ? 'Reduced motion protocol active: non-essential turbulence has been suppressed.'
          : 'Scanner turbulence nominal. Alternate timelines remain unstable.'}
      </p>
    </section>
  );
}

function getOutcomeSummary(result: PredictionResult): string {
  if (result.outcome === 'home') {
    return `Predicted winner: ${result.homeTeam}`;
  }

  if (result.outcome === 'away') {
    return `Predicted winner: ${result.awayTeam}`;
  }

  return 'Predicted draw: deadlock detected';
}

type ResultPanelProps = {
  result: PredictionResult;
  onAnalyzeAnother: () => void;
  onOverrideReality: () => void;
};

function ResultPanel({ result, onAnalyzeAnother, onOverrideReality }: ResultPanelProps) {
  const isChaos = result.mode === 'chaos';

  return (
    <section className="panel result-panel" aria-labelledby="result-title" aria-live="assertive">
      <div className="result-header">
        <p className="panel-code">{isChaos ? 'REALITY OVERRIDE REPORT' : 'FINAL ORACLE OUTPUT'}</p>
        <h2 id="result-title">{isChaos ? 'CHAOS OVERRIDE ACTIVE' : 'Result locked'}</h2>
      </div>

      <div className="scoreboard" aria-label="Predicted score">
        <div className="score-row">
          <span className="team-name">{result.homeTeam.toUpperCase()}</span>
          <span className="score-box">[{result.homeScore}]</span>
        </div>
        <div className="score-row">
          <span className="team-name">{result.awayTeam.toUpperCase()}</span>
          <span className="score-box">[{result.awayScore}]</span>
        </div>
      </div>

      <div className="result-intelligence">
        {isChaos ? <p className="chaos-banner">{result.outcomeLabel}</p> : null}
        <p className="outcome">{getOutcomeSummary(result)}</p>
        <p className="confidence">
          Oracle confidence <strong>{result.confidence}%</strong>
        </p>
        <p className="analysis-sentence">{result.analysisSentence}</p>
      </div>

      <dl className="statistics">
        {result.supportingStatistics.map((statistic) => (
          <div key={statistic.label}>
            <dt>{statistic.label}</dt>
            <dd>{statistic.value}</dd>
          </div>
        ))}
      </dl>

      <p className="disclaimer">
        For entertainment purposes only. No real match data was harmed during this calculation.
      </p>

      <div className="result-actions">
        <button className="secondary-button" type="button" onClick={onAnalyzeAnother}>
          ANALYSE ANOTHER MATCH
        </button>
        <button className="primary-button" type="button" onClick={onOverrideReality}>
          OVERRIDE REALITY
        </button>
      </div>
    </section>
  );
}

type RecentPropheciesProps = {
  history: ProphecyRecord[];
  onClear: () => void;
};

function RecentProphecies({ history, onClear }: RecentPropheciesProps) {
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [],
  );

  return (
    <aside className="panel recent-panel" aria-labelledby="recent-title">
      <div className="recent-heading">
        <div>
          <p className="panel-code">LOCAL PROPHECY CACHE</p>
          <h2 id="recent-title">Recent prophecies</h2>
        </div>
        <button className="text-button" type="button" onClick={onClear} disabled={history.length === 0}>
          Clear
        </button>
      </div>

      {history.length > 0 ? (
        <ol className="history-list">
          {history.map((record) => (
            <li key={record.id}>
              <div>
                <strong>
                  {record.homeTeam} {record.homeScore} - {record.awayScore} {record.awayTeam}
                </strong>
                <span>{record.mode === 'chaos' ? 'Chaos override' : 'Oracle prediction'}</span>
              </div>
              <time dateTime={record.timestamp}>{formatter.format(new Date(record.timestamp))}</time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-history">No predictions stored. The timeline is clean.</p>
      )}
    </aside>
  );
}

export default function App() {
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<AppPhase>('input');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [formError, setFormError] = useState('');
  const [pendingPrediction, setPendingPrediction] = useState<PredictionResult | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [liveMetrics, setLiveMetrics] = useState<OracleMetrics>(() =>
    createLiveMetrics(null, 0, 0),
  );
  const [history, setHistory] = useState<ProphecyRecord[]>(() => loadHistory());
  const pulseRef = useRef(0);

  const trimmedHomeTeam = formatTeamNameForDisplay(homeTeam);
  const trimmedAwayTeam = formatTeamNameForDisplay(awayTeam);
  const teamsIdentical = areTeamsIdentical(homeTeam, awayTeam);
  const canPredict = trimmedHomeTeam.length > 0 && trimmedAwayTeam.length > 0 && !teamsIdentical;

  const persistHistory = useCallback((nextHistory: ProphecyRecord[]) => {
    setHistory(nextHistory);
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
  }, []);

  const recordPrediction = useCallback(
    (prediction: PredictionResult) => {
      if (!prediction.normalizedHomeTeam || !prediction.normalizedAwayTeam) {
        return;
      }

      const record: ProphecyRecord = {
        id: `${Date.now()}-${prediction.seed}-${prediction.mode}-${prediction.homeScore}-${prediction.awayScore}`,
        homeTeam: prediction.homeTeam,
        awayTeam: prediction.awayTeam,
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        timestamp: new Date().toISOString(),
        mode: prediction.mode,
      };

      setHistory((currentHistory) => {
        const nextHistory = [record, ...currentHistory].slice(0, 5);
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
        return nextHistory;
      });
    },
    [],
  );

  useEffect(() => {
    if (phase !== 'analysis' || !pendingPrediction) {
      return undefined;
    }

    const totalDuration = reducedMotion ? 1200 : 6200;
    const updateInterval = reducedMotion ? 150 : 70;
    const startedAt = performance.now();
    let completed = false;

    setProgress(0);
    setStageIndex(0);
    setLiveMetrics(createLiveMetrics(pendingPrediction.metrics, 0, pulseRef.current));

    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const nextProgress = Math.min(100, Math.round((elapsed / totalDuration) * 100));
      const nextStageIndex = Math.min(
        ANALYSIS_STAGES.length - 1,
        Math.floor((nextProgress / 100) * ANALYSIS_STAGES.length),
      );

      pulseRef.current += 1;
      setProgress(nextProgress);
      setStageIndex(nextStageIndex);
      setLiveMetrics(createLiveMetrics(pendingPrediction.metrics, nextProgress, pulseRef.current));

      if (nextProgress >= 100 && !completed) {
        completed = true;
        window.clearInterval(timer);
        setResult(pendingPrediction);
        setPhase('result');
        recordPrediction(pendingPrediction);
      }
    }, updateInterval);

    return () => window.clearInterval(timer);
  }, [pendingPrediction, phase, recordPrediction, reducedMotion]);

  const handleHomeTeamChange = (value: string) => {
    setHomeTeam(value);
    setFormError('');
  };

  const handleAwayTeamChange = (value: string) => {
    setAwayTeam(value);
    setFormError('');
  };

  const handleSwapTeams = () => {
    setHomeTeam(awayTeam);
    setAwayTeam(homeTeam);
    setFormError('');
  };

  const handleSubmitPrediction = () => {
    if (teamsIdentical) {
      setFormError('Home and away teams must be different after Oracle normalization.');
      return;
    }

    if (!canPredict) {
      setFormError('Both team fields are required before the uplink can begin.');
      return;
    }

    try {
      const prediction = createPrediction(homeTeam, awayTeam);
      setPendingPrediction(prediction);
      setResult(null);
      setPhase('analysis');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'The Oracle rejected this match vector.');
    }
  };

  const handleAnalyzeAnother = () => {
    setPhase('input');
    setHomeTeam('');
    setAwayTeam('');
    setFormError('');
    setPendingPrediction(null);
    setResult(null);
    setProgress(0);
  };

  const handleOverrideReality = () => {
    if (!result) {
      return;
    }

    const chaosResult = createChaosOverride(result);
    setResult(chaosResult);
    recordPrediction(chaosResult);
  };

  const handleClearHistory = () => {
    persistHistory([]);
  };

  return (
    <main className="oracle-shell">
      <div className="screen-distortion" aria-hidden="true" />
      <OracleHeader />

      <div className="layout-grid">
        <div className="command-core">
          {phase === 'input' ? (
            <TeamForm
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              formError={formError}
              canPredict={canPredict}
              onHomeTeamChange={handleHomeTeamChange}
              onAwayTeamChange={handleAwayTeamChange}
              onSubmit={handleSubmitPrediction}
              onSwapTeams={handleSwapTeams}
            />
          ) : null}

          {phase === 'analysis' ? (
            <AnalysisPanel
              homeTeam={pendingPrediction?.homeTeam ?? trimmedHomeTeam}
              awayTeam={pendingPrediction?.awayTeam ?? trimmedAwayTeam}
              progress={progress}
              stageIndex={stageIndex}
              liveMetrics={liveMetrics}
              reducedMotion={reducedMotion}
            />
          ) : null}

          {phase === 'result' && result ? (
            <ResultPanel
              result={result}
              onAnalyzeAnother={handleAnalyzeAnother}
              onOverrideReality={handleOverrideReality}
            />
          ) : null}
        </div>

        <RecentProphecies history={history} onClear={handleClearHistory} />
      </div>
    </main>
  );
}
