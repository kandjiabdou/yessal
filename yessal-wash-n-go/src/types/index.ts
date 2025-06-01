
export type ServiceType = "basic" | "detailed" | "standard" | "express";

export type UserSubscription = "standard" | "premium" | null;

export interface Location {
  latitude: number | null;
  longitude: number | null;
  address?: string;
  useAsDefault?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  loyaltyPoints: number;
  totalWashes: number;
  subscription?: UserSubscription;
  isStudent?: boolean;
  monthlyWashedKg?: number;
  defaultLocation?: Location;
}

export interface PickupRequest {
  id: string;
  trackingCode: string;
  userId: string;
  pickupAddress: string;
  pickupLocation?: Location;
  pickupTime: string;
  estimatedDeliveryTime: string;
  serviceType: ServiceType;
  hasIroning: boolean;
  hasExpress: boolean;
  hasDrying?: boolean;
  weight?: number;
  status: "pending" | "confirmed" | "on-the-way" | "picked-up" | "processing" | "out-for-delivery" | "delivered" | "cancelled";
  price: number;
  notes?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  totalWeight: number;
  machines: Machine[];
  hasIroning: boolean;
  hasDelivery: boolean;
  hasDrying?: boolean;
  discounts: Discount[];
  totalPrice: number;
  location: string;
  status: "completed" | "pending" | "cancelled";
  serviceType?: ServiceType;
}

export interface Machine {
  id: string;
  name: string;
  capacity: number;
}

export interface Discount {
  id: string;
  name: string;
  percentage: number;
}

export interface Tarif {
  id: string;
  name: string;
  description: string;
  price: number;
  isPromotion: boolean;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  phone: string;
  openingHours: string;
}
