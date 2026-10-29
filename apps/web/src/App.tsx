import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Atom, Check, Code2, Menu, Sparkles, Users, X } from 'lucide-react';
import TrustStories from './TrustStories';

type College = { _id: string; name: string; city?: string; state?: string };
type FormState = { fullName: string; email: string; actualCollegeName: string; branch: string; academicYear: string; consent: boolean };

const api = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const initial: FormState = { fullName: '', email: '', actualCollegeName: '', branch: '', academicYear: '', consent: false };
const splineSceneUrl = import.meta.env.VITE_SPLINE_SCENE_URL?.trim() || '';

function SplineStage() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!splineSceneUrl || !host.current) return;
    const viewer = document.createElement('spline-viewer');
    viewer.setAttribute('url', splineSceneUrl);
    viewer.setAttribute('loading', 'lazy');
    host.current.appendChild(viewer);
    return () => viewer.remove();
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty('--rotate-x', `${-y * 9}deg`);
    event.currentTarget.style.setProperty('--rotate-y', `${x * 12}deg`);
  };

  const resetPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--rotate-x', '0deg');
    event.currentTarget.style.setProperty('--rotate-y', '0deg');
  };

  return (
    <div className="hero-art spline-stage" ref={host} aria-label="Interactive 3D AI scene" onPointerMove={handlePointerMove} onPointerLeave={resetPointer}>
      <div className="spline-fallback" aria-hidden="true">
        <div className="hero-build-scene">
          <span className="build-ribbon ribbon-a" /><span className="build-ribbon ribbon-b" />
          <span className="hero-node hero-node-a" /><span className="hero-node hero-node-b" /><span className="hero-node hero-node-c" />
          <div className="laptop-parallax">
            <div className="build-laptop">
              <div className="laptop-screen">
                <div className="screen-top"><i /><i /><i /><span /></div>
                <div className="screen-workspace">
                  <div className="screen-ai-core"><span /></div>
                  <div className="screen-panels">
                    <div className="screen-panel panel-wide"><i /><i /><i /><i /></div>
                    <div className="screen-panel panel-small"><i /><i /><i /></div>
                  </div>
                  <div className="screen-chart"><i /><i /><i /><i /><i /></div>
                </div>
              </div>
              <div className="laptop-base" />
            </div>
          </div>
        </div>
        <div className="spline-caption">IDEA IN PROGRESS</div>
      </div>
    </div>
  );
}

function App() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activePrinciple, setActivePrinciple] = useState<number | null>(null);
  const [activeWorkshopStep, setActiveWorkshopStep] = useState(0);
  const referral = new URLSearchParams(window.location.search).get('ref') || sessionStorage.getItem('arena_ref') || '';

  useEffect(() => {
    if (referral) sessionStorage.setItem('arena_ref', referral);
    fetch(`${api}/public/colleges`)
      .then(response => response.ok ? response.json() : { colleges: [] })
      .then(data => setColleges(data.colleges || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const trackPointer = (event: PointerEvent) => {
      document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`);
    };
    window.addEventListener('pointermove', trackPointer, { passive: true });
    return () => window.removeEventListener('pointermove', trackPointer);
  }, []);

  const goRegister = () => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' });
  const update = (key: keyof FormState, value: string | boolean) => setForm(current => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const response = await fetch(`${api}/public/registrations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, referralCode: referral || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'We could not complete your registration. Please try again.');
      setMessage(`You're in! Your registration ID is ${data.registrationId}. Look out for a confirmation email.`);
      setForm(initial);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Registration is temporarily unavailable. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  }

  const closeMenu = () => setMobileOpen(false);
  const togglePrinciple = (index: number) => setActivePrinciple(current => current === index ? null : index);
  const handlePrincipleKey = (event: React.KeyboardEvent<HTMLElement>, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      togglePrinciple(index);
    }
  };

  return (
    <>
      <header className="nav">
        <a className="brand" href="#top" aria-label="NxtWave home"><span className="brand-mark"><Atom size={21} /></span><span>NxtWave <b>&times;</b> AI PROJECT ARENA</span></a>
        <button className="menu-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen ? <X /> : <Menu />}</button>
        <nav className={mobileOpen ? 'nav-links open' : 'nav-links'}>
          <a href="#experience" onClick={closeMenu}>The experience</a><a href="#format" onClick={closeMenu}>How it works</a><a href="/admin">Organizer sign in</a>
          <button className="button button-dark nav-cta" onClick={() => { closeMenu(); goRegister(); }}>Register <ArrowUpRight size={15} /></button>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-grid" />
          <div className="hero-copy">
            <div className="eyebrow light"><span className="pulse" /> For 4th-year B.Tech students</div>
            <h1>Your AI Skills.<br /><em>One Hour.</em><br /><span className="hero-title-accent">A &#8377;1,000 Challenge.</span></h1>
            <p className="hero-desc">Step into the arena, build under pressure, and show what you can create with AI.</p>
            <div className="hero-claims"><span>4th-year B.Tech students</span><span>60-minute challenge</span><span>&#8377;1,000 reward*</span></div>
            <p className="hero-reward-note">*Reward eligibility and selection details will be announced before the challenge.</p>
            <div className="hero-actions"><button className="button button-lime" onClick={goRegister}>Register for the Challenge <ArrowRight size={16} /></button><a className="text-link light-link" href="#experience">Explore the experience <ArrowDown size={15} /></a></div>
            <div className="hero-note"><span className="note-icon"><Sparkles size={16} /></span><span>Know the fundamentals?<br /><small>You do not need to be an AI expert.</small></span></div>
          </div>
          <SplineStage />
          <div className="hero-footer"><span>LEARN BY BUILDING</span><span className="footer-line" /><span>01 / 03</span></div>
        </section>

        <section className="intro section-pad" id="experience">
          <div className="intro-content"><h2>You have learned the concepts.<br /><em>But can you build?</em></h2><div className="intro-copy"><p>You have studied Python, explored AI concepts and completed coursework. When it is time to build a working application, knowing where to start can be the hardest part.</p><p>That gap between understanding AI and building with AI is fixable. The challenge gives you a practical place to start.</p><a href="#format" className="text-link">See how it works <ArrowRight size={15} /></a></div></div>
          <div className="principles">
            <article role="button" tabIndex={0} aria-expanded={activePrinciple === 1} onClick={() => togglePrinciple(1)} onKeyDown={event => handlePrincipleKey(event, 1)}><span className="principle-number">01</span><div className="principle-icon"><Code2 /></div><h3>Connect the pieces</h3><p>You understand the fundamentals. Practice turning them into a complete application.</p>{activePrinciple === 1 && <p className="principle-detail">Start with one problem and outline what a useful first version should do.</p>}<span className="principle-action">{activePrinciple === 1 ? 'Close' : 'Explore this step'}</span></article>
            <article role="button" tabIndex={0} aria-expanded={activePrinciple === 2} onClick={() => togglePrinciple(2)} onKeyDown={event => handlePrincipleKey(event, 2)}><span className="principle-number">02</span><div className="principle-icon"><Atom /></div><h3>Move beyond tutorials</h3><p>Try your approach when the problem changes, not only when a tutorial gives each next step.</p>{activePrinciple === 2 && <p className="principle-detail">Connect programming and AI fundamentals into a first working version.</p>}<span className="principle-action">{activePrinciple === 2 ? 'Close' : 'Explore this step'}</span></article>
            <article role="button" tabIndex={0} aria-expanded={activePrinciple === 3} onClick={() => togglePrinciple(3)} onKeyDown={event => handlePrincipleKey(event, 3)}><span className="principle-number">03</span><div className="principle-icon"><Users /></div><h3>Show your practical work</h3><p>Build something you can explain and demonstrate in a technical conversation.</p>{activePrinciple === 3 && <p className="principle-detail">Explain your approach, get another perspective, and identify what to improve.</p>}<span className="principle-action">{activePrinciple === 3 ? 'Close' : 'Explore this step'}</span></article>
          </div>
        </section>

        <section className="audience-section section-pad" id="who"><div className="section-kicker">WHO SHOULD TAKE THE CHALLENGE <span>- 02</span></div><div className="audience-layout"><div><h2>Built for final-year students ready to <em>level up.</em></h2><p>This challenge is designed for 4th-year B.Tech students who know programming and AI fundamentals and want more hands-on building experience.</p></div><div className="audience-checklist"><h3>You may be a good fit if you</h3><ul><li>Know Python or programming basics.</li><li>Have studied introductory AI or machine learning.</li><li>Want to turn concepts into a working project.</li><li>Are looking for practical experience to discuss and demonstrate.</li></ul><p>You do not need to be an AI expert. Exact branch eligibility will be confirmed in the event details.</p></div></div></section>

        <section className="manifesto" id="format"><div className="manifesto-mark"><div className="challenge-sequence" role="group" aria-label="Challenge stages"><div className="sequence-screen" aria-live="polite"><span className="sequence-screen-label">60 MINUTE CHALLENGE</span><strong>01 <i>/ 04</i></strong><div className="sequence-progress"><span style={{ width: `${(activeWorkshopStep + 1) * 25}%` }} /></div><b className="sequence-current">{['THINK', 'BUILD', 'TEST', 'SUBMIT'][activeWorkshopStep]}</b></div><div className="sequence-steps">{['Think', 'Build', 'Test', 'Submit'].map((step, index) => <button type="button" key={step} className={activeWorkshopStep === index ? 'sequence-step active' : 'sequence-step'} aria-pressed={activeWorkshopStep === index} onClick={() => setActiveWorkshopStep(index)}><span>0{index + 1}</span>{step}</button>)}</div><span className="mark-label">BUILD / LEARN / REPEAT</span></div></div><div className="manifesto-text"><div className="section-kicker light">HOW THE CHALLENGE WORKS <span>- 03</span></div><h2>One challenge.<br /><em>Something you build.</em></h2><p>Move beyond watching tutorials. Work through a focused problem, build a solution, and see what you can make with the AI concepts you already know.</p><div className="format-points"><div><span>01</span><p><b>Think</b><br />Understand the problem and plan your approach.</p></div><div><span>02</span><p><b>Build</b><br />Apply AI concepts to create a first solution.</p></div><div><span>03</span><p><b>Test</b><br />Check how it works and refine your approach.</p></div><div><span>04</span><p><b>Submit</b><br />Share your work using the announced instructions and criteria.</p></div></div><button className="button button-lime" onClick={goRegister}>I am interested <ArrowRight size={16} /></button></div></section>

        <TrustStories />

        <section className="register-section" id="register"><div className="register-aside"><div className="register-art" aria-hidden="true"><span className="gift-light" /><span className="gift-box" /><span className="gift-lid" /><span className="gift-card gift-card-one" /><span className="gift-card gift-card-two" /><i className="gift-spark gift-spark-one" /><i className="gift-spark gift-spark-two" /><i className="gift-spark gift-spark-three" /></div><div className="section-kicker">YOUR NEXT STEP <span>- 03</span></div><h2>You have learned enough to take the first step. <em>Now build.</em></h2><p>Put your fundamentals to work. Take on the AI challenge and see what you can create.</p></div><div className="form-wrap"><form className="register-form" onSubmit={submit}><div className="form-heading"><span>REGISTRATION</span><span className="required-note">* Required</span></div>{message && <div className={message.startsWith("You're in!") ? 'form-message success' : 'form-message error'} role="status">{message}</div>}<label>Full name <b>*</b><input required minLength={2} maxLength={100} autoComplete="name" value={form.fullName} onChange={event => update('fullName', event.target.value)} placeholder="Your name" /></label><div className="form-row"><label>Email address <b>*</b><input type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={event => update('email', event.target.value)} placeholder="you@example.com" /></label><label>College / university <b>*</b><input required list="approved-colleges" maxLength={160} autoComplete="organization" value={form.actualCollegeName} onChange={event => update('actualCollegeName', event.target.value)} placeholder="Type your college name" /><datalist id="approved-colleges">{colleges.map(college => <option key={college._id} value={college.name} />)}</datalist><small className="college-hint">Type your college name, then choose a suggestion or enter it yourself.</small></label></div><div className="form-row"><label>Branch / specialization <b>*</b><input required maxLength={100} value={form.branch} onChange={event => update('branch', event.target.value)} placeholder="e.g. Computer Science" /></label><label>Current academic year <b>*</b><select required value={form.academicYear} onChange={event => update('academicYear', event.target.value)}><option value="">Select year</option><option>4th year</option></select></label></div><label className="consent"><input type="checkbox" required checked={form.consent} onChange={event => update('consent', event.target.checked)} /><span>I consent to being contacted about this event. My details will be used to manage my registration. <b>*</b></span></label>{referral && <div className="referral-chip"><Check size={15} /> Ambassador referral applied</div>}<button className="button button-dark submit-button" disabled={loading}>{loading ? 'Sending…' : <>Register for AI Project Arena <ArrowRight size={16} /></>}</button><p className="form-footnote">We will only use your details to manage your event registration.</p></form></div></section>
      </main>

      <footer><div className="footer-top"><a className="brand footer-brand" href="#top"><span className="brand-mark"><Atom size={20} /></span><span>NxtWave <b>&times;</b> AI PROJECT ARENA</span></a><span className="footer-signoff">Make something that matters.</span><a className="back-top" href="#top">Back to top <ArrowUpRight size={15} /></a></div><div className="footer-bottom"><span>2026 NxtWave. All rights reserved.</span><span>Your information is used only to manage this event registration.</span><span>Organizer contact details will be published before the event.</span></div></footer>
    </>
  );
}

export default App;
