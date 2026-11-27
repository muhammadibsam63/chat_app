/**
 * Verified technology inventory for the constellation and skills surfaces.
 * Tier labels are honest classifications, never invented percentages.
 * `projects` lists the project slugs that actually use the technology.
 */
export type TechTier = 'core' | 'familiar' | 'learning';

export type TechEntry = {
  name: string;
  tier: TechTier;
  category: string;
  note: string;
  projects: string[];
};

export const TECH_ENTRIES: TechEntry[] = [
  {
    name: 'HTML5',
    tier: 'core',
    category: 'Foundation',
    note: 'Semantic document structure, accessibility landmarks and form primitives.',
    projects: ['luxury-stay-hostel', 'luxora-watches', 'nova-store'],
  },
  {
    name: 'CSS3',
    tier: 'core',
    category: 'Foundation',
    note: 'Layout systems, fluid type scales, layered gradients and responsive composition.',
    projects: ['luxora-watches', 'nova-store', 'nexora'],
  },
  {
    name: 'JavaScript',
    tier: 'core',
    category: 'Language',
    note: 'Primary language for interface logic, state handling and DOM behaviour.',
    projects: ['hcm-lite', 'aero-trip', '3d-react-game'],
  },
  {
    name: 'TypeScript',
    tier: 'core',
    category: 'Language',
    note: 'Typed React and Node code, shared domain models and API contracts.',
    projects: ['ibsam-portfolio-ecosystem', 'maintain-iq'],
  },
  {
    name: 'React',
    tier: 'core',
    category: 'Frontend',
    note: 'Component architecture, hooks, context state and route-level code splitting.',
    projects: ['ibsam-portfolio-ecosystem', 'skillforge-pro', 'maintain-iq'],
  },
  {
    name: 'Next.js',
    tier: 'familiar',
    category: 'Frontend',
    note: 'App Router layouts, metadata and server-rendered marketing surfaces.',
    projects: ['nexora'],
  },
  {
    name: 'Node.js',
    tier: 'core',
    category: 'Backend',
    note: 'Express services, REST resources, middleware and authentication flows.',
    projects: ['ibsam-portfolio-ecosystem', 'hcm-lite'],
  },
  {
    name: 'Express',
    tier: 'familiar',
    category: 'Backend',
    note: 'Routing, validation middleware, rate limiting and error handling.',
    projects: ['ibsam-portfolio-ecosystem'],
  },
  {
    name: 'MongoDB',
    tier: 'familiar',
    category: 'Database',
    note: 'Document modelling for catalogue and user collections.',
    projects: ['nova-store', 'skillforge-pro'],
  },
  {
    name: 'PostgreSQL',
    tier: 'learning',
    category: 'Database',
    note: 'Relational schema design, joins and indexed queries in current study.',
    projects: ['maintain-iq'],
  },
  {
    name: 'Firebase',
    tier: 'familiar',
    category: 'Backend',
    note: 'Authentication, hosted data and deployment for small product builds.',
    projects: ['hcm-lite', 'aero-trip'],
  },
  {
    name: 'REST APIs',
    tier: 'core',
    category: 'Architecture',
    note: 'Resource design, status semantics, pagination and consistent payloads.',
    projects: ['ibsam-portfolio-ecosystem', 'aero-trip'],
  },
  {
    name: 'Git',
    tier: 'core',
    category: 'Workflow',
    note: 'Branching, staged commits and history hygiene on every project.',
    projects: ['ibsam-portfolio-ecosystem', 'maintain-iq'],
  },
  {
    name: 'GitHub',
    tier: 'core',
    category: 'Workflow',
    note: 'Repositories, pull requests and collaborative review workflows.',
    projects: ['ibsam-portfolio-ecosystem', 'luxora-watches'],
  },
  {
    name: 'Three.js',
    tier: 'familiar',
    category: 'Creative',
    note: 'Scene graphs, shader materials, procedural geometry and raycast interaction.',
    projects: ['ibsam-portfolio-ecosystem', '3d-react-game'],
  },
  {
    name: 'Web3',
    tier: 'learning',
    category: 'Blockchain',
    note: 'Wallet connection, contract reads and decentralised app structure.',
    projects: ['lotterychain', 'trustchain'],
  },
  {
    name: 'Solidity',
    tier: 'learning',
    category: 'Blockchain',
    note: 'Contract structure, events and testnet deployment fundamentals.',
    projects: ['lotterychain', 'trustchain'],
  },
];

export const TECH_TIERS: { id: TechTier; label: string; description: string }[] = [
  { id: 'core', label: 'Core', description: 'Used constantly, in shipped work.' },
  { id: 'familiar', label: 'Familiar', description: 'Comfortable with working, real usage.' },
  { id: 'learning', label: 'Learning', description: 'Actively studying, not claimed as expert.' },
];
