from fastapi import APIRouter, Request, HTTPException
from shared.models import Task, TaskStatus
from typing import List, Dict, Any
from datetime import datetime, timezone

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
async def list_tasks(request: Request):
    orchestrator = request.app.state.orchestrator
    tasks_list = []
    
    # Extract tasks from all execution plans in store
    if hasattr(orchestrator, "plan_store"):
        for plan_id, plan in orchestrator.plan_store.items():
            for task in plan.tasks:
                task_dict = task.dict()
                task_dict["plan_id"] = plan_id
                tasks_list.append(task_dict)
                
    return tasks_list

@router.get("/{task_id}", response_model=Dict[str, Any])
async def get_task(task_id: str, request: Request):
    orchestrator = request.app.state.orchestrator
    
    if hasattr(orchestrator, "plan_store"):
        for plan_id, plan in orchestrator.plan_store.items():
            for task in plan.tasks:
                if task.id == task_id:
                    task_dict = task.dict()
                    task_dict["plan_id"] = plan_id
                    return task_dict
                    
    raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

@router.post("/{task_id}/execute", response_model=Dict[str, Any])
async def execute_task(task_id: str, request: Request):
    """Manually trigger execution of a specific task via orchestrator"""
    orchestrator = request.app.state.orchestrator
    
    found_task = None
    parent_plan = None
    
    if hasattr(orchestrator, "plan_store"):
        for plan_id, plan in orchestrator.plan_store.items():
            for task in plan.tasks:
                if task.id == task_id:
                    found_task = task
                    parent_plan = plan
                    break
            if found_task:
                break
                
    if not found_task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
        
    try:
        # Mark as executing
        found_task.status = TaskStatus.EXECUTING
        
        # Invoke orchestrator activity runner
        result = await orchestrator.execute_task_activity(found_task)
        
        # Update status based on execution outcomes
        if result.get("status") == "failed" or "error" in result:
            found_task.status = TaskStatus.FAILED
        else:
            found_task.status = TaskStatus.COMPLETED
            
        found_task.completed_at = datetime.now(timezone.utc)
        
        return {
            "status": "success",
            "task_id": task_id,
            "execution_status": found_task.status,
            "result": result
        }
    except Exception as e:
        found_task.status = TaskStatus.FAILED
        return {
            "status": "failed",
            "task_id": task_id,
            "error": str(e)
        }

@router.post("/{task_id}/status", response_model=Dict[str, Any])
async def update_task_status(task_id: str, payload: Dict[str, Any], request: Request):
    """Manually update task status to force-fail, reset-to-pending, etc."""
    status_str = payload.get("status")
    if not status_str or status_str not in [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.EXECUTING, TaskStatus.COMPLETED, TaskStatus.FAILED]:
        raise HTTPException(status_code=400, detail="Invalid status value")
        
    orchestrator = request.app.state.orchestrator
    found_task = None
    
    if hasattr(orchestrator, "plan_store"):
        for plan_id, plan in orchestrator.plan_store.items():
            for task in plan.tasks:
                if task.id == task_id:
                    found_task = task
                    break
            if found_task:
                break
                
    if not found_task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
        
    found_task.status = TaskStatus(status_str)
    if status_str == TaskStatus.PENDING:
        found_task.completed_at = None
    else:
        found_task.completed_at = datetime.now(timezone.utc)
        
    return {
        "status": "success",
        "task_id": task_id,
        "new_status": found_task.status
    }
