import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import structlog
from temporalio.client import Client
from temporalio.worker import Worker
from core.memory.memory_manager import MemoryManager
from core.events.event_publisher import EventPublisher
from core.governance.permission_manager import PermissionManager
from core.learning.learning_manager import LearningManager
from core.orchestrator.workflow import GoalExecutionWorkflow
from agents.registry import AgentRegistry
from agents.planner.agent import PlannerAgent
from shared.models import Goal, Task, ExecutionPlan

logger = structlog.get_logger()

class Orchestrator:
    def __init__(self):
        self.memory = MemoryManager()
        self.events = EventPublisher()
        self.permissions = PermissionManager()
        self.agents = AgentRegistry()
        self.learning = LearningManager(memory=self.memory)
        self.temporal_client = None
        self.worker = None
        self.plan_store: Dict[str, ExecutionPlan] = {}

    async def initialize(self):
        # Register core agents first so the orchestrator is ready even if Temporal is unavailable.
        await self._register_core_agents()

        try:
            # Initialize Temporal client if available
            self.temporal_client = await Client.connect("localhost:7233")
            self.worker = Worker(
                self.temporal_client,
                task_queue="executive-agent-queue",
                workflows=[GoalExecutionWorkflow],
                activities=[self.execute_task_activity],
            )
        except Exception as exc:
            logger.warning("Temporal initialization failed, continuing without workflow worker", error=str(exc))
            self.temporal_client = None
            self.worker = None

    async def _register_core_agents(self):
        """Register core agents"""
        from shared.models import Agent

        # Register planner agent
        planner_agent = Agent(
            id="planner_agent",
            name="Strategic Planner",
            role="planner",
            capabilities=["goal_analysis", "strategy_planning", "task_decomposition", "risk_assessment"],
            tools=["openai", "analysis_frameworks"],
            limits={"daily_budget": 50, "max_parallel_tasks": 2},
            permissions={"requires_human_approval": False}
        )
        self.agents.register_agent(planner_agent)

        # Register research agent
        research_agent = Agent(
            id="research_agent",
            name="Research Analyst",
            role="research",
            capabilities=["market_research", "competitive_analysis", "data_gathering", "trend_analysis"],
            tools=["openai", "web_search", "data_analysis"],
            limits={"daily_budget": 30, "max_parallel_tasks": 3},
            permissions={"requires_human_approval": False}
        )
        self.agents.register_agent(research_agent)

        # Register marketing agent
        marketing_agent = Agent(
            id="marketing_agent",
            name="Content Marketer",
            role="marketing",
            capabilities=["content_creation", "social_media", "promotion_strategy", "brand_management"],
            tools=["openai", "content_tools", "social_platforms"],
            limits={"daily_budget": 40, "max_parallel_tasks": 2},
            permissions={"requires_human_approval": True}  # Content publishing needs approval
        )
        self.agents.register_agent(marketing_agent)

        # Register analytics agent
        analytics_agent = Agent(
            id="analytics_agent",
            name="Data Analyst",
            role="analytics",
            capabilities=["performance_analysis", "goal_tracking", "insight_generation", "reporting"],
            tools=["openai", "analytics_tools", "data_visualization"],
            limits={"daily_budget": 25, "max_parallel_tasks": 1},
            permissions={"requires_human_approval": False}
        )
        self.agents.register_agent(analytics_agent)

    async def receive_goal(self, goal: Goal) -> str:
        """Receive and process a new goal"""
        logger.info("Received new goal", goal_id=goal.id, description=goal.description)

        # Analyze goal
        analysis = await self._analyze_goal(goal)

        # Generate execution plan
        plan = await self._generate_plan(goal, analysis)

        # Refine plan using advanced learning insights
        plan = await self.learning.refine_execution_plan(plan, goal, analysis)

        # Store the execution plan locally for API access and monitoring
        self.plan_store[plan.id] = plan

        # Check permissions and request approvals if needed
        approval_required = self.permissions.check_approval_required(plan)
        if approval_required:
            await self._request_approval(plan)
            return plan.id

        # Start execution workflow if the Temporal client is initialized
        if self.temporal_client is not None:
            await self.temporal_client.start_workflow(
                GoalExecutionWorkflow.run,
                args=[plan],
                id=f"goal-{goal.id}",
                task_queue="executive-agent-queue",
            )
        else:
            logger.info("Temporal client not initialized, skipping workflow start", plan_id=plan.id)

        # Emit event
        await self.events.publish("GOAL_RECEIVED", {"goal_id": goal.id, "plan_id": plan.id})

        return plan.id

    def get_plan(self, plan_id: str) -> Optional[ExecutionPlan]:
        return self.plan_store.get(plan_id)

    def get_plan_by_goal(self, goal_id: str) -> Optional[ExecutionPlan]:
        return next((plan for plan in self.plan_store.values() if plan.goal_id == goal_id), None)

    async def _analyze_goal(self, goal: Goal) -> Dict[str, Any]:
        """Analyze goal using AI"""
        # Use OpenAI to analyze the goal
        import openai
        import os

        prompt = f"""
        Analyze this goal and provide a structured analysis:

        Goal: {goal.description}
        Objectives: {', '.join(goal.objectives)}
        Constraints: {goal.constraints}

        Provide analysis in JSON format:
        {{
            "complexity": "low|medium|high",
            "estimated_duration_days": number,
            "required_capabilities": ["list", "of", "capabilities"],
            "risk_level": "low|medium|high",
            "success_criteria": ["measurable", "criteria"],
            "potential_strategies": ["strategy1", "strategy2"],
            "required_agents": ["agent_type1", "agent_type2"]
        }}
        """

        try:
            client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1000
            )

            analysis_text = response.choices[0].message.content
            # Parse JSON response
            import json
            analysis = json.loads(analysis_text.strip('```json').strip('```'))
            return analysis
        except Exception as e:
            logger.error("Failed to analyze goal with AI", error=str(e))
            # Fallback analysis when AI is unavailable or API key is missing
            return {
                "complexity": "medium",
                "estimated_duration_days": 30,
                "required_capabilities": ["research", "marketing", "analytics"],
                "risk_level": "medium",
                "success_criteria": ["earn $100 online"],
                "potential_strategies": ["content creation", "affiliate marketing", "freelancing"],
                "required_agents": ["planner", "research", "marketing", "analytics"]
            }

    async def _generate_plan(self, goal: Goal, analysis: Dict) -> ExecutionPlan:
        """Generate execution plan"""
        # Decompose goal into tasks
        tasks = await self._decompose_goal(goal, analysis)

        # Assign agents to tasks
        assigned_tasks = await self._assign_agents(tasks)

        plan = ExecutionPlan(
            id=f"plan-{goal.id}",
            goal_id=goal.id,
            tasks=assigned_tasks,
            created_at=datetime.now(timezone.utc)
        )

        return plan

    async def _decompose_goal(self, goal: Goal, analysis: Dict) -> List[Task]:
        """Break goal into executable tasks using planner agent"""
        planner = PlannerAgent()
        return await planner.create_execution_plan(goal, analysis)

    async def _assign_agents(self, tasks: List[Task]) -> List[Task]:
        """Assign appropriate agents to tasks"""
        for task in tasks:
            agent = self.agents.find_agent_for_task(task)
            task.assigned_agent = agent.id if agent else None
        return tasks

    async def _request_approval(self, plan: ExecutionPlan):
        """Request human approval for plan"""
        await self.events.publish("APPROVAL_REQUESTED", {"plan_id": plan.id})

    async def execute_task_activity(self, task: Task) -> Dict[str, Any]:
        """Activity to execute a task through appropriate agent"""
        logger.info("Executing task", task_id=task.id, task_type=task.type)

        try:
            # Route to appropriate agent based on task type
            result = await self._route_to_agent(task)

            # Update memory
            await self.memory.store_execution_result(task.id, result)

            # Emit event
            await self.events.publish("TASK_COMPLETED", {"task_id": task.id, "result": result})

            return result
        except Exception as e:
            logger.error("Task execution failed", task_id=task.id, error=str(e))
            await self.events.publish("TASK_FAILED", {"task_id": task.id, "error": str(e)})
            raise

    async def _route_to_agent(self, task: Task) -> Dict[str, Any]:
        """Route task to appropriate agent or worker"""
        task_type = task.type.lower()

        # Route to specialized agents
        if task_type in ["planning", "strategy", "analysis"]:
            from agents.planner.agent import PlannerAgent
            agent = PlannerAgent()
            if "analyze" in task.description.lower():
                return await agent.analyze_goal(self._get_goal_from_task(task))
            else:
                return await agent.create_execution_plan(self._get_goal_from_task(task), {})

        elif task_type in ["research", "market_research", "competitive_analysis"]:
            from agents.research.agent import ResearchAgent
            agent = ResearchAgent()
            if "competition" in task.description.lower():
                return await agent.analyze_competition(task)
            else:
                return await agent.conduct_research(task)

        elif task_type in ["marketing", "content", "promotion"]:
            from agents.marketing.agent import MarketingAgent
            agent = MarketingAgent()
            if "promote" in task.description.lower():
                return await agent.create_promotion_strategy(task)
            elif "optimize" in task.description.lower():
                return await agent.optimize_content(task)
            else:
                return await agent.create_content(task)

        elif task_type in ["analytics", "tracking", "insights"]:
            from agents.analytics.agent import AnalyticsAgent
            agent = AnalyticsAgent()
            if "track" in task.description.lower():
                return await agent.track_goals(task)
            elif "insight" in task.description.lower():
                return await agent.generate_insights(task)
            else:
                return await agent.analyze_performance(task)

        # Route to execution workers
        elif task_type in ["automation", "web", "browser"]:
            from workers.browser.worker import BrowserWorker
            worker = BrowserWorker()
            await worker.initialize()
            result = await worker.execute_task(task.parameters)
            await worker.cleanup()
            return result

        elif task_type in ["api", "webhook", "integration"]:
            from workers.api.worker import APIWorker
            worker = APIWorker()
            await worker.initialize()
            result = await worker.execute_task(task.parameters)
            await worker.cleanup()
            return result

        elif task_type in ["email", "notification"]:
            from workers.email.worker import EmailWorker
            worker = EmailWorker()
            result = await worker.execute_task(task.parameters)
            return result

        elif task_type in ["filesystem", "file", "storage"]:
            from workers.filesystem.worker import FilesystemWorker
            worker = FilesystemWorker()
            result = await worker.execute_task(task.parameters)
            return result

        elif task_type in ["deployment", "ci_cd", "infrastructure"]:
            from workers.deployment.worker import DeploymentWorker
            worker = DeploymentWorker()
            await worker.initialize()
            result = await worker.execute_task(task.parameters)
            await worker.cleanup()
            return result

        else:
            # Default fallback
            return {"status": "completed", "result": f"Task {task.id} executed via default handler"}

    def _get_goal_from_task(self, task: Task) -> Goal:
        """Get goal object from task"""
        return Goal(
            id=task.goal_id,
            description="Earn $100 online in 30 days",
            objectives=["Research opportunities", "Create content", "Monetize"]
        )

    async def monitor_execution(self, plan_id: str):
        """Monitor ongoing execution"""
        pass

    async def handle_failure(self, task_id: str, error: Exception):
        """Handle task failures"""
        logger.error("Task failed", task_id=task_id, error=str(error))
        await self.events.publish("TASK_FAILED", {"task_id": task_id, "error": str(error)})
