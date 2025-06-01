import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Service {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  color : string;
}

export interface Feature {
  id: number;
  icon: string;
  title: string;
  description: string;
}


export interface PriceItem {
  id: number;
  price: string;
  duration: string;
}

export interface PriceCategory {
  id: number;
  title: string;
  columns: {
    first: string;
    second: string;
    firstSub?: string;
    secondSub?: string;
  };
  items: PriceItem[];
}

export const services: Service[] = [
  {
    id: 1,
    title: "service.standard.title",
    description: "service.standard.description",
    imageUrl: "/image/site/lavage_standard.png",
    color: "from-secondary to-primary",
  },
  {
    id: 2,
    title: "service.ironing.title",
    description: "service.ironing.description",
    imageUrl: "/image/site/repassage.png",
    color: "from-primary to-secondary",
  },
  {
    id: 3,
    title: "service.drycleaning.title",
    description: "service.drycleaning.description",
    imageUrl: "/image/site/livraison_yessal.png",
    color: "from-secondary to-primary",
  },
];


export const features: Feature[] = [
  {
    id: 1,
    icon: "medal",
    title: "feature.quality.title",
    description: "feature.quality.description"
  },
  {
    id: 2,
    icon: "clock",
    title: "feature.speed.title",
    description: "feature.speed.description"
  },
  {
    id: 3,
    icon: "leaf",
    title: "feature.eco.title",
    description: "feature.eco.description"
  },
  {
    id: 4,
    icon: "money-bill-wave",
    title: "feature.price.title",
    description: "feature.price.description"
  }
];

export const priceCategories: PriceCategory[] = [
  {
    id: 3,
    title: "pricing.ironing.title",
    columns: {
      first: "Prix / Kg",
      second: "Délai",
      secondSub: "(Lavage compris)"
    },
    items: [
      { id: 1, price: "500 FCFA", duration: "6h" }
    ]
  },
  {
    id: 4,
    title: "pricing.delivery.title",
    columns: {
      first: "Prix",
      second: "DELAI",
      secondSub: "(Lavage et repassage compris)"
    },
    items: [
      { id: 1, price: "1 000 FCFA", duration: "8h" }
    ]
  }
];

