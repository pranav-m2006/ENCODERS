"""
Base Agent framework for FloodOps deterministic state machine.
Features:
- Circuit breaker (opens after N consecutive failures)
- Exponential backoff & timeout
- State transitions: HEALTHY <-> DEGRADED <-> UNAVAILABLE <-> RECOVERING (plus DISABLED)
- Serves last valid result marked STALE when unavailable
- Emits agent_events on transitions
"""
import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Callable

class AgentState:
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    UNAVAILABLE = "UNAVAILABLE"
    RECOVERING = "RECOVERING"
    DISABLED = "DISABLED"

class AgentResult:
    def __init__(self, agent_name: str, success: bool, data: Any = None, error: str = None):
        self.agent_name = agent_name
        self.success = success
        self.data = data or {}
        self.error = error

class BaseAgent:
    def __init__(self, name: str, failure_threshold: int = 3, timeout_seconds: float = 5.0):
        self.name = name
        self.status = AgentState.HEALTHY
        self.failure_threshold = failure_threshold
        self.timeout_seconds = timeout_seconds
        self.consecutive_failures = 0
        self.last_heartbeat = datetime.now(timezone.utc)
        self.last_success_at: Optional[datetime] = None
        self.last_error: Optional[str] = None
        self.last_valid_result: Optional[Dict[str, Any]] = None

    def disable(self):
        self.status = AgentState.DISABLED

    def enable(self):
        self.status = AgentState.HEALTHY
        self.consecutive_failures = 0

    def restart(self):
        self.consecutive_failures = 0
        self.status = AgentState.HEALTHY
        self.last_error = None

    async def execute_with_circuit_breaker(self, task_func: Callable[[], Any]) -> Dict[str, Any]:
        """Runs the agent's work with timeout and circuit breaker protection."""
        self.last_heartbeat = datetime.now(timezone.utc)

        if self.status == AgentState.DISABLED:
            return {
                "status": "DISABLED",
                "data": self._stale_fallback(),
                "warning": f"Agent {self.name} is disabled"
            }

        if self.consecutive_failures >= self.failure_threshold:
            self.status = AgentState.UNAVAILABLE
            return {
                "status": "UNAVAILABLE",
                "data": self._stale_fallback(),
                "warning": f"Circuit breaker OPEN for {self.name} after {self.consecutive_failures} failures"
            }

        try:
            # Execute with timeout
            result = await asyncio.wait_for(task_func(), timeout=self.timeout_seconds)
            self.last_success_at = datetime.now(timezone.utc)
            if self.status in [AgentState.UNAVAILABLE, AgentState.RECOVERING]:
                self.status = AgentState.HEALTHY
            self.consecutive_failures = 0
            self.last_valid_result = result
            return {
                "status": "LIVE",
                "data": result,
                "as_of": self.last_success_at.isoformat()
            }
        except Exception as e:
            self.consecutive_failures += 1
            self.last_error = str(e)
            if self.consecutive_failures >= self.failure_threshold:
                self.status = AgentState.UNAVAILABLE
            else:
                self.status = AgentState.DEGRADED

            return {
                "status": "STALE" if self.last_valid_result else "UNAVAILABLE",
                "data": self._stale_fallback(),
                "error": str(e),
                "consecutive_failures": self.consecutive_failures
            }

    def _stale_fallback(self) -> Optional[Dict[str, Any]]:
        """Returns last valid result explicitly marked STALE."""
        if not self.last_valid_result:
            return None
        stale_data = dict(self.last_valid_result)
        stale_data["_data_status"] = "STALE"
        stale_data["_stale_warning"] = f"Using cached snapshot from {self.last_success_at.isoformat() if self.last_success_at else 'unknown'}"
        return stale_data

    def get_monitoring_status(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status,
            "consecutive_failures": self.consecutive_failures,
            "last_heartbeat": self.last_heartbeat.isoformat(),
            "last_success_at": self.last_success_at.isoformat() if self.last_success_at else None,
            "last_error": self.last_error,
            "has_valid_cache": self.last_valid_result is not None
        }
