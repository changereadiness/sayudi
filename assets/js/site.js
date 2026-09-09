(() => {
    "use strict";

    const root = document.documentElement;
    root.classList.add("sayudi-js");

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const onReady = (callback) => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", callback, { once: true });
        } else {
            callback();
        }
    };

    const normalisePath = (value) => {
        try {
            const url = new URL(value, window.location.href);
            let path = url.pathname.replace(/\/index\.html$/i, "/");
            path = path.replace(/\.html$/i, "");
            path = path.replace(/\/$/, "");
            return path || "/";
        } catch {
            return "";
        }
    };

    function initNavigation() {
        const navbar = document.querySelector(".navbar");
        const header = navbar ? navbar.closest("header") : null;
        const toggle = document.querySelector(".nav-toggle");
        const nav = document.querySelector(".nav-links");

        if (header) {
            header.classList.add("site-header");
            const syncHeader = () => {
                header.classList.toggle("is-scrolled", window.scrollY > 16);
            };
            syncHeader();
            window.addEventListener("scroll", syncHeader, { passive: true });
        }

        document.querySelectorAll(".nav-links a").forEach((link) => {
            if (normalisePath(link.href) === normalisePath(window.location.href)) {
                link.setAttribute("aria-current", "page");
            }
        });

        if (!toggle || !nav) return;

        const closeNavigation = () => {
            nav.classList.remove("is-open");
            toggle.classList.remove("is-open");
            document.body.classList.remove("nav-open");
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Open navigation");
        };

        const openNavigation = () => {
            nav.classList.add("is-open");
            toggle.classList.add("is-open");
            document.body.classList.add("nav-open");
            toggle.setAttribute("aria-expanded", "true");
            toggle.setAttribute("aria-label", "Close navigation");
        };

        toggle.addEventListener("click", () => {
            nav.classList.contains("is-open") ? closeNavigation() : openNavigation();
        });

        nav.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", closeNavigation);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeNavigation();
        });

        document.addEventListener("click", (event) => {
            if (!nav.classList.contains("is-open")) return;
            if (nav.contains(event.target) || toggle.contains(event.target)) return;
            closeNavigation();
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 700) closeNavigation();
        });
    }

    function initScrollProgress() {
        if (document.querySelector(".card-page")) return;

        const progress = document.createElement("div");
        progress.className = "site-progress";
        progress.setAttribute("aria-hidden", "true");
        document.body.appendChild(progress);

        let ticking = false;

        const update = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const value = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
            progress.style.transform = `scaleX(${value})`;
            progress.classList.toggle("is-active", max > 240 && window.scrollY > 4);
            ticking = false;
        };

        const requestUpdate = () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(update);
        };

        update();
        window.addEventListener("scroll", requestUpdate, { passive: true });
        window.addEventListener("resize", requestUpdate);
    }

    function initRevealSystem() {
        const heroContainers = [
            ".home-intro",
            ".about-intro",
            ".exposure-intro",
            ".framework-intro",
            ".contact-intro",
            ".field-notes-intro",
            ".legal-header",
            ".connect-header",
            ".identity"
        ];

        heroContainers.forEach((selector) => {
            const container = document.querySelector(selector);
            if (!container) return;

            Array.from(container.children).forEach((element, index) => {
                element.classList.add("motion-item", "motion-hero");
                element.style.setProperty("--motion-delay", `${Math.min(index, 5) * 80}ms`);
            });
        });

        const revealSelectors = [
            "main > section:not(:first-child)",
            ".home-card",
            ".scenario",
            ".field-note-item",
            ".framework-vector",
            ".framework-layer",
            ".framework-process-card",
            ".exposure-index-item",
            ".exposure-question-card",
            ".about-experience-card",
            ".readiness-card",
            ".service-card",
            ".capability",
            ".path",
            ".action",
            ".website-card",
            ".contact-box"
        ];

        const items = Array.from(document.querySelectorAll(revealSelectors.join(",")));
        const uniqueItems = [...new Set(items)].filter((item) => !item.classList.contains("motion-hero"));

        uniqueItems.forEach((item) => {
            item.classList.add("motion-item");
            const siblings = item.parentElement ? Array.from(item.parentElement.children).filter((child) => uniqueItems.includes(child)) : [];
            const index = siblings.indexOf(item);
            if (index > -1) {
                item.style.setProperty("--motion-delay", `${Math.min(index % 6, 5) * 55}ms`);
            }
        });

        if (prefersReducedMotion) {
            document.querySelectorAll(".motion-item").forEach((item) => item.classList.add("is-visible"));
            return;
        }

        window.requestAnimationFrame(() => {
            document.querySelectorAll(".motion-hero").forEach((item) => item.classList.add("is-visible"));
        });

        if (!("IntersectionObserver" in window)) {
            uniqueItems.forEach((item) => item.classList.add("is-visible"));
            return;
        }

        const observer = new IntersectionObserver((entries, revealObserver) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
            });
        }, {
            threshold: 0.12,
            rootMargin: "0px 0px -7% 0px"
        });

        uniqueItems.forEach((item) => {
            const bounds = item.getBoundingClientRect();
            if (bounds.top < window.innerHeight * 0.92) {
                item.classList.add("is-visible");
            } else {
                observer.observe(item);
            }
        });
    }

    function initSurfaceResponse() {
        if (!finePointer || prefersReducedMotion) return;

        const selectors = [
            ".home-card",
            ".scenario",
            ".framework-vector",
            ".framework-layer",
            ".framework-process-card",
            ".exposure-index-item",
            ".exposure-question-card",
            ".about-experience-card",
            ".readiness-card",
            ".service-card",
            ".capability",
            ".path",
            ".action",
            ".website-card",
            ".contact a"
        ];

        document.querySelectorAll(selectors.join(",")).forEach((surface) => {
            surface.classList.add("interactive-surface");

            surface.addEventListener("pointermove", (event) => {
                const rect = surface.getBoundingClientRect();
                const x = ((event.clientX - rect.left) / rect.width) * 100;
                const y = ((event.clientY - rect.top) / rect.height) * 100;
                surface.style.setProperty("--pointer-x", `${x}%`);
                surface.style.setProperty("--pointer-y", `${y}%`);
            });

            surface.addEventListener("pointerenter", () => surface.classList.add("is-pointer-active"));
            surface.addEventListener("pointerleave", () => surface.classList.remove("is-pointer-active"));
        });
    }

    function initFrameworkInteraction() {
        const groups = [
            ".framework-vector-list",
            ".framework-layer-grid",
            ".exposure-index",
            ".exposure-question-grid"
        ];

        groups.forEach((selector) => {
            const group = document.querySelector(selector);
            if (!group) return;

            const children = Array.from(group.children);
            children.forEach((item) => {
                const activate = () => {
                    group.classList.add("has-focus");
                    children.forEach((child) => child.classList.toggle("is-focused", child === item));
                };
                const clear = () => {
                    group.classList.remove("has-focus");
                    children.forEach((child) => child.classList.remove("is-focused"));
                };

                item.addEventListener("mouseenter", activate);
                item.addEventListener("mouseleave", clear);
                item.addEventListener("focusin", activate);
                item.addEventListener("focusout", clear);
            });
        });
    }

    function initContactForm() {
        const form = document.querySelector(".contact-box form");
        if (!form) return;

        form.querySelectorAll("input, select, textarea").forEach((field) => {
            field.addEventListener("focus", () => field.classList.add("is-engaged"));
            field.addEventListener("blur", () => {
                field.classList.toggle("has-value", Boolean(field.value && field.value.trim()));
            });
        });

        form.addEventListener("submit", () => {
            const submit = form.querySelector('button[type="submit"], input[type="submit"]');
            if (!submit || !form.checkValidity()) return;
            submit.classList.add("is-submitting");
            if (submit.tagName === "BUTTON") {
                submit.dataset.originalText = submit.textContent;
                submit.textContent = "Sending…";
            }
        });
    }

    function initCardEntry() {
        const card = document.querySelector(".card");
        if (!card || prefersReducedMotion) return;
        requestAnimationFrame(() => card.classList.add("is-ready"));
    }

    onReady(() => {
        initNavigation();
        initScrollProgress();
        initRevealSystem();
        initSurfaceResponse();
        initFrameworkInteraction();
        initContactForm();
        initCardEntry();
    });
})();
