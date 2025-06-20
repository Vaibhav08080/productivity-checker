from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import openai
import os
from dotenv import load_dotenv
import base64
import requests
from datetime import datetime
import logging
load_dotenv()

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai.api_key = os.getenv("OPENAI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "images")

# Helper to upload to Supabase Storage
def upload_to_supabase_storage(file: UploadFile, content: bytes) -> str:
    filename = f"{datetime.utcnow().isoformat()}_{file.filename}"
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{filename}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": file.content_type,
        "x-upsert": "true"
    }
    res = requests.put(upload_url, headers=headers, data=content)
    if res.status_code not in (200, 201):
        logging.error(f"Failed to upload to Supabase Storage: {res.text}")
        raise HTTPException(status_code=500, detail=f"Failed to upload to Supabase Storage: {res.text}")
    # Public URL
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{filename}"
    return public_url

# Helper to insert session metadata into Supabase DB
def insert_session_metadata(employee_name: str, employee_pfp: str, date: str, summary: str, verdict: str, score: int, image_urls: list):
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "employee_name": employee_name,
        "employee_pfp": employee_pfp,
        "date": date,
        "summary": summary,
        "verdict": verdict,
        "score": score,
        "image_urls": image_urls
    }
    table_url = f"{SUPABASE_URL}/rest/v1/employee_sessions"
    res = requests.post(table_url, headers=headers, json=data)
    if res.status_code not in (200, 201):
        logging.error(f"Failed to insert session metadata: {res.text}")
        raise HTTPException(status_code=500, detail=f"Failed to insert session metadata: {res.text}")

@app.post("/upload")
async def upload_images(
    images: List[UploadFile] = File(...),
    employee_name: str = Form(...),
    employee_pfp: str = Form(...),  # URL to profile picture
    date: str = Form(...)
):
    if len(images) == 0 or len(images) > 18:
        raise HTTPException(status_code=400, detail="Please upload between 1 and 18 images.")
    image_urls = []
    base64_images = []
    filenames = []
    for img in images:
        content = await img.read()
        url = upload_to_supabase_storage(img, content)
        image_urls.append(url)
        filenames.append(img.filename)
        b64_content = base64.b64encode(content).decode('utf-8')
        base64_images.append(f"data:image/jpeg;base64,{b64_content}")
    # Compose a single prompt for all images
    messages = [
        {"role": "user", "content": [
            {"type": "text", "text": (
                f"You are an advanced AI productivity assistant for employee monitoring. "
                f"You will be given {len(images)} screenshots, each representing 15 minutes of an employee's workday. "
                f"Analyze ALL images together and provide a single, detailed summary of the employee's productivity and activities. "
                f"For each image, classify the MAIN activity (e.g., Excel/Working, Coding in VS Code, Reading Emails, Browsing Instagram, Watching YouTube, Idle/No Activity, etc). "
                f"If LinkedIn is visible, consider it PRODUCTIVE (for networking, recruiting, or business). "
                f"If you see social media (except LinkedIn), entertainment, or idle screens, count as unproductive. "
                f"If work tools, documents, code, or business communication are visible, count as productive. "
                f"Summarize the work session in 2-3 sentences, mentioning any patterns or notable activities. "
                f"Then, give a clear VERDICT: Was the employee mostly productive, unproductive, or mixed? "
                f"Finally, give a productivity SCORE out of 10 (10 = perfect productivity, 1 = no productivity). "
                f"Respond ONLY in this format (replace <>):\n"
                f"SUMMARY: <summary>\nVERDICT: <verdict>\nSCORE: <score>/10"
            )},
        ] + [
            {"type": "image_url", "image_url": {"url": img_url}}
            for img_url in base64_images
        ]}
    ]
    try:
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=800
        )
        summary = response.choices[0].message.content
        import re
        verdict_match = re.search(r'VERDICT:\s*(.+?)\n', summary)
        verdict = verdict_match.group(1).strip() if verdict_match else None
        score_match = re.search(r'SCORE:\s*(\d{1,2})/10', summary)
        score = int(score_match.group(1)) if score_match else None
    except Exception as e:
        logging.error(f"OpenAI API error: {e}")
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {e}")
    # Save session metadata (one row per session)
    insert_session_metadata(employee_name, employee_pfp, date, summary, verdict, score, image_urls)
    return {"summary": summary, "verdict": verdict, "score": score, "image_urls": image_urls}

@app.get("/sessions")
def get_sessions():
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    table_url = f"{SUPABASE_URL}/rest/v1/employee_sessions?select=*"
    res = requests.get(table_url, headers=headers)
    if res.status_code in (200, 201):
        return res.json()
    return []
