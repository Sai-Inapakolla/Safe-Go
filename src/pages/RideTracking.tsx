import { useState, useEffect, useRef } from "react";
import { SafetyScoreBar } from "@/components/SafetyScoreBar";
import { SOSButton } from "@/components/SOSButton";
import { ArrowLeft, Phone, MessageCircle, Share2, Star, ShieldCheck, Navigation } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

declare global { interface Window { L: any } }

const RideTracking = () => {
  const { id } = useParams<{ id: string }>();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);

  const [rideData, setRideData] = useState<any>(null);
  const [driverPos, setDriverPos] = useState<{ lat: number, lng: number } | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [safetyPrediction, setSafetyPrediction] = useState<string>("Stable");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // Smooth animation helper
  const animateMarkerTo = (marker: any, targetLat: number, targetLng: number, duration: number = 350) => {
    if (!marker) return;
    const startLatLng = marker.getLatLng();
    const startLat = startLatLng.lat;
    const startLng = startLatLng.lng;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;
      const currentLat = startLat + (targetLat - startLat) * easeProgress;
      const currentLng = startLng + (targetLng - startLng) * easeProgress;
      marker.setLatLng([currentLat, currentLng]);

      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  useEffect(() => {
    // Fetch initial ride details
    const fetchRide = async () => {
      const token = localStorage.getItem("token");
      if (!token || !id) return;
      try {
        const res = await fetch(`${API_URL}/api/rides/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRideData(data);
          if (data.duration_minutes) setEtaMinutes(data.duration_minutes);
          if (data.distance_km) setDistanceKm(data.distance_km);
        }
      } catch (err) {
        console.warn("Failed to fetch ride details:", err);
      }
    };
    fetchRide();
  }, [id]);

  useEffect(() => {
    // Initialize Leaflet Map
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!mapContainerRef.current || !window.L || mapInstanceRef.current) return;
      const L = window.L;

      const pLat = rideData?.pickup_latitude || 22.3023;
      const pLng = rideData?.pickup_longitude || 73.3762;

      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([pLat, pLng], 15);
      mapInstanceRef.current = map;

      L.control.zoom({ position: "bottomright" }).addTo(map);

      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles &copy; Esri", maxZoom: 19, maxNativeZoom: 17
      }).addTo(map);

      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19, maxNativeZoom: 17
      }).addTo(map);

      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19, maxNativeZoom: 17
      }).addTo(map);

      // Render Pickup & Dest Markers
      if (rideData?.pickup_latitude && rideData?.pickup_longitude) {
        const pickupIcon = L.divIcon({
          html: `<div style="background:#10b981;width:14px;height:14px;border:2px solid white;border-radius:50%;box-shadow:0 0 10px #10b98180;"></div>`,
          className: "", iconSize: [14, 14], iconAnchor: [7, 7]
        });
        L.marker([rideData.pickup_latitude, rideData.pickup_longitude], { icon: pickupIcon }).addTo(map);
      }

      if (rideData?.destination_latitude && rideData?.destination_longitude) {
        const destIcon = L.divIcon({
          html: `<div style="background:#ef4444;width:14px;height:14px;border:2px solid white;border-radius:3px;box-shadow:0 0 10px #ef444480;"></div>`,
          className: "", iconSize: [14, 14], iconAnchor: [7, 7]
        });
        L.marker([rideData.destination_latitude, rideData.destination_longitude], { icon: destIcon }).addTo(map);
      }

      // Render Route Polyline
      if (rideData?.route_polyline) {
        try {
          const geojson = JSON.parse(rideData.route_polyline);
          const coords = geojson.coordinates.map((c: any) => [c[1], c[0]]);
          routePolylineRef.current = L.polyline(coords, { color: '#3b82f6', weight: 6, opacity: 0.8, className: 'route-glow' }).addTo(map);
          L.polyline(coords, { color: 'white', weight: 2, dashArray: '8 8' }).addTo(map);
          map.fitBounds(L.latLngBounds(coords), { padding: [50, 50] });
        } catch (e) {
          console.warn("Failed to render polyline:", e);
        }
      }

      // Driver marker
      const driverHtml = `
        <div style="background:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.25);border:2px solid #3b82f6;">
          🚖
        </div>
      `;
      const driverIcon = L.divIcon({ html: driverHtml, className: "", iconSize: [32, 32], iconAnchor: [16, 16] });
      driverMarkerRef.current = L.marker([pLat, pLng], { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);
    };

    if (window.L) initMap();
    else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => initMap();
      document.head.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [rideData]);

  // Connect to WebSocket for live driver location updates
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const wsUrl = (API_URL.replace(/^http/, "ws")) + `/ws/ride/${id}/track?token=${encodeURIComponent(token)}`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "driver_location" && msg.latitude && msg.longitude) {
            setDriverPos({ lat: msg.latitude, lng: msg.longitude });
            if (driverMarkerRef.current) {
              animateMarkerTo(driverMarkerRef.current, msg.latitude, msg.longitude, 400);
            }
            if (msg.eta_minutes) setEtaMinutes(msg.eta_minutes);
            if (msg.distance_km) setDistanceKm(msg.distance_km);
            if (msg.ai_safety_prediction) setSafetyPrediction(msg.ai_safety_prediction);

            if (msg.route_polyline && mapInstanceRef.current && window.L) {
              try {
                const geojson = JSON.parse(msg.route_polyline);
                const coords = geojson.coordinates.map((c: any) => [c[1], c[0]]);
                if (routePolylineRef.current) {
                  mapInstanceRef.current.removeLayer(routePolylineRef.current);
                }
                routePolylineRef.current = window.L.polyline(coords, { color: '#10b981', weight: 6, opacity: 0.9 }).addTo(mapInstanceRef.current);
                toast.info("Dynamic AI Reroute Applied: Safer path calculated.", { icon: "🛡️" });
              } catch (e) {
                console.warn("Reroute polyline error:", e);
              }
            }
          }
        } catch (e) {
          console.warn("WebSocket parse error:", e);
        }
      };
    } catch (e) {
      console.warn("WebSocket connection error:", e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [id]);

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/home" className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-secondary">
            <ArrowLeft size={14} />
          </Link>
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" /> Live Trip Tracking
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck size={12} /> {safetyPrediction} Risk
          </span>
          <button className="text-sm text-primary font-medium flex items-center gap-1">
            <Share2 size={14} /> Share Location
          </button>
        </div>
      </div>

      {/* Leaflet Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />
      </div>

      {/* Bottom panel */}
      <div className="rounded-t-3xl border-t border-border bg-background p-6 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] z-10">
        {/* Driver info */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20">
            {rideData?.driver?.user?.full_name ? rideData.driver.user.full_name.split(" ").map((n: string) => n[0]).join("") : "JD"}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{rideData?.driver?.user?.full_name || "James D."}</p>
            <p className="text-xs text-muted-foreground">
              <Star size={10} className="inline fill-amber-400 text-amber-400" /> {rideData?.driver?.average_rating || 4.9} · {rideData?.driver?.vehicle?.make || "Toyota"} {rideData?.driver?.vehicle?.model || "Vios"} · {rideData?.driver?.vehicle?.plate_number || "ABC 123"}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-secondary" aria-label="Call">
              <Phone size={16} />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-secondary" aria-label="Chat">
              <MessageCircle size={16} />
            </button>
          </div>
        </div>

        {/* Route Details */}
        <div className="mt-4 flex items-center gap-3 text-sm">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary truncate max-w-[120px]">
            {rideData?.pickup_address || "Pickup"}
          </span>
          <span className="text-primary">→</span>
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 truncate max-w-[120px]">
            {rideData?.destination_address || "Destination"}
          </span>
          <span className="ml-auto font-bold text-amber-600 flex items-center gap-1">
            <Navigation size={14} /> {etaMinutes ? `ETA ${etaMinutes} min` : "Calculating ETA..."} {distanceKm ? `(${distanceKm} km)` : ""}
          </span>
        </div>

        {/* Safety */}
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-muted-foreground font-medium">SafeGo AI Safety Monitoring Active</span>
        </div>
        <div className="mt-2">
          <SafetyScoreBar score={rideData?.safety_score || 94} label="Trip Safety Score" />
        </div>

        {/* SOS */}
        <div className="mt-4">
          <SOSButton />
        </div>
      </div>
    </div>
  );
};

export default RideTracking;

