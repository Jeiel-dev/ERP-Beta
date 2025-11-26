export enum UserRole {
  MANAGER = 'MANAGER',
  SALESPERSON = 'SALESPERSON',
  CASHIER = 'CASHIER'
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  active: boolean;
  password?: string; // Only used for custom auth check
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  unit: string;
  active: boolean;
}

export enum SaleStatus {
  PENDING = 'PENDING',     // Created by Salesperson, waiting for Cashier
  COMPLETED = 'COMPLETED', // Paid and Stock updated
  CANCELLED = 'CANCELLED', // Cancelled by Manager
  BUDGET = 'BUDGET'        // Saved as budget, not visible to cashier
}

export interface SaleItem {
  internalId?: string; // Frontend only: Unique ID for React rendering list keys
  productId: string;
  productCode?: string; 
  productName: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number; 
  total: number;
  unit?: string;
  observation?: string; 
}

export interface PaymentDetails {
  cash: number;
  debit: number;
  credit: number;
  ticket: number;
  pix: number;
  transfer: number;
  boleto: number;
  cheque: number;
  creditStore: number;
}

export interface Sale {
  id: string;
  sellerId: string;
  sellerName: string;
  cashierId?: string;
  cashierName?: string;
  items: SaleItem[];
  totalValue: number;
  status: SaleStatus;
  createdAt: string; 
  finishedAt?: string; 
  clientName?: string;
  discount?: number;
  
  // POS Fields
  freight?: number;
  otherCosts?: number;
  payments?: PaymentDetails;
  installments?: number;
  observation?: string;
  deliveryAddress?: string;
  purchaseOrder?: string;
  customerEmail?: string;
  cashierIdent?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface UnitConfig {
  code: string;
  name: string;
  active: boolean;
}