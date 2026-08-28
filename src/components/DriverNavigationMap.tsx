import { useEffect, useRef, useState } from "react";
import { Navigation, MapPin, Compass, Locate, AlertCircle, ShieldAlert, Phone } from "lucide-react";
import { getApiUrl } from "@/lib/api";

declare global {
  interface Window {
    L: any;
  }
}

interface DriverNavigationMapProps {
  pickup: string;
  pickupLat?: number;
  pickupLng?: number;
  destination: string;
  destLat?: number;
  destLng?: number;
  passengerName?: string;
  passengerPhone?: string;
  fare?: string | number;
  isOtpVerified?: boolean;
}

export const DriverNavigationMap = ({
  pickup,
  pickupLat = 22.3023,
  pickupLng = 73.3762,
  destination,
  destLat = 22.3500,
  destLng = 73.2400,
  passengerName = "Rider",
  passengerPhone = "+91 9490969706",
  fare,
  isOtpVerified = false
}: DriverNavigationMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);

  const [distanceKm, setDistanceKm] = useState<number>(18.84);
  const [etaMins, setEtaMins] = useState<number>(24);
  const [nextInstruction, setNextInstruction] = useState<string>("In 300m, turn right onto Waghodia Main Road");
  const [mapLoaded, setMapLoaded] = useState(false);

  const API_URL = getApiUrl();

  // Load Leaflet CSS & JS dynamically if not loaded
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!window.L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const initMap = async () => {
    if (!mapContainerRef.current || !window.L || mapInstanceRef.current) return;
    const L = window.L;

    const pLat = Number.isFinite(Number(pickupLat)) ? Number(pickupLat) : 22.3023;
    const pLng = Number.isFinite(Number(pickupLng)) ? Number(pickupLng) : 73.3762;
    const dLat = Number.isFinite(Number(destLat)) ? Number(destLat) : 22.3500;
    const dLng = Number.isFinite(Number(destLng)) ? Number(destLng) : 73.2400;

    // Default coordinates center between pickup and destination
    const centerLat = (pLat + dLat) / 2;
    const centerLng = (pLng + dLng) / 2;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([centerLat, centerLng], 13);
    mapInstanceRef.current = map;

    // Esri Satellite Base Layer
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      maxNativeZoom: 17
    }).addTo(map);

    // World Transportation Road Overlay
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      maxNativeZoom: 17,
      opacity: 0.85
    }).addTo(map);

    // World Places Labels
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      maxNativeZoom: 17
    }).addTo(map);

    // Pickup Custom Marker
    const pickupIcon = L.divIcon({
      className: "custom-pickup-marker",
      html: `
        <div style="background:#10b981;color:white;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:900;box-shadow:0 4px 14px rgba(16,185,129,0.5);border:2px solid #ffffff;white-space:nowrap;display:flex;align-items:center;gap:4px;">
          <span>📍 PICKUP</span>
        </div>
      `,
      iconSize: [80, 30],
      iconAnchor: [40, 15]
    });
    L.marker([pLat, pLng], { icon: pickupIcon }).addTo(map).bindPopup(`<b>Pickup:</b> ${pickup}`);

    // Destination Custom Marker
    const destIcon = L.divIcon({
      className: "custom-dest-marker",
      html: `
        <div style="background:#ef4444;color:white;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:900;box-shadow:0 4px 14px rgba(239,68,68,0.5);border:2px solid #ffffff;white-space:nowrap;display:flex;align-items:center;gap:4px;">
          <span>🎯 DESTINATION</span>
        </div>
      `,
      iconSize: [110, 30],
      iconAnchor: [55, 15]
    });
    L.marker([dLat, dLng], { icon: destIcon }).addTo(map).bindPopup(`<b>Destination:</b> ${destination}`);

    // Driver Current Location Marker (Gliding Car)
    const driverIcon = L.divIcon({
      className: "custom-driver-marker",
      html: `
        <div style="background:#0284c7;color:white;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(2,132,199,0.8);border:3px solid #ffffff;">
          <span style="font-size:18px;">🚖</span>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    const initialDriverLat = pickupLat - 0.005;
    const initialDriverLng = pickupLng - 0.005;
    const driverMarker = L.marker([initialDriverLat, initialDriverLng], { icon: driverIcon }).addTo(map);
    driverMarkerRef.current = driverMarker;

    // Fetch navigation route from backend
    try {
      const res = await fetch(`${API_URL}/api/map/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup_latitude: pickupLat,
          pickup_longitude: pickupLng,
          destination_latitude: destLat,
          destination_longitude: destLng,
          mode: "normal"
        })
      });

      if (res.ok) {
        const routeData = await res.json();
        if (routeData.distance_km) setDistanceKm(routeData.distance_km);
        if (routeData.duration_minutes) setEtaMins(routeData.duration_minutes);

        if (routeData.route_polyline) {
          try {
            const geojson = JSON.parse(routeData.route_polyline);
            const latLngs = geojson.coordinates.map((c: [number, number]) => [c[1], c[0]]);

            // Outer route shadow glow
            L.polyline(latLngs, {
              color: "#0284c7",
              weight: 9,
              opacity: 0.45,
              lineCap: "round",
              lineJoin: "round"
            }).addTo(map);

            // Inner route cyan polyline
            const polyline = L.polyline(latLngs, {
              color: "#38bdf8",
              weight: 5,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round"
            }).addTo(map);

            routePolylineRef.current = polyline;
            map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
          } catch (e) {
            console.warn("Could not parse route polyline:", e);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch driver route:", err);
      // Fallback straight line polyline
      const fallbackPolyline = L.polyline(
        [[initialDriverLat, initialDriverLng], [pickupLat, pickupLng], [destLat, destLng]],
        { color: "#38bdf8", weight: 5, dashArray: "8, 8" }
      ).addTo(map);
      map.fitBounds(fallbackPolyline.getBounds(), { padding: [40, 40] });
    }

    setMapLoaded(true);
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current && pickupLat && destLat) {
      const L = window.L;
      if (L && routePolylineRef.current) {
        mapInstanceRef.current.fitBounds(routePolylineRef.current.getBounds(), { padding: [40, 40] });
      } else {
        mapInstanceRef.current.setView([(pickupLat + destLat) / 2, (pickupLng + destLng) / 2], 13);
      }
    }
  };

  return (
    <div className="relative w-full h-[420px] rounded-3xl overflow-hidden border border-border/60 shadow-2xl bg-black/90">
      {/* Leaflet Satellite Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* Top Navigation Instruction Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shrink-0">
            <Navigation size={22} className="animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">DRIVER NAVIGATION</p>
            <p className="text-xs font-bold text-foreground truncate">{nextInstruction}</p>
          </div>
        </div>
        <button
          onClick={handleRecenter}
          className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-all shadow-sm shrink-0"
          title="Recenter Route"
        >
          <Locate size={18} />
        </button>
      </div>

      {/* Bottom Live Metrics & Passenger Card */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Est. Distance</span>
            <span className="text-xl font-black text-foreground">{distanceKm} km</span>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Arrival ETA</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{etaMins} mins</span>
          </div>
          <div className="h-8 w-px bg-border/60 hidden sm:block" />
          <div className="hidden sm:flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Trip Status</span>
            <span className="text-xs font-bold text-foreground capitalize">
              {isOtpVerified ? "On Road ➔ Destination" : "Heading to Pickup"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${passengerPhone}`}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider hover:brightness-110 transition-all shadow-md"
          >
            <Phone size={14} /> Call Rider
          </a>
        </div>
      </div>
    </div>
  );
};
