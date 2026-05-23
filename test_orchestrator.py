import pytest
from core.orchestrator.orchestrator import Orchestrator
from shared.models import Goal

@pytest.mark.asyncio
async def test_orchestrator_initialization():
    orchestrator = Orchestrator()
    assert orchestrator.memory is not None
    assert orchestrator.events is not None
    assert orchestrator.permissions is not None
    assert orchestrator.agents is not None

@pytest.mark.asyncio
async def test_receive_goal():
    orchestrator = Orchestrator()
    goal = Goal(
        id="test-goal-1",
        description="Test goal for earning $100 online",
        objectives=["Research opportunities", "Create content", "Monetize"]
    )

    # This would normally start a workflow
    plan_id = await orchestrator.receive_goal(goal)
    assert plan_id.startswith("plan-")

@pytest.mark.asyncio
async def test_plan_storage_and_learning_insights():
    orchestrator = Orchestrator()
    goal = Goal(
        id="test-goal-2",
        description="Validate memory-driven learning persistence",
        objectives=["Collect data", "Optimize workflow", "Review outcomes"]
    )

    plan_id = await orchestrator.receive_goal(goal)
    stored_plan = orchestrator.get_plan_by_goal(goal.id)

    assert stored_plan is not None
    assert stored_plan.id == plan_id
    assert stored_plan.learning_insights is not None
    assert "strategy_adjustments" in stored_plan.learning_insights
