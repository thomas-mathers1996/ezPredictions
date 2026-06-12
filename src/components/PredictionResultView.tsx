import { RefObject } from 'react';
import { PredictionResult } from '../utils/prediction';
import { DISCLAIMER } from './UserManual';

type PredictionResultViewProps = {
  result: PredictionResult;
  resultRef: RefObject<HTMLElement | null>;
  onPredictAnother: () => void;
  onChaosOverride: () => void;
  onShare: () => void;
};

export function PredictionResultView({
  result,
  resultRef,
  onPredictAnother,
  onChaosOverride,
  onShare,
}: PredictionResultViewProps) {
  const isChaos = result.mode === 'chaos';

  return (
    <section
      aria-labelledby="result-title"
      aria-live="assertive"
      className="panel result-panel"
      ref={resultRef}
    >
      <div className="result-header">
        <div>
          <p className="panel-code">{isChaos ? 'REALITY OVERRIDE REPORT' : 'FINAL ORACLE OUTPUT'}</p>
          <h2 id="result-title">{isChaos ? 'CHAOS OVERRIDE ACTIVE' : 'Result locked'}</h2>
        </div>
      </div>

      <div className="scoreboard" aria-label="Predicted score">
        <div className="score-row">
          <span className="team-name">{result.homeTeam.toUpperCase()}</span>
          <span className="score-box">{result.homeScore}</span>
        </div>
        <div className="score-row">
          <span className="team-name">{result.awayTeam.toUpperCase()}</span>
          <span className="score-box">{result.awayScore}</span>
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

      <dl className="statistics" aria-label="Supporting statistics">
        {result.supportingStatistics.map((statistic) => (
          <div key={statistic.label}>
            <dt>{statistic.label}</dt>
            <dd>{statistic.value}</dd>
          </div>
        ))}
      </dl>

      <p className="disclaimer">{DISCLAIMER}</p>

      <div className="result-actions">
        <button className="secondary-button" type="button" onClick={onPredictAnother}>
          Predict Another Match
        </button>
        <div className="tooltip-wrap">
          <button
            aria-describedby="chaos-tooltip"
            className="primary-button"
            type="button"
            onClick={onChaosOverride}
          >
            Run Chaos Override
          </button>
          <span className="control-tooltip" id="chaos-tooltip" role="tooltip">
            Chaos Override generates a new random score for the same teams.
          </span>
        </div>
        <div className="tooltip-wrap">
          <button
            aria-describedby="share-tooltip"
            className="secondary-button"
            type="button"
            onClick={onShare}
          >
            Share Result
          </button>
          <span className="control-tooltip" id="share-tooltip" role="tooltip">
            Share Result opens your device share menu or copies the result.
          </span>
        </div>
      </div>
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
