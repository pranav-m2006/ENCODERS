"""
Deterministic radio and PA script generator for FloodOps recommendations & instructions.
Designed for emergency HF/VHF radio operators and field loudspeaker broadcasts.
"""
from typing import Dict, Any

def generate_radio_script_for_recommendation(rec: Dict[str, Any]) -> str:
    kind = rec.get("kind")
    proposal = rec.get("proposal", {})
    explanation = rec.get("explanation", {})

    if kind == "CAMP_REDIRECT":
        group_id = proposal.get("group_id", "Evacuation Group")
        allocations = proposal.get("allocations", [])
        alloc_str = ", ".join([f"{a['count']} evacuees to {a['camp_id']}" for a in allocations])
        return (
            f"PRIORITY RADIO MESSAGE - RELIEF CONTROL:\n"
            f"All stations, be advised of split redirect for {group_id}.\n"
            f"Allocations approved: {alloc_str}.\n"
            f"Reason: {explanation.get('summary', 'Camp capacity balancing')}.\n"
            f"Field units acknowledge on HF Channel 4. Over."
        )
    elif kind == "ROUTE_CHANGE":
        return (
            f"URGENT ROUTE NOTICE - DISASTER CONTROL:\n"
            f"Road {proposal.get('avoid_road', 'segment')} is reported BLOCKED.\n"
            f"All transit convoys reroute via {proposal.get('alternate_route', 'recommended corridor')}.\n"
            f"Acknowledge receipt. Over."
        )
    elif kind == "RESCUE_ASSIGN":
        return (
            f"DISPATCH MISSION {proposal.get('mission_id', '')}:\n"
            f"Team {proposal.get('team_id', '')} proceed immediately to Zone {proposal.get('zone_id', '')}.\n"
            f"Casualty count estimate: {proposal.get('people_count', '')}. Boat capability required.\n"
            f"Confirm en route. Over."
        )
    return (
        f"OPERATIONAL BULLETIN: Recommendation {rec.get('id', '')} approved for execution. "
        f"Summary: {explanation.get('summary', 'No summary')}. Over."
    )

def generate_radio_script_for_instruction(title: str, body: str, target_zones: list) -> str:
    zones_str = ", ".join(target_zones) if target_zones else "All District Sectors"
    return (
        f"OFFICIAL EMERGENCY BROADCAST:\n"
        f"From: District Disaster Management Authority.\n"
        f"Target Area: {zones_str}.\n"
        f"Subject: {title}.\n"
        f"Message: {body}.\n"
        f"Repeat: {body}.\n"
        f"All local emergency wardens confirm receipt and sound alarms as instructed. Out."
    )
