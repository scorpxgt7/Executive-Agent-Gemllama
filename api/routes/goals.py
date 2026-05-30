from fastapi import APIRouter, Request, HTTPException
from shared.models import Goal, GoalStatus, ExecutionPlan
from typing import List, Dict, Any
from datetime import datetime, timezone
import uuid

router = APIRouter()

# In-memory backup database for simple REST requests if orchestrator is initializing
goals_db: Dict[str, Goal] = {}

@router.post("/", response_model=Dict[str, Any])
async def create_goal(goal_payload: Dict[str, Any], request: Request):
    orchestrator = request.app.state.orchestrator
    
    # Extract goal payload
    goal_id = goal_payload.get("id") or f"goal-{uuid.uuid4().hex[:8]}"
    description = goal_payload.get("description", "Launch automated affiliate marketing campaign")
    objectives = goal_payload.get("objectives", ["Analyze product features", "Draft copy", "Publish content"])
    constraints = goal_payload.get("constraints", {})
    
    goal = Goal(
        id=goal_id,
        description=description,
        objectives=objectives,
        constraints=constraints,
        status=GoalStatus.PENDING,
        created_at=datetime.now(timezone.utc)
    )
    
    # Save in memory
    goals_db[goal_id] = goal
    if hasattr(orchestrator, "goal_store"):
        orchestrator.goal_store[goal_id] = goal
    else:
        # Dynamically attach goal_store to preserve state
        orchestrator.goal_store = {goal_id: goal}
        
    try:
        plan_id = await orchestrator.receive_goal(goal)
        # Update goal status to showing it has generated a plan
        goal.status = GoalStatus.PLANNING
        
        plan = orchestrator.get_plan(plan_id)
        return {
            "status": "success",
            "goal_id": goal_id,
            "plan_id": plan_id,
            "goal": goal.dict(),
            "plan": plan.dict() if plan else None
        }
    except Exception as e:
        # Gracefully handle any background startup exceptions (e.g. missing api keys)
        goal.status = GoalStatus.FAILED
        return {
            "status": "warning",
            "message": f"Goal recorded, but automated planner failed to execute fully: {str(e)}",
            "goal_id": goal_id,
            "goal": goal.dict(),
            "plan": None
        }

@router.get("/", response_model=List[Dict[str, Any]])
async def list_goals(request: Request):
    orchestrator = request.app.state.orchestrator
    
    # Retrieve from dynamic store
    store = getattr(orchestrator, "goal_store", goals_db)
    if not store:
        return []
    
    result = []
    for goal_id, goal in store.items():
        # Sync stats back from execution plans
        plan = orchestrator.get_plan_by_goal(goal_id)
        if plan:
            # Simple heuristic status sync
            all_completed = all(t.status == "completed" for t in plan.tasks) if plan.tasks else False
            any_executing = any(t.status == "executing" for t in plan.tasks) if plan.tasks else False
            any_failed = any(t.status == "failed" for t in plan.tasks) if plan.tasks else False
            
            if all_completed:
                goal.status = GoalStatus.COMPLETED
            elif any_failed:
                goal.status = GoalStatus.FAILED
            elif any_executing:
                goal.status = GoalStatus.EXECUTING
                
        result.append(goal.dict())
        
    return result

@router.get("/{goal_id}", response_model=Dict[str, Any])
async def get_goal_by_id(goal_id: str, request: Request):
    orchestrator = request.app.state.orchestrator
    store = getattr(orchestrator, "goal_store", goals_db)
    
    if goal_id not in store:
        raise HTTPException(status_code=404, detail=f"Goal {goal_id} not found")
        
    goal = store[goal_id]
    plan = orchestrator.get_plan_by_goal(goal_id)
    
    return {
        "goal": goal.dict(),
        "plan": plan.dict() if plan else None
    }
