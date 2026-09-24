"""
Printable camp field sheet generator (HTML format).
Generates an emergency offline paper sheet for camp coordinators,
complete with current instructions, expected inbound groups,
resource inventories, and a blank back-entry ledger for paper logging.
"""
from typing import Dict, Any, List
from datetime import datetime, timezone

def generate_camp_field_sheet_html(
    camp: Dict[str, Any],
    camp_state: Dict[str, Any],
    inbound_groups: List[Dict[str, Any]],
    instructions: List[Dict[str, Any]]
) -> str:
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    
    inbound_rows = ""
    for g in inbound_groups:
        inbound_rows += f"""
        <tr>
            <td style="border:1px solid #ccc; padding:6px;">{g.get('group_id')}</td>
            <td style="border:1px solid #ccc; padding:6px;">{g.get('count_likely', 0)} ({g.get('count_min', 0)}-{g.get('count_max', 0)})</td>
            <td style="border:1px solid #ccc; padding:6px;">{g.get('source_zone_id', 'Zone')}</td>
            <td style="border:1px solid #ccc; padding:6px;">{g.get('status', 'IN_TRANSIT')}</td>
            <td style="border:1px solid #ccc; padding:6px; background:#fafafa;">[ ] Confirmed [ ] Partial: ____</td>
        </tr>
        """

    instruction_items = ""
    for inst in instructions:
        instruction_items += f"""
        <li style="margin-bottom:6px;">
            <strong>{inst.get('title')}:</strong> {inst.get('body')} <em>({inst.get('severity')})</em>
        </li>
        """

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title>Camp Field Sheet - {camp.get('name')}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #111; }}
        h1, h2, h3 {{ margin: 4px 0; }}
        .header {{ border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; }}
        .stat-box {{ display: inline-block; border: 1px solid #999; padding: 8px 14px; margin-right: 10px; border-radius: 4px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
        .watermark {{ color: #d00; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>FloodOps Emergency Field Sheet</h1>
            <h2>Camp: {camp.get('name')} (ID: {camp.get('camp_id')})</h2>
            <p>Generated: {now_str} | <span class="watermark">DECISION SUPPORT - VERIFY BEFORE ACTING</span></p>
        </div>
        <div style="text-align:right;">
            <h3>Capacity: {camp.get('capacity')}</h3>
            <p>HF Radio CH-4 | Camp Officer: {camp.get('contact_name', 'Coordinator')}</p>
        </div>
    </div>

    <div>
        <div class="stat-box"><strong>Occupied:</strong> {camp_state.get('occupied', 0)}</div>
        <div class="stat-box"><strong>Reserved (In Transit):</strong> {camp_state.get('reserved', 0)}</div>
        <div class="stat-box"><strong>Projected Total:</strong> {camp_state.get('projected', 0)}</div>
        <div class="stat-box"><strong>Available Beds:</strong> {camp_state.get('available', 0)}</div>
        <div class="stat-box"><strong>Status:</strong> {camp.get('status', 'OPEN')}</div>
    </div>

    <h3 style="margin-top:20px;">Active Authority Instructions</h3>
    <ul>
        {instruction_items or "<li>No active evacuation bulletins at this hour.</li>"}
    </ul>

    <h3>Expected Inbound Evacuation Groups</h3>
    <table>
        <thead>
            <tr style="background:#eee; text-align:left;">
                <th style="border:1px solid #ccc; padding:6px;">Group ID</th>
                <th style="border:1px solid #ccc; padding:6px;">Est. Count</th>
                <th style="border:1px solid #ccc; padding:6px;">Origin</th>
                <th style="border:1px solid #ccc; padding:6px;">Status</th>
                <th style="border:1px solid #ccc; padding:6px;">Field Check-in Checkbox</th>
            </tr>
        </thead>
        <tbody>
            {inbound_rows or "<tr><td colspan='5' style='padding:8px;'>No inbound groups currently scheduled.</td></tr>"}
        </tbody>
    </table>

    <h3 style="margin-top:25px;">Back-Entry Paper Ledger (For Manual Logging & Late Entry)</h3>
    <p style="font-size:12px; color:#555;">Record all walk-ins and manual arrivals here if tablet or power is lost. Back-enter into FloodOps app once reconnected.</p>
    <table>
        <thead>
            <tr style="background:#eee; text-align:left;">
                <th style="border:1px solid #999; padding:8px; width:120px;">Time Occurred</th>
                <th style="border:1px solid #999; padding:8px; width:90px;">Count (+ / -)</th>
                <th style="border:1px solid #999; padding:8px;">Vulnerability Summary (Elderly / Children / Medical)</th>
                <th style="border:1px solid #999; padding:8px; width:120px;">Staff Initials</th>
                <th style="border:1px solid #999; padding:8px; width:90px;">App Synced [ ]</th>
            </tr>
        </thead>
        <tbody>
            {"".join(["<tr><td style='border:1px solid #999; height:32px;'></td><td style='border:1px solid #999;'></td><td style='border:1px solid #999;'></td><td style='border:1px solid #999;'></td><td style='border:1px solid #999;'></td></tr>" for _ in range(6)])}
        </tbody>
    </table>
</body>
</html>"""
    return html
