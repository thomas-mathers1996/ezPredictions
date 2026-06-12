import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createResultShareText } from './utils/share';

let reducedMotion = false;

function installBrowserMocks() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reducedMotion,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: 1024,
  });

  Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });

  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: undefined,
  });
}

function setup() {
  render(<App />);
}

function homeInput() {
  return screen.getByLabelText(/^home team$/i, { selector: 'input' });
}

function awayInput() {
  return screen.getByLabelText(/^away team$/i, { selector: 'input' });
}

function enterValidTeams() {
  fireEvent.change(homeInput(), { target: { value: 'South Korea' } });
  fireEvent.change(awayInput(), { target: { value: 'New Zealand' } });
}

function startPrediction() {
  enterValidTeams();
  fireEvent.click(screen.getByRole('button', { name: /generate prediction/i }));
}

async function finishPrediction() {
  act(() => {
    vi.advanceTimersByTime(reducedMotion ? 1000 : 5200);
  });
  expect(screen.getByRole('heading', { name: /result locked/i })).toBeInTheDocument();
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  reducedMotion = false;
  vi.useFakeTimers();
  installBrowserMocks();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Football Oracle app', () => {
  it('opens the User Manual', async () => {
    setup();

    fireEvent.click(screen.getByRole('button', { name: /user manual/i }));

    expect(screen.getByRole('dialog', { name: /football oracle user manual/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what this app does/i })).toBeInTheDocument();
  });

  it('closes the User Manual using its Close button', async () => {
    setup();

    fireEvent.click(screen.getByRole('button', { name: /user manual/i }));
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));

    expect(screen.queryByRole('dialog', { name: /football oracle user manual/i })).not.toBeInTheDocument();
  });

  it('closes the User Manual with Escape and returns focus to the User Manual button', async () => {
    setup();
    const manualButton = screen.getByRole('button', { name: /user manual/i });

    manualButton.focus();
    fireEvent.click(manualButton);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: /football oracle user manual/i })).not.toBeInTheDocument();
    expect(manualButton).toHaveFocus();
  });

  it('rejects missing team names and keeps Generate Prediction disabled when incomplete', async () => {
    setup();
    const generateButton = screen.getByRole('button', { name: /generate prediction/i });

    expect(generateButton).toBeDisabled();
    fireEvent.change(homeInput(), { target: { value: 'South Korea' } });

    expect(screen.getByText(/both team names are required/i)).toBeInTheDocument();
    expect(generateButton).toBeDisabled();
  });

  it('rejects whitespace only names', async () => {
    setup();

    fireEvent.change(homeInput(), { target: { value: '   ' } });
    fireEvent.change(awayInput(), { target: { value: 'New Zealand' } });

    expect(screen.getByText(/cannot contain only whitespace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate prediction/i })).toBeDisabled();
  });

  it('rejects identical normalized team names', async () => {
    setup();

    fireEvent.change(homeInput(), { target: { value: 'Korea FC!!' } });
    fireEvent.change(awayInput(), { target: { value: 'korea   fc' } });

    expect(screen.getByText(/must be different after oracle normalization/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate prediction/i })).toBeDisabled();
  });

  it('starts a valid prediction when Enter is pressed in a team field', async () => {
    setup();

    enterValidTeams();
    expect(screen.getByRole('button', { name: /generate prediction/i })).toBeEnabled();
    fireEvent.submit(screen.getByRole('button', { name: /generate prediction/i }).closest('form')!);

    expect(screen.getByRole('progressbar', { name: /oracle analysis progress/i })).toBeInTheDocument();
    expect(screen.getByText(/prediction started/i)).toBeInTheDocument();
  });

  it('prevents multiple predictions from starting simultaneously', async () => {
    setup();

    startPrediction();

    expect(screen.queryByRole('button', { name: /generate prediction/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel prediction/i })).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar', { name: /oracle analysis progress/i })).toHaveLength(1);
  });

  it('Predict Another Match returns to the form with previous team names available', async () => {
    setup();

    startPrediction();
    await finishPrediction();
    fireEvent.click(screen.getByRole('button', { name: /predict another match/i }));

    expect(homeInput()).toHaveValue('South Korea');
    expect(awayInput()).toHaveValue('New Zealand');
  });

  it('Chaos Override produces scores between 0 and 3 and labels the result', async () => {
    setup();

    startPrediction();
    await finishPrediction();
    fireEvent.click(screen.getByRole('button', { name: /run chaos override/i }));

    expect(screen.getByRole('heading', { name: /chaos override active/i })).toBeInTheDocument();
    const scoreboard = screen.getByLabelText(/predicted score/i);
    const scores = within(scoreboard)
      .getAllByText(/^[0-3]$/)
      .map((score) => Number(score.textContent));

    expect(scores).toHaveLength(2);
    expect(scores.every((score) => score >= 0 && score <= 3)).toBe(true);
  });

  it('Share Result sends the correct text to the browser Share API', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    });
    setup();

    startPrediction();
    await finishPrediction();
    fireEvent.click(screen.getByRole('button', { name: /share result/i }));
    await flushPromises();

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringMatching(
          /^The Football Oracle predicts:\n\nSouth Korea \d\nNew Zealand \d\n\nOracle confidence: \d+%$/,
        ),
      }),
    );
    expect(screen.getByText(/result shared/i)).toBeInTheDocument();
  });

  it('falls back to copying the share text to the clipboard', async () => {
    setup();

    startPrediction();
    await finishPrediction();
    fireEvent.click(screen.getByRole('button', { name: /share result/i }));
    await flushPromises();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringMatching(
        /^The Football Oracle predicts:\n\nSouth Korea \d\nNew Zealand \d\n\nOracle confidence: \d+%$/,
      ),
    );
    expect(screen.getByText(/result copied/i)).toBeInTheDocument();
  });

  it('builds a readable share summary', () => {
    const text = createResultShareText({
      homeTeam: 'South Korea',
      awayTeam: 'New Zealand',
      normalizedHomeTeam: 'south korea',
      normalizedAwayTeam: 'new zealand',
      seedInput: 'home:south korea|away:new zealand',
      seed: 1,
      homeScore: 1,
      awayScore: 0,
      outcome: 'home',
      outcomeLabel: 'Predicted winner: South Korea',
      confidence: 81,
      metrics: {
        tacticalEntropy: 50,
        goalProbability: 50,
        midfieldResonance: 50,
        defensiveDensity: 50,
        strikerConfidence: 50,
        crowdPressure: 50,
        chaosCoefficient: 50,
        octopusCertainty: 50,
      },
      analysisSentence: 'The Oracle has spoken.',
      supportingStatistics: [],
      mode: 'oracle',
    });

    expect(text).toBe(
      'The Football Oracle predicts:\n\nSouth Korea 1\nNew Zealand 0\n\nOracle confidence: 81%',
    );
  });

  it('saves recent predictions and reopens saved results without rerunning the animation', async () => {
    setup();

    startPrediction();
    await finishPrediction();

    const savedResultButton = screen.getByRole('button', { name: /view saved result/i });
    expect(window.localStorage.getItem('football-oracle:recent-prophecies')).toContain('South Korea');

    fireEvent.click(screen.getByRole('button', { name: /predict another match/i }));
    fireEvent.click(savedResultButton);

    expect(screen.getByRole('heading', { name: /result locked/i })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: /oracle analysis progress/i })).not.toBeInTheDocument();
  });

  it('requires confirmation before history can be cleared and then clears it', async () => {
    setup();

    startPrediction();
    await finishPrediction();
    fireEvent.click(screen.getByRole('button', { name: /clear history/i }));

    expect(screen.getByText(/delete all saved prophecies/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view saved result/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm clear/i }));

    expect(screen.getByText(/no prophecies recorded yet/i)).toBeInTheDocument();
    expect(window.localStorage.getItem('football-oracle:recent-prophecies')).toBe('[]');
  });

  it('does not crash when local storage contains malformed data', () => {
    window.localStorage.setItem('football-oracle:recent-prophecies', '{"broken":true');

    setup();

    expect(screen.getByText(/no prophecies recorded yet/i)).toBeInTheDocument();
  });

  it('keeps reduced motion prediction flow functional', async () => {
    reducedMotion = true;
    installBrowserMocks();
    setup();

    startPrediction();
    expect(screen.getByText(/reduced motion protocol active/i)).toBeInTheDocument();
    await finishPrediction();

    expect(screen.getByRole('heading', { name: /result locked/i })).toBeInTheDocument();
  });
});
