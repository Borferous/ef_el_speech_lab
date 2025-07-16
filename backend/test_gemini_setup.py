import os
import google.generativeai as genai
from pathlib import Path

# Try to load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=".env")
except ImportError:
    # If dotenv is not available, try to read .env file manually
    env_path = Path(".env")
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    # Remove quotes if present
                    value = value.strip('"').strip("'")
                    os.environ[key] = value

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
print(f"API Key loaded: {'Yes' if GEMINI_API_KEY else 'No'}")
print(f"API Key (first 10 chars): {GEMINI_API_KEY[:10] if GEMINI_API_KEY else 'None'}")

if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        response = model.generate_content("Hello, can you respond with 'API is working'?")
        print(f"Response: {response.text}")
        print("✅ Gemini API is working correctly!")
        
    except Exception as e:
        print(f"❌ Error with Gemini API: {e}")
        print(f"Error type: {type(e).__name__}")
else:
    print("❌ No API key found")
