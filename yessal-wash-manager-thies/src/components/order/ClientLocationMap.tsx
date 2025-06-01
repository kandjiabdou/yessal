
import React from 'react';

interface ClientLocationMapProps {
  coordinates: {
    lat: number;
    lng: number;
  };
}

const ClientLocationMap: React.FC<ClientLocationMapProps> = ({ coordinates }) => {
  // In a real implementation, this would use a mapping library like Mapbox or Google Maps
  // For now, we'll use a placeholder with the coordinates
  
  return (
    <div className="relative h-[150px] rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-200">
        {/* This would be replaced with an actual map */}
        <div className="h-full w-full bg-gradient-to-b from-gray-200 to-gray-300"></div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/90 px-3 py-2 rounded-md shadow-sm">
          <p className="text-sm font-medium">Location: {coordinates.lat}, {coordinates.lng}</p>
          <p className="text-xs text-gray-500">Carte non disponible en démo</p>
        </div>
      </div>
    </div>
  );
};

export default ClientLocationMap;
