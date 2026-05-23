import os
import json
import structlog
from typing import Dict, Any, List, Optional
from shared.models import ExecutionPlan, Goal
from core.memory.memory_manager import MemoryManager

logger = structlog.get_logger()

class LearningManager:
    def __init__(self, memory: Optional[MemoryManager] = None):
        self.logger = logger
        self.memory = memory

    def _openai_client(self) -> Optional[Any]:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            self.logger.debug("OpenAI API key not available, using fallback behavior")
            return None

        try:
            import openai
            return openai.OpenAI(api_key=api_key)
        except Exception as exc:
            self.logger.warning("Failed to initialize OpenAI client", error=str(exc))
            return None

    async def refine_execution_plan(self, plan: ExecutionPlan, goal: Goal, analysis: Dict[str, Any]) -> ExecutionPlan:
        """Refine the execution plan using learned insights and adaptive recommendations."""
        self.logger.info("Refining execution plan with learning insights", plan_id=plan.id, goal_id=goal.id)

        context = await self._retrieve_past_experience(goal, plan)
        suggestions = await self._generate_learning_insights(goal, analysis, plan, context)
        plan.learning_insights = suggestions

        await self.record_learning_experience(plan, goal, analysis, context)
        return plan

    async def _retrieve_past_experience(self, goal: Goal, plan: ExecutionPlan) -> List[Dict[str, Any]]:
        """Fetch relevant past experiences from semantic memory if available."""
        if not self.memory:
            return []

        try:
            embedding = await self._embed_text(goal.description)
            if not embedding:
                return []

            results = await self.memory.search_semantic(embedding, limit=5)
            self.logger.debug("Retrieved past experience for learning", count=len(results))
            return results
        except Exception as exc:
            self.logger.warning("Failed to retrieve past experience", error=str(exc))
            return []

    async def _embed_text(self, text: str) -> Optional[List[float]]:
        """Create an embedding for semantic search."""
        client = self._openai_client()
        if not client:
            return None

        try:
            response = client.embeddings.create(model="text-embedding-3-small", input=text)
            return response.data[0].embedding
        except Exception as exc:
            self.logger.warning("Embedding generation failed", error=str(exc))
            return None

    async def _generate_learning_insights(
        self,
        goal: Goal,
        analysis: Dict[str, Any],
        plan: ExecutionPlan,
        context: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Generate adaptive guidance for plan optimization."""
        try:
            client = self._openai_client()
            if not client:
                raise RuntimeError("OpenAI client unavailable")

            context_summary = json.dumps(context[:3]) if context else "No relevant past experience available."
            prompt = f"""
            Based on this goal, analysis, execution plan, and relevant past experience, provide a concise set of learning-based recommendations for optimization.

            Goal: {goal.description}
            Objectives: {', '.join(goal.objectives)}
            Analysis: {json.dumps(analysis)}
            Tasks: {[task.description for task in plan.tasks]}
            Past Experience: {context_summary}

            Return JSON with keys:
            - strategy_adjustments
            - risk_mitigations
            - performance_improvements
            - feedback_loops
            """

            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=500
            )

            content = response.choices[0].message.content
            json_text = content.strip('```json').strip('```').strip()
            return json.loads(json_text)
        except Exception as exc:
            self.logger.warning("Learning insights generation failed, using fallback", error=str(exc))
            return {
                "strategy_adjustments": ["Iterate quickly on the highest-impact tasks", "Use shorter feedback cycles for approval-sensitive work"],
                "risk_mitigations": ["Monitor external dependencies daily", "Limit agent budget for high-risk operations"],
                "performance_improvements": ["Cache repeated data analysis results", "Batch similar tasks for efficiency"],
                "feedback_loops": ["Capture task execution outcomes in semantic memory", "Review failed tasks within 1 hour"]
            }

    async def record_learning_experience(
        self,
        plan: ExecutionPlan,
        goal: Goal,
        analysis: Dict[str, Any],
        context: List[Dict[str, Any]],
    ) -> None:
        """Persist learning-related information to memory for future refinement."""
        if not self.memory:
            self.logger.debug("No memory manager available, skipping experience persistence")
            return

        experience = {
            "goal_id": goal.id,
            "goal_description": goal.description,
            "analysis": analysis,
            "task_count": len(plan.tasks),
            "task_descriptions": [task.description for task in plan.tasks],
            "learning_context": context,
        }

        embedding = await self._embed_text(goal.description)
        if embedding:
            await self.memory.store_semantic(f"learning-{plan.id}", embedding, experience)

        for task in plan.tasks:
            await self.memory.store_episodic(task.id, {"task": task.description}, {"status": task.status.value if hasattr(task.status, 'value') else str(task.status)})
