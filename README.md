# 🏗 Internal Labour Track

A full-stack construction labour management system built with **Next.js 14**, **Neon PostgreSQL**, and **Tailwind CSS**.

---

## 🔐 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin@123` |

All site manager credentials match the ones you specified (see `scripts/seed.js`).

---

## 🚀 STEP-BY-STEP DEPLOYMENT GUIDE

### STEP 1 — Install Node.js

1. Go to **https://nodejs.org**
2. Download and install the **LTS version** (e.g. v20)
3. Open your terminal / command prompt and verify:
   ```
   node --version    # should show v20.x.x
   npm --version     # should show 10.x.x
   ```

---

### STEP 2 — Set up the Neon Database

1. Go to **https://neon.tech** and sign up (free)
2. Click **"New Project"**
3. Give it a name like `internal-labour-track`
4. Choose a region (pick one closest to India — e.g. `AWS ap-southeast-1 Singapore`)
5. Click **Create Project**
6. On the dashboard, find the **Connection String** — it looks like:
   ```
   postgresql://username:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
7. **Copy and save this string** — you'll need it in the next step

---

### STEP 3 — Configure Environment Variables

1. In your project folder, find the file `.env.example`
2. **Duplicate it** and rename the copy to `.env.local`
3. Open `.env.local` and fill in:
   ```
   DATABASE_URL=postgresql://your-connection-string-from-neon
   JWT_SECRET=any-random-long-string-like-this-abc123xyz789change-me
   NEXTAUTH_URL=http://localhost:3000
   ```
   > For `JWT_SECRET`, just type any random string of 32+ characters. It's used to sign login tokens.

---

### STEP 4 — Install Dependencies & Seed the Database

Open a terminal in your project folder and run:

```bash
# Install all packages
npm install

# Seed the database (creates tables + all sites + managers)
npm run seed
```

You should see output like:
```
✅ Tables ready
👤 Admin created → admin / admin@123
✅ Created: Guntakal
✅ Created: Zone J
...
🎉 Seed complete!
```

---

### STEP 5 — Test Locally

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

- Login as admin: `admin` / `admin@123`
- Login as a manager: e.g. `channa` / `zone j@123`

---

### STEP 6 — Deploy to Vercel

1. Go to **https://github.com** and create a free account (if you don't have one)
2. Install **GitHub Desktop** from https://desktop.github.com
3. In GitHub Desktop:
   - Click **"Add Existing Repository"**
   - Select your project folder
   - Click **"Publish Repository"** → make it **Private**

4. Go to **https://vercel.com** and sign up with your GitHub account
5. Click **"New Project"**
6. Find your repository and click **"Import"**
7. In the **"Environment Variables"** section, add:
   - `DATABASE_URL` → paste your Neon connection string
   - `JWT_SECRET` → paste your secret key
8. Click **"Deploy"**
9. Wait ~2 minutes — Vercel will build and deploy your app
10. You'll get a URL like `https://internal-labour-track-xyz.vercel.app`

> ✅ Done! Your app is live.

---

### STEP 7 — Change Admin Password (Recommended)

After deploying, log in as admin and use the Managers section to update credentials. To change the admin password directly, you can use the Neon SQL editor:

```sql
UPDATE users 
SET password_hash = crypt('your-new-password', gen_salt('bf'))
WHERE username = 'admin';
```

Or re-run the seed with a modified password.

---

## 📁 Project Structure

```
internal-labour-track/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Login page
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── admin/
│   │   │   ├── layout.tsx        ← Admin shell with sidebar
│   │   │   ├── page.tsx          ← Admin dashboard
│   │   │   ├── sites/page.tsx    ← Manage sites
│   │   │   ├── managers/page.tsx ← Manage managers
│   │   │   └── entries/page.tsx  ← All entries
│   │   ├── manager/
│   │   │   ├── layout.tsx        ← Manager shell
│   │   │   ├── page.tsx          ← Site overview
│   │   │   ├── entry/page.tsx    ← Log new entry
│   │   │   └── entries/page.tsx  ← View own entries
│   │   └── api/
│   │       ├── auth/login/       ← POST login
│   │       ├── auth/logout/      ← POST logout
│   │       ├── auth/me/          ← GET current user
│   │       ├── sites/            ← CRUD sites
│   │       ├── managers/         ← CRUD managers
│   │       ├── entries/          ← CRUD labour entries
│   │       ├── dashboard/        ← Stats & analytics
│   │       └── init/             ← DB initialization
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── StatCard.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── PageHeader.tsx
│   │   └── EntryForm.tsx
│   ├── lib/
│   │   ├── db.ts                 ← Neon database client
│   │   ├── auth.ts               ← JWT sign/verify
│   │   └── utils.ts              ← formatINR, formatDate etc.
│   └── middleware.ts             ← Route protection
├── scripts/
│   └── seed.js                   ← Database seeder
├── .env.example                  ← Copy to .env.local
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## 🗄 Database Schema

```sql
sites (id, name, description, is_active, created_at)
users (id, username, password_hash, full_name, role, site_id, created_at)
labour_entries (id, site_id, entry_date, location, contractor_name,
                mason_count, helper_count, women_helper_count,
                ot_details, payment_amount, advance_amount, remarks,
                created_by, created_at)
```

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | Neon PostgreSQL (serverless) |
| Auth | JWT via `jose` + httpOnly cookies |
| Styling | Tailwind CSS |
| Fonts | Syne (display) + DM Sans (body) |
| Deployment | Vercel |

---

## ❓ Troubleshooting

**"Cannot connect to database"**
→ Check your `DATABASE_URL` in `.env.local`. Make sure you copied the full string from Neon.

**"Invalid username or password"**
→ Make sure you ran `npm run seed` first.

**Login redirects back to login page**
→ Check that `JWT_SECRET` is set in your environment variables on Vercel.

**Seed fails with "module not found"**
→ Run `npm install` first, then retry `npm run seed`.
