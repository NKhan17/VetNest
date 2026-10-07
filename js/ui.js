/* VetNest – small UI helpers: toasts, dialogs, escaping */
const UI = (() => {
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    function toast(message, type) {
        let wrap = document.getElementById("toastWrap");
        if (!wrap) {
            wrap = document.createElement("div");
            wrap.id = "toastWrap";
            wrap.className = "toast-wrap";
            wrap.setAttribute("aria-live", "polite");
            document.body.appendChild(wrap);
        }
        const el = document.createElement("div");
        el.className = "toast toast-" + (type || "success");
        el.innerHTML = '<span class="toast-icon">' + (type === "error" ? "!" : "✓") + "</span><span></span>";
        el.lastChild.textContent = message;
        wrap.appendChild(el);
        setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 250); }, 3400);
    }

    const open = (id) => { const d = document.getElementById(id); if (d && !d.open) d.showModal(); };
    const close = (id) => { const d = document.getElementById(id); if (d && d.open) d.close(); };

    // [data-close] buttons and clicks on the dimmed backdrop close a dialog
    document.addEventListener("click", (e) => {
        const closer = e.target.closest("[data-close]");
        if (closer) { const d = closer.closest("dialog"); if (d) d.close(); return; }
        if (e.target.tagName === "DIALOG") e.target.close();
    });

    function confirmBox({ title, text, ok, cancel, danger }) {
        return new Promise((resolve) => {
            const d = document.createElement("dialog");
            d.className = "modal modal-sm";
            d.innerHTML = '<div class="modal-body"><h2>' + esc(title) + '</h2><p class="muted">' + esc(text) + '</p>' +
                '<div class="modal-actions"><button type="button" class="button button-ghost" data-v="0">' + esc(cancel || "Cancel") + '</button>' +
                '<button type="button" class="button ' + (danger ? "button-danger" : "button-primary") + '" data-v="1">' + esc(ok || "Confirm") + "</button></div></div>";
            document.body.appendChild(d);
            d.addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (b) d.close(b.dataset.v); });
            d.addEventListener("close", () => { resolve(d.returnValue === "1"); d.remove(); });
            d.showModal();
        });
    }

    const initials = (name) => String(name || "?").replace(/^Dr\.?\s+/i, "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

    return { esc, toast, open, close, confirmBox, initials };
})();
