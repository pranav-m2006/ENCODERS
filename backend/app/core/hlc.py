"""
Hybrid Logical Clock (HLC) implementation for FloodOps.
Provides monotonically increasing, causal timestamps across distributed and offline nodes.
Format: {physical_iso}-{counter:04d}-{node_id}
"""
from datetime import datetime, timezone
import re
from typing import Tuple

class HybridLogicalClock:
    def __init__(self, node_id: str):
        self.node_id = node_id
        self.latest_physical = datetime.now(timezone.utc)
        self.counter = 0

    def now(self) -> str:
        """Generate a new HLC timestamp for this node."""
        phys_now = datetime.now(timezone.utc)
        if phys_now > self.latest_physical:
            self.latest_physical = phys_now
            self.counter = 0
        else:
            self.counter += 1
        iso_str = self.latest_physical.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        return f"{iso_str}-{self.counter:04d}-{self.node_id}"

    def update(self, remote_hlc: str) -> str:
        """Update local HLC upon receiving an event from a remote node."""
        phys_now = datetime.now(timezone.utc)
        try:
            remote_phys_str, remote_counter_str, _ = remote_hlc.rsplit("-", 2)
            remote_phys = datetime.fromisoformat(remote_phys_str.replace("Z", "+00:00"))
            remote_counter = int(remote_counter_str)
        except Exception:
            # Fallback if unparseable
            return self.now()

        max_phys = max(phys_now, self.latest_physical, remote_phys)
        if max_phys == self.latest_physical and max_phys == remote_phys:
            self.counter = max(self.counter, remote_counter) + 1
        elif max_phys == self.latest_physical:
            self.counter += 1
        elif max_phys == remote_phys:
            self.counter = remote_counter + 1
        else:
            self.counter = 0
        self.latest_physical = max_phys
        iso_str = self.latest_physical.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        return f"{iso_str}-{self.counter:04d}-{self.node_id}"

def check_clock_skew(recorded_at: datetime, received_at: datetime, max_skew_seconds: int = 600) -> bool:
    """Returns True if clock skew between recorded_at and received_at exceeds threshold (default 10 min)."""
    if recorded_at.tzinfo is None:
        recorded_at = recorded_at.replace(tzinfo=timezone.utc)
    if received_at.tzinfo is None:
        received_at = received_at.replace(tzinfo=timezone.utc)
    diff = abs((received_at - recorded_at).total_seconds())
    return diff > max_skew_seconds
