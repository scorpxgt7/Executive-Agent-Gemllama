from fastapi import APIRouter, Request
from typing import List, Dict, Any
from datetime import datetime, timezone
import os

router = APIRouter()

# Keep a simple memory ring buffer of system logs for real-time streaming to frontend
system_logs: List[Dict[str, Any]] = [
    {"timestamp": datetime.now(timezone.utc).isoformat(), "level": "INFO", "component": "orchestrator", "message": "Executive Agent Platform Server started successfully"},
    {"timestamp": datetime.now(timezone.utc).isoformat(), "level": "INFO", "component": "agents", "message": "Registered core agents: Strategic Planner, Research Analyst, Content Marketer, Data Analyst"},
    {"timestamp": datetime.now(timezone.utc).isoformat(), "level": "INFO", "component": "workers", "message": "Dynamic background workers initialized: FS Worker, API Worker, Browser Worker, Email Worker, Deployment Worker"},
]

def add_log(level: str, component: str, message: str):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": level,
        "component": component,
        "message": message
    }
    system_logs.append(log_entry)
    if len(system_logs) > 100:
        system_logs.pop(0)

@router.get("/", response_model=Dict[str, Any])
async def get_system_status(request: Request):
    orchestrator = request.app.state.orchestrator
    
    # Calculate goals counts
    total_goals = 0
    completed_goals = 0
    failed_goals = 0
    active_goals = 0
    
    goal_store = getattr(orchestrator, "goal_store", {})
    total_goals = len(goal_store)
    
    for goal in goal_store.values():
        if goal.status.value == "completed":
            completed_goals += 1
        elif goal.status.value == "failed":
            failed_goals += 1
        else:
            active_goals += 1
            
    # Calculate total tasks count
    total_tasks = 0
    completed_tasks = 0
    executing_tasks = 0
    
    if hasattr(orchestrator, "plan_store"):
        for plan in orchestrator.plan_store.values():
            for task in plan.tasks:
                total_tasks += 1
                if task.status.value == "completed":
                    completed_tasks += 1
                elif task.status.value == "executing":
                    executing_tasks += 1
                    
    # Active agents count
    active_agents_count = 0
    if hasattr(orchestrator, "agents") and hasattr(orchestrator.agents, "agents"):
        active_agents_count = sum(1 for agent in orchestrator.agents.agents.values() if agent.active)
        
    return {
        "status": "healthy",
        "time": datetime.now(timezone.utc).isoformat(),
        "system_stats": {
            "total_goals": total_goals,
            "active_goals": active_goals,
            "completed_goals": completed_goals,
            "failed_goals": failed_goals,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "executing_tasks": executing_tasks,
            "active_agents": active_agents_count,
            "environment": os.getenv("NODE_ENV", "development"),
        },
        "logs": system_logs
    }
