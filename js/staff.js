/* VetNest – staff pages: vet queue + patients, hospital overview + appointments */
(() => {
    const page = document.body.dataset.page;
    const role = document.body.dataset.role;
    const me = Shell.init(role);
    if (!me) return;

    const $ = (s, r) => (r || document).querySelector(s);
    const esc = UI.esc;
    const TODAY = VN.today();
    const emojiOf = (a) => VN.SPECIES[a.species] || VN.SPECIES.other;
    const emptyBox = (ico, title, text) => '<div class="empty"><span class="empty-ico">' + ico + "</span><strong>" + title + "</strong><p>" + text + "</p></div>";

    const statGrid = (items) => items.map((s) =>
        '<div class="stat"><span class="stat-ico">' + s[0] + "</span><div><strong>" + s[1] + "</strong><span>" + s[2] + "</span></div></div>").join("");

    // The one next action for a patient at each stage
    const NEXT = {
        "booked": { act: "checkin", label: "Check in" },
        "checked-in": { act: "start", label: "Call in" },
        "in-consult": { act: "complete", label: "Complete visit" }
    };

    async function handleAction(act, id) {
        const a = VN.apptById(id);
        if (!a) return;
        if (act === "checkin") { VN.setStatus(id, "checked-in"); UI.toast(a.petName + " checked in"); }
        if (act === "start") {
            const busy = VN.allAppts((x) => x.vetId === a.vetId && x.date === a.date && x.status === "in-consult").length;
            if (busy) return UI.toast("Finish the current consultation first", "error");
            VN.setStatus(id, "in-consult"); UI.toast(a.petName + " is in consultation");
        }
        if (act === "noshow") {
            const ok = await UI.confirmBox({ title: "Mark " + a.petName + " as missed?", text: "The slot will be released.", ok: "Mark as missed", cancel: "Keep", danger: true });
            if (ok) VN.setStatus(id, "no-show");
        }
        if (act === "cancel") {
            const ok = await UI.confirmBox({ title: "Cancel this appointment?", text: a.petName + "'s owner will see it as cancelled.", ok: "Cancel appointment", cancel: "Keep", danger: true });
            if (ok) { VN.setStatus(id, "cancelled"); UI.toast("Appointment cancelled"); }
        }
        if (act === "complete") {
            $("#completeId").value = id;
            $("#completeTitle").textContent = "Complete visit for " + a.petName;
            $("#completeSummary").value = a.reason;
            $("#completeNotes").value = ""; $("#completeDue").value = "";
            UI.open("completeDialog");
        }
    }

    document.addEventListener("click", (e) => {
        const b = e.target.closest("[data-act]");
        if (b) handleAction(b.dataset.act, b.dataset.id);
    });

    /* ================= Vet: today's queue ================= */
    function queue() {
        const vet = VN.vetById(me.vetId);
        const hosp = VN.hospitalById(me.hospitalId);
        $("#vetTitle").textContent = "Good " + (new Date().getHours() < 12 ? "morning" : "day") + ", " + vet.name;
        $("#vetSub").textContent = vet.spec + " · " + hosp.name;
        let tab = "today";

        const row = (a, showDate) => {
            const next = NEXT[a.status];
            return '<div class="row"><span class="row-ico">' + emojiOf(a) + '</span><div class="row-main"><strong>' + esc(a.petName) + " · " + esc(a.reason) + "</strong><small>" +
                (showDate ? VN.fmtDate(a.date) + " · " : "") + VN.fmtTime(a.time) + " · Owner: " + esc(a.ownerName) + " · " + esc(a.token) +
                (a.notes ? " · “" + esc(a.notes) + "”" : "") + '</small></div><div class="row-side">' + VN.badge(a.status) +
                (a.status === "booked" ? '<button type="button" class="button button-ghost button-sm" data-act="noshow" data-id="' + a.id + '">Missed</button>' : "") +
                (next ? '<button type="button" class="button button-primary button-sm" data-act="' + next.act + '" data-id="' + a.id + '">' + next.label + "</button>" : "") + "</div></div>";
        };

        const render = () => {
            const mine = VN.allAppts((a) => a.vetId === me.vetId);
            const todayList = mine.filter((a) => a.date === TODAY);
            const count = (s) => todayList.filter((a) => a.status === s).length;

            $("#stats").innerHTML = statGrid([["📋", todayList.filter((a) => a.status !== "cancelled").length, "Patients today"], ["⏳", count("checked-in"), "Waiting now"], ["🩺", count("in-consult"), "In consultation"], ["✅", count("completed"), "Completed"]]);
            document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));

            if (tab === "upcoming") {
                const up = mine.filter((a) => a.date > TODAY && VN.ACTIVE.includes(a.status));
                $("#queue").innerHTML = up.length ? '<div class="rows">' + up.map((a) => row(a, true)).join("") + "</div>" : emptyBox("🗓️", "No upcoming appointments", "Future bookings will appear here.");
                return;
            }

            const group = (title, tone, list) => list.length ? '<h2 class="group-title">' + title + ' <span class="badge badge-' + tone + '">' + list.length + '</span></h2><div class="rows">' + list.map((a) => row(a)).join("") + "</div>" : "";
            const html = group("Now seeing", "orange", todayList.filter((a) => a.status === "in-consult")) +
                group("Waiting room", "amber", todayList.filter((a) => a.status === "checked-in")) +
                group("Scheduled, not arrived", "blue", todayList.filter((a) => a.status === "booked")) +
                group("Completed", "green", todayList.filter((a) => a.status === "completed" || a.status === "no-show"));
            $("#queue").innerHTML = html || emptyBox("☕", "No patients today", "New bookings show up here the moment they are made.");
        };

        document.addEventListener("click", (e) => { const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; render(); } });

        $("#completeForm").addEventListener("submit", (e) => {
            e.preventDefault();
            VN.completeVisit($("#completeId").value, { title: $("#completeSummary").value.trim(), notes: $("#completeNotes").value.trim(), nextDue: $("#completeDue").value });
            UI.close("completeDialog");
            UI.toast("Visit completed and saved to records");
        });

        VN.onChange(render);
        render();
    }

    /* ================= Vet: patients ================= */
    function patients() {
        let openPet = null;

        const myPatients = () => {
            const seen = {};
            VN.allAppts((a) => a.vetId === me.vetId).forEach((a) => {
                const p = VN.petById(a.petId);
                if (!p) return;
                const s = seen[p.id] || (seen[p.id] = { pet: p, owner: a.ownerName, visits: 0, last: "" });
                s.visits++;
                if (a.status === "completed" && a.date > s.last) s.last = a.date;
            });
            return Object.values(seen);
        };

        const render = () => {
            const term = $("#patientSearch").value.trim().toLowerCase();
            const list = myPatients().filter((s) => !term || (s.pet.name + " " + s.owner + " " + s.pet.breed).toLowerCase().includes(term));
            $("#patientList").innerHTML = list.length ? list.map((s) =>
                '<button type="button" class="row" data-pet="' + s.pet.id + '"><span class="row-ico">' + s.pet.emoji + '</span><div class="row-main"><strong>' + esc(s.pet.name) + "</strong><small>" +
                esc(s.pet.breed || s.pet.species) + " · Owner: " + esc(s.owner) + '</small></div><div class="row-side"><span class="muted" style="font-size:.82rem">' + s.visits + (s.visits === 1 ? " visit" : " visits") +
                (s.last ? " · last " + VN.fmtDate(s.last, { day: "numeric", month: "short" }) : "") + "</span></div></button>").join("")
                : emptyBox("🐾", term ? "No matches" : "No patients yet", term ? "Try a different name." : "Pets booked with you will be listed here.");

            if (openPet && $("#patientDialog").open) showPet(openPet);
        };

        const ICON = { vaccination: "💉", consultation: "🩺", lab: "🧪" };
        function showPet(id) {
            const p = VN.petById(id);
            if (!p) return;
            openPet = id;
            const recs = VN.recordsOf([id]);
            $("#patientBody").innerHTML =
                '<div class="track-hero" style="margin-bottom:16px"><span class="row-ico">' + p.emoji + '</span><div><h2 id="patientTitle" style="margin:0">' + esc(p.name) + '</h2><p class="muted" style="margin:0">' +
                esc(p.breed || p.species) + (p.age !== "" && p.age != null ? " · " + esc(p.age) + " yrs" : "") + (p.weight !== "" && p.weight != null ? " · " + esc(p.weight) + " kg" : "") + "</p></div></div>" +
                (p.notes ? '<div class="notice" style="margin-bottom:16px"><strong>Owner notes:</strong> ' + esc(p.notes) + "</div>" : "") +
                '<h3 class="sub-title" style="margin-top:0">Health history</h3><div class="timeline">' + (recs.length ? recs.map((r) =>
                    '<article class="t-item"><span class="t-ico ' + r.type + '">' + ICON[r.type] + '</span><div class="t-body"><h3>' + esc(r.title) + '</h3><div class="t-meta">' + VN.fmtDate(r.date, { day: "numeric", month: "short", year: "numeric" }) + (r.vet ? " · " + esc(r.vet) : "") + "</div>" +
                    (r.notes ? "<p>" + esc(r.notes) + "</p>" : "") + (r.nextDue ? '<span class="t-due">Next due ' + VN.fmtDate(r.nextDue, { day: "numeric", month: "short", year: "numeric" }) + "</span>" : "") + "</div></article>").join("") : emptyBox("🩺", "No records yet", "Add the first record for " + esc(p.name) + ".")) + "</div>";
            UI.open("patientDialog");
        }

        $("#patientSearch").addEventListener("input", render);
        $("#patientList").addEventListener("click", (e) => { const r = e.target.closest("[data-pet]"); if (r) showPet(r.dataset.pet); });
        $("#patientDialog").addEventListener("close", () => { openPet = null; });

        $("#patientAddRecord").addEventListener("click", () => {
            $("#recordForm").reset();
            $("#recPet").value = openPet;
            $("#recDate").value = TODAY;
            $("#recVet").value = me.name;
            UI.open("recordDialog");
        });

        $("#recordForm").addEventListener("submit", (e) => {
            e.preventDefault();
            VN.addRecord({ petId: $("#recPet").value, type: $("#recType").value, title: $("#recTitle").value.trim(), date: $("#recDate").value, vet: $("#recVet").value.trim(), notes: $("#recNotes").value.trim(), nextDue: $("#recDue").value });
            UI.close("recordDialog");
            UI.toast("Record added");
        });

        VN.onChange(render);
        render();
    }

    /* ================= Hospital: live overview ================= */
    function overview() {
        const hosp = VN.hospitalById(me.hospitalId);
        $("#hospTitle").textContent = hosp.name;
        const myVets = VN.vets.filter((v) => v.hospitalId === me.hospitalId);

        const render = () => {
            const list = VN.allAppts((a) => a.hospitalId === me.hospitalId && a.date === TODAY && a.status !== "cancelled");
            const count = (s) => list.filter((a) => a.status === s).length;
            $("#stats").innerHTML = statGrid([["📋", list.length, "Visits today"], ["⏳", count("checked-in"), "Waiting now"], ["🩺", count("in-consult"), "In consultation"], ["✅", count("completed"), "Completed"]]);

            $("#board").innerHTML = myVets.map((v) => {
                const mine = list.filter((a) => a.vetId === v.id);
                const now = mine.find((a) => a.status === "in-consult");
                const waiting = mine.filter((a) => a.status === "checked-in");
                const left = mine.filter((a) => VN.ACTIVE.includes(a.status)).length;
                return '<article class="card doc-card"><div class="doc-top"><span class="avatar">' + esc(UI.initials(v.name)) + '</span><div><h3>' + esc(v.name) + '</h3><small class="muted">' + esc(v.spec) + "</small></div>" +
                    '<span style="margin-left:auto">' + (now ? '<span class="badge badge-orange">Busy</span>' : '<span class="badge badge-green">Free</span>') + "</span></div>" +
                    '<div class="doc-now">' + (now ? "<strong>Now:</strong> " + emojiOf(now) + " " + esc(now.petName) + " · " + esc(now.reason) : "No patient in consultation") + "</div>" +
                    '<div class="doc-meta"><span>' + waiting.length + " waiting</span><span>" + left + " still to see</span><span>~" + Math.round(waiting.length * VN.AVG_CONSULT_MIN) + " min wait</span></div></article>";
            }).join("");

            $("#liveTable").innerHTML = list.length ? list.map((a) => {
                const next = NEXT[a.status];
                return "<tr><td>" + VN.fmtTime(a.time) + "</td><td><strong>" + emojiOf(a) + " " + esc(a.petName) + "</strong><br><small class=\"muted\">" + esc(a.ownerName) + "</small></td><td>" + esc(VN.vetById(a.vetId).name) + "</td><td>" + esc(a.reason) + "</td><td>" + VN.badge(a.status) + "</td>" +
                    '<td><div class="actions">' + (a.status === "booked" ? '<button type="button" class="button button-primary button-sm" data-act="checkin" data-id="' + a.id + '">Check in</button>' : "") + "</div></td></tr>";
            }).join("") : '<tr><td colspan="6">' + emptyBox("☕", "No visits today", "Bookings will appear here live.") + "</td></tr>";
        };

        VN.onChange(render);
        setInterval(render, 30000);
        render();
    }

    /* ================= Hospital: appointments ================= */
    function appointments() {
        const myVets = VN.vets.filter((v) => v.hospitalId === me.hospitalId);
        $("#fltVet").innerHTML = '<option value="all">All doctors</option>' + myVets.map((v) => '<option value="' + v.id + '">' + esc(v.name) + "</option>").join("");

        const render = () => {
            const term = $("#apptSearch").value.trim().toLowerCase();
            const when = $("#fltWhen").value, status = $("#fltStatus").value, vet = $("#fltVet").value;
            let list = VN.allAppts((a) => a.hospitalId === me.hospitalId);
            list = list.filter((a) =>
                (when === "all" || (when === "today" && a.date === TODAY) || (when === "upcoming" && a.date > TODAY) || (when === "past" && a.date < TODAY)) &&
                (status === "all" || a.status === status) && (vet === "all" || a.vetId === vet) &&
                (!term || (a.petName + " " + a.ownerName + " " + a.token).toLowerCase().includes(term)));
            if (when === "past") list.reverse();

            $("#apptTable").innerHTML = list.length ? list.map((a) =>
                "<tr><td>" + (a.date === TODAY ? "Today" : VN.fmtDate(a.date)) + "</td><td>" + VN.fmtTime(a.time) + "</td><td><strong>" + emojiOf(a) + " " + esc(a.petName) + '</strong><br><small class="muted">' + esc(a.token) + "</small></td><td>" + esc(a.ownerName) + "</td><td>" + esc(VN.vetById(a.vetId).name) + "</td><td>" + esc(a.reason) + "</td><td>" + VN.badge(a.status) + "</td>" +
                '<td><div class="actions">' + (a.status === "booked" && a.date === TODAY ? '<button type="button" class="button button-primary button-sm" data-act="checkin" data-id="' + a.id + '">Check in</button>' : "") +
                (a.status === "booked" || a.status === "checked-in" ? '<button type="button" class="button button-ghost button-sm" data-act="cancel" data-id="' + a.id + '">Cancel</button>' : "") + "</div></td></tr>").join("")
                : '<tr><td colspan="8">' + emptyBox("🔎", "No appointments match", "Try changing the filters.") + "</td></tr>";
        };

        ["#apptSearch", "#fltWhen", "#fltStatus", "#fltVet"].forEach((s) => $(s).addEventListener("input", render));
        VN.onChange(render);
        render();
    }

    ({ queue, patients, overview, appointments }[page] || (() => {}))();
})();
