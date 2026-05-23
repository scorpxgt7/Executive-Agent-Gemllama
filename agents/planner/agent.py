from typing import Dict, Any, List
from shared.models import Task, Goal
import structlog
import openai
import os

logger = structlog.get_logger()

class PlannerAgent:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            try:
                self.client = openai.OpenAI(api_key=api_key)
            except Exception as e:
                logger.error("Failed to initialize OpenAI client for PlannerAgent", error=str(e))
                self.client = None
        else:
            self.client = None

    async def analyze_goal(self, goal: Goal) -> Dict[str, Any]:
        """Analyze a goal and provide strategic insights"""
        prompt = f"""
        As a strategic planner, analyze this goal comprehensively:

        Goal: {goal.description}
        Objectives: {', '.join(goal.objectives)}
        Constraints: {goal.constraints}
        Deadline: {goal.deadline}

        Provide a strategic analysis including:
        1. Goal feasibility assessment
        2. Critical success factors
        3. Potential risks and mitigation strategies
        4. Resource requirements
        5. Timeline breakdown
        6. Success metrics

        Format as JSON:
        {{
            "feasibility_score": 0-10,
            "critical_success_factors": ["factor1", "factor2"],
            "risks": ["risk1", "risk2"],
            "mitigations": ["mitigation1", "mitigation2"],
            "resources_needed": ["resource1", "resource2"],
            "timeline_phases": ["phase1", "phase2"],
            "success_metrics": ["metric1", "metric2"]
        }}
        """

        try:
            if not self.client:
                raise ValueError("OpenAI client not initialized")
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=1500
            )

            analysis = response.choices[0].message.content
            import json
            return json.loads(analysis.strip('```json').strip('```'))
        except Exception as e:
            logger.error("Planner agent failed to analyze goal", error=str(e))
            return {
                "feasibility_score": 7,
                "critical_success_factors": ["consistent execution", "market research"],
                "risks": ["competition", "algorithm changes"],
                "mitigations": ["diversify approaches", "monitor trends"],
                "resources_needed": ["content creation tools", "analytics"],
                "timeline_phases": ["research", "execution", "optimization"],
                "success_metrics": ["revenue generated", "content engagement"]
            }

    async def create_execution_plan(self, goal: Goal, analysis: Dict[str, Any]) -> List[Task]:
        """Create a detailed execution plan"""
        prompt = f"""
        Create a detailed execution plan for this goal:

        Goal: {goal.description}
        Strategic Analysis: {analysis}

        Break down into specific, actionable tasks with:
        - Clear deliverables
        - Time estimates
        - Dependencies
        - Success criteria
        - Required tools/resources

        Format as JSON array of tasks:
        [
            {{
                "id": "unique_task_id",
                "description": "Detailed task description",
                "type": "research|planning|content|marketing|analytics|automation",
                "estimated_hours": 4,
                "dependencies": ["task_id1", "task_id2"],
                "deliverables": ["deliverable1", "deliverable2"],
                "tools_needed": ["tool1", "tool2"],
                "priority": 1-5
            }}
        ]

        Ensure tasks are realistic and build upon each other.
        """

        try:
            if not self.client:
                raise ValueError("OpenAI client not initialized")
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=2500
            )

            plan_text = response.choices[0].message.content
            import json
            tasks_data = json.loads(plan_text.strip('```json').strip('```'))

            tasks = []
            for task_data in tasks_data:
                task = Task(
                    id=task_data["id"],
                    goal_id=goal.id,
                    description=task_data["description"],
                    type=task_data["type"],
                    parameters={
                        "estimated_hours": task_data["estimated_hours"],
                        "deliverables": task_data["deliverables"],
                        "tools_needed": task_data["tools_needed"],
                        "priority": task_data["priority"]
                    },
                    dependencies=task_data["dependencies"]
                )
                tasks.append(task)

            return tasks
        except Exception as e:
            logger.error("Planner agent failed to create plan", error=str(e))
            return []

    async def adapt_strategy(self, goal: Goal, current_results: Dict[str, Any]) -> Dict[str, Any]:
        """Adapt strategy based on current results"""
        prompt = f"""
        Analyze current results and recommend strategy adaptations:

        Goal: {goal.description}
        Current Results: {current_results}

        Provide adaptation recommendations:
        {{
            "performance_assessment": "assessment text",
            "recommended_changes": ["change1", "change2"],
            "new_priorities": ["priority1", "priority2"],
            "additional_tasks": ["task1", "task2"],
            "risk_adjustments": ["adjustment1", "adjustment2"]
        }}
        """

        try:
            if not self.client:
                raise ValueError("OpenAI client not initialized")
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=1000
            )

            adaptation = response.choices[0].message.content
            import json
            return json.loads(adaptation.strip('```json').strip('```'))
        except Exception as e:
            logger.error("Planner agent failed to adapt strategy", error=str(e))
            return {
                "performance_assessment": "Results analysis pending",
                "recommended_changes": [],
                "new_priorities": [],
                "additional_tasks": [],
                "risk_adjustments": []
            }
