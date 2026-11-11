import React from 'react';
import { ArrowUpRight, Bell, Check, FileDown, Handshake, MapPin } from 'lucide-react';

const dateText = value => value ? new Date(value).toLocaleDateString() : 'Not specified';

// Feature owner: Nayan Jyoti — mentorship requests and accept/decline workflow.
export function MentorshipPage({ mentorship, user, action }) {
  return (
    <>
      <div className="section-heading">
        <div>
          <h3>{user.role === 'alumni' ? 'Requests for your guidance' : 'Your mentorship requests'}</h3>
          <p>{user.role === 'alumni' ? 'Respond to students who would like to learn from you.' : 'Track the guidance requests you have sent.'}</p>
        </div>
      </div>
      {mentorship.length ? (
        <div className="list-card">
          {mentorship.map(item => (
            <div className="list-row" key={item.id}>
              <div className="list-icon"><Handshake size={18} /></div>
              <div className="list-copy">
                <strong>{item.topic}</strong>
                <small>{user.role === 'alumni' ? 'From ' + item.student_name : 'Mentor: ' + item.alumni_name} · {dateText(item.created_at)}</small>
                <p>{item.message}</p>
              </div>
              <span className={'status ' + item.status}>{item.status}</span>
              {user.role === 'alumni' && item.status === 'pending' && (
                <div className="row-actions">
                  <button className="button button-small success-button" onClick={() => action('/mentorship/' + item.id, 'PATCH', { status: 'accepted' })}>Accept</button>
                  <button className="button button-small button-outline" onClick={() => action('/mentorship/' + item.id, 'PATCH', { status: 'declined' })}>Decline</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty"><Handshake size={28} /><strong>No mentorship requests yet</strong><p>Requests and responses will appear here.</p></div>
      )}
    </>
  );
}

// Feature owner: Nayan Jyoti — community events and event registrations.
export function EventsPage({ events, action }) {
  return (
    <div className="event-grid">
      {events.map(item => (
        <article className="event-card" key={item.id}>
          <div className="event-date">
            <strong>{new Date(item.starts_at).getDate()}</strong>
            <span>{new Date(item.starts_at).toLocaleString('en', { month: 'short' })}</span>
          </div>
          <div className="event-copy">
            <span className="eyebrow">COMMUNITY EVENT</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <small><MapPin size={13} /> {item.venue} · {item.attendee_count} attending</small>
          </div>
          <button
            className={'button ' + (item.registered ? 'button-outline' : 'button-primary')}
            disabled={item.registered}
            onClick={() => action('/events/' + item.id + '/register')}
          >
            {item.registered ? 'Registered' : 'Register'}
            {item.registered ? <Check size={14} /> : <ArrowUpRight size={14} />}
          </button>
        </article>
      ))}
      {!events.length && <div className="empty">No events are scheduled yet.</div>}
    </div>
  );
}

// Feature owner: Nayan Jyoti — in-app notifications and read state.
export function NotificationsPage({ notifications, action }) {
  return (
    <div className="list-card">
      {notifications.length ? notifications.map(item => (
        <div className="list-row" key={item.id}>
          <div className="list-icon"><Bell size={17} /></div>
          <div className="list-copy">
            <strong>{item.title}</strong>
            <p>{item.body}</p>
            <small>{new Date(item.created_at).toLocaleString()}</small>
          </div>
          {!item.is_read && (
            <button className="button button-small button-outline" onClick={() => action('/notifications/' + item.id + '/read', 'PATCH', {})}>
              Mark read
            </button>
          )}
        </div>
      )) : <div className="empty">No notifications yet.</div>}
    </div>
  );
}

// Feature owner: Nayan Jyoti — admin engagement summaries and reporting view.
export function AdminReportsPage({ stats, adminSummary, downloadCsv }) {
  return (
    <>
      <div className="stats">
        {stats.map(([label, value, Icon, color]) => (
          <div className="stat" key={label}>
            <span className={'stat-icon ' + color}><Icon size={18} /></span>
            <div><strong>{value}</strong><small>{label}</small></div>
          </div>
        ))}
      </div>
      <div className="report-card">
        <div>
          <h3>Alumni directory export</h3>
          <p>Download alumni contact and career details as a CSV report.</p>
        </div>
        <button className="button button-primary" onClick={downloadCsv}>
          <FileDown size={15} /> Export alumni CSV
        </button>
      </div>
      {adminSummary && (
        <div className="report-grid">
          <div className="report-card">
            <h3>Users by role</h3>
            {adminSummary.usersByRole.map(row => <p key={row.role} className="report-line"><span>{row.role}</span><strong>{row.count}</strong></p>)}
          </div>
          <div className="report-card">
            <h3>Mentorship requests</h3>
            {adminSummary.mentorshipByStatus.map(row => <p key={row.status} className="report-line"><span>{row.status}</span><strong>{row.count}</strong></p>)}
          </div>
          <div className="report-card">
            <h3>Opportunities</h3>
            {adminSummary.opportunitiesByType.map(row => <p key={row.type} className="report-line"><span>{row.type}</span><strong>{row.count}</strong></p>)}
          </div>
          <div className="report-card">
            <h3>Donation pledges</h3>
            {adminSummary.pledgesByStatus.map(row => <p key={row.status} className="report-line"><span>{row.status} · ₹{Number(row.amount).toLocaleString('en-IN')}</span><strong>{row.count}</strong></p>)}
          </div>
        </div>
      )}
    </>
  );
}
