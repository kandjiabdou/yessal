export interface SiteLavage {
  id: number;
  nom: string;
  adresseText: string;
  ville: string;
  latitude: number | null;
  longitude: number | null;
  telephone: string;
  heureOuverture: string;  // Format "HH:mm" ex: "08:30" - Default: "09:00"
  heureFermeture: string;  // Format "HH:mm" ex: "21:00" - Default: "20:00"
  statutOuverture: boolean;
  machines: Machine[];
}

export interface Machine {
  id: number;
  numero: string;
  type: string;
  poidsKg: number;
} 