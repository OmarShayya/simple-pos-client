export type StationType = "pc" | "playstation";

export const STATION_TYPE_LABEL: Record<StationType, string> = {
  pc: "PC",
  playstation: "PlayStation",
};

export type ReservationStatus = "confirmed" | "checked_in" | "cancelled" | "no_show";
export type ReservationSource = "website" | "pos";

export interface ReservationStation {
  id: string;
  pcNumber?: string;
  name?: string;
  type?: StationType;
  status?: string;
}

export interface Reservation {
  id: string;
  code: string;
  type: StationType;
  status: ReservationStatus;
  source: ReservationSource;
  stations: ReservationStation[];
  startTime: string;
  endTime: string;
  durationMinutes: number;
  customerName: string;
  /** E.164 ("+96170123456"). */
  customerPhone: string;
  /** ISO-2 country of the phone ("LB"). */
  phoneCountry?: string;
  /** Linked customer record (auto-created/linked by phone). */
  customerId?: string | null;
  customerEmail?: string;
  notes?: string;
  estimatedCost: { usd: number; lbp: number };
  createdBy?: { id: string; name: string };
  checkedInAt?: string;
  sessions: string[];
  cancelledAt?: string;
  cancelledBy?: "customer" | "staff";
  cancelReason?: string;
  noShowAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpcomingReservation {
  id: string;
  code: string;
  customerName: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
}

export interface DaySchedule {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  closed: boolean;
  /** "HH:mm" */
  open: string;
  /** "HH:mm" — at or before `open` means the next morning */
  close: string;
}

export interface ReservationSettings {
  enabled: boolean;
  timezone: string;
  schedule: DaySchedule[];
  slotMinutes: 15 | 30 | 60;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  maxAdvanceDays: number;
  minLeadMinutes: number;
  noShowGraceMinutes: number;
  bufferMinutes: number;
  maxStationsPerBooking: number;
  bookableTypes: StationType[];
  updatedAt?: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  label: string;
  endLabel: string;
  nextDay: boolean;
  status: "available" | "full" | "past";
  availableCount: number;
  availableStationIds: string[];
}

export interface Availability {
  date: string;
  type: StationType;
  durationMinutes: number;
  timezone: string;
  open: string;
  close: string;
  closed: boolean;
  enabled: boolean;
  typeEnabled: boolean;
  stations: {
    id: string;
    pcNumber: string;
    name: string;
    type: StationType;
    location?: string;
    hourlyRate: { usd: number; lbp: number };
  }[];
  slots: AvailabilitySlot[];
}

export interface CreateReservationPayload {
  type: StationType;
  start: string;
  durationMinutes: number;
  stationIds?: string[];
  stationCount?: number;
  customerName: string;
  /** E.164 or a national number (+ `phoneCountry`). */
  customerPhone: string;
  phoneCountry?: string;
  customerEmail?: string;
  notes?: string;
}

export type UpdateReservationPayload = Partial<
  Pick<CreateReservationPayload, "start" | "durationMinutes" | "stationIds" | "customerName" | "customerPhone" | "phoneCountry" | "customerEmail" | "notes">
>;
