import React from 'react';
import {
  ArrowUpRight, BriefcaseBusiness, Building2, Clock3,
  FileDown, GraduationCap, MapPin, Plus, HeartHandshake
} from 'lucide-react';

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const dateText = value => value ? new Date(value).toLocaleDateString() : 'Not specified';

// Feature owner: Arshiyan — alumni profile directory and search results.
export function AlumniDirectoryPage({ filteredAlumni, user, openModal }) {
  return (
    <>
      <div className="section-heading">
        <div><h3>{filteredAlumni.length} alumni found</h3><p>Search using an alumni name, department, batch or company.</p></div>
      </div>
      <div className="people-grid">
        {filteredAlumni.map(person => (
          <article className="person-card" key={person.id}>
            <div className="person-head">
              <div className="person-avatar">{initials(person.name)}</div>
              <span className="tag">Class of {person.graduation_year}</span>
            </div>
            <h3>{person.name}</h3>
            <p className="person-role">{person.job_title || 'Alumni member'} {person.company ? 'at ' + person.company : ''}</p>
            <div className="person-meta">
              <span><GraduationCap size={14} /> {person.department}</span>
              <span><MapPin size={14} /> {person.location || 'Not specified'}</span>
            </div>
            <p className="person-bio">{person.bio || 'Open to connecting with students and fellow alumni.'}</p>
            {person.skills?.length > 0 && (
              <div className="chips">{person.skills.slice(0, 4).map(skill => <span key={skill}>{skill}</span>)}</div>
            )}
            {user.role === 'student' && (
              <button
                className="button button-outline full"
                onClick={() => openModal('mentorship', { alumni_id: person.id, topic: 'Career guidance', message: '' })}
              >
                Request mentorship <ArrowUpRight size={14} />
              </button>
            )}
            {person.linkedin_url && (
              <a className="profile-link" href={person.linkedin_url} target="_blank" rel="noreferrer">
                LinkedIn profile <ArrowUpRight size={13} />
              </a>
            )}
          </article>
        ))}
        {!filteredAlumni.length && <div className="empty">No matching alumni found. Try another search.</div>}
      </div>
    </>
  );
}

// Feature owner: Arshiyan — career opportunities and student applications.
export function OpportunitiesPage({ opportunities, user, action }) {
  return (
    <div className="opportunity-list">
      {opportunities.map(item => (
        <article className="opportunity-card" key={item.id}>
          <div className="opportunity-icon"><BriefcaseBusiness size={20} /></div>
          <div className="opportunity-copy">
            <span className="eyebrow">{item.type} · {item.location}</span>
            <h3>{item.title}</h3>
            <p className="company"><Building2 size={14} /> {item.company} · Shared by {item.posted_by}</p>
            <p>{item.description}</p>
            {item.apply_by && <small><Clock3 size={13} /> Apply by {dateText(item.apply_by)}</small>}
            {item.application_url && (
              <a href={item.application_url} target="_blank" rel="noreferrer">
                External application link <ArrowUpRight size={13} />
              </a>
            )}
          </div>
          {user.role === 'student' && (
            <button className="button button-primary" onClick={() => action('/opportunities/' + item.id + '/apply', 'POST', {})}>
              Apply <ArrowUpRight size={14} />
            </button>
          )}
        </article>
      ))}
      {!opportunities.length && <div className="empty">No opportunities have been posted yet.</div>}
    </div>
  );
}

// Feature owner: Arshiyan — student application history.
export function ApplicationsPage({ applications }) {
  return (
    <div className="list-card">
      {applications.length ? applications.map(item => (
        <div className="list-row" key={item.id}>
          <div className="list-icon"><BriefcaseBusiness size={17} /></div>
          <div className="list-copy">
            <strong>{item.title}</strong>
            <small>{item.company} · {item.location} · Applied {dateText(item.created_at)}</small>
          </div>
          <span className={'status ' + item.status}>{item.status}</span>
        </div>
      )) : <div className="empty">You have not applied to any opportunities yet.</div>}
    </div>
  );
}

// Feature owner: Arshiyan — alumni career and education profile editor.
export function ProfilePage({ profile, user, form, setValue, saveProfile, openModal }) {
  return (
    <div className="profile-card">
      <div className="profile-cover" />
      <div className="profile-heading">
        <div className="profile-avatar">{initials(profile.name || user.name)}</div>
        <div><h2>{profile.name || user.name}</h2><p>{profile.role} · {profile.email}</p></div>
      </div>
      <form className="profile-form" onSubmit={saveProfile}>
        <div className="form-grid">
          <label>Full name
            <input value={form.name ?? profile.name ?? ''} onChange={e => setValue('name', e.target.value)} />
          </label>
          {user.role === 'alumni' && (
            <>
              <label>Graduation year
                <input type="number" value={form.graduation_year ?? profile.graduation_year ?? ''} onChange={e => setValue('graduation_year', e.target.value)} />
              </label>
              <label>Department
                <input value={form.department ?? profile.department ?? ''} onChange={e => setValue('department', e.target.value)} />
              </label>
              <label>Degree
                <input value={form.degree ?? profile.degree ?? ''} onChange={e => setValue('degree', e.target.value)} />
              </label>
              <label>Company
                <input value={form.company ?? profile.company ?? ''} onChange={e => setValue('company', e.target.value)} />
              </label>
              <label>Job title
                <input value={form.job_title ?? profile.job_title ?? ''} onChange={e => setValue('job_title', e.target.value)} />
              </label>
              <label>Location
                <input value={form.location ?? profile.location ?? ''} onChange={e => setValue('location', e.target.value)} />
              </label>
              <label>Skills (comma separated)
                <input value={form.skillsText ?? (profile.skills || []).join(', ')} onChange={e => setValue('skillsText', e.target.value)} />
              </label>
              <label className="span-two">LinkedIn URL
                <input value={form.linkedin_url ?? profile.linkedin_url ?? ''} onChange={e => setValue('linkedin_url', e.target.value)} />
              </label>
              <label className="span-two">Career summary
                <textarea value={form.bio ?? profile.bio ?? ''} onChange={e => setValue('bio', e.target.value)} />
              </label>
            </>
          )}
        </div>
        {user.role === 'alumni' && (
          <label className="public-toggle">
            <input
              type="checkbox"
              checked={form.is_public ?? profile.is_public ?? true}
              onChange={e => setValue('is_public', e.target.checked)}
            />
            Show my profile in the alumni directory
          </label>
        )}
        <button className="button button-primary">Save profile</button>
      </form>
      {user.role === 'alumni' && (
        <div className="pledge-panel">
          <div>
            <strong>Support your institution</strong>
            <p>Record a donation pledge interest for the admin team to follow up. No payment is collected here.</p>
          </div>
          <button className="button button-outline" onClick={() => openModal('pledge')}>
            <HeartHandshake size={15} /> Add pledge <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
