'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

/* ─── Color constants (Material You palette from the Stitch design) ────────── */
const C = {
  primary: '#0050cb',
  primaryContainer: '#0066ff',
  secondary: '#4c4aca',
  secondaryContainer: '#6664e4',
  tertiary: '#a33200',
  onSurface: '#1a1c1d',
  onSurfaceVariant: '#424656',
  outlineVariant: '#c2c6d8',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  primaryFixedDim: '#b3c5ff',
  secondaryFixedDim: '#c2c1ff',
  surfaceContainer: '#edeef0',
  surfaceLowest: '#ffffff',
  onPrimary: '#ffffff',
  background: '#f9f9fb',
  amber: '#FFB020',
};

export default function LandingPage() {
  const navRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const nav = navRef.current;
      if (!nav) return;
      if (window.scrollY > 20) {
        nav.style.background = 'rgba(255,255,255,0.85)';
      } else {
        nav.style.background = 'rgba(249,249,251,0.7)';
      }
    };
    window.addEventListener('scroll', handleScroll);

    // Responsive nav visibility
    const handleResize = () => {
      const isMd = window.innerWidth >= 768;
      if (navRef.current) navRef.current.style.display = isMd ? 'flex' : 'none';
      if (mobileNavRef.current) mobileNavRef.current.style.display = isMd ? 'none' : 'flex';
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      data-theme="light"
      style={{
        minHeight: '100vh',
        overflowX: 'hidden',
        background: '#f4f6fb',
        backgroundImage:
          'radial-gradient(circle at 15% 50%, rgba(0,102,255,0.05), transparent 25%), radial-gradient(circle at 85% 30%, rgba(76,74,202,0.05), transparent 25%)',
        backgroundAttachment: 'fixed',
        color: C.onSurface,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* ── Top Navigation ───────────────────────────────────────────────── */}
      <nav
        ref={navRef}
        id="global-nav"
        style={{
          position: 'fixed',
          top: 0,
          width: '100%',
          zIndex: 50,
          display: 'none', /* set by JS */
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 32px',
          background: 'rgba(249,249,251,0.7)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/logo.png"
            alt="DocAgent Logo"
            style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}
          />
          <span style={{ fontSize: 22, fontWeight: 700, color: C.primary, letterSpacing: '-0.02em' }}>
            DocAgent
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 32,
            alignItems: 'center',
            background: 'rgba(255,255,255,0.4)',
            backdropFilter: 'blur(20px)',
            padding: '12px 24px',
            borderRadius: 9999,
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          {[
            { href: '#features', label: 'Features', active: true },
            { href: '#pricing', label: 'Pricing', active: false },
            { href: '#enterprise', label: 'Enterprise', active: false },
            { href: '#about', label: 'About', active: false },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              style={{
                fontSize: 14,
                fontWeight: item.active ? 700 : 600,
                letterSpacing: '0.02em',
                color: item.active ? C.primary : C.onSurfaceVariant,
                textDecoration: 'none',
                borderBottom: item.active ? `2px solid ${C.primary}` : 'none',
                paddingBottom: item.active ? 4 : 0,
                transition: 'color 0.2s',
              }}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link
            href="/documents"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: C.onSurfaceVariant,
              textDecoration: 'none',
            }}
          >
            Login
          </Link>
          <Link
            href="/upload"
            style={{
              background: C.primaryContainer,
              color: C.onPrimary,
              fontSize: 14,
              fontWeight: 600,
              padding: '12px 24px',
              borderRadius: 9999,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(0,102,255,0.2)',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main style={{ flexGrow: 1, padding: '0 32px 128px', paddingTop: 0 }}>

        {/* ── Hero Section ─────────────────────────────────────────────── */}
        <section
          style={{
            position: 'relative',
            maxWidth: 1280,
            margin: '0 auto',
            minHeight: '90vh',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 48,
            paddingTop: 160,
            paddingBottom: 80,
          }}
        >
          {/* Decorative blurs */}
          <div style={{ position: 'absolute', top: '25%', left: '25%', width: 384, height: 384, background: `${C.primaryFixedDim}66`, borderRadius: '50%', filter: 'blur(64px)', zIndex: 0, mixBlendMode: 'multiply', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '25%', right: '25%', width: 320, height: 320, background: `${C.secondaryFixedDim}66`, borderRadius: '50%', filter: 'blur(64px)', zIndex: 0, mixBlendMode: 'multiply', pointerEvents: 'none' }} />

          {/* Left text */}
          <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: 32, zIndex: 10 }}>
            <div
              className="landing-glass-panel"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 9999, width: 'fit-content' }}
            >
              <span className="material-symbols-outlined" style={{ color: C.primary, fontSize: 18 }}>auto_awesome</span>
              <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', color: C.primary, textTransform: 'uppercase' }}>Introducing DocAgent 2.0</span>
            </div>

            <h1 style={{ fontSize: 'clamp(40px,5vw,64px)', lineHeight: 1.1, fontWeight: 700, letterSpacing: '-0.02em', color: C.onSurface, margin: 0 }}>
              Your Documents,<br />
              <span className="landing-text-gradient">Reimagined by AI</span>
            </h1>

            <p style={{ fontSize: 19, lineHeight: 1.6, color: C.onSurfaceVariant, maxWidth: 520, margin: 0 }}>
              Experience a frictionless workflow where your documents talk back. Extract insights, verify claims, and summarize hours of reading into seconds with our premium AI assistant.
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16 }}>
              <Link
                href="/upload"
                style={{ background: C.primaryContainer, color: C.onPrimary, fontSize: 14, fontWeight: 600, padding: '16px 32px', borderRadius: 9999, textDecoration: 'none', boxShadow: '0 10px 20px rgba(0,102,255,0.2)', transition: 'all 0.3s ease', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                Get Started for Free
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
              </Link>
              <button
                className="landing-glass-button"
                style={{ color: C.onSurface, fontSize: 14, fontWeight: 600, padding: '16px 32px', borderRadius: 9999, cursor: 'pointer', transition: 'all 0.3s ease', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <span className="material-symbols-outlined" style={{ color: C.primary, fontSize: 22 }}>play_circle</span>
                Watch Demo
              </button>
            </div>

            {/* Social proof */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 32, paddingTop: 32, borderTop: `1px solid ${C.outlineVariant}4D`, width: '100%' }}>
              <div style={{ display: 'flex' }}>
                {[
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuD2WodJkkTX_4be4WouOgkc3duwpOpwIrLYwt-zHuTn-Mkb8rmMpokpk5P8AK1uy1Oa2e35AtQOF-vwwAmt1mh81esWRwyUzGGrQFfCIDU7-__TCr_WGxXRFk17TwlTUCQtzWKlcrDZfn4wXPv2CEAzODN7P6FsROLahSheRNs7XE6AIjGaLXTUL3p-VFNnZrL5zihrrnNb4r0ciCfoTCfUsNOBmQcFu9u8xLVR0-LLrODigP1-bhSojg',
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuD1ZY3Xns3kDiknJh32NXVMUDa_GiM1olsOoNgGc6gQKS77k9aIdTyl2tj0tXpe88FWugRtmfw3H2q8xVh5i8gSjn7sJXk2dsfPxGBxPKBiXCJHnqh6SLNX5RPH0tAv6c6ZtDB7JBJlKvgKsWiAW7omwW3FD2BdhjfZixgtL5hGvVJJTjxAXiszDOrlx17Pkkk_sfA4_78EKsFP1B1A5Q2ztog19mDt0oX1qPgYye101z2xR1T1yzdYbw',
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuAsjICEixj7GHgaivEZiYk3L2aN0Liq6fddGuk2AsQ5GmlQhRFtvJx_kMbJpUhlXJ6a_b8fTD3Ivu_F3KzTYxLgBJFX3oU2rlGCoL38F1I37TFwDR4gGsjzrhn6g-mP2G-CHMMfx2WAmytGy20ew_8ehmiElv3tfYKJ0XvlKDo9_y_w9imZZvQFFY3nGja2VUxt-1lEuPJ0tBKAsI_0SDwGhIIR53HcRoyynWuX1aER0M-Dr4ejgGEgiA',
                ].map((src, i) => (
                  <div key={i} style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid white', backgroundImage: `url('${src}')`, backgroundSize: 'cover', backgroundPosition: 'center', marginLeft: i > 0 ? -12 : 0 }} />
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined" style={{ color: C.amber, fontSize: 16, fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: C.onSurfaceVariant }}>Trusted by 10,000+ teams</span>
              </div>
            </div>
          </div>

          {/* Right illustration */}
          <div
            className="landing-animate-float"
            style={{ flex: '1 1 400px', position: 'relative', height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {/* Main floating card */}
            <div
              className="landing-glass-panel"
              style={{ position: 'absolute', zIndex: 20, width: 320, height: 384, borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, transform: 'rotate(-2deg)', background: 'rgba(255,255,255,0.6)' }}
            >
              <div style={{ width: '100%', height: 32, background: C.surfaceContainer, borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: `${C.error}80` }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: `${C.amber}80` }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: `${C.primary}80` }} />
              </div>
              <div style={{ width: '75%', height: 16, background: `${C.outlineVariant}33`, borderRadius: 9999, marginTop: 16 }} />
              <div style={{ width: '100%', height: 16, background: `${C.outlineVariant}33`, borderRadius: 9999 }} />
              <div style={{ width: '83%', height: 16, background: `${C.outlineVariant}33`, borderRadius: 9999 }} />
              <div
                className="landing-glass-panel"
                style={{ marginTop: 'auto', padding: 16, borderRadius: 16, border: `1px solid ${C.primary}33`, background: `${C.primary}0D`, display: 'flex', gap: 12, alignItems: 'flex-start' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.primaryContainer, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 16 }}>psychology</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                  <div style={{ width: '50%', height: 12, background: `${C.primary}33`, borderRadius: 9999 }} />
                  <div style={{ width: '100%', height: 8, background: `${C.primary}1A`, borderRadius: 9999 }} />
                  <div style={{ width: '80%', height: 8, background: `${C.primary}1A`, borderRadius: 9999 }} />
                </div>
              </div>
            </div>

            {/* Back card */}
            <div style={{ position: 'absolute', zIndex: 10, right: -48, top: 48, width: 192, height: 224, background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 20, transform: 'rotate(6deg) scale(0.9)', opacity: 0.8, filter: 'blur(1px)', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }} />

            {/* Fact-check badge */}
            <div
              className="landing-glass-panel"
              style={{ position: 'absolute', zIndex: 30, left: -32, bottom: 48, width: 256, padding: 16, borderRadius: 16, transform: 'rotate(-5deg)', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 16 }}
            >
              <span className="material-symbols-outlined" style={{ color: C.secondary, fontSize: 32 }}>verified</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.onSurface }}>Fact Checked</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.onSurfaceVariant }}>Sources verified instantly</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Bento Grid Features ─────────────────────────────────────────── */}
        <section id="features" style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontSize: 'clamp(28px,3.5vw,40px)', fontWeight: 700, letterSpacing: '-0.01em', color: C.onSurface, marginBottom: 16 }}>
              Intelligence at your fingertips
            </h2>
            <p style={{ fontSize: 19, lineHeight: 1.6, color: C.onSurfaceVariant, maxWidth: 600, margin: '0 auto' }}>
              Upload any document format and let DocAgent transform it into an interactive knowledge base.
            </p>
          </div>

          <div className="landing-feature-grid">
            {/* Feature 1: Conversational (2-col) */}
            <div className="landing-glass-panel landing-col-span-2" style={{ borderRadius: 32, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', position: 'relative', background: 'rgba(255,255,255,0.5)' }}>
              <div style={{ position: 'absolute', top: -64, right: -64, width: 256, height: 256, background: `${C.primary}1A`, borderRadius: '50%', filter: 'blur(48px)' }} />
              <div style={{ zIndex: 10, maxWidth: 360 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${C.primary}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <span className="material-symbols-outlined" style={{ color: C.primary, fontSize: 22 }}>chat_bubble</span>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 600, color: C.onSurface, marginBottom: 8 }}>Conversational Context</h3>
                <p style={{ fontSize: 16, lineHeight: 1.6, color: C.onSurfaceVariant }}>Ask complex questions across hundreds of pages. DocAgent understands nuance and context to provide accurate, synthesized answers.</p>
              </div>
              {/* Chat preview */}
              <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '60%', height: '70%', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 24px 48px rgba(0,0,0,0.1)', borderRadius: '16px 16px 0 0', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, transform: 'rotate(-5deg)' }}>
                <div style={{ alignSelf: 'flex-end', background: C.primaryContainer, color: 'white', padding: '8px 16px', borderRadius: '16px 16px 4px 16px', fontSize: 13, maxWidth: '80%' }}>Summarize the Q3 findings.</div>
                <div style={{ alignSelf: 'flex-start', background: C.surfaceContainer, color: C.onSurface, padding: '8px 16px', borderRadius: '16px 16px 16px 4px', fontSize: 13, maxWidth: '80%' }}>In Q3, revenue grew by 24% primarily driven by enterprise adoption...</div>
              </div>
            </div>

            {/* Feature 2: Citations */}
            <div className="landing-glass-panel" style={{ borderRadius: 32, padding: 32, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', background: 'rgba(255,255,255,0.5)' }}>
              <div style={{ position: 'absolute', bottom: -48, left: -48, width: 192, height: 192, background: `${C.secondary}1A`, borderRadius: '50%', filter: 'blur(48px)' }} />
              <div style={{ zIndex: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${C.secondary}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <span className="material-symbols-outlined" style={{ color: C.secondary, fontSize: 22 }}>format_quote</span>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 600, color: C.onSurface, marginBottom: 8 }}>Verifiable Citations</h3>
                <p style={{ fontSize: 16, lineHeight: 1.6, color: C.onSurfaceVariant }}>Every answer is backed by direct, clickable citations linking exactly to the source text within your document.</p>
              </div>
            </div>

            {/* Feature 3: Semantic Search */}
            <div className="landing-glass-panel" style={{ borderRadius: 32, padding: 32, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', background: 'rgba(255,255,255,0.5)' }}>
              <div style={{ zIndex: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${C.tertiary}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <span className="material-symbols-outlined" style={{ color: C.tertiary, fontSize: 22 }}>search</span>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 600, color: C.onSurface, marginBottom: 8 }}>Semantic Search</h3>
                <p style={{ fontSize: 16, lineHeight: 1.6, color: C.onSurfaceVariant }}>Find what you mean, not just what you type. Search by concept across your entire library.</p>
              </div>
            </div>

            {/* Feature 4: Security (2-col) */}
            <div className="landing-glass-panel landing-col-span-2" style={{ borderRadius: 32, padding: 32, display: 'flex', alignItems: 'center', gap: 32, overflow: 'hidden', position: 'relative', background: 'rgba(255,255,255,0.5)' }}>
              <div style={{ flex: 1, zIndex: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.errorContainer, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <span className="material-symbols-outlined" style={{ color: C.error, fontSize: 22 }}>lock</span>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 600, color: C.onSurface, marginBottom: 8 }}>Enterprise-Grade Security</h3>
                <p style={{ fontSize: 16, lineHeight: 1.6, color: C.onSurfaceVariant }}>Your documents never train our models. End-to-end encryption, SOC2 compliance, and granular access controls keep your intellectual property safe.</p>
              </div>
              <div style={{ flexShrink: 0, width: 192, height: 192, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, border: `4px solid ${C.outlineVariant}4D`, borderRadius: 24, transform: 'rotate(45deg) scale(0.9)' }} />
                <div style={{ position: 'absolute', inset: 0, border: `4px solid ${C.primary}66`, borderRadius: 24, transform: 'rotate(45deg) scale(0.75)' }} />
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: C.primary, position: 'relative', zIndex: 10, fontVariationSettings: "'FILL' 1" }}>shield</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section style={{ maxWidth: 1280, margin: '96px auto 0', textAlign: 'center' }}>
          <div className="landing-glass-panel" style={{ borderRadius: 32, padding: '64px 48px', background: `linear-gradient(135deg, ${C.primaryContainer}0D, ${C.secondary}0D)` }}>
            <h2 style={{ fontSize: 'clamp(28px,3vw,40px)', fontWeight: 700, letterSpacing: '-0.01em', color: C.onSurface, marginBottom: 16 }}>
              Ready to transform how you work with documents?
            </h2>
            <p style={{ fontSize: 19, lineHeight: 1.6, color: C.onSurfaceVariant, maxWidth: 560, margin: '0 auto 40px' }}>
              Join thousands of teams who use DocAgent to extract more value from their documents.
            </p>
            <Link
              href="/upload"
              style={{ background: C.primaryContainer, color: C.onPrimary, fontSize: 15, fontWeight: 600, padding: '16px 40px', borderRadius: 9999, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 20px rgba(0,102,255,0.2)', transition: 'all 0.3s ease' }}
            >
              Start for Free
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </Link>
          </div>
        </section>
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────────────────────── */}
      <nav
        ref={mobileNavRef}
        style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 50, display: 'none', /* set by JS */ justifyContent: 'space-around', alignItems: 'center', padding: '12px 24px', height: 80, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(50px)', WebkitBackdropFilter: 'blur(50px)', borderTop: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 -10px 30px rgba(0,0,0,0.05)', borderRadius: '16px 16px 0 0' }}
      >
        {[
          { href: '/', icon: 'home', label: 'Home', active: true },
          { href: '/documents', icon: 'folder_open', label: 'Docs', active: false },
          { href: '/chat', icon: 'chat_bubble', label: 'Chat', active: false },
          { href: '/settings', icon: 'person', label: 'Profile', active: false },
        ].map((item) => (
          <Link key={item.label} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: item.active ? C.primary : 'transparent', color: item.active ? 'white' : C.outlineVariant, borderRadius: 9999, padding: '8px 20px', textDecoration: 'none', transition: 'all 0.3s ease' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: item.active ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 500, marginTop: 4 }}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
