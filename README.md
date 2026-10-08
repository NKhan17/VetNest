# 🐾 VetNest

**Smart healthcare for every paw.** VetNest is a vet clinic booking web app that connects pet owners, veterinarians and hospitals. Owners book appointments and follow their visit live. they can see live crowd data on a heat map with all the available vetenary hospitals in bengaluru (for now) and their live crowd levels; vets and hospital staff manage the appointments in real time.

> **Status:** Frontend complete (runs fully in the browser with demo data). Backend (Node.js, Express, MongoDB) is in progress.



---

## ✨ Features

### 🐶 Pet owners
- Create an account, then add and edit pet profiles
- Book an appointment in 4 steps: pet → hospital and vet → date and time → confirm
- Live visit tracker with status steps (Booked → Checked in → With the vet → Done), queue position and estimated wait
- Check in on arrival or cancel a visit
- Health records timeline (vaccinations, consultations, lab tests) with reminders for upcoming vaccines

### 🩺 Veterinarians
- Today's queue grouped by: now seeing, waiting room, scheduled, completed
- One-click actions: check in, call in, mark as missed, complete visit (saves a record to the pet's history)
- Patient list with search and full health history

### 🏥 Hospital admins
- Live overview of every doctor: busy or free, who is being seen, how many are waiting
- Today's patients table with check-in
- Appointments page with search and filters (date, status, doctor) and cancel

### 🔄 Live updates
Changes appear instantly across open tabs. For example, when a vet clicks **Call in**, the owner's tracker updates without a refresh.

---

## 🛠️ Tech stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (custom properties, Grid, Flexbox), Inter font via Google Fonts |
| Logic | Vanilla JavaScript (no frameworks, no build step) |
| Data (current) | `localStorage` + `BroadcastChannel` for cross-tab sync |
| Data (planned) | Node.js, Express, MongoDB (Mongoose), JWT auth |

---

## 🚀 Getting started

No installation is required.

**Option 1: open directly**
Open `index.html` in a browser.

**Option 2: run a local server (recommended)**
Some browser features behave more reliably on `http://localhost` than on `file://`.

```bash
# with Node.js
npx live-server --port=3000

# or with Python
python -m http.server 3000
```

Then visit `http://localhost:3000`.

### Try the demo
On the login page, use **"Try the demo as"** and pick a role:

| Role | Signs in as |
|---|---|
| 🐶 Pet owner | Demo Owner (with two pets, records and a live visit) |
| 🩺 Veterinarian | Dr. Anita Sharma |
| 🏥 Hospital | Paws & Care Veterinary Hospital |

**See the live sync:** open the owner demo in one browser tab and the vet demo in another. Then, as the vet, click **Call in** on Bruno and watch the owner's tracker update.

You can also create your own owner account from the register page.

---

## 📁 Project structure

```
vetnest/
├── index.html                  # Landing page
├── login.html                  # Login + demo access
├── register.html               # Owner sign-up
├── owner-dashboard.html        # Owner: overview and live visit
├── pets.html                   # Owner: pet profiles
├── appointment.html            # Owner: 4-step booking
├── tracking.html               # Owner: live visit tracker
├── records.html                # Owner: health records
├── vet-dashboard.html          # Vet: today's queue
├── vet-patients.html           # Vet: patients and history
├── hospital-dashboard.html     # Hospital: live overview
├── hospital-appointments.html  # Hospital: all appointments
├── css/
│   ├── global.css              # Design tokens, buttons, shared styles
│   ├── landing.css             # Landing page
│   ├── auth.css                # Login and register
│   └── app.css                 # Dashboards and app screens
└── js/
    ├── app.js                  # Landing page behaviour (mobile menu)
    ├── auth.js                 # Login, register, demo access
    ├── store.js                # Data layer (the file to swap for an API)
    ├── ui.js                   # Toasts, dialogs, helpers
    ├── shell.js                # Sidebar, top bar, role guard
    ├── owner.js                # Owner pages
    └── staff.js                # Vet and hospital pages
```

---

## 🧠 How it works

- **`store.js` is the data layer.** All reads and writes (pets, appointments, records, sessions) go through its functions, such as `VN.book()` and `VN.setStatus()`. Page scripts never touch `localStorage` directly.
- **Live sync:** every save posts a message on a `BroadcastChannel` (with the `storage` event as a fallback). Pages subscribe with `VN.onChange(render)` and re-render.
- **Queue estimate:** patients with the same vet on the same day who are scheduled earlier and still active count as "ahead". Wait time is roughly 20 minutes per patient ahead, or 10 for one already in consultation.
- **Booking slots:** 30-minute slots from 9:00 AM to 5:30 PM with a lunch break from 1 to 2 PM. Taken and past slots are disabled.
- **Role guard:** each dashboard page calls `Shell.init(role)`, which redirects to login if there is no session or the role does not match.

---

## ⚠️ Current limitations

- Data lives in the browser, so it is not shared between devices or users.
- Passwords are stored in plain text in `localStorage` for demo purposes. **Do not use real passwords.**
- Hospitals and doctors are placeholder data in `js/store.js`.
- Forgot password is front-end only.

---

## 🗺️ Roadmap

- [ ] Node.js + Express REST API
- [ ] MongoDB schemas for users, pets, appointments and records
- [ ] JWT authentication with hashed passwords (bcrypt)
- [ ] Replace `store.js` calls with API requests
- [ ] Real-time updates with WebSockets (replacing the cross-tab sync)
- [ ] Email or SMS reminders for vaccines and appointments
- [ ] Deploy frontend and backend

---

## 🤝 Development notes

The frontend was built with AI assistance (Claude) and then studied and extended by me. The backend is being written by me, with AI used for guidance and code review.

