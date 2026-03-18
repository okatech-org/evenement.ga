import type {
  Event as PrismaEvent,
  EventTheme as PrismaEventTheme,
  EventModule as PrismaEventModule,
  Guest as PrismaGuest,
  RSVP as PrismaRSVP,
  QRScan as PrismaQRScan,
  ChatMessage as PrismaChatMessage,
  Notification as PrismaNotification,
  User as PrismaUser,
  SystemLog as PrismaSystemLog,
  GlobalConfig as PrismaGlobalConfig,
  AbuseReport as PrismaAbuseReport,
} from "@prisma/client";

// ─── Re-export Prisma types ───────────────────────────────
export type User = PrismaUser;
export type Event = PrismaEvent;
export type EventTheme = PrismaEventTheme;
export type EventModule = PrismaEventModule;
export type Guest = PrismaGuest;
export type RSVP = PrismaRSVP;
export type QRScan = PrismaQRScan;
export type ChatMessage = PrismaChatMessage;
export type Notification = PrismaNotification;
export type SystemLog = PrismaSystemLog;
export type GlobalConfig = PrismaGlobalConfig;
export type AbuseReport = PrismaAbuseReport;

// ─── Re-export Prisma enums ───────────────────────────────
export {
  Role,
  Plan,
  EventType,
  EventStatus,
  Visibility,
  GuestStatus,
  ModuleType,
  ScanStatus,
  MessageType,
  LogLevel,
  ReportStatus,
} from "@prisma/client";

// ─── Custom Types ─────────────────────────────────────────

export interface EffectConfig {
  themePreset: string;
  entryEffect: string;
  ambientEffect: string | null;
  ambientIntensity: number;
  scrollReveal: string;
  cursor: string | null;
  soundEnabled: boolean;
  soundUrl: string | null;
  reducedMotionFallback: string;
  colorPalette: ColorPalette;
  fonts: FontConfig;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  surface?: string;
  muted?: string;
  border?: string;
}

export interface FontConfig {
  display: string;
  body: string;
}

export interface ThemeConfig {
  id: string;
  label: string;
  eventTypes: string[];
  palette: ColorPalette;
  fonts: FontConfig;
  entryEffect: string;
  ambientEffect: string | null;
  ambientIntensity: number;
  scrollReveal: string;
  cursor: string | null;
  soundEnabled: boolean;
  description: string;
  keywords: string[];
}

export interface ModuleConfig {
  id: string;
  type: string;
  active: boolean;
  order: number;
  config: Record<string, unknown>;
}

export interface ScanResult {
  status: "VALID" | "ALREADY_SCANNED" | "INVALID" | "EXPIRED";
  guest?: {
    id: string;
    firstName: string;
    lastName: string;
    adultCount: number;
    childrenCount: number;
    menuChoice: string | null;
  };
  scanCount?: number;
  firstScanAt?: Date;
  message?: string;
}

export interface EffectDef {
  id: string;
  label: string;
  cssFile: string | null;
  jsModule: string | null;
  weight: "css-only" | "light" | "medium";
  reducedMotionFallback: string;
  planRequired: string;
}

// ─── Event with Relations ─────────────────────────────────

export interface EventWithRelations extends Event {
  theme: EventTheme | null;
  modules: EventModule[];
  user: User;
  _count?: {
    guests: number;
  };
}

export interface EventPublic {
  slug: string;
  title: string;
  type: string;
  date: Date;
  endDate: Date | null;
  location: string | null;
  description: string | null;
  visibility: string;
  theme: EventTheme | null;
  modules: EventModule[];
}

export interface GuestWithRSVP extends Guest {
  rsvp: RSVP | null;
}

// ─── API Response Types ───────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
