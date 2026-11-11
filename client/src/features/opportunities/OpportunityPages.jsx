import React from 'react';
import { ArrowUpRight, BriefcaseBusiness, Building2, Clock3 } from 'lucide-react';

const dateText = value => value ? new Date(value).toLocaleDateString() : 'Not specified';

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
