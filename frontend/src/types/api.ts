export type Role = 'CUSTOMER' | 'SUPPORT_AGENT' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string | null;
  address: string | null;
  role: Role;
  status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
  mfaEnabled: boolean;
  profilePhotoUrl: string | null;
  preferences: Record<string, unknown>;
  createdAt: string;
}

export interface Account {
  id: string;
  accountNumber: string;
  maskedAccountNumber: string;
  accountType: 'SAVINGS' | 'CURRENT' | 'FIXED_DEPOSIT';
  currency: string;
  availableBalance: number;
  currentBalance: number;
  interestRate: number;
  status: 'ACTIVE' | 'DORMANT' | 'CLOSED';
  openedAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'TRANSFER' | 'PAYMENT' | 'DEPOSIT' | 'WITHDRAWAL' | 'FEE' | 'INTEREST';
  description: string;
  amount: number;
  direction: 'DEBIT' | 'CREDIT';
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REVERSED';
  counterpartyName: string | null;
  referenceNumber: string;
  balanceAfter: number | null;
  createdAt: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  nickname: string | null;
  accountNumber: string;
  maskedAccountNumber: string;
  bankName: string;
  ifsc: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Card {
  id: string;
  accountId: string;
  cardType: 'DEBIT' | 'CREDIT';
  maskedCardNumber: string;
  cardHolderName: string;
  expiryMonth: number;
  expiryYear: number;
  status: 'ACTIVE' | 'BLOCKED' | 'FROZEN';
  creditLimit: number | null;
  availableLimit: number | null;
  onlineEnabled: boolean;
  internationalEnabled: boolean;
  hasPinSet: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'SECURITY';
  isRead: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  accountId: string;
  category: string;
  billerName: string;
  consumerNumber: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  transactionId: string | null;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface ChaosRule {
  routeKey: string;
  enabled: boolean;
  delayMs: number;
  failTimes: number;
  failStatusCode: number;
  simulateTimeout: boolean;
  hitCount: number;
}

export interface Challenge {
  id: number;
  title: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  description: string;
  startPage: string;
  expectedBehavior: string;
}

export interface AdminActivityEvent {
  id: string;
  type: 'LOGIN' | 'TRANSACTION' | 'USER' | 'BENEFICIARY' | 'CARD' | 'CHAOS' | 'SECURITY';
  message: string;
  meta: Record<string, unknown>;
  createdAt: string;
}
