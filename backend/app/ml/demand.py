from typing import Dict, Any, List

# Demand rates per person per day
DAILY_DEMAND = {
    "food": 3.0,       # meals
    "water": 15.0,     # liters
    "medicine": 0.05,  # kits
    "fuel": 0.5,       # liters
    "beds": 1.0        # beds
}

def calculate_hours_of_cover(stock: Dict[str, float], occupancy: int) -> Dict[str, Any]:
    if occupancy <= 0:
        occupancy = 1 # Avoid division by zero, min 1 occupant

    hourly_demand = {
        item: (rate * occupancy) / 24.0
        for item, rate in DAILY_DEMAND.items()
    }

    hours = {}
    shortages = []

    for item in ["food", "water", "medicine", "fuel"]:
        st = stock.get(item, 0.0)
        h_rate = hourly_demand[item]
        cover_h = round(st / h_rate, 1) if h_rate > 0 else 999.0
        hours[item] = cover_h
        if cover_h < 12.0:
            shortages.append(f"{item.capitalize()} cover is critically low ({cover_h}h)")

    # Bed availability check
    bed_stock = stock.get("beds", 0.0)
    hours["beds"] = round(bed_stock, 0)
    if bed_stock < occupancy:
        shortages.append(f"Bed shortage: {int(occupancy - bed_stock)} more beds needed")

    min_hours = min(hours["food"], hours["water"], hours["medicine"], hours["fuel"])

    return {
        "hours_of_cover": hours,
        "min_hours_of_cover": min_hours,
        "shortages": shortages,
        "is_shortage": min_hours < 12.0 or bed_stock < occupancy
    }
