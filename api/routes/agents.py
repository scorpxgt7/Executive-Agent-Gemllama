from fastapi import APIRouter, Request, HTTPException
from shared.models import Agent
from typing import List, Dict, Any

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
async def list_agents(request: Request):
    orchestrator = request.app.state.orchestrator
    
    # Fetch from orchestrator registry
    if hasattr(orchestrator, "agents") and hasattr(orchestrator.agents, "list_agents"):
        agents = orchestrator.agents.list_agents()
        return [agent.dict() for agent in agents]
        
    return []

@router.get("/{agent_id}", response_model=Dict[str, Any])
async def get_agent_by_id(agent_id: str, request: Request):
    orchestrator = request.app.state.orchestrator
    
    if hasattr(orchestrator, "agents") and hasattr(orchestrator.agents, "get_agent"):
        agent = orchestrator.agents.get_agent(agent_id)
        if agent:
            return agent.dict()
            
    raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

@router.post("/{agent_id}/toggle", response_model=Dict[str, Any])
async def toggle_agent(agent_id: str, request: Request):
    orchestrator = request.app.state.orchestrator
    
    if hasattr(orchestrator, "agents") and hasattr(orchestrator.agents, "get_agent"):
        agent = orchestrator.agents.get_agent(agent_id)
        if agent:
            new_status = not agent.active
            orchestrator.agents.update_agent_status(agent_id, new_status)
            return {
                "status": "success",
                "agent_id": agent_id,
                "active": new_status,
                "message": f"Agent {agent.name} is now {'active' if new_status else 'inactive'}."
            }
            
    raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
