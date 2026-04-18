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

### Backend Setup

1. Navigate to the `backend` folder:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the `backend` folder and leave the Google AI key blank unless you want a server-side fallback:
   ```
   GOOGLE_AI_API_KEY=
   ```
   The app now asks each user to paste their own Google AI API key in the dashboard and stores it locally in the browser. You can still set `GOOGLE_AI_API_KEY` on the server if you want a shared fallback.

4. Start the backend server:
   ```
   npm start
   ```
   The server will run on `http://localhost:3000`.

### Frontend

The frontend is served by the backend, so once the backend is running, open `http://localhost:3000` in your browser.

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
