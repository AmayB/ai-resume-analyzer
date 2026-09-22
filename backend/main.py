import json
import os
from io import BytesIO

import pymupdf
from docx import Document
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI


load_dotenv()


# --------------------------------------------------
# Hugging Face setup
# --------------------------------------------------

hf_token = os.getenv("HF_TOKEN")

if not hf_token:
    raise RuntimeError(
        "HF_TOKEN is missing. Add it to backend/.env"
    )


client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=hf_token,
)


# --------------------------------------------------
# FastAPI
# --------------------------------------------------

app = FastAPI(
    title="AI Resume Analyzer API",
    description="Backend for the AI Resume Analyzer",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://resumeanalyze.amaybhardwaj.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Resume extraction
# --------------------------------------------------

def extract_pdf_text(file_bytes: bytes) -> str:
    document = pymupdf.open(
        stream=file_bytes,
        filetype="pdf",
    )

    pages = []

    for page in document:
        pages.append(page.get_text())

    document.close()

    return "\n".join(pages).strip()


def extract_docx_text(file_bytes: bytes) -> str:
    document = Document(BytesIO(file_bytes))

    paragraphs = []

    for paragraph in document.paragraphs:
        if paragraph.text.strip():
            paragraphs.append(paragraph.text)

    return "\n".join(paragraphs).strip()


# --------------------------------------------------
# AI analysis
# --------------------------------------------------

def analyze_with_ai(
    resume_text: str,
    job_description: str,
) -> dict:

    prompt = f"""
You are an expert technical recruiter and resume analyst.

Analyze the candidate's resume against the provided job description.

Identify:

1. Skills that clearly match.
2. Skills that are missing.
3. Skills that are weakly demonstrated.
4. Important job-description keywords missing from the resume.
5. Specific resume improvement recommendations.
6. Examples of improved resume bullets.

IMPORTANT:

- Never invent experience.
- Only mark a skill as matched when the resume provides evidence.
- Never tell the candidate to claim experience they do not have.
- Improved bullets may only strengthen information already present.
- Be concise and specific.

MATCH SCORE:

0-39 = weak alignment
40-59 = some alignment
60-74 = moderate alignment
75-89 = strong alignment
90-100 = very strong alignment

Return ONLY valid JSON using this exact structure:

{{
  "match_score": 0,
  "summary": "Short summary of the match.",
  "matched_skills": [
    {{
      "skill": "Python",
      "evidence": "Evidence from the resume."
    }}
  ],
  "missing_skills": [
    {{
      "skill": "Docker",
      "importance": "High",
      "reason": "Why this matters for the job."
    }}
  ],
  "weak_skills": [
    {{
      "skill": "AWS",
      "reason": "Why the resume does not demonstrate this strongly."
    }}
  ],
  "keyword_gaps": [
    "Docker",
    "PostgreSQL"
  ],
  "recommendations": [
    "Specific recommendation."
  ],
  "bullet_improvements": [
    {{
      "original": "Existing resume bullet.",
      "improved": "Improved version."
    }}
  ]
}}

RESUME:
----------------
{resume_text}
----------------

JOB DESCRIPTION:
----------------
{job_description}
----------------
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        temperature=0.2,
    )

    text = response.choices[0].message.content.strip()

    # Handle models that wrap JSON in markdown fences
    if text.startswith("```"):
        text = text.replace("```json", "")
        text = text.replace("```", "")
        text = text.strip()

    return json.loads(text)


# --------------------------------------------------
# Routes
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "AI Resume Analyzer API is running"
    }


@app.post("/analyze")
async def analyze_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
):
    if not resume.filename:
        return {
            "error": "No file was provided."
        }

    file_bytes = await resume.read()

    filename = resume.filename.lower()

    if filename.endswith(".pdf"):
        resume_text = extract_pdf_text(file_bytes)

    elif filename.endswith(".docx"):
        resume_text = extract_docx_text(file_bytes)

    else:
        return {
            "error": "Please upload a PDF or DOCX file."
        }

    if not resume_text:
        return {
            "error": "Could not extract any text from the resume."
        }

    if not job_description.strip():
        return {
            "error": "Job description cannot be empty."
        }

    try:
        analysis = analyze_with_ai(
            resume_text,
            job_description,
        )

        return {
            "filename": resume.filename,
            "analysis": analysis,
        }

    except json.JSONDecodeError:
        print("AI returned invalid JSON.")

        return {
            "error": "AI returned an invalid analysis format."
        }

    except Exception as error:
        print(f"AI analysis error: {error}")

        return {
            "error": "AI analysis failed. Check the backend terminal."
        }