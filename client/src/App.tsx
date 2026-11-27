import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { ScrollManager, SiteFooter, SiteHeader } from './components/layout';
import { SiteProvider } from './lib/site';
import { usePageView } from './lib/hooks';
import Home from './pages/Home';
import { CaseStudies, ProjectDetail, ProjectList } from './pages/Work';
import { About, Achievements, Certifications, Education, Experience, Resume, Services, Skills } from './pages/Profile';
import { Blog, BlogDetail, Testimonials } from './pages/Writing';
import Lab from './pages/Lab';
import Contact from './pages/Contact';
import { NotFound, Privacy, Terms } from './pages/Legal';

const AdminApp = lazy(() => import('./admin/AdminApp'));

/* Canonical aliases: the published page names (Projects, Blog) resolve to the
   existing /work and /writing routes so no shared link lands on the 404 page. */
function AliasRedirect({ to }: { to: string }) {
  const params = useParams();
  const suffix = Object.values(params).filter(Boolean).join('/');
  return <Navigate to={suffix ? `${to}/${suffix}` : to} replace />;
}

function PublicLayout() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}

function RouteTracking() {
  const location = useLocation();
  usePageView(location.pathname);
  useEffect(() => {
    const skip = document.querySelector<HTMLAnchorElement>('.skip-link');
    skip?.addEventListener('click', (event) => {
      event.preventDefault();
      document.getElementById('main')?.focus();
    });
  }, []);

  return null;
}

function AdminFallback() {
  return (
    <div className="admin-boot">
      <div className="admin-boot-mark">IBSAM<span>®</span></div>
      <p>Loading the console…</p>
    </div>
  );
}

export default function App() {
  return (
    <SiteProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollManager />
      <RouteTracking />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/work" element={<ProjectList />} />
          <Route path="/work/:slug" element={<ProjectDetail />} />
          <Route path="/projects" element={<Navigate to="/work" replace />} />
          <Route path="/projects/:slug" element={<AliasRedirect to="/work" />} />
          <Route path="/case-studies" element={<CaseStudies />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/experience" element={<Experience />} />
          <Route path="/services" element={<Services />} />
          <Route path="/education" element={<Education />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/certifications" element={<Certifications />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/writing" element={<Blog />} />
          <Route path="/writing/:slug" element={<BlogDetail />} />
          <Route path="/blog" element={<Navigate to="/writing" replace />} />
          <Route path="/blog/:slug" element={<AliasRedirect to="/writing" />} />
          <Route path="/testimonials" element={<Testimonials />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/resume" element={<Resume />} />
          <Route path="/legal/privacy" element={<Privacy />} />
          <Route path="/legal/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminApp />
            </Suspense>
          }
        />
      </Routes>
    </SiteProvider>
  );
}
