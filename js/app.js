/* VetNest – landing page behaviour */
(() => {
    const navbar = document.querySelector(".navbar");
    const toggle = document.getElementById("navToggle");
    const links = document.getElementById("navLinks");
    const actions = document.getElementById("navActions");

    // Shadow under the navbar once the page scrolls
    const onScroll = () => navbar && navbar.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Mobile menu
    if (toggle && links) {
        const setOpen = (open) => {
            links.classList.toggle("open", open);
            toggle.setAttribute("aria-expanded", String(open));
            toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        };

        toggle.addEventListener("click", () => setOpen(!links.classList.contains("open")));
        links.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
        document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    }

    // If someone is already signed in, send them to their dashboard instead of "Login"
    try {
        const session = JSON.parse(localStorage.getItem("vetnestSession"));
        const home = { owner: "owner-dashboard.html", vet: "vet-dashboard.html", hospital: "hospital-dashboard.html" }[session && session.role];

        if (home && actions) {
            actions.innerHTML = '<a href="' + home + '" class="button button-cta">Open dashboard</a>';
        }
    } catch (err) { /* no session – keep default buttons */ }
})();
