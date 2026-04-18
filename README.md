# KrishiAI - Smart Farming Assistant

An AI-powered web application to help Indian farmers with crop suggestions, disease diagnosis, and fertilizer advice.

## Features

- **Login System**: Secure login to access the dashboard
- **AI Chatbot**: Bottom-right floating chatbot for quick queries
- **Dashboard**: Overview of recent advice and quick actions
- **Crop Suggestions**: Get personalized crop recommendations based on soil, season, and location
- **Disease Detection**: Diagnose crop diseases from symptoms
- **Fertilizer Advice**: Receive tailored fertilizer plans
- **Responsive Design**: Works on desktop and mobile devices

## Setup Instructions

## Production Checklist

- Never commit secret keys. Keep all keys in local env files or browser local storage only.
- Use [backend/.env.example](backend/.env.example) as the backend template.
- Keep [frontend/config.js](frontend/config.js) committed with non-secret defaults only.
- Verify [.gitignore](.gitignore) includes env file patterns.

### Backend Setup

1. Navigate to the `backend` folder:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create `backend/.env` from [backend/.env.example](backend/.env.example):
   ```
   cp .env.example .env
   ```

4. Leave the Google AI key blank unless you want a server-side fallback:
   ```
   GOOGLE_AI_API_KEY=
   ```
   The app now asks each user to paste their own Google AI API key in the dashboard and stores it locally in the browser. You can still set `GOOGLE_AI_API_KEY` on the server if you want a shared fallback.

5. Start the backend server:
   ```
   npm start
   ```
   The server will run on `http://localhost:3000`.

### Frontend

For local full-stack mode, once backend is running, open `http://localhost:3000` in your browser.

For static hosting mode, open [frontend/config.js](frontend/config.js) and choose one:

- `preferBackend: false` to call Gemini directly from the browser using user-entered key (GitHub Pages friendly)
- `preferBackend: true` with `apiBaseUrl` set to deployed backend URL

## GitHub Pages Deployment

This repo now includes [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).
It also includes [.github/workflows/ci.yml](.github/workflows/ci.yml) for syntax validation on pushes and PRs.

1. Push to `main`.
2. In GitHub, open Settings > Pages.
3. Set Source to GitHub Actions.
4. Wait for the workflow to publish the `frontend` folder.

After deploy:

- Email login runs in static mode on GitHub Pages.
- Google/mock login works normally.
- AI advice and chat use user-entered API key from the key banner.

## Production Notes

- Backend now enforces allowlisted CORS when `FRONTEND_URL` is set (comma-separated allowed origins).
- Backend sets baseline security headers (frame, referrer, mime-sniff, permissions, and HSTS on HTTPS).
- Add your production frontend domain(s) to `FRONTEND_URL` in backend env.
- Added root [_config.yml](_config.yml) and [.nojekyll](.nojekyll) so branch-based Pages/Jekyll builds do not parse backend dependencies.
- `backend/node_modules` must never be tracked in git; dependencies should be installed during runtime/CI only.

## Usage

1. **Login**: Use `farmer@example.com` / `farming123` or any valid email/password to login.
2. **Dashboard**: View recent advice and access features.
3. **AI Assistant**: Fill the form for detailed advice or use the chatbot.
4. **Chatbot**: Click the chat bubble at bottom-right for instant AI responses.

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **AI**: Google Gemini 2.5 Flash
- **Database**: MongoDB (optional, for storing queries)

## API Endpoints

- `POST /api/farming/advice` - General AI advice
- `POST /api/farming/crops` - Crop suggestions
- `POST /api/farming/disease` - Disease analysis
- `POST /api/farming/fertilizer` - Fertilizer plans

## Contributing

Built for educational purposes. Feel free to enhance and contribute.
