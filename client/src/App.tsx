import { lazy, Suspense, useEffect } from 'react';
import { Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ScrollManager, SiteFooter, SiteHeader } from './components/layout';
import { SiteProvider } from './lib/site';
import { usePageView } from './lib/hooks';
import Home from './pages/Home';
import { CaseStudies, ProjectDetail, ProjectList } from './pages/Work';
import { About, Achievements, Certifications, Education, Experience, Resume, Services, Skills } from './pages/Profile';
import { Blog, BlogDetail, Lab, Testimonials } from './pages/Writing';
import Contact from './pages/Contact';
import { NotFound, Privacy, Terms } from './pages/Legal';

const AdminApp = lazy(() => import('./admin/AdminApp'));

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
