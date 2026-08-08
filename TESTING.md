# Complete Testing Guide

## Starting the App

```bash
# Terminal 1 — Backend
cd backend
source venv/bin/activate   # or: python -m venv venv && pip install -r requirements.txt
uvicorn main:app --reload --port 5005

# Terminal 2 — Frontend
cd frontend
pnpm dev
# Opens at http://localhost:5173 (or http://127.0.0.1:5173)
```

**Default credentials (from `.env`)**

| Role             | Email                  | Password  |
| ---------------- | ---------------------- | --------- |
| Restaurant Admin | admin@test.com         | Admin@123 |
| Customer         | register a new account |           |

> This install is single-restaurant with exactly **one** admin. The platform
> ("super admin") tier was removed: no `/platform-admin` pages, no
> `/api/platform-admin` routes, and the `platform_admins` table is dropped.
> Change `ADMIN_PASSWORD` in `backend/.env` before exposing the site publicly.

---

## Quick Smoke Test (< 5 min)

Run this before any deep testing to confirm the app is alive:

- [ ] `http://localhost:5173` loads the homepage without a blank screen
- [ ] `http://localhost:5005/api/health` returns `{"status":"ok",...}` in the browser
- [ ] Admin login at `/admin/login` with `admin@test.com` / `Admin@123` succeeds
- [ ] An unknown URL such as `/nope` shows the styled 404 page (not a blank screen)

---

## TIER 2 — Restaurant Admin

### 2.1 Login & Auth Guard

- [ ] Go to `http://localhost:5173/admin/login`
- [ ] Wrong credentials → error shown
- [ ] Login with `admin@test.com` / `Admin@123` → lands on `/admin/dashboard`
- [ ] Try `/admin/menu` while logged out → redirected to `/admin/login`
- [ ] Click Logout → back to admin login

---

### 2.2 Dashboard

- [ ] Stat cards load: Total Orders, Today's Orders, Pending Orders, Revenue, Customers, Unread Messages
- [ ] Popular Items list shows (may be empty on fresh DB)
- [ ] Recent Orders list shows (may be empty)

---

### 2.3 Menu Management _(heavily updated)_

#### Basic CRUD

- [ ] Go to `/admin/menu`
- [ ] **Quick Setup Guide panel** appears at the top (dismiss button works, guide is gone after refresh)
- [ ] Click the "Restore guide" link at the top-right → guide reappears
- [ ] Click **"Add Item"** → modal opens in two-column layout

#### Add Item Modal — fields

- [ ] **Name** field is required (try saving blank → validation error)
- [ ] **Category** field shows suggestions from existing categories via dropdown (datalist)  
       Type a new category name → it saves as a new category
- [ ] **Price** accepts decimals (e.g. `9.99`)
- [ ] **Description** accepts multi-line text
- [ ] **Rating** — click on the star bar:
  - Click left-half of a star → 0.5 increments (e.g. 3.5)
  - Click right-half → full star (e.g. 4.0)
  - Displayed as filled/half/empty stars
- [ ] **Image** — click "Upload Image" button:
  - Select a JPG/PNG file from disk
  - Preview thumbnail appears in the modal
  - Confirm the upload actually saves (image URL path like `/static/uploads/...` in the saved item)
- [ ] **Available** toggle defaults to ON
- [ ] **Featured** toggle
- [ ] Click **Save** → item appears in the menu list
- [ ] Item shows name, category, price, rating stars, and thumbnail

#### Edit & Delete

- [ ] Click edit (pencil) icon → modal pre-fills with existing data
- [ ] Change price → Save → list updates immediately
- [ ] Click delete (trash) icon → confirm dialog → item removed

#### Availability Toggle

- [ ] Toggle the availability switch on a menu item (in the list row)
- [ ] Refresh the page → state is persisted (toggle is still in the same position)

#### Drag-and-Drop Reorder

- [ ] Add at least 3 items in the same category
- [ ] Drag one item above another using the drag handle (≡ icon on the left)
- [ ] Drop → items reorder in place
- [ ] Refresh the page → order is preserved (display_order persisted in DB)
- [ ] Go to `/menu` (customer view) → items appear in the same order

#### AI Menu Import _(new feature)_

- [ ] Click **"Import Menu with AI"** button (next to "Add Item")
- [ ] Step 1 (Upload) modal opens

**Test A — Text paste**

- [ ] Paste a menu-like text into the text area, e.g.:
  ```
  Chicken Burger - $8.99 - Juicy grilled chicken with lettuce
  Beef Burger - $10.99 - Double beef patty
  Fries - $3.50 - Crispy golden fries
  ```
- [ ] Click **"Parse Menu"**
- [ ] Step 2 (Processing) spinner appears briefly
- [ ] Step 3 (Review) — editable table shows rows for each parsed item
- [ ] Each row has: checkbox (checked by default), name, category, price, description
- [ ] Edit a cell inline (e.g. change a price)
- [ ] Uncheck one row to exclude it
- [ ] Click **"Import X Selected Items"**
- [ ] Progress bar fills as items are saved
- [ ] Modal closes, menu list refreshes with the new items

**Test B — Image upload**

- [ ] Reopen the Import modal
- [ ] Drop a photo of a menu (JPG/PNG) onto the drop zone OR click to browse
- [ ] File name + size shown, image preview appears
- [ ] Click Parse Menu → AI reads the image and extracts items
- [ ] Step 3 review table appears; proceed as above

**Test C — Error handling**

- [ ] Click "Parse Menu" with no file and no pasted text → error message shown
- [ ] Click the × or Cancel at any step → modal closes, no partial items saved

---

### 2.4 Branches

- [ ] Go to `/admin/branches` (or the Locations tab)
- [ ] Click Add Branch → fill name, address, phone, hours → Save → appears in list
- [ ] Edit a branch → change hours → Save → updates
- [ ] Delete a branch → confirm → removed
- [ ] Go to `/branches` (customer view) → new branch appears there

---

### 2.5 Current & Finished Orders

_(Populate with a real order first — see Section 3.4)_

- [ ] Go to `/admin/orders/current`
- [ ] Your test order appears with status `placed`
- [ ] Change status to `confirmed` → badge updates
- [ ] Change to `preparing` → `ready` → `out_for_delivery` → `delivered`
- [ ] After delivering, order moves to Finished Orders tab
- [ ] Go to `/admin/orders/finished` → delivered order is listed
- [ ] Filter by date range → results narrow correctly

---

### 2.6 Settings _(updated — Rewards section added)_

#### Contact Info tab

- [ ] Edit phone, email, address, hours, WhatsApp → Save → success toast
- [ ] Go to `/contact` (customer view) → updated info shows

#### Social Media tab

- [ ] Edit Instagram, Facebook, Twitter, TikTok URLs → Save
- [ ] Footer on customer site shows updated links

#### Store tab

- [ ] Change **Delivery Charge** → Save → checkout page reflects new charge
- [ ] Change **Min Order Amount** → Save
- [ ] Toggle **Restaurant Open/Closed** → save → ServiceStatusBanner on customer site changes
- [ ] Set an **Announcement** and enable it → Save → banner appears on customer site

#### Rewards Program section (inside Store tab) _(new)_

- [ ] **Points per Dollar** — change from 10 to 20 → Save → place an order → earned points double
- [ ] **Min Points to Redeem** — set to 50 → Save → customer with 50+ points can redeem
- [ ] **Points Value (cents)** — shows how much each point is worth (e.g. 1 cent)
- [ ] **Rewards Enabled** toggle — turn OFF → Save → customer redeem button should be disabled/hidden
- [ ] Turn rewards back ON → toggle shows ON → customer can redeem again

#### Locations tab

- [ ] Shows the same branch list as Admin Branches page

#### Quick Setup Guide

- [ ] Guide panel appears at top of Settings page (first visit)
- [ ] Dismiss it → gone
- [ ] Restore via link → reappears

---

### 2.7 Content

- [ ] Go to `/admin/content`
- [ ] Edit "About Us" text → Save → success toast
- [ ] Edit FAQs (add a question and answer) → Save
- [ ] Go to `/faq` (customer) → new FAQ appears

---

### 2.8 Branding _(has Quick Setup Guide)_

- [ ] Go to `/admin/branding`
- [ ] Quick Setup Guide panel appears at top
- [ ] Dismiss → gone; restore → back

- [ ] **Logo** — upload an image → preview updates → Save
- [ ] **Brand Name** — change → Save → navbar on customer site updates
- [ ] **Primary color** — pick a color (or type hex) → Save → primary buttons update color on customer site
- [ ] **Layout** — switch between Classic / Modern / Minimal → see mockup change → Save
- [ ] **Hero image** — upload → Save → homepage hero updates

---

### 2.9 Rewards Admin Page

- [ ] Go to `/admin/rewards`
- [ ] Settings load (mode, points per unit, min redeem, etc.)
- [ ] Change **Mode** between Points and Item Count
- [ ] Adjust values → Save → success toast
  > Note: the active rewards math (earn/spend) is now controlled by **Settings → Store → Rewards Program**. This page controls the legacy reward_settings record.

---

### 2.10 Users

- [ ] Go to `/admin/users`
- [ ] Customer accounts created during testing appear
- [ ] Search by name/email → filters list
- [ ] Click a user → opens detail page: shows profile, order history, points balance
- [ ] Points balance on detail page matches what the customer sees at `/points`

---

### 2.11 Contact Messages

- [ ] Go to `/admin/contact-messages`
- [ ] Submit a contact form as a customer (Section 3.7) first
- [ ] Message appears in this list
- [ ] Mark as read → status changes

---

## TIER 3 — Customer

### 3.1 Homepage

- [ ] Go to `http://localhost:5173`
- [ ] Hero slider loads and auto-advances
- [ ] Menu categories section shows categories from the DB
- [ ] Featured Items section shows items marked as featured
- [ ] Deals / Quick Actions sections visible
- [ ] ServiceStatusBanner appears if restaurant is set to closed
- [ ] Announcement banner appears if an announcement is active

### 3.2 Register & Login

- [ ] Go to `/login` → Register tab
- [ ] Try submitting with mismatched passwords → error
- [ ] Register with: email `customer@test.com`, password `Test@1234`, name `Test Customer`
- [ ] Redirected to home; navbar shows user name / avatar
- [ ] Logout → navbar reverts to login button
- [ ] Log back in with same credentials → succeeds
- [ ] Wrong password → error toast

### 3.3 Menu Page

- [ ] Go to `/menu`
- [ ] All available items load; unavailable items are greyed out / hidden
- [ ] Category filter tabs work — click a category → only those items shown
- [ ] Search/filter by name (if search box present)
- [ ] Click **Add to Cart** on 2–3 items → cart badge in navbar increments
- [ ] Add the same item twice → quantity increases in cart, not duplicate row

### 3.4 Cart

- [ ] Go to `/cart`
- [ ] Items listed with correct name, price, quantity
- [ ] Increase quantity → subtotal updates
- [ ] Decrease to 0 (or click remove) → item removed
- [ ] Special instructions field (if present) → accepted
- [ ] Cart persists on page refresh (stored in context/localStorage)

### 3.5 Checkout & Order Placement

- [ ] Click Checkout → `/checkout` page opens
- [ ] Fill in: name, phone, delivery address
- [ ] Delivery charge from admin settings is shown
- [ ] **Points redemption** (if rewards enabled and customer has enough points):
  - Redeem toggle / input appears
  - Entering a valid point amount reduces the total
  - Entering more than balance → error / capped
- [ ] Place Order → redirected to `/order-confirmation` with the new order ID
- [ ] Order ID is displayed clearly; page shows order summary

### 3.6 Order Tracking

- [ ] Go to `/track`
- [ ] Enter the order ID from the confirmation page → order details shown
- [ ] Status matches what admin set (e.g. `placed`)
- [ ] After admin updates status in Section 2.5, refresh track page → status updates

### 3.7 Points & Rewards

- [ ] Go to `/points` (must be logged in)
- [ ] Points balance shown (earned from the order placed in 3.5)
  - Formula: `order subtotal × points_per_dollar` (admin setting)
  - Default: $10 order × 10 pts/$1 = 100 points
- [ ] Go to `/rewards`
- [ ] Rewards info and current points shown

### 3.8 Profile

- [ ] Go to `/profile` while logged in
- [ ] Name and email shown
- [ ] Edit name → Save → updates
- [ ] Order history section shows past orders

### 3.9 Claim Order (Guest Order)

- [ ] Place an order without being logged in (guest checkout)
- [ ] Go to `/claim-order`
- [ ] Enter the order ID and the phone/email used → order claimed to account
- [ ] Order now visible in profile order history

### 3.10 Branches Page

- [ ] Go to `/branches`
- [ ] Branches added in admin appear
- [ ] Address, phone, hours displayed correctly

### 3.11 Contact Page

- [ ] Go to `/contact`
- [ ] Fill in name, email, message → Submit
- [ ] Success toast appears
- [ ] Admin inbox (Section 2.11) shows the message

### 3.12 FAQ Page

- [ ] Go to `/faq`
- [ ] FAQs created in Admin Content appear and expand on click

### 3.13 Static Pages

- [ ] `/about` loads without error
- [ ] `/careers` loads
- [ ] `/franchise` loads
- [ ] `/history` loads
- [ ] `/privacy` loads
- [ ] `/terms` loads

### 3.14 Auth Guards

- [ ] Go to `/profile` while logged out → redirected to `/login`
- [ ] Go to `/cart` while logged out → cart is accessible (guest cart)
- [ ] Go to `/checkout` while logged out → may prompt login or allow guest

---

## End-to-End Rewards Flow

This tests all the wiring between admin settings and customer rewards.

1. **Admin**: Settings → Store tab → set `Points per Dollar = 5`, `Min Points to Redeem = 50`, `Points Value = 2 cents`, `Rewards Enabled = ON` → Save
2. **Customer**: Register or log in
3. **Customer**: Add items totalling $20 → Checkout → Place order
4. **Expected points earned**: 20 × 5 = **100 points**
5. **Customer**: Go to `/points` → balance shows 100
6. **Customer**: Add more items → Checkout → see redeem option → redeem 50 points
7. **Expected discount**: 50 × $0.02 = **$1.00 off**
8. **Admin**: Settings → Store → set `Rewards Enabled = OFF` → Save
9. **Customer**: Try checkout → redeem option is gone / disabled
10. **Admin**: Turn rewards back ON → redeem reappears

---

## Backend API Spot Checks

Run these in a browser or with `curl` to validate the backend directly.

```bash
# Health
curl http://localhost:5005/api/health

# Public menu (no auth)
curl http://localhost:5005/api/menu

# Public settings (no auth)
curl http://localhost:5005/api/settings

# Branches (no auth)
curl http://localhost:5005/api/branches

# Rewards public settings (no auth)
curl http://localhost:5005/api/rewards/settings

# Admin login
curl -X POST http://localhost:5005/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin@123"}'

# Admin settings (replace TOKEN)
curl http://localhost:5005/api/admin/settings \
  -H "Authorization: Bearer TOKEN"
```

---

## Debugging Tips

| Symptom                                  | Where to look                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| Blank white page                         | Browser Console (F12) → Errors tab                                                           |
| API call fails with 401                  | Token expired or missing; log out and back in                                                |
| API call fails with 422                  | Request body schema mismatch; check backend terminal                                         |
| API call fails with 500                  | Backend terminal → Python traceback                                                          |
| `307 Temporary Redirect` in backend logs | Harmless — trailing slash redirect                                                           |
| Image upload fails                       | Check `backend/static/uploads/` folder exists and is writable                                |
| AI import fails to parse                 | Check browser console for the raw Anthropic response; may need a proxy or ANTHROPIC_API_KEY  |
| Rewards points not earned                | Check `points_per_dollar` key exists in settings table; re-save from admin Settings → Store  |
| Menu order not saving                    | Check `display_order` column exists in `menu_items` table (run `init_db.py` again if needed) |

---

## Known Limitations (not bugs)

- **No password reset / forgot password flow**
- **No email verification** on register
- **No online payments** — cash on delivery only
- **Admin order list refreshes every 15s** by polling. Supabase Realtime can make
  this instant, but only if `DATABASE_URL` points at the same Supabase project as
  `VITE_SUPABASE_URL`; otherwise leave those frontend keys unset.
- **Marketing tooling is hidden, not deleted** — Operations, Opportunities,
  Experiments, Missions and Competitors are kept out of the admin sidebar
  (`hiddenNavItems` in `AdminLayout.tsx`) but their routes and APIs still work.
