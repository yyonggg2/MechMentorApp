import os
import uuid
import json
import io
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
from PIL import Image

from . import models, schemas
from .database import SessionLocal, engine, get_db

# --- Environment Loading ---
project_root = Path(__file__).resolve().parent.parent
dotenv_path = project_root / '.env'
load_dotenv(dotenv_path=dotenv_path)

# This section will be replaced by the lifespan manager

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Application Setup ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the AI models on startup
    logger.info("Initializing AI clients...")
    try:
        import google.generativeai as genai
        gemini_api_key = os.getenv("GOOGLE_API_KEY")
        if not gemini_api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not found.")
        genai.configure(api_key=gemini_api_key)
        app.state.genai_model = genai.GenerativeModel('gemini-1.5-pro-latest')
        app.state.genai_flash_model = genai.GenerativeModel('gemini-1.5-flash-latest')
        logger.info("AI clients initialized successfully.")
    except (ImportError, Exception) as e:
        logger.critical(f"CRITICAL ERROR configuring Google AI clients: {e}", exc_info=True)
        # In a real app, you might want to prevent startup entirely
        app.state.genai_model = None
        app.state.genai_flash_model = None
    
    # Create DB tables
    logger.info("Creating database tables if they don't exist.")
    create_db_and_tables()
    
    yield
    
    # Clean up resources on shutdown (if any)
    logger.info("Shutting down application.")

def create_db_and_tables():
    models.Base.metadata.create_all(bind=engine)

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# --- Job Store ---
jobs = {}

# --- Background Worker ---
async def run_analysis_in_background(
    request: Request,
    job_id: str,
    document_content: Optional[bytes],
    diagram_info: Optional[dict]
):
    logger.info(f"Starting analysis for job_id: {job_id}")
    genai_model = request.app.state.genai_model
    if not genai_model:
        logger.error(f"[{job_id}] AI model not available, failing job.")
        jobs[job_id] = {"status": "failed", "error": "AI model not initialized."}
        return

    try:
        key_terms = []
        diagram_labels = []
        original_text = ""

        if document_content:
            logger.info(f"[{job_id}] Analyzing document...")
            original_text = document_content.decode('utf-8', errors='ignore')
            prompt = f"""
From the text provided below, identify all key technical terms, materials, and components.
Return the result as a single, valid JSON object with a single key "terms" which is a list of strings.
Example: {{"terms": ["polycarbonate", "servo motor", "chassis"]}}
Text to analyze:
{original_text}
"""
            text_response = genai_model.generate_content(prompt)
            cleaned_response_text = text_response.text.strip().replace('`', '').replace('json', '')
            key_terms = json.loads(cleaned_response_text).get("terms", [])
            logger.info(f"[{job_id}] Document analysis complete. Found {len(key_terms)} terms.")

        if diagram_info:
            logger.info(f"[{job_id}] Analyzing diagram...")
            img_byte_arr = io.BytesIO()
            try:
                with Image.open(io.BytesIO(diagram_info["content"])) as img:
                    if img.mode == 'RGBA':
                        img = img.convert('RGB')
                    img.save(img_byte_arr, format='JPEG')
                logger.info(f"[{job_id}] Image processed successfully.")
            except Exception as img_e:
                logger.error(f"[{job_id}] Error processing image: {img_e}", exc_info=True)
                raise

            image_bytes = img_byte_arr.getvalue()
            image_parts = [{"mime_type": "image/jpeg", "data": image_bytes}]

            image_prompt = """
Act as an expert mechanical engineering mentor analyzing a technical diagram for a robotics student.
Your task is to identify a WIDE VARIETY of distinct components.

**CRITICAL INSTRUCTION: DUPLICATE LABELS ARE STRICTLY FORBIDDEN. Each "label" must be unique.**

**Chain of Thought Process:**
1.  **Initial Scan:** Mentally identify every single visible component in the image.
2.  **Filtering:** From your initial list, discard any labels that are generic, unhelpful, or duplicates.
    - **BAD:** "structure", "frame", "plate", "screw", "bolt", "upper plate", "lower bracket", "assembling piece"
    - **GOOD:** "star wheel", "motor mount", "bearing block", "gusset", "spur gear", "bevel gear"
3.  **Selection:** Select only the most important, specific, and uniquely named components. The label should be the technical name of the part, without adjectives describing its position (e.g., "gusset", not "left gusset"). Focus on parts critical to the mechanism's function.
4.  **Description:** For each selected component, write a concise, functional description.
5.  **Bounding Box:** For each selected component, define its bounding box.
6.  **Final Review:** Before generating the JSON, review your list one last time to ensure there are absolutely no duplicate labels.

**Output Format:**
Return a single, valid JSON object with a single key "labels".
The "labels" key should contain a list of objects, where each object has:
1. "label": A string identifying the specific, named component. **This MUST be unique within the list.**
2. "description": A brief, one-sentence explanation of that component's primary function in the assembly.
3. "box": A list of four numbers representing the bounding box [x_min, y_min, x_max, y_max], normalized between 0 and 1.

Example for an image of a planetary gearbox:
{
  "labels": [
    {
      "label": "Sun Gear",
      "description": "The central gear that meshes with the planet gears to determine the overall gear ratio.",
      "box": [0.4, 0.4, 0.6, 0.6]
    },
    {
      "label": "Planet Gear",
      "description": "Multiple gears that revolve around the sun gear, distributing the load and creating the reduction.",
      "box": [0.25, 0.25, 0.75, 0.75]
    }
  ]
}
"""
            logger.info(f"[{job_id}] Sending request to Gemini for diagram analysis...")
            response = genai_model.generate_content([image_prompt, image_parts[0]])
            response.resolve()
            logger.info(f"[{job_id}] Received response from Gemini.")
            cleaned_response_text = response.text.strip().replace('`', '').replace('json', '')
            diagram_labels = json.loads(cleaned_response_text).get("labels", [])
            logger.info(f"[{job_id}] Diagram analysis complete. Found {len(diagram_labels)} labels.")
            image_terms = [label['label'] for label in diagram_labels]
            key_terms.extend(image_terms)

        jobs[job_id] = {
            "status": "complete",
            "result": {
                "key_terms": list(set(key_terms)),
                "diagram_labels": diagram_labels,
                "original_text": original_text
            }
        }
        logger.info(f"[{job_id}] Analysis complete. Job status set to 'complete'.")
    except Exception as e:
        logger.error(f"An error occurred in background task {job_id}: {e}", exc_info=True)
        jobs[job_id] = {"status": "failed", "error": f"An unexpected error occurred: {e}"}

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"Status": "Running"}

@app.post("/analyze/")
async def analyze(
    request: Request,
    background_tasks: BackgroundTasks,
    document: Optional[UploadFile] = File(None),
    diagram: Optional[UploadFile] = File(None)
):
    if not document and not diagram:
        raise HTTPException(status_code=400, detail="Please upload a document or a diagram.")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "pending"}

    document_content = await document.read() if document else None
    
    diagram_info = None
    if diagram:
        diagram_content = await diagram.read()
        diagram_info = {"content": diagram_content, "content_type": diagram.content_type}


    background_tasks.add_task(
        run_analysis_in_background, request, job_id, document_content, diagram_info
    )
    return {"job_id": job_id}

@app.get("/status/{job_id}")
def get_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job

@app.post("/explain-term/")
async def explain_term(req: Request, term_request: schemas.ExplainTermRequest):
    genai_flash_model = req.app.state.genai_flash_model
    if not genai_flash_model:
        raise HTTPException(status_code=500, detail="AI services not configured.")
    prompt = f"""
Act as an expert AI Mechanical Mentor for a robotics beginner. The user has clicked on the term "{term_request.term}".
Your goal is to provide a deep, conceptual understanding, not just a simple definition.
Anticipate the user's underlying questions about design and application. For example, if the term is "hollow shaft", explain WHY engineers use them (weight reduction, running wires) and the basic principles of how to design them (e.g., considering wall thickness vs. strength).

Provide a detailed but easy-to-understand breakdown. Your response must be a single, valid JSON object with no surrounding text or markdown markers.

Your JSON object must have the following structure:
{{
  "explanation": "A detailed but beginner-friendly explanation of the term, focusing on the 'why' and 'how'. Use Markdown for formatting. **For any bulleted lists, ensure there is an empty line between each bullet point for readability.** **After each '###' heading, also add an empty line before the following text.** Use ### Headings, **bold**, and *italics* as needed.",
  "pros": ["A list of 2-3 key advantages or reasons to use this.", "Another pro."],
  "cons": ["A list of 2-3 key disadvantages or trade-offs.", "Another con."],
  "alternatives": [
    {{ "term": "Alternative Term", "description": "A brief explanation of why this is an alternative." }},
    {{ "term": "Another Alternative", "description": "Another brief explanation." }}
  ],
  "links": [
    {{
      "title": "High-Quality Image of {term_request.term}",
      "url": "A direct link to a high-quality image of the item. **Prioritize images from andymark.com, vexrobotics.com, or chiefdelphi.com.** If a good image cannot be found there, use a clear, illustrative photo from a general image search.",
      "category": "Image"
    }},
    {{
      "title": "Shop for '{term_request.term}' on AndyMark",
      "url": "A direct link to the search results for '{term_request.term} robotics' on andymark.com.",
      "category": "Supplier"
    }},
    {{
      "title": "Shop for '{term_request.term}' on VEXpro",
      "url": "A direct link to the search results for '{term_request.term} robotics' on vexrobotics.com/pro.",
      "category": "Supplier"
    }},
    {{
      "title": "Shop for '{term_request.term}' on McMaster-Carr",
      "url": "A direct link to the search results for '{term_request.term} robotics' on mcmaster.com.",
      "category": "Supplier"
    }},
    {{
      "title": "Read discussions about '{term_request.term}' on Chief Delphi",
      "url": "A direct link to a relevant discussion thread about '{term_request.term} robotics' on chiefdelphi.com.",
      "category": "Community"
    }}
  ]
}}
"""
    try:
        text_response = genai_flash_model.generate_content(prompt)
        cleaned_response_text = text_response.text.strip().replace('`', '').replace('json', '')
        return json.loads(cleaned_response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/terms/")
def create_term(term: schemas.TermCreate, db: Session = Depends(get_db)):
    db_term = models.Term(term=term.term, analysis=term.analysis)
    db.add(db_term)
    db.commit()
    db.refresh(db_term)
    return db_term

@app.get("/terms/", response_model=list[schemas.Term])
def read_terms(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    terms = db.query(models.Term).offset(skip).limit(limit).all()
    return terms