import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from './hooks';
import type { SiteSettings } from './types';

/**
 * Site-wide identity content. Seeded defaults keep the shell readable while the
 * API request is in flight; the database is always the source of truth.
 */
export const fallbackSettings: SiteSettings = {
  profile: {
    name: 'Muhammad Ibsam',
    brand: 'IBSAM®',
    title: 'Full-Stack Web Developer',
    tagline: 'Engineering interfaces with the discipline of architecture.',
    location: 'Karachi, Pakistan',
    email: 'hello@ibsam.dev',
    availability: 'Available for select projects',
    bio: '',
    shortBio: 'Full-stack web developer building precise, fast and expressive products for the web.',
    interests: ['Full-stack development', 'Blockchain', 'Web3 applications', 'Interactive experiences'],
  },
  socials: { github: 'https://github.com/', linkedin: '', x: '', instagram: '', email: '' },
  seo: {
    title: 'Muhammad Ibsam — Full-Stack Web Developer',
    description:
      'IBSAM® is the portfolio and engineering notebook of Muhammad Ibsam, a full-stack web developer in Karachi, Pakistan.',
    keywords: ['full-stack developer', 'react', 'next.js', 'node.js', 'web3', 'karachi'],
  },
  contact: {
    heading: 'Let’s build something exacting.',
    blurb: 'Tell me about the product, the constraints and the timeline. I reply to every serious enquiry.',
    email: 'hello@ibsam.dev',
    location: 'Karachi, Pakistan',
    responseTime: 'Within 48 hours',
  },
  footer: { note: 'Designed & engineered in Karachi.', copyright: '© IBSAM®. All rights reserved.' },
};

interface SiteContextValue {
  settings: SiteSettings;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const SiteContext = createContext<SiteContextValue>({
  settings: fallbackSettings,
  loading: false,
  error: null,
  reload: () => undefined,
});

export function SiteProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, reload } = useQuery<SiteSettings>('/site');
  return (
    <SiteContext.Provider value={{ settings: data ?? fallbackSettings, loading, error, reload }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite(): SiteContextValue {
  return useContext(SiteContext);
}
