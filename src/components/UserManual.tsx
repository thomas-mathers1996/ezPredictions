import { RefObject } from 'react';
import { Modal } from './Modal';

type UserManualProps = {
  isOpen: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

const DISCLAIMER =
  'Football-data.org information may be used to inform some predictions. Final predictions are generated for entertainment and should not be used for betting or financial decisions.';

export function UserManual({ isOpen, onClose, returnFocusRef }: UserManualProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      title="Football Oracle User Manual"
      titleId="user-manual-title"
    >
      <div className="manual-content">
        <section>
          <h3>What This App Does</h3>
          <p>
            The Football Oracle generates football predictions for entertainment. Real Team Mode
            may use recent football information where available, while Manual Oracle Mode keeps the
            fictional deterministic Oracle calculation available for any team names.
          </p>
        </section>

        <section>
          <h3>How to Make a Prediction</h3>
          <ol>
            <li>Select Real Team Mode or Manual Oracle Mode.</li>
            <li>Choose a supported competition and teams, or enter two manual team names.</li>
            <li>Select Generate Prediction.</li>
            <li>Wait while the Oracle completes its calculations.</li>
            <li>Review the predicted score and confidence level.</li>
          </ol>
        </section>

        <section>
          <h3>Real Team Mode</h3>
          <p>
            Select a competition and two supported teams. Recent football information from
            football-data.org may influence the result when the service has enough completed match
            data.
          </p>
        </section>

        <section>
          <h3>Manual Oracle Mode</h3>
          <p>
            Enter any two teams and receive a fictional deterministic prediction. This mode is also
            used as the Oracle fallback when verified data is unavailable.
          </p>
        </section>

        <section>
          <h3>Prediction Types</h3>
          <h4>Data Backed Predictions</h4>
          <p>
            Available recent matches, goals scored, goals conceded, form, home and away records, and
            standings may be considered. Not every competition or team is available.
          </p>
          <h4>Oracle Fallback</h4>
          <p>
            The existing fictional model is used when verified data is unavailable, insufficient,
            rate limited, or manually entered.
          </p>
          <h4>Chaos Override</h4>
          <p>
            Chaos Override generates a new random result for the selected teams. It is deliberately
            unstable and clearly labelled when active.
          </p>
        </section>

        <section>
          <h3>Home and Away Teams</h3>
          <p>
            Team order matters. Swapping the home and away teams may change the generated result
            because the Oracle treats the home vector as part of the calculation.
          </p>
        </section>

        <section>
          <h3>API Availability</h3>
          <p>
            The external football service may occasionally be unavailable, return incomplete data,
            or be rate limited. The app remains usable by activating Oracle fallback mode.
          </p>
        </section>

        <section>
          <h3>Recent Predictions</h3>
          <p>
            Recent predictions are stored only in the current browser using local storage. They do
            not leave your device and can be cleared from the recent prophecies panel.
          </p>
        </section>

        <section>
          <h3>Sharing Results</h3>
          <p>
            The Share Result button uses the device sharing menu when available. When that is not
            available, it copies a readable result summary to the clipboard.
          </p>
        </section>

        <section className="manual-disclaimer">
          <h3>Important Disclaimer</h3>
          <p>{DISCLAIMER}</p>
        </section>
      </div>
    </Modal>
  );
}

export { DISCLAIMER };
