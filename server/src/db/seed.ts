import crypto from 'node:crypto';
import { db } from './index';
import { seedOmegaProjects } from './seedOmega';

/**
 * Seeds the ecosystem with verified profile content only.
 *
 * Deliberately empty on first boot: employment history, education,
 * certifications, achievements and testimonials. Those are personal claims
 * and are authored by Muhammad through the admin dashboard instead of being
 * invented by the seed. Every table is seeded only when it is empty, so admin
 * edits are never overwritten on restart.
 */
const PERMISSIONS = [
  ['dashboard:read', 'View the admin overview'],
  ['projects:write', 'Create and edit projects'],
  ['content:write', 'Create and edit site content'],
  ['messages:read', 'Read contact messages'],
  ['messages:write', 'Update and delete contact messages'],
  ['media:write', 'Upload and delete media'],
  ['settings:write', 'Change website and account settings'],
  ['analytics:read', 'Read analytics and activity logs'],
];

const SETTINGS: Record<string, unknown> = {
  profile: {
    name: 'Muhammad Ibsam',
    brand: 'IBSAM®',
    title: 'Full-Stack Web Developer',
    tagline: 'I design and engineer interactive web products that feel inevitable.',
    location: 'Karachi, Pakistan',
    email: '',
    availability: 'Open to full-stack, frontend and Web3 engineering work',
    bio: 'Full-stack web developer based in Karachi, Pakistan. I build fast, accessible and expressive web applications with React, Next.js and Node.js, and I am deep in the blockchain and Web3 ecosystem. My focus is the intersection of engineering rigour and interface craft — real APIs, real data, real motion.',
    heroLines: ['Full-stack engineer', 'Interface craftsman', 'Web3 builder'],
    yearsExperience: '',
    resumeSummary:
      'Full-stack web developer focused on React, Next.js, Node.js and REST APIs, with a strong interest in blockchain and Web3 applications.',
  },
  socials: {
    github: '',
    linkedin: '',
    x: '',
    instagram: '',
    email: '',
  },
  seo: {
    title: 'Muhammad Ibsam — Full-Stack Web Developer',
    description:
      'IBSAM® — full-stack web developer in Karachi, Pakistan. Interactive, high-performance web products built with React, Next.js, Node.js and Web3 technologies.',
    keywords: 'full-stack developer, React, Next.js, Node.js, Web3, Karachi, Pakistan',
    ogImage: '',
  },
  contact: {
    heading: 'Let us build something exact.',
    intro:
      'Tell me about the product, the timeline and the constraint that matters most. I reply to every serious message.',
    responseTime: 'Usually within 2 business days',
  },
  footer: {
    note: 'Designed and engineered in Karachi, Pakistan.',
    copyright: '© ' + new Date().getFullYear() + ' Muhammad Ibsam. All rights reserved.',
  },
};

function insertIfEmpty(table: string, rows: Array<Record<string, unknown>>): void {
  const existing = (db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get() as { total: number }).total;
  if (existing > 0 || rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const statement = db.prepare(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((c) => '@' + c).join(', ')})`,
  );
  const run = db.transaction(() => {
    for (const row of rows) statement.run(row);
  });
  run();
}

export function seedRolesAndPermissions(): void {
  const insertRole = db.prepare('INSERT OR IGNORE INTO roles (name, label) VALUES (?, ?)');
  insertRole.run('ADMIN', 'Administrator');
  insertRole.run('EDITOR', 'Editor');
  insertRole.run('VIEWER', 'Viewer (read-only)');
  const insertPermission = db.prepare('INSERT OR IGNORE INTO permissions (key, description) VALUES (?, ?)');
  for (const [key, description] of PERMISSIONS) insertPermission.run(key, description);

  const adminRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('ADMIN') as { id: number };
  const editorRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('EDITOR') as { id: number };
  const viewerRole = db.prepare('SELECT id FROM roles WHERE name = ?').get('VIEWER') as { id: number };
  const link = db.prepare(
    'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT ?, id FROM permissions WHERE key = ?',
  );
  for (const [key] of PERMISSIONS) link.run(adminRole.id, key);
  for (const key of ['dashboard:read', 'projects:write', 'content:write', 'messages:read', 'media:write', 'analytics:read']) {
    link.run(editorRole.id, key);
  }
  for (const key of ['dashboard:read', 'messages:read', 'analytics:read']) {
    link.run(viewerRole.id, key);
  }
}

export function seedSettings(): void {
  const statement = db.prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(SETTINGS)) statement.run(key, JSON.stringify(value));
}

export function seedContent(): void {
  insertIfEmpty('projects', [
    {
      id: crypto.randomUUID(),
      slug: 'lotterychain',
      title: 'LotteryChain',
      subtitle: 'On-chain lottery with verifiable draw integrity',
      summary:
        'A decentralised lottery application where ticket purchases and the winning draw are recorded on-chain, so the result can be verified by anyone instead of trusted.',
      description: [
        'LotteryChain is a blockchain lottery dApp built to solve a simple trust problem: players should not have to trust the operator to draw fairly.',
        'The application connects a wallet, handles ticket purchase flows with transaction feedback, and resolves the winning entry through a contract-side draw whose result is publicly auditable. The frontend focuses on the moments that usually break in dApps — pending states, rejected transactions and network feedback — so the experience stays legible while the chain is slow.',
        'Key engineering concerns were deterministic state display after a transaction confirms, clear failure messaging when a user rejects a signature, and keeping the interface usable on mobile wallets.',
      ].join('\n\n'),
      category: 'Web3',
      technologies: JSON.stringify(['React', 'JavaScript', 'Blockchain', 'Web3', 'Smart Contracts']),
      gallery: JSON.stringify([]),
      github_url: '',
      live_url: '',
      featured: 1,
      published: 1,
      year: String(new Date().getFullYear()),
      role: 'Full-stack development',
      duration: 'Independent build',
      seo_title: 'LotteryChain — decentralised lottery dApp',
      seo_description: 'Blockchain lottery dApp with an auditable, on-chain draw.',
      sort_order: 1,
    },
    {
      id: crypto.randomUUID(),
      slug: 'trustchain',
      title: 'TrustChain',
      subtitle: 'Transparent records on a distributed ledger',
      summary:
        'A blockchain application for recording transactions and records transparently, with an interface built around traceability rather than hype.',
      description: [
        'TrustChain explores the practical side of blockchain: how records are written, how they are read back, and how a person can verify what happened without reading a block explorer.',
        'The build covers wallet connection, record submission, and a history view that makes ledger state understandable. The work sits in the unglamorous parts — normalising chain data into a readable timeline, handling reconnects, and keeping latency visible instead of pretending it does not exist.',
        'It is also where I consolidated my approach to Web3 frontends: optimistic UI only where it can be reconciled, explicit pending states everywhere else.',
      ].join('\n\n'),
      category: 'Web3',
      technologies: JSON.stringify(['React', 'Node.js', 'JavaScript', 'Blockchain', 'REST APIs']),
      gallery: JSON.stringify([]),
      github_url: '',
      live_url: '',
      featured: 1,
      published: 1,
      year: String(new Date().getFullYear()),
      role: 'Full-stack development',
      duration: 'Independent build',
      seo_title: 'TrustChain — transparent on-chain records',
      seo_description: 'Blockchain record-keeping application with a readable ledger timeline.',
      sort_order: 2,
    },
    {
      id: crypto.randomUUID(),
      slug: 'ibsam-portfolio-ecosystem',
      title: 'IBSAM® Portfolio Ecosystem',
      subtitle: 'This site — a full-stack portfolio with its own CMS',
      summary:
        'A production portfolio and content management ecosystem: React and Three.js on the surface, a Node API, relational database, authenticated admin and realtime notifications underneath.',
      description: [
        'The site you are reading is itself one of the projects. The public experience is built with React, TypeScript, Tailwind and a WebGL hero; every piece of content on it is served by a real REST API backed by a relational database.',
        'The private half is an admin ecosystem: cookie-session authentication with server-side permission checks, CRUD for every content type, a media library, contact message triage, audit logging and Socket.IO events that update the dashboard the moment a message arrives.',
        'The point was to avoid the usual portfolio shortcut — hard-coded copy in components — and instead treat a personal site with the same engineering standards as a client product.',
      ].join('\n\n'),
      category: 'Full-Stack',
      technologies: JSON.stringify([
        'React',
        'TypeScript',
        'Node.js',
        'REST APIs',
        'SQLite',
        'Three.js',
        'Socket.IO',
      ]),
      gallery: JSON.stringify([]),
      github_url: '',
      live_url: '',
      featured: 1,
      published: 1,
      year: String(new Date().getFullYear()),
      role: 'Architecture and full-stack development',
      duration: 'Ongoing',
      seo_title: 'IBSAM® Portfolio Ecosystem — full-stack portfolio with CMS',
      seo_description: 'React + Three.js frontend, Node REST API, relational database and authenticated admin CMS.',
      sort_order: 3,
    },
  ]);

  insertIfEmpty('skills', [
    ['HTML5', 'Frontend', 95, 1, 1],
    ['CSS3', 'Frontend', 93, 1, 2],
    ['JavaScript', 'Frontend', 90, 1, 3],
    ['React', 'Frontend', 88, 1, 4],
    ['Next.js', 'Frontend', 84, 1, 5],
    ['Node.js', 'Backend', 80, 1, 6],
    ['REST APIs', 'Backend', 84, 1, 7],
    ['Firebase', 'Backend', 75, 0, 8],
    ['Git', 'Tooling', 88, 1, 9],
    ['GitHub', 'Tooling', 88, 0, 10],
  ].map(([name, category, level, featured, sort]) => ({
    id: crypto.randomUUID(),
    name,
    category,
    level,
    featured,
    sort_order: sort,
  })));

  insertIfEmpty('services', [
    {
      id: crypto.randomUUID(),
      title: 'Full-Stack Web Applications',
      description:
        'End-to-end product delivery: interface, API, data model and deployment. Built with React or Next.js on the front and Node.js with a relational database behind it.',
      icon: 'layers',
      features: JSON.stringify(['Product architecture', 'REST API design', 'Database modelling', 'Deployment and CI']),
      published: 1,
      sort_order: 1,
    },
    {
      id: crypto.randomUUID(),
      title: 'Frontend Engineering',
      description:
        'Interfaces built with real component architecture, accessible interaction and performance budgets — not a template with the colours changed.',
      icon: 'code',
      features: JSON.stringify(['React / Next.js', 'Design systems', 'Accessibility', 'Performance tuning']),
      published: 1,
      sort_order: 2,
    },
    {
      id: crypto.randomUUID(),
      title: 'Web3 & Blockchain Interfaces',
      description:
        'Wallet-connected frontends that stay understandable while transactions are pending, rejected or slow — the parts most dApps get wrong.',
      icon: 'blocks',
      features: JSON.stringify(['Wallet connection', 'Transaction flows', 'On-chain data views', 'Smart contract integration']),
      published: 1,
      sort_order: 3,
    },
    {
      id: crypto.randomUUID(),
      title: 'Interactive Experiences',
      description:
        'WebGL and motion work with a purpose: Three.js scenes and animation systems that support the narrative and degrade gracefully.',
      icon: 'sparkles',
      features: JSON.stringify(['Three.js / WebGL', 'Scroll narratives', 'Motion systems', 'Performance fallbacks']),
      published: 1,
      sort_order: 4,
    },
  ]);

  insertIfEmpty('case_studies', [
    {
      id: crypto.randomUUID(),
      slug: 'lotterychain-verifiable-draws',
      title: 'Making a lottery draw verifiable',
      subtitle: 'LotteryChain — engineering notes',
      project_slug: 'lotterychain',
      client: 'Independent project',
      year: String(new Date().getFullYear()),
      challenge:
        'A lottery is only interesting if the draw can be trusted. Off-chain randomness makes the operator the single point of trust, and a dApp that hides chain latency behind a spinner is not actually more transparent.',
      approach:
        'Ticket state is read back from the chain after confirmation rather than assumed from the click. The draw result is resolved contract-side and surfaced in the interface with a link to the underlying transaction. Pending, rejected and failed transactions each get their own state, so the user always knows what the chain knows.',
      outcome:
        'A lottery flow where every claim the interface makes can be checked against the ledger, and where the slowest part of the system — the network — is visible instead of disguised.',
      metrics: JSON.stringify([
        { label: 'Layer', value: 'Smart contract + React client' },
        { label: 'Trust model', value: 'On-chain, publicly auditable' },
        { label: 'Focus', value: 'Transaction state clarity' },
      ]),
      published: 1,
      sort_order: 1,
    },
    {
      id: crypto.randomUUID(),
      slug: 'trustchain-readable-ledger',
      title: 'Turning a ledger into something readable',
      subtitle: 'TrustChain — engineering notes',
      project_slug: 'trustchain',
      client: 'Independent project',
      year: String(new Date().getFullYear()),
      challenge:
        'Blockchain data is public but rarely legible. Asking someone to verify a record by reading raw contract calls is technically transparency and practically useless.',
      approach:
        'Chain records are normalised into a timeline with stable ordering, human-readable amounts and explicit confirmation states. Reconnects and partial reads are handled without dropping the user back to an empty screen.',
      outcome:
        'A record history that a non-technical visitor can follow, while still exposing the transaction reference for anyone who wants to verify it directly.',
      metrics: JSON.stringify([
        { label: 'Layer', value: 'Node + React' },
        { label: 'Data source', value: 'On-chain records' },
        { label: 'Focus', value: 'Legibility of verification' },
      ]),
      published: 1,
      sort_order: 2,
    },
  ]);

  insertIfEmpty('blog_posts', [
    {
      id: crypto.randomUUID(),
      slug: 'designing-for-the-pending-state',
      title: 'Designing for the pending state',
      excerpt:
        'Most blockchain interfaces are designed for the happy path. The honest design work happens while a transaction is in flight, rejected or dropped.',
      content: [
        'Every Web3 interface demo shows the same frame: wallet connected, transaction confirmed, balance updated. The product, however, lives in the seconds between the click and the confirmation — and that is where most dApps lose their users.',
        'There are three states that need real design, not a spinner. Pending, where the user needs to know the request exists and cannot be safely repeated. Rejected, where the wallet returned control and the interface must not pretend otherwise. And failed, where the chain accepted the request and then refused it, which is a different message entirely.',
        'My rule is simple: never render optimistic state you cannot reconcile. If the interface claims a balance changed before the chain says so, you now owe the user an apology later. Read state back from the source, keep the pending marker attached to the specific item, and let the UI be slow rather than wrong.',
        'This is the same discipline as ordinary full-stack work — a POST that resolves does not mean the write is visible — it is simply less forgiving, because the user paid gas to find out.',
      ].join('\n\n'),
      category: 'Engineering',
      tags: JSON.stringify(['Web3', 'Frontend', 'UX']),
      published: 1,
      published_at: new Date().toISOString(),
      read_minutes: 4,
      sort_order: 0,
    },
    {
      id: crypto.randomUUID(),
      slug: 'portfolio-as-a-real-product',
      title: 'A portfolio should be a real product',
      excerpt:
        'Hard-coding your own copy into JSX is a strange way to demonstrate that you can build software. So this site runs its own API.',
      content: [
        'A developer portfolio has an awkward job: it has to be a design piece and a proof of engineering at the same time. Most solve the first half. The text lives in components, the project list is an array in a file, and the contact form opens a mail client.',
        'That is a demonstration of layout, not of software. The moment a portfolio has a database, an authenticated admin, validated input and a deployment pipeline, it starts saying something about how you work.',
        'This site is built that way. Content is served by a versioned REST API. Projects, skills, services, case studies and posts are database rows with real CRUD behind them. The admin dashboard is protected by server-side session checks and permission lookups, not by hiding a button. Contact messages are validated, stored and pushed to the dashboard over a socket in real time.',
        'The result is not more impressive because it has more moving parts. It is more honest: the thing you are clicking on is the thing I actually build.',
      ].join('\n\n'),
      category: 'Engineering',
      tags: JSON.stringify(['Full-Stack', 'Architecture']),
      published: 1,
      published_at: new Date().toISOString(),
      read_minutes: 3,
      sort_order: 0,
    },
  ]);

  insertIfEmpty('testimonials', []);
  insertIfEmpty('experience', []);
  insertIfEmpty('education', []);
  insertIfEmpty('certifications', []);
  insertIfEmpty('achievements', []);
}

export function seedAll(): void {
  const transaction = db.transaction(() => {
    seedRolesAndPermissions();
    seedSettings();
    seedContent();
    seedOmegaProjects();
  });
  transaction();
}
