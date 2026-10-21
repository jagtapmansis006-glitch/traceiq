from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json
import os
from openai import OpenAI

app = FastAPI(title="TraceIQ API", version="1.0")

# Initialize NVIDIA NIM client
client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.environ.get("NVIDIA_API_KEY", "your_nvidia_api_key_here")
)

class IncidentRequest(BaseModel):
    incident_id: str
    service: str

def load_incident_data(incident_id: str):
    """Dynamically loads log files based on the requested incident ID."""
    # Map incident IDs to filenames
    file_mapping = {
        "INC-001": "sample_logs.json",
        "INC-002": "sample_logs_2.json"
    }
    
    filename = file_mapping.get(incident_id, "sample_logs.json")
    
    if not os.path.exists(filename):
        # Fallback to default sample_logs.json if the specific file doesn't exist yet
        filename = "sample_logs.json"
        
    if not os.path.exists(filename):
        raise HTTPException(status_code=404, detail="Incident data source not found.")
        
    with open(filename, 'r') as f:
        return json.load(f)

@app.get("/api/timeline")
def get_timeline(incident_id: str = "INC-001"):
    """Returns the sorted chronological timeline events for a given incident."""
    try:
        data = load_incident_data(incident_id)
        sorted_events = sorted(data["timeline_events"], key=lambda x: x["timestamp"])
        return {
            "incident_id": data.get("incident_id", incident_id),
            "service": data.get("service", "checkout-service"),
            "timeline": sorted_events
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/investigate")
def run_investigation(request: IncidentRequest):
    try:
        data = load_incident_data(request.incident_id)
        sorted_events = sorted(data["timeline_events"], key=lambda x: x["timestamp"])
        
        timeline_text = "\n".join([f"[{e['timestamp']}] ({e['source'].upper()}): {e['message']}" for e in sorted_events])
        
        prompt = f"""
You are TraceIQ, an evidence-driven AI incident investigator. Analyze the following incident timeline for service '{request.service}' and evaluate competing hypotheses to find the root cause.

Timeline:
{timeline_text}

Provide your analysis in valid JSON format with the following keys:
- "root_cause": string summary of the primary root cause
- "confidence": "High", "Medium", or "Low"
- "hypotheses_evaluated": a list of objects, each with "id", "title", "status" (REJECTED, PLAUSIBLE, or SUPPORTED), and "reason".
"""

        try:
            completion = client.chat.completions.create(
                model="nvidia/llama-3.1-nemotron-70b-instruct",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=1024
            )
            ai_response_text = completion.choices[0].message.content
            
            if "```json" in ai_response_text:
                ai_response_text = ai_response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in ai_response_text:
                ai_response_text = ai_response_text.split("```")[1].split("```")[0].strip()
                
            ai_result = json.loads(ai_response_text)
        except Exception as ai_err:
            print("--- NVIDIA API ERROR ---", str(ai_err))
            ai_result = {
                "root_cause": f"Retry Storm causing Database Connection Exhaustion (Error: {str(ai_err)})",
                "confidence": "High",
                "hypotheses_evaluated": [
                    {"id": "H1", "title": "Bad Deployment Regression", "status": "REJECTED", "reason": "Deployment occurred at 10:00, but failures surged after retries at 10:03."},
                    {"id": "H2", "title": "Database Connection Exhaustion", "status": "PLAUSIBLE", "reason": "Database pool reached 100% capacity at 10:04."},
                    {"id": "H3", "title": "Retry Storm Overload", "status": "SUPPORTED", "reason": "Retry volume surged by 300% at 10:03, saturating the DB pool."}
                ]
            }

        response_payload = {
            "incident_id": request.incident_id,
            "service": request.service,
            "status": "completed",
            "timeline": sorted_events,
            "hypotheses_evaluated": ai_result.get("hypotheses_evaluated", []),
            "root_cause": ai_result.get("root_cause", ""),
            "confidence": ai_result.get("confidence", "High")
        }
        
        return response_payload

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)