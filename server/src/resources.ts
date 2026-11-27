/**
 * Declarative resource metadata.
 *
 * One definition per content type drives the admin CRUD API, validation,
 * slug generation and the OpenAPI document — so an endpoint cannot drift from
 * the database column it writes to.
 */
export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'json' | 'date' | 'select' | 'url';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  maxLength?: number;
  options?: string[];
  hint?: string;
  min?: number;
  max?: number;
}

export interface ResourceDef {
  name: string;
  table: string;
  label: string;
  singular: string;
  permission: string;
  fields: FieldDef[];
  searchable: string[];
  defaultSort: string;
  slugFrom?: string;
  jsonFields?: string[];
  boolFields?: string[];
  readOnly?: boolean;
  description: string;
}

const text = (name: string, label: string, required = false, maxLength = 200): FieldDef => ({
  name,
  label,
  type: 'text',
  required,
  maxLength,
});

const area = (name: string, label: string, maxLength = 20000): FieldDef => ({ name, label, type: 'textarea', maxLength });
const json = (name: string, label: string, hint?: string): FieldDef => ({ name, label, type: 'json', hint });
const bool = (name: string, label: string): FieldDef => ({ name, label, type: 'boolean' });
const num = (name: string, label: string, min = 0, max = 9999): FieldDef => ({
  name,
  label,
  type: 'number',
  min,
  max,
});

export const RESOURCES: Record<string, ResourceDef> = {
  projects: {
    name: 'projects',
    table: 'projects',
    label: 'Projects',
    singular: 'Project',
    permission: 'projects:write',
    description: 'Portfolio projects shown on the public site.',
    searchable: ['title', 'slug', 'summary', 'category'],
    defaultSort: 'sort_order ASC, created_at DESC',
    slugFrom: 'title',
    jsonFields: ['technologies', 'gallery'],
    boolFields: ['featured', 'published'],
    fields: [
      text('title', 'Title', true),
      text('slug', 'Slug', false, 120),
      text('subtitle', 'Subtitle', false, 200),
      area('summary', 'Summary', 600),
      area('description', 'Description'),
      text('category', 'Category', false, 60),
      json('technologies', 'Technologies', 'JSON array of strings'),
      text('cover_image', 'Cover image URL', false, 400),
      json('gallery', 'Gallery', 'JSON array of image URLs'),
      { name: 'github_url', label: 'GitHub URL', type: 'url', maxLength: 400 },
      { name: 'live_url', label: 'Live URL', type: 'url', maxLength: 400 },
      bool('featured', 'Featured'),
      bool('published', 'Published'),
      text('year', 'Year', false, 10),
      text('role', 'Role', false, 120),
      text('duration', 'Duration', false, 120),
      text('seo_title', 'SEO title', false, 160),
      text('seo_description', 'SEO description', false, 320),
      num('sort_order', 'Sort order'),
    ],
  },
  'case-studies': {
    name: 'case-studies',
    table: 'case_studies',
    label: 'Case studies',
    singular: 'Case study',
    permission: 'content:write',
    description: 'Long-form engineering narratives linked to projects.',
    searchable: ['title', 'slug', 'subtitle'],
    defaultSort: 'sort_order ASC, created_at DESC',
    slugFrom: 'title',
    jsonFields: ['metrics'],
    boolFields: ['published'],
    fields: [
      text('title', 'Title', true),
      text('slug', 'Slug', false, 120),
      text('subtitle', 'Subtitle', false, 200),
      text('project_slug', 'Project slug', false, 120),
      text('client', 'Client', false, 120),
      text('year', 'Year', false, 10),
      area('challenge', 'Challenge'),
      area('approach', 'Approach'),
      area('outcome', 'Outcome'),
      json('metrics', 'Metrics', 'JSON array of {label,value}'),
      text('cover_image', 'Cover image URL', false, 400),
      bool('published', 'Published'),
      num('sort_order', 'Sort order'),
    ],
  },
  skills: {
    name: 'skills',
    table: 'skills',
    label: 'Skills',
    singular: 'Skill',
    permission: 'content:write',
    description: 'Technical skills with category and proficiency.',
    searchable: ['name', 'category'],
    defaultSort: 'sort_order ASC, name ASC',
    boolFields: ['featured'],
    fields: [
      text('name', 'Name', true, 80),
      text('category', 'Category', false, 60),
      num('level', 'Level (0-100)', 0, 100),
      text('icon', 'Icon key', false, 40),
      bool('featured', 'Featured'),
      num('sort_order', 'Sort order'),
    ],
  },
  experience: {
    name: 'experience',
    table: 'experience',
    label: 'Experience',
    singular: 'Experience entry',
    permission: 'content:write',
    description: 'Employment and engagement history.',
    searchable: ['role', 'organization'],
    defaultSort: 'sort_order ASC, start_date DESC',
    jsonFields: ['technologies'],
    boolFields: ['is_current'],
    fields: [
      text('role', 'Role', true, 120),
      text('organization', 'Organization', true, 120),
      text('location', 'Location', false, 120),
      text('employment_type', 'Employment type', false, 60),
      { name: 'start_date', label: 'Start date', type: 'date' },
      { name: 'end_date', label: 'End date', type: 'date' },
      bool('is_current', 'Current role'),
      area('description', 'Description'),
      json('technologies', 'Technologies', 'JSON array of strings'),
      num('sort_order', 'Sort order'),
    ],
  },
  education: {
    name: 'education',
    table: 'education',
    label: 'Education',
    singular: 'Education entry',
    permission: 'content:write',
    description: 'Academic history.',
    searchable: ['institution', 'degree', 'field'],
    defaultSort: 'sort_order ASC, start_date DESC',
    fields: [
      text('institution', 'Institution', true, 160),
      text('degree', 'Degree', true, 160),
      text('field', 'Field of study', false, 160),
      text('location', 'Location', false, 120),
      { name: 'start_date', label: 'Start date', type: 'date' },
      { name: 'end_date', label: 'End date', type: 'date' },
      area('description', 'Description'),
      num('sort_order', 'Sort order'),
    ],
  },
  certifications: {
    name: 'certifications',
    table: 'certifications',
    label: 'Certifications',
    singular: 'Certification',
    permission: 'content:write',
    description: 'Verified certifications only.',
    searchable: ['title', 'issuer'],
    defaultSort: 'sort_order ASC, issued_at DESC',
    fields: [
      text('title', 'Title', true, 160),
      text('issuer', 'Issuer', true, 160),
      { name: 'issued_at', label: 'Issued at', type: 'date' },
      text('credential_id', 'Credential ID', false, 160),
      { name: 'credential_url', label: 'Credential URL', type: 'url', maxLength: 400 },
      num('sort_order', 'Sort order'),
    ],
  },
  achievements: {
    name: 'achievements',
    table: 'achievements',
    label: 'Achievements',
    singular: 'Achievement',
    permission: 'content:write',
    description: 'Awards and notable outcomes.',
    searchable: ['title'],
    defaultSort: 'sort_order ASC, achieved_at DESC',
    fields: [
      text('title', 'Title', true, 160),
      area('description', 'Description', 2000),
      { name: 'achieved_at', label: 'Achieved at', type: 'date' },
      { name: 'link', label: 'Link', type: 'url', maxLength: 400 },
      num('sort_order', 'Sort order'),
    ],
  },
  services: {
    name: 'services',
    table: 'services',
    label: 'Services',
    singular: 'Service',
    permission: 'content:write',
    description: 'Service offerings shown on the home and services pages.',
    searchable: ['title'],
    defaultSort: 'sort_order ASC, created_at DESC',
    jsonFields: ['features'],
    boolFields: ['published'],
    fields: [
      text('title', 'Title', true, 160),
      area('description', 'Description', 2000),
      text('icon', 'Icon key', false, 40),
      json('features', 'Features', 'JSON array of strings'),
      bool('published', 'Published'),
      num('sort_order', 'Sort order'),
    ],
  },
  testimonials: {
    name: 'testimonials',
    table: 'testimonials',
    label: 'Testimonials',
    singular: 'Testimonial',
    permission: 'content:write',
    description: 'Client or collaborator quotes.',
    searchable: ['name', 'company', 'quote'],
    defaultSort: 'sort_order ASC, created_at DESC',
    boolFields: ['published'],
    fields: [
      text('name', 'Name', true, 120),
      text('role', 'Role', false, 120),
      text('company', 'Company', false, 120),
      area('quote', 'Quote', 2000),
      text('avatar_url', 'Avatar URL', false, 400),
      num('rating', 'Rating (1-5)', 1, 5),
      bool('published', 'Published'),
      num('sort_order', 'Sort order'),
    ],
  },
  'blog-posts': {
    name: 'blog-posts',
    table: 'blog_posts',
    label: 'Blog posts',
    singular: 'Blog post',
    permission: 'content:write',
    description: 'Articles published on the blog.',
    searchable: ['title', 'slug', 'excerpt', 'category'],
    defaultSort: 'published_at DESC, created_at DESC',
    slugFrom: 'title',
    jsonFields: ['tags'],
    boolFields: ['published'],
    fields: [
      text('title', 'Title', true, 200),
      text('slug', 'Slug', false, 160),
      area('excerpt', 'Excerpt', 600),
      area('content', 'Content'),
      text('cover_image', 'Cover image URL', false, 400),
      text('category', 'Category', false, 60),
      json('tags', 'Tags', 'JSON array of strings'),
      bool('published', 'Published'),
      { name: 'published_at', label: 'Published at', type: 'date' },
      num('read_minutes', 'Read minutes', 1, 120),
      text('seo_title', 'SEO title', false, 160),
      text('seo_description', 'SEO description', false, 320),
    ],
  },
  messages: {
    name: 'messages',
    table: 'contact_messages',
    label: 'Messages',
    singular: 'Message',
    permission: 'messages:write',
    description: 'Inbound contact messages.',
    searchable: ['name', 'email', 'subject', 'message'],
    defaultSort: 'created_at DESC',
    fields: [
      text('name', 'Name', false, 120),
      text('email', 'Email', false, 200),
      text('subject', 'Subject', false, 200),
      area('message', 'Message'),
      { name: 'status', label: 'Status', type: 'select', options: ['new', 'read', 'archived'] },
    ],
  },
};

export function getResource(name: string): ResourceDef | undefined {
  return RESOURCES[name];
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

export interface ValidationResult {
  values: Record<string, unknown>;
  errors: string[];
}

/** Server-side validation for the generic CRUD endpoints. */
export function validatePayload(
  resource: ResourceDef,
  body: Record<string, unknown>,
  { partial }: { partial: boolean },
): ValidationResult {
  const values: Record<string, unknown> = {};
  const errors: string[] = [];
  const slugSource = resource.slugFrom ? body[resource.slugFrom] : undefined;

  for (const field of resource.fields) {
    const provided = Object.prototype.hasOwnProperty.call(body, field.name);
    if (!provided && partial) continue;

    let value = body[field.name];

    if (field.name === 'slug' && (value === undefined || value === null || value === '') && slugSource) {
      value = slugify(String(slugSource));
    }

    if (field.type === 'boolean') {
      values[field.name] = value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
      continue;
    }

    if (field.type === 'number') {
      const parsed = Number(value ?? 0);
      if (Number.isNaN(parsed)) {
        errors.push(`${field.label} must be a number`);
        continue;
      }
      if (field.min !== undefined && parsed < field.min) errors.push(`${field.label} must be at least ${field.min}`);
      if (field.max !== undefined && parsed > field.max) errors.push(`${field.label} must be at most ${field.max}`);
      values[field.name] = parsed;
      continue;
    }

    if (field.type === 'json') {
      let parsed: unknown = value;
      if (typeof value === 'string') {
        try {
          parsed = value.trim() === '' ? [] : JSON.parse(value);
        } catch {
          errors.push(`${field.label} must be valid JSON`);
          continue;
        }
      }
      if (parsed === undefined || parsed === null) parsed = [];
      if (!Array.isArray(parsed) && typeof parsed !== 'object') {
        errors.push(`${field.label} must be an array or object`);
        continue;
      }
      values[field.name] = JSON.stringify(parsed);
      continue;
    }

    if (field.type === 'select' && field.options && value !== undefined && value !== null && value !== '') {
      if (!field.options.includes(String(value))) {
        errors.push(`${field.label} must be one of: ${field.options.join(', ')}`);
        continue;
      }
    }

    if (field.type === 'url' && value) {
      try {
        const url = new URL(String(value));
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
      } catch {
        errors.push(`${field.label} must be a valid http(s) URL`);
        continue;
      }
    }

    const stringValue = value === undefined || value === null ? '' : String(value);
    if (field.maxLength && stringValue.length > field.maxLength) {
      errors.push(`${field.label} must be ${field.maxLength} characters or fewer`);
      continue;
    }
    if (field.required && stringValue.trim() === '') {
      errors.push(`${field.label} is required`);
      continue;
    }
    values[field.name] = stringValue.trim() === '' && !field.required ? null : stringValue;
  }

  return { values, errors };
}
