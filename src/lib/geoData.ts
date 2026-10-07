import indianLocations from "@/data/indian_locations.json";

export interface GeoLocation {
  name: string;
  state: string;
  display_name: string;
  lat: number;
  lng: number;
}

// Popular landmarks and specific campus/corridors in Vadodara and nearby regions
const POPULAR_LOCAL_PLACES: Record<string, { lat: number; lng: number }> = {
  "vaghodia": { lat: 22.3051, lng: 73.4002 },
  "vaghodia ina": { lat: 22.3000, lng: 73.3833 },
  "waghodia": { lat: 22.3051, lng: 73.4002 },
  "parul": { lat: 22.2887, lng: 73.3638 },
  "parul university": { lat: 22.2887, lng: 73.3638 },
  "vadodara": { lat: 22.3072, lng: 73.1812 },
  "baroda": { lat: 22.3072, lng: 73.1812 },
  "sayajigunj": { lat: 22.3106, lng: 73.1878 },
  "alkapuri": { lat: 22.3129, lng: 73.1706 },
  "chowkdi": { lat: 22.3120, lng: 73.2250 },
  "gotri": { lat: 22.3168, lng: 73.1491 },
  "manjalpur": { lat: 22.2684, lng: 73.1956 },
  "fatehgunj": { lat: 22.3255, lng: 73.1884 },
  "karelibaug": { lat: 22.3217, lng: 73.2033 },
  "tarsali": { lat: 22.2530, lng: 73.2090 },
  "sama": { lat: 22.3410, lng: 73.1990 },
  "makarpura": { lat: 22.2470, lng: 73.1930 },
  "gorwa": { lat: 22.3380, lng: 73.1590 },
  "akota": { lat: 22.2980, lng: 73.1680 },
  "vasna": { lat: 22.2850, lng: 73.1480 },
  "ahmedabad": { lat: 23.0225, lng: 72.5714 },
  "surat": { lat: 21.1702, lng: 72.8311 },
  "rajkot": { lat: 22.3039, lng: 70.8022 },
  "mumbai": { lat: 19.0760, lng: 72.8777 },
  "delhi": { lat: 28.6139, lng: 77.2090 },
  "bengaluru": { lat: 12.9716, lng: 77.5946 },
  "bangalore": { lat: 12.9716, lng: 77.5946 },
};

export const searchClientLocations = (query: string, limit: number = 10): GeoLocation[] => {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const primary = q.split(",")[0].trim();

  const results: GeoLocation[] = [];
  const seen = new Set<string>();

  const add = (loc: GeoLocation) => {
    const key = `${loc.name.toLowerCase()}_${loc.state.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(loc);
    }
  };

  // 1. Check popular local landmarks first
  for (const [key, coords] of Object.entries(POPULAR_LOCAL_PLACES)) {
    if (q.includes(key) || primary.includes(key) || key.includes(primary)) {
      add({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        state: "Gujarat",
        display_name: `${key.charAt(0).toUpperCase() + key.slice(1)}, Vadodara, Gujarat, India`,
        lat: coords.lat,
        lng: coords.lng,
      });
      if (results.length >= limit) return results;
    }
  }

  // 2. Exact match in full dataset
  for (const loc of (indianLocations as GeoLocation[])) {
    const nameLower = loc.name.toLowerCase();
    const dispLower = loc.display_name.toLowerCase();
    if (nameLower === primary || dispLower === q || nameLower === q) {
      add(loc);
      if (results.length >= limit) return results;
    }
  }

  // 3. Prefix match
  for (const loc of (indianLocations as GeoLocation[])) {
    const nameLower = loc.name.toLowerCase();
    if (nameLower.startsWith(primary) || (primary.length >= 3 && primary.startsWith(nameLower))) {
      add(loc);
      if (results.length >= limit) return results;
    }
  }

  // 4. Substring match
  for (const loc of (indianLocations as GeoLocation[])) {
    const nameLower = loc.name.toLowerCase();
    if (nameLower.includes(primary) || primary.includes(nameLower) || loc.display_name.toLowerCase().includes(primary)) {
      add(loc);
      if (results.length >= limit) return results;
    }
  }

  return results;
};

export const findClientCoords = (query: string): { lat: number; lng: number } | null => {
  if (!query || !query.trim()) return null;
  const q = query.trim().toLowerCase();
  const primary = q.split(",")[0].trim();

  // Check popular local landmarks first
  for (const [key, coords] of Object.entries(POPULAR_LOCAL_PLACES)) {
    if (q.includes(key) || primary.includes(key) || key.includes(primary)) {
      return coords;
    }
  }

  // Search in full dataset
  const matches = searchClientLocations(query, 1);
  if (matches.length > 0) {
    return { lat: matches[0].lat, lng: matches[0].lng };
  }

  return null;
};
