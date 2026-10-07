from __future__ import annotations
import csv
import os
from typing import List, Dict, Optional

# Paths to search for Indian Cities Geo Data.csv
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", ".."))

POSSIBLE_PATHS = [
    os.path.join(PROJECT_ROOT, "Indian Cities Geo Data.csv"),
    os.path.join(os.path.dirname(PROJECT_ROOT), "Indian Cities Geo Data.csv"),
    os.path.join(PROJECT_ROOT, "backend", "Indian Cities Geo Data.csv"),
    "Indian Cities Geo Data.csv"
]

class IndianGeoService:
    def __init__(self):
        self.locations: List[Dict[str, any]] = []
        self._load_dataset()

    def _load_dataset(self):
        target_path = None
        for path in POSSIBLE_PATHS:
            if os.path.exists(path):
                target_path = path
                break

        if not target_path:
            print(f"[GeoService Warning] CSV dataset 'Indian Cities Geo Data.csv' not found. Checked: {POSSIBLE_PATHS}")
            return

        try:
            with open(target_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    raw_loc = row.get("Location", "").replace(" Latitude and Longitude", "").strip()
                    state = row.get("State", "").strip()
                    try:
                        lat = float(row.get("Latitude", 0))
                        lng = float(row.get("Longitude", 0))
                    except ValueError:
                        continue

                    if raw_loc and lat != 0 and lng != 0:
                        self.locations.append({
                            "name": raw_loc,
                            "state": state,
                            "display_name": f"{raw_loc}, {state}, India",
                            "lat": lat,
                            "lng": lng
                        })
            print(f"[GeoService] Successfully indexed {len(self.locations)} Indian cities and locations from {target_path}")
        except Exception as e:
            print(f"[GeoService Error] Failed to load dataset: {e}")

    def search_locations(self, query: str, limit: int = 15) -> List[Dict[str, any]]:
        if not query or len(query.strip()) == 0:
            return []

        q = query.strip().lower()
        primary_token = q.split(",")[0].strip()
        results = []
        seen = set()

        def add_loc(loc):
            key = (loc["name"], loc["state"])
            if key not in seen:
                seen.add(key)
                results.append(loc)

        # 1. Exact display_name match or exact name match
        for loc in self.locations:
            name_lower = loc["name"].lower()
            disp_lower = loc.get("display_name", "").lower()
            if disp_lower == q or name_lower == primary_token or name_lower == q:
                add_loc(loc)
                if len(results) >= limit:
                    return results

        # 2. Name starts with primary token or q starts with name
        for loc in self.locations:
            name_lower = loc["name"].lower()
            if name_lower.startswith(primary_token) or (len(name_lower) >= 3 and primary_token.startswith(name_lower)):
                add_loc(loc)
                if len(results) >= limit:
                    return results

        # 3. Substring match in name or display_name
        for loc in self.locations:
            name_lower = loc["name"].lower()
            disp_lower = loc.get("display_name", "").lower()
            if primary_token in name_lower or name_lower in q or q in disp_lower:
                add_loc(loc)
                if len(results) >= limit:
                    return results

        # 4. State match fallback if still have room
        for loc in self.locations:
            if primary_token in loc["state"].lower():
                add_loc(loc)
                if len(results) >= limit:
                    return results

        return results

    def get_coords(self, query: str) -> Optional[Dict[str, float]]:
        if not query:
            return None
        matches = self.search_locations(query, limit=1)
        if matches:
            return {"lat": matches[0]["lat"], "lng": matches[0]["lng"]}
        return None

# Global singleton instance
geo_service = IndianGeoService()
