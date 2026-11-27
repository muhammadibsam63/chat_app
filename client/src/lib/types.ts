/** Domain types mirror the API payloads (snake_case columns, normalised JSON). */

export interface ApiErrorShape {
  message: string;
  status: number;
  details?: unknown;
}

export interface Profile {
  name: string;
  brand: string;
  title: string;
  tagline: string;
  location: string;
  email: string;
  phone?: string;
  availability: string;
  bio: string;
  shortBio: string;
  interests: string[];
  photo?: string;
  resumeUrl?: string;
}

export interface Socials {
  github?: string;
  linkedin?: string;
  x?: string;
  instagram?: string;
  email?: string;
}

export interface SeoSettings {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  twitterHandle?: string;
}

export interface ContactSettings {
  heading: string;
  blurb: string;
  email: string;
  location: string;
  responseTime: string;
}

export interface FooterSettings {
  note: string;
  copyright: string;
}

export interface SiteSettings {
  profile: Profile;
  socials: Socials;
  seo: SeoSettings;
  contact: ContactSettings;
  footer: FooterSettings;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  description: string;
  category: string;
  technologies: string[];
  gallery: string[];
  github_url: string;
  live_url: string;
  featured: boolean;
  published: boolean;
  year: string;
  role: string;
  duration: string;
  seo_title: string;
  seo_description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CaseStudy {
  id: string;
  slug: string;
  project_slug: string;
  title: string;
  subtitle: string;
  problem: string;
  approach: string;
  outcome: string;
  metrics: Array<{ label: string; value: string }>;
  published: boolean;
  sort_order: number;
  created_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  level: number;
  description: string;
  featured: boolean;
  sort_order: number;
}

export interface Experience {
  id: string;
  position: string;
  organization: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
  technologies: string[];
  sort_order: number;
}

export interface Education {
  id: string;
  institution: string;
  qualification: string;
  field: string;
  location: string;
  start_date: string;
  end_date: string;
  description: string;
  sort_order: number;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issued_at: string;
  credential_url: string;
  description: string;
  sort_order: number;
}

export interface Achievement {
  id: string;
  title: string;
  organization: string;
  achieved_at: string;
  description: string;
  sort_order: number;
}

export interface Service {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  features: string[];
  icon: string;
  published: boolean;
  sort_order: number;
}

export interface Testimonial {
  id: string;
  author: string;
  role: string;
  company: string;
  quote: string;
  avatar: string;
  published: boolean;
  sort_order: number;
  created_at: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  cover_image: string;
  category: string;
  tags: string[];
  published: boolean;
  published_at: string | null;
  read_minutes: number;
  views: number;
  seo_title?: string;
  seo_description?: string;
  created_at: string;
  updated_at?: string;
}

export interface ResumeRecord {
  id: string;
  original_name: string;
  url: string;
  size: number;
  mime_type: string;
  created_at: string;
}

export interface Stats {
  projects: number;
  caseStudies: number;
  skills: number;
  posts: number;
  services: number;
  testimonials: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  role: string;
  role_label?: string;
  permissions: string[];
  is_active?: boolean;
  last_login_at?: string | null;
  created_at?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'archived';
  email_status: string;
  ip?: string;
  created_at: string;
}

export interface MediaAsset {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  mime_type: string;
  size: number;
  kind: string;
  created_at: string;
}

export interface ActivityEntry {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  user_name?: string | null;
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  created_at: string;
}

export interface AdminOverview {
  counts: Record<string, number>;
  recentMessages: ContactMessage[];
  recentActivity: ActivityEntry[];
  notifications: NotificationRecord[];
  storage: { bytes: number; files: number };
  analytics: { views7d: number; views30d: number; topPaths: Array<{ path: string; views: number }> };
  system: { database: string; uptimeSeconds: number; environment: string; version: string };
}

export interface AnalyticsPayload {
  days: number;
  views: Array<{ day: string; total: number }>;
  topPaths: Array<{ path: string; total: number }>;
  messages: Array<{ day: string; total: number }>;
  totals: { views: number; viewsWindow: number; messages: number; sessions: number };
}
