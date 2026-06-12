import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { PredictionDataPayload } from './types/footballData';
import { createResultShareText } from './utils/share';

let reducedMotion = false;

const mockPredictionData: PredictionDataPayload = {
  competition: {
    id: 2021,
    code: 'PL',
    name: 'Premier League',
  },
  homeTeam: {
    id: 1,
    name: 'South Korea',
    shortName: 'Korea',
    tla: 'KOR',
    crest: 'https://example.com/korea.svg',
    areaName: 'Korea Republic',
  },
  awayTeam: {
    id: 2,
    name: 'New Zealand',
    shortName: 'NZ',
    tla: 'NZL',
    crest: null,
    areaName: 'New Zealand',
  },
  homeForm: {
    teamId: 1,
    teamName: 'South Korea',
    matchesAnalysed: 5,
    wins: 3,
    draws: 1,
    losses: 1,
    goalsScored: 8,
    goalsConceded: 5,
    averageGoalsScored: 1.6,
    averageGoalsConceded: 1,
    recentForm: 'WWDLW',
    homeResults: {
      matches: 3,
      wins: 2,
      draws: 1,
      losses: 0,
      goalsScored: 5,
      goalsConceded: 2,
    },
    awayResults: {
      matches: 2,
      wins: 1,
      draws: 0,
      losses: 1,
      goalsScored: 3,
      goalsConceded: 3,
    },
  },
  awayForm: {
    teamId: 2,
    teamName: 'New Zealand',
    matchesAnalysed: 5,
    wins: 2,
    draws: 2,
    losses: 1,
    goalsScored: 7,
    goalsConceded: 6,
    averageGoalsScored: 1.4,
    averageGoalsConceded: 1.2,
    recentForm: 'DWWLD',
    homeResults: {
      matches: 2,
      wins: 1,
      draws: 1,
      losses: 0,
      goalsScored: 3,
      goalsConceded: 2,
    },
    awayResults: {
      matches: 3,
      wins: 1,
      draws: 1,
      losses: 1,
      goalsScored: 4,
      goalsConceded: 4,
    },
  },
  standings: null,
};

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

  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.startsWith('/api/competitions')) {
      return jsonResponse({
        ok: true,
        data: [
          {
            id: 2021,
            code: 'PL',
            name: 'Premier League',
            emblem: null,
            areaName: 'England',
          },
        ],
      });
    }

    if (url.startsWith('/api/teams')) {
      return jsonResponse({
        ok: true,
        data: [mockPredictionData.homeTeam, mockPredictionData.awayTeam],
      });
    }

    if (url.startsWith('/api/prediction-data')) {
      return jsonResponse({
        ok: true,
        data: mockPredictionData,
      });
    }

    return jsonResponse({
      ok: false,
      code: 'UNEXPECTED_RESPONSE',
      message: 'Unexpected response received. Oracle fallback is available.',
      fallbackRecommended: true,
    }, 502);
  }));
}

function setup() {
  render(<App />);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function switchToManualMode() {
  fireEvent.click(screen.getByRole('button', { name: /manual oracle mode/i }));
}

function homeInput() {
  return screen.getByLabelText(/^home team$/i, { selector: 'input' });
}

function awayInput() {
  return screen.getByLabelText(/^away team$/i, { selector: 'input' });
}

function enterValidTeams() {
  switchToManualMode();
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
  expect(
    screen.getByRole('heading', { name: /data backed oracle prediction|oracle fallback prediction/i }),
  ).toBeInTheDocument();
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function selectRealTeams() {
  await flushPromises();
  fireEvent.change(screen.getByLabelText(/competition/i, { selector: 'select' }), {
    target: { value: 'PL' },
  });
  await flushPromises();
  fireEvent.change(screen.getByLabelText(/^home team$/i, { selector: 'select' }), {
    target: { value: '1' },
  });
  fireEvent.change(screen.getByLabelText(/^away team$/i, { selector: 'select' }), {
    target: { value: '2' },
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
  it('loads competitions and teams in Real Team Mode', async () => {
    setup();

    await flushPromises();
    expect(screen.getByRole('button', { name: /real team mode/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('option', { name: /premier league/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/competition/i, { selector: 'select' }), {
      target: { value: 'PL' },
    });
    await flushPromises();

    expect(screen.getAllByRole('option', { name: 'South Korea' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('option', { name: 'New Zealand' }).length).toBeGreaterThan(0);
  });

  it('rejects selecting the same real team twice', async () => {
    setup();

    await flushPromises();
    fireEvent.change(screen.getByLabelText(/competition/i, { selector: 'select' }), {
      target: { value: 'PL' },
    });
    await flushPromises();
    fireEvent.change(screen.getByLabelText(/^home team$/i, { selector: 'select' }), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText(/^away team$/i, { selector: 'select' }), {
      target: { value: '1' },
    });

    expect(screen.getByText(/home and away teams must be different/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate prediction/i })).toBeDisabled();
  });

  it('creates a data backed result in Real Team Mode', async () => {
    setup();

    await selectRealTeams();
    fireEvent.click(screen.getByRole('button', { name: /generate prediction/i }));
    await flushPromises();
    await finishPrediction();

    expect(screen.getByRole('heading', { name: /data backed oracle prediction/i })).toBeInTheDocument();
    expect(screen.getAllByText(/premier league/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/real performance metrics/i)).toBeInTheDocument();
  });

  it('activates Oracle fallback when Real Team Mode is rate limited', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith('/api/competitions')) {
        return jsonResponse({ ok: true, data: [{ id: 2021, code: 'PL', name: 'Premier League', emblem: null, areaName: 'England' }] });
      }

      if (url.startsWith('/api/teams')) {
        return jsonResponse({ ok: true, data: [mockPredictionData.homeTeam, mockPredictionData.awayTeam] });
      }

      return jsonResponse({
        ok: false,
        code: 'RATE_LIMITED',
        message: 'Football data rate limit reached. Oracle fallback is available.',
        fallbackRecommended: true,
      }, 429);
    });
    setup();

    await selectRealTeams();
    fireEvent.click(screen.getByRole('button', { name: /generate prediction/i }));
    await flushPromises();
    await finishPrediction();

    expect(screen.getByRole('heading', { name: /oracle fallback prediction/i })).toBeInTheDocument();
    expect(screen.getAllByText(/rate limit reached/i).length).toBeGreaterThan(0);
  });

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
    switchToManualMode();
    const generateButton = screen.getByRole('button', { name: /generate prediction/i });

    expect(generateButton).toBeDisabled();
    fireEvent.change(homeInput(), { target: { value: 'South Korea' } });

    expect(screen.getByText(/both team names are required/i)).toBeInTheDocument();
    expect(generateButton).toBeDisabled();
  });

  it('rejects whitespace only names', async () => {
    setup();
    switchToManualMode();

    fireEvent.change(homeInput(), { target: { value: '   ' } });
    fireEvent.change(awayInput(), { target: { value: 'New Zealand' } });

    expect(screen.getByText(/cannot contain only whitespace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate prediction/i })).toBeDisabled();
  });

  it('rejects identical normalized team names', async () => {
    setup();
    switchToManualMode();

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

    expect(screen.getByRole('heading', { name: /oracle fallback prediction/i })).toBeInTheDocument();
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

    expect(screen.getByRole('heading', { name: /oracle fallback prediction/i })).toBeInTheDocument();
  });
});
