
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-SN').format(value);
}

export function formatDate(dateString: string): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return new Date(dateString).toLocaleDateString('fr-FR', options);
}

export function formatShortDate(dateString: string): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };
  
  return new Date(dateString).toLocaleDateString('fr-FR', options);
}

export function getStatusProgress(status: string): number {
  const statuses = [
    "pending",
    "confirmed",
    "on-the-way",
    "picked-up",
    "processing", 
    "out-for-delivery",
    "delivered"
  ];
  
  // Conversion des statuts de collecte aux nouveaux statuts
  const statusMapping: Record<string, number> = {
    "pending": 0,
    "confirmed": 20,
    "on-the-way": 40,
    "picked-up": 60,
    "processing": 70,
    "out-for-delivery": 80,
    "delivered": 100
  };
  
  return statusMapping[status] || 0;
}

// New utility function for webview section handling
export function constructWebsiteUrl(baseUrl: string = "https://yessal.sn", section?: string | null): string {
  if (!section) return baseUrl;
  return `${baseUrl}/#${section}`;
}
