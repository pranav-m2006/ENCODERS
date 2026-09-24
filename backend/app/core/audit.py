"""
Append-only, hash-chained audit log system for FloodOps.
Every sensitive action (approvals, overrides, conflict resolution, role changes) is chained.
"""
import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

GENESIS_HASH = "0" * 64

def compute_entry_hash(
    prev_hash: str,
    action: str,
    actor_id: str,
    target: str,
    timestamp: str,
    details: Dict[str, Any]
) -> str:
    canonical_details = json.dumps(details, sort_keys=True)
    raw = f"{prev_hash}|{action}|{actor_id}|{target}|{timestamp}|{canonical_details}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def verify_audit_chain(entries: List[Dict[str, Any]]) -> Tuple[bool, Optional[int], Optional[str]]:
    """
    Verifies the integrity of the audit chain from genesis.
    Returns (is_valid, broken_index, reason)
    """
    expected_prev = GENESIS_HASH
    for idx, entry in enumerate(entries):
        actual_prev = entry.get("prev_hash")
        if actual_prev != expected_prev:
            return False, idx, f"Broken prev_hash at index {idx}: expected {expected_prev}, got {actual_prev}"
        
        expected_hash = compute_entry_hash(
            prev_hash=actual_prev,
            action=entry.get("action", ""),
            actor_id=entry.get("actor_id", ""),
            target=entry.get("target", ""),
            timestamp=entry.get("timestamp", ""),
            details=entry.get("details", {})
        )
        if entry.get("hash") != expected_hash:
            return False, idx, f"Hash mismatch at index {idx}: computed {expected_hash}, recorded {entry.get('hash')}"
        
        expected_prev = entry.get("hash")
    
    return True, None, "Audit chain integrity verified"
