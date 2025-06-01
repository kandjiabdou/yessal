export interface SiteLavage {
  id: number;
  nom: string;
  adresseText: string;
  ville: string;
  latitude: number | null;
  longitude: number | null;
  telephone: string;
  horaireOuvertureText: string;
  statutOuverture: boolean;
  machines: Machine[];
}

export interface Machine {
  id: number;
  numero: string;
  type: string;
  poidsKg: number;
} 