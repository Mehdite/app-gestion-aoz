// String constants replacing Prisma enums (SQLite compatibility)
export const Role = { ADMIN: 'ADMIN', MANAGER: 'MANAGER', ACCOUNTANT: 'ACCOUNTANT', AGENT: 'AGENT' } as const;
export type Role = typeof Role[keyof typeof Role];

export const ClientType = { INDIVIDUAL: 'INDIVIDUAL', COMPANY: 'COMPANY' } as const;
export type ClientType = typeof ClientType[keyof typeof ClientType];

export const ClientStatus = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', ARCHIVED: 'ARCHIVED' } as const;
export type ClientStatus = typeof ClientStatus[keyof typeof ClientStatus];

export const ProspectStatus = { NEW: 'NEW', CONTACTED: 'CONTACTED', QUOTE_SENT: 'QUOTE_SENT', WON: 'WON', LOST: 'LOST' } as const;
export type ProspectStatus = typeof ProspectStatus[keyof typeof ProspectStatus];

export const QuoteStatus = { DRAFT: 'DRAFT', SENT: 'SENT', ACCEPTED: 'ACCEPTED', REJECTED: 'REJECTED', EXPIRED: 'EXPIRED', CONVERTED: 'CONVERTED' } as const;
export type QuoteStatus = typeof QuoteStatus[keyof typeof QuoteStatus];

export const InsuranceType = { AUTO: 'AUTO', MOTO: 'MOTO', HOME: 'HOME', HEALTH: 'HEALTH', PROFESSIONAL: 'PROFESSIONAL', DECENNIAL: 'DECENNIAL', TRANSPORT: 'TRANSPORT', LIFE: 'LIFE', OTHER: 'OTHER' } as const;
export type InsuranceType = typeof InsuranceType[keyof typeof InsuranceType];

export const ContractStatus = { ACTIVE: 'ACTIVE', EXPIRED: 'EXPIRED', SUSPENDED: 'SUSPENDED', CANCELLED: 'CANCELLED', PENDING_RENEWAL: 'PENDING_RENEWAL' } as const;
export type ContractStatus = typeof ContractStatus[keyof typeof ContractStatus];

export const PaymentFrequency = { MONTHLY: 'MONTHLY', QUARTERLY: 'QUARTERLY', SEMI_ANNUAL: 'SEMI_ANNUAL', ANNUAL: 'ANNUAL' } as const;
export type PaymentFrequency = typeof PaymentFrequency[keyof typeof PaymentFrequency];

export const ClaimStatus = { DECLARED: 'DECLARED', IN_PROGRESS: 'IN_PROGRESS', EXPERTISE: 'EXPERTISE', CLOSED: 'CLOSED', REJECTED: 'REJECTED' } as const;
export type ClaimStatus = typeof ClaimStatus[keyof typeof ClaimStatus];

export const PaymentStatus = { PENDING: 'PENDING', PAID: 'PAID', OVERDUE: 'OVERDUE', CANCELLED: 'CANCELLED', REFUNDED: 'REFUNDED' } as const;
export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

export const AccountingType = { INCOME: 'INCOME', EXPENSE: 'EXPENSE' } as const;
export type AccountingType = typeof AccountingType[keyof typeof AccountingType];

export const DocumentType = { CONTRACT: 'CONTRACT', QUOTE: 'QUOTE', CIN: 'CIN', CARTE_GRISE: 'CARTE_GRISE', ATTESTATION: 'ATTESTATION', EXPERTISE_REPORT: 'EXPERTISE_REPORT', INVOICE: 'INVOICE', OTHER: 'OTHER' } as const;
export type DocumentType = typeof DocumentType[keyof typeof DocumentType];

export const TaskStatus = { TODO: 'TODO', IN_PROGRESS: 'IN_PROGRESS', DONE: 'DONE', CANCELLED: 'CANCELLED' } as const;
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export const NotificationChannel = { EMAIL: 'EMAIL', SMS: 'SMS', WHATSAPP: 'WHATSAPP', PUSH: 'PUSH' } as const;
export type NotificationChannel = typeof NotificationChannel[keyof typeof NotificationChannel];
