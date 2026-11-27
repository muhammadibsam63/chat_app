import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Github, Linkedin, Mail, Menu, Twitter, X } from 'lucide-react';
import { useSite } from '../lib/site';
import { cn } from './ui';

const NAV = [
  { to: '/work', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/writing', label: 'Writing' },
  { to: '/contact', label: 'Contact' },
];

const SECONDARY = [
  { to: '/lab', label: 'Lab' },
  { to: '/resume', label: 'Résumé' },
  { to: '/services', label: 'Services' },
  { to: '/testimonials', label: 'Testimonials' },
];

export function ScrollManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}

export function SiteHeader() {
  const { settings } = useSite();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header className={cn('site-header', scrolled && 'is-scrolled')}>
        <div className="shell site-header-inner">
          <Link to="/" className="brand" aria-label={`${settings.profile.brand} home`}>
            <span className="brand-mark">IBSAM</span>
            <span className="brand-reg">®</span>
          </Link>

          <nav className="nav" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn('nav-link', isActive && 'is-active')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <Link to="/contact" className="btn btn-gold btn-sm header-cta">
              Start a project
              <ArrowUpRight size={15} aria-hidden />
            </Link>
            <button
              type="button"
              className="menu-toggle"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <div className="header-progress" aria-hidden />
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-menu"
            className="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mobile-menu-inner">
              <nav aria-label="Mobile">
                {[...NAV, ...SECONDARY].map((item, index) => (
                  <motion.div
                    key={item.to}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * index, duration: 0.35 }}
                  >
                    <Link to={item.to} className="mobile-link">
                      <span>{item.label}</span>
                      <ArrowUpRight size={18} aria-hidden />
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <div className="mobile-meta">
                <a href={`mailto:${settings.profile.email}`} className="mobile-email">
                  <Mail size={16} aria-hidden /> {settings.profile.email}
                </a>
                <p>{settings.profile.location}</p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export function SiteFooter() {
  const { settings } = useSite();
  const year = new Date().getFullYear();
  const socials = [
    { href: settings.socials.github, label: 'GitHub', Icon: Github },
    { href: settings.socials.linkedin, label: 'LinkedIn', Icon: Linkedin },
    { href: settings.socials.x, label: 'X', Icon: Twitter },
    { href: `mailto:${settings.profile.email}`, label: 'Email', Icon: Mail },
  ].filter((item) => Boolean(item.href));

  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-top">
          <div className="footer-brand">
            <p className="footer-wordmark">
              IBSAM<span>®</span>
            </p>
            <p className="footer-note">{settings.footer.note}</p>
          </div>
          <div className="footer-columns">
            <div>
              <p className="footer-label">Navigate</p>
              <ul>
                {[...NAV, ...SECONDARY].map((item) => (
                  <li key={item.to}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="footer-label">Elsewhere</p>
              <ul>
                {socials.map(({ href, label, Icon }) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noreferrer noopener">
                      <Icon size={14} aria-hidden /> {label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link to="/admin">Admin</Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="footer-label">Contact</p>
              <ul>
                <li>
                  <a href={`mailto:${settings.profile.email}`}>{settings.profile.email}</a>
                </li>
                <li>{settings.profile.location}</li>
                <li>
                  <Link to="/legal/privacy">Privacy</Link> · <Link to="/legal/terms">Terms</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            © {year} {settings.footer.copyright}
          </p>
          <p className="footer-status">
            <span className="status-dot" aria-hidden /> {settings.profile.availability}
          </p>
        </div>
      </div>
    </footer>
  );
}
