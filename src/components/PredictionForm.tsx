import { FormEvent } from 'react';

type PredictionFormProps = {
  homeTeam: string;
  awayTeam: string;
  validationMessage: string;
  canPredict: boolean;
  showValidation: boolean;
  onHomeTeamChange: (value: string) => void;
  onAwayTeamChange: (value: string) => void;
  onSubmit: () => void;
  onSwapTeams: () => void;
};

export function PredictionForm({
  homeTeam,
  awayTeam,
  validationMessage,
  canPredict,
  showValidation,
  onHomeTeamChange,
  onAwayTeamChange,
  onSubmit,
  onSwapTeams,
}: PredictionFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const errorId = 'team-validation-message';
  const hasVisibleError = showValidation && validationMessage.length > 0;

  return (
    <section className="panel input-panel" aria-labelledby="input-title">
      <div className="panel-heading">
        <div>
          <p className="panel-code">MATCH VECTOR ENTRY</p>
          <h2 id="input-title">Select competing timelines</h2>
        </div>
      </div>
      <form className="team-form" onSubmit={handleSubmit} noValidate>
        <div className="field-grid">
          <div className="team-field home-field">
            <label htmlFor="home-team">Home Team</label>
            <input
              aria-describedby={`home-team-help ${hasVisibleError ? errorId : ''}`}
              aria-invalid={hasVisibleError ? 'true' : 'false'}
              autoComplete="off"
              id="home-team"
              onChange={(event) => onHomeTeamChange(event.target.value)}
              placeholder="South Korea"
              value={homeTeam}
            />
            <p className="field-help" id="home-team-help">
              The team playing at home.
            </p>
          </div>

          <div className="tooltip-wrap swap-control">
            <button
              aria-describedby="swap-teams-tooltip"
              aria-label="Swap Teams: switch home and away teams"
              className="swap-button"
              onClick={onSwapTeams}
              type="button"
            >
              <span aria-hidden="true">HOME/AWAY</span>
              Swap Teams
            </button>
            <span className="control-tooltip" id="swap-teams-tooltip" role="tooltip">
              Swap Teams switches the home and away entries.
            </span>
          </div>

          <div className="team-field away-field">
            <label htmlFor="away-team">Away Team</label>
            <input
              aria-describedby={`away-team-help ${hasVisibleError ? errorId : ''}`}
              aria-invalid={hasVisibleError ? 'true' : 'false'}
              autoComplete="off"
              id="away-team"
              onChange={(event) => onAwayTeamChange(event.target.value)}
              placeholder="New Zealand"
              value={awayTeam}
            />
            <p className="field-help" id="away-team-help">
              The visiting team.
            </p>
          </div>
        </div>

        {hasVisibleError ? (
          <p className="form-error" id={errorId} role="alert">
            {validationMessage}
          </p>
        ) : (
          <p className="form-hint">
            Enter two football teams and let the Oracle calculate a completely unnecessary
            prediction.
          </p>
        )}

        <button className="primary-button generate-button" disabled={!canPredict} type="submit">
          Generate Prediction
        </button>
      </form>
    </section>
  );
}
