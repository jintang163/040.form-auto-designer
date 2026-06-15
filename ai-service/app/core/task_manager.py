import json
import uuid
from datetime import datetime
from typing import Optional

from loguru import logger

from app.schemas.models import RecognitionResult, RecognitionTask, TaskStatus


class TaskManager:
    def __init__(self, redis_enabled: bool = False, redis_url: Optional[str] = None):
        self._tasks: dict[str, RecognitionTask] = {}
        self._results: dict[str, RecognitionResult] = {}
        self._redis_enabled = redis_enabled
        self._redis_url = redis_url
        self._redis = None

        if redis_enabled and redis_url:
            try:
                import redis
                self._redis = redis.from_url(redis_url, decode_responses=True)
                self._redis.ping()
                logger.info("Redis connected: {}", redis_url)
            except Exception as e:
                logger.warning("Redis connection failed, falling back to memory: {}", e)
                self._redis = None
                self._redis_enabled = False

    def create_task(self, file_type: str) -> str:
        task_id = uuid.uuid4().hex[:16]
        now = datetime.now().isoformat()
        task = RecognitionTask(
            task_id=task_id,
            file_type=file_type,
            status=TaskStatus.PENDING,
            progress=0,
            created_at=now,
            updated_at=now,
        )
        self._tasks[task_id] = task
        self._results[task_id] = RecognitionResult(
            task_id=task_id,
            status=TaskStatus.PENDING,
            progress=0,
        )
        if self._redis:
            self._redis.set(f"task:{task_id}", task.model_dump_json())
            self._redis.set(f"result:{task_id}", self._results[task_id].model_dump_json())
        logger.info("Task created: {} ({})", task_id, file_type)
        return task_id

    def update_task_status(self, task_id: str, status: TaskStatus, progress: int = 0,
                           result: Optional[dict] = None, error: Optional[str] = None):
        if task_id not in self._tasks:
            logger.warning("Task not found: {}", task_id)
            return

        now = datetime.now().isoformat()
        task = self._tasks[task_id]
        task.status = status
        task.progress = progress
        task.updated_at = now

        res = self._results[task_id]
        res.status = status
        res.progress = progress
        if result is not None:
            res.schema = result
        if error is not None:
            res.error = error

        if self._redis:
            self._redis.set(f"task:{task_id}", task.model_dump_json())
            self._redis.set(f"result:{task_id}", res.model_dump_json())

        logger.info("Task {} updated: status={}, progress={}%", task_id, status.value, progress)

    def get_task(self, task_id: str) -> Optional[RecognitionTask]:
        if task_id in self._tasks:
            return self._tasks[task_id]
        if self._redis:
            data = self._redis.get(f"task:{task_id}")
            if data:
                return RecognitionTask.model_validate_json(data)
        return None

    def get_result(self, task_id: str) -> Optional[RecognitionResult]:
        if task_id in self._results:
            return self._results[task_id]
        if self._redis:
            data = self._redis.get(f"result:{task_id}")
            if data:
                return RecognitionResult.model_validate_json(data)
        return None


_task_manager: Optional[TaskManager] = None


def get_task_manager() -> TaskManager:
    global _task_manager
    if _task_manager is None:
        from app.core.config import settings
        _task_manager = TaskManager(
            redis_enabled=settings.redis_enabled,
            redis_url=settings.redis_url,
        )
    return _task_manager
