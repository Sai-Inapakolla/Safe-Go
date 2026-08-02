import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getModeConfig, modes } from "@/config/modeConfig";
import type { RideMode } from "@/config/modeConfig";
import { Navbar } from "@/components/Navbar";
import { useTranslation } from "react-i18next";
import { useVoiceAssistant } from "@/contexts/VoiceAssistantContext";
import { SafetyScoreBar } from "@/components/SafetyScoreBar";
import {
  ArrowLeft, Star, MessageCircle, Shield, Loader2, CheckCircle2,
  MapPin, Navigation, Car, AlertCircle, Locate, Send, X, Users, Zap, Activity,
  ShieldAlert, Phone, Siren, Radio, Copy, ShieldCheck, Lock
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

// ─── Simulated nearby cabs ───────────────────────────────────────────────────
const generateNearbyCabs = (lat: number, lng: number, mode: string = "normal", dbDrivers: any[] = []) => {
  // Filter database drivers based on mode
  let filteredDbDrivers = dbDrivers;
  if (mode === "pink") {
    filteredDbDrivers = dbDrivers.filter(d => d.user?.gender === "female");
  } else {
    // Normal mode can show male or any drivers, but let's stick to the official 5 fleet logic
    filteredDbDrivers = dbDrivers.filter(d => d.user?.gender === "male");
  }

  // Official Fleet (Max 10 total: 5 female, 5 male)
  const maleNames = ["Aarav Sharma", "Kabir Khan", "Rohan Mehta", "Aditya Patel", "Vihaan Gupta"];
  const femaleNames = ["Priya Singh", "Ananya Rao", "Diya Kapoor", "Neha Acharya", "Pooja Verma"];
  const fallbackNames = mode === "pink" ? femaleNames : maleNames;

  // STRICTLY limit to max 10 cabs total (or 5 for specific mode)
  const cabCount = filteredDbDrivers.length > 0 ? filteredDbDrivers.length : fallbackNames.length;
  const maxLimit = Math.min(cabCount, 10);

  return Array.from({ length: maxLimit }, (_, i) => {
    const dbDriver = filteredDbDrivers[i];
    const cabLat = lat + (Math.random() - 0.5) * 0.012;
    const cabLng = lng + (Math.random() - 0.5) * 0.012;

    if (dbDriver) {
      return {
        id: i,
        driver_id: dbDriver.id || dbDriver._id || null,
        lat: cabLat,
        lng: cabLng,
        name: dbDriver.user?.full_name || fallbackNames[i % fallbackNames.length],
        rating: dbDriver.average_rating ? dbDriver.average_rating.toFixed(1) : (Math.random() * 0.3 + 4.7).toFixed(1),
        eta: Math.floor(Math.random() * 6 + 1),
      };
    } else {
      return {
        id: i,
        driver_id: null,
        lat: cabLat,
        lng: cabLng,
        name: fallbackNames[i % fallbackNames.length],
        rating: (Math.random() * 0.3 + 4.7).toFixed(1),
        eta: Math.floor(Math.random() * 6 + 1),
      };
    }
  });
};

// ─── Leaflet Map Panel (no API key) ─────────────────────────────────────────
declare global { interface Window { L: any } }

const MapPanel = ({ accent, mode, centerLoc, triggerRoute, routePolyline, onRouteExtracted, onCabSelect, simulatingTravel, onTravelComplete, estimatedFare = 0, activeDrivers = [] }: { accent: string, mode: string, centerLoc: { lat: number, lng: number } | null, triggerRoute: { from: string, to: string } | null, routePolyline?: string | null, onRouteExtracted?: (dist: number, cabs: any) => void, onCabSelect?: (cab: any) => void, simulatingTravel?: boolean, onTravelComplete?: () => void, estimatedFare?: number, activeDrivers?: any[] }) => {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [cabs, setCabs] = useState<any[]>([]);
  const [locating, setLocating] = useState(true);
  const [locError, setLocError] = useState(false);
  const [selectedCab, setSelectedCab] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const carMarkerRef = useRef<any>(null);
  const simulationIntervalRef = useRef<any>(null);

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const initMap = async (lat: number, lng: number, isError: boolean) => {
      if (!mapContainerRef.current) return;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }

      const L = window.L;
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([lat, lng], 15);
      mapInstanceRef.current = map;
      setMapReady(true);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles &copy; Esri",
        maxZoom: 18,
      }).addTo(map);

      const pulseHtml = `
        <div style="position:relative;width:22px;height:22px;">
          <div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(59,130,246,0.2);animation:pulse-ring 1.5s ease-out infinite;"></div>
          <div style="width:22px;height:22px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.6);"></div>
        </div>
        <style>@keyframes pulse-ring { 0% { transform:scale(1); opacity:0.8; } 100% { transform:scale(2.5); opacity:0; } }</style>
      `;
      const youIcon = L.divIcon({ html: pulseHtml, className: "", iconSize: [22, 22], iconAnchor: [11, 11] });
      L.marker([lat, lng], { icon: youIcon }).addTo(map).bindPopup("<b>" + t('booking.you_are_here', '📍 You are here') + "</b>");

      L.circle([lat, lng], { radius: 60, color: "#3b82f6", fillOpacity: 0.08, weight: 1.5 }).addTo(map);

      const fallbackCabs = generateNearbyCabs(lat, lng, mode, activeDrivers);
      setCabs(fallbackCabs);

      fallbackCabs.forEach((cab: any) => {
        const cabHtml = `
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
            <div style="background:${accent};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);">
              ${(cab.name || "D").split(" ").map((n: string) => n[0]).join("")}
            </div>
            <div style="background:hsl(var(--card));border-radius:6px;padding:1px 5px;font-size:9px;font-weight:700;color:hsl(var(--card-foreground));margin-top:2px;box-shadow:0 1px 4px rgba(0,0,0,0.15);white-space:nowrap;">
              ${t('booking.minutes_format', '{{minutes}} min', { minutes: cab.eta })}
            </div>
          </div>
        `;
        const cabIcon = L.divIcon({ html: cabHtml, className: "", iconSize: [36, 52], iconAnchor: [18, 52] });
        L.marker([cab.lat, cab.lng], { icon: cabIcon })
          .addTo(map)
          .bindPopup(`<b>${cab.name}</b><br>⭐ ${cab.rating} &nbsp;·&nbsp; ${t('booking.eta_minutes', 'ETA {{minutes}}m', { minutes: cab.eta })}`);
      });

      setLocating(false);
      if (isError) setLocError(true);
    };

    const loadLeaflet = () => {
      if (window.L) {
        getLocation();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => getLocation();
      document.head.appendChild(script);
    };

    const getLocation = () => {
      navigator.geolocation?.getCurrentPosition(
        (pos) => initMap(pos.coords.latitude, pos.coords.longitude, false),
        (err) => {
          console.warn("Geolocation error:", err);
          initMap(22.3, 73.19, true);
        },
        { timeout: 15000, maximumAge: 0, enableHighAccuracy: true }
      );
    };

    loadLeaflet();

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const L = window.L;
    if (!mapInstanceRef.current || !L || !mapReady) return;

    if (!triggerRoute) {
      // Clear routing layers if route is reset
      mapInstanceRef.current.eachLayer((layer: any) => {
        if (layer.options && layer.options.isRouteLayer) {
          mapInstanceRef.current.removeLayer(layer);
        }
      });
      return;
    }

    (async () => {
      if (routePolyline) {
        try {
          const geojson = JSON.parse(routePolyline);
          const coordsList = geojson.coordinates.map((c: any) => [c[1], c[0]]);

          mapInstanceRef.current.eachLayer((layer: any) => {
            if (layer.options && layer.options.isRouteLayer) {
              mapInstanceRef.current.removeLayer(layer);
            }
          });

          L.polyline(coordsList, { color: accent, weight: 6, opacity: 0.8, className: 'route-glow', isRouteLayer: true }).addTo(mapInstanceRef.current);
          L.polyline(coordsList, { color: 'white', weight: 2, dashArray: '8 8', isRouteLayer: true }).addTo(mapInstanceRef.current);

          // Add Pickup and Destination Markers
          const pickupIcon = L.divIcon({
            html: `<div style="background:${accent};width:12px;height:12px;border:2px solid white;border-radius:50%;box-shadow:0 0 10px ${accent}80;"></div>`,
            className: "", iconSize: [12, 12], iconAnchor: [6, 6]
          });
          const destIcon = L.divIcon({
            html: `<div style="background:#ef4444;width:12px;height:12px;border:2px solid white;border-radius:2px;box-shadow:0 0 10px #ef444480;"></div>`,
            className: "", iconSize: [12, 12], iconAnchor: [6, 6]
          });

          L.marker(coordsList[0], { icon: pickupIcon, isRouteLayer: true }).addTo(mapInstanceRef.current);
          L.marker(coordsList[coordsList.length - 1], { icon: destIcon, isRouteLayer: true }).addTo(mapInstanceRef.current);

          const bounds = L.latLngBounds(coordsList);
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
          return;
        } catch (e) {
          console.warn("Polyline parse failed, falling back to OSRM", e);
        }
      }

      try {
        const fromQuery = encodeURIComponent(triggerRoute.from);
        const toQuery = encodeURIComponent(triggerRoute.to);
        const [resfrom, resto] = await Promise.all([
          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${fromQuery}&limit=1`),
          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${toQuery}&limit=1`)
        ]);
        const dataFrom = await resfrom.json();
        const dataTo = await resto.json();

        let ptFrom = centerLoc || { lat: 14.5995, lng: 120.9842 };
        let ptTo = { lat: ptFrom.lat + 0.05, lng: ptFrom.lng + 0.05 };

        if (dataFrom && dataFrom[0]) ptFrom = { lat: parseFloat(dataFrom[0].lat), lng: parseFloat(dataFrom[0].lon) };
        if (dataTo && dataTo[0]) ptTo = { lat: parseFloat(dataTo[0].lat), lng: parseFloat(dataTo[0].lon) };

        const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${ptFrom.lng},${ptFrom.lat};${ptTo.lng},${ptTo.lat}?overview=full&geometries=geojson`);
        const osrmData = await osrmRes.json();

        mapInstanceRef.current.eachLayer((layer: any) => {
          if (layer.options && layer.options.isRouteLayer) {
            mapInstanceRef.current.removeLayer(layer);
          }
        });

        if (osrmData.routes && osrmData.routes[0]) {
          const coordsList = osrmData.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
          const distKm = osrmData.routes[0].distance / 1000;

          if (onRouteExtracted) onRouteExtracted(distKm, cabs);

          L.polyline(coordsList, { color: accent, weight: 6, opacity: 0.8, className: 'route-glow', isRouteLayer: true }).addTo(mapInstanceRef.current);
          L.polyline(coordsList, { color: 'white', weight: 2, dashArray: '8 8', isRouteLayer: true }).addTo(mapInstanceRef.current);

          // Add Pickup and Destination Markers
          const pickupIcon = L.divIcon({
            html: `<div style="background:${accent};width:12px;height:12px;border:2px solid white;border-radius:50%;box-shadow:0 0 10px ${accent}80;"></div>`,
            className: "", iconSize: [12, 12], iconAnchor: [6, 6]
          });
          const destIcon = L.divIcon({
            html: `<div style="background:#ef4444;width:12px;height:12px;border:2px solid white;border-radius:2px;box-shadow:0 0 10px #ef444480;"></div>`,
            className: "", iconSize: [12, 12], iconAnchor: [6, 6]
          });

          L.marker(coordsList[0], { icon: pickupIcon, isRouteLayer: true }).addTo(mapInstanceRef.current);
          L.marker(coordsList[coordsList.length - 1], { icon: destIcon, isRouteLayer: true }).addTo(mapInstanceRef.current);

          const bounds = L.latLngBounds(coordsList);
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        } else {
          L.polyline([[ptFrom.lat, ptFrom.lng], [ptTo.lat, ptTo.lng]], { color: accent, weight: 4, dashArray: "10 10", isRouteLayer: true }).addTo(mapInstanceRef.current);
          mapInstanceRef.current.fitBounds(L.latLngBounds([ptFrom.lat, ptFrom.lng], [ptTo.lat, ptTo.lng]), { padding: [50, 50] });
        }
      } catch (err) {
        console.warn("Routing failed", err);
      }
    })();
  }, [triggerRoute, accent, routePolyline, mapReady]);

  // Car Animation Simulation
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstanceRef.current || !simulatingTravel || !routePolyline || !mapReady) return;

    const geojson = JSON.parse(routePolyline);
    const coordsList = geojson.coordinates.map((c: any) => [c[1], c[0]]);

    if (coordsList.length < 2) return;

    const carHtml = `
      <div style="background:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.25);border:2px solid ${accent};">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <path d="M9 17h6"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    `;
    const carIcon = L.divIcon({ html: carHtml, className: "", iconSize: [32, 32], iconAnchor: [16, 16] });

    if (carMarkerRef.current) {
      mapInstanceRef.current.removeLayer(carMarkerRef.current);
    }

    const carMarker = L.marker(coordsList[0], { icon: carIcon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);
    carMarkerRef.current = carMarker;

    let step = 0;
    const totalSteps = coordsList.length;

    // Ensure animation always takes ~600ms regardless of distance
    const targetDuration = 600;
    const frameRate = 30; // 30ms per update
    const totalUpdates = targetDuration / frameRate;
    const stepIncrement = Math.max(1, Math.ceil(totalSteps / totalUpdates));

    simulationIntervalRef.current = setInterval(() => {
      step += stepIncrement;
      if (step >= totalSteps) {
        carMarker.setLatLng(coordsList[totalSteps - 1]);
        clearInterval(simulationIntervalRef.current);
        if (onTravelComplete) onTravelComplete();
        return;
      }
      carMarker.setLatLng(coordsList[step]);
    }, frameRate);

    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, [simulatingTravel, routePolyline, accent, mapReady]);

  useEffect(() => {
    if (centerLoc && mapInstanceRef.current && mapReady) {
      mapInstanceRef.current.flyTo([centerLoc.lat, centerLoc.lng], 15, { duration: 1.5 });
      const fallbackCabs = generateNearbyCabs(centerLoc.lat, centerLoc.lng, mode, activeDrivers);
      setCabs(fallbackCabs);

      const L = window.L;
      if (L) {
        mapInstanceRef.current.eachLayer((layer: any) => {
          if ((layer instanceof L.Marker || layer instanceof L.Circle) && (!layer.options || !layer.options.isRouteLayer)) {
            mapInstanceRef.current.removeLayer(layer);
          }
        });

        const pulseHtml = `<div style="position:relative;width:22px;height:22px;"><div style="background:#3b82f6;border-radius:50%;width:22px;height:22px;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.6);"></div></div>`;
        const youIcon = L.divIcon({ html: pulseHtml, className: "", iconSize: [22, 22], iconAnchor: [11, 11] });
        L.marker([centerLoc.lat, centerLoc.lng], { icon: youIcon }).addTo(mapInstanceRef.current).bindPopup("<b>" + t('booking.you_are_here', '📍 You are here') + "</b>");

        fallbackCabs.forEach((cab: any) => {
          const cabHtml = `<div style="position:relative;display:flex;flex-direction:column;align-items:center;"><div style="background:${accent};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);">${(cab.name || "D").split(" ").map((n: string) => n[0]).join("")}</div><div style="background:hsl(var(--card));border-radius:6px;padding:1px 5px;font-size:9px;font-weight:700;color:hsl(var(--card-foreground));margin-top:2px;box-shadow:0 1px 4px rgba(0,0,0,0.15);white-space:nowrap;">${t('booking.minutes_format', '{{minutes}} min', { minutes: cab.eta })}</div></div>`;
          const cabIcon = L.divIcon({ html: cabHtml, className: "", iconSize: [36, 52], iconAnchor: [18, 52] });
          L.marker([cab.lat, cab.lng], { icon: cabIcon }).addTo(mapInstanceRef.current).bindPopup(`<b>${cab.name}</b>`);
        });
      }
      setLocError(false);
    }
  }, [centerLoc, accent, mode, mapReady, activeDrivers]);

  const cabsWithPrices = cabs.map((cab, i) => ({
    ...cab,
    price: estimatedFare > 0 ? Math.round(estimatedFare * (0.98 + (i % 3) * 0.02)) : 0
  }));

  return (
    <div className="relative h-full w-full bg-secondary">
      <div ref={mapContainerRef} className="absolute inset-0 z-10" />
      {locating && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary/95 z-20">
          <Locate size={32} className="text-primary animate-pulse" />
          <p className="text-sm font-semibold text-foreground">{t('booking.finding_location', 'Finding your location…')}</p>
          <p className="text-xs text-muted-foreground">{t('booking.allow_access', 'Please allow location access if prompted')}</p>
        </div>
      )}
      {locError && !locating && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-xl bg-amber-500/95 backdrop-blur px-4 py-2 shadow-lg text-white text-xs font-semibold whitespace-nowrap">
          <AlertCircle size={13} />
          {t('booking.gps_warning', 'Using default location · Enable GPS for best results')}
        </div>
      )}
      {!locating && (
        <div
          className="absolute top-4 right-4 z-30 flex items-center gap-1.5 rounded-xl px-3 py-1.5 shadow-lg text-xs font-bold text-white"
          style={{ backgroundColor: accent }}
        >
          <Car size={12} />
          {t('booking.cabs_nearby', '{{count}} Cabs Nearby', { count: cabs.length })}
        </div>
      )}
      {!locating && cabs.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-30 px-3 pb-3">
          <div
            className="rounded-2xl p-3 flex gap-2 overflow-x-auto"
            style={{
              background: "hsl(var(--card) / 0.93)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              boxShadow: "0 -2px 20px rgba(0,0,0,0.08)",
              scrollbarWidth: "none",
            }}
          >
            {cabsWithPrices.map((cab) => (
              <div
                key={cab.id}
                onClick={() => {
                  const isSelecting = cab.id !== selectedCab;
                  setSelectedCab(isSelecting ? cab.id : null);
                  if (onCabSelect) onCabSelect(isSelecting ? cab : null);
                }}
                className="flex-shrink-0 flex flex-col items-center rounded-2xl border px-4 py-3 min-w-[115px] cursor-pointer transition-all relative"
                style={{
                  borderColor: cab.id === selectedCab ? accent : "hsl(var(--border))",
                  borderWidth: cab.id === selectedCab ? "2px" : "1px",
                  backgroundColor: cab.id === selectedCab ? `${accent}12` : "hsl(var(--background))",
                  transform: cab.id === selectedCab ? "translateY(-3px)" : "none",
                  boxShadow: cab.id === selectedCab ? `0 6px 16px ${accent}30` : "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                {cab.id === selectedCab && (
                  <div className="absolute top-2 right-2 flex items-center justify-center bg-white rounded-full">
                    <CheckCircle2 size={16} style={{ color: accent }} className="fill-white" />
                  </div>
                )}
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold text-white mb-2 shadow-sm"
                  style={{ backgroundColor: accent }}
                >
                  {(cab.name || "D").split(" ").map((n: string) => n[0]).join("")}
                </div>
                <p className="text-xs font-bold text-foreground leading-tight text-center">{cab.name}</p>
                <div className="flex gap-1.5 items-center mt-1 whitespace-nowrap">
                  <span className="text-[11px] text-muted-foreground font-medium">⭐ {cab.rating}</span>
                  {cab.price > 0 && <span className="text-[11px] font-black text-blue-600">₹{cab.price}</span>}
                </div>
                <span
                  className="mt-2.5 rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: accent }}
                >
                  {cab.eta} min
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Booking Page ───────────────────────────────────────────────────────
const BookingPage = () => {
  const { t } = useTranslation();
  const { mode: modeId } = useParams<{ mode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const voiceState = location.state as { pickup?: string, destination?: string, auto_search?: boolean, auto_confirm?: boolean };

  const mode = getModeConfig((modeId as RideMode) || "normal");
  const { speak } = useVoiceAssistant();

  useEffect(() => {
    if (voiceState?.pickup) setPickup(voiceState.pickup);
    if (voiceState?.destination) setDestination(voiceState.destination);

    if (modeId === "pwd") {
      speak("You are now on the booking page. I am finding your current location.");
    }
  }, [modeId, voiceState]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [routeFound, setRouteFound] = useState(false);
  const [rideConfirmed, setRideConfirmed] = useState(false);
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");

  useEffect(() => {
    if (destination) {
      localStorage.setItem('safego_current_booking_destination', destination);
    }
  }, [destination]);
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number } | null>(null);
  const [triggerRoute, setTriggerRoute] = useState<{ from: string, to: string } | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [passengerDetails, setPassengerDetails] = useState<string[]>([]);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
  const [isSimulatingTravel, setIsSimulatingTravel] = useState(false);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const [rideOtp, setRideOtp] = useState<string>("4829");
  const [isOtpVerified, setIsOtpVerified] = useState<boolean>(false);
  const [flowState, setFlowState] = useState<"booking" | "confirmed" | "review">("booking");

  // Emergency Contact & SOS Threat Alert States
  const [emergencyContactName, setEmergencyContactName] = useState(() => localStorage.getItem("safego_emergency_name") || "Mother (Primary Contact)");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(() => localStorage.getItem("safego_emergency_phone") || "+91 98765 43210");
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosDispatching, setSosDispatching] = useState(false);
  const [sosSentSuccess, setSosSentSuccess] = useState(false);
  const [sosData, setSosData] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (emergencyContactName) localStorage.setItem("safego_emergency_name", emergencyContactName);
    if (emergencyContactPhone) localStorage.setItem("safego_emergency_phone", emergencyContactPhone);
  }, [emergencyContactName, emergencyContactPhone]);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const handleTriggerThreatSOS = async () => {
    setSosDispatching(true);
    const currentRideIdFromStorage = currentRideId || localStorage.getItem('safego_current_ride_id');
    const liveLat = pickupCoords?.lat || mapCenter?.lat || 22.3023;
    const liveLng = pickupCoords?.lng || mapCenter?.lng || 73.3762;
    const currentLocAddress = pickup || "Live GPS Location (Waghodia)";
    const routeStr = `From: ${pickup || 'Current Location'} ➔ To: ${destination || 'Target Destination'}`;

    const payload = {
      ride_id: currentRideIdFromStorage || null,
      latitude: liveLat,
      longitude: liveLng,
      location_address: currentLocAddress,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      route_info: routeStr,
      severity: "critical"
    };

    try {
      const token = localStorage.getItem("token") || "dummy-token";
      await fetch(`${API_URL}/api/safety/sos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error("Backend SOS trigger error:", err);
    }

    const liveUrl = `https://www.google.com/maps?q=${liveLat.toFixed(4)},${liveLng.toFixed(4)}`;
    const alertObj = {
      id: 'sos_' + Date.now(),
      passenger: 'Female Passenger (Pink Mode)',
      contact_name: emergencyContactName,
      contact_phone: emergencyContactPhone,
      live_location: liveUrl,
      pickup_address: pickup || 'Live Coordinates',
      destination_address: destination || 'Unspecified',
      route_info: routeStr,
      driver_name: selectedDriver?.name || 'Assigned Driver',
      status: 'active',
      created_at: new Date().toISOString()
    };

    try {
      const existingSos = JSON.parse(localStorage.getItem("safego_admin_sos") || "[]");
      localStorage.setItem("safego_admin_sos", JSON.stringify([alertObj, ...existingSos]));
      localStorage.setItem("safego_new_sos_alert", JSON.stringify(alertObj));
    } catch (e) {
      console.error(e);
    }

    setSosData(alertObj);
    setSosDispatching(false);
    setSosSentSuccess(true);
  };

  const [activeDrivers, setActiveDrivers] = useState<any[]>([]);

  useEffect(() => {
    const fetchActiveDrivers = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/api/drivers/active`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setActiveDrivers(data);
        }
      } catch (err) {
        console.error("Failed to fetch active drivers:", err);
      }
    };
    fetchActiveDrivers();
  }, [API_URL]);



  useEffect(() => {
    const restoreActiveRide = async () => {
      let token = localStorage.getItem("token") || "dummy-token";
      try {
        const res = await fetch(`${API_URL}/api/rides/active`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const ride = await res.json();
          if (ride) {
            setPickup(ride.pickup_address || "");
            setDestination(ride.destination_address || "");
            if (ride.pickup_latitude && ride.pickup_longitude) {
              setPickupCoords({ lat: ride.pickup_latitude, lng: ride.pickup_longitude });
              setMapCenter({ lat: ride.pickup_latitude, lng: ride.pickup_longitude });
            }
            if (ride.destination_latitude && ride.destination_longitude) {
              setDestinationCoords({ lat: ride.destination_latitude, lng: ride.destination_longitude });
            }
            setCurrentRideId(ride._id);
            if (ride.otp) setRideOtp(ride.otp);
            setIsOtpVerified(ride.is_otp_verified || false);
            localStorage.setItem('safego_current_ride_id', ride._id);
            if (ride.driver) {
              setSelectedDriver({
                driver_id: ride.driver._id || ride.driver.id,
                name: ride.driver.user?.full_name || "Driver",
                rating: ride.driver.average_rating || 5.0,
                price: ride.fare_amount || 0,
                eta: 3
              });
            }
            if (ride.status === "completed") {
              setFlowState("review");
            } else if (ride.status === "matched" || ride.status === "driver_arriving" || ride.status === "in_progress") {
              setFlowState("confirmed");
              setAskStatus("accepted");
            } else {
              setFlowState("booking");
              setAskStatus("asking");
            }
          }
        }
      } catch (err) {
        console.error("Failed to restore active ride:", err);
      }
    };
    restoreActiveRide();
  }, [API_URL]);

  const handleUseCurrentLocation = () => {
    setIsLocatingAddress(true);
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCenter({ lat: latitude, lng: longitude });
        setPickupCoords({ lat: latitude, lng: longitude });

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.display_name) {
            const shortAddress = data.display_name.split(", ").slice(0, 3).join(", ");
            setPickup(shortAddress);
          } else {
            setPickup("Current Location");
          }
        } catch (e) {
          setPickup("Current Location");
        }
        setIsLocatingAddress(false);
      },
      () => {
        alert(t('booking.location_alert', 'Unable to retrieve location. Please check browser permissions.'));
        setIsLocatingAddress(false);
      },
      { timeout: 10000 }
    );
  };

  useEffect(() => {
    if (!voiceState?.pickup) {
      handleUseCurrentLocation();
    }
  }, []);

  const [rideDetails, setRideDetails] = useState({
    distance: "12.4 km", distanceNum: 12.4, score: 94,
    etaNum: 24, traffic: "Light", riskFactors: 1,
    aiPrediction: "Stable", surgeMultiplier: 1.0, fare: 0
  });

  const [isRerouted, setIsRerouted] = useState(false);
  const [isReroutingAlternative, setIsReroutingAlternative] = useState(false);

  const handleRerouteLowTraffic = () => {
    setIsReroutingAlternative(true);
    setTimeout(() => {
      setRideDetails(prev => {
        const newDistanceNum = Number((prev.distanceNum * 1.08).toFixed(2));
        const newEtaNum = Math.max(3, Math.round(prev.etaNum * 0.7)); // 30% time saved!
        return {
          ...prev,
          traffic: "Light",
          distanceNum: newDistanceNum,
          distance: `${newDistanceNum} km`,
          etaNum: newEtaNum,
          score: Math.min(100, prev.score + 5), // Safer bypass
          aiPrediction: "Stable"
        };
      });
      setIsRerouted(true);
      setIsReroutingAlternative(false);
    }, 1200);
  };

  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [askStatus, setAskStatus] = useState<"idle" | "asking" | "accepted" | "rejected">("idle");

  const handleAutoSelectNearestCab = () => {
    const firstActive = activeDrivers && activeDrivers.length > 0 ? activeDrivers[0] : null;
    const defaultDriver = firstActive ? {
      driver_id: firstActive._id,
      name: firstActive.user?.full_name || "Vihaan Gupta",
      rating: firstActive.average_rating || 4.9,
      price: rideDetails.fare || 250,
      eta: 2
    } : {
      driver_id: "default-driver-1",
      name: mode.id === "pink" ? "Priya Singh" : "Vihaan Gupta",
      rating: 4.9,
      price: rideDetails.fare || 250,
      eta: 2
    };
    setSelectedDriver(defaultDriver);
    return defaultDriver;
  };

  useEffect(() => {
    let interval: any;
    if (askStatus === "asking") {
      interval = setInterval(async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
          const res = await fetch(`${API_URL}/api/rides/active`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const ride = await res.json();
            if (ride) {
              if (ride.otp) setRideOtp(ride.otp);
              if (ride.is_otp_verified !== undefined) setIsOtpVerified(ride.is_otp_verified);
              if (ride.status === "matched") {
                setAskStatus("accepted");
                setFlowState("confirmed");
                setIsSimulatingTravel(true);
                if (ride.driver) {
                  setSelectedDriver({
                    driver_id: ride.driver._id || ride.driver.id,
                    name: ride.driver.user?.full_name || "Driver",
                    rating: ride.driver.average_rating || 5.0,
                    price: ride.fare_amount || 0,
                    eta: 3
                  });
                }
              } else if (ride.status === "cancelled") {
                setAskStatus("rejected");
              }
            }
          }
        } catch (e) {
          console.error("Poll error", e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [askStatus, API_URL]);

  useEffect(() => {
    let interval: any;
    if (flowState === "confirmed") {
      interval = setInterval(async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
          const res = await fetch(`${API_URL}/api/rides/active`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const ride = await res.json();
            if (ride) {
              if (ride.otp) setRideOtp(ride.otp);
              if (ride.is_otp_verified !== undefined) setIsOtpVerified(ride.is_otp_verified);
              if (ride.status === "completed") {
                setFlowState("review");
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [flowState, API_URL]);
  const [rating, setRating] = useState(0);
  const [prevRating, setPrevRating] = useState(0);

  const handleRatingSelect = (val: number) => {
    setPrevRating(rating);
    setRating(val);
  };

  useEffect(() => {
    if (voiceState?.auto_search && voiceState.destination) {
      const timer = setTimeout(() => {
        handleFindRoute();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [voiceState]);

  useEffect(() => {
    if (pickup.trim() && destination.trim() && !routeFound && !isAnalyzing) {
      const timer = setTimeout(() => {
        handleFindRoute();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pickup, destination, routeFound, isAnalyzing]);

  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMsgs, setChatMsgs] = useState<{ sender: string, text: string }[]>([]);
  const leftRef = useRef<HTMLDivElement>(null);

  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const pickupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const destTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePickupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPickup(val);
    setPickupCoords(null); // Reset coords so we fetch new ones if they don't select from dropdown
    if (!val.trim()) {
      setPickupSuggestions([]);
      setShowPickupDropdown(false);
      return;
    }

    setShowPickupDropdown(true);
    setIsSearchingPickup(true);

    if (pickupTimeoutRef.current) clearTimeout(pickupTimeoutRef.current);
    setRouteFound(false);
    pickupTimeoutRef.current = setTimeout(async () => {
      try {
        const localRes = await fetch(`${API_URL}/api/map/locations?q=${encodeURIComponent(val)}`);
        if (localRes.ok) {
          const localData = await localRes.json();
          if (Array.isArray(localData) && localData.length > 0) {
            const mapped = localData.map((loc: any) => ({
              display_name: loc.display_name,
              lat: loc.lat.toString(),
              lon: loc.lng.toString()
            }));
            setPickupSuggestions(mapped);
            setIsSearchingPickup(false);
            return;
          }
        }
      } catch (e) {}

      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=8&lang=en`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.features && data.features.length > 0) {
            const mapped = data.features.map((f: any) => {
              const props = f.properties;
              const coords = f.geometry.coordinates;
              const parts = [
                props.name,
                props.street,
                props.district,
                props.city || props.town || props.village,
                props.state,
                props.country
              ].filter(Boolean);
              return {
                display_name: parts.join(", "),
                lat: coords[1].toString(),
                lon: coords[0].toString()
              };
            });
            setPickupSuggestions(mapped);
            setIsSearchingPickup(false);
            return;
          }
        }
      } catch (e) {
        console.warn("Photon geocoder failed, trying Nominatim:", e);
      }

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=8&addressdetails=1`);
        const data = await res.json();
        setPickupSuggestions(data);
      } catch (e) {
        console.error("Geocoding fetch error:", e);
      } finally {
        setIsSearchingPickup(false);
      }
    }, 150);
  };

  const handleDestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDestination(val);
    setDestinationCoords(null); // Reset coords so we fetch new ones if they don't select from dropdown
    if (!val.trim()) {
      setDestSuggestions([]);
      setShowDestDropdown(false);
      return;
    }

    setShowDestDropdown(true);
    setIsSearchingDest(true);

    if (destTimeoutRef.current) clearTimeout(destTimeoutRef.current);
    setRouteFound(false);
    destTimeoutRef.current = setTimeout(async () => {
      try {
        const localRes = await fetch(`${API_URL}/api/map/locations?q=${encodeURIComponent(val)}`);
        if (localRes.ok) {
          const localData = await localRes.json();
          if (Array.isArray(localData) && localData.length > 0) {
            const mapped = localData.map((loc: any) => ({
              display_name: loc.display_name,
              lat: loc.lat.toString(),
              lon: loc.lng.toString()
            }));
            setDestSuggestions(mapped);
            setIsSearchingDest(false);
            return;
          }
        }
      } catch (e) {}

      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=8&lang=en`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.features && data.features.length > 0) {
            const mapped = data.features.map((f: any) => {
              const props = f.properties;
              const coords = f.geometry.coordinates;
              const parts = [
                props.name,
                props.street,
                props.district,
                props.city || props.town || props.village,
                props.state,
                props.country
              ].filter(Boolean);
              return {
                display_name: parts.join(", "),
                lat: coords[1].toString(),
                lon: coords[0].toString()
              };
            });
            setDestSuggestions(mapped);
            setIsSearchingDest(false);
            return;
          }
        }
      } catch (e) {
        console.warn("Photon geocoder failed, trying Nominatim:", e);
      }

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=8&addressdetails=1`);
        const data = await res.json();
        setDestSuggestions(data);
      } catch (e) {
        console.error("Geocoding fetch error:", e);
      } finally {
        setIsSearchingDest(false);
      }
    }, 150);
  };

  const selectPickup = (place: any) => {
    setPickup(place.display_name);
    setPickupCoords({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) });
    setShowPickupDropdown(false);
    if (destination) {
      setTimeout(() => handleFindRoute(), 300);
    }
  };

  const selectDest = (place: any) => {
    setDestination(place.display_name);
    setDestinationCoords({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) });
    setShowDestDropdown(false);
    if (pickup) {
      setTimeout(() => handleFindRoute(), 300);
    }
  };

  const handleRouteExtracted = (km: number) => {
    setRideDetails(prev => ({ ...prev, distance: `${km.toFixed(1)} km`, distanceNum: km }));
  };

  const handleAskDriver = () => {
    setAskStatus("asking");
    setChatOpen(false);
    setChatMsgs([]);
    leftRef.current?.scrollTo({ top: leftRef.current.scrollHeight, behavior: "smooth" });
    setTimeout(() => {
      if (Math.random() > 0.15) {
        setAskStatus("accepted");
        setTimeout(() => handleConfirmRide(), 300);
      } else {
        setAskStatus("rejected");
      }
    }, 500 + Math.random() * 400);
  };

  const handleFindRoute = async () => {
    if (!pickup.trim() || !destination.trim()) {
      alert(t('booking.enter_both_alert', 'Please enter both a pickup location and a destination.'));
      return;
    }
    setIsAnalyzing(true);
    setRouteFound(false);
    setIsRerouted(false);
    setIsReroutingAlternative(false);
    setSelectedDriver(null);
    setAskStatus("idle");
    setChatOpen(false);
    setTriggerRoute({ from: pickup, to: destination });

    try {
      const LOCAL_GEOCODE_MAP: Record<string, { lat: number, lng: number }> = {
        "waghodia": { lat: 22.3023, lng: 73.3762 },
        "chowkdi": { lat: 22.3120, lng: 73.2250 },
        "vadodara": { lat: 22.3072, lng: 73.1812 },
        "gujarat": { lat: 22.3072, lng: 73.1812 },
        "alkapuri": { lat: 22.3129, lng: 73.1706 },
        "sayajigunj": { lat: 22.3106, lng: 73.1878 },
        "delhi": { lat: 28.6139, lng: 77.2090 },
        "namakkal": { lat: 11.2189, lng: 78.1672 },
        "hsr": { lat: 12.9141, lng: 77.6411 },
        "indiranagar": { lat: 12.9719, lng: 77.6412 },
        "whitefield": { lat: 12.9698, lng: 77.7500 },
        "forum": { lat: 12.9345, lng: 77.6113 },
        "megamall": { lat: 14.5851, lng: 121.0568 },
        "bgc": { lat: 14.5409, lng: 121.0503 },
        "makati": { lat: 14.5547, lng: 121.0244 },
      };

      const resolveLocalCoords = (query: string): { lat: number, lng: number } | null => {
        const q = query.toLowerCase();
        for (const [key, coords] of Object.entries(LOCAL_GEOCODE_MAP)) {
          if (q.includes(key)) return coords;
        }
        return null;
      };

      let finalPickupCoords = pickupCoords;
      let finalDestCoords = destinationCoords;

      // Automatically resolve coordinates if user typed and hit Enter without selecting
      if (!finalPickupCoords) {
        finalPickupCoords = resolveLocalCoords(pickup);
        
        if (!finalPickupCoords) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(pickup)}&limit=1&lang=en`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
              const data = await res.json();
              if (data && data.features && data.features.length > 0) {
                const coords = data.features[0].geometry.coordinates;
                finalPickupCoords = { lat: coords[1], lng: coords[0] };
              }
            }
          } catch (e) {
            console.warn("Photon lookup failed:", e);
          }
        }

        if (!finalPickupCoords) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pickup)}&limit=1`, { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await res.json();
            if (data && data.length > 0) finalPickupCoords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          } catch (e) {
            console.error("Nominatim lookup failed:", e);
          }
        }

        if (!finalPickupCoords) {
          finalPickupCoords = { lat: 22.3023, lng: 73.3762 }; // Waghodia default fallback
        }
      }
      
      // Resolve Destination Coordinates
      finalDestCoords = resolveLocalCoords(destination);

      if (!finalDestCoords) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(destination)}&limit=1&lang=en`, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (data && data.features && data.features.length > 0) {
              const coords = data.features[0].geometry.coordinates;
              finalDestCoords = { lat: coords[1], lng: coords[0] };
            }
          }
        } catch (e) {
          console.warn("Photon lookup failed:", e);
        }
      }

      if (!finalDestCoords) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1`, { signal: controller.signal });
          clearTimeout(timeoutId);
          const data = await res.json();
          if (data && data.length > 0) finalDestCoords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        } catch (e) {
          console.error("Nominatim lookup failed:", e);
        }
      }

      if (!finalDestCoords) {
        // Fallback relative to pickup point in local city area (5km local trip)
        finalDestCoords = { 
          lat: (finalPickupCoords?.lat || 22.3023) + 0.025, 
          lng: (finalPickupCoords?.lng || 73.3762) + 0.025 
        };
      }

      if (finalPickupCoords) setPickupCoords(finalPickupCoords);
      if (finalDestCoords) setDestinationCoords(finalDestCoords);

      const res = await fetch(`${API_URL}/api/map/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup_latitude: finalPickupCoords?.lat || 22.3,
          pickup_longitude: finalPickupCoords?.lng || 73.19,
          destination_latitude: finalDestCoords?.lat || 22.35,
          destination_longitude: finalDestCoords?.lng || 73.24,
          mode: mode.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        const trafficOptions = ["Light", "Moderate", "Heavy"];
        const randomTraffic = trafficOptions[Math.floor(Math.random() * trafficOptions.length)];

        setRideDetails({
          distance: `${data.distance_km} km`,
          distanceNum: data.distance_km,
          score: data.safety_score,
          etaNum: data.duration_minutes,
          traffic: randomTraffic,
          riskFactors: Math.floor(Math.random() * 2),
          aiPrediction: data.ai_safety_prediction || "Stable",
          surgeMultiplier: data.surge_multiplier || 1.0,
          fare: data.fare_amount
        });
        setRoutePolyline(data.route_polyline);
        setRouteFound(true);
      }
    } catch (err) {
      console.error("Route fetch error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (pickup.trim() && destination.trim()) {
      handleFindRoute();
    } else {
      setRouteFound(false);
      setRoutePolyline(null);
    }
  }, [modeId, destination]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setChatMsgs(prev => [...prev, { sender: "user", text: chatInput }]);
    setChatInput("");

    setTimeout(() => {
      setChatMsgs(prev => [...prev, { sender: "driver", text: "Got it, I'm on my way!" }]);
    }, 400);
  };

  const handleConfirmRide = async () => {
    let token = localStorage.getItem("token");
    if (!token) {
      token = "dummy-token";
      localStorage.setItem("token", token);
    }

    try {
      setAskStatus("asking");

      const payload = {
        mode: mode.id,
        pickup_address: pickup,
        pickup_latitude: pickupCoords?.lat || mapCenter?.lat || 22.3,
        pickup_longitude: pickupCoords?.lng || mapCenter?.lng || 73.19,
        destination_address: destination,
        destination_latitude: destinationCoords?.lat || (mapCenter?.lat || 22.3) + 0.05,
        destination_longitude: destinationCoords?.lng || (mapCenter?.lng || 73.19) + 0.05,
        passenger_count: passengers,
        passenger_details: passengerDetails.filter(d => d.trim() !== ""),
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
        driver_id: selectedDriver?.driver_id || null,
        fare_amount: selectedDriver?.price || rideDetails.fare
      };

      let res = await fetch(`${API_URL}/api/rides/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        // Fallback to demo token if current token is expired or invalid
        token = "dummy-token";
        localStorage.setItem("token", token);
        res = await fetch(`${API_URL}/api/rides/request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) throw new Error("Failed to create ride");
      const rideData = await res.json();
      setCurrentRideId(rideData._id);
      localStorage.setItem('safego_current_ride_id', rideData._id);

      // Emit new booking event for local storage observers (Admin and Driver panels)
      localStorage.setItem('safego_new_booking', JSON.stringify({
        id: rideData._id,
        passenger: 'User Node #88',
        driver: selectedDriver?.name || 'Assigned Pilot',
        timestamp: new Date().toISOString()
      }));

      // Invalidate dashboard passenger rides cache to force fresh reload
      localStorage.removeItem("safego_passenger_rides");

      // We no longer trigger simulation immediately. 
      // The useEffect polling will detect when the driver accepts the ride!
      leftRef.current?.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      console.error(err);
      setAskStatus("rejected");
      alert(t('booking.error_booking_alert', 'Error booking ride. Please try again.'));
    }
  };

  const handleCompleteRide = async () => {
    const token = localStorage.getItem("token");
    if (token && currentRideId) {
      try {
        await fetch(`${API_URL}/api/rides/${currentRideId}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ status: "completed" })
        });
      } catch (err) {
        console.error("Failed to mark ride completed in database:", err);
      }
    }
    setFlowState("review");
    leftRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitReview = async () => {
    const token = localStorage.getItem("token");
    if (token && currentRideId && rating > 0) {
      try {
        await fetch(`${API_URL}/api/rides/${currentRideId}/rate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            score: rating,
            comment: reviewText || "No comment provided."
          })
        });
      } catch (err) {
        console.error("Failed to submit rating to backend:", err);
      }
    }

    try {
      const saved = localStorage.getItem("safego_rides");
      if (saved) {
        const ridesList = JSON.parse(saved);
        if (ridesList.length > 0) {
          for (let i = 0; i < ridesList.length; i++) {
            if (ridesList[i].status === "In Progress") {
              ridesList[i].status = "Completed";
              ridesList[i].rating = rating || 0;
              break;
            }
          }
          localStorage.setItem("safego_rides", JSON.stringify(ridesList));
        }
      }
    } catch (_) { }

    try {
      localStorage.removeItem("safego_passenger_rides");
    } catch (_) {}

    localStorage.removeItem('safego_current_ride_id');
    setFlowState("booking");
    setPickup("");
    setDestination("");
    setRouteFound(false);
    setSelectedDriver(null);
    setAskStatus("idle");
    setChatOpen(false);
    setRating(0);
    setReviewText("");
    setTriggerRoute(null);
    setRoutePolyline(null);
    setRouteFound(false);
    handleUseCurrentLocation();
    leftRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <Navbar fullWidth={true} />
      <div className="flex flex-1 overflow-hidden">
        <div
          ref={leftRef}
          className={`${flowState === "booking" ? "w-full lg:w-1/2" : "w-full"} overflow-y-auto border-r border-border bg-gradient-to-br from-background via-background to-secondary/30 transition-all duration-500 ease-in-out`}
          style={{ scrollbarWidth: "thin" }}
        >
          <div className="px-6 py-8 lg:px-12 lg:py-12 relative min-h-full flex flex-col">
            {flowState === "booking" && (
              <>
                {rideConfirmed && (
                  <div className="mb-4 flex items-center gap-3 rounded-2xl bg-green-500 p-4 text-white shadow-lg animate-in slide-in-from-top-4 fade-in duration-500">
                    <CheckCircle2 size={22} />
                    <div>
                      <p className="font-bold">{t('booking.ride_confirmed', 'Ride Confirmed!')}</p>
                      <p className="text-sm text-green-50">{t('booking.driver_on_way', 'Your driver is on the way. Safest route selected.')}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Link to="/home" className="group flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur-sm hover:bg-secondary transition-all shadow-sm hover:shadow-md">
                    <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
                  </Link>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border/50">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Ride Type</span>
                  </div>
                </div>
                <div className="mt-8">
                  <h1 className="font-display text-3xl font-black tracking-tight text-foreground lg:text-4xl">
                    {t('booking.ready_for', 'Ready for a')} <span className="text-primary" style={{ color: mode.accent }}>{t('booking.safe_journey', 'Safe Journey?')}</span>
                  </h1>
                  <p className="mt-2 text-muted-foreground text-sm font-medium">{t('booking.configure_pickup', 'Configure your pickup and destination for a secure ride.')}</p>
                </div>
                <div className="mt-8 rounded-[2rem] border border-border/40 bg-card p-8 premium-shadow relative transition-all hover:-translate-y-1">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${mode.accent}15` }}>
                      <Navigation size={16} style={{ color: mode.accent }} />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{t('booking.route_details', 'Route Details')}</h3>
                  </div>
                  <div className="flex flex-col gap-0 relative">
                    <div className="flex items-center gap-3 relative z-50">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: mode.accent }} />
                      <div className="flex-1 relative flex items-center">
                        <input
                          value={pickup}
                          onChange={handlePickupChange}
                          onFocus={() => setShowPickupDropdown(true)}
                          onBlur={() => setTimeout(() => setShowPickupDropdown(false), 200)}
                          className="w-full rounded-xl border border-border dark:border-white/10 bg-secondary/60 dark:bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary transition-colors pr-10 dark:text-white dark:placeholder:text-white/30"
                          placeholder={t('booking.pickup_location', 'Pickup location')}
                        />
                        {showPickupDropdown && (pickupSuggestions.length > 0 || isSearchingPickup) && (
                          <div className="absolute top-[105%] left-0 right-0 z-[60] max-h-64 overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200 p-2">
                            {isSearchingPickup && (
                              <div className="flex items-center gap-3 px-4 py-3 text-xs text-muted-foreground italic">
                                <Loader2 size={14} className="animate-spin text-primary" />
                                {t('booking.analyzing_places', 'Analyzing places...')}
                              </div>
                            )}
                            {pickupSuggestions.map((place, i) => (
                              <div
                                key={i}
                                className="w-full text-left px-4 py-3 text-xs hover:bg-primary/5 rounded-xl transition-all border-b border-border/5 last:border-0 cursor-pointer flex items-start gap-3 group"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  selectPickup(place);
                                }}
                              >
                                <div className="mt-0.5 p-1.5 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                                  <MapPin size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-foreground truncate">{place.display_name?.split(',')[0] || t('booking.location_label', 'Location')}</span>
                                  <span className="text-[10px] text-muted-foreground truncate">{place.display_name?.split(',').slice(1).join(',').trim() || ""}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={handleUseCurrentLocation}
                          disabled={isLocatingAddress}
                          className="absolute right-3 p-1 rounded hover:bg-black/5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                          title="Use current location"
                        >
                          {isLocatingAddress ? <Loader2 size={16} className="animate-spin" /> : <Locate size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="ml-[5px] h-5 border-l-2 border-dashed border-border/60" />
                    <div className="flex items-center gap-3 relative z-40">
                      <div className="h-2.5 w-2.5 rounded-sm shrink-0 bg-amber-500" />
                      <div className="flex-1 relative">
                        <input
                          value={destination}
                          onChange={handleDestChange}
                          onFocus={() => setShowDestDropdown(true)}
                          onBlur={() => setTimeout(() => setShowDestDropdown(false), 200)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleFindRoute();
                              setShowDestDropdown(false);
                            }
                          }}
                          className="w-full rounded-xl border border-border dark:border-white/10 bg-secondary/60 dark:bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary transition-colors dark:text-white dark:placeholder:text-white/30"
                          placeholder={t('booking.destination', 'Destination')}
                        />
                        {showDestDropdown && (destSuggestions.length > 0 || isSearchingDest) && (
                          <div className="absolute top-[105%] left-0 right-0 z-[60] max-h-64 overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200 p-2">
                            {isSearchingDest && (
                              <div className="flex items-center gap-3 px-4 py-3 text-xs text-muted-foreground italic">
                                <Loader2 size={14} className="animate-spin text-primary" />
                                {t('booking.analyzing_places', 'Analyzing places...')}
                              </div>
                            )}
                            {destSuggestions.map((place, i) => (
                              <div
                                key={i}
                                className="w-full text-left px-4 py-3 text-xs hover:bg-primary/5 rounded-xl transition-all border-b border-border/5 last:border-0 cursor-pointer flex items-start gap-3 group"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  selectDest(place);
                                }}
                              >
                                <div className="mt-0.5 p-1.5 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                                  <MapPin size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-foreground truncate">{place.display_name?.split(',')[0] || t('booking.location_label', 'Location')}</span>
                                  <span className="text-[10px] text-muted-foreground truncate">{place.display_name?.split(',').slice(1).join(',').trim() || ""}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">{t('booking.date', 'Date')}</label>
                      <div className="relative">
                        <input type="date" className="w-full rounded-xl border border-border dark:border-white/10 bg-secondary/30 dark:bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary transition-all focus:ring-4 focus:ring-primary/5 dark:text-white dark:[color-scheme:dark]" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">{t('booking.time', 'Time')}</label>
                      <div className="relative">
                        <input type="time" className="w-full rounded-xl border border-border dark:border-white/10 bg-secondary/30 dark:bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary transition-all focus:ring-4 focus:ring-primary/5 dark:text-white dark:[color-scheme:dark]" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between p-4 rounded-3xl bg-secondary/30 border border-border/40 transition-all hover:bg-secondary/40">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-background shadow-sm ring-1 ring-border/50">
                        <Users size={20} style={{ color: mode.accent }} />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-black text-foreground leading-none">{t('booking.passengers', 'Passengers')}</label>
                        <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-tight">{t('booking.how_many', 'How many people?')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-background rounded-2xl p-1.5 shadow-sm border border-border/50">
                      <button
                        onClick={() => setPassengers(Math.max(1, passengers - 1))}
                        className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-secondary transition-all text-foreground text-lg active:scale-90"
                      >
                        -
                      </button>
                      <div className="h-10 w-10 flex items-center justify-center">
                        <span className="text-sm font-black text-foreground">{passengers}</span>
                      </div>
                      <button
                        onClick={() => setPassengers(Math.min(4, passengers + 1))}
                        className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-secondary transition-all text-foreground text-lg active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {passengers > 1 && (
                    <div className="mt-4 p-6 rounded-[2rem] border border-border/40 bg-card premium-shadow animate-in fade-in slide-in-from-top-2 duration-300">
                      <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">{t('booking.passenger_details', 'Passenger Details')}</h4>
                      <div className="space-y-3">
                        {Array.from({ length: passengers - 1 }).map((_, i) => (
                          <div key={i} className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground ml-1">{t('booking.passenger_name_label', 'Passenger {{index}} Name', { index: i + 2 })}</label>
                            <input
                              type="text"
                              placeholder={t('booking.enter_name_placeholder', 'Enter name for passenger {{index}}', { index: i + 2 })}
                              className="w-full rounded-xl border border-border bg-secondary/50 dark:bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary transition-colors dark:text-white dark:placeholder:text-white/30"
                              value={passengerDetails[i] || ""}
                              onChange={(e) => {
                                const newDetails = [...passengerDetails];
                                newDetails[i] = e.target.value;
                                setPassengerDetails(newDetails);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-10 mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">{t('booking.service_type', 'Service Type')}</h3>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('booking.tap_switch', 'Tap to switch')}</span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {modes.map((m) => {
                    const isActive = m.id === mode.id;
                    return (
                      <Link
                        key={m.id}
                        to={`/book/${m.id}`}
                        className={`group relative flex flex-col items-center justify-center rounded-[2.5rem] border p-6 transition-all duration-500 overflow-hidden ${isActive ? "border-transparent bg-card premium-shadow scale-[1.05] z-10" : "border-border bg-background/40 hover:bg-card hover:border-border/80 shadow-sm"}`}
                        style={isActive ? { boxShadow: `0 20px 40px -10px ${m.accent}25` } : {}}
                      >
                        {isActive && (
                          <div className="absolute top-4 right-4 h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: m.accent }} />
                        )}
                        <m.icon size={28} className="mb-3 transition-transform group-hover:scale-110" style={{ color: isActive ? m.accent : "hsl(var(--muted-foreground))" }} />
                        <span className="text-[10px] font-black tracking-widest text-center uppercase" style={isActive ? { color: m.accent } : { color: "hsl(var(--muted-foreground))" }}>
                          {t(`booking.mode_${m.id}`, m.name.replace(" Mode", ""))}
                        </span>
                        {isActive && (
                          <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ backgroundColor: m.accent }} />
                        )}
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-6 rounded-[2rem] border border-dashed border-border/60 bg-secondary/30 p-6 transition-all hover:bg-secondary/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-background shadow-sm">
                      <mode.icon size={18} style={{ color: mode.accent }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground leading-tight">{t(`booking.mode_${mode.id}`, mode.name.replace(" Mode", "")) + " Mode"}</h3>
                      <p className="text-[10px] text-muted-foreground font-medium">{t('booking.standard_safety', 'Standard safety protocols active')}</p>
                    </div>
                    {mode.id === "pink" && (
                      <span className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-tighter border shadow-sm animate-pulse" style={{ backgroundColor: mode.lightBg, color: mode.accent, borderColor: `${mode.accent}40` }}>
                        <Shield size={10} /> {t('booking.verified', 'Verified')}
                      </span>
                    )}
                  </div>
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {mode.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground font-medium">
                        <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${mode.accent}20` }}>
                          <CheckCircle2 size={10} style={{ color: mode.accent }} />
                        </div>
                        {t(`booking.feature_${feat.toLowerCase().replace(/[^a-z0-9]/g, '_')}`, feat)}
                      </li>
                    ))}
                  </ul>
                </div>
                {mode.id === "pwd" && (
                  <div className="flex flex-col gap-4">
                    <div className="mt-4 rounded-[2rem] border border-border/40 bg-card p-6 premium-shadow animate-in fade-in slide-in-from-bottom-2 duration-400 transition-all hover:-translate-y-1">
                      <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                        <Shield size={16} className="text-[hsl(var(--purple))]" style={{ color: mode.accent }} /> {t('booking.accessibility_needs', 'Accessibility Needs')}
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: "pwd_wheelchair", fallback: "Wheelchair Accessible Vehicle" },
                          { key: "pwd_assistance", fallback: "Driver Assistance Required" },
                          { key: "pwd_vision", fallback: "Vision Assistance" },
                          { key: "pwd_hearing", fallback: "Hearing Assistance" }
                        ].map((n, i) => (
                          <label key={i} className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 p-3 hover:bg-secondary cursor-pointer transition-all text-xs font-semibold text-foreground/90">
                            <input type="checkbox" className="accent-[hsl(var(--purple))] h-4 w-4 cursor-pointer" style={{ accentColor: mode.accent }} />
                            {t(`booking.${n.key}`, n.fallback)}
                          </label>
                        ))}
                      </div>
                      <h3 className="text-sm font-bold text-foreground mt-6 mb-3">{t('booking.emergency_contact', 'Emergency Contact')}</h3>
                      <input type="tel" placeholder={t('booking.emergency_phone_placeholder', '+63 912 345 6789')} className="w-full rounded-xl border border-border bg-secondary/50 dark:bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary transition-colors dark:text-white dark:placeholder:text-white/30" />
                    </div>
                    <div className="rounded-[2.5rem] border border-purple-200/50 bg-purple-50/50 dark:bg-purple-950/20 p-5 animate-in fade-in zoom-in-95 duration-500">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <AlertCircle size={18} className="text-purple-600 dark:text-purple-500" style={{ color: mode.accent }} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest text-purple-700 dark:text-purple-400 mb-1">{t('booking.pwd_reasonable_cost_title', 'Subsidized PWD Pricing')}</h4>
                          <p className="text-[11px] font-medium leading-relaxed text-purple-800/80 dark:text-purple-200/60">
                            {t('booking.pwd_reasonable_cost_desc', 'SafeGo supports inclusion by providing subsidized, highly affordable rates for our PWD community. We ensure that accessible travel remains a basic right, not a luxury.')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {mode.id === "pink" && (
                  <div className="flex flex-col gap-4">
                    <div className="mt-4 rounded-[2rem] border border-pink-500/20 bg-card p-6 premium-shadow animate-in fade-in slide-in-from-bottom-2 duration-400 transition-all hover:-translate-y-1">
                      <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                        <Shield size={16} className="text-pink-500" /> {t('booking.safety_preferences', 'Pink Mode Safety Preferences')}
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { key: "pink_female", fallback: "Prefer Verified Female Driver" },
                          { key: "pink_share", fallback: "Auto-Share Live Location & Route with Emergency Contact" },
                          { key: "pink_sos", fallback: "Enable One-Tap Threat SOS & Admin Dispatch" }
                        ].map((n, i) => (
                          <label key={i} className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 p-3 hover:bg-secondary cursor-pointer transition-all text-xs font-semibold text-foreground/90">
                            <input type="checkbox" defaultChecked={true} className="accent-pink-500 h-4 w-4 cursor-pointer" />
                            {t(`booking.${n.key}`, n.fallback)}
                          </label>
                        ))}
                      </div>

                      <div className="mt-6 pt-5 border-t border-border/60">
                        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                          <Phone size={15} className="text-pink-500" />
                          Emergency Contact Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                              Contact Name / Relation
                            </label>
                            <input
                              type="text"
                              value={emergencyContactName}
                              onChange={(e) => setEmergencyContactName(e.target.value)}
                              placeholder="e.g. Mother / Sister / Friend"
                              className="w-full rounded-xl border border-border bg-secondary/50 dark:bg-white/5 px-4 py-2.5 text-xs font-semibold outline-none focus:border-pink-500 transition-colors dark:text-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                              Emergency Phone Number
                            </label>
                            <input
                              type="tel"
                              value={emergencyContactPhone}
                              onChange={(e) => setEmergencyContactPhone(e.target.value)}
                              placeholder="e.g. +91 98765 43210"
                              className="w-full rounded-xl border border-border bg-secondary/50 dark:bg-white/5 px-4 py-2.5 text-xs font-semibold outline-none focus:border-pink-500 transition-colors dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[2rem] border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/20 p-5 animate-in fade-in zoom-in-95 duration-500">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <AlertCircle size={18} className="text-amber-600 dark:text-amber-500" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1">{t('booking.pink_mode_policy_title', 'Important Pink Mode Policy')}</h4>
                          <p className="text-[11px] font-medium leading-relaxed text-amber-800/80 dark:text-amber-200/60">
                            {t('booking.pink_mode_policy_desc', 'Pink Mode is a female-focused safety service. If male passengers accompany the traveler, the driver reserves the right to cancel the ride on the spot if they feel uncomfortable. Please ensure all travelers are disclosed.')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {mode.id === "elderly" && (
                  <div className="mt-4 rounded-[2rem] border border-border/40 bg-card p-6 premium-shadow animate-in fade-in slide-in-from-bottom-2 duration-400 transition-all hover:-translate-y-1">
                    <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                      <Shield size={16} className="text-[hsl(var(--blue))]" /> {t('booking.assistance_options', 'Assistance Options')}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { key: "elderly_assistance", fallback: "Driver Assistance Required" },
                        { key: "elderly_boarding", fallback: "Help with Boarding and Exiting Vehicle" },
                        { key: "elderly_medical", fallback: "Medical Support Contact" }
                      ].map((n, i) => (
                        <label key={i} className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 p-3 hover:bg-secondary cursor-pointer transition-all text-xs font-semibold text-foreground/90">
                          <input type="checkbox" className="accent-[hsl(var(--blue))] h-4 w-4 cursor-pointer" />
                          {t(`booking.${n.key}`, n.fallback)}
                        </label>
                      ))}
                    </div>
                    <h3 className="text-sm font-bold text-foreground mt-6 mb-3">{t('booking.emergency_contact', 'Emergency Contact')}</h3>
                    <input type="tel" placeholder={t('booking.elderly_contact_placeholder', "Family or caregiver's number")} className="w-full rounded-xl border border-border bg-secondary/50 dark:bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary transition-colors dark:text-white dark:placeholder:text-white/30" />
                  </div>
                )}
                {isAnalyzing && (
                  <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                    <div className="rounded-[2.5rem] bg-card premium-shadow border border-border/40 p-10 text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-secondary overflow-hidden">
                        <div className="h-full bg-primary animate-progress-fast" style={{ backgroundColor: mode.accent }} />
                      </div>
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4 animate-bounce">
                        <Loader2 size={32} style={{ color: mode.accent }} className="animate-spin" />
                      </div>
                      <h3 className="text-lg font-black text-foreground">{t('booking.ai_matrix_title', 'AI Intelligence Matrix')}</h3>
                      <p className="text-xs text-muted-foreground mt-2 font-medium max-w-[240px] mx-auto">
                        {t('booking.ai_matrix_desc', 'Generating predictive safety score and analyzing real-time traffic nodes...')}
                      </p>
                    </div>
                  </div>
                )}

                {routeFound && !isAnalyzing && (
                  <div className="mt-8 space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-700 pb-12">
                    {/* PREMIUM REDESIGNED AI INTELLIGENCE CARD */}
                    <div className="rounded-[2.5rem] bg-gradient-to-b from-card via-card/95 to-card/90 border border-border/40 p-8 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 premium-shadow">
                      {/* Subtle, glowing radial ambient lighting matched to the active mode's color */}
                      <div 
                        className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-[100px] opacity-10 transition-all duration-700 pointer-events-none"
                        style={{ backgroundColor: mode.accent }}
                      />
                      
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                        <Shield size={140} style={{ color: mode.accent }} />
                      </div>

                      {/* Header with high-tech badge styling */}
                      <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/10">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-2xl flex items-center justify-center bg-green-500/10 border border-green-500/20 shadow-sm shadow-green-500/5">
                            <CheckCircle2 size={18} className="text-green-500" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-[0.15em] text-foreground">{t('booking.ai_report_title', 'AI Intelligence Report')}</h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-tight">{t('booking.ai_report_subtitle', 'Real-time Safety & Route Audit')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/80 border border-border/60 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          {t('booking.active_audit', 'Active Audit')}
                        </div>
                      </div>

                      {/* Safety Score with Glowing Card Container */}
                      <div className="relative z-10 p-5 rounded-3xl bg-secondary/20 dark:bg-white/[0.01] border border-border/20 shadow-inner">
                        <SafetyScoreBar score={rideDetails.score} color={mode.accent} />
                      </div>

                      {/* Route metrics grid with modern styling & dynamic hover shifts */}
                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="p-5 rounded-3xl bg-secondary/30 dark:bg-white/[0.01] border border-border/30 transition-all duration-300 hover:bg-secondary/50 hover:border-border/50 shadow-sm flex flex-col justify-between">
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground opacity-60">{t('booking.route_length', 'Route Length')}</span>
                          <div className="mt-3 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-background shadow-sm border border-border/30">
                              <MapPin size={16} style={{ color: mode.accent }} />
                            </div>
                            <span className="text-xl font-black text-foreground tracking-tight">{rideDetails.distance}</span>
                          </div>
                        </div>
                        <div className="p-5 rounded-3xl bg-secondary/30 dark:bg-white/[0.01] border border-border/30 transition-all duration-300 hover:bg-secondary/50 hover:border-border/50 shadow-sm flex flex-col justify-between">
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground opacity-60">{t('booking.travel_time', 'Travel Time')}</span>
                          <div className="mt-3 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-background shadow-sm border border-border/30">
                              <Navigation size={16} className="text-blue-500" />
                            </div>
                            <span className="text-xl font-black text-foreground tracking-tight">
                              {rideDetails.etaNum > 60
                                ? t('booking.hours_minutes_format', '{{hours}}h {{minutes}}m', { hours: Math.floor(rideDetails.etaNum / 60), minutes: Math.round(rideDetails.etaNum % 60) })
                                : t('booking.minutes_format', '{{minutes}} min', { minutes: Math.round(rideDetails.etaNum) })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Redesigned estimated fare: looks like an executive luxury slip */}
                      <div className="mt-5 p-5 rounded-3xl bg-gradient-to-r from-primary/[0.03] to-primary/[0.08] border border-primary/20 dark:border-primary/10 transition-all duration-300 hover:brightness-105 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
                              <Star size={20} className="text-primary fill-primary" />
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-primary/60">{t('booking.estimated_fare', 'Estimated Fare')}</span>
                              <div className="flex items-center gap-3 mt-1">
                                <div className="text-2xl font-black text-foreground tracking-tight">₹{rideDetails.fare.toLocaleString()}</div>
                                {rideDetails.surgeMultiplier > 1.0 && (
                                  <div 
                                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border animate-pulse shadow-sm"
                                    style={{
                                      backgroundColor: `${mode.accent}15`,
                                      borderColor: `${mode.accent}30`,
                                      color: mode.accent
                                    }}
                                  >
                                    <Zap size={8} className="fill-current" style={{ color: mode.accent }} />
                                    {t('booking.surge_label', '{{multiplier}}x Surge', { multiplier: rideDetails.surgeMultiplier })}
                                  </div>
                                )}
                                {mode.id === "pwd" && (
                                  <div 
                                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border shadow-sm"
                                    style={{
                                      backgroundColor: `${mode.accent}15`,
                                      borderColor: `${mode.accent}30`,
                                      color: mode.accent
                                    }}
                                  >
                                    <CheckCircle2 size={8} className="fill-current" style={{ color: mode.accent }} />
                                    {t('booking.pwd_discount_applied', 'PWD Subsidized Rate')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground opacity-60">{t('booking.incl_taxes', 'Incl. Taxes')}</span>
                            <div className="text-xs font-black text-green-600 mt-1 uppercase tracking-wider">{t('booking.secure_pay', 'Secure Pay')}</div>
                          </div>
                        </div>
                      </div>

                      {/* Heavy Traffic Optimization Alert */}
                      {(rideDetails.traffic === 'Moderate' || rideDetails.traffic === 'Heavy') && !isRerouted && (
                        <div className="mt-5 p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-foreground animate-in zoom-in-95 duration-300">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-xl flex items-center justify-center bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                <Activity size={16} className="animate-pulse" />
                              </div>
                              <div>
                                <h5 className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">{t('booking.gridlock_detected', 'Gridlock Detected')}</h5>
                                <p className="text-[9px] text-muted-foreground mt-0.5 font-bold uppercase tracking-tight">{t('booking.ai_detour', 'AI identified a low-traffic detour')}</p>
                              </div>
                            </div>
                            <button
                              onClick={handleRerouteLowTraffic}
                              disabled={isReroutingAlternative}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                            >
                              {isReroutingAlternative ? (
                                <>
                                  <Loader2 size={10} className="animate-spin" />
                                  {t('booking.routing_loader', 'Routing...')}
                                </>
                              ) : (
                                <>
                                  <Zap size={10} className="fill-current" />
                                  {t('booking.reroute_btn', 'Reroute')}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Rerouted corridor active success box */}
                      {isRerouted && (
                        <div className="mt-5 p-4 rounded-3xl bg-green-500/10 border border-green-500/20 text-foreground animate-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl flex items-center justify-center bg-green-500/20 text-green-600 dark:text-green-400">
                              <CheckCircle2 size={16} />
                            </div>
                            <div>
                              <h5 className="text-[11px] font-black uppercase tracking-wider text-green-700 dark:text-green-400">{t('booking.alternative_route_active', 'Alternative Route Active')}</h5>
                              <p className="text-[9px] text-muted-foreground mt-0.5 font-bold uppercase tracking-tight">{t('booking.low_traffic_selected', 'Low-traffic corridor selected successfully')}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Redesigned dashboard status metrics footer */}
                      <div className="mt-5 flex items-center justify-between p-4 rounded-2xl bg-secondary/40 dark:bg-black/20 border border-border/20 shadow-inner">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-3 w-3">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${rideDetails.traffic === 'Light' ? 'bg-green-400' : rideDetails.traffic === 'Moderate' ? 'bg-amber-400' : 'bg-red-400'}`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${rideDetails.traffic === 'Light' ? 'bg-green-500' : rideDetails.traffic === 'Moderate' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                          </div>
                          <span className="text-xs font-black uppercase tracking-[0.1em] text-foreground">{t('booking.traffic_label', '{{level}} Traffic', { level: t(`booking.traffic_${rideDetails.traffic.toLowerCase()}`, rideDetails.traffic) })}</span>
                        </div>
                        <div className="h-4 w-px bg-border/40" />
                        <div className="flex items-center gap-3">
                          <Zap 
                            size={16} 
                            className={`animate-pulse ${
                              rideDetails.aiPrediction === 'Stable' 
                                ? 'text-emerald-500' 
                                : rideDetails.aiPrediction === 'Cautious' 
                                ? 'text-amber-500' 
                                : 'text-rose-500'
                            }`} 
                          />
                          <span 
                            className={`text-xs font-black uppercase tracking-[0.1em] ${
                              rideDetails.aiPrediction === 'Stable' 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : rideDetails.aiPrediction === 'Cautious' 
                                ? 'text-amber-600 dark:text-amber-400' 
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {t('booking.ai_prediction_label', 'AI: {{prediction}}', { prediction: t(`booking.prediction_${rideDetails.aiPrediction.toLowerCase().replace(' ', '_')}`, rideDetails.aiPrediction) })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 pl-1 text-center">{t('booking.available_operators', 'Available Operators Nearby')}</h3>
                      {!selectedDriver ? (
                        <div className="group rounded-[2.5rem] border-2 border-dashed border-primary/40 bg-card p-8 text-center transition-all hover:bg-card hover:border-primary/70 premium-shadow space-y-4 animate-in fade-in duration-300">
                          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shadow-sm text-primary group-hover:rotate-12 transition-transform">
                            <Car size={28} />
                          </div>
                          <div>
                            <p className="text-base font-black text-foreground">{t('booking.available_operators', '5 Verified Cabs Available Nearby')}</p>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">Tap any vehicle on the map, or click below to auto-match & request the nearest verified pilot.</p>
                          </div>
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                handleAutoSelectNearestCab();
                              }}
                              className="w-full py-4 px-6 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                            >
                              <Zap size={16} className="fill-current" />
                              {t('booking.book_nearest_now', 'AUTO-MATCH & BOOK NEAREST CAB NOW')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[2.5rem] bg-card border border-border/40 p-8 premium-shadow animate-in slide-in-from-bottom-4 duration-500 relative transition-all hover:-translate-y-1">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                              {t('booking.active_status', 'Active Status')}
                            </div>
                            <div className="flex items-center gap-1 font-black text-amber-500 text-xs">
                              <Star size={14} className="fill-current" />
                              {selectedDriver.rating}
                            </div>
                          </div>
                          <div className={`flex items-center gap-5 transition-all duration-500 ${askStatus === "rejected" ? "opacity-40 grayscale" : "opacity-100"}`}>
                            <div className="relative">
                              <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-black text-white shadow-xl shadow-black/20" style={{ backgroundColor: askStatus === "accepted" ? "#10b981" : mode.accent }}>
                                {(selectedDriver?.name || "D").split(" ").map((n: string) => n[0]).join("")}
                              </div>
                              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-background bg-green-500 shadow-sm" title="Verified Driver" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xl font-black text-foreground tracking-tight leading-none">{selectedDriver.name}</p>
                              <p className="text-xs text-muted-foreground mt-2 font-black uppercase tracking-widest opacity-60">{t('booking.plate_label', 'Plate: {{plate}}', { plate: "ABC 123" })}</p>
                            </div>
                            <div className="text-right">
                              <span className="block text-2xl font-black text-foreground tracking-tighter">₹{selectedDriver.price}</span>
                              <span className="block mt-1 text-[10px] font-bold text-blue-600 uppercase tracking-widest">{t('booking.eta_minutes', 'ETA {{minutes}}m', { minutes: selectedDriver.eta })}</span>
                            </div>
                          </div>
                          <div className={`mt-8 transition-all duration-500 ${askStatus === "rejected" ? "opacity-40" : "opacity-100"}`}>
                            {chatOpen ? (
                              <div className="rounded-3xl border border-border/50 bg-secondary/20 p-2 animate-in fade-in zoom-in-95 duration-300">
                                <div className="flex items-center justify-between px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{t('booking.operator_console', 'Operator Console')}</span>
                                  </div>
                                  <button onClick={() => setChatOpen(false)} className="p-1.5 rounded-full hover:bg-background transition-colors"><X size={14} /></button>
                                </div>
                                <div className="h-32 overflow-y-auto px-4 py-2 flex flex-col gap-3 scrollbar-hide">
                                  {chatMsgs.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full opacity-30">
                                      <MessageCircle size={32} />
                                      <p className="text-[10px] font-bold uppercase mt-2">{t('booking.new_conversation', 'New Conversation')}</p>
                                    </div>
                                  )}
                                  {chatMsgs.map((msg, i) => (
                                    <div key={i} className={`max-w-[85%] rounded-[1.2rem] px-4 py-2.5 text-xs font-medium shadow-sm leading-relaxed ${msg.sender === "user" ? "bg-primary text-primary-foreground self-end rounded-tr-none" : "bg-background text-foreground self-start rounded-tl-none border border-border/50"}`}>
                                      {msg.text}
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-2 p-1.5 flex gap-2">
                                  <input
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                                    className="flex-1 bg-background/80 backdrop-blur-md border border-border/50 rounded-2xl px-5 py-3 text-xs outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                    placeholder={t('booking.secure_message_placeholder', 'Secure message...')}
                                  />
                                  <button onClick={handleSendMessage} disabled={!chatInput.trim()} className="bg-primary text-primary-foreground p-3.5 rounded-2xl disabled:opacity-50 hover:shadow-xl hover:scale-105 active:scale-95 transition-all">
                                    <Send size={18} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="relative group">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                    <MessageCircle size={16} />
                                  </div>
                                  <input
                                    type="text"
                                    placeholder={t('booking.instructions_placeholder', 'Add specialized instructions...')}
                                    className="w-full rounded-2xl border border-border/60 bg-secondary/30 pl-11 pr-5 py-4 text-xs font-semibold outline-none focus:bg-background transition-all focus:ring-4 focus:ring-primary/5"
                                    disabled={askStatus !== "idle"}
                                  />
                                </div>
                                <div className="flex gap-4">
                                  <button
                                    className="flex-1 group relative rounded-2xl border border-border/80 py-4 text-xs font-black uppercase tracking-widest hover:bg-secondary transition-all active:scale-[0.98] disabled:opacity-50 overflow-hidden"
                                    disabled={askStatus === "asking" || askStatus === "rejected"}
                                    onClick={() => setChatOpen(true)}
                                  >
                                    <div className="flex items-center justify-center gap-2">
                                      <MessageCircle size={14} className="transition-transform group-hover:scale-110" />
                                      {t('booking.direct_contact', 'Direct Contact')}
                                    </div>
                                  </button>
                                  <button
                                    onClick={askStatus === "accepted" ? handleConfirmRide : handleAskDriver}
                                    disabled={askStatus === "asking"}
                                    className="flex-1 group relative rounded-2xl py-4 text-xs font-black uppercase tracking-widest text-white transition-all shadow-xl hover:shadow-2xl hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                                    style={{ backgroundColor: askStatus === "accepted" ? "#10b981" : askStatus === "rejected" ? "#ef4444" : mode.accent }}
                                  >
                                    <div className="flex items-center justify-center gap-2">
                                      {askStatus === "idle" || askStatus === "rejected" ? (
                                        <>{t('booking.send_request', 'SEND REQUEST')}</>
                                      ) : askStatus === "asking" ? (
                                        <><Loader2 size={16} className="animate-spin" /> {t('booking.pending', 'PENDING...')}</>
                                      ) : (
                                        <>{t('booking.secure_booking_now', 'SECURE BOOKING NOW')}</>
                                      )}
                                    </div>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          {askStatus === "accepted" && (
                            <div className="mt-6 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 font-bold text-[10px] uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                              <CheckCircle2 size={12} />
                              {t('booking.driver_ready', 'Driver is ready to assist you')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            {flowState === "confirmed" && (
              <div className="animate-in slide-in-from-right-8 fade-in duration-500 space-y-6 max-w-lg mx-auto py-8">
                <div className="flex justify-start mb-4">
                  <button
                    onClick={() => setFlowState("booking")}
                    className="group flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur-sm hover:bg-secondary transition-all shadow-sm hover:shadow-md"
                  >
                    <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
                  </button>
                </div>
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: 0.2
                    }}
                    className="mx-auto w-20 h-20 bg-green-500/10 flex items-center justify-center rounded-full mb-6 shadow-sm border border-green-500/20"
                  >
                    <CheckCircle2 size={40} className="text-green-600" />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-2xl font-bold font-display text-foreground"
                  >
                    {mode.id === "pwd"
                      ? t('booking.pwd_special_cab_booked', 'Special Cab Booked!')
                      : t('booking.ride_confirmed', 'Ride Confirmed!')}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-muted-foreground mt-2 text-sm"
                  >
                    {mode.id === "pwd"
                      ? t('booking.pwd_special_cab_desc', 'A specialized accessible cab has been booked. Our company provides more reasonable rates for PWD users to ensure accessible and affordable transport for everyone. Your driver is specially trained to assist you.')
                      : t('booking.driver_on_way_to_pickup', 'Your driver is on the way to your pickup location.')}
                  </motion.p>
                </div>
                <div className="rounded-[2.5rem] bg-card border border-border/40 premium-shadow p-8 mt-8 transition-all hover:-translate-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">{t('booking.driver_details', 'Driver Details')}</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white shadow-md bg-green-500">
                      {selectedDriver?.name.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">{selectedDriver?.name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5"><Star size={12} className="inline fill-amber-400 text-amber-400 mr-1" />{t('booking.rating_label', '{{rating}} Rating', { rating: selectedDriver?.rating })}</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-xl font-black text-foreground">₹{selectedDriver?.price}</span>
                      <span className="block text-xs font-semibold text-blue-600 mt-1 uppercase">{t('booking.arriving_in', 'Arriving in {{minutes}}m', { minutes: selectedDriver?.eta })}</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-border">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{t('booking.destination', 'Destination')}</h3>
                    <p className="text-sm font-medium text-foreground">{destination}</p>
                  </div>

                  {/* RIDE START SECURITY PIN WIDGET */}
                  <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-amber-500/5 to-background border border-primary/20 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                            Ride Security PIN
                          </h4>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            Verify identity with driver before onboarding
                          </p>
                        </div>
                      </div>
                      {isOtpVerified ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 size={12} /> Verified & Started
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                          <Lock size={12} /> Verification Pending
                        </span>
                      )}
                    </div>

                    {!isOtpVerified ? (
                      <div className="mt-3 text-center bg-background/80 dark:bg-black/30 backdrop-blur-sm p-4 rounded-xl border border-border/60">
                        <p className="text-[11px] font-semibold text-muted-foreground mb-2">
                          Share this 4-digit PIN with your driver to start your trip safely:
                        </p>
                        <div className="flex items-center justify-center gap-3 my-2">
                          {(rideOtp || "4829").split("").map((digit, idx) => (
                            <div
                              key={idx}
                              className="w-11 h-13 rounded-xl bg-primary/10 border-2 border-primary/40 flex items-center justify-center text-2xl font-black text-primary font-mono shadow-inner tracking-tight"
                            >
                              {digit}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground italic mt-2">
                          "Driver must enter this exact PIN in their app to verify that you are the correct rider."
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        <span>PIN verified! Your safe journey has officially started.</span>
                      </div>
                    )}
                  </div>

                  {/* ACTIVE RIDE THREAT RESPONSE WIDGET (DISPLAYED WHEN RIDE IS BOOKED & ACCEPTED BY DRIVER) */}
                  <div className="mt-6 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md animate-pulse">
                        <Siren size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                          Active Ride Threat Response SOS
                        </h4>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          Auto-broadcasts live location & route to {emergencyContactName || 'Emergency Contact'} ({emergencyContactPhone || 'Saved Number'}) & Admin Command.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSosSentSuccess(false);
                        setSosModalOpen(true);
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:brightness-110 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      <ShieldAlert size={16} />
                      DISPATCH THREAT ALERT & LIVE ROUTE NOW
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleCompleteRide}
                  className="w-full mt-8 rounded-xl py-4 text-sm font-bold text-white hover:brightness-110 transition-all shadow-md active:scale-[0.98]"
                  style={{ backgroundColor: mode.accent }}
                >
                  {t('booking.simulate_ride_completion', 'Simulate Ride Completion')}
                </button>
              </div>
            )}
            {flowState === "review" && (
              <div className="animate-in slide-in-from-right-8 fade-in duration-500 space-y-6 max-w-lg mx-auto py-8">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full mb-4 shadow-sm" style={{ backgroundColor: `${mode.accent}20`, color: mode.accent }}>
                    <Star size={32} className="fill-current" />
                  </div>
                  <h2 className="text-2xl font-bold font-display text-foreground">{t('booking.destination_reached', "You've reached your destination!")}</h2>
                  <p className="text-muted-foreground mt-2 text-sm">{t('booking.how_was_journey', 'How was your journey with {{driver}}?', { driver: selectedDriver?.name })}</p>
                </div>
                <div className="rounded-[2.5rem] bg-card border border-border/40 premium-shadow p-8 mt-8 text-center flex flex-col items-center transition-all hover:-translate-y-1">
                  <h3 className="text-sm font-bold text-foreground mb-4">{t('booking.rate_driver', 'Rate your driver')}</h3>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      let delayClass = "";
                      if (star > prevRating + 1 && star <= rating) {
                        const delayAmount = star - (prevRating + 1);
                        delayClass = `rating__label--delay${delayAmount}`;
                      }

                      return (
                        <button
                          key={star}
                          onClick={() => handleRatingSelect(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className={`p-1 transition-transform hover:scale-110 focus:outline-none ${delayClass}`}
                        >
                          <Star
                            size={36}
                            className={`transition-colors duration-200 ${(hoverRating || rating) >= star ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-muted-foreground/30'}`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 font-medium min-h-[16px]">
                    {rating === 5 
                      ? t('booking.rating_excellent', 'Excellent service!') 
                      : rating === 4 
                      ? t('booking.rating_great', 'Great ride!') 
                      : rating === 3 
                      ? t('booking.rating_okay', 'It was okay.') 
                      : rating > 0 
                      ? t('booking.rating_poor', 'Needs improvement') 
                      : " "}
                  </p>
                  <div className="w-full mt-6 text-left">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">{t('booking.leave_review_optional', 'Leave a review (optional)')}</label>
                    <textarea
                      rows={4}
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder={t('booking.review_placeholder', 'Tell us what you liked about {{driver}}...', { driver: selectedDriver?.name })}
                      className="w-full rounded-xl border border-border bg-secondary/30 dark:bg-white/5 p-3 text-sm focus:border-primary outline-none transition-colors resize-none dark:text-white dark:placeholder:text-white/30"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSubmitReview}
                  disabled={rating === 0}
                  className="w-full mt-6 rounded-xl py-4 text-sm font-bold text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
                  style={{ backgroundColor: rating > 0 ? mode.accent : 'hsl(var(--muted))' }}
                >
                  {t('booking.submit_finish', 'Submit & Finish')}
                </button>
                <button onClick={handleSubmitReview} className="w-full mt-2 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {t('booking.skip_for_now', 'Skip for now')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT PANEL — Live Map ════ */}
        {flowState === "booking" && (
          <div className="hidden lg:block lg:w-1/2 relative animate-in fade-in slide-in-from-right duration-500">
            {destination.trim() && routeFound ? (
              <MapPanel
                accent={mode.accent}
                mode={mode.id}
                centerLoc={mapCenter}
                triggerRoute={triggerRoute}
                routePolyline={routePolyline}
                onRouteExtracted={handleRouteExtracted}
                onCabSelect={setSelectedDriver}
                simulatingTravel={isSimulatingTravel}
                onTravelComplete={() => {
                  setAskStatus("accepted");
                  setFlowState("confirmed");
                  setIsSimulatingTravel(false);
                }}
                estimatedFare={rideDetails.fare}
                activeDrivers={activeDrivers}
              />
            ) : (
              <div className="h-full min-h-[600px] w-full rounded-[2.5rem] border-2 border-dashed border-primary/30 bg-card/60 backdrop-blur-md p-12 flex flex-col items-center justify-center text-center space-y-6 shadow-2xl relative overflow-hidden group">
                <div 
                  className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-[100px] opacity-20 pointer-events-none transition-all"
                  style={{ backgroundColor: mode.accent }}
                />
                
                <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl group-hover:scale-110 transition-transform duration-500">
                  <MapPin size={48} style={{ color: mode.accent }} className="animate-bounce" />
                </div>
                
                <div className="max-w-md space-y-3 z-10">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-black uppercase tracking-widest text-primary shadow-sm">
                    <Navigation size={13} />
                    GPS Navigation Lock Required
                  </div>
                  <h3 className="text-2xl font-black text-foreground tracking-tight">Interactive Navigation Map</h3>
                  <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                    Please enter your complete destination address on the left to reveal live map navigation, predictive safety scores, and nearby fleet drivers.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── SOS EMERGENCY THREAT DISPATCH MODAL ─── */}
      <AnimatePresence>
        {sosModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-card border border-rose-500/40 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden relative"
            >
              <button
                onClick={() => setSosModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors"
              >
                <X size={18} />
              </button>

              {!sosSentSuccess ? (
                <div className="text-center py-2 space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 animate-pulse shadow-lg shadow-rose-500/20">
                    <Siren size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground tracking-tight">Dispatch Threat Alert</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Will automatically transmit your <strong className="text-rose-500">Live Location</strong> and <strong className="text-foreground">Route Details</strong> to <span className="font-bold text-foreground">{emergencyContactName}</span> ({emergencyContactPhone}) and SafeGo Emergency Command.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-secondary/50 border border-border/60 text-left space-y-2.5 text-xs font-semibold">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] uppercase font-bold tracking-wider">Emergency Contact</span>
                      <span className="text-foreground font-bold">{emergencyContactName}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] uppercase font-bold tracking-wider">Phone</span>
                      <span className="text-foreground font-bold">{emergencyContactPhone}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] uppercase font-bold tracking-wider">Live Position</span>
                      <span className="text-rose-500 font-bold truncate max-w-[180px]">{pickup || "Current Location"}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] uppercase font-bold tracking-wider">Active Route</span>
                      <span className="text-foreground font-bold truncate max-w-[180px]">{pickup || "Start"} ➔ {destination || "End"}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSosModalOpen(false)}
                      className="flex-1 py-3.5 rounded-xl border border-border bg-secondary/40 text-xs font-bold hover:bg-secondary transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleTriggerThreatSOS}
                      disabled={sosDispatching}
                      className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-rose-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {sosDispatching ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          DISPATCHING...
                        </>
                      ) : (
                        <>
                          <Siren size={16} />
                          CONFIRM & TRANSMIT NOW
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 space-y-4 animate-in zoom-in-95 duration-300">
                  <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 size={36} />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest mb-2">
                      <Radio size={12} className="animate-pulse" /> Emergency Transmission Complete
                    </div>
                    <h3 className="text-xl font-black text-foreground tracking-tight">Threat Alert Sent!</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Emergency SMS message with your Live Location & Route has been transmitted to <strong className="text-foreground">{emergencyContactName}</strong> ({emergencyContactPhone}) and SafeGo Emergency Command.
                    </p>
                  </div>

                  {sosData && (
                    <div className="p-4 rounded-2xl bg-secondary/60 border border-border/60 text-left space-y-2 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-bold uppercase tracking-wider">SMS / Call Sent To:</span>
                        <span className="text-foreground font-bold">{sosData.contact_name} ({sosData.contact_phone})</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Admin Status:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">Dispatched to Fleet Control</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Live Route & Location:</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${sosData.live_location} | Route: ${sosData.route_info}`);
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 2000);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold flex items-center gap-1 hover:bg-primary/20 transition-colors"
                        >
                          {copiedLink ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                          {copiedLink ? "Copied!" : "Copy Link"}
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setSosModalOpen(false)}
                    className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-md"
                  >
                    Close Window
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingPage;
