# Deployment guide — AlumniConnect

The repository is configured for one web service and one managed PostgreSQL database:

- **Render:** runs the Node.js/Express service and serves the built React application from the same origin.
- **Neon:** managed PostgreSQL database. The free plan currently has usage limits and scales compute to zero after inactivity; check the current plan page before relying on it for a live event.

## 1. Create the production database on Neon

1. Sign in to Neon and create a project named `alumniconnect`.
2. Choose a region near your Render service and expected users.
3. Copy the pooled connection string from the Neon dashboard. Keep the username, password and database name intact.
4. Store the connection string privately. Do not commit it to Git.

## 2. Deploy the web service on Render

1. Sign in to Render and connect the GitHub repository `unnati-09m/demo2`.
2. Select the branch `main` once the PS-aligned build has been merged there.
3. Create a **Web Service** with:
   - Runtime: Node
   - Build command: `npm install && npm --prefix server install && npm --prefix client install && npm run build`
   - Start command: `node server/src/setup.js && npm start`
   - Health check path: `/api/health`
4. Add environment variables in the Render dashboard:
   - `NODE_ENV=production`
   - `DATABASE_URL=<Neon pooled connection string>`
   - `DB_SSL=true`
   - `JWT_SECRET=<long unique random value>`
   - `DEMO_PASSWORD=<optional strong demo seed password>`
5. Deploy. The startup command runs the idempotent schema setup and then starts Express.

The production Express server serves `client/dist` and the API from the same origin, so a separate client URL and production CORS configuration are not required.

## 3. Initialize production demo data

After the first successful deployment, use Render's Shell for the service (or a secure one-off job with the same environment) and run:

```bash
npm run seed
```

This creates fictional sample users and sample records. Do not expose the seeded demo accounts to the public as real institutional identities. For a real institution, replace demo records and rotate all credentials before inviting users.

## 4. Verify deployment

Open:

- `https://YOUR-SERVICE.onrender.com/api/health` — should return `status: ok` and `database: connected`.
- `https://YOUR-SERVICE.onrender.com` — should load the AlumniConnect web interface.

Test student registration, pending alumni approval, mentorship, opportunity applications, event registration and admin reports.

## 5. Important free-tier considerations

- Render free web services spin down after a period without inbound traffic and can take time to wake up on the next request. This is acceptable for a student demo, not ideal for a continuously available institutional system.
- Render's free PostgreSQL offering has an expiry limit; use Neon as the separately managed persistent PostgreSQL database rather than depending on an expiring Render database.
- Neon Free has monthly compute/network/storage quotas and automatically scales idle compute to zero. Check usage before a public demo or assessment.
- For a real institutional deployment, use paid always-on hosting, backups, HTTPS, monitoring, restricted admin access, data-retention policies and institution-approved privacy/security controls.

## 6. Secrets and data protection

Never commit `.env`, database connection strings, JWT secrets, private student/alumni records, real resumes or passwords. Use Render environment variables for production secrets. Use synthetic data during development and assessment.
