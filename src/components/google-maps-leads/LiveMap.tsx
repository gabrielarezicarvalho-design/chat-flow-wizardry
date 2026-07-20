import { useEffect, useRef } from "react";

interface MapLead {
  name: string;
  address?: string;
  phone?: string;
  lat?: number;
  lng?: number;
}

interface LiveMapProps {
  leads: MapLead[];
  city?: string;
}

declare global {
  interface Window {
    google: any;
    __initNextProMap?: () => void;
  }
}

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;

let loaderPromise: Promise<void> | null = null;

function loadMapsScript(): Promise<void> {
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve();
    if (!BROWSER_KEY) return reject(new Error("Google Maps browser key ausente"));
    window.__initNextProMap = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&callback=__initNextProMap&channel=${TRACKING_ID}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export function LiveMap({ leads, city }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadMapsScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        if (!mapRef.current) {
          mapRef.current = new window.google.maps.Map(containerRef.current, {
            center: { lat: -14.235, lng: -51.925 }, // Brasil
            zoom: 4,
            disableDefaultUI: true,
            zoomControl: true,
            styles: [
              { elementType: "geometry", stylers: [{ color: "#1f2937" }] },
              { elementType: "labels.text.stroke", stylers: [{ color: "#1f2937" }] },
              { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
              { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
              { featureType: "road", elementType: "geometry", stylers: [{ color: "#334155" }] },
              { featureType: "poi", stylers: [{ visibility: "off" }] },
            ],
          });
        }
      })
      .catch((e) => console.error("Maps load error", e));
    return () => {
      cancelled = true;
    };
  }, []);

  // Atualiza marcadores quando leads mudam
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    // Limpa antigos
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    leads.forEach((lead) => {
      if (typeof lead.lat !== "number" || typeof lead.lng !== "number") return;
      const pos = { lat: lead.lat, lng: lead.lng };
      const marker = new window.google.maps.Marker({
        position: pos,
        map,
        title: lead.name,
        animation: window.google.maps.Animation.DROP,
      });
      const info = new window.google.maps.InfoWindow({
        content: `<div style="color:#111;font-family:sans-serif;min-width:180px">
          <div style="font-weight:600;margin-bottom:4px">${lead.name}</div>
          ${lead.address ? `<div style="font-size:12px;color:#555">${lead.address}</div>` : ""}
          ${lead.phone ? `<div style="font-size:12px;color:#555">📞 ${lead.phone}</div>` : ""}
        </div>`,
      });
      marker.addListener("click", () => info.open({ anchor: marker, map }));
      markersRef.current.push(marker);
      bounds.extend(pos);
      hasPoints = true;
    });

    if (hasPoints) {
      map.fitBounds(bounds, 60);
    }
  }, [leads]);

  return <div ref={containerRef} className="w-full h-full" aria-label={`Mapa ${city || ""}`} />;
}
