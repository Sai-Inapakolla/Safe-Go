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
        results = []

        # 1. Exact prefix matches
        for loc in self.locations:
            if loc["name"].lower().startswith(q):
                results.append(loc)
                if len(results) >= limit:
                    return results

        # 2. Substring matches
        for loc in self.locations:
            if loc not in results and (q in loc["name"].lower() or q in loc["state"].lower()):
                results.append(loc)
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
