# Ef-El Speech Lab

A web application for speech analysis and pronunciation improvement using AI.

## Features

- **Audio Recording**: Record speech directly in the browser
- **Speech Transcription**: Convert speech to text using OpenAI Whisper
- **AI Analysis**: Analyze speech accuracy using Google Gemini AI
- **Reading Materials**: Practice with built-in reading materials
- **Detailed Feedback**: Get comprehensive feedback on pronunciation and fluency

## Project Structure

```
ef_el_speech_lab/
├── backend/                 # FastAPI backend server
│   ├── app/
│   │   └── main.py         # Main application file
│   ├── uploads/            # Audio file storage
│   ├── requirements.txt    # Python dependencies
│   ├── .env               # Environment variables
│   ├── start_server.bat   # Windows start script
│   └── README.md          # Backend documentation
└── frontend/               # Next.js frontend
    └── ef_el/
        ├── src/
        │   └── app/
        │       ├── audio_recorder.tsx  # Main recording component
        │       ├── page.tsx           # Home page
        │       └── layout.tsx         # App layout
        ├── package.json       # Node.js dependencies
        └── start_frontend.bat # Windows start script
```

## Setup Instructions

### Prerequisites

- Python 3.11+ 
- Node.js 18+
- Google Gemini API key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   - Copy `.env.template` to `.env`
   - Add your Google Gemini API key to the `.env` file

4. Start the backend server:
   ```bash
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   
   Or on Windows, double-click `start_server.bat`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend/ef_el
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   
   Or on Windows, double-click `start_frontend.bat`

### Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## API Endpoints

- `GET /`: Health check and API information
- `GET /health`: Detailed health status
- `POST /upload-and-analyze`: Complete workflow (upload, transcribe, analyze)
- `POST /upload-audio-and-transcribe`: Upload and transcribe only
- `POST /analyze-speech`: Analyze speech comparison
- `POST /generate_text`: Generate text using Gemini

## Configuration

### Backend (.env file)
```
GEMINI_API_KEY=your_actual_api_key_here
```

### CORS Configuration
The backend is configured to accept requests from:
- http://localhost:3000
- http://127.0.0.1:3000

## Usage

1. Start both backend and frontend servers
2. Open http://localhost:3000 in your browser
3. Select a reading material from the list
4. Click "Start Recording" to record your speech
5. Click "Stop Recording" when finished
6. Click "Upload & Analyze Speech" to get AI feedback
7. Review your transcription and analysis results

## Troubleshooting

### Common Issues

1. **"Gemini API not configured"**: Ensure your API key is set in the `.env` file
2. **CORS errors**: Check that frontend is running on port 3000
3. **Module not found**: Ensure all dependencies are installed
4. **Audio recording not working**: Check browser microphone permissions

### Getting API Keys

- **Google Gemini**: Visit https://makersuite.google.com/app/apikey

## Technologies Used

- **Backend**: FastAPI, OpenAI Whisper, Google Gemini AI
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Audio**: Web Audio API, MediaRecorder API
