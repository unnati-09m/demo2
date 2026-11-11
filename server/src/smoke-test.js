import assert from 'node:assert/strict';

const API = process.env.API_URL || 'http://localhost:4000/api';

async function call(path, token, method = 'GET', body) {
  const response = await fetch(API + path, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(method + ' ' + path + ' failed (' + response.status + '): ' +
      (typeof data === 'string' ? data : data.message));
  }
  return data;
}

async function login(email) {
  const result = await call('/auth/login', '', 'POST', { email, password: 'Demo@123' });
  assert.ok(result.token, 'login should return a JWT');
  return result.token;
}

async function run() {
  const health = await call('/health');
  assert.equal(health.status, 'ok');

  const studentToken = await login('student@alumniconnect.test');
  const alumniToken = await login('alumni@alumniconnect.test');
  const adminToken = await login('admin@alumniconnect.test');

  const unauthorized = await fetch(API + '/dashboard');
  assert.equal(unauthorized.status, 401, 'dashboard should require authentication');

  const dashboard = await call('/dashboard', studentToken);
  assert.ok(dashboard.alumni >= 4, 'seed should add several alumni');

  const people = await call('/alumni', studentToken);
  assert.ok(people.length >= 4, 'alumni directory should return seeded alumni');
  const profile = await call('/profile', alumniToken);
  assert.equal(profile.role, 'alumni');
  const alumniId = profile.id;
  assert.ok(people.some(person => person.id === alumniId), 'signed-in alumnus should appear in the directory');

  const mentorship = await call('/mentorship', studentToken, 'POST', {
    alumni_id: alumniId,
    topic: 'Career guidance',
    message: 'I would like advice about my first developer role.'
  });
  assert.ok(mentorship.id, 'mentorship request should be created');

  const alumniRequests = await call('/mentorship', alumniToken);
  const ownRequest = alumniRequests.find(item => item.id === mentorship.id);
  assert.ok(ownRequest, 'alumnus should see the request');
  await call('/mentorship/' + mentorship.id, alumniToken, 'PATCH', { status: 'accepted' });

  const opportunity = await call('/opportunities', alumniToken, 'POST', {
    title: 'Smoke Test Internship',
    company: 'Demo Company',
    description: 'A sample opportunity used by the automated API check.',
    type: 'internship',
    location: 'Remote'
  });
  await call('/opportunities/' + opportunity.id + '/apply', studentToken, 'POST', {});
  const applications = await call('/my-applications', studentToken);
  assert.ok(applications.some(item => item.id === opportunity.id || item.title === 'Smoke Test Internship'),
    'student should see the submitted opportunity application');

  const event = await call('/events', alumniToken, 'POST', {
    title: 'Smoke Test Alumni Meetup',
    description: 'A sample event used by the automated API check.',
    venue: 'Online',
    starts_at: new Date(Date.now() + 7 * 86400000).toISOString()
  });
  await call('/events/' + event.id + '/register', studentToken, 'POST', {});
  const events = await call('/events', studentToken);
  assert.ok(events.some(item => item.id === event.id && item.registered),
    'student event registration should be visible');

  await call('/donation-pledges', alumniToken, 'POST', {
    amount: 500,
    purpose: 'Student learning resources',
    note: 'Automated test pledge; fictional only.'
  });

  const studentNotifications = await call('/notifications', studentToken);
  assert.ok(studentNotifications.length > 0, 'student should receive in-app notifications');

  const summary = await call('/admin/summary', adminToken);
  assert.ok(Array.isArray(summary.usersByRole), 'admin summary should return grouped user counts');

  const csvResponse = await fetch(API + '/admin/alumni.csv', {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  assert.equal(csvResponse.status, 200);
  const csv = await csvResponse.text();
  assert.ok(csv.includes('Graduation Year'), 'alumni CSV should contain its column header');

  console.log('AlumniConnect API smoke tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
