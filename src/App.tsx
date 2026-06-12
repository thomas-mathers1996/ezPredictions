import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PredictionForm } from './components/PredictionForm';
import {
  ANALYSIS_STAGES,
  METRIC_LABELS,
  PredictionProgress,
} from './components/PredictionProgress';
import { PredictionResultView } from './components/PredictionResultView';
import { RecentPredictions } from './components/RecentPredictions';
import { ToastViewport } from './components/ToastViewport';
import { UserManual } from './components/UserManual';
import { AppPhase, ProphecyRecord, ToastMessage } from './types';
import {
  OracleMetrics,
  PredictionResult,
  areTeamsIdentical,
  createChaosOverride,
  createPrediction,
  formatTeamNameForDisplay,
} from './utils/prediction';
import { createResultShareText } from './utils/share';

const HISTORY_STORAGE_KEY = 'football-oracle:recent-prophecies';

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

function clampMetric(value: number): number {
  return Math.min(Math.max(Math.round(value), 0), 100);
}

function createLiveMetrics(metrics: OracleMetrics | null, progress: number, pulse: number): OracleMetrics {
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

function getValidationMessage(homeTeam: string, awayTeam: string): string {
  const homeHasCharacters = homeTeam.length > 0;
  const awayHasCharacters = awayTeam.length > 0;
  const homeDisplay = formatTeamNameForDisplay(homeTeam);
  const awayDisplay = formatTeamNameForDisplay(awayTeam);

  if ((homeHasCharacters && homeDisplay.length === 0) || (awayHasCharacters && awayDisplay.length === 0)) {
    return 'Team names cannot contain only whitespace.';
  }

  if (homeDisplay.length === 0 || awayDisplay.length === 0) {
    return 'Both team names are required before the uplink can begin.';
  }

  if (areTeamsIdentical(homeTeam, awayTeam)) {
    return 'Home and away teams must be different after Oracle normalization.';
  }

  return '';
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
    (candidate.mode === 'oracle' || candidate.mode === 'chaos') &&
    isPredictionResult(candidate.result)
  );
}

function isPredictionResult(result: unknown): result is PredictionResult {
  if (!result || typeof result !== 'object') {
    return false;
  }

  const candidate = result as Partial<PredictionResult>;

  return (
    typeof candidate.homeTeam === 'string' &&
    typeof candidate.awayTeam === 'string' &&
    typeof candidate.normalizedHomeTeam === 'string' &&
    typeof candidate.normalizedAwayTeam === 'string' &&
    typeof candidate.seedInput === 'string' &&
    typeof candidate.seed === 'number' &&
    typeof candidate.homeScore === 'number' &&
    typeof candidate.awayScore === 'number' &&
    (candidate.outcome === 'home' || candidate.outcome === 'away' || candidate.outcome === 'draw') &&
    typeof candidate.outcomeLabel === 'string' &&
    typeof candidate.confidence === 'number' &&
    typeof candidate.analysisSentence === 'string' &&
    Array.isArray(candidate.supportingStatistics) &&
    (candidate.mode === 'oracle' || candidate.mode === 'chaos')
  );
}

type OracleHeaderProps = {
  manualButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenManual: () => void;
};

function OracleHeader({ manualButtonRef, onOpenManual }: OracleHeaderProps) {
  return (
    <header className="oracle-header">
      <div className="header-copy">
        <p className="eyebrow">Predictive football command interface</p>
        <h1>THE FOOTBALL ORACLE</h1>
        <p className="subtitle">Advanced Match Outcome Intelligence System</p>
        <p className="purpose-copy">
          Enter two football teams and let the Oracle calculate a completely unnecessary prediction.
        </p>
      </div>
      <div className="header-actions">
        <button
          className="secondary-button manual-button"
          onClick={onOpenManual}
          ref={manualButtonRef}
          type="button"
        >
          <span aria-hidden="true">[?]</span>
          User Manual
        </button>
        <div className="status-pill" aria-label="Oracle status: online">
          <span className="status-light" aria-hidden="true" />
          ORACLE ONLINE
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<AppPhase>('input');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [pendingPrediction, setPendingPrediction] = useState<PredictionResult | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [liveMetrics, setLiveMetrics] = useState<OracleMetrics>(() => createLiveMetrics(null, 0, 0));
  const [history, setHistory] = useState<ProphecyRecord[]>(() => loadHistory());
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const pulseRef = useRef(0);
  const isPredictionActiveRef = useRef(false);
  const resultRef = useRef<HTMLElement | null>(null);
  const manualButtonRef = useRef<HTMLButtonElement | null>(null);

  const trimmedHomeTeam = formatTeamNameForDisplay(homeTeam);
  const trimmedAwayTeam = formatTeamNameForDisplay(awayTeam);
  const validationMessage = useMemo(() => getValidationMessage(homeTeam, awayTeam), [homeTeam, awayTeam]);
  const canPredict = validationMessage.length === 0 && phase !== 'analysis';

  const addToast = useCallback((message: string, tone: ToastMessage['tone'] = 'info') => {
    const id = Date.now() + Math.floor(performance.now());
    setToasts((currentToasts) => [...currentToasts, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
    }, 3600);
  }, []);

  const persistHistory = useCallback(
    (nextHistory: ProphecyRecord[]) => {
      try {
        setHistory(nextHistory);
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
      } catch {
        addToast('Unexpected error', 'error');
      }
    },
    [addToast],
  );

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
        result: prediction,
      };

      setHistory((currentHistory) => {
        const nextHistory = [record, ...currentHistory].slice(0, 5);

        try {
          window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
        } catch {
          addToast('Unexpected error', 'error');
        }

        return nextHistory;
      });
    },
    [addToast],
  );

  useEffect(() => {
    if (phase !== 'analysis' || !pendingPrediction) {
      return undefined;
    }

    const totalDuration = reducedMotion ? 900 : 5000;
    const updateInterval = reducedMotion ? 120 : 80;
    const startedAt = performance.now();
    let completed = false;

    setProgress(0);
    setStageIndex(0);
    setLiveMetrics(createLiveMetrics(pendingPrediction.metrics, 0, pulseRef.current));

    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const nextProgress = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
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
        isPredictionActiveRef.current = false;
        recordPrediction(pendingPrediction);
        addToast('Prediction completed', 'success');
      }
    }, updateInterval);

    return () => window.clearInterval(timer);
  }, [addToast, pendingPrediction, phase, recordPrediction, reducedMotion]);

  useEffect(() => {
    if (phase === 'result' && result && window.innerWidth <= 760) {
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }), 0);
    }
  }, [phase, reducedMotion, result]);

  const handleHomeTeamChange = (value: string) => {
    setHomeTeam(value);
    setShowValidation(true);
  };

  const handleAwayTeamChange = (value: string) => {
    setAwayTeam(value);
    setShowValidation(true);
  };

  const handleSwapTeams = () => {
    setHomeTeam(awayTeam);
    setAwayTeam(homeTeam);
    setShowValidation(true);
  };

  const handleSubmitPrediction = () => {
    setShowValidation(true);

    if (phase === 'analysis' || isPredictionActiveRef.current) {
      return;
    }

    if (validationMessage) {
      return;
    }

    try {
      const prediction = createPrediction(homeTeam, awayTeam);
      isPredictionActiveRef.current = true;
      setPendingPrediction(prediction);
      setResult(null);
      setProgress(0);
      setStageIndex(0);
      setPhase('analysis');
      addToast('Prediction started', 'info');
    } catch {
      addToast('Unexpected error', 'error');
    }
  };

  const handleCancelPrediction = () => {
    isPredictionActiveRef.current = false;
    setPendingPrediction(null);
    setProgress(0);
    setStageIndex(0);
    setPhase('input');
    addToast('Prediction cancelled', 'info');
  };

  const handlePredictAnother = () => {
    isPredictionActiveRef.current = false;
    setPhase('input');
    setHomeTeam(result?.homeTeam ?? pendingPrediction?.homeTeam ?? homeTeam);
    setAwayTeam(result?.awayTeam ?? pendingPrediction?.awayTeam ?? awayTeam);
    setShowValidation(false);
    setPendingPrediction(null);
    setResult(null);
    setProgress(0);
  };

  const handleChaosOverride = () => {
    if (!result) {
      return;
    }

    try {
      const chaosResult = createChaosOverride(result);
      setResult(chaosResult);
      setHomeTeam(chaosResult.homeTeam);
      setAwayTeam(chaosResult.awayTeam);
      recordPrediction(chaosResult);
      addToast('Prediction completed', 'success');
    } catch {
      addToast('Unexpected error', 'error');
    }
  };

  const handleShareResult = async () => {
    if (!result) {
      return;
    }

    const shareText = createResultShareText(result);

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'The Football Oracle',
          text: shareText,
        });
        addToast('Result shared', 'success');
        return;
      }

      await navigator.clipboard.writeText(shareText);
      addToast('Result copied', 'success');
    } catch {
      addToast('Unexpected error', 'error');
    }
  };

  const handleSelectHistory = (record: ProphecyRecord) => {
    setPendingPrediction(null);
    setHomeTeam(record.homeTeam);
    setAwayTeam(record.awayTeam);
    setResult(record.result);
    setProgress(100);
    setStageIndex(ANALYSIS_STAGES.length - 1);
    setPhase('result');
  };

  const handleConfirmClearHistory = () => {
    persistHistory([]);
    setIsConfirmingClear(false);
    addToast('History cleared', 'success');
  };

  return (
    <main className="oracle-shell">
      <div className="screen-distortion" aria-hidden="true" />
      <OracleHeader
        manualButtonRef={manualButtonRef}
        onOpenManual={() => setIsManualOpen(true)}
      />

      <div className="layout-grid">
        <div className="command-core">
          {phase === 'input' ? (
            <PredictionForm
              awayTeam={awayTeam}
              canPredict={canPredict}
              homeTeam={homeTeam}
              onAwayTeamChange={handleAwayTeamChange}
              onHomeTeamChange={handleHomeTeamChange}
              onSubmit={handleSubmitPrediction}
              onSwapTeams={handleSwapTeams}
              showValidation={showValidation || homeTeam.length > 0 || awayTeam.length > 0}
              validationMessage={validationMessage}
            />
          ) : null}

          {phase === 'analysis' ? (
            <PredictionProgress
              awayTeam={pendingPrediction?.awayTeam ?? trimmedAwayTeam}
              homeTeam={pendingPrediction?.homeTeam ?? trimmedHomeTeam}
              liveMetrics={liveMetrics}
              onCancel={handleCancelPrediction}
              progress={progress}
              reducedMotion={reducedMotion}
              stageIndex={stageIndex}
            />
          ) : null}

          {phase === 'result' && result ? (
            <PredictionResultView
              onChaosOverride={handleChaosOverride}
              onPredictAnother={handlePredictAnother}
              onShare={handleShareResult}
              result={result}
              resultRef={resultRef}
            />
          ) : null}
        </div>

        <RecentPredictions
          history={history}
          isConfirmingClear={isConfirmingClear}
          onCancelClear={() => setIsConfirmingClear(false)}
          onConfirmClear={handleConfirmClearHistory}
          onRequestClear={() => setIsConfirmingClear(true)}
          onSelect={handleSelectHistory}
        />
      </div>

      <UserManual
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        returnFocusRef={manualButtonRef}
      />
      <ToastViewport messages={toasts} />
    </main>
  );
}
