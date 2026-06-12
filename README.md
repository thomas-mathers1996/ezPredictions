# The Football Oracle

The Football Oracle is an intentionally over-the-top football score prediction
application made for entertainment. Choose supported real teams for a
football-data.org informed prediction, or enter any home and away team manually
to use the deterministic fictional Oracle fallback. Either way, the cinematic
analysis sequence returns a score prediction between 0 and 3 goals for each side.

The interface is styled as a dramatic football intelligence command centre with
animated scanner graphics, live fictional metrics, recent local predictions, and
a chaos override mode.

## Technology

- React
- Vite
- TypeScript
- Vercel serverless functions
- Plain CSS
- Vitest

The browser app remains a Vite application suitable for Vercel. football-data.org
requests are made only from Vercel serverless functions in the `api` directory so
the API token is never exposed to browser code.

## Local installation

Install dependencies:

```bash
npm install
```

## Development

Start the Vite development server:

```bash
npm run dev
```

Vite will print the local URL to open in your browser.

To run the Vercel API functions locally, install or use the Vercel CLI and start
the project through Vercel:

```bash
cp .env.example .env
# Add your football-data.org token to .env:
# FOOTBALL_DATA_API_KEY=your_token_here
npx vercel dev
```

The app still works without a token. Missing or unavailable football-data.org
access activates Oracle fallback mode.

## Testing

Run the unit test suite:

```bash
npm test
```

The tests cover team normalization, stable hashing, seeded deterministic
predictions, score boundaries, weighted score thresholds, identical team
validation, prediction result structure, and chaos override score boundaries.

## Production build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Vercel deployment

Deploy on Vercel:

1. Import the repository in Vercel.
2. Use the default Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Create a football-data.org account.
4. Copy the API token.
5. Open the Vercel project.
6. Open Settings.
7. Open Environment Variables.
8. Add:
   - `FOOTBALL_DATA_API_KEY`
9. Enable it for Production and Preview.
10. Redeploy the application.

The API functions read the token with `process.env.FOOTBALL_DATA_API_KEY`.
Do not create a `VITE_` public token variable.

## football-data.org API usage

The application calls its own Vercel endpoints:

- `/api/competitions`
- `/api/teams?competition=...`
- `/api/team-form?teamId=...`
- `/api/prediction-data?homeTeamId=...&awayTeamId=...&competition=...`

Those functions call `https://api.football-data.org/v4` with the `X-Auth-Token`
header and return simplified JSON only. Responses include Vercel-compatible
cache headers to reduce football-data.org requests.

## Prediction modes

- **Data Backed Prediction**: uses available recent matches, goals scored, goals
  conceded, form, home/away records, and standings where football-data.org
  provides enough information.
- **Oracle Fallback Prediction**: uses the existing deterministic fictional model
  when data is unavailable, incomplete, rate limited, not configured, or manually
  entered.
- **Chaos Override**: generates a new random score between 0 and 3 for the same
  teams.

Football-data.org information may be used to inform some predictions. Final
predictions are generated for entertainment and should not be used for betting or
financial decisions. Football data is provided by football-data.org; the app does
not imply endorsement by football-data.org.
