/* VetNest – login / register
   NOTE: accounts are stored in localStorage for the demo build. Passwords are NOT
   secure here; swap these two handlers for real API calls when the backend exists. */

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const passwordToggle = document.getElementById("passwordToggle");
const formMessage = document.getElementById("formMessage");

const params = new URLSearchParams(location.search);
const nextPage = /^[a-z0-9-]+\.html$/i.test(params.get("next") || "") ? params.get("next") : null;

/* ---------- helpers ---------- */
function showError(message, field) {
    if (formMessage) {
        formMessage.textContent = message;
        formMessage.hidden = false;
        formMessage.classList.remove("shake");
        void formMessage.offsetWidth;
        formMessage.classList.add("shake");
    }
    document.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
    if (field) { field.classList.add("invalid"); field.focus(); }
}

function clearError() {
    if (formMessage) formMessage.hidden = true;
    document.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
}

// Accounts: keeps compatibility with the original single "vetnestUser" key
function getUsers() {
    let users = [];
    try { users = JSON.parse(localStorage.getItem("vetnestUsers")) || []; } catch (e) { users = []; }
    try {
        const legacy = JSON.parse(localStorage.getItem("vetnestUser"));
        if (legacy && legacy.email && !users.some((u) => u.email === legacy.email)) users.push(legacy);
    } catch (e) { /* ignore */ }
    return users;
}

function saveUser(user) {
    const users = getUsers().filter((u) => u.email !== user.email);
    users.push(user);
    localStorage.setItem("vetnestUsers", JSON.stringify(users));
    localStorage.setItem("vetnestUser", JSON.stringify(user));
}

function goHome(role) {
    location.href = (role === "owner" && nextPage) ? nextPage : VN.HOME[role];
}

/* ---------- show / hide password ---------- */
if (passwordToggle) {
    passwordToggle.addEventListener("click", () => {
        const password = document.getElementById("password");
        const show = password.type === "password";
        password.type = show ? "text" : "password";
        passwordToggle.innerText = show ? "Hide" : "Show";
        passwordToggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
}

/* ---------- password strength (register) ---------- */
const passwordField = document.getElementById("password");
const strength = document.getElementById("strength");

if (registerForm && passwordField && strength) {
    const bar = strength.querySelector("span");
    const text = document.getElementById("strengthText");
    const levels = [
        ["12%", "#c4513f", "Too short. Use 8 or more characters."],
        ["35%", "#c4513f", "Weak. Add numbers or capital letters."],
        ["62%", "#d9a02b", "Okay. A symbol or more length makes it stronger."],
        ["100%", "#3f8a5c", "Strong password."]
    ];

    passwordField.addEventListener("input", () => {
        const v = passwordField.value;
        let score = 0;
        if (v.length >= 8) score++;
        if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
        if (/\d/.test(v)) score++;
        if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) score++;
        const level = !v ? null : v.length < 8 ? levels[0] : levels[score <= 1 ? 1 : score === 2 ? 2 : 3];
        bar.style.width = level ? level[0] : "0";
        bar.style.background = level ? level[1] : "";
        text.textContent = level ? level[2] : "Use 8 or more characters.";
    });
}

/* ---------- register ---------- */
if (registerForm) {
    registerForm.addEventListener("submit", (event) => {
        event.preventDefault();
        clearError();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const phone = document.getElementById("phone").value.trim();
        const password = document.getElementById("password").value;
        const confirmField = document.getElementById("confirmPassword");

        if (password.length < 8) return showError("Your password needs at least 8 characters.", document.getElementById("password"));
        if (password !== confirmField.value) return showError("The two passwords don't match. Please retype them.", confirmField);
        if (getUsers().some((u) => u.email === email)) return showError("An account with this email already exists. Try logging in instead.", document.getElementById("email"));

        saveUser({ name, email, phone, password });
        VN.setSession({ role: "owner", name, email });
        UI.toast("Account created. Welcome to VetNest!");
        setTimeout(() => goHome("owner"), 700);
    });
}

/* ---------- login ---------- */
if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        clearError();

        const email = document.getElementById("email").value.trim().toLowerCase();
        const password = document.getElementById("password").value;
        const users = getUsers();

        if (!users.length) return showError("No account found. Please register first.", document.getElementById("email"));

        const user = users.find((u) => u.email.toLowerCase() === email);
        if (!user || user.password !== password) return showError("Incorrect email or password. Please try again.", document.getElementById("password"));

        VN.setSession({ role: "owner", name: user.name, email: user.email });
        goHome("owner");
    });

    // Demo logins: owner / vet / hospital
    const demoRoles = document.getElementById("demoRoles");
    if (demoRoles) {
        demoRoles.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-role]");
            if (!btn) return;
            const role = btn.dataset.role;
            VN.setSession(VN.demoSession(role));
            location.href = VN.HOME[role];
        });
    }

    // Forgot password (front-end only until an API exists)
    const forgotLink = document.getElementById("forgotLink");
    if (forgotLink) {
        forgotLink.addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("forgotEmail").value = document.getElementById("email").value;
            UI.open("forgotDialog");
        });

        document.getElementById("forgotForm").addEventListener("submit", (e) => {
            e.preventDefault();
            UI.close("forgotDialog");
            UI.toast("If that email has an account, a reset link is on its way.");
        });
    }

    if (location.hash === "#demo") {
        const demo = document.getElementById("demo");
        if (demo) demo.scrollIntoView({ block: "center" });
    }
}
