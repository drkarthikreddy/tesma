# tesma - Medical Education Platform (QBank)

A medical education app featuring:
- **Instagram-style Post Feed** for questions on Home.
- **4-Level Hierarchy** on QBank: *Subjects → Chapters → Topics → Subtopics*.
- **Vertical Reel View** for interactive questions on Reels.
- **Profile Settings** with Dark Mode.
- **Admin Dashboard** (`adminnn@123` / `0987poiu`) to upload JS-format questions directly into Cloudflare D1 SQL.

---

## 🚀 Cloudflare Deployment Options

You have two ways to deploy: **Cloudflare Pages** (easiest via GitHub dashboard) OR **Cloudflare Workers CLI**.

---

### Option A: Cloudflare Pages (Recommended - 1-Click via Cloudflare Dashboard)

If you linked your GitHub repository in the **Cloudflare Dashboard** under **Workers & Pages** -> **Create** -> **Pages**:

1. **Build settings**:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
2. **Deploy command**:
   - Cloudflare Pages will run `npm run build` and automatically publish `dist`.
3. **Bind D1 Database**:
   - In Cloudflare dashboard -> your Project -> **Settings** -> **Functions** / **D1 Database Bindings** -> Add binding `DB` pointing to your D1 database.

---

### Option B: Cloudflare Workers CLI (`npx wrangler deploy`)

If using the command line or custom deploy command `npx wrangler deploy`:

1. **Build the frontend first**:
   Make sure `npm run build` runs before deploying:
   ```bash
   npm run build
   npx wrangler deploy
   ```
   *(We also added `[build] command = "npm run build"` in `wrangler.toml` so Wrangler will automatically run Vite build before deploying).*

2. **Create your Cloudflare D1 SQL Database**:
   ```bash
   npx wrangler d1 create tesma-db
   ```
   Copy the `database_id` Cloudflare gives you into `wrangler.toml`.

3. **Initialize the Database Schema**:
   ```bash
   npx wrangler d1 execute tesma-db --remote --file=./schema.sql
   ```
