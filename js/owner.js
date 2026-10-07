/* VetNest – pet owner pages: dashboard, pets, booking, tracking, records */
(() => {
    const me = Shell.init("owner");
    if (!me) return;

    const $ = (s, r) => (r || document).querySelector(s);
    const esc = UI.esc;
    const TODAY = VN.today();

    const STEPS = [["booked", "Booked"], ["checked-in", "Checked in"], ["in-consult", "With the vet"], ["completed", "Done"]];

    function stepper(status) {
        const idx = status === "completed" ? 4 : STEPS.findIndex((s) => s[0] === status);
        return '<ol class="stepper">' + STEPS.map((s, i) =>
            '<li class="' + (i < idx ? "done" : i === idx ? "current" : "") + '"><span>' + (i < idx ? "✓" : i + 1) + "</span><em>" + s[1] + "</em></li>"
        ).join("") + "</ol>";
    }

    const emojiOf = (a) => VN.SPECIES[a.species] || VN.SPECIES.other;
    const when = (a) => (a.date === TODAY ? "Today" : VN.fmtDate(a.date)) + " · " + VN.fmtTime(a.time);

    function waitText(a) {
        if (a.status === "in-consult") return "With the vet now";
        const q = VN.queueInfo(a);
        return q.waitMin ? "About " + Math.round(q.waitMin) + " min" : "You're next";
    }

    function apptRow(a, href) {
        const v = VN.vetById(a.vetId);
        return '<a class="row" href="' + href + '"><span class="row-ico">' + emojiOf(a) + '</span>' +
            '<div class="row-main"><strong>' + esc(a.petName) + " · " + esc(a.reason) + "</strong><small>" + when(a) + " · " + esc(v.name) + "</small></div>" +
            '<div class="row-side">' + VN.badge(a.status) + "</div></a>";
    }

    const emptyBox = (ico, title, text, btn) =>
        '<div class="empty"><span class="empty-ico">' + ico + "</span><strong>" + title + "</strong><p>" + text + "</p>" + (btn || "") + "</div>";

    /* ================= Dashboard ================= */
    function dashboard() {
        const hour = new Date().getHours();
        $("#greeting").textContent = (hour < 12 ? "Good morning, " : hour < 18 ? "Good afternoon, " : "Good evening, ") + me.name.split(" ")[0];

        const render = () => {
            const pets = VN.petsOf(me.email);
            const appts = VN.apptsOf(me.email);
            const upcoming = appts.filter((a) => VN.ACTIVE.includes(a.status));
            const live = upcoming.find((a) => a.date === TODAY && a.status !== "booked");
            const recs = VN.recordsOf(pets.map((p) => p.id));

            $("#stats").innerHTML = [
                ["🐶", pets.length, "Pets"],
                ["📅", upcoming.length, "Upcoming visits"],
                ["🏥", appts.filter((a) => a.status === "completed").length, "Visits completed"],
                ["🩺", recs.length, "Health records"]
            ].map((s) => '<div class="stat"><span class="stat-ico">' + s[0] + "</span><div><strong>" + s[1] + "</strong><span>" + s[2] + "</span></div></div>").join("");

            // live card
            const card = $("#liveCard");
            const focus = live || upcoming[0];
            if (!focus) {
                card.classList.remove("live-card");
                card.innerHTML = emptyBox("📅", "No visits coming up", "Book a time with a vet and you can follow it live here.",
                    '<a href="appointment.html" class="button button-primary button-sm">Book appointment</a>');
            } else {
                const v = VN.vetById(focus.vetId);
                const h = VN.hospitalById(focus.hospitalId);
                const isLive = !!live;
                const q = VN.queueInfo(focus);
                card.classList.add("live-card");
                card.innerHTML =
                    '<div class="live-top">' + (isLive ? '<span class="live-pill"><i></i>Live now</span>' : '<span class="badge badge-blue">Next visit</span>') +
                    '<span class="muted">Token ' + esc(focus.token) + "</span></div>" +
                    "<h2>" + (focus.status === "in-consult" ? esc(focus.petName) + " is with " + esc(v.name)
                        : focus.status === "checked-in" ? esc(focus.petName) + " is waiting at " + esc(h.name)
                        : esc(focus.petName) + " sees " + esc(v.name) + " · " + when(focus)) + "</h2>" +
                    '<div class="metrics">' +
                    '<div class="metric"><strong>' + (focus.status === "in-consult" ? "Now" : "#" + q.position) + "</strong><span>Place in queue</span></div>" +
                    '<div class="metric"><strong>' + (focus.status === "booked" && !isLive ? when(focus) : waitText(focus)) + "</strong><span>" + (focus.status === "booked" && !isLive ? "Appointment" : "Estimated wait") + "</span></div>" +
                    '<div class="metric"><strong>' + esc(v.name) + "</strong><span>" + esc(h.name) + "</span></div></div>" +
                    stepper(focus.status) +
                    '<div class="page-actions" style="margin-top:18px"><a class="button button-primary button-sm" href="tracking.html?id=' + focus.id + '">Open live tracker</a></div>';
            }

            // upcoming list
            $("#upcomingList").innerHTML = upcoming.length
                ? upcoming.slice(0, 4).map((a) => apptRow(a, "tracking.html?id=" + a.id)).join("")
                : emptyBox("🗓️", "Nothing scheduled", "Your upcoming appointments will show up here.");

            // reminders
            const rem = VN.reminders(pets);
            $("#reminders").innerHTML = rem.length
                ? rem.slice(0, 3).map((r) =>
                    '<div class="reminder ' + (r.days < 0 ? "overdue" : "") + '"><div><strong>' + esc(r.title) + " · " + esc(r.pet.name) + "</strong><small>" +
                    (r.days < 0 ? "Overdue by " + Math.abs(r.days) + " days" : r.days === 0 ? "Due today" : "Due in " + r.days + " days") + " · " + VN.fmtDate(r.due, { day: "numeric", month: "short", year: "numeric" }) +
                    '</small></div><a class="button button-ghost button-sm" href="appointment.html?pet=' + r.pet.id + "&reason=" + encodeURIComponent(/vaccin|booster/i.test(r.title) ? "Vaccination" : "Checkup") + '">Book</a></div>').join("")
                : emptyBox("✅", "You're all caught up", "Vaccination and follow-up reminders will appear here.");

            // pets
            $("#petStrip").innerHTML = pets.length
                ? pets.map((p) => '<a class="row" href="pets.html"><span class="row-ico">' + p.emoji + '</span><div class="row-main"><strong>' + esc(p.name) + "</strong><small>" + esc(p.breed || p.species) + (p.age !== "" && p.age != null ? " · " + esc(p.age) + " yrs" : "") + "</small></div></a>").join("")
                : emptyBox("🐾", "Add your first pet", "Create a profile to start booking visits.", '<a href="pets.html?add=1" class="button button-primary button-sm">Add a pet</a>');
        };

        render();
        VN.onChange(render);
    }

    /* ================= Pets ================= */
    function pets() {
        const dlg = $("#petDialog");
        const form = $("#petForm");

        const render = () => {
            const list = VN.petsOf(me.email);
            $("#petGrid").innerHTML = list.length ? list.map((p) =>
                '<article class="pet-tile"><div class="pet-tile-top">' + p.emoji + '</div><div class="pet-tile-body"><h3>' + esc(p.name) + "</h3><p>" + esc(p.breed || p.species) + "</p>" +
                '<div class="pet-facts">' + (p.age !== "" && p.age != null ? "<span>" + esc(p.age) + " yrs</span>" : "") + (p.weight !== "" && p.weight != null ? "<span>" + esc(p.weight) + " kg</span>" : "") + "<span>" + esc(p.species) + "</span></div>" +
                (p.notes ? '<p class="muted" style="margin-bottom:12px">' + esc(p.notes) + "</p>" : "") +
                '<div class="pet-tile-actions"><a class="button button-primary button-sm" href="appointment.html?pet=' + p.id + '">Book visit</a>' +
                '<button type="button" class="button button-ghost button-sm" data-edit="' + p.id + '">Edit</button>' +
                '<button type="button" class="button button-ghost button-sm" data-del="' + p.id + '">Remove</button></div></div></article>'
            ).join("") : '<div style="grid-column:1/-1">' + emptyBox("🐾", "No pets yet", "Add your pet to book visits and keep their records together.", '<button type="button" class="button button-primary button-sm" id="emptyAdd">Add a pet</button>') + "</div>";
        };

        const openForm = (pet) => {
            form.reset();
            $("#petDialogTitle").textContent = pet ? "Edit " + pet.name : "Add a pet";
            $("#petId").value = pet ? pet.id : "";
            if (pet) {
                $("#petName").value = pet.name; $("#petSpecies").value = pet.species; $("#petBreed").value = pet.breed || "";
                $("#petAge").value = pet.age == null ? "" : pet.age; $("#petWeight").value = pet.weight == null ? "" : pet.weight; $("#petNotes").value = pet.notes || "";
            }
            UI.open("petDialog");
            $("#petName").focus();
        };

        $("#addPetBtn").addEventListener("click", () => openForm());
        document.addEventListener("click", async (e) => {
            if (e.target.id === "emptyAdd") return openForm();
            const edit = e.target.closest("[data-edit]");
            const del = e.target.closest("[data-del]");
            if (edit) openForm(VN.petById(edit.dataset.edit));
            if (del) {
                const p = VN.petById(del.dataset.del);
                const ok = await UI.confirmBox({ title: "Remove " + p.name + "?", text: "Their profile and health records will be deleted, and any upcoming visits cancelled.", ok: "Remove pet", cancel: "Keep pet", danger: true });
                if (ok) { VN.removePet(p.id); UI.toast(p.name + " was removed"); }
            }
        });

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const data = {
                name: $("#petName").value.trim(), species: $("#petSpecies").value, breed: $("#petBreed").value.trim(),
                age: $("#petAge").value, weight: $("#petWeight").value, notes: $("#petNotes").value.trim()
            };
            const id = $("#petId").value;
            if (id) { VN.updatePet(id, data); UI.toast(data.name + " was updated"); }
            else { VN.addPet(Object.assign({ ownerEmail: me.email }, data)); UI.toast(data.name + " was added"); }
            UI.close("petDialog");
        });

        VN.onChange(render);
        render();
        if (new URLSearchParams(location.search).get("add")) openForm();
    }

    /* ================= Booking ================= */
    function booking() {
        const myPets = VN.petsOf(me.email);
        const q = new URLSearchParams(location.search);
        const st = { step: 1, petId: q.get("pet") || "", hospitalId: "", vetId: "", date: "", time: "", reason: q.get("reason") || "", notes: "" };
        if (!myPets.some((p) => p.id === st.petId)) st.petId = myPets.length === 1 ? myPets[0].id : "";
        if (st.petId) st.step = 2;

        const REASONS = ["Checkup", "Vaccination", "Illness or injury", "Skin or allergy", "Dental care", "Surgery consultation", "Other"];
        const LABELS = ["Pet", "Hospital & vet", "Date & time", "Confirm"];
        const pet = () => myPets.find((p) => p.id === st.petId);

        const valid = () => ({
            1: !!st.petId, 2: !!st.hospitalId && !!st.vetId, 3: !!st.date && !!st.time, 4: !!st.reason
        }[st.step]);

        function stepBody() {
            if (st.step === 1) {
                return '<h2 class="step-title">Who is the visit for?</h2><p class="step-sub">Pick the pet you are booking for.</p>' +
                    (myPets.length
                        ? '<div class="choice-grid">' + myPets.map((p) => '<button type="button" class="choice' + (st.petId === p.id ? " selected" : "") + '" data-pet="' + p.id + '"><span class="choice-emoji">' + p.emoji + "</span><strong>" + esc(p.name) + "</strong><small>" + esc(p.breed || p.species) + "</small></button>").join("") +
                          '<a class="choice" href="pets.html?add=1"><span class="choice-emoji">＋</span><strong>Add a pet</strong><small>Create a new profile</small></a></div>'
                        : emptyBox("🐾", "Add a pet first", "You need a pet profile before you can book a visit.", '<a href="pets.html?add=1" class="button button-primary button-sm">Add a pet</a>'));
            }
            if (st.step === 2) {
                const vets = VN.vets.filter((v) => v.hospitalId === st.hospitalId);
                return '<h2 class="step-title">Where and with whom?</h2><p class="step-sub">Choose a hospital, then a veterinarian.</p>' +
                    '<div class="choice-grid">' + VN.hospitals.map((h) => '<button type="button" class="choice' + (st.hospitalId === h.id ? " selected" : "") + '" data-hospital="' + h.id + '"><span class="choice-emoji">🏥</span><strong>' + esc(h.name) + "</strong><small>" + esc(h.area) + " · " + esc(h.hours) + "</small></button>").join("") + "</div>" +
                    (st.hospitalId ? '<h3 class="sub-title">Veterinarians</h3><div class="choice-grid">' + vets.map((v) => '<button type="button" class="choice' + (st.vetId === v.id ? " selected" : "") + '" data-vet="' + v.id + '"><span class="avatar">' + esc(UI.initials(v.name)) + '</span><strong style="margin-top:6px">' + esc(v.name) + "</strong><small>" + esc(v.spec) + "</small></button>").join("") + "</div>" : "");
            }
            if (st.step === 3) {
                let days = "";
                for (let i = 0; i < 14; i++) {
                    const d = VN.addDays(i);
                    const dt = new Date(d + "T00:00:00");
                    days += '<button type="button" class="date-chip' + (st.date === d ? " selected" : "") + '" data-date="' + d + '"><small>' + (i === 0 ? "Today" : dt.toLocaleDateString("en-IN", { weekday: "short" })) + "</small><strong>" + dt.getDate() + "</strong><small>" + dt.toLocaleDateString("en-IN", { month: "short" }) + "</small></button>";
                }
                let slots = '<p class="muted">Pick a date to see available times.</p>';
                if (st.date) {
                    const list = VN.slotsFor(st.vetId, st.date);
                    const free = list.filter((s) => !s.taken && !s.past).length;
                    slots = free ? '<div class="slot-grid">' + list.map((s) => '<button type="button" class="slot' + (st.time === s.time ? " selected" : "") + '" data-time="' + s.time + '"' + (s.taken || s.past ? " disabled" : "") + ">" + VN.fmtTime(s.time) + "</button>").join("") + "</div>"
                        : '<div class="notice">No free slots on this day. Try another date.</div>';
                }
                return '<h2 class="step-title">Pick a date and time</h2><p class="step-sub">Slots for ' + esc(VN.vetById(st.vetId).name) + ". Lunch break is 1 to 2 PM.</p>" +
                    '<div class="date-strip">' + days + '</div><h3 class="sub-title">Available times</h3>' + slots;
            }
            return '<h2 class="step-title">What is the visit for?</h2><p class="step-sub">A short note helps the vet prepare.</p>' +
                '<div class="form-stack"><div class="field"><label for="reason">Reason for visit</label><select id="reason"><option value="">Select a reason</option>' +
                REASONS.map((r) => "<option" + (st.reason === r ? " selected" : "") + ">" + r + "</option>").join("") + "</select></div>" +
                '<div class="field"><label for="notes">Anything the vet should know? <span class="muted">(optional)</span></label><textarea id="notes" placeholder="Symptoms, how long they have lasted, medication...">' + esc(st.notes) + "</textarea></div></div>";
        }

        function summary() {
            const p = pet(), v = st.vetId && VN.vetById(st.vetId), h = st.hospitalId && VN.hospitalById(st.hospitalId);
            const item = (label, val) => "<div><dt>" + label + "</dt><dd" + (val ? "" : ' class="pending"') + ">" + (val ? esc(val) : "Not chosen yet") + "</dd></div>";
            return item("Pet", p && p.name) + item("Hospital", h && h.name) + item("Veterinarian", v && v.name) +
                item("Date", st.date && VN.fmtDate(st.date, { weekday: "long", day: "numeric", month: "long" })) + item("Time", st.time && VN.fmtTime(st.time)) + item("Reason", st.reason);
        }

        function render() {
            $("#bookSteps").innerHTML = LABELS.map((l, i) => '<span class="' + (i + 1 === st.step ? "current" : i + 1 < st.step ? "done" : "") + '">' + (i + 1) + ". " + l + "</span>").join("");
            $("#stepBody").innerHTML = stepBody();
            $("#summary").innerHTML = summary();
            $("#backBtn").style.visibility = st.step === 1 ? "hidden" : "visible";
            $("#nextBtn").textContent = st.step === 4 ? "Confirm booking" : "Continue";
            $("#nextBtn").disabled = !valid();
        }

        $("#stepBody").addEventListener("click", (e) => {
            const t = e.target.closest("button");
            if (!t) return;
            if (t.dataset.pet) st.petId = t.dataset.pet;
            if (t.dataset.hospital && t.dataset.hospital !== st.hospitalId) { st.hospitalId = t.dataset.hospital; st.vetId = ""; st.time = ""; }
            if (t.dataset.vet) { if (st.vetId !== t.dataset.vet) st.time = ""; st.vetId = t.dataset.vet; }
            if (t.dataset.date) { st.date = t.dataset.date; st.time = ""; }
            if (t.dataset.time) st.time = t.dataset.time;
            if (t.dataset.pet || t.dataset.hospital || t.dataset.vet || t.dataset.date || t.dataset.time) render();
        });

        $("#stepBody").addEventListener("input", (e) => {
            if (e.target.id === "reason") st.reason = e.target.value;
            if (e.target.id === "notes") st.notes = e.target.value;
            $("#summary").innerHTML = summary();
            $("#nextBtn").disabled = !valid();
        });

        $("#backBtn").addEventListener("click", () => { if (st.step > 1) { st.step--; render(); } });

        $("#nextBtn").addEventListener("click", () => {
            if (!valid()) return;
            if (st.step < 4) { st.step++; return render(); }

            const appt = VN.book({ pet: pet(), owner: { name: me.name, email: me.email }, hospitalId: st.hospitalId, vetId: st.vetId, date: st.date, time: st.time, reason: st.reason, notes: st.notes });
            if (!appt) {
                UI.toast("That slot was just taken. Please pick another time.", "error");
                st.step = 3; st.time = ""; return render();
            }
            const v = VN.vetById(appt.vetId), h = VN.hospitalById(appt.hospitalId);
            $("#bookSteps").innerHTML = "";
            $("#bookCard").parentElement.innerHTML =
                '<section class="card success" style="grid-column:1/-1"><div class="success-ico">✓</div><h2>You\'re booked in</h2>' +
                '<p class="muted">' + esc(appt.petName) + " sees " + esc(v.name) + " at " + esc(h.name) + " on " + VN.fmtDate(appt.date, { weekday: "long", day: "numeric", month: "long" }) + " at " + VN.fmtTime(appt.time) + ".</p>" +
                '<span class="token">' + esc(appt.token) + '</span><p class="muted" style="font-size:.85rem">Show this token at the front desk, or check in from the tracker on the day.</p>' +
                '<div class="page-actions"><a class="button button-primary" href="tracking.html?id=' + appt.id + '">Track this visit</a><a class="button button-ghost" href="owner-dashboard.html">Back to dashboard</a></div></section>';
        });

        // if someone else books a slot while you are choosing, refresh the grid
        VN.onChange(() => { if (st.step === 3 && st.date && $("#stepBody")) { const keep = st.time; if (keep && VN.slotsFor(st.vetId, st.date).find((s) => s.time === keep && s.taken)) st.time = ""; render(); } });
        render();
    }

    /* ================= Tracking ================= */
    function tracking() {
        let tab = "active";
        let selected = new URLSearchParams(location.search).get("id") || "";

        const render = () => {
            const all = VN.apptsOf(me.email);
            const active = all.filter((a) => VN.ACTIVE.includes(a.status));
            const past = all.filter((a) => !VN.ACTIVE.includes(a.status)).reverse();

            const chosen = all.find((a) => a.id === selected);
            if (chosen && ((tab === "active") !== VN.ACTIVE.includes(chosen.status)) && !render.userTab) tab = VN.ACTIVE.includes(chosen.status) ? "active" : "past";
            const list = tab === "active" ? active : past;
            document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));

            let cur = all.find((a) => a.id === selected && list.includes(a));
            if (!cur) cur = list.find((a) => a.date === TODAY && a.status !== "booked") || list[0];
            selected = cur ? cur.id : "";

            $("#visitList").innerHTML = list.length ? list.map((a) =>
                '<button type="button" class="row' + (cur && a.id === cur.id ? " current" : "") + '" data-id="' + a.id + '"><span class="row-ico">' + emojiOf(a) + '</span><div class="row-main"><strong>' + esc(a.petName) + " · " + esc(a.reason) + "</strong><small>" + when(a) + "</small></div>" + VN.badge(a.status) + "</button>").join("")
                : emptyBox(tab === "active" ? "📅" : "🕘", tab === "active" ? "No active visits" : "No past visits yet", tab === "active" ? "Book an appointment to follow it here." : "Completed and cancelled visits will appear here.",
                    tab === "active" ? '<a href="appointment.html" class="button button-primary button-sm">Book appointment</a>' : "");

            $("#trackPanel").innerHTML = cur ? panel(cur) : emptyBox("🏥", "Nothing to track", "Choose a visit on the left, or book a new one.");
        };

        function panel(a) {
            const v = VN.vetById(a.vetId), h = VN.hospitalById(a.hospitalId);
            const isActive = VN.ACTIVE.includes(a.status);
            const isToday = a.date === TODAY;
            const q = VN.queueInfo(a);
            let body = "";

            if (a.status === "cancelled" || a.status === "no-show") {
                body = '<div class="notice" style="margin-top:18px">' + (a.status === "cancelled" ? "This visit was cancelled." : "This visit was marked as missed.") + ' <a class="link" href="appointment.html?pet=' + a.petId + '">Book a new time</a></div>';
            } else {
                body = stepper(a.status);
                if (isActive && isToday) {
                    body += '<div class="metrics"><div class="metric"><strong>' + (a.status === "in-consult" ? "Now" : "#" + q.position) + "</strong><span>Place in queue</span></div>" +
                        '<div class="metric"><strong>' + waitText(a) + "</strong><span>Estimated wait</span></div>" +
                        '<div class="metric"><strong>' + VN.fmtTime(a.time) + "</strong><span>Appointment time</span></div></div>";
                    if (a.status === "booked") body += '<div class="notice">Arrived at the hospital? Check in so the team knows you are here.</div>';
                    if (a.status === "checked-in") body += '<div class="notice good">You are checked in. We\'ll update this page when you are called in.</div>';
                    if (a.status === "in-consult") body += '<div class="notice good">' + esc(a.petName) + " is with " + esc(v.name) + " now.</div>";
                    if (q.ahead.length) {
                        body += '<h3 class="sub-title">In the queue</h3><ul class="queue-list">' +
                            q.ahead.map((x, i) => '<li><span class="pos">' + (i + 1) + "</span>" + (VN.SPECIES[x.species] || "🐾") + " Patient " + (i + 1) + VN.badge(x.status) + "</li>").join("") +
                            '<li class="you"><span class="pos">' + (q.ahead.length + 1) + "</span>" + emojiOf(a) + " " + esc(a.petName) + " (you)" + VN.badge(a.status) + "</li></ul>";
                    }
                } else if (isActive) {
                    body += '<div class="metrics"><div class="metric"><strong>' + VN.fmtDate(a.date, { day: "numeric", month: "short" }) + "</strong><span>Date</span></div>" +
                        '<div class="metric"><strong>' + VN.fmtTime(a.time) + "</strong><span>Time</span></div><div class=\"metric\"><strong>" + (VN.daysUntil(a.date)) + " days</strong><span>To go</span></div></div>" +
                        '<div class="notice">Live queue tracking opens on the day of your visit.</div>';
                } else {
                    body += '<div class="notice good" style="margin-top:14px">Visit complete. The summary is saved in your health records.</div>';
                }
            }

            const actions = [];
            if (a.status === "booked" && isToday) actions.push('<button type="button" class="button button-primary" data-act="checkin">I\'ve arrived. Check in</button>');
            if (a.status === "completed") actions.push('<a class="button button-primary" href="records.html">View health records</a>');
            if (a.status === "booked" || a.status === "checked-in") actions.push('<button type="button" class="button button-ghost" data-act="cancel">Cancel visit</button>');

            return '<div class="track-hero"><span class="row-ico">' + emojiOf(a) + '</span><div style="flex:1"><div class="live-top" style="margin:0 0 4px">' +
                (isActive && isToday ? '<span class="live-pill"><i></i>Live</span>' : VN.badge(a.status)) + '<span class="muted">Token ' + esc(a.token) + "</span></div><h2>" + esc(a.petName) + " · " + esc(a.reason) + "</h2></div></div>" +
                '<p class="muted" style="margin-top:8px">' + esc(v.name) + " · " + esc(h.name) + " · " + when(a) + "</p>" + body +
                (actions.length ? '<div class="page-actions" style="margin-top:22px" data-appt="' + a.id + '">' + actions.join("") + "</div>" : "");
        }

        document.addEventListener("click", async (e) => {
            const row = e.target.closest("#visitList [data-id]");
            if (row) { selected = row.dataset.id; return render(); }
            const tabBtn = e.target.closest("[data-tab]");
            if (tabBtn) { tab = tabBtn.dataset.tab; render.userTab = true; selected = ""; return render(); }
            const act = e.target.closest("[data-act]");
            if (!act) return;
            const id = act.closest("[data-appt]").dataset.appt;
            if (act.dataset.act === "checkin") { VN.setStatus(id, "checked-in"); UI.toast("You're checked in"); }
            if (act.dataset.act === "cancel") {
                const ok = await UI.confirmBox({ title: "Cancel this visit?", text: "Your slot will be released for other pet owners.", ok: "Cancel visit", cancel: "Keep visit", danger: true });
                if (ok) { VN.setStatus(id, "cancelled"); UI.toast("Visit cancelled"); }
            }
        });

        VN.onChange(render);
        setInterval(render, 30000); // keeps estimates fresh even without changes
        render();
    }

    /* ================= Records ================= */
    function records() {
        let petFilter = "all", typeFilter = "all";
        const ICON = { vaccination: "💉", consultation: "🩺", lab: "🧪" };
        const TYPE = { vaccination: "Vaccination", consultation: "Consultation", lab: "Lab test" };

        const render = () => {
            const list = VN.petsOf(me.email);
            if (petFilter !== "all" && !list.some((p) => p.id === petFilter)) petFilter = "all";

            $("#petChips").innerHTML = list.length > 1
                ? ['<button type="button" class="chip' + (petFilter === "all" ? " active" : "") + '" data-pet="all">All pets</button>'].concat(list.map((p) => '<button type="button" class="chip' + (petFilter === p.id ? " active" : "") + '" data-pet="' + p.id + '">' + p.emoji + " " + esc(p.name) + "</button>")).join("") : "";

            const rem = VN.reminders(list).filter((r) => petFilter === "all" || r.pet.id === petFilter);
            $("#recReminders").innerHTML = rem.map((r) =>
                '<div class="reminder ' + (r.days < 0 ? "overdue" : "") + '"><div><strong>' + esc(r.title) + " due for " + esc(r.pet.name) + "</strong><small>" +
                (r.days < 0 ? "Overdue by " + Math.abs(r.days) + " days" : r.days === 0 ? "Due today" : "Due in " + r.days + " days") + '</small></div><a class="button button-ghost button-sm" href="appointment.html?pet=' + r.pet.id + '&reason=Vaccination">Book</a></div>').join("");

            document.querySelectorAll("#typeTabs [data-type]").forEach((b) => b.classList.toggle("active", b.dataset.type === typeFilter));

            const ids = (petFilter === "all" ? list : list.filter((p) => p.id === petFilter)).map((p) => p.id);
            const byId = Object.fromEntries(list.map((p) => [p.id, p]));
            const recs = VN.recordsOf(ids).filter((r) => typeFilter === "all" || r.type === typeFilter);

            $("#timeline").innerHTML = !list.length
                ? emptyBox("🐾", "Add a pet first", "Health records are kept for each pet.", '<a href="pets.html?add=1" class="button button-primary button-sm">Add a pet</a>')
                : recs.length ? recs.map((r) =>
                    '<article class="t-item"><span class="t-ico ' + r.type + '">' + ICON[r.type] + '</span><div class="t-body"><h3>' + esc(r.title) + '</h3><div class="t-meta">' +
                    esc(byId[r.petId].name) + " · " + TYPE[r.type] + " · " + VN.fmtDate(r.date, { day: "numeric", month: "short", year: "numeric" }) + (r.vet ? " · " + esc(r.vet) : "") + "</div>" +
                    (r.notes ? "<p>" + esc(r.notes) + "</p>" : "") + (r.nextDue ? '<span class="t-due">Next due ' + VN.fmtDate(r.nextDue, { day: "numeric", month: "short", year: "numeric" }) + "</span>" : "") + "</div></article>").join("")
                : emptyBox("🩺", "No records here yet", "Records from your visits will appear automatically. You can also add past ones yourself.");
        };

        document.addEventListener("click", (e) => {
            const chip = e.target.closest("[data-pet]"); if (chip && chip.closest("#petChips")) { petFilter = chip.dataset.pet; render(); }
            const tabBtn = e.target.closest("[data-type]"); if (tabBtn) { typeFilter = tabBtn.dataset.type; render(); }
        });

        $("#addRecordBtn").addEventListener("click", () => {
            const list = VN.petsOf(me.email);
            if (!list.length) return UI.toast("Add a pet before adding records", "error");
            $("#recordForm").reset();
            $("#recPet").innerHTML = list.map((p) => '<option value="' + p.id + '">' + esc(p.name) + "</option>").join("");
            if (petFilter !== "all") $("#recPet").value = petFilter;
            $("#recDate").value = TODAY;
            UI.open("recordDialog");
        });

        $("#recordForm").addEventListener("submit", (e) => {
            e.preventDefault();
            VN.addRecord({ petId: $("#recPet").value, type: $("#recType").value, title: $("#recTitle").value.trim(), date: $("#recDate").value, vet: $("#recVet").value.trim(), notes: $("#recNotes").value.trim(), nextDue: $("#recDue").value });
            UI.close("recordDialog");
            UI.toast("Record saved");
        });

        VN.onChange(render);
        render();
    }

    ({ dashboard, pets, booking, tracking, records }[document.body.dataset.page] || (() => {}))();
})();
