from typing import Dict, Any, List
from datetime import datetime, timedelta, timezone
import asyncpg
import redis.asyncio as redis
import json
from shared.models import MemoryEntry
import structlog

logger = structlog.get_logger()

class MemoryManager:
    def __init__(self):
        self.redis = None
        self.postgres = None

    async def initialize(self, redis_url: str, postgres_url: str):
        self.redis = redis.from_url(redis_url)
        self.postgres = await asyncpg.connect(postgres_url)

    async def store_short_term(self, session_id: str, content: Dict[str, Any], ttl_minutes: int = 60):
        """Store short-term memory with TTL"""
        key = f"short_term:{session_id}"
        if self.redis:
            await self.redis.setex(key, ttl_minutes * 60, json.dumps(content))

        if self.postgres:
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)
            await self.postgres.execute("""
                INSERT INTO agent_memory.short_term (session_id, content, expires_at)
                VALUES ($1, $2, $3)
            """, session_id, json.dumps(content), expires_at)

    async def retrieve_short_term(self, session_id: str) -> Dict[str, Any]:
        """Retrieve short-term memory"""
        if not self.redis:
            return {}
        key = f"short_term:{session_id}"
        data = await self.redis.get(key)
        if not data:
            return {}
        try:
            if isinstance(data, bytes):
                data = data.decode('utf-8')
            return json.loads(data)
        except Exception:
            return {}

    async def store_episodic(self, task_id: str, content: Dict[str, Any], outcome: Dict[str, Any]):
        """Store episodic memory"""
        if not self.postgres:
            logger.warning("Postgres not initialized, skipping episodic memory store", task_id=task_id)
            return

        await self.postgres.execute("""
            INSERT INTO agent_memory.episodic (task_id, content, outcome)
            VALUES ($1, $2, $3)
        """, task_id, json.dumps(content), json.dumps(outcome))

    async def store_semantic(self, content_id: str, embedding: List[float], metadata: Dict[str, Any]):
        """Store semantic memory with vector embedding"""
        if not self.postgres:
            logger.warning("Postgres not initialized, skipping semantic memory store", content_id=content_id)
            return

        await self.postgres.execute("""
            INSERT INTO agent_memory.semantic (id, content, metadata)
            VALUES ($1, $2, $3)
        """, content_id, embedding, json.dumps(metadata))

    async def search_semantic(self, query_embedding: List[float], limit: int = 10) -> List[Dict[str, Any]]:
        """Search semantic memory using vector similarity"""
        if not self.postgres:
            return []

        rows = await self.postgres.fetch("""
            SELECT id, metadata, 1 - (content <=> $1) as similarity
            FROM agent_memory.semantic
            ORDER BY content <=> $1
            LIMIT $2
        """, query_embedding, limit)
        return [dict(row) for row in rows]

    async def store_execution_result(self, task_id: str, result: Dict[str, Any]):
        """Store task execution result"""
        await self.store_episodic(task_id, {"task_id": task_id}, result)

    async def get_task_history(self, task_id: str) -> List[Dict[str, Any]]:
        """Get execution history for a task"""
        if not self.postgres:
            return []

        rows = await self.postgres.fetch("""
            SELECT * FROM agent_memory.episodic
            WHERE task_id = $1
            ORDER BY timestamp DESC
        """, task_id)
        return [dict(row) for row in rows]

    async def cleanup_expired(self):
        """Clean up expired short-term memory"""
        await self.postgres.execute("""
            DELETE FROM agent_memory.short_term
            WHERE expires_at < CURRENT_TIMESTAMP
        """)
