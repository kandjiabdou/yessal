
import { PickupRequest, ServiceType, Transaction, User, Tarif, Site } from "@/types";

export const mockUser = {
  id: "USR123456",
  name: "Marie Diallo",
  email: "marie@example.com",
  phone: "+221 77 123 45 67",
  address: "123 Rue des Almadies, Dakar",
  loyaltyPoints: 17,
  totalWashes: 23,
  subscription: "premium", // 'standard', 'premium', null
  isStudent: false,
  monthlyWashedKg: 35,
  defaultLocation: {
    latitude: 14.7645042,
    longitude: -17.3660286,
    address: "123 Rue des Almadies, Dakar",
    useAsDefault: true
  }
};

// Mock transactions
export const mockTransactions: Transaction[] = [
  {
    id: "t1",
    userId: "u1",
    date: "2025-04-20T14:30:00Z",
    totalWeight: 5.2,
    machines: [
      { id: "m1", name: "Machine à laver 10kg", capacity: 10 }
    ],
    hasIroning: true,
    hasDelivery: false,
    discounts: [
      { id: "d1", name: "Fidélité", percentage: 5 }
    ],
    totalPrice: 3800,
    location: "Yessal Centre-ville, Thiès",
    status: "completed"
  },
  {
    id: "t2",
    userId: "u1",
    date: "2025-04-15T10:15:00Z",
    totalWeight: 3.8,
    machines: [
      { id: "m2", name: "Machine à laver 7kg", capacity: 7 }
    ],
    hasIroning: false,
    hasDelivery: true,
    discounts: [],
    totalPrice: 2900,
    location: "Yessal Nguinth, Thiès",
    status: "completed"
  },
  {
    id: "t3",
    userId: "u1",
    date: "2025-04-05T16:45:00Z",
    totalWeight: 8.3,
    machines: [
      { id: "m1", name: "Machine à laver 10kg", capacity: 10 }
    ],
    hasIroning: true,
    hasDelivery: true,
    discounts: [
      { id: "d2", name: "Promotion du mois", percentage: 10 }
    ],
    totalPrice: 6200,
    location: "Yessal Centre-ville, Thiès",
    status: "completed"
  }
];

// Mock pickup requests
export const mockPickupRequests: PickupRequest[] = [
  {
    id: "p1",
    userId: "u1",
    status: "delivered",
    pickupAddress: "123 Rue Principale, Thiès",
    pickupTime: "2025-04-22T09:30:00Z",
    estimatedDeliveryTime: "2025-04-23T15:00:00Z",
    notes: "Sonnez à l'appartement 3",
    trackingCode: "YSL-P12345",
    hasIroning: true,
    hasExpress: false,
    serviceType: "standard",
    price: 1000
  },
  {
    id: "p2",
    userId: "u1",
    status: "on-the-way",
    pickupAddress: "123 Rue Principale, Thiès",
    pickupTime: "2025-04-28T10:00:00Z",
    estimatedDeliveryTime: "2025-04-29T16:00:00Z",
    notes: "",
    trackingCode: "YSL-P67890",
    hasIroning: false,
    hasExpress: true,
    serviceType: "express",
    price: 2000
  }
];

// Mock tarifs
export const mockTarifs: Tarif[] = [
  {
    id: "t1",
    name: "Lavage Standard",
    description: "Lavage jusqu'à 6kg",
    price: 3000,
    isPromotion: false
  },
  {
    id: "t2",
    name: "Lavage Grande Capacité",
    description: "Lavage jusqu'à 10kg",
    price: 5000,
    isPromotion: false
  },
  {
    id: "t3",
    name: "Option Repassage",
    description: "Service de repassage",
    price: 1500,
    isPromotion: false
  },
  {
    id: "t4",
    name: "Promotion Étudiants",
    description: "10% de réduction avec carte étudiant",
    price: 0,
    isPromotion: true
  },
  {
    id: "t5",
    name: "10ème Lavage Gratuit",
    description: "Lavage de 6kg gratuit après 9 lavages",
    price: 0,
    isPromotion: true
  }
];

// Mock sites
export const mockSites: Site[] = [
  {
    id: "s1",
    name: "Yessal Centre-ville",
    address: "45 Avenue Lamine Gueye, Thiès",
    phone: "+221 33 456 7890",
    openingHours: "7h-22h tous les jours"
  },
  {
    id: "s2",
    name: "Yessal Nguinth",
    address: "128 Rue Abdou Diouf, Thiès",
    phone: "+221 33 567 8901",
    openingHours: "7h-22h tous les jours"
  }
];

// Mock users for test profiles
export const mockUsers: Record<string, User> = {
  "premium@yessal.sn": {
    id: "usr-premium",
    name: "Utilisateur Premium",
    email: "premium@yessal.sn",
    phone: "+221 77 000 0001",
    address: "Dakar Premium Residence",
    loyaltyPoints: 25,
    totalWashes: 12,
    subscription: "premium",
    isStudent: false,
    monthlyWashedKg: 32,
    defaultLocation: {
      latitude: 14.758,
      longitude: -17.366,
      address: "Dakar Premium Residence",
      useAsDefault: true
    }
  },
  "etudiant@yessal.sn": {
    id: "usr-etudiant",
    name: "Utilisateur Étudiant",
    email: "etudiant@yessal.sn",
    phone: "+221 77 000 0002",
    address: "Résidence Universitaire UCAD",
    loyaltyPoints: 8,
    totalWashes: 5,
    subscription: null,
    isStudent: true,
    monthlyWashedKg: 15,
    defaultLocation: {
      latitude: 14.692,
      longitude: -17.455,
      address: "Résidence Universitaire UCAD",
      useAsDefault: true
    }
  },
  "normale@yessal.sn": {
    id: "usr-normal",
    name: "Utilisateur Standard",
    email: "normale@yessal.sn",
    phone: "+221 77 000 0003",
    address: "123 Rue Normale, Dakar",
    loyaltyPoints: 5,
    totalWashes: 3,
    subscription: null,
    isStudent: false,
    monthlyWashedKg: 12,
    defaultLocation: {
      latitude: 14.715,
      longitude: -17.408,
      address: "123 Rue Normale, Dakar",
      useAsDefault: true
    }
  },
  "premium-etudiant@yessal.sn": {
    id: "usr-premium-etudiant",
    name: "Étudiant Premium",
    email: "premium-etudiant@yessal.sn",
    phone: "+221 77 000 0004",
    address: "456 Avenue des Étudiants VIP, Dakar",
    loyaltyPoints: 15,
    totalWashes: 8,
    subscription: "premium",
    isStudent: true,
    monthlyWashedKg: 28,
    defaultLocation: {
      latitude: 14.735,
      longitude: -17.388,
      address: "456 Avenue des Étudiants VIP, Dakar",
      useAsDefault: true
    }
  }
};
