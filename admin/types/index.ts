import { AdminRole, AdminPermission } from '@/lib/permissions';

export type { AdminRole, AdminPermission };

export type ContentState = 'draft' | 'review' | 'published' | 'scheduled';
export type UserStatus = 'healthy' | 'watch' | 'restricted';
export type ModerationStatus = 'new' | 'investigating' | 'escalated' | 'resolved';
export type NotificationStatus = 'draft' | 'scheduled' | 'sent';
export type PlatformTarget = 'web' | 'android' | 'ios';

export interface AdminSession {
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: AdminPermission[];
  status: 'active' | 'disabled';
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  language: string;
  artwork: string;
  audioUrl: string;
  duration: number;
  popularityScore: number;
  releaseDate: string;
  explicit: boolean;
  state: ContentState;
  regions: string[];
  broken: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  curator: string;
  category: string;
  songs: string[];
  songCount: number;
  trendingScore: number;
  publishAt: string;
  homepageSlot: string | null;
  state: ContentState;
  imageUrl: string;
  isPublic: boolean;
  listeners: number;
  createdAt: string;
  updatedAt: string;
}

export interface Artist {
  id: string;
  name: string;
  bio: string;
  imageUrl: string;
  verified: boolean;
  monthlyListeners: number;
  topMarket: string;
  genres: string[];
  discographyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  imageUrl: string;
  plan: 'free' | 'premium';
  country: string;
  language: string;
  reports: number;
  status: UserStatus;
  lastActiveAt: string;
  createdAt: string;
}

export interface ModerationCase {
  id: string;
  entity: string;
  entityType: 'song' | 'playlist' | 'user' | 'comment';
  reason: string;
  reporterType: string;
  severity: 'low' | 'medium' | 'high';
  status: ModerationStatus;
  assignedTo: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout: number;
  targets: PlatformTarget[];
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  placement: string;
  state: ContentState;
  audience: string;
  startAt: string;
  endAt: string;
  accent: string;
  clickUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCampaign {
  id: string;
  title: string;
  body: string;
  segment: string;
  channel: 'push' | 'in-app';
  status: NotificationStatus;
  scheduledAt: string;
  sentAt: string | null;
  recipients: number;
  opened: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsMetric {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface ChartDataPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface AuditLog {
  id: string;
  actor: string;
  actorRole: AdminRole;
  action: string;
  entity: string;
  entityType: string;
  changes: Record<string, any>;
  timestamp: string;
}

export interface InternalNote {
  id: string;
  author: string;
  scope: string;
  body: string;
  createdAt: string;
}

export interface SearchWeight {
  id: string;
  label: string;
  value: number;
  hint: string;
}

export interface ImportJob {
  id: string;
  label: string;
  source: string;
  progress: number;
  status: 'queued' | 'processing' | 'blocked' | 'completed';
  totalItems: number;
  processedItems: number;
  failedItems: number;
  createdAt: string;
  updatedAt: string;
}
