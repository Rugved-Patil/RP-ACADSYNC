#!/usr/bin/env python3
"""
assistant.py — RP-ACADSYNC Intelligent Chatbot Assistant.
Powered by Google Gemini 3.6 Flash with dynamic SQLite RAG context.
"""

import sys
import os
import json
import sqlite3
import urllib.request
import urllib.error

# Load environment variables from .env file if available
def load_env():
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.join(os.getcwd(), ".env"),
    ]
    for env_path in candidates:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("\"'")
                            if k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass

load_env()

# Gemini API Configuration
DEFAULT_API_KEY = os.environ.get("GEMINI_API_KEY", "")
MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent"

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def get_db_connection():
    # Look for database in standard server locations
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "..", "data", "acadsync.db"),
        os.path.join(base_dir, "server", "data", "acadsync.db"),
        os.path.join(os.getcwd(), "server", "data", "acadsync.db"),
    ]
    for p in candidates:
        norm = os.path.normpath(p)
        if os.path.exists(norm):
            conn = sqlite3.connect(norm)
            conn.row_factory = sqlite3.Row
            return conn
    # Default fallback
    db_path = os.path.normpath(os.path.join(base_dir, "..", "data", "acadsync.db"))
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def fetch_institutional_context():
    """Extract full live institutional state, timetables, and rules from SQLite."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    context = {}
    try:
        # 1. Classes & Batches
        classes = cursor.execute("SELECT id, name, student_count, batches FROM classes").fetchall()
        context["classes"] = [dict(c) for c in classes]

        # 2. Classrooms & Labs
        classrooms = cursor.execute("SELECT id, name, capacity, is_lab, location, equipment FROM classrooms").fetchall()
        context["classrooms"] = [dict(r) for r in classrooms]

        # 3. Teachers & Specializations
        teachers = cursor.execute("SELECT id, name, email, specialization, max_periods_per_day FROM teachers").fetchall()
        context["teachers"] = [dict(t) for t in teachers]

        # 4. Subjects & Credits
        subjects = cursor.execute("SELECT id, name, code, credits, periods_per_week, is_lab, lab_duration_hours FROM subjects").fetchall()
        context["subjects"] = [dict(s) for s in subjects]

        # 5. Timings & Slots
        timings = cursor.execute("SELECT * FROM timings ORDER BY created_at ASC LIMIT 1").fetchall()
        context["timings"] = [dict(t) for t in timings]
        
        slots = cursor.execute("SELECT * FROM time_slots ORDER BY slot_order ASC").fetchall()
        context["time_slots"] = [dict(s) for s in slots]

        # 6. Active Timetable & Scheduled Lessons
        active_tt = cursor.execute("SELECT id, name, academic_year, share_token, generated_at FROM timetables WHERE is_active = 1 ORDER BY generated_at DESC LIMIT 1").fetchone()
        
        if active_tt:
            tt_id = active_tt["id"]
            context["active_timetable"] = dict(active_tt)
            
            lessons_query = """
                SELECT 
                    l.day,
                    l.batch,
                    c.name AS class_name,
                    s.name AS subject_name,
                    s.code AS subject_code,
                    s.is_lab,
                    t.name AS teacher_name,
                    cr.name AS room_name,
                    ts.start_time,
                    ts.end_time,
                    ts.slot_order
                FROM lessons l
                JOIN classes c ON l.class_id = c.id
                JOIN subjects s ON l.subject_id = s.id
                JOIN teachers t ON l.teacher_id = t.id
                LEFT JOIN classrooms cr ON l.classroom_id = cr.id
                JOIN time_slots ts ON l.time_slot_id = ts.id
                WHERE l.timetable_id = ?
                ORDER BY l.day ASC, ts.slot_order ASC, c.name ASC
            """
            lessons = cursor.execute(lessons_query, (tt_id,)).fetchall()
            
            # Format lessons into human-readable structured rows
            formatted_lessons = []
            for row in lessons:
                day_name = DAYS_OF_WEEK[row["day"]] if 0 <= row["day"] < len(DAYS_OF_WEEK) else f"Day {row['day']}"
                formatted_lessons.append({
                    "day": day_name,
                    "time": f"{row['start_time']} - {row['end_time']}",
                    "class": row["class_name"],
                    "batch": row["batch"] if row["batch"] else "Whole Class",
                    "subject": f"{row['subject_name']} ({row['subject_code']})",
                    "type": "Practical Lab" if row["is_lab"] else "Theory Lecture",
                    "teacher": row["teacher_name"],
                    "room": row["room_name"] or "TBA"
                })
            context["scheduled_lessons_sample"] = formatted_lessons
            context["total_scheduled_lessons"] = len(formatted_lessons)
        else:
            context["active_timetable"] = None
            context["scheduled_lessons_sample"] = []
            context["total_scheduled_lessons"] = 0

    except Exception as e:
        context["error_loading_db"] = str(e)
    finally:
        conn.close()

    return context

def build_system_instruction(context):
    """Construct the system prompt incorporating live RAG context and platform documentation."""
    return f"""You are ACADSYNC AI, the friendly, highly knowledgeable intelligent assistant for the RP-ACADSYNC Academic Scheduling and Synchronization System.

Your objective is to help faculty, students, and administrators with:
1. Academic Queries: Answer questions about current class schedules, lecture timings, batch laboratory practicals, teacher assignments, room allocations, and free slots.
2. Platform Navigation & Guide: Explain where features are located and how to use every part of RP-ACADSYNC.

---
### INSTITUTIONAL CONTEXT & LIVE TIMETABLE DATA:
- Active Timetable: {json.dumps(context.get('active_timetable', {}))}
- Total Scheduled Lessons: {context.get('total_scheduled_lessons', 0)}
- Classes ({len(context.get('classes', []))}): {json.dumps([c['name'] for c in context.get('classes', [])])}
- Classrooms & Labs ({len(context.get('classrooms', []))}): {json.dumps([{'name': r['name'], 'is_lab': bool(r['is_lab']), 'location': r.get('location', '')} for r in context.get('classrooms', [])])}
- Faculty ({len(context.get('teachers', []))}): {json.dumps([{'name': t['name'], 'specialization': t.get('specialization', '')} for t in context.get('teachers', [])])}
- Standard Daily Timing: 10:00 to 17:00 (6 teaching periods, 2 recess breaks: Lunch 12:00-12:45, Tea 14:45-15:00)
- Working Days: Monday through Saturday

### SCHEDULED LESSONS DATABASE (ALL LIVE ENTRIES):
{json.dumps(context.get('scheduled_lessons_sample', []), indent=1)}

---
### RP-ACADSYNC PLATFORM CAPABILITIES & NAVIGATION REFERENCE:
1. **Timetables Page (/timetables)**:
   - View timetables with Sideways Days (rows: Monday to Saturday) and Vertical Time Slots (columns: 10:00 to 17:00).
   - Filter dropdowns: Filter by specific Class, Teacher, or Classroom.
   - View mode toggle: Switch between 'Whole Week' view and 'Single Day' view.
   - Generate Timetable: Admin can click "Generate Timetable" to run the Genetic Algorithm engine with 0 hard conflicts.
   - Timetable Actions: Publish, Lock, Rename, or Share public read-only link.
2. **Exporting Timetables**:
   - Download options available on the Timetable page: PDF (print-ready layout), Excel (.xlsx with separate tabs for week & days), CSV, HTML, and JSON.
3. **Data Upload (/data-upload)**:
   - Single-file Master CSV importer (`college_master_import.csv`) that imports classes, batches, classrooms, labs, teachers, subjects, and credits in one click.
   - "Download Master CSV Template" button gives a pre-formatted reference template.
4. **Teacher Change Requests (/requests)**:
   - Teachers can log in and submit requests to move a lecture to an available free slot.
   - The system automatically calculates genuinely free slots (excluding teacher and class conflicts).
   - Admin can Approve (creating a temporary override or promoting to permanent schedule) or Reject.
5. **Settings (/settings)**:
   - Configure active timing schedules and working days.
   - Emergency Kill Switch: Red button with double confirmation ('DELETE ALL DATA') to clean the database and re-seed authentic college data.
6. **Credits & Batches Rule**:
   - 1 Theory Credit = 1 one-hour lecture per week on separate days.
   - 1 Lab Credit = 1 two-hour practical session per week per batch. Batches A, B, and C can run concurrently in parallel laboratory rooms.

---
### RESPONSE GUIDELINES:
- Ground your answers directly in the live scheduled lessons provided above.
- If asked about a specific class (e.g. SE-ECCE), teacher (e.g. Prof. Mulay), or day (e.g. Friday), provide clean bullet points with day, time slot, subject, batch, teacher, and room.
- If asked how to do something on the website (e.g. "How do I export to Excel?"), provide clear step-by-step navigation directions.
- Be concise, polite, professional, and use markdown formatting (bolding, bullet points, code tags) for clarity.
- If a timetable has not been generated yet or a specific subject is not found, state this clearly and guide the user on how to generate or import it.
"""

CANDIDATE_MODELS = [
    os.environ.get("GEMINI_MODEL", "gemini-3.6-flash"),
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
]

def chat_with_gemini(user_message, history=None, api_key=None):
    """Sends user message and multi-turn history to Gemini with automatic model fallback."""
    key = api_key or DEFAULT_API_KEY
    if not key:
        return {"error": "No Gemini API Key provided. Please set GEMINI_API_KEY."}

    context = fetch_institutional_context()
    system_instruction = build_system_instruction(context)

    # Format conversation contents
    contents = []
    
    # Add conversation history if present
    if history and isinstance(history, list):
        for msg in history:
            role = "model" if msg.get("sender") == "bot" or msg.get("role") == "assistant" else "user"
            text = msg.get("text") or msg.get("content") or ""
            if text.strip():
                contents.append({
                    "role": role,
                    "parts": [{"text": text}]
                })

    # Add current user message
    contents.append({
        "role": "user",
        "parts": [{"text": user_message}]
    })

    payload = {
        "system_instruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1024,
        }
    }

    last_error = None
    # Try candidate models in order if transient errors occur
    for model_name in CANDIDATE_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        for attempt in range(2):
            try:
                with urllib.request.urlopen(req, timeout=30) as response:
                    resp_data = json.loads(response.read().decode("utf-8"))
                    candidates = resp_data.get("candidates", [])
                    if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                        reply_text = candidates[0]["content"]["parts"][0]["text"]
                        return {"reply": reply_text, "modelUsed": model_name, "success": True}
                    else:
                        last_error = "Empty or unexpected response structure from Gemini API."
            except urllib.error.HTTPError as e:
                error_body = e.read().decode("utf-8") if e.fp else str(e)
                last_error = f"Gemini API HTTP Error {e.code} ({model_name}): {e.reason}"
                # If 503 or 429, try next attempt or fallback model
                if e.code in [503, 429, 500, 404]:
                    continue
                else:
                    break
            except Exception as e:
                last_error = f"Assistant execution error: {str(e)}"
                continue

    return {"error": last_error or "Failed to obtain response from Gemini models."}

def main():
    """CLI / IPC Entrypoint."""
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        query = sys.argv[2] if len(sys.argv) > 2 else "What lectures are on Monday for SE-ECCE?"
        print(f"Testing Query: {query}")
        res = chat_with_gemini(query)
        print("\n--- Assistant Reply ---")
        print(res.get("reply") or res.get("error"))
        return

    # Read from stdin JSON payload
    try:
        input_data = json.load(sys.stdin)
        message = input_data.get("message", "")
        history = input_data.get("history", [])
        api_key = input_data.get("apiKey", None)

        if not message.strip():
            print(json.dumps({"error": "Empty message received.", "success": False}))
            sys.exit(0)

        result = chat_with_gemini(message, history, api_key)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": f"Failed to process request: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
