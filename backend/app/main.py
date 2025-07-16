from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
from pathlib import Path
import uuid
import os

import whisper

app = FastAPI(title="Ef-El Apis")

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Allow frontend origin during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Adjust if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI"}

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