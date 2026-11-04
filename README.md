# Airbnb

A full-stack Airbnb-style booking application with a Node.js/Express API and a React single-page application.

## Architecture

This repository is a two-package project:

```text
.
|-- backend/       Express application, MongoDB models, REST API, EJS views, and tests
|-- frontend/      React + Vite single-page application
|-- ScreenShots/   Legacy application screenshots
`-- README.md
```

The backend continues to serve the legacy EJS experience and also exposes a JSON API under `/api`. The React frontend consumes that API with session cookies (`credentials: "include"`).

| Service | Default URL | Responsibility |
| --- | --- | --- |
| React frontend | `http://localhost:5173` | Browser UI during development |
| Express backend | `http://localhost:8080` | API, sessions, authentication, payments, uploads, and legacy EJS pages |
| MongoDB | Configured by `ATLASDB_URL` | Application and session data |

## Technology

- Frontend: React 19, React Router, Vite, Oxlint
- Backend: Node.js, Express, MongoDB/Mongoose, Passport (local and Google OAuth), EJS
- Integrations: Cloudinary uploads, Razorpay payments, Nodemailer, Chatbase widget
- Testing: Jest, Supertest, MongoDB Memory Server

## Prerequisites

- Node.js `20.18.0` (the backend's declared runtime)
- npm
- A MongoDB Atlas connection or compatible MongoDB instance

## Setup

Clone the repository, then install each package independently:

```bash
git clone https://github.com/Ganeshjh2004/Airbnb.git
cd Airbnb
npm --prefix backend ci
npm --prefix frontend ci
```

Create `backend/.env`. Never commit this file.

```env
ATLASDB_URL=your_mongodb_connection_string
SECRET=a_long_random_session_secret

CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_SECRET=your_razorpay_key_secret

GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8080/auth/google/callback

GMAIL_USER=your_smtp_email_address
GMAIL_PASS=your_smtp_password_or_app_password

# Comma-separated origins are supported.
ALLOWED_ORIGIN=http://localhost:5173
```

For local development, the frontend defaults to `http://localhost:8080/api`. To use a different API deployment, create `frontend/.env.local`:

```env
VITE_API_URL=https://your-api.example.com/api
```

## Run locally

Run the backend and frontend in separate terminals:

```bash
# Terminal 1
cd backend
npm run dev
```

```bash
# Terminal 2
cd frontend
npm run dev
```

Open `http://localhost:5173`. The backend is available at `http://localhost:8080`; legacy EJS pages can also be accessed there.

## Available commands

| Package | Command | Description |
| --- | --- | --- |
| Backend | `npm --prefix backend start` | Start Express on port 8080 |
| Backend | `npm --prefix backend run dev` | Start Express with nodemon |
| Backend | `npm --prefix backend test` | Run the Jest/Supertest suite |
| Frontend | `npm --prefix frontend run dev` | Start the Vite development server |
| Frontend | `npm --prefix frontend run build` | Create a production frontend build |
| Frontend | `npm --prefix frontend run lint` | Run Oxlint |

## Features

- Local and Google OAuth authentication with MongoDB-backed sessions
- Listing creation, editing, deletion, image uploads, search, and category filters
- REST endpoints for listings, authentication, bookings, dashboards, and reviews
- Razorpay order creation and server-side payment verification
- Booking conflict prevention, cancellations, invoices, and email notifications
- Reviews with validation and author-only deletion
- User and administrator flows, plus legacy EJS compatibility

## Security and configuration

- Keep `.env`, `.env.local`, credentials, payment secrets, and OAuth secrets out of Git.
- Configure `ALLOWED_ORIGIN` to the precise frontend origins that may send credentialed API requests.
- `RAZORPAY_SECRET`, Cloudinary credentials, SMTP credentials, and `SECRET` belong on the server only. Do not expose them through Vite variables.

## License

This project is licensed under the MIT License.
