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
  const isDataBacked = result.mode === 'data';
  const isFallback = result.mode === 'fallback' || result.mode === 'oracle';
  const resultLabel = isChaos
    ? 'CHAOS OVERRIDE ACTIVE'
    : isDataBacked
      ? 'DATA BACKED ORACLE PREDICTION'
      : 'ORACLE FALLBACK PREDICTION';

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
          <h2 id="result-title">{resultLabel}</h2>
        </div>
      </div>

      <div className="scoreboard" aria-label="Predicted score">
        <div className="score-row">
          <span className={`team-name ${getTeamNameLengthClass(result.homeTeam)}`}>
            {result.homeTeam.toUpperCase()}
          </span>
          <span className="score-box">{result.homeScore}</span>
        </div>
        <div className="score-row">
          <span className={`team-name ${getTeamNameLengthClass(result.awayTeam)}`}>
            {result.awayTeam.toUpperCase()}
          </span>
          <span className="score-box">{result.awayScore}</span>
        </div>
      </div>

      <div className="result-intelligence">
        {isChaos ? <p className="chaos-banner">{result.outcomeLabel}</p> : null}
        {isFallback && result.dataDetails?.fallbackReason ? (
          <p className="fallback-banner">{result.dataDetails.fallbackReason}</p>
        ) : null}
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

      {result.dataDetails && !isChaos ? (
        <div className="data-details" aria-label="Prediction data details">
          <div>
            <h3>Real performance metrics</h3>
            <dl>
              <DataPoint label="Competition" value={result.dataDetails.competitionName ?? 'Unavailable'} />
              <DataPoint
                label="Matches analysed"
                value={`${result.dataDetails.matchesAnalysed.home} / ${result.dataDetails.matchesAnalysed.away}`}
              />
              <DataPoint
                label="Recent form"
                value={`${result.homeTeam}: ${result.dataDetails.recentForm.home} | ${result.awayTeam}: ${result.dataDetails.recentForm.away}`}
              />
              <DataPoint
                label="Average goals scored"
                value={`${result.dataDetails.averages.homeScored.toFixed(2)} / ${result.dataDetails.averages.awayScored.toFixed(2)}`}
              />
              <DataPoint
                label="Average goals conceded"
                value={`${result.dataDetails.averages.homeConceded.toFixed(2)} / ${result.dataDetails.averages.awayConceded.toFixed(2)}`}
              />
              {result.dataDetails.realMetrics.map((metric) => (
                <DataPoint key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </dl>
          </div>
          <div>
            <h3>Entertainment presentation metrics</h3>
            <dl>
              {result.dataDetails.entertainmentMetrics.map((metric) => (
                <DataPoint key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </dl>
          </div>
        </div>
      ) : null}

      <p className="disclaimer">{DISCLAIMER}</p>
      <p className="data-attribution">Football data provided by football-data.org</p>

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

function getTeamNameLengthClass(teamName: string): string {
  const normalizedLength = teamName.replace(/\s+/g, ' ').trim().length;

  if (normalizedLength >= 28) {
    return 'team-name-very-long';
  }

  if (normalizedLength >= 20) {
    return 'team-name-long';
  }

  if (normalizedLength >= 13) {
    return 'team-name-medium';
  }

  return 'team-name-short';
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
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
