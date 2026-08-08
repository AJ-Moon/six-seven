# Deploying Six Seven

Two pieces go live:

| Piece | What it is | Goes to |
| --- | --- | --- |
| `backend/` | FastAPI + Postgres + uploaded images | **Railway** (or Render / Fly / any Docker host) |
| `frontend/` | Static React build | **Vercel** (or Netlify / Cloudflare Pages) |

The frontend calls the API with **relative** paths (`/api/...`, `/static/...`),
and Vercel rewrites those to the backend. That means the browser only ever talks
to one origin, so there is no CORS to configure and no API URL baked into the
bundle.

---

## Why Railway for the backend

The API needs three things a plain static host cannot give it: a **Postgres
database**, a **persistent disk** for uploaded menu photos, and a process that
**does not sleep** (a cold start when a customer is mid-order is the one thing
worth paying to avoid).

- **Railway** — Postgres and volumes are first-class, deploys from the
  Dockerfile with no extra config, and has a **Singapore region**, the closest
  to Lahore. Around $5–10/month. This is the recommendation.
- **Render** — equivalent, but the free tier sleeps after 15 minutes; the $7
  Starter tier is the usable one. No Asian region.
- **Fly.io** — can run in Singapore and is cheap, but you manage volumes and
  Postgres yourself. Pick this only if you are comfortable with `flyctl`.
- **A VPS** (Hetzner/DigitalOcean, ~$5) — cheapest and fastest for Pakistan if
  you are happy running Docker, nginx and certbot yourself.

Vercel serves the frontend from a global CDN, including edge locations near
Pakistan, so static assets are fast regardless of where the API lives.

---

## Before you deploy — do these first

### 1. Rotate the development secrets

`backend/.env` currently holds a **live OpenAI key** and the old Supabase
service key. Anything that has sat in a shared folder must be considered
compromised.

- Revoke the OpenAI key at <https://platform.openai.com/api-keys> and issue a new one.
- Generate a fresh signing key — never reuse the development one:

```bash
python3 -c "import secrets,base64; print(base64.b64encode(secrets.token_bytes(64)).decode())"
```

### 2. Choose a real admin password

`admin@test.com` / `Admin@123` are development credentials. Set `ADMIN_EMAIL`
and `ADMIN_PASSWORD` in the production environment; the account is created on
first boot from those values, and the test account will not exist.

### 3. Push to GitHub

Both hosts deploy from a repository. `.gitignore` already excludes `.env`, the
virtualenv and `node_modules`. The menu photos in `backend/static/uploads/` are
**not** ignored and must be committed — they are the product images.

```bash
git init && git add -A && git commit -m "Six Seven ordering site"
```

---

## Backend on Railway

1. **New Project → Deploy from GitHub repo**, and set the root directory to
   `backend`. Railway detects the `Dockerfile`.
2. **Add Postgres**: *New → Database → PostgreSQL*. Railway injects
   `DATABASE_URL` automatically — do not paste one in yourself.
3. **Add a volume**: *New → Volume*, mount path **`/data`**. This is what keeps
   admin-uploaded photos alive across deploys.
4. **Set the variables** from `backend/.env.production.example`. The required
   ones:

   ```
   JWT_SECRET=<the value you just generated>
   ADMIN_EMAIL=owner@sixseven.pk
   ADMIN_PASSWORD=<a strong password>
   ENVIRONMENT=production
   UPLOADS_DIR=/data/uploads
   FRONTEND_ORIGIN=https://sixseven.pk,https://www.sixseven.pk
   OPENAI_API_KEY=<your new key>
   SEED_MENU=true          # only for the FIRST deploy, see below
   ```

5. Deploy. The container runs `scripts/bootstrap.py` before serving: it creates
   the schema, applies all 11 migrations, and (with `SEED_MENU=true`) loads the
   42-item menu, branding, contact details and 5 km radius.
6. **Remove `SEED_MENU` after the first successful deploy.** Leaving it on
   re-applies the seeded menu and settings on every deploy, which would
   overwrite prices or copy you later change in the admin panel.
7. Note the public URL, e.g. `six-seven-api.up.railway.app`, and confirm:
   `https://<that host>/api/health` returns `{"status":"ok"}`.

### Region

In Railway's project settings choose **Southeast Asia (Singapore)** — roughly
half the round-trip from Lahore compared with US regions.

---

## Frontend on Vercel

1. **Add New → Project**, import the repo, set the root directory to
   `frontend`. Framework preset: **Vite**.
2. Open `frontend/vercel.json` and replace **both** occurrences of
   `REPLACE-WITH-YOUR-BACKEND-HOST` with the Railway host (no `https://`
   inside the path, keep the scheme in the destination):

   ```json
   "destination": "https://six-seven-api.up.railway.app/api/:path*"
   ```

   Both rewrites matter. `/api/*` carries the orders; `/static/*` carries every
   product photo — miss it and the menu renders with empty tiles.
3. Add the build-time variable:

   ```
   VITE_MAPBOX_TOKEN=<your mapbox token>
   ```

   This powers address autocomplete at checkout and the store-location picker in
   admin. Leave the two `VITE_SUPABASE_*` variables unset — they are optional and
   only speed up the admin order list, which already refreshes every 15 seconds.
4. Deploy, then add your domain under *Settings → Domains* (`sixseven.pk` and
   `www.sixseven.pk`), pointing DNS as Vercel instructs.

---

## After it is live — check these

```bash
API=https://<your-railway-host>
SITE=https://sixseven.pk

curl -s $API/api/health                 # {"status":"ok",...}
curl -s $SITE/api/menu | head -c 200    # menu JSON through the Vercel proxy
curl -o /dev/null -w '%{http_code}\n' $SITE/static/uploads/big-67-burger.webp   # 200
```

Then, in a browser:

- The homepage shows the Six Seven hero and prices as `Rs. 300`.
- A product photo loads on `/menu` (proves the `/static` rewrite).
- `/admin/login` accepts your new admin password, and `admin@test.com` does not.
- Place a test order, mark it delivered in admin, and confirm the points land.
- On a phone, the **Add to Cart** button is visible without hovering.

---

## Things worth deciding before launch

- **Minimum order is Rs. 500** while an Espresso is Rs. 300 — as configured, a
  single coffee cannot be ordered. Change it under *Admin → Settings → Store*
  if that is not what you want.
- **Delivery is a flat Rs. 150** inside 5 km. There is no free-delivery
  threshold in the pricing code, so do not advertise one in the banner.
- **Loyalty gives 5% back** (1 point per Rs. 1, 1000 points = Rs. 50 off).
- **Payment is cash on delivery only.** There is no card gateway. If you want
  online payment, that is a separate integration.
- **No password reset flow exists.** If the admin password is lost, change
  `ADMIN_PASSWORD` and redeploy.

---

## Backups

Railway's Postgres has automated backups on paid plans — turn them on. A manual
dump before risky changes:

```bash
pg_dump "$DATABASE_URL" > sixseven-$(date +%F).sql
```

The uploads volume is not covered by database backups. The photos that ship with
the repo are safe in git; anything uploaded later through the admin panel exists
only on the volume, so download those periodically if they matter.

---

## Alternative: one server instead of two

If you would rather run a single box, the backend can serve the built frontend
directly — mount `frontend/dist` as static files in `main.py` and skip Vercel.
It is simpler to reason about and removes the rewrite step, at the cost of
losing the CDN for static assets. For a single-location cafe either is fine.
