import pytest
from core.learning.learning_manager import LearningManager
from shared.models import Goal, Task, ExecutionPlan
from datetime import datetime, timezone

@pytest.mark.asyncio
async def test_learning_manager_fallback_insights():
    manager = LearningManager()
    goal = Goal(
        id="test-goal-learning",
        description="Increase customer conversions through email campaigns",
        objectives=["Define target segments", "Write email copy", "Launch campaign"],
    )

    plan = ExecutionPlan(
        id="plan-test-goal-learning",
        goal_id=goal.id,
        tasks=[
            Task(
                id="task-1",
                goal_id=goal.id,
                description="Draft campaign strategy",
                type="marketing",
                parameters={"priority": 1},
                assigned_agent=None,
                dependencies=[],
            )
        ],
        created_at=datetime.now(timezone.utc),
    )

    analysis = {
        "complexity": "medium",
        "estimated_duration_days": 14,
        "required_capabilities": ["marketing", "copywriting"],
        "risk_level": "medium",
    }

    refined_plan = await manager.refine_execution_plan(plan, goal, analysis)

    assert refined_plan.learning_insights is not None
    assert isinstance(refined_plan.learning_insights, dict)
    assert "strategy_adjustments" in refined_plan.learning_insights
    assert "risk_mitigations" in refined_plan.learning_insights
    assert "performance_improvements" in refined_plan.learning_insights
    assert "feedback_loops" in refined_plan.learning_insights
