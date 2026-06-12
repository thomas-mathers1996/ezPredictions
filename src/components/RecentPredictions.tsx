import { useMemo } from 'react';
import { ProphecyRecord } from '../types';

type RecentPredictionsProps = {
  history: ProphecyRecord[];
  isConfirmingClear: boolean;
  onSelect: (record: ProphecyRecord) => void;
  onRequestClear: () => void;
  onConfirmClear: () => void;
  onCancelClear: () => void;
};

export function RecentPredictions({
  history,
  isConfirmingClear,
  onSelect,
  onRequestClear,
  onConfirmClear,
  onCancelClear,
}: RecentPredictionsProps) {
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
        <div className="tooltip-wrap">
          <button
            aria-describedby="clear-history-tooltip"
            className="text-button"
            disabled={history.length === 0}
            onClick={onRequestClear}
            type="button"
          >
            Clear History
          </button>
          <span className="control-tooltip" id="clear-history-tooltip" role="tooltip">
            Clear History removes saved prophecies from this browser.
          </span>
        </div>
      </div>

      {isConfirmingClear ? (
        <div className="history-confirmation" role="alert">
          <p>Delete all saved prophecies from this browser?</p>
          <div>
            <button className="primary-button compact-button" type="button" onClick={onConfirmClear}>
              Confirm Clear
            </button>
            <button className="secondary-button compact-button" type="button" onClick={onCancelClear}>
              Keep History
            </button>
          </div>
        </div>
      ) : null}

      {history.length > 0 ? (
        <ol className="history-list">
          {history.map((record) => (
            <li key={record.id}>
              <button
                aria-label={`View saved result: ${record.homeTeam} ${record.homeScore}, ${record.awayTeam} ${record.awayScore}`}
                className="history-entry-button"
                onClick={() => onSelect(record)}
                type="button"
              >
                <span className="history-teams">
                  <span>
                    <span className="history-label">Home</span>
                    {record.homeTeam}
                  </span>
                  <strong>
                    {record.homeScore} - {record.awayScore}
                  </strong>
                  <span>
                    <span className="history-label">Away</span>
                    {record.awayTeam}
                  </span>
                </span>
                <span className="history-meta">
                  <span>{record.mode === 'chaos' ? 'Chaos override' : 'Standard prediction'}</span>
                  <time dateTime={record.timestamp}>{formatter.format(new Date(record.timestamp))}</time>
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-history">No prophecies recorded yet.</p>
      )}
    </aside>
  );
}
