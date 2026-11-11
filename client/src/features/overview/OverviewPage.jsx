import React from 'react';
import {
  ArrowUpRight, BriefcaseBusiness, CalendarDays, GraduationCap,
  Handshake, Network, Users
} from 'lucide-react';

// Feature owner: Unnati — shared landing page and desktop app navigation.
export default function OverviewPage({ stats, setTab }) {
  return (
    <>
      <section className="hero">
        <div>
          <span className="hero-kicker">A COMMUNITY THAT MOVES YOU FORWARD</span>
          <h2>One network.<br /><em>Endless possibilities.</em></h2>
          <p>Reconnect with your batch, learn from experiences and discover what is next.</p>
          <button onClick={() => setTab('Alumni Directory')}>Explore alumni <ArrowUpRight size={15} /></button>
        </div>
        <div className="hero-orbit">
          <div className="orbit-ring ring-a" />
          <div className="orbit-ring ring-b" />
          <div className="orbit-core"><Network size={34} /></div>
          <div className="orbit-bubble bubble-a"><Users /></div>
          <div className="orbit-bubble bubble-b"><BriefcaseBusiness /></div>
          <div className="orbit-bubble bubble-c"><GraduationCap /></div>
        </div>
      </section>

      <div className="stats">
        {stats.map(([label, value, Icon, color]) => (
          <div className="stat" key={label}>
            <span className={'stat-icon ' + color}><Icon size={18} /></span>
            <div><strong>{value}</strong><small>{label}</small></div>
          </div>
        ))}
      </div>

      <div className="section-heading">
        <div><h3>Explore your community</h3><p>Find people and opportunities that can help you grow.</p></div>
      </div>
      <div className="quick-links">
        <button onClick={() => setTab('Alumni Directory')}>
          <Users /><strong>Alumni directory</strong><span>Discover alumni by batch and career</span><ArrowUpRight />
        </button>
        <button onClick={() => setTab('Mentorship')}>
          <Handshake /><strong>Find a mentor</strong><span>Learn directly from experience</span><ArrowUpRight />
        </button>
        <button onClick={() => setTab('Opportunities')}>
          <BriefcaseBusiness /><strong>Career opportunities</strong><span>Explore internships shared by alumni</span><ArrowUpRight />
        </button>
        <button onClick={() => setTab('Events')}>
          <CalendarDays /><strong>Community events</strong><span>Connect at upcoming gatherings</span><ArrowUpRight />
        </button>
      </div>
    </>
  );
}
