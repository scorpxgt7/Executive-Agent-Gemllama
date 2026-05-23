from typing import Dict, List, Optional
from shared.models import Agent, Task
import structlog

logger = structlog.get_logger()

class AgentRegistry:
    def __init__(self):
        self.agents: Dict[str, Agent] = {}

    def register_agent(self, agent: Agent):
        """Register a new agent"""
        self.agents[agent.id] = agent
        logger.info("Agent registered", agent_id=agent.id, role=agent.role)

    def unregister_agent(self, agent_id: str):
        """Unregister an agent"""
        if agent_id in self.agents:
            del self.agents[agent_id]
            logger.info("Agent unregistered", agent_id=agent_id)

    def get_agent(self, agent_id: str) -> Optional[Agent]:
        """Get agent by ID"""
        return self.agents.get(agent_id)

    def list_agents(self) -> List[Agent]:
        """List all registered agents"""
        return list(self.agents.values())

    def find_agent_for_task(self, task: Task) -> Optional[Agent]:
        """Find appropriate agent for task based on capabilities"""
        for agent in self.agents.values():
            if agent.active and self._agent_can_handle_task(agent, task):
                return agent
        return None

    def _agent_can_handle_task(self, agent: Agent, task: Task) -> bool:
        """Check if agent can handle the task"""
        # Check capabilities
        task_capabilities = self._extract_capabilities_from_task(task)
        agent_capabilities = set(agent.capabilities)

        return bool(task_capabilities & agent_capabilities)

    def _extract_capabilities_from_task(self, task: Task) -> set:
        """Extract required capabilities from task"""
        # Simple mapping based on task type
        capability_map = {
            "research": ["research", "web_search"],
            "analysis": ["analytics", "data_processing"],
            "planning": ["planning", "strategy"],
            "coding": ["coding", "development"],
            "marketing": ["marketing", "content_creation"],
            "communication": ["email", "messaging"]
        }

        task_type = task.type.lower()
        return set(capability_map.get(task_type, []))

    def get_agents_by_role(self, role: str) -> List[Agent]:
        """Get agents by role"""
        return [agent for agent in self.agents.values() if agent.role == role]

    def update_agent_status(self, agent_id: str, active: bool):
        """Update agent active status"""
        if agent_id in self.agents:
            self.agents[agent_id].active = active
            logger.info("Agent status updated", agent_id=agent_id, active=active)
