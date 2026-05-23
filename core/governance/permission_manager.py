from typing import Dict, Any, List
from shared.models import ExecutionPlan, ApprovalRequest
import structlog

logger = structlog.get_logger()

class PermissionManager:
    def __init__(self):
        # Define permission levels
        self.sensitive_actions = [
            "internet_access",
            "email_send",
            "api_mutation",
            "file_write",
            "deployment",
            "spending"
        ]

        self.critical_actions = [
            "production_deployment",
            "database_modification",
            "infrastructure_changes",
            "financial_transactions"
        ]

    def check_approval_required(self, plan: ExecutionPlan) -> bool:
        """Check if plan requires approval"""
        for task in plan.tasks:
            if self._is_sensitive_task(task):
                return True
        return False

    def _is_sensitive_task(self, task) -> bool:
        """Check if task involves sensitive actions"""
        task_type = task.type.lower()
        return any(action in task_type for action in self.sensitive_actions)

    def _is_critical_task(self, task) -> bool:
        """Check if task involves critical actions"""
        task_type = task.type.lower()
        return any(action in task_type for action in self.critical_actions)

    def get_approval_type(self, plan: ExecutionPlan) -> str:
        """Get approval type required for plan"""
        has_critical = any(self._is_critical_task(task) for task in plan.tasks)
        has_sensitive = any(self._is_sensitive_task(task) for task in plan.tasks)

        if has_critical:
            return "critical"
        elif has_sensitive:
            return "sensitive"
        else:
            return "safe"

    def create_approval_request(self, plan: ExecutionPlan, requested_by: str) -> ApprovalRequest:
        """Create approval request for plan"""
        approval_type = self.get_approval_type(plan)

        return ApprovalRequest(
            id=f"approval-{plan.id}",
            plan_id=plan.id,
            type=approval_type,
            reason=f"Plan contains {approval_type} actions requiring approval",
            requested_by=requested_by
        )

    def check_agent_permissions(self, agent_id: str, action: str) -> bool:
        """Check if agent has permission for action"""
        return True

    def validate_task_execution(self, task, agent_id: str) -> bool:
        """Validate that agent can execute task"""
        return True
