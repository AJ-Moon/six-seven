import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Coordinates = { lat: number; lng: number };

type Props = {
  store: Coordinates;
  focus: Coordinates;
  pin: Coordinates | null;
  radiusKm: number;
  onPick: (position: Coordinates) => void;
};

export function DeliveryPinMap({ store, focus, pin, radiusKm, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const zoneRef = useRef<L.Circle | null>(null);
  const pinRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);

  onPickRef.current = onPick;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
      [store.lat, store.lng],
      12,
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    const zone = L.circle([store.lat, store.lng], {
      radius: 0,
      color: "#e36616",
      fillColor: "#e36616",
      fillOpacity: 0.08,
      weight: 2,
    }).addTo(map);
    L.circleMarker([store.lat, store.lng], {
      radius: 8,
      color: "#fff",
      fillColor: "#035b5c",
      fillOpacity: 1,
      weight: 2,
    }).bindTooltip("Six Seven").addTo(map);
    map.on("click", (event: L.LeafletMouseEvent) => {
      onPickRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    mapRef.current = map;
    zoneRef.current = zone;
    return () => {
      map.remove();
      mapRef.current = null;
      zoneRef.current = null;
      pinRef.current = null;
    };
  }, [store.lat, store.lng]);

  useEffect(() => {
    zoneRef.current?.setRadius(radiusKm * 1000);
  }, [radiusKm, store.lat, store.lng]);

  useEffect(() => {
    mapRef.current?.setView(
      [focus.lat, focus.lng],
      focus.lat === store.lat && focus.lng === store.lng ? 12 : 14,
    );
  }, [focus.lat, focus.lng, store.lat, store.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!pin) {
      pinRef.current?.remove();
      pinRef.current = null;
      return;
    }
    if (pinRef.current) {
      pinRef.current.setLatLng([pin.lat, pin.lng]);
    } else {
      const marker = L.marker([pin.lat, pin.lng], {
        draggable: true,
        title: "Drag to adjust your delivery address",
        icon: L.divIcon({
          className: "rounded-full border-2 border-white bg-orange-600 shadow-md",
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      });
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        onPickRef.current({ lat, lng });
      });
      pinRef.current = marker.bindTooltip("Delivery address").addTo(map);
    }
  }, [pin]);

  return <div ref={containerRef} className="h-72 w-full" aria-label="Select your exact delivery address on the map" />;
}
