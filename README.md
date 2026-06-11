# The Football Oracle

The Football Oracle is an intentionally over-the-top football score prediction
application made for entertainment. Enter a home team and an away team, initiate
the cinematic fake analysis sequence, and receive a fictional score prediction
between 0 and 3 goals for each side.

The interface is styled as a dramatic football intelligence command centre with
animated scanner graphics, live fictional metrics, recent local predictions, and
a chaos override mode.

## Technology

- React
- Vite
- TypeScript
- Plain CSS
- Vitest

The app is a static Vite application. It does not use a database,
authentication, API server, backend service, or environment variables.

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

Deploy as a static Vite application on Vercel:

1. Import the repository in Vercel.
2. Use the default Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
3. No environment variables are required.
4. Deploy.

## Fictional calculations

All predictions, confidence values, live metrics, and supporting statistics are
fictional and generated for entertainment purposes only. The normal prediction
path is deterministic for the same normalized home and away team names on the
same application version, but it does not use real match data.
