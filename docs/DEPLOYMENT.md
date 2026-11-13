# Deployment guide — AlumniConnect

The project is configured as one browser-based web service plus a managed PostgreSQL database:

- **Render Web Service:** runs Express and serves the built React app from the same HTTPS origin.
- **Neon PostgreSQL:** stores application data independently of the web service filesystem.

## 1. Create the database on Neon

1. Sign in to Neon and create a project named \`alumniconnect\`.
2. Choose a region close to the Render service and expected users.
3. Copy the pooled connection string from the Neon dashboard.
4. Keep the connection string private. Do not commit it to Git.

The application uses PostgreSQL via \`DATABASE_URL\` and enables TLS when \`DB_SSL=true\`.

## 2. Deploy on Render

1. Sign in to Render and connect the GitHub repository \`unnati-09m/demo2\`.
2. Select the \`main\` branch.
3. Create a **Web Service**. The checked-in \`render.yaml\` contains the service configuration. If entering values manually, use:
   - Runtime: Node
   - Build command: \`npm install && npm --prefix server install && npm --prefix client install && npm run build\`
   - Start command: \`node server/src/setup.js && npm start\`
   - Health check path: \`/api/health\`
4. Set these environment variables in Render:
   - \`NODE_ENV=production\`
   - \`DATABASE_URL=<Neon pooled connection string>\`
   - \`DB_SSL=true\`
   - \`JWT_SECRET=<long unique random value>\`
5. Deploy.

The start command applies the repeatable schema setup and then starts Express. Express serves \`client/dist\` and the \`/api/*\` endpoints from the same origin.

## 3. Add fictional demo records (optional)

Render Free Web Services do not provide Shell access. Run the seed script from your own computer after the service has deployed, using the Neon connection string securely in your local terminal:

\`\`\`bash
DATABASE_URL='YOUR_NEON_CONNECTION_STRING' DB_SSL=true DEMO_PASSWORD='choose-a-strong-demo-password' npm run seed
\`\`\`

Run this from the cloned project after dependencies are installed. Do not paste the database URL into chat or commit it. The seed creates fictional demo accounts and sample alumni, opportunities and events. For a real institution, replace demo identities with institution-approved onboarding and do not expose shared demo credentials.

## 4. Verify

Open:

- \`https://YOUR-SERVICE.onrender.com/api/health\` — should return \`status: ok\` and \`database: connected\`.
- \`https://YOUR-SERVICE.onrender.com\` — should load AlumniConnect.

Then test student registration, alumni approval, mentorship, opportunity applications, event registration, notifications and admin reports.

## 5. Free-tier trade-offs

- Render Free web services spin down after 15 minutes without inbound traffic. The next request wakes the service, which can take about a minute. This is suitable for a student demo, not an always-on institutional system.
- Do not use an expiring Render Free Postgres database for persistent project data. This project uses Neon as the separate database.
- Neon Free has usage quotas (compute, storage and network transfer) and automatically scales idle compute to zero. Check the current Neon plan and usage before a large demo.
- For a live institution, use paid always-on hosting, backups, monitoring, HTTPS, restricted administrative access, retention policies and institution-approved privacy/security controls.

## 6. Secrets and data protection

Never commit \`.env\`, database URLs, JWT secrets, private student/alumni records, resumes or passwords. Use hosting environment variables for production secrets. Use synthetic data during development and assessment.
