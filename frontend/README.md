# Airbnb frontend

The frontend is a React 19 single-page application built with Vite. It uses React Router for client-side navigation and calls the Express JSON API with browser session cookies.

## Requirements

- Node.js 20.18.0 or later
- The backend running on `http://localhost:8080` by default

## Install and run

From this directory:

```bash
npm ci
npm run dev
```

Vite starts at `http://localhost:5173` by default. The app calls `http://localhost:8080/api` unless `VITE_API_URL` is configured.

## Environment configuration

Create `.env.local` when the API is not running on the default local URL:

```env
VITE_API_URL=https://your-api.example.com/api
```

Only values prefixed with `VITE_` are exposed to browser code. Never add backend secrets, database URLs, payment secrets, or OAuth client secrets here.

When running the frontend on a different origin, set the backend's `ALLOWED_ORIGIN` to that exact frontend origin so credentialed requests are accepted.

## Commands

```bash
npm run dev      # Start the Vite development server
npm run build    # Build static production assets into dist/
npm run preview  # Preview the production build locally
npm run lint     # Run Oxlint
```

## Application structure

```text
src/
|-- api/         Fetch client and API base URL handling
|-- components/  Shared UI components
|-- context/     Authentication state
|-- pages/       Route-level pages
|-- App.jsx      Route definitions
`-- main.jsx     React entry point
```

The backend retains legacy EJS pages; this frontend is the modern client for the same application and API.
