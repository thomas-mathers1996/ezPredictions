import { RefObject } from 'react';
import { Modal } from './Modal';

type UserManualProps = {
  isOpen: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

const DISCLAIMER =
  'The Football Oracle is an entertainment app. It does not use real football statistics and should not be used for betting or financial decisions.';

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
            The Football Oracle generates fictional football predictions for entertainment. It
            does not use real match data, real team form, real injuries, or real football
            statistics.
          </p>
        </section>

        <section>
          <h3>How to Make a Prediction</h3>
          <ol>
            <li>Enter the home team.</li>
            <li>Enter the away team.</li>
            <li>Select Generate Prediction.</li>
            <li>Wait while the Oracle completes its calculations.</li>
            <li>Review the predicted score and confidence level.</li>
          </ol>
        </section>

        <section>
          <h3>Prediction Types</h3>
          <h4>Standard Prediction</h4>
          <p>
            The standard prediction is deterministic. The same teams entered in the same order
            should normally produce the same result.
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
