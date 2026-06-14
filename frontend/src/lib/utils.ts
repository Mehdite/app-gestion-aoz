import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: string | Date | null | undefined, fmt = 'dd/MM/yyyy') => {
  if (!date) return '—';
  return format(new Date(date), fmt, { locale: fr });
};

export const formatDateTime = (date: string | Date | null | undefined) => {
  if (!date) return '—';
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr });
};

export const timeAgo = (date: string | Date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
};

export const formatCurrency = (amount: number | string | null | undefined, currency = 'MAD') => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount));
};

export const formatNumber = (n: number | null | undefined) => {
  if (n == null) return '0';
  return new Intl.NumberFormat('fr-MA').format(n);
};

export const clientName = (client: any): string => {
  if (!client) return '—';
  if (client.type === 'INDIVIDUAL' || client.firstName) {
    return `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim();
  }
  return client.companyName ?? '—';
};

export const statusLabels: Record<string, string> = {
  // Contract
  ACTIVE: 'Actif',
  EXPIRED: 'Expiré',
  SUSPENDED: 'Suspendu',
  CANCELLED: 'Annulé',
  PENDING_RENEWAL: 'En renouvellement',
  // Client
  INACTIVE: 'Inactif',
  ARCHIVED: 'Archivé',
  // Quote
  DRAFT: 'Brouillon',
  SENT: 'Envoyé',
  ACCEPTED: 'Accepté',
  REJECTED: 'Rejeté',
  CONVERTED: 'Converti',
  // Claim
  DECLARED: 'Déclaré',
  IN_PROGRESS: 'En cours',
  EXPERTISE: 'Expertisé',
  CLOSED: 'Clôturé',
  // Prospect
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  QUOTE_SENT: 'Devis envoyé',
  WON: 'Gagné',
  LOST: 'Perdu',
  // Payment
  PENDING: 'En attente',
  PAID: 'Payé',
  OVERDUE: 'En retard',
  REFUNDED: 'Remboursé',
};

export const insuranceTypeLabels: Record<string, string> = {
  AUTO: 'Automobile',
  MOTO: 'Moto',
  HOME: 'Habitation',
  HEALTH: 'Santé',
  PROFESSIONAL: 'Multirisque Pro',
  DECENNIAL: 'Décennale',
  TRANSPORT: 'Transport',
  LIFE: 'Vie',
  OTHER: 'Autre',
};

export const statusColor: Record<string, string> = {
  ACTIVE: 'badge-active',
  PAID: 'badge-active',
  WON: 'badge-active',
  CLOSED: 'badge-inactive',
  INACTIVE: 'badge-inactive',
  ARCHIVED: 'badge-inactive',
  LOST: 'badge-inactive',
  EXPIRED: 'badge-danger',
  CANCELLED: 'badge-danger',
  REJECTED: 'badge-danger',
  OVERDUE: 'badge-danger',
  DRAFT: 'badge-info',
  NEW: 'badge-info',
  PENDING: 'badge-warning',
  IN_PROGRESS: 'badge-warning',
  EXPERTISE: 'badge-warning',
  DECLARED: 'badge-warning',
  SENT: 'badge-info',
  CONTACTED: 'badge-info',
  QUOTE_SENT: 'badge-info',
  CONVERTED: 'badge-active',
};
