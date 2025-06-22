import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface GoogleMapProps {
  address: string;
  className?: string;
}

const GoogleMap = ({ address, className }: GoogleMapProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Real location for Thiès, Mbour 2, Senegal
  const lat = 14.770568;
  const lng = -16.936283;
  
  // For development, we'll use a static map instead of requiring an API key
  useEffect(() => {
    // Set loaded to true immediately since we're using a static approach
    setIsLoaded(true);
  }, []);

  // Render fallback while map is loading
  if (!isLoaded) {
    return (
      <div className={cn("w-full h-80 bg-gray-200 rounded-xl flex items-center justify-center", className)}>
        <div className="text-center p-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  // Temporary static map solution
  return (
    <div className={cn("w-full h-80 rounded-xl overflow-hidden shadow-lg", className)}>
      {/* Embed OpenStreetMap as it doesn't require an API key */}
      <iframe
        title="Yessal Location Map"
        width="100%"
        height="100%"
        frameBorder="0"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=-16.9444%2C14.7383%2C-16.9044%2C14.7783&layer=mapnik&marker=${lat}%2C${lng}`}
        allowFullScreen
      />
    </div>
  );
};

export default GoogleMap;
