import { OracleMetrics } from '../utils/prediction';

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

export const ANALYSIS_STAGES = [
  'Establishing tactical uplink',
  'Scanning historical football timelines',
  'Calculating expected vibes',
  'Measuring continental momentum',
  'Analysing atmospheric ball resistance',
  'Consulting the algorithmic octopus',
  'Simulating alternate match timelines',
  'Correcting for suspicious referee energy',
  'Collapsing probability waveform',
  'Finalising mathematically inevitable result',
] as const;

type PredictionProgressProps = {
  homeTeam: string;
  awayTeam: string;
  progress: number;
  stageIndex: number;
  liveMetrics: OracleMetrics;
  reducedMotion: boolean;
  onCancel: () => void;
};

export function PredictionProgress({
  homeTeam,
  awayTeam,
  progress,
  stageIndex,
  liveMetrics,
  reducedMotion,
  onCancel,
}: PredictionProgressProps) {
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  const activeStage = ANALYSIS_STAGES[Math.min(stageIndex, ANALYSIS_STAGES.length - 1)];

  return (
    <section className="panel analysis-panel" aria-labelledby="analysis-title">
      <div className="analysis-topline">
        <div>
          <p className="panel-code">ACTIVE PROPHECY SEQUENCE</p>
          <h2 id="analysis-title">Oracle calculation in progress</h2>
          <p className="analysis-matchup">
            <span>Home: {homeTeam || 'Home Team'}</span>
            <span>Away: {awayTeam || 'Away Team'}</span>
          </p>
        </div>
        <div className="analysis-percent" aria-hidden="true">
          {safeProgress}%
        </div>
      </div>

      <div className="analysis-grid">
        <RadarScanner />
        <div className="analysis-feed">
          <p className="stage-label" aria-live="polite">
            {activeStage}
          </p>
          <p className="sr-only" aria-live="polite">
            {safeProgress}% complete. Current calculation stage: {activeStage}.
          </p>
          <div
            aria-label="Oracle analysis progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={safeProgress}
            className="progress-track"
            role="progressbar"
          >
            <span style={{ width: `${safeProgress}%` }} />
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

      <div className="analysis-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel Prediction
        </button>
        <p className="motion-note">
          {reducedMotion
            ? 'Reduced motion protocol active: non-essential turbulence has been suppressed.'
            : 'Scanner turbulence nominal. Alternate timelines remain unstable.'}
        </p>
      </div>
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

export { METRIC_LABELS };
