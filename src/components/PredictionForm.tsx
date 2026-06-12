import { FormEvent } from 'react';
import { FootballCompetition, FootballTeam } from '../types/footballData';

export type PredictionEntryMode = 'real' | 'manual';

type PredictionFormProps = {
  mode: PredictionEntryMode;
  homeTeam: string;
  awayTeam: string;
  validationMessage: string;
  canPredict: boolean;
  showValidation: boolean;
  competitions: FootballCompetition[];
  teams: FootballTeam[];
  selectedCompetition: string;
  selectedHomeTeamId: string;
  selectedAwayTeamId: string;
  isLoadingCompetitions: boolean;
  isLoadingTeams: boolean;
  competitionsError: string;
  teamsError: string;
  realModeValidationMessage: string;
  onModeChange: (mode: PredictionEntryMode) => void;
  onHomeTeamChange: (value: string) => void;
  onAwayTeamChange: (value: string) => void;
  onCompetitionChange: (value: string) => void;
  onHomeTeamSelect: (value: string) => void;
  onAwayTeamSelect: (value: string) => void;
  onRetryCompetitions: () => void;
  onRetryTeams: () => void;
  onSubmit: () => void;
  onSwapTeams: () => void;
};

export function PredictionForm({
  mode,
  homeTeam,
  awayTeam,
  validationMessage,
  canPredict,
  showValidation,
  competitions,
  teams,
  selectedCompetition,
  selectedHomeTeamId,
  selectedAwayTeamId,
  isLoadingCompetitions,
  isLoadingTeams,
  competitionsError,
  teamsError,
  realModeValidationMessage,
  onModeChange,
  onHomeTeamChange,
  onAwayTeamChange,
  onCompetitionChange,
  onHomeTeamSelect,
  onAwayTeamSelect,
  onRetryCompetitions,
  onRetryTeams,
  onSubmit,
  onSwapTeams,
}: PredictionFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const errorId = 'team-validation-message';
  const activeValidationMessage = mode === 'manual' ? validationMessage : realModeValidationMessage;
  const hasVisibleError = showValidation && activeValidationMessage.length > 0;
  const selectedHomeTeam = teams.find((team) => String(team.id) === selectedHomeTeamId) ?? null;
  const selectedAwayTeam = teams.find((team) => String(team.id) === selectedAwayTeamId) ?? null;

  return (
    <section className="panel input-panel" aria-labelledby="input-title">
      <div className="panel-heading">
        <div>
          <p className="panel-code">MATCH VECTOR ENTRY</p>
          <h2 id="input-title">Select competing timelines</h2>
        </div>
      </div>
      <form className="team-form" onSubmit={handleSubmit} noValidate>
        <div className="mode-switch" role="radiogroup" aria-label="Prediction mode">
          <button
            aria-pressed={mode === 'real'}
            className={mode === 'real' ? 'mode-button active' : 'mode-button'}
            onClick={() => onModeChange('real')}
            type="button"
          >
            Real Team Mode
          </button>
          <button
            aria-pressed={mode === 'manual'}
            className={mode === 'manual' ? 'mode-button active' : 'mode-button'}
            onClick={() => onModeChange('manual')}
            type="button"
          >
            Manual Oracle Mode
          </button>
        </div>

        <p className="form-hint mode-explainer">
          {mode === 'real'
            ? 'Real Team Mode uses available football information from football-data.org when the Oracle can verify enough recent match data.'
            : 'Manual Oracle Mode accepts any team names and uses the fictional deterministic Oracle calculation.'}
        </p>

        {mode === 'real' ? (
          <div className="real-team-fields">
            <div className="team-field competition-field">
              <label htmlFor="competition-select">Competition</label>
              <select
                aria-describedby="competition-help"
                disabled={isLoadingCompetitions}
                id="competition-select"
                onChange={(event) => onCompetitionChange(event.target.value)}
                value={selectedCompetition}
              >
                <option value="">Select a competition</option>
                {competitions.map((competition) => (
                  <option key={competition.id} value={competition.code || String(competition.id)}>
                    {competition.name} ({competition.areaName})
                  </option>
                ))}
              </select>
              <p className="field-help" id="competition-help">
                Choose a competition whose teams the Oracle can scan.
              </p>
              {isLoadingCompetitions ? <p className="status-copy">Loading competitions...</p> : null}
              {competitionsError ? (
                <div className="inline-retry" role="alert">
                  <p>{competitionsError}</p>
                  <button className="text-button" type="button" onClick={onRetryCompetitions}>
                    Retry competitions
                  </button>
                </div>
              ) : null}
            </div>

            <div className="field-grid">
              <div className="team-field home-field">
                <label htmlFor="real-home-team">Home Team</label>
                <select
                  aria-describedby={`real-home-help ${hasVisibleError ? errorId : ''}`}
                  aria-invalid={hasVisibleError ? 'true' : 'false'}
                  disabled={!selectedCompetition || isLoadingTeams || teams.length === 0}
                  id="real-home-team"
                  onChange={(event) => onHomeTeamSelect(event.target.value)}
                  value={selectedHomeTeamId}
                >
                  <option value="">Select home team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <p className="field-help" id="real-home-help">
                  The team playing at home.
                </p>
              </div>

              <div className="tooltip-wrap swap-control">
                <button
                  aria-describedby="swap-teams-tooltip"
                  aria-label="Swap Teams: switch home and away teams"
                  className="swap-button"
                  disabled={!selectedHomeTeamId && !selectedAwayTeamId}
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
                <label htmlFor="real-away-team">Away Team</label>
                <select
                  aria-describedby={`real-away-help ${hasVisibleError ? errorId : ''}`}
                  aria-invalid={hasVisibleError ? 'true' : 'false'}
                  disabled={!selectedCompetition || isLoadingTeams || teams.length === 0}
                  id="real-away-team"
                  onChange={(event) => onAwayTeamSelect(event.target.value)}
                  value={selectedAwayTeamId}
                >
                  <option value="">Select away team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <p className="field-help" id="real-away-help">
                  The visiting team.
                </p>
              </div>
            </div>

            {isLoadingTeams ? <p className="status-copy">Loading teams...</p> : null}
            {selectedCompetition && !isLoadingTeams && teams.length === 0 && !teamsError ? (
              <p className="empty-history">No teams are available for this competition.</p>
            ) : null}
            {teamsError ? (
              <div className="inline-retry" role="alert">
                <p>{teamsError}</p>
                <button className="text-button" type="button" onClick={onRetryTeams}>
                  Retry teams
                </button>
              </div>
            ) : null}

            {(selectedHomeTeam || selectedAwayTeam) ? (
              <div className="crest-preview" aria-label="Selected team crests">
                <TeamCrestPreview label="Home" team={selectedHomeTeam} />
                <TeamCrestPreview label="Away" team={selectedAwayTeam} />
              </div>
            ) : null}
          </div>
        ) : (
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
        )}

        {hasVisibleError ? (
          <p className="form-error" id={errorId} role="alert">
            {activeValidationMessage}
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

function TeamCrestPreview({ label, team }: { label: string; team: FootballTeam | null }) {
  return (
    <div className="crest-card">
      <span>{label}</span>
      {team?.crest ? <img src={team.crest} alt="" loading="lazy" /> : <div className="crest-placeholder" aria-hidden="true">FC</div>}
      <strong>{team?.shortName ?? 'Awaiting selection'}</strong>
    </div>
  );
}
