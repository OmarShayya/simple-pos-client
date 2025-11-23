export enum PCStatus {
  AVAILABLE = "available",
  OCCUPIED = "occupied",
  MAINTENANCE = "maintenance",
  RESERVED = "reserved",
}

export enum SessionStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum SessionPaymentStatus {
  UNPAID = "unpaid",
  PAID = "paid",
  PARTIAL = "partial",
}

export interface PC {
  id: string;
  pcNumber: string;
  name: string;
  status: PCStatus;
  hourlyRate: {
    usd: number;
    lbp: number;
  };
  specifications?: {
    cpu?: string;
    gpu?: string;
    ram?: string;
    monitor?: string;
  };
  location?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface GamingSession {
  id: string;
  sessionNumber: string;
  pc: {
    id: string;
    pcNumber: string;
    name: string;
    status?: PCStatus;
  };
  customer?: {
    id: string;
    name: string;
    phone?: string;
  } | null;
  customerName: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  currentDuration?: number;
  hourlyRate: {
    usd: number;
    lbp: number;
  };
  totalCost?: {
    usd: number;
    lbp: number;
  };
  currentCost?: {
    usd: number;
    lbp: number;
  };
  status: SessionStatus;
  paymentStatus: SessionPaymentStatus;
  sale?: {
    id: string;
    invoiceNumber: string;
  };
  startedBy: {
    name: string;
  };
  endedBy?: {
    name: string;
  };
  notes?: string;
  createdAt: string;
}
