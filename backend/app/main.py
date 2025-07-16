from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
from pathlib import Path
import uuid
import os
import json

import whisper
import google.generativeai as genai

# Try to load environment variables from .env file
import os
print(f"🔍 Current working directory: {os.getcwd()}")
try:
    from dotenv import load_dotenv
    # Try multiple possible paths for the .env file
    possible_paths = [".env", "../.env", "../../.env", "backend/.env"]
    env_loaded = False
    
    for path in possible_paths:
        try:
            load_dotenv(dotenv_path=path)
            if os.path.exists(path):
                print(f"✅ Loaded .env using dotenv from: {Path(path).absolute()}")
                env_loaded = True
                break
        except:
            continue
    
    if not env_loaded:
        print("⚠️ Could not load .env with dotenv")
        
except ImportError:
    print("📦 dotenv not available, trying manual .env reading")
    
# If dotenv is not available or didn't work, try to read .env file manually
possible_paths = [".env", "../.env", "../../.env", "backend/.env"]
for env_path_str in possible_paths:
    env_path = Path(env_path_str)
    print(f"🔍 Checking for .env file at: {env_path.absolute()}")
    if env_path.exists():
        print(f"✅ Found .env file at: {env_path.absolute()}")
        with open(env_path) as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    if '=' in line:
                        key, value = line.strip().split('=', 1)
                        # Remove quotes if present
                        value = value.strip('"').strip("'")
                        os.environ[key] = value
                        print(f"✅ Set {key} = {value[:10]}...")
        break
else:
    print("❌ .env file not found in any expected location")

app = FastAPI(title="Ef-El Apis")

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Configure Gemini AI (you'll need to set your API key as environment variable)
# Set your API key: export GEMINI_API_KEY="your_api_key_here"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"✅ Gemini API configured with key: {GEMINI_API_KEY[:10]}...")
else:
    print("⚠️  No Gemini API key found")

# Pydantic models for request/response
class AnalysisRequest(BaseModel):
    original_text: str
    transcribed_text: str

class PromptRequest(BaseModel):
    prompt: str

# Allow frontend origin during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Both localhost and 127.0.0.1
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "message": "Ef-El Speech Lab API is running",
        "version": "1.0.0",
        "endpoints": {
            "upload_audio": "/upload-audio",
            "transcribe": "/upload-audio-and-transcribe",
            "analyze": "/analyze-speech",
            "upload_and_analyze": "/upload-and-analyze",
            "generate_text": "/generate_text"
        },
        "gemini_configured": bool(GEMINI_API_KEY),
        "whisper_available": True
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "gemini_api": "configured" if GEMINI_API_KEY else "not_configured",
        "whisper": "available"
    }

@app.post("/upload-audio")
async def upload_audio(audio_file: UploadFile = File(...)):
    try:
        # Validate file type
        if not audio_file.content_type.startswith("audio/"):
            raise HTTPException(status_code=400, detail="File must be audio")
        
        # Generate unique filename
        file_extension = os.path.splitext(audio_file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
            
        return {
            "status": "success",
            "filename": unique_filename,
            "file_path": str(file_path)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-audio-and-transcribe")
async def upload_audio_and_transcribe(audio_file: UploadFile = File(...)):
    try:
        # Validate file type
        if not audio_file.content_type.startswith("audio/"):
            raise HTTPException(status_code=400, detail="File must be audio")
        
        # Generate unique filename
        file_extension = os.path.splitext(audio_file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
          # Transcribe audio using Whisper
        model = whisper.load_model("base")
        result = model.transcribe(str(file_path), language="en")

        # 

        return {
            "status": "success",
            "filename": unique_filename,
            "transcription": result["text"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-speech")
async def analyze_speech(request: AnalysisRequest):
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
        
        # Create the analysis prompt
        prompt = f"""
        You are an expert speech and language analyst. Please analyze the following speech transcription for accuracy and fluency.

        Original Text: "{request.original_text}"
        Transcribed Text: "{request.transcribed_text}"

        Please provide a detailed analysis in the following JSON format:
        {{
            "accuracy_score": <number between 0-100>,
            "fluency_score": <number between 0-100>,
            "overall_score": <number between 0-100>,
            "word_accuracy": <percentage of correctly transcribed words>,
            "missing_words": ["list", "of", "missing", "words"],
            "incorrect_words": [
                {{"original": "word1", "transcribed": "word2"}},
                {{"original": "word3", "transcribed": "word4"}}
            ],
            "strengths": ["list", "of", "positive", "aspects"],
            "areas_for_improvement": ["list", "of", "suggestions"],
            "detailed_feedback": "Comprehensive feedback paragraph"
        }}

        Focus on:
        1. Word accuracy (how many words were correctly transcribed)
        2. Pronunciation clarity (based on transcription accuracy)
        3. Missing or added words
        4. Overall speech quality indicators
        5. Specific recommendations for improvement

        Provide scores as integers from 0-100 where 100 is perfect.
        """

        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Generate analysis
        response = model.generate_content(prompt)
        
        # Parse the JSON response
        try:
            # Extract JSON from the response text
            response_text = response.text
            # Find JSON content (remove any markdown formatting)
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_content = response_text[json_start:json_end]
            elif "{" in response_text and "}" in response_text:
                json_start = response_text.find("{")
                json_end = response_text.rfind("}") + 1
                json_content = response_text[json_start:json_end]
            else:
                json_content = response_text
            
            analysis_result = json.loads(json_content)
            
            return {
                "status": "success",
                "analysis": analysis_result
            }
            
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return {
                "status": "success",
                "analysis": {
                    "accuracy_score": 0,
                    "fluency_score": 0,
                    "overall_score": 0,
                    "word_accuracy": 0,
                    "missing_words": [],
                    "incorrect_words": [],
                    "strengths": [],
                    "areas_for_improvement": ["Unable to parse detailed analysis"],
                    "detailed_feedback": response.text
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/upload-and-analyze")
async def upload_and_analyze(audio_file: UploadFile = File(...), original_text: str = ""):
    """
    Combined endpoint that uploads audio, transcribes it, and analyzes it against original text
    """
    try:
        # Validate file type
        if not audio_file.content_type.startswith("audio/"):
            raise HTTPException(status_code=400, detail="File must be audio")
        
        # Generate unique filename
        file_extension = os.path.splitext(audio_file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
        
        # Transcribe audio using Whisper
        try:
            model = whisper.load_model("small")
            result = model.transcribe(str(file_path), language="en")
            transcribed_text = result["text"]
        except Exception as whisper_error:
            # Clean up the uploaded file if transcription fails
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(whisper_error)}")
        
        # Analyze speech if original text is provided and Gemini is configured
        analysis = None
        if original_text and GEMINI_API_KEY:
            try:
                analysis_request = AnalysisRequest(
                    original_text=original_text,
                    transcribed_text=transcribed_text
                )
                analysis_response = await analyze_speech(analysis_request)
                analysis = analysis_response["analysis"]
            except Exception as e:
                print(f"Analysis failed: {e}")
                analysis = {"error": "Analysis failed", "details": str(e)}

        return {
            "status": "success",
            "filename": unique_filename,
            "transcription": transcribed_text,
            "analysis": analysis
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate_text")
async def generate_text_endpoint(request: PromptRequest):
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
        
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(request.prompt)
        return {"generated_text": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling Gemini API: {e}")

