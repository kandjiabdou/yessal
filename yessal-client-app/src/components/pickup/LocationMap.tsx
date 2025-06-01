
import { useEffect, useRef } from "react";

interface LocationMapProps {
  latitude: number | null;
  longitude: number | null;
}

const LocationMap = ({ latitude, longitude }: LocationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!mapRef.current || !latitude || !longitude) return;
    
    // Create the map iframe with the OpenStreetMap URL
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.005},${latitude-0.005},${longitude+0.005},${latitude+0.005}&layer=mapnik&marker=${latitude},${longitude}`;
    iframe.width = "100%";
    iframe.height = "100%";
    iframe.frameBorder = "0";
    iframe.style.border = "1px solid #ccc";
    iframe.style.borderRadius = "8px";
    
    // Clear and add the iframe
    mapRef.current.innerHTML = "";
    mapRef.current.appendChild(iframe);
    
    return () => {
      if (mapRef.current) {
        mapRef.current.innerHTML = "";
      }
    };
  }, [latitude, longitude]);
  
  if (!latitude || !longitude) {
    return (
      <div className="bg-muted h-[200px] rounded-lg flex items-center justify-center text-sm text-muted-foreground">
        Position GPS non disponible
      </div>
    );
  }
  
  return (
    <div ref={mapRef} className="h-[200px] rounded-lg overflow-hidden" />
  );
};

export default LocationMap;
