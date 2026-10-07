/* =========================================================
   VetNest – data layer (frontend demo)
   ---------------------------------------------------------
   Everything lives in localStorage so the whole product can
   be demoed without a backend. Changes are broadcast between
   tabs, so a vet moving a patient forward is instantly seen
   by the owner's tracker in another tab/window.

   When you add a real API, replace the functions in this file
   (VN.book, VN.setStatus, ...) and keep the page scripts as is.
   ========================================================= */
const VN = (() => {
    const DB_KEY = "vetnestDB";
    const SESSION_KEY = "vetnestSession";
    const DEMO_EMAIL = "demo@vetnest.app";

    /* ---------- Static catalogue ---------- */
    const hospitals = [
        { id: "h1", name: "Paws & Care Veterinary Hospital", area: "Central Branch", hours: "9:00 AM – 6:00 PM" },
        { id: "h2", name: "Green Cross Animal Clinic", area: "Lakeside Branch", hours: "9:00 AM – 6:00 PM" },
        { id: "h3", name: "City Pet Hospital", area: "Riverside Branch", hours: "9:00 AM – 6:00 PM" }
    ];

    const vets = [
        { id: "v1", name: "Dr. Anita Sharma", spec: "General practice", hospitalId: "h1" },
        { id: "v2", name: "Dr. Rohan Mehta", spec: "Surgery", hospitalId: "h1" },
        { id: "v3", name: "Dr. Priya Nair", spec: "Skin & allergy", hospitalId: "h2" },
        { id: "v4", name: "Dr. Karthik Rao", spec: "Dental care", hospitalId: "h2" },
        { id: "v5", name: "Dr. Sana Khan", spec: "Birds & exotics", hospitalId: "h3" },
        { id: "v6", name: "Dr. Vikram Iyer", spec: "General practice", hospitalId: "h3" }
    ];

    const STATUS = {
        "booked": { label: "Scheduled", tone: "blue" },
        "checked-in": { label: "Waiting", tone: "amber" },
        "in-consult": { label: "In consultation", tone: "orange" },
        "completed": { label: "Completed", tone: "green" },
        "cancelled": { label: "Cancelled", tone: "grey" },
        "no-show": { label: "Missed", tone: "red" }
    };

    const ACTIVE = ["booked", "checked-in", "in-consult"];
    const SPECIES = { dog: "🐶", cat: "🐱", bird: "🦜", rabbit: "🐰", other: "🐾" };
    const AVG_CONSULT_MIN = 20;

    const HOME = {
        owner: "owner-dashboard.html",
        vet: "vet-dashboard.html",
        hospital: "hospital-dashboard.html"
    };

    /* ---------- Small helpers ---------- */
    const pad = (n) => String(n).padStart(2, "0");
    const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = () => ymd(new Date());
    const addDays = (n, from) => { const d = from ? new Date(from + "T00:00:00") : new Date(); d.setDate(d.getDate() + n); return ymd(d); };
    const uid = (p) => p + Math.random().toString(36).slice(2, 9);
    const hhmm = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
    const toMins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

    const fmtTime = (t) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`; };
    const fmtDate = (s, opts) => new Date(s + "T00:00:00").toLocaleDateString("en-IN", opts || { weekday: "short", day: "numeric", month: "short" });
    const daysUntil = (s) => Math.round((new Date(s + "T00:00:00") - new Date(today() + "T00:00:00")) / 86400000);

    const vetById = (id) => vets.find((v) => v.id === id);
    const hospitalById = (id) => hospitals.find((h) => h.id === id);
    const badge = (status) => {
        const s = STATUS[status] || STATUS.booked;
        return `<span class="badge badge-${s.tone}">${s.label}</span>`;
    };

    /* ---------- Storage + live sync ---------- */
    function load() {
        let d = null;
        try { d = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { /* ignore */ }
        if (!d || typeof d !== "object") d = { pets: [], appointments: [], records: [], seedDate: null };
        return d;
    }

    const subs = [];
    let queued = false;
    function emit() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; subs.forEach((fn) => fn()); });
    }

    let channel = null;
    try { channel = new BroadcastChannel("vetnest"); channel.onmessage = emit; } catch (e) { /* older browsers use the storage event below */ }
    window.addEventListener("storage", (e) => { if (e.key === DB_KEY) emit(); });

    function save(d) {
        localStorage.setItem(DB_KEY, JSON.stringify(d));
        if (channel) channel.postMessage("change");
        emit();
    }

    const onChange = (fn) => subs.push(fn);

    /* ---------- Demo / seed data ---------- */
    function baseSlot() {
        const n = new Date();
        let m = Math.ceil((n.getHours() * 60 + n.getMinutes()) / 30) * 30;
        if (m < 600 || m > 960) m = 660; // keep the demo queue inside opening hours
        return m;
    }

    function buildDaySeed(d) {
        const t = today();
        const base = baseSlot();
        d.appointments = d.appointments.filter((a) => !a.seed);

        const make = (vetId, petName, species, mins, status, extra) => {
            const v = vetById(vetId);
            d.appointments.push(Object.assign({
                id: uid("apt_"),
                token: "VN-" + (1000 + Math.floor(Math.random() * 9000)),
                petId: uid("seedpet_"),
                petName, species,
                ownerEmail: "walkin-" + petName.toLowerCase() + "@example.com",
                ownerName: "Walk-in client",
                hospitalId: v.hospitalId, vetId,
                date: t, time: hhmm(mins),
                reason: "General checkup",
                status, notes: "",
                createdAt: Date.now() - (600 - mins), seed: true
            }, extra || {}));
        };

        make("v1", "Coco", "dog", base - 60, "completed");
        make("v1", "Luna", "cat", base - 30, "in-consult");
        make("v1", "Rocky", "dog", base, "checked-in", { reason: "Vaccination" });
        make("v1", "Max", "dog", base + 60, "booked");
        make("v2", "Simba", "cat", base - 30, "in-consult", { reason: "Surgery follow-up" });
        make("v2", "Daisy", "dog", base, "checked-in");
        make("v3", "Pepper", "dog", base, "checked-in", { reason: "Skin rash" });
        make("v5", "Kiwi", "bird", base + 30, "booked", { reason: "Wing check" });

        // appointments for the demo owner, if the demo pets exist
        const bruno = d.pets.find((p) => p.id === "pet_bruno");
        const misty = d.pets.find((p) => p.id === "pet_misty");
        const owner = { ownerEmail: DEMO_EMAIL, ownerName: "Demo Owner", demo: true };

        if (bruno) {
            make("v1", bruno.name, "dog", base + 30, "checked-in", Object.assign({ petId: bruno.id, reason: "Skin allergy follow-up" }, owner));
        }
        if (misty) {
            make("v1", misty.name, "cat", 600, "booked", Object.assign({ petId: misty.id, date: addDays(3), reason: "Vaccination" }, owner));
        }
        d.seedDate = t;
    }

    function init() {
        const d = load();
        if (d.seedDate !== today()) { buildDaySeed(d); save(d); }
    }

    function ensureDemoOwner() {
        const d = load();
        if (!d.pets.some((p) => p.id === "pet_bruno")) {
            d.pets.push(
                { id: "pet_bruno", ownerEmail: DEMO_EMAIL, name: "Bruno", species: "dog", emoji: SPECIES.dog, breed: "Golden Retriever", age: 4, weight: 29, notes: "Sensitive to chicken-based food." },
                { id: "pet_misty", ownerEmail: DEMO_EMAIL, name: "Misty", species: "cat", emoji: SPECIES.cat, breed: "Persian", age: 2, weight: 4.1, notes: "" }
            );
            d.records.push(
                { id: uid("rec_"), petId: "pet_bruno", type: "vaccination", title: "Rabies booster", date: addDays(-20), vet: "Dr. Anita Sharma", notes: "No reaction.", nextDue: addDays(345) },
                { id: uid("rec_"), petId: "pet_bruno", type: "vaccination", title: "DHPP vaccine", date: addDays(-120), vet: "Dr. Anita Sharma", notes: "", nextDue: addDays(245) },
                { id: uid("rec_"), petId: "pet_bruno", type: "consultation", title: "Skin allergy check", date: addDays(-60), vet: "Dr. Priya Nair", notes: "Switched to a fish-based diet. Review in two months.", nextDue: "" },
                { id: uid("rec_"), petId: "pet_bruno", type: "lab", title: "Blood panel", date: addDays(-60), vet: "Dr. Priya Nair", notes: "All values in normal range.", nextDue: "" },
                { id: uid("rec_"), petId: "pet_misty", type: "vaccination", title: "FVRCP vaccine", date: addDays(-355), vet: "Dr. Vikram Iyer", notes: "", nextDue: addDays(10) }
            );
            d.appointments.push({
                id: uid("apt_"), token: "VN-4821", petId: "pet_bruno", petName: "Bruno", species: "dog",
                ownerEmail: DEMO_EMAIL, ownerName: "Demo Owner", hospitalId: "h1", vetId: "v1",
                date: addDays(-20), time: "10:30", reason: "Vaccination", status: "completed", notes: "", createdAt: Date.now() - 2e9
            });
        }
        buildDaySeed(d);
        save(d);
    }

    /* ---------- Session ---------- */
    function getSession() {
        try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
    }

    function setSession(s) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        localStorage.setItem("vetnestLoggedIn", "true");
    }

    function demoSession(role) {
        if (role === "vet") return { role, name: "Dr. Anita Sharma", email: "vet@vetnest.app", vetId: "v1", hospitalId: "h1" };
        if (role === "hospital") return { role, name: "Paws & Care Admin", email: "admin@vetnest.app", hospitalId: "h1" };
        ensureDemoOwner();
        return { role: "owner", name: "Demo Owner", email: DEMO_EMAIL };
    }

    function logout() {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem("vetnestLoggedIn");
        location.href = "login.html";
    }

    function requireRole(role) {
        const s = getSession();
        if (!s) {
            const page = location.pathname.split("/").pop() || "index.html";
            location.replace("login.html?next=" + encodeURIComponent(page));
            return null;
        }
        if (s.role !== role) { location.replace(HOME[s.role] || "login.html"); return null; }
        return s;
    }

    /* ---------- Pets ---------- */
    const petsOf = (email) => load().pets.filter((p) => p.ownerEmail === email);
    const petById = (id) => load().pets.find((p) => p.id === id);

    function addPet(p) {
        const d = load();
        const pet = Object.assign({ id: uid("pet_"), emoji: SPECIES[p.species] || SPECIES.other }, p);
        d.pets.push(pet);
        save(d);
        return pet;
    }

    function updatePet(id, patch) {
        const d = load();
        const pet = d.pets.find((p) => p.id === id);
        if (!pet) return;
        Object.assign(pet, patch, { emoji: SPECIES[patch.species || pet.species] || SPECIES.other });
        d.appointments.forEach((a) => { if (a.petId === id) { a.petName = pet.name; a.species = pet.species; } });
        save(d);
    }

    function removePet(id) {
        const d = load();
        d.pets = d.pets.filter((p) => p.id !== id);
        d.records = d.records.filter((r) => r.petId !== id);
        d.appointments.forEach((a) => { if (a.petId === id && ACTIVE.includes(a.status)) a.status = "cancelled"; });
        save(d);
    }

    /* ---------- Appointments ---------- */
    const byTime = (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.createdAt - b.createdAt;
    const apptsOf = (email) => load().appointments.filter((a) => a.ownerEmail === email).sort(byTime);
    const apptById = (id) => load().appointments.find((a) => a.id === id);
    const allAppts = (fn) => load().appointments.filter(fn || (() => true)).sort(byTime);

    function slotsFor(vetId, date) {
        const d = load();
        const taken = new Set(d.appointments.filter((a) => a.vetId === vetId && a.date === date && ACTIVE.includes(a.status)).map((a) => a.time));
        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const slots = [];
        for (let m = 9 * 60; m <= 17 * 60 + 30; m += 30) {
            if (m >= 13 * 60 && m < 14 * 60) continue; // lunch break
            const time = hhmm(m);
            slots.push({ time, taken: taken.has(time), past: date === today() && m <= nowMins });
        }
        return slots;
    }

    function book({ pet, owner, hospitalId, vetId, date, time, reason, notes }) {
        const d = load();
        const clash = d.appointments.some((a) => a.vetId === vetId && a.date === date && a.time === time && ACTIVE.includes(a.status));
        if (clash) return null;
        const appt = {
            id: uid("apt_"), token: "VN-" + (1000 + Math.floor(Math.random() * 9000)),
            petId: pet.id, petName: pet.name, species: pet.species,
            ownerEmail: owner.email, ownerName: owner.name,
            hospitalId, vetId, date, time, reason, notes: notes || "",
            status: "booked", createdAt: Date.now()
        };
        d.appointments.push(appt);
        save(d);
        return appt;
    }

    function setStatus(id, status) {
        const d = load();
        const a = d.appointments.find((x) => x.id === id);
        if (!a) return;
        a.status = status;
        a.updatedAt = Date.now();
        save(d);
    }

    function completeVisit(id, { title, notes, nextDue }) {
        const d = load();
        const a = d.appointments.find((x) => x.id === id);
        if (!a) return;
        a.status = "completed";
        a.updatedAt = Date.now();
        d.records.push({
            id: uid("rec_"), petId: a.petId,
            type: /vaccin/i.test(a.reason + " " + title) ? "vaccination" : "consultation",
            title: title || a.reason, date: today(),
            vet: (vetById(a.vetId) || {}).name || "", notes: notes || "", nextDue: nextDue || ""
        });
        save(d);
    }

    /* Queue maths: who is ahead of this patient with the same vet today */
    function queueInfo(a) {
        const ahead = load().appointments
            .filter((x) => x.id !== a.id && x.vetId === a.vetId && x.date === a.date && ACTIVE.includes(x.status) && byTime(x, a) < 0);
        const waitMin = ahead.reduce((sum, x) => sum + (x.status === "in-consult" ? AVG_CONSULT_MIN / 2 : AVG_CONSULT_MIN), 0);
        return { ahead, position: a.status === "in-consult" ? 0 : ahead.length + 1, waitMin };
    }

    /* ---------- Records ---------- */
    function recordsOf(petIds) {
        const ids = new Set(petIds);
        return load().records.filter((r) => ids.has(r.petId)).sort((a, b) => b.date.localeCompare(a.date));
    }

    function addRecord(rec) {
        const d = load();
        const r = Object.assign({ id: uid("rec_") }, rec);
        d.records.push(r);
        save(d);
        return r;
    }

    function reminders(pets) {
        const byId = Object.fromEntries(pets.map((p) => [p.id, p]));
        return recordsOf(pets.map((p) => p.id))
            .filter((r) => r.nextDue && daysUntil(r.nextDue) <= 45)
            .map((r) => ({ pet: byId[r.petId], title: r.title, due: r.nextDue, days: daysUntil(r.nextDue) }))
            .sort((a, b) => a.days - b.days);
    }

    init();

    return {
        hospitals, vets, STATUS, ACTIVE, SPECIES, AVG_CONSULT_MIN, HOME, DEMO_EMAIL,
        today, addDays, ymd, fmtTime, fmtDate, daysUntil, toMins,
        vetById, hospitalById, badge,
        onChange, session: getSession, setSession, demoSession, logout, requireRole,
        petsOf, petById, addPet, updatePet, removePet,
        apptsOf, apptById, allAppts, slotsFor, book, setStatus, completeVisit, queueInfo,
        recordsOf, addRecord, reminders
    };
})();
