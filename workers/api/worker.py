from typing import Dict, Any, List
import asyncio
import structlog
import httpx
import json
from datetime import datetime

logger = structlog.get_logger()

class APIWorker:
    def __init__(self):
        self.client = None
        self.rate_limits = {}  # Track rate limits per domain

    async def initialize(self):
        """Initialize HTTP client"""
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True
        )
        logger.info("API worker initialized")

    async def execute_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute API task"""
        method = task_data.get("method", "GET").upper()
        url = task_data.get("url", "")
        headers = task_data.get("headers", {})
        params = task_data.get("params", {})
        data = task_data.get("data", {})
        json_data = task_data.get("json", {})

        try:
            if not self.client:
                await self.initialize()

            # Check rate limits
            domain = url.split('/')[2] if '//' in url else url
            if domain in self.rate_limits:
                reset_time = self.rate_limits[domain]
                if datetime.utcnow().timestamp() < reset_time:
                    wait_time = reset_time - datetime.utcnow().timestamp()
                    await asyncio.sleep(wait_time)

            # Make request
            response = await self.client.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                data=data,
                json=json_data if json_data else None
            )

            # Handle rate limiting
            if response.status_code == 429:
                retry_after = response.headers.get('Retry-After', '60')
                reset_time = datetime.utcnow().timestamp() + int(retry_after)
                self.rate_limits[domain] = reset_time
                return {
                    "status": "rate_limited",
                    "retry_after": int(retry_after),
                    "domain": domain
                }

            # Parse response
            result = {
                "status": "success" if response.is_success else "error",
                "status_code": response.status_code,
                "url": str(response.url),
                "headers": dict(response.headers),
                "timestamp": datetime.utcnow().isoformat()
            }

            # Try to parse response content
            try:
                if response.headers.get('content-type', '').startswith('application/json'):
                    result["json"] = response.json()
                else:
                    result["text"] = response.text
            except Exception:
                result["text"] = response.text

            return result

        except Exception as e:
            logger.error("API task failed", error=str(e), task=task_data)
            return {"status": "failed", "error": str(e)}

    async def batch_request(self, requests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Execute multiple API requests in parallel"""
        tasks = [self.execute_task(req) for req in requests]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    "status": "failed",
                    "error": str(result),
                    "request_index": i
                })
            else:
                processed_results.append(result)

        return processed_results

    async def webhook_call(self, webhook_url: str, payload: Dict[str, Any],
                          headers: Dict[str, str] = None) -> Dict[str, Any]:
        """Make a webhook call"""
        task_data = {
            "method": "POST",
            "url": webhook_url,
            "json": payload,
            "headers": headers or {"Content-Type": "application/json"}
        }
        return await self.execute_task(task_data)

    async def graphql_query(self, endpoint: str, query: str,
                           variables: Dict[str, Any] = None,
                           headers: Dict[str, str] = None) -> Dict[str, Any]:
        """Execute a GraphQL query"""
        payload = {"query": query}
        if variables:
            payload["variables"] = variables

        task_data = {
            "method": "POST",
            "url": endpoint,
            "json": payload,
            "headers": headers or {"Content-Type": "application/json"}
        }
        return await self.execute_task(task_data)

    async def rest_crud(self, base_url: str, resource: str, operation: str,
                       data: Dict[str, Any] = None, resource_id: str = None,
                       headers: Dict[str, str] = None) -> Dict[str, Any]:
        """Perform REST CRUD operations"""
        url = f"{base_url}/{resource}"
        if resource_id and operation in ["read", "update", "delete"]:
            url = f"{url}/{resource_id}"

        method_map = {
            "create": "POST",
            "read": "GET",
            "update": "PUT",
            "delete": "DELETE"
        }

        task_data = {
            "method": method_map.get(operation, "GET"),
            "url": url,
            "headers": headers or {"Content-Type": "application/json"}
        }

        if data and operation in ["create", "update"]:
            task_data["json"] = data

        return await self.execute_task(task_data)

    async def cleanup(self):
        """Clean up HTTP client"""
        if self.client:
            await self.client.aclose()
        logger.info("API worker cleaned up")
