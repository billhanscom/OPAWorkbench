(function () {
    "use strict";

    const STORAGE_KEY = "obojimaDisplayTheme";
    const SESSION_BOOT_KEY = "obojimaFirstAgeBootShown";
    const FIRST_AGE = "first-age";
    const STANDARD = "standard";

    function getTheme() {
        return localStorage.getItem(STORAGE_KEY) === FIRST_AGE ? FIRST_AGE : STANDARD;
    }

    function applyTheme(theme) {
        const isFirstAge = theme === FIRST_AGE;
        document.documentElement.classList.toggle("first-age-display", isFirstAge);
        if (document.body) document.body.classList.toggle("first-age-display", isFirstAge);
    }

    function updateControls(theme) {
        document.querySelectorAll("[data-display-theme]").forEach(control => {
            const active = control.dataset.displayTheme === theme;
            control.classList.toggle("active", active);
            control.setAttribute("aria-current", active ? "true" : "false");
        });
    }

    function pageSpecificLine() {
        const page = location.pathname.split("/").pop() || "index.html";
        if (page === "foraging-aid.html") return "CALIBRATING FORAGING MODEL... OK";
        if (page === "ingredient-finder.html") return "INDEXING REGIONAL SOURCES... OK";
        if (page === "inventory.html") return "RESTORING FIELD INVENTORY... OK";
        return "LOADING RECIPE MATRICES... OK";
    }

    function createBootOverlay() {
        const overlay = document.createElement("div");
        overlay.id = "first-age-boot";
        overlay.className = "first-age-boot";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", "First Age display boot sequence");

        const panel = document.createElement("div");
        panel.className = "first-age-boot-panel";

        const output = document.createElement("pre");
        output.className = "first-age-boot-output";
        output.setAttribute("aria-live", "polite");

        const skip = document.createElement("button");
        skip.type = "button";
        skip.className = "first-age-boot-skip";
        skip.textContent = "Skip";

        panel.append(output, skip);
        overlay.appendChild(panel);
        return { overlay, output, skip };
    }

    function showBootSequence({ force = false } = {}) {
        if (getTheme() !== FIRST_AGE) return;
        if (!force && sessionStorage.getItem(SESSION_BOOT_KEY) === "true") return;

        sessionStorage.setItem(SESSION_BOOT_KEY, "true");
        const { overlay, output, skip } = createBootOverlay();
        document.body.appendChild(overlay);

        const lines = [
            "OBOJIMA POTION ALMANAC",
            "FIRST AGE ARCHIVE TERMINAL",
            "",
            "INITIALIZING CORE SYSTEMS... OK",
            "LOADING INGREDIENT INDEX... OK",
            pageSpecificLine(),
            "RESTORING USER DATA... OK",
            "SYSTEM READY"
        ];

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let lineIndex = 0;
        let timer = null;
        let closed = false;

        function close() {
            if (closed) return;
            closed = true;
            if (timer) window.clearTimeout(timer);
            overlay.classList.add("is-closing");
            window.setTimeout(() => overlay.remove(), reduceMotion ? 0 : 220);
        }

        function renderNextLine() {
            if (closed) return;
            output.textContent += `${lines[lineIndex]}\n`;
            lineIndex += 1;
            if (lineIndex < lines.length) {
                timer = window.setTimeout(renderNextLine, reduceMotion ? 0 : 125);
            } else {
                timer = window.setTimeout(close, reduceMotion ? 250 : 900);
            }
        }

        skip.addEventListener("click", close);
        overlay.addEventListener("keydown", event => {
            if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                close();
            }
        });

        skip.focus();
        renderNextLine();
    }

    function setTheme(theme, { showBoot = false } = {}) {
        const normalized = theme === FIRST_AGE ? FIRST_AGE : STANDARD;
        localStorage.setItem(STORAGE_KEY, normalized);
        applyTheme(normalized);
        updateControls(normalized);
        if (showBoot && normalized === FIRST_AGE) showBootSequence({ force: true });
    }

    applyTheme(getTheme());

    document.addEventListener("DOMContentLoaded", () => {
        applyTheme(getTheme());
        updateControls(getTheme());

        document.querySelectorAll("[data-display-theme]").forEach(control => {
            control.addEventListener("click", event => {
                event.preventDefault();
                setTheme(control.dataset.displayTheme, { showBoot: true });
            });
        });

        showBootSequence();
    });
})();
