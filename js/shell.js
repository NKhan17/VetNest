/* VetNest – dashboard shell: sidebar, top bar, auth guard */
const Shell = (() => {
    const NAV = {
        owner: [
            ["owner-dashboard.html", "🏠", "Dashboard"],
            ["pets.html", "🐶", "My pets"],
            ["appointment.html", "📅", "Book appointment"],
            ["tracking.html", "🏥", "Track visit", "live"],
            ["records.html", "🩺", "Health records"]
        ],
        vet: [
            ["vet-dashboard.html", "📋", "Today's queue", "live"],
            ["vet-patients.html", "🐾", "Patients"]
        ],
        hospital: [
            ["hospital-dashboard.html", "🏥", "Live overview", "live"],
            ["hospital-appointments.html", "📅", "Appointments"]
        ]
    };

    const ROLE_LABEL = { owner: "Pet owner", vet: "Veterinarian", hospital: "Hospital admin" };

    function init(role) {
        const session = VN.requireRole(role);
        if (!session) return null;

        const page = location.pathname.split("/").pop() || "index.html";
        const sidebar = document.getElementById("sidebar");
        const topbar = document.getElementById("topbar");
        const shell = document.querySelector(".app-shell");

        sidebar.innerHTML =
            '<a href="index.html" class="logo"><span class="logo-icon">🐾</span><span class="logo-text">VetNest</span></a>' +
            '<nav class="side-nav" aria-label="Main">' +
            NAV[role].map((n) =>
                '<a href="' + n[0] + '" class="side-link' + (n[0] === page ? " active" : "") + '"' + (n[0] === page ? ' aria-current="page"' : "") + ">" +
                '<span class="ico">' + n[1] + "</span><span>" + n[2] + "</span>" +
                (n[3] === "live" ? '<span class="side-badge" data-live-badge hidden></span>' : "") + "</a>"
            ).join("") + "</nav>" +
            '<div class="side-user"><span class="avatar">' + UI.esc(UI.initials(session.name)) + "</span>" +
            '<div class="side-user-text"><strong>' + UI.esc(session.name) + "</strong><small>" + ROLE_LABEL[role] + "</small></div>" +
            '<button type="button" class="logout" id="logoutBtn" title="Log out" aria-label="Log out">⎋</button></div>';

        topbar.innerHTML =
            '<button type="button" class="menu-btn" id="menuBtn" aria-label="Open menu">☰</button>' +
            '<p class="topbar-date">' + new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) + "</p>" +
            '<span class="live-pill" title="Updates instantly across open tabs"><i></i>Live</span>';

        const overlay = document.createElement("div");
        overlay.className = "nav-overlay";
        shell.appendChild(overlay);

        const setNav = (open) => shell.classList.toggle("nav-open", open);
        document.getElementById("menuBtn").addEventListener("click", () => setNav(true));
        overlay.addEventListener("click", () => setNav(false));
        document.getElementById("logoutBtn").addEventListener("click", VN.logout);

        // sidebar badge = how many visits are active today
        const updateBadge = () => {
            const q = VN.today();
            const active = VN.allAppts((a) => a.date === q && VN.ACTIVE.includes(a.status) &&
                (role === "owner" ? a.ownerEmail === session.email : role === "vet" ? a.vetId === session.vetId : a.hospitalId === session.hospitalId));
            document.querySelectorAll("[data-live-badge]").forEach((b) => { b.hidden = !active.length; b.textContent = active.length; });
        };
        updateBadge();
        VN.onChange(updateBadge);

        return session;
    }

    return { init };
})();
