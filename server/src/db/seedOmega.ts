import crypto from 'node:crypto';
import { db } from './index';

/**
 * Seeds the nine owner-supplied projects.
 *
 * Inserted per slug rather than only-when-empty, so the three previously
 * verified projects (LotteryChain, TrustChain, this portfolio) are preserved
 * and owner edits are never overwritten on restart.
 *
 * Copy policy: descriptions state the domain and scope implied by each project
 * name only. No metrics, clients, awards or certifications are claimed here —
 * those stay empty until Muhammad authors them in the admin studio.
 */
type Row = {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  category: string;
  technologies: string[];
  featured?: boolean;
  role?: string;
};

const PROJECTS: Row[] = [
  {
    slug: 'hcm-lite',
    title: 'HCM Lite',
    subtitle: 'Human capital management, stripped to what teams actually use',
    summary:
      'A lightweight human capital management interface: employee records, leave requests and attendance in one place, without the weight of an enterprise suite.',
    category: 'Full-Stack',
    technologies: ['React', 'Node.js', 'REST APIs'],
    featured: true,
    role: 'Full-stack development',
  },
  {
    slug: 'skillforge-pro',
    title: 'SkillForge Pro',
    subtitle: 'A structured environment for tracking skill development',
    summary:
      'A learning workspace that organises skills, progress and practice into a single structured view instead of scattered notes and bookmarks.',
    category: 'Full-Stack',
    technologies: ['React', 'JavaScript', 'Firebase'],
    role: 'Full-stack development',
  },
  {
    slug: 'aerotrip',
    title: 'AeroTrip',
    subtitle: 'A travel planning interface built around clarity',
    summary:
      'A travel planning front end focused on readable itineraries, destination browsing and a booking flow that stays legible at every step.',
    category: 'Frontend',
    technologies: ['React', 'JavaScript', 'CSS3'],
    role: 'Frontend development',
  },
  {
    slug: '3d-react-game',
    title: '3D React Game',
    subtitle: 'Browser game built with React and WebGL',
    summary:
      'An interactive browser game rendering a three-dimensional scene with React and Three.js, exploring controls, camera behaviour and real-time frame budgets.',
    category: '3D / Interactive',
    technologies: ['React', 'Three.js', 'JavaScript'],
    featured: true,
    role: 'Interactive development',
  },
  {
    slug: 'luxury-stay-hostel',
    title: 'Luxury Stay Hostel',
    subtitle: 'Hospitality site for a premium hostel',
    summary:
      'A hospitality presentation site for a premium hostel: rooms, amenities and enquiry flow, art-directed around a calm, editorial layout.',
    category: 'Frontend',
    technologies: ['Next.js', 'CSS3', 'JavaScript'],
    role: 'Frontend development',
  },
  {
    slug: 'luxora-watches',
    title: 'Luxora Watches',
    subtitle: 'Product-forward storefront for a watch label',
    summary:
      'A storefront concept for a watch label, built around product photography, restrained typography and a direct path from browsing to cart.',
    category: 'E-Commerce',
    technologies: ['React', 'JavaScript', 'CSS3'],
    featured: true,
    role: 'Frontend development',
  },
  {
    slug: 'nova-store',
    title: 'Nova Store',
    subtitle: 'General commerce storefront',
    summary:
      'A general-purpose commerce front end with catalogue browsing, category navigation and a cart flow wired to real state rather than static markup.',
    category: 'E-Commerce',
    technologies: ['React', 'REST APIs', 'JavaScript'],
    role: 'Full-stack development',
  },
  {
    slug: 'nexora',
    title: 'Nexora',
    subtitle: 'Product platform with an application layer',
    summary:
      'A platform-style application combining a marketing surface with an authenticated application area, built to keep public and private concerns separated.',
    category: 'Full-Stack',
    technologies: ['Next.js', 'Node.js', 'REST APIs'],
    role: 'Full-stack development',
  },
  {
    slug: 'maintain-iq',
    title: 'Maintain IQ',
    subtitle: 'Maintenance tracking, built under hackathon pressure',
    summary:
      'A maintenance reporting and tracking concept produced in a hackathon setting: report an issue, track its state, and see the queue at a glance.',
    category: 'Hackathon',
    technologies: ['React', 'Firebase', 'JavaScript'],
    role: 'Hackathon build',
  },
];

function insertProjectIfMissing(row: Row, index: number): void {
  const existing = db.prepare('SELECT id FROM projects WHERE slug = ?').get(row.slug);
  if (existing) return;

  const year = String(new Date().getFullYear());
  const values: Record<string, unknown> = {
    id: crypto.randomUUID(),
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    summary: row.summary,
    description: '',
    category: row.category,
    technologies: JSON.stringify(row.technologies),
    gallery: JSON.stringify([]),
    github_url: '',
    live_url: '',
    featured: row.featured ? 1 : 0,
    published: 1,
    year,
    role: row.role ?? 'Design and development',
    duration: 'Independent build',
    seo_title: `${row.title} — ${row.category} project`,
    seo_description: row.summary.slice(0, 155),
    sort_order: 100 + index,
  };

  const columns = Object.keys(values);
  db.prepare(
    `INSERT INTO projects (${columns.join(', ')}) VALUES (${columns.map((c) => '@' + c).join(', ')})`,
  ).run(values);
}

export function seedOmegaProjects(): void {
  const run = db.transaction(() => {
    PROJECTS.forEach((row, index) => insertProjectIfMissing(row, index));
  });
  run();
}
