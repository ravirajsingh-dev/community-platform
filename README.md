# Community Platform

Full-stack community platform with binary-tree hierarchy, member registration, referrals, and a dynamic admin panel. Built with React.js, Node.js, Express.js, and MongoDB.

This is the community application described on my resume: a production community platform designed around hierarchical data models and optimized tree queries.

## What’s included

| App | Stack | Role |
| --- | --- | --- |
| `client` | React + Vite | Public site and member portal |
| `admin` | React + Vite | Dynamic admin / operations |
| `server` | Node.js + Express + MongoDB | REST API, auth, payments, hierarchy |

### Community workflows

- Member registration and member IDs
- Binary-tree / hierarchy data models
- Referral and commission flows
- Membership payments (Cashfree)
- Family / community master data (gotra, sub-khamp, and related entities)
- News, CMS, and role-based admin

## Run locally

```bash
cp .env.example .env
# fill in MongoDB, JWT secrets, and optional email / storage / payment keys
```

```bash
cd server && npm install && npm run server
cd client && npm install && npm run dev
cd admin && npm install && npm run dev
```

Or with Docker Compose:

```bash
docker compose up --build
```

Default ports: API `5000`, client `3000`, admin `3001`.

Seed a local admin (development only):

```bash
cd server
SEED_ADMIN_PASSWORD='your-strong-password' node seeds/loadAdmin.js
```

## Security

Secrets live in `.env` (see `.env.example`). Do not commit real API keys, database URIs, payment credentials, or production hosts.

## License

MIT. See [LICENSE](LICENSE).
