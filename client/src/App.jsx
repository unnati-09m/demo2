import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, Bell, BriefcaseBusiness, Building2, CalendarDays, Check,
  ChevronDown, Clock3, FileDown, GraduationCap, Handshake, HeartHandshake,
  LayoutDashboard, LogOut, MapPin, Menu, Moon, Network, Plus, Search, Sun, Users, X
} from 'lucide-react';
import OverviewPage from './features/overview/OverviewPage.jsx';
import { AlumniDirectoryPage, ProfilePage } from './features/alumni/AlumniPages.jsx';
import { ApplicationsPage, OpportunitiesPage } from './features/opportunities/OpportunityPages.jsx';
import {
  AdminReportsPage, EventsPage, MentorshipPage, NotificationsPage
} from './features/engagement/EngagementPages.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function api(path, token, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const dateText = value => value ? new Date(value).toLocaleDateString() : 'Not specified';

// Shared React shell. Feature sections are marked below by their owner for team hand-off.
// Feature owner: Unnati — authentication, desktop integration and app-wide navigation.
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('ac_token') || '');
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ac_user') || 'null'); } catch { return null; }
  });
  const [tab, setTab] = useState('Overview');
  const [modal, setModal] = useState('');
  const [form, setForm] = useState({});
  const [login, setLogin] = useState({ email: 'student@alumniconnect.test', password: 'Demo@123' });
  const [register, setRegister] = useState({ name: '', email: '', password: '', role: 'student' });
  const [profile, setProfile] = useState({});
  const [dashboard, setDashboard] = useState({});
  const [alumni, setAlumni] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [events, setEvents] = useState([]);
  const [mentorship, setMentorship] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [adminSummary, setAdminSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState('light');

  // Load preferences through Electron Preload. Browser fallback is useful for UI development.
  useEffect(() => {
    let active = true;
    const loadPreferences = async () => {
      try {
        const saved = window.desktop?.getPreferences
          ? await window.desktop.getPreferences()
          : JSON.parse(localStorage.getItem('ac_preferences') || '{}');
        if (active) setTheme(saved.theme === 'dark' ? 'dark' : 'light');
      } catch {
        if (active) setTheme('light');
      }
    };
    loadPreferences();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    const preferences = { theme: nextTheme };
    try {
      if (window.desktop?.savePreferences) await window.desktop.savePreferences(preferences);
      else localStorage.setItem('ac_preferences', JSON.stringify(preferences));
    } catch (err) {
      setError('Could not save display preference: ' + err.message);
    }
  };

  // Electron sends these actions when the user presses a registered desktop shortcut.
  useEffect(() => {
    const removeListener = window.desktop?.onShortcut?.((action) => {
      if (action === 'focus-search') document.getElementById('global-search')?.focus();
      if (action === 'open-events') setTab('Events');
    });
    return () => removeListener?.();
  }, []);

  // Show only notifications that arrived after this account's previous app visit.
  useEffect(() => {
    if (!token || !user || !notifications.length || !window.desktop?.showNotification) return;
    const key = 'ac_last_notification_' + user.id;
    const newestId = Math.max(...notifications.map(item => Number(item.id) || 0));
    const previousId = localStorage.getItem(key);
    if (previousId === null) {
      localStorage.setItem(key, String(newestId));
      return;
    }
    const newestUnread = notifications
      .filter(item => !item.is_read && Number(item.id) > Number(previousId))
      .sort((a, b) => Number(b.id) - Number(a.id))[0];
    if (newestUnread) {
      window.desktop.showNotification({ title: newestUnread.title, body: newestUnread.body });
    }
    localStorage.setItem(key, String(Math.max(Number(previousId), newestId)));
  }, [notifications, token, user]);

  const logout = () => {
    localStorage.removeItem('ac_token');
    localStorage.removeItem('ac_user');
    setToken('');
    setUser(null);
    setTab('Overview');
  };

  const loadData = async () => {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const [dash, people, jobs, eventList, requests, notices, me] = await Promise.all([
        api('/dashboard', token),
        api('/alumni', token),
        api('/opportunities', token),
        api('/events', token),
        api('/mentorship', token),
        api('/notifications', token),
        api('/profile', token)
      ]);
      setDashboard(dash);
      setAlumni(people);
      setOpportunities(jobs);
      setEvents(eventList);
      setMentorship(requests);
      setNotifications(notices);
      setProfile(me || {});
      if (user?.role === 'student') setApplications(await api('/my-applications', token));
      if (user?.role === 'admin') setAdminSummary(await api('/admin/summary', token));
    } catch (err) {
      setError(err.message);
      if (err.message.toLowerCase().includes('session')) logout();
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (token) loadData(); }, [token]);

  const authenticate = async (payload, mode) => {
    setError('');
    try {
      const result = await api('/auth/' + mode, '', { method: 'POST', body: JSON.stringify(payload) });
      localStorage.setItem('ac_token', result.token);
      localStorage.setItem('ac_user', JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
    } catch (err) { setError(err.message); }
  };

  const action = async (path, method = 'POST', body = {}) => {
    setError('');
    setSuccess('');
    try {
      await api(path, token, { method, body: JSON.stringify(body) });
      setSuccess('Saved successfully.');
      setModal('');
      await loadData();
    } catch (err) { setError(err.message); }
  };

  const openModal = (name, values = {}) => {
    setForm(values);
    setModal(name);
    setError('');
  };

  const setValue = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const navigation = [
    ['Overview', LayoutDashboard],
    ['Alumni Directory', Users],
    ['Mentorship', Handshake],
    ['Opportunities', BriefcaseBusiness],
    ['Events', CalendarDays],
    ...(user?.role === 'student' ? [['My Applications', FileDown]] : []),
    ['My Profile', GraduationCap],
    ['Notifications', Bell],
    ...(user?.role === 'admin' ? [['Admin Reports', FileDown]] : [])
  ];

  const filteredAlumni = useMemo(() => alumni.filter(person =>
    [person.name, person.company, person.department, person.job_title, person.graduation_year]
      .join(' ').toLowerCase().includes(search.toLowerCase())
  ), [alumni, search]);

  const saveProfile = async event => {
    event.preventDefault();
    const payload = { ...form };
    if (payload.skillsText !== undefined) {
      payload.skills = payload.skillsText.split(',').map(item => item.trim()).filter(Boolean);
      delete payload.skillsText;
    }
    await action('/profile', 'PUT', payload);
  };

  // Feature owner: Arshiyan — export alumni directory data as CSV.
  const downloadCsv = async () => {
    try {
      const response = await fetch(API + '/admin/alumni.csv', { headers: { Authorization: 'Bearer ' + token } });
      if (!response.ok) throw new Error('Could not download the report.');
      const csvText = await response.text();

      // On desktop, ask the operating system where the report should be saved.
      if (window.desktop?.saveAlumniCsv) {
        const result = await window.desktop.saveAlumniCsv(csvText);
        if (!result.canceled) setSuccess('Alumni report saved successfully.');
        return;
      }

      // Browser fallback keeps the same page usable during web development.
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'alumni-report.csv';
      link.click();
      URL.revokeObjectURL(url);
      setSuccess('Alumni report downloaded.');
    } catch (err) { setError(err.message); }
  };

  if (!token || !user) {
    return (
      <div className="auth-layout">
        <section className="auth-visual">
          <div className="brand brand-light"><span className="brand-mark"><Network size={20} /></span> alumni<span>connect</span></div>
          <div className="auth-message">
            <span className="eyebrow">YOUR COMMUNITY, BEYOND CAMPUS</span>
            <h1>Good things<br />happen when<br /><em>we connect.</em></h1>
            <p>Find mentors, share opportunities and stay connected with the people who make your institution special.</p>
            <div className="visual-note"><HeartHandshake size={17} /> A lifelong network starts here.</div>
          </div>
          <small className="visual-footer">ALUMNICONNECT · COMMUNITY EDITION</small>
        </section>
        <section className="auth-side">
          <div className="auth-card">
            <span className="mobile-brand"><Network size={19} /> AlumniConnect</span>
            <span className="eyebrow">WELCOME TO YOUR NETWORK</span>
            <h2>{modal === 'register' ? 'Create your account' : 'Welcome back'}</h2>
            <p className="muted">{modal === 'register' ? 'Join your alumni and student community.' : 'Sign in to continue to your community.'}</p>
            {error && <div className="alert">{error}</div>}
            {modal === 'register' ? (
              <form onSubmit={event => { event.preventDefault(); authenticate(register, 'register'); }}>
                <label>Full name<input required value={register.name} onChange={e => setRegister({ ...register, name: e.target.value })} placeholder="Your name" /></label>
                <label>Email address<input type="email" required value={register.email} onChange={e => setRegister({ ...register, email: e.target.value })} placeholder="you@example.com" /></label>
                <label>Password<input type="password" minLength="8" required value={register.password} onChange={e => setRegister({ ...register, password: e.target.value })} placeholder="At least 8 characters" /></label>
                <label>Account type<select value={register.role} onChange={e => setRegister({ ...register, role: e.target.value })}><option value="student">Current student</option><option value="alumni">Alumni</option></select></label>
                <button className="button button-primary full">Create account</button>
              </form>
            ) : (
              <form onSubmit={event => { event.preventDefault(); authenticate(login, 'login'); }}>
                <label>Email address<input type="email" required value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })} /></label>
                <label>Password<input type="password" required value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} /></label>
                <button className="button button-primary full">Sign in <ArrowUpRight size={16} /></button>
              </form>
            )}
            <p className="switch-auth">{modal === 'register' ? 'Already a member?' : 'New to the community?'} <button onClick={() => { setError(''); setModal(modal === 'register' ? '' : 'register'); }}>{modal === 'register' ? 'Sign in' : 'Create an account'}</button></p>
            <div className="demo-box"><strong>Demo accounts</strong><br />Student: student@alumniconnect.test<br />Alumni: alumni@alumniconnect.test<br />Admin: admin@alumniconnect.test<br />Password: Demo@123</div>
          </div>
        </section>
      </div>
    );
  }

  const pageCopy = {
    Overview: ['Good to see you, ' + user.name.split(' ')[0], 'Here is what is happening in your alumni community.'],
    'Alumni Directory': ['Alumni directory', 'Find people, experiences and career paths.'],
    Mentorship: ['Mentorship', 'Build meaningful connections across batches.'],
    Opportunities: ['Career opportunities', 'Discover opportunities shared by your alumni.'],
    Events: ['Community events', 'Meet, learn and reconnect.'],
    'My Applications': ['My applications', 'Track the opportunities you have applied to.'],
    'My Profile': ['Your profile', 'Keep your community profile up to date.'],
    Notifications: ['Notifications', 'Updates from your community.'],
    'Admin Reports': ['Community reports', 'A quick overview of your growing network.']
  }[tab];

  const stats = [
    ['Alumni members', dashboard.alumni || 0, Users, 'purple'],
    ['Current students', dashboard.students || 0, GraduationCap, 'blue'],
    ['Opportunities', dashboard.opportunities || 0, BriefcaseBusiness, 'orange'],
    ['Upcoming events', dashboard.upcomingEvents || 0, CalendarDays, 'green']
  ];

  return (
    <div className="app-shell">
      <aside className={mobileOpen ? "sidebar open" : "sidebar"}>
        <div className="brand"><span className="brand-mark"><Network size={20} /></span> alumni<span>connect</span></div>
        <div className="workspace"><div className="workspace-icon">AC</div><div><strong>Alumni Community</strong><small>Community workspace</small></div></div>
        <div className="nav-caption">WORKSPACE</div>
        <nav>{navigation.map(([name, Icon]) => (
          <button key={name} className={'nav-item ' + (tab === name ? 'active' : '')} onClick={() => { setTab(name); setMobileOpen(false); }}>
            <Icon size={17} /> {name}
            {name === 'Notifications' && notifications.some(item => !item.is_read) && <span className="nav-dot" />}
          </button>
        ))}</nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><HeartHandshake size={19} /><strong>Stay connected</strong><p>Your next opportunity could start with a conversation.</p><button onClick={() => setTab('Mentorship')}>Explore mentorship <ArrowUpRight size={13} /></button></div>
          <div className="account-row"><div className="avatar">{initials(user.name)}</div><div className="account-text"><strong>{user.name}</strong><small>{user.role}</small></div><button className="icon-button" title="Log out" onClick={logout}><LogOut size={17} /></button></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation"><Menu size={20} /></button>
          <div className="breadcrumb">Community <span>/</span> {tab}</div>
          <div className="top-actions">
            <div className="search-field"><Search size={15} /><input id="global-search" placeholder="Search alumni..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <button className="icon-button" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="icon-button" onClick={() => setTab('Notifications')} title="Notifications"><Bell size={18} /></button>
            <div className="avatar">{initials(user.name)}</div>
          </div>
        </header>

        <div className="page">
          <div className="page-title">
            <div><span className="eyebrow">ALUMNI COMMUNITY</span><h1>{pageCopy[0]}</h1><p>{pageCopy[1]}</p></div>
            <div className="title-actions">
              {user.role !== 'student' && tab === 'Opportunities' && <button className="button button-primary" onClick={() => openModal('opportunity')}><Plus size={15} /> Post opportunity</button>}
              {user.role !== 'student' && tab === 'Events' && <button className="button button-primary" onClick={() => openModal('event')}><Plus size={15} /> Create event</button>}
              {user.role === 'alumni' && tab === 'My Profile' && <button className="button button-outline" onClick={() => openModal('pledge')}><HeartHandshake size={15} /> Pledge support</button>}
            </div>
          </div>

          {error && <div className="alert">{error}</div>}
          {success && <div className="success">{success}</div>}
          {busy && <div className="loading-line">Refreshing community information…</div>}

          {tab === 'Overview' && <OverviewPage stats={stats} setTab={setTab} />}

          {/* Feature owner: Arshiyan — alumni profile directory, search and mentorship entry point. */}
          {tab === 'Alumni Directory' && <AlumniDirectoryPage filteredAlumni={filteredAlumni} user={user} openModal={openModal} />}

          {/* Feature owner: Nayan Jyoti — mentorship requests and response workflow. */}
          {tab === 'Mentorship' && <MentorshipPage mentorship={mentorship} user={user} action={action} />}

          {/* Feature owner: Arshiyan — career opportunities and student applications. */}
          {tab === 'Opportunities' && <OpportunitiesPage opportunities={opportunities} user={user} action={action} />}

          {/* Feature owner: Arshiyan — students' submitted opportunity applications. */}
          {tab === 'My Applications' && <ApplicationsPage applications={applications} />}

          {/* Feature owner: Nayan Jyoti — events, registrations and attendee counts. */}
          {tab === 'Events' && <EventsPage events={events} action={action} />}

          {tab === 'My Profile' && <ProfilePage profile={profile} user={user} form={form} setValue={setValue} saveProfile={saveProfile} openModal={openModal} />}

          {/* Feature owner: Nayan Jyoti — in-app notifications and read state. */}
          {tab === 'Notifications' && <NotificationsPage notifications={notifications} action={action} />}

          {/* Feature owner: Nayan Jyoti — admin engagement summaries and report views. */}
          {tab === 'Admin Reports' && user.role === 'admin' && <AdminReportsPage stats={stats} adminSummary={adminSummary} downloadCsv={downloadCsv} />}
        </div>
      </main>

      {modal && <div className="modal-backdrop" onMouseDown={() => setModal('')}><div className="modal" onMouseDown={event => event.stopPropagation()}>
        <button className="modal-close icon-button" onClick={() => setModal('')}><X size={18} /></button>
        <span className="eyebrow">ALUMNICONNECT</span>
        <h2>{modal === 'mentorship' ? 'Request mentorship' : modal === 'event' ? 'Create a community event' : modal === 'pledge' ? 'Pledge support' : 'Share an opportunity'}</h2>
        {modal === 'mentorship' && <form onSubmit={event => { event.preventDefault(); action('/mentorship', 'POST', form); }}>
          <label>Alumni member<select required value={form.alumni_id || ''} onChange={e => setValue('alumni_id', e.target.value)}><option value="">Select an alumnus</option>{alumni.map(person => <option key={person.id} value={person.id}>{person.name} · {person.company || person.department}</option>)}</select></label>
          <label>Mentorship topic<input required value={form.topic || ''} onChange={e => setValue('topic', e.target.value)} placeholder="Career guidance, interview preparation..." /></label>
          <label>Message<textarea value={form.message || ''} onChange={e => setValue('message', e.target.value)} placeholder="Tell them what guidance you need." /></label>
          <button className="button button-primary full">Send request</button>
        </form>}
        {modal === 'opportunity' && <form onSubmit={event => { event.preventDefault(); action('/opportunities', 'POST', form); }}>
          <label>Opportunity title<input required value={form.title || ''} onChange={e => setValue('title', e.target.value)} /></label>
          <label>Company<input required value={form.company || ''} onChange={e => setValue('company', e.target.value)} /></label>
          <label>Type<select value={form.type || 'internship'} onChange={e => setValue('type', e.target.value)}><option value="internship">Internship</option><option value="job">Job</option><option value="project">Project</option></select></label>
          <label>Location<input value={form.location || 'Remote'} onChange={e => setValue('location', e.target.value)} /></label>
          <label>Application deadline<input type="date" value={form.apply_by || ''} onChange={e => setValue('apply_by', e.target.value)} /></label>
          <label>Application URL<input type="url" value={form.application_url || ''} onChange={e => setValue('application_url', e.target.value)} /></label>
          <label>Description<textarea required value={form.description || ''} onChange={e => setValue('description', e.target.value)} /></label>
          <button className="button button-primary full">Publish opportunity</button>
        </form>}
        {modal === 'event' && <form onSubmit={event => { event.preventDefault(); action('/events', 'POST', form); }}>
          <label>Event name<input required value={form.title || ''} onChange={e => setValue('title', e.target.value)} /></label>
          <label>Description<textarea value={form.description || ''} onChange={e => setValue('description', e.target.value)} /></label>
          <label>Venue<input value={form.venue || 'Campus'} onChange={e => setValue('venue', e.target.value)} /></label>
          <label>Date and time<input type="datetime-local" required value={form.starts_at || ''} onChange={e => setValue('starts_at', e.target.value)} /></label>
          <button className="button button-primary full">Create event</button>
        </form>}
        {modal === 'pledge' && <form onSubmit={event => { event.preventDefault(); action('/donation-pledges', 'POST', form); }}>
          <label>Amount (₹)<input type="number" min="1" required value={form.amount || ''} onChange={e => setValue('amount', e.target.value)} /></label>
          <label>Purpose<input required value={form.purpose || ''} onChange={e => setValue('purpose', e.target.value)} placeholder="Student scholarships, lab support..." /></label>
          <label>Note<textarea value={form.note || ''} onChange={e => setValue('note', e.target.value)} /></label>
          <p className="form-note">This records an expression of interest only. No money is collected or transferred.</p>
          <button className="button button-primary full">Save pledge interest</button>
        </form>}
      </div></div>}
    </div>
  );
}
