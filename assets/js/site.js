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
            if (window.innerWidth > 860) closeNavigation();
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
            ".home-hero-copy",
            ".isi-hero-copy",
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


    function initVantageHero() {
        const hero = document.querySelector("[data-vantage-hero]");
        if (!hero) return;

        const canvas = hero.querySelector(".hero-network-canvas");
        const context = canvas ? canvas.getContext("2d") : null;
        const vectors = Array.from(hero.querySelectorAll(".hero-vector"));
        const card = hero.querySelector(".hero-vector-card");
        const cardTitle = card ? card.querySelector("h2") : null;
        const cardCopy = card ? card.querySelector("p") : null;
        const background = hero.querySelector(".home-hero-bg");

        if (!canvas || !context || !vectors.length) return;

        let activeVector = hero.querySelector(".hero-vector.is-active") || vectors[0];
        let width = 0;
        let height = 0;
        let dpr = 1;
        let particles = [];
        let frame = 0;
        let pointer = { x: -9999, y: -9999, active: false };
        let lastTime = performance.now();

        const colour = {
            line: [157, 225, 216],
            dot: [224, 250, 246],
            active: [129, 236, 221]
        };

        const setActiveVector = (vector) => {
            if (!vector) return;
            activeVector = vector;
            vectors.forEach((item) => item.classList.toggle("is-active", item === vector));

            if (cardTitle) cardTitle.textContent = vector.dataset.vector || "";
            if (cardCopy) cardCopy.textContent = vector.dataset.copy || "";
        };

        vectors.forEach((vector) => {
            vector.addEventListener("mouseenter", () => setActiveVector(vector));
            vector.addEventListener("focus", () => setActiveVector(vector));
            vector.addEventListener("click", () => setActiveVector(vector));
        });

        setActiveVector(activeVector);

        const randomParticle = (index) => {
            const seed = (index + 1) * 104729;
            const pseudo = (offset) => {
                const value = Math.sin(seed * (offset + 1) * 0.00013) * 43758.5453;
                return value - Math.floor(value);
            };

            return {
                x: width * (0.06 + pseudo(1) * 0.9),
                y: height * (0.48 + pseudo(2) * 0.47),
                baseX: 0,
                baseY: 0,
                vx: (pseudo(3) - 0.5) * 0.035,
                vy: (pseudo(4) - 0.5) * 0.026,
                radius: 0.7 + pseudo(5) * 1.45,
                phase: pseudo(6) * Math.PI * 2
            };
        };

        const rebuildParticles = () => {
            const count = width < 700 ? 18 : width < 1100 ? 26 : 38;
            particles = Array.from({ length: count }, (_, index) => {
                const particle = randomParticle(index);
                particle.baseX = particle.x;
                particle.baseY = particle.y;
                return particle;
            });
        };

        const resize = () => {
            const rect = hero.getBoundingClientRect();
            width = Math.max(1, rect.width);
            height = Math.max(1, rect.height);
            dpr = Math.min(window.devicePixelRatio || 1, 2);

            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            context.setTransform(dpr, 0, 0, dpr, 0, 0);

            rebuildParticles();
            draw(performance.now(), true);
        };

        const vectorPoints = () => {
            const heroRect = hero.getBoundingClientRect();
            return vectors.map((vector) => {
                const dot = vector.querySelector(".hero-vector-dot");
                const rect = (dot || vector).getBoundingClientRect();
                return {
                    x: rect.left + rect.width / 2 - heroRect.left,
                    y: rect.top + rect.height / 2 - heroRect.top,
                    active: vector === activeVector
                };
            });
        };

        const line = (a, b, alpha, active = false) => {
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            const rgb = active ? colour.active : colour.line;
            context.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
            context.lineWidth = active ? 1.05 : 0.72;
            context.stroke();
        };

        const dot = (point, alpha, radius, active = false) => {
            const rgb = active ? colour.active : colour.dot;
            context.beginPath();
            context.arc(point.x, point.y, radius, 0, Math.PI * 2);
            context.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
            context.fill();
        };

        const draw = (time, forceStatic = false) => {
            context.clearRect(0, 0, width, height);
            const delta = Math.min((time - lastTime) / 16.67, 2.2);
            lastTime = time;

            const mobile = width < 700;
            const connectionDistance = mobile ? 110 : 150;
            const startY = height * (mobile ? 0.43 : 0.46);

            particles.forEach((particle, index) => {
                if (!prefersReducedMotion && !forceStatic) {
                    particle.baseX += particle.vx * delta;
                    particle.baseY += particle.vy * delta;

                    if (particle.baseX < width * 0.03 || particle.baseX > width * 0.97) particle.vx *= -1;
                    if (particle.baseY < startY || particle.baseY > height * 0.97) particle.vy *= -1;

                    const pulse = Math.sin(time * 0.00065 + particle.phase) * 1.4;
                    particle.x = particle.baseX + pulse;
                    particle.y = particle.baseY + Math.cos(time * 0.00055 + particle.phase) * 1.1;
                }

                if (pointer.active && finePointer && !prefersReducedMotion) {
                    const dx = pointer.x - particle.x;
                    const dy = pointer.y - particle.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 135 && dist > 0) {
                        const pull = (1 - dist / 135) * 1.7;
                        particle.x += (dx / dist) * pull;
                        particle.y += (dy / dist) * pull;
                    }
                }

                dot(particle, 0.22 + 0.12 * Math.sin(time * 0.0007 + particle.phase), particle.radius);

                for (let j = index + 1; j < particles.length; j += 1) {
                    const other = particles[j];
                    const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
                    if (distance < connectionDistance) {
                        const alpha = (1 - distance / connectionDistance) * 0.115;
                        line(particle, other, alpha);
                    }
                }
            });

            const anchors = vectorPoints();
            anchors.forEach((anchor, index) => {
                let nearest = particles
                    .map((particle) => ({ particle, distance: Math.hypot(anchor.x - particle.x, anchor.y - particle.y) }))
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, anchor.active ? 5 : 3);

                nearest.forEach(({ particle, distance }) => {
                    const max = anchor.active ? 280 : 215;
                    if (distance > max) return;
                    const alpha = anchor.active ? 0.34 * (1 - distance / max) : 0.12 * (1 - distance / max);
                    line(anchor, particle, alpha, anchor.active);
                });

                if (index < anchors.length - 1) {
                    line(anchor, anchors[index + 1], anchor.active || anchors[index + 1].active ? 0.24 : 0.085, anchor.active || anchors[index + 1].active);
                }
            });

            if (pointer.active && finePointer && !prefersReducedMotion && pointer.y > startY) {
                particles.forEach((particle) => {
                    const distance = Math.hypot(pointer.x - particle.x, pointer.y - particle.y);
                    if (distance < 125) {
                        line(pointer, particle, (1 - distance / 125) * 0.11);
                    }
                });
            }

            if (!prefersReducedMotion && !forceStatic) frame = requestAnimationFrame(draw);
        };

        if (finePointer && !prefersReducedMotion) {
            hero.addEventListener("pointermove", (event) => {
                const rect = hero.getBoundingClientRect();
                pointer.x = event.clientX - rect.left;
                pointer.y = event.clientY - rect.top;
                pointer.active = true;

                if (background) {
                    const px = ((event.clientX - rect.left) / rect.width - 0.5) * 5;
                    const py = ((event.clientY - rect.top) / rect.height - 0.5) * 3;
                    background.style.transform = `scale(1.012) translate3d(${px}px, ${py}px, 0)`;
                }
            });

            hero.addEventListener("pointerleave", () => {
                pointer.active = false;
                if (background) background.style.transform = "scale(1.012)";
            });
        }

        resize();
        window.addEventListener("resize", resize);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(resize).catch(() => {});
        }

        if (!prefersReducedMotion) {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(draw);
        }
    }


    function initIsiHero() {
        const hero = document.querySelector("[data-isi-hero]");
        if (!hero) return;

        const signals = Array.from(hero.querySelectorAll("[data-isi-signal]"));
        const reading = hero.querySelector(".isi-instrument-reading");
        const readingLabel = hero.querySelector("[data-isi-label]");
        const readingCopy = hero.querySelector("[data-isi-copy]");
        const stateLabel = hero.querySelector("[data-isi-state]");
        const canvas = hero.querySelector(".isi-hero-canvas");
        const context = canvas ? canvas.getContext("2d") : null;

        if (!signals.length) return;

        let activeIndex = Math.max(0, signals.findIndex((signal) => signal.classList.contains("is-active")));
        let autoTimer = null;
        let transitionTimer = null;
        let frame = 0;
        let width = 0;
        let height = 0;
        let dpr = 1;
        let nodes = [];
        let heroVisible = true;
        let lastTime = performance.now();

        const updateSignal = (index, userInitiated = false) => {
            const signal = signals[index];
            if (!signal) return;
            activeIndex = index;
            signals.forEach((item, itemIndex) => {
                const active = itemIndex === index;
                item.classList.toggle("is-active", active);
                item.setAttribute("aria-pressed", String(active));
            });

            if (reading) reading.classList.add("is-changing");
            if (stateLabel) stateLabel.classList.add("is-changing");
            window.clearTimeout(transitionTimer);
            transitionTimer = window.setTimeout(() => {
                if (readingLabel) readingLabel.textContent = signal.dataset.label || "";
                if (readingCopy) readingCopy.textContent = signal.dataset.copy || "";
                if (stateLabel) stateLabel.textContent = signal.dataset.state || "";
                if (reading) reading.classList.remove("is-changing");
                if (stateLabel) stateLabel.classList.remove("is-changing");
            }, prefersReducedMotion ? 0 : 150);

            if (userInitiated) restartAutoCycle();
        };

        const restartAutoCycle = () => {
            window.clearInterval(autoTimer);
            if (prefersReducedMotion) return;
            autoTimer = window.setInterval(() => {
                if (!heroVisible || document.hidden) return;
                updateSignal((activeIndex + 1) % signals.length, false);
            }, 4300);
        };

        signals.forEach((signal, index) => {
            signal.addEventListener("click", () => updateSignal(index, true));
            signal.addEventListener("focus", () => updateSignal(index, true));
            if (finePointer) signal.addEventListener("mouseenter", () => updateSignal(index, true));
        });

        if ("IntersectionObserver" in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.target === hero) heroVisible = entry.isIntersecting;
                });
            }, { threshold: 0.05 });
            observer.observe(hero);
        }

        if (canvas && context) {
            const buildNodes = () => {
                const count = width < 700 ? 13 : width < 1100 ? 18 : 24;
                nodes = Array.from({ length: count }, (_, index) => {
                    const phase = (index * 2.399963229728653) % (Math.PI * 2);
                    const lane = index % 5;
                    return {
                        x: width * (0.48 + ((index * 37) % 49) / 100),
                        y: height * (0.08 + ((index * 61) % 84) / 100),
                        baseX: 0,
                        baseY: 0,
                        phase,
                        lane,
                        radius: index % 4 === 0 ? 1.5 : 1
                    };
                });
                nodes.forEach((node) => {
                    node.baseX = node.x;
                    node.baseY = node.y;
                });
            };

            const resize = () => {
                const rect = hero.getBoundingClientRect();
                width = Math.max(1, rect.width);
                height = Math.max(1, rect.height);
                dpr = Math.min(window.devicePixelRatio || 1, 2);
                canvas.width = Math.round(width * dpr);
                canvas.height = Math.round(height * dpr);
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
                context.setTransform(dpr, 0, 0, dpr, 0, 0);
                buildNodes();
            };

            const drawLine = (a, b, alpha, active = false) => {
                context.beginPath();
                context.moveTo(a.x, a.y);
                context.lineTo(b.x, b.y);
                context.strokeStyle = active
                    ? `rgba(167,215,232,${alpha})`
                    : `rgba(113,163,188,${alpha})`;
                context.lineWidth = active ? 1 : .65;
                context.stroke();
            };

            const drawDot = (point, alpha, active = false) => {
                context.beginPath();
                context.arc(point.x, point.y, active ? 2.2 : point.radius, 0, Math.PI * 2);
                context.fillStyle = active
                    ? `rgba(202,236,247,${alpha})`
                    : `rgba(153,198,219,${alpha})`;
                context.fill();
            };

            const activeAnchor = () => {
                const signal = signals[activeIndex];
                if (!signal) return null;
                const bar = signal.querySelector("i");
                if (!bar) return null;
                const heroRect = hero.getBoundingClientRect();
                const rect = bar.getBoundingClientRect();
                const percent = parseFloat(getComputedStyle(signal).getPropertyValue("--signal")) || 50;
                return {
                    x: rect.left - heroRect.left + rect.width * (percent / 100),
                    y: rect.top - heroRect.top + rect.height / 2
                };
            };

            const draw = (time, staticFrame = false) => {
                context.clearRect(0, 0, width, height);
                const delta = Math.min((time - lastTime) / 16.67, 2);
                lastTime = time;

                nodes.forEach((node, index) => {
                    if (!prefersReducedMotion && !staticFrame) {
                        node.x = node.baseX + Math.sin(time * .00022 + node.phase) * (4 + node.lane * .7);
                        node.y = node.baseY + Math.cos(time * .00018 + node.phase) * (3 + node.lane * .45);
                    }
                    drawDot(node, .16 + .06 * Math.sin(time * .0006 + node.phase));
                    for (let j = index + 1; j < nodes.length; j += 1) {
                        const other = nodes[j];
                        const distance = Math.hypot(node.x - other.x, node.y - other.y);
                        const limit = width < 700 ? 115 : 165;
                        if (distance < limit) drawLine(node, other, (1 - distance / limit) * .075);
                    }
                });

                const anchor = activeAnchor();
                if (anchor) {
                    const nearest = nodes
                        .map((node) => ({ node, distance: Math.hypot(anchor.x - node.x, anchor.y - node.y) }))
                        .sort((a, b) => a.distance - b.distance)
                        .slice(0, 4);
                    nearest.forEach(({ node, distance }) => {
                        const max = width < 700 ? 210 : 300;
                        if (distance < max) drawLine(anchor, node, .22 * (1 - distance / max), true);
                    });
                    drawDot({ ...anchor, radius: 2.2 }, .72, true);
                }

                if (!prefersReducedMotion && !staticFrame) frame = window.requestAnimationFrame(draw);
            };

            resize();
            window.addEventListener("resize", resize);
            if (prefersReducedMotion) {
                draw(performance.now(), true);
            } else {
                cancelAnimationFrame(frame);
                frame = window.requestAnimationFrame(draw);
            }
        }

        updateSignal(activeIndex, false);
        restartAutoCycle();
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
        initVantageHero();
        initIsiHero();
        initCardEntry();
    });
})();
