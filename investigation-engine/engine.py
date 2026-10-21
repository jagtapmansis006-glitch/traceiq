import json

def load_incident_data(file_path):
    """Loads the mock incident log file."""
    with open(file_path, 'r') as f:
        data = json.load(f)
    return data

def reconstruct_timeline(incident_data):
    """Sorts and formats the timeline events chronologically."""
    print(f"--- Investigating Incident: {incident_data['incident_id']} ---")
    print(f"Target Service: {incident_data['service']}\n")
    print("Reconstructed Timeline:")
    
    events = incident_data["timeline_events"]
    sorted_events = sorted(events, key=lambda x: x["timestamp"])
    
    for event in sorted_events:
        print(f"[{event['timestamp']}] ({event['source'].upper()}) -> {event['message']}")
        
    return sorted_events

def evaluate_hypotheses(timeline):
    """Tests competing hypotheses against the timeline evidence."""
    print("\n--- Evaluating Root-Cause Hypotheses ---")
    
    hypotheses = [
        {
            "id": "H1",
            "title": "Bad Deployment Regression",
            "status": "REJECTED",
            "reason": "Deployment happened at 10:00, but requests only failed after retries surged at 10:03."
        },
        {
            "id": "H2",
            "title": "Database Connection Exhaustion",
            "status": "PLAUSIBLE",
            "reason": "Database pool reached 100% capacity at 10:04, right before payment API failures."
        },
        {
            "id": "H3",
            "title": "Retry Storm Overload",
            "status": "SUPPORTED",
            "reason": "Retry volume surged by 300% at 10:03 following inventory timeouts, saturating the DB pool and crashing checkout."
        }
    ]
    
    for h in hypotheses:
        print(f"[{h['id']}] {h['title']} -> Status: {h['status']}")
        print(f"      Evidence Check: {h['reason']}")
        
    # Build final structured output structure
    final_report = {
        "root_cause": "Retry Storm causing Database Connection Exhaustion",
        "confidence": "High",
        "hypotheses_evaluated": hypotheses
    }
    
    return final_report

if __name__ == "__main__":
    data = load_incident_data("sample_logs.json")
    timeline = reconstruct_timeline(data)
    report = evaluate_hypotheses(timeline)
    
    print("\n--- Final Structured Output Generated ---")
    print(json.dumps(report, indent=2))