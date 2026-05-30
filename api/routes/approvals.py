from fastapi import APIRouter, Request, HTTPException
from shared.models import ApprovalRequest, TaskStatus
from typing import List, Dict, Any
from datetime import datetime, timezone

router = APIRouter()

# Simple in-memory register for approval requests
approvals_db: Dict[str, ApprovalRequest] = {}

# Ensure some mock approvals exist for initial state representation if none are registered
def ensure_default_approvals(orchestrator):
    store = getattr(orchestrator, "approval_store", approvals_db)
    if not store:
        # Create a mock approval request for a demo plan if one exists
        if hasattr(orchestrator, "plan_store") and orchestrator.plan_store:
            for plan_id, plan in orchestrator.plan_store.items():
                req = ApprovalRequest(
                    id=f"approval-{plan_id}",
                    plan_id=plan_id,
                    type="sensitive",
                    reason="Automated product placement requires social copy safety verification",
                    requested_by="Strategic Planner",
                    status="pending"
                )
                store[req.id] = req
        else:
            # Fallback mock approval
            req = ApprovalRequest(
                id="approval-demo-1",
                plan_id="plan-demo-id",
                type="sensitive",
                reason="Auto content dispatch requires API mutation credential checks",
                requested_by="Content Marketer",
                status="pending"
            )
            store[req.id] = req
            
    if not hasattr(orchestrator, "approval_store"):
        orchestrator.approval_store = store

@router.get("/", response_model=List[Dict[str, Any]])
async def list_approvals(request: Request):
    orchestrator = request.app.state.orchestrator
    ensure_default_approvals(orchestrator)
    
    store = getattr(orchestrator, "approval_store", approvals_db)
    return [req.dict() for req in store.values()]

@router.post("/{approval_id}/action", response_model=Dict[str, Any])
async def action_approval(approval_id: str, payload: Dict[str, Any], request: Request):
    orchestrator = request.app.state.orchestrator
    store = getattr(orchestrator, "approval_store", approvals_db)
    
    if approval_id not in store:
        raise HTTPException(status_code=404, detail="Approval request not found")
        
    action = payload.get("action", "approve").lower() # "approve" or "reject"
    request_obj = store[approval_id]
    
    if action == "approve":
        request_obj.status = "approved"
        # Find execution plan and resolve approval state
        plan_id = request_obj.plan_id
        if hasattr(orchestrator, "plan_store") and plan_id in orchestrator.plan_store:
            plan = orchestrator.plan_store[plan_id]
            plan.approved = True
            
            # Start running tasks if needed
            for task in plan.tasks:
                if task.status == TaskStatus.PENDING:
                    task.status = TaskStatus.EXECUTING
            
            # Simulate trigger of background running in test simulation env
            if orchestrator.temporal_client:
                try:
                    await orchestrator.temporal_client.start_workflow(
                        "GoalExecutionWorkflow.run",
                        args=[plan],
                        id=f"goal-{plan.goal_id}",
                        task_queue="executive-agent-queue",
                    )
                except Exception as e:
                    pass
    else:
        request_obj.status = "rejected"
        plan_id = request_obj.plan_id
        if hasattr(orchestrator, "plan_store") and plan_id in orchestrator.plan_store:
            plan = orchestrator.plan_store[plan_id]
            plan.approved = False
            for task in plan.tasks:
                task.status = TaskStatus.FAILED
                
    return {
        "status": "success",
        "approval_id": approval_id,
        "action_taken": action,
        "request_status": request_obj.status
    }
