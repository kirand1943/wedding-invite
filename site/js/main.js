/* =====================================================================
   main.js — Kiran weds Rutuja · scroll-driven wedding invitation
   ---------------------------------------------------------------------
   1. CONFIG            all event details / links / RSVP settings (edit here)
   2. DOM population    props, petals, umbrellas …
   3. Scene 0           tap-to-open envelope + the opening "assembly"
   4. Master timeline   ONE GSAP timeline scrubbed by scroll (scenes 1 → 8)
   5. Extras            countdown, bell chime, ambient sound, flashes, RSVP

   Couple artwork lives in assets/couple/*.webp (cut from the collection sheet by
   tools/cut_couple.py). Same two people everywhere — only the outfit art changes per event.
   ===================================================================== */
import * as Art from "./art.js";

/* ───────────────────────── 1. CONFIG ───────────────────────── */
const CONFIG = {
    //   Change it here once and the page text + countdown both follow.
    muhurtham: { label: "7:05 AM to 7:30 AM", iso: "2026-12-14T07:05:00+05:30" },
    venue: "Kshana by the Sea",
    place: "Adyar Hills",
    maps: {
        wedding: "https://www.google.com/maps/place//data=!4m2!3m1!1s0x3bbcb1ae6b47d05f:0xc3dc2e1fccef0f86?sa=X&ved=1t:8290&ictx=111",
        haldi: "https://www.google.com/maps/place//data=!4m2!3m1!1s0x3ba35900c8684f9d:0x5890765ecd7d12dc?sa=X&ved=1t:8290&ictx=111",
        sangeet: "https://www.google.com/maps/place//data=!4m2!3m1!1s0x3ba35900c8684f9d:0x5890765ecd7d12dc?sa=X&ved=1t:8290&ictx=111",
    },
    reception: {
        date: "19 December 2026",
        short: "19 Dec",
        venue: "SRK Grandeur Convention Centre",
        time: "7:00 PM onwards",
        map: "https://www.google.com/maps/place//data=!4m2!3m1!1s0x3baf7b3af61666a7:0xbeac56a1a34045b3?sa=X&ved=1t:8290&ictx=111",
    },
    rsvp: {
        // Google Sheet via the Apps Script web app in apps-script/rsvp.gs (setup steps are at the top of that file).
        // Paste the "Web app URL" here. Leave empty and the form falls back to WhatsApp.
        endpoint: "https://script.google.com/macros/s/AKfycbysEvRoZRX0go6EhOFUOAXWEWCJLAOSE7U5uz0eAAVotZCKURTkjV9NIKiH-1wgNVff9Q/exec",
        whatsapp: "918867347911",
        deadline: "Please reply by 15 November", // e.g. "Please reply by 15 November"
    },
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const gsap = window.gsap;
gsap.registerPlugin(window.ScrollTrigger);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
history.scrollRestoration = "manual";

const frame = $("#frame");
const rand = (a, b) => a + Math.random() * (b - a);

/* ───────────────────────── 2. DOM population ───────────────────────── */
$$("[data-muhurtham]").forEach((e) => (e.textContent = CONFIG.muhurtham.label));
$$("[data-venue]").forEach((e) => (e.textContent = CONFIG.venue));
$$("[data-event-place]").forEach((e) => (e.textContent = CONFIG.place));
CONFIG.maps.reception = CONFIG.reception.map;
$$("[data-reception-date]").forEach((e) => (e.textContent = CONFIG.reception.date));
$$("[data-reception-venue]").forEach((e) => (e.textContent = CONFIG.reception.venue));
$$("[data-reception-time]").forEach((e) => (e.textContent = CONFIG.reception.time));
$$("[data-reception-short]").forEach((e) => (e.textContent = CONFIG.reception.short));
$$("[data-map]").forEach((a) => (a.href = CONFIG.maps[a.dataset.map]));

$("#fps").innerHTML = Art.footprints(8);
$("#archArt").innerHTML = Art.arch();
$("#mapArt").innerHTML = Art.mapIllustration();
$("#mandapArt").innerHTML = Art.mandap();

// Haldi umbrellas: PLANTED on the plate's sand/rug. x = centre (% of width), base = ground line (% of height).
const umbrellas = [
    { x: 66, base: 99.6, w: 15, main: "#f6df6a", alt: "#fffbe0" },   // in front of the plate's bowls
    { x: 30, base: 99.5, w: 10, main: "#f2a7c3", alt: "#fff4f0" },   // behind-left, on the sand wedge
];
umbrellas.forEach((u, i) => {
    const d = document.createElement("div");
    d.className = "u-wrap";
    d.style.cssText = `left:calc(${u.x}% - ${u.w / 2}cqw);bottom:${(100 - u.base).toFixed(1)}cqh;width:${u.w}cqw`;
    d.innerHTML = Art.umbrella(u.main, u.alt, "h" + i) + `<div class="contact-shadow"></div>`;
    $("#umbrellas").appendChild(d);
});
// marigold garland strings hung between the umbrella tops and the plate's big umbrella (svg units: x %, y % × 1.778)
const top = (u) => [u.x, (u.base - u.w * 0.89) * 1.778];
const A = top(umbrellas[0]), B = top(umbrellas[1]);
const MG = ["#f5a623", "#fbbf3d", "#e58f12", "#fff3b0"];
$("#garlands").innerHTML = `<svg viewBox="0 0 100 177.8" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <g class="g">${Art.flowerString(B, [(A[0] + B[0]) / 2, B[1] + 14], A, 30, MG, 1.3, 3)}</g>
  <g class="g" style="animation-delay:-2s">${Art.flowerString(A, [(A[0] + 74) / 2, A[1] - 2], [74, 137.8], 24, MG, 1.3, 5)}</g>
</svg>`;

// petals for scene 3 / 4
const petalsEl = $("#petals");
for (let i = 0; i < 26; i++) {
    const p = document.createElement("i");
    p.className = "petal";
    p.style.left = (Math.random() * 100).toFixed(1) + "%";
    petalsEl.appendChild(p);
}
const petals = $$(".petal");

// soft marigold petals drifting through the Haldi scene
for (let i = 0; i < 26; i++) {
    const p = document.createElement("i");
    p.className = "hp";
    p.style.cssText = `left:${rand(0, 100).toFixed(1)}%;--d:${rand(7, 13).toFixed(1)}s;--delay:${(-rand(0, 12)).toFixed(1)}s;--dx:${rand(-14, 14).toFixed(1)}cqw;width:${rand(1.6, 2.6).toFixed(1)}cqw;height:${rand(2.2, 3.4).toFixed(1)}cqw`;
    $("#haldiPetals").appendChild(p);
}
// warm light bokeh for the Sangeet stage
for (let i = 0; i < 16; i++) {
    const b = document.createElement("i");
    const s = rand(5, 14);
    b.style.cssText = `left:${rand(2, 94).toFixed(1)}%;top:${rand(6, 80).toFixed(1)}%;width:${s.toFixed(1)}cqw;height:${s.toFixed(1)}cqw;--d:${rand(4, 9).toFixed(1)}s;--dx:${rand(-5, 5).toFixed(1)}cqw`;
    $("#bokeh").appendChild(b);
}

// gold sparkles that rise around the dancing couple
for (let i = 0; i < 18; i++) {
    const s = document.createElement("i");
    s.className = "spk";
    const size = rand(1.2, 2.8);
    s.style.cssText = `left:${rand(26, 72).toFixed(1)}%;top:${rand(52, 80).toFixed(1)}%;width:${size.toFixed(1)}cqw;height:${size.toFixed(1)}cqw`;
    $("#sparkles").appendChild(s);
}

// soft chandelier-light twinkles for the Reception stage
for (let i = 0; i < 22; i++) {
    const s = document.createElement("i");
    s.style.cssText = `left:${rand(8, 92).toFixed(1)}%;top:${rand(3, 40).toFixed(1)}%;--d:${rand(2, 5).toFixed(1)}s;--delay:${(-rand(0, 4)).toFixed(1)}s;transform:scale(${rand(0.6, 1.8).toFixed(2)})`;
    $("#rcSparkles").appendChild(s);
}

// lazy images for later scenes (kept off the critical path)
const lazyLoad = () => $$("img[data-src]").forEach((img, i) => setTimeout(() => { img.src = img.dataset.src; }, i * 90));

/* ───────────────────────── camera + helpers ───────────────────────── */
const world = $("#world");
const cam = { z: 1.8 };
const applyCam = () => {
    gsap.set(world, { scale: cam.z });
    const fg = 1 + (cam.z - 1) * 0.6;
    gsap.set("#standWrap", { scale: fg });
    gsap.set("#banana", { scale: fg });
};
applyCam();

let W = 0, H = 0, opened = false;
const measure = () => { W = frame.clientWidth; H = frame.clientHeight; };
/** Position/scale a pose so its FEET sit at (fx%, fy%) of the frame. */
const feet = (el, fx, fy, s = 1) => ({
    x: (fx / 100) * W - el.offsetWidth / 2,
    y: (fy / 100) * H - el.offsetHeight,
    scale: s,
});
/** Foreground pieces start parked beyond their corner; the opening tween brings them home. */
const parkIntro = () => {
    measure();
    gsap.set("#introL", { x: -W * 0.45, y: H * 0.22 });
    gsap.set("#introR", { x: W * 0.45, y: H * 0.22 });
    gsap.set("#hang", { y: -H * 0.32 });
};

/* ───────────────────────── 3. Scene 0 — tap to open ───────────────────────── */
$("#opener").addEventListener("click", () => {
    if (opened) return;
    opened = true;
    ensureAudio();
    lazyLoad();
    const t = gsap.timeline({
        onComplete: () => {
            document.body.classList.remove("locked");
            window.scrollTo(0, 0);
            ScrollTrigger.refresh();
        },
    });
    t.to(".opener-text", { y: -30, autoAlpha: 0, duration: 0.7, ease: "power2.in" })
        .to(".ring", { scale: 2.4, autoAlpha: 0, duration: 0.7 }, 0)
        .to(".door-l", { rotationY: -112, duration: 2.4, ease: "power3.inOut" }, 0.5)
        .to(".door-r", { rotationY: 112, duration: 2.4, ease: "power3.inOut" }, 0.5)
        .fromTo(cam, { z: 1.15 }, { z: 1.8, duration: 3.4, ease: "power2.out", onUpdate: applyCam }, 0.5)
        // the scene "assembles": each prop glides in from its own corner as the doors part
        .to("#introL", { x: 0, y: 0, duration: 2.2, ease: "power3.out" }, 1.1)
        .to("#introR", { x: 0, y: 0, duration: 2.2, ease: "power3.out" }, 1.3)
        .to("#hang", { y: 0, duration: 2.2, ease: "power3.out" }, 1.5)
        .to("#walkers", { autoAlpha: 1, duration: 1.8, ease: "power1.out" }, 2.4)
        .set(".opener", { autoAlpha: 0 })
        .to("#mute", { autoAlpha: 1, duration: 1 }, 3);
});

/* ───────────────────────── 4. Master timeline ───────────────────────── */
let master, st;
const T_END = 118;
const WALK = { y0: 95 };                         // where the couple's feet start on the sand (% of frame height)

function build() {
    measure();
    if (master) { master.scrollTrigger && master.scrollTrigger.kill(); master.kill(); }

    const w1 = $("#walkers"), cock = $("#cocktail");
    const fps = $$(".fp");
    const E = "power1.inOut";

    master = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: "#scroll-space", start: "top top", end: "bottom bottom", scrub: reduced ? true : 0.8, invalidateOnRefresh: true },
    });
    const tl = master;
    st = tl.scrollTrigger;
    const show = (t, at, d = 1.2, vars = {}) => tl.to(t, { autoAlpha: 1, duration: d, ...vars }, at);
    const hide = (t, at, d = 1.2, vars = {}) => tl.to(t, { autoAlpha: 0, duration: d, ...vars }, at);

    /* ---- initial positions ---- */
    gsap.set(w1, { ...feet(w1, 50, WALK.y0, 1), autoAlpha: opened ? 1 : 0, transformOrigin: "50% 100%" });
    gsap.set(cock, { ...feet(cock, -22, 73, 0.95), autoAlpha: 0, transformOrigin: "50% 100%" });
    gsap.set(["#benchSet", ".seated", ".fp", "#wash", "#haze"], { autoAlpha: 0 });
    gsap.set("#spot", { opacity: 0 });
    gsap.set(".mari", { autoAlpha: 1 });

    /* ============ SCENE 1 · LANDING (0 → 14) ============ */
    tl.fromTo(cam, { z: 1.8 }, { z: 1.2, duration: 14, ease: E, onUpdate: applyCam }, 0);
    tl.to(w1, { ...feet(w1, 52, 88.6, 0.5), duration: 14, ease: "power1.out" }, 0);   // fx 50→52, fy y0→88.6, scale 1→0.5
    // every print lands exactly where the couple's feet are at that moment of the walk (same easing as the walk)
    fps.forEach((fp, k) => {
        const i = k >> 1, groom = k % 2 === 0, tt = 0.8 + i * 1.45;
        const u = Math.min(1, tt / 14), e = 1 - (1 - u) * (1 - u);            // power1.out
        const fx = 50 + 2 * e, fy = WALK.y0 + (88.6 - WALK.y0) * e, s = 1 - 0.5 * e;
        const dx = groom ? (i % 2 ? 6.2 : 9.2) : (i % 2 ? -1.9 : -5.2);          // feet positions across the figure, in cqw at scale 1
        gsap.set(fp, { left: `${(fx + dx * s).toFixed(2)}%`, top: `${(fy - (groom ? 1.5 : 0.8) * s).toFixed(2)}%`, "--s": s.toFixed(3), "--r": `${(i % 2 ? 4 : -4) * (groom ? 1 : -1)}deg` });
        tl.to(fp, { autoAlpha: 0.75, duration: 0.5 }, tt);
    });
    tl.to("#wash", { autoAlpha: 1, duration: 1.4 }, 11.6).to("#wash", { autoAlpha: 0, duration: 1.4 }, 13);
    tl.to(fps, { autoAlpha: 0, duration: 1.6, stagger: 0.05 }, 12.2);
    /* ============ SCENE 2 · THE BENCH (14 → 28) ============ */
    tl.to(cam, { z: 1.75, duration: 9, ease: E, onUpdate: applyCam }, 14);
    tl.to("#haze", { autoAlpha: 0.6, duration: 7 }, 14);
    tl.fromTo("#benchSet", { y: H * 0.03 }, { y: 0, autoAlpha: 1, duration: 3 }, 12.5);
    tl.to(w1, { ...feet(w1, 52, 88.1, 0.5), duration: 5, ease: E }, 14.6);
    tl.to(w1, { autoAlpha: 0, duration: 0.8 }, 20).to(".seated", { autoAlpha: 1, duration: 0.8 }, 20);
    tl.fromTo("#t2", { y: 16 }, { y: 0, autoAlpha: 1, duration: 2.4 }, 18);
    tl.to("#scrollHint", { autoAlpha: 0, duration: 1 }, 24.5);
    tl.to("#t2", { autoAlpha: 0, y: -10, duration: 1.4 }, 26.6);

    /* ============ SCENE 3 · MUHURTHAM / VARMALA (28 → 44) ============ */
    tl.to(["#benchSet", "#haze"], { autoAlpha: 0, duration: 1.6 }, 27.2);
    tl.to(w1, { autoAlpha: 0, duration: 0.1 }, 27);
    tl.to(["#introL", "#introR"], { autoAlpha: 0, duration: 2 }, 28);
    tl.to(cam, { z: 1.2, duration: 3, ease: E, onUpdate: applyCam }, 27.5);
    show("#s3", 28, 3);
    tl.fromTo("#mandapArt", { scale: 0.92, transformOrigin: "50% 100%" }, { scale: 1, duration: 4, ease: "power1.out" }, 28);
    tl.fromTo("#gx", { y: H * 0.04, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 3, ease: "power1.out" }, 29);
    tl.fromTo("#t3", { y: 16 }, { y: 0, autoAlpha: 1, duration: 2.2 }, 30);
    /* ---- the exchange: they stand together, a soft flash, and the garlanded pose takes over ---- */
    tl.fromTo("#gxPre", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.5 }, 29.5);
    tl.to("#flash", { opacity: 0.85, duration: 0.7, ease: "power1.in" }, 36.6);
    tl.to("#gxPre", { autoAlpha: 0, duration: 0.2 }, 37.3);
    tl.fromTo("#gxDone", { autoAlpha: 0, scale: 0.97, transformOrigin: "50% 100%" }, { autoAlpha: 1, scale: 1, duration: 0.2 }, 37.3);
    tl.to("#gxDone", { scale: 1.02, duration: 4, ease: "sine.out" }, 37.5);
    tl.to("#flash", { opacity: 0, duration: 1.4 }, 37.5);
    hide("#t3", 42.8, 1.2);

    // petals fall in scene 3 after the exchange, then drift upward into scene 4
    show("#petals", 37.6, 1);
    petals.forEach((p, i) => {
        const x0 = (Math.random() - 0.5) * 24, x1 = (Math.random() - 0.5) * 30;
        tl.fromTo(p, { y: -H * 0.08, x: 0, rotation: 0 }, { y: H * 1.05, x: x0 * W / 100, rotation: 300 + i * 12, duration: 8, ease: "none" }, 37.6 + i * 0.22);
        tl.fromTo(p, { y: H * 1.05, x: x0 * W / 100 }, { y: -H * 0.1, x: x1 * W / 100, rotation: -240, duration: 10, ease: "sine.inOut", immediateRender: false }, 47 + i * 0.2);
    });

    /* ============ SCENE 4 · LOCATION · COUNTDOWN · RSVP (44 → 56) ============ */
    hide("#s3", 44, 2.5);
    hide("#hang", 44.5, 2);
    tl.to(cam, { z: 1.05, duration: 8, ease: E, onUpdate: applyCam }, 45);
    show("#veil", 44.2, 2.6);
    tl.set("#s4", { autoAlpha: 1 }, 46);
    tl.fromTo(".map-card", { y: H * 0.03, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.8 }, 46);
    tl.fromTo(".count", { y: H * 0.03, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.8 }, 47.2);
    tl.to("#s4", { autoAlpha: 0, duration: 1.4 }, 54.2);
    hide("#petals", 55, 1.2);

    /* ============ SCENE 5 · TRANSITION TO HALDI (56) ============ */
    hide("#veil", 55, 2);
    show("#bgB", 56.2, 0.2);
    tl.to("#cam", { autoAlpha: 0, duration: 2.4 }, 56);

    /* ============ SCENE 6 · HALDI (56 → 74) ============ */
    show("#s6", 56, 2.2);
    tl.fromTo(".u-wrap", { y: H * 0.05, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.6, stagger: 0.5, ease: "power2.out" }, 56.4);
    tl.fromTo(".garlands svg", { autoAlpha: 0 }, { autoAlpha: 1, duration: 2 }, 57.4);
    tl.fromTo(".hc-front", { y: H * 0.05, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 2.4, ease: "power2.out" }, 57.4);
    tl.fromTo(".mari-h", { x: -W * 0.1 }, { x: 0, duration: 2.6, ease: "power2.out" }, 57);
    tl.fromTo("#t6", { y: 14 }, { y: 0, autoAlpha: 1, duration: 2 }, 59.2);
    tl.fromTo("#d6", { y: 10 }, { y: 0, autoAlpha: 1, duration: 2 }, 61.4);
    // standing together → the groom sweeps her up
    tl.to(".hc-front", { autoAlpha: 0, duration: 1.2 }, 65).fromTo(".hc-carry", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2 }, 65);
    hide(["#t6", "#d6"], 73.4, 1.2);

    /* ============ SCENE 7 · SANGEET (74 → 92) ============ */
    hide(["#s6", "#bgB"], 74.2, 1.6);
    show("#s7", 73.8, 1.8);
    tl.to(".stage-img", { opacity: 1, duration: 1.8 }, 74.2);
    tl.to(".beam", { opacity: 0.16, duration: 2, stagger: 0.3 }, 75.5);
    tl.fromTo("#t7", { y: 14 }, { y: 0, autoAlpha: 1, duration: 2 }, 76.4);
    tl.fromTo("#d7", { y: 10 }, { y: 0, autoAlpha: 1, duration: 2 }, 78.2);
    // the couple glides in, the light blooms, the pose changes inside the bloom, and the camera eases in slowly
    tl.set(cock, { autoAlpha: 1 }, 75.4);
    tl.fromTo(".dance-run", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 75.4);
    tl.to(cock, { ...feet(cock, 50, 71.5, 0.95), duration: 5.6, ease: "power3.out" }, 75.4);
    tl.to("#spot", { opacity: 0.3, duration: 2.4 }, 78);
    tl.to(".floor-glow", { opacity: 1, duration: 2.4 }, 78);
    // run → twirl
    tl.fromTo("#bloom", { opacity: 0 }, { opacity: 0.8, duration: 0.5, ease: "power2.out" }, 82.2).to("#bloom", { opacity: 0, duration: 1, ease: "power2.in" }, 82.7);
    tl.to(".dance-run", { autoAlpha: 0, duration: 0.2 }, 82.5).fromTo(".dance-twirl", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 82.5);
    tl.to(cock, { scale: 1.02, duration: 4, ease: "sine.inOut" }, 82.7);
    tl.fromTo(".floor-ring", { scale: 0.35, opacity: 0.95 }, { scale: 1.25, opacity: 0, duration: 1.3, ease: "power1.out", repeat: 2, immediateRender: false }, 82.9);
    tl.fromTo(".spk", { opacity: 0, y: 26, scale: 0.3 }, { opacity: 1, y: -34, scale: 1, duration: 1.8, stagger: 0.16, ease: "sine.out" }, 83.1);
    tl.to(".spk", { opacity: 0, y: -80, duration: 1.8, stagger: 0.1 }, 87.6);
    // twirl → dip
    tl.fromTo("#bloom", { opacity: 0 }, { opacity: 0.8, duration: 0.5, ease: "power2.out" }, 86.2).to("#bloom", { opacity: 0, duration: 1, ease: "power2.in" }, 86.7);
    tl.to(".dance-twirl", { autoAlpha: 0, duration: 0.2 }, 86.5).fromTo(".dance-dip", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 86.5);
    tl.to(cock, { scale: 1.1, duration: 3.6, ease: "sine.inOut" }, 86.7);
    tl.fromTo(".floor-ring", { scale: 0.35, opacity: 0.95 }, { scale: 1.3, opacity: 0, duration: 1.6, ease: "power1.out", immediateRender: false }, 86.7);
    hide(["#t7", "#d7"], 91.4, 1.4);

    /* ============ SCENE 9 · RECEPTION (92 → 104) ============ */
    hide("#s7", 92.2, 2.2);
    show("#s9", 92.4, 2.4);
    tl.fromTo("#rcWrap", { y: H * 0.05, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 2.6, ease: "power2.out" }, 93.6);
    tl.fromTo("#t9", { y: 14 }, { y: 0, autoAlpha: 1, duration: 2 }, 94.6);
    tl.fromTo("#d9", { y: 10 }, { y: 0, autoAlpha: 1, duration: 1.8 }, 96.4);
    hide(["#t9", "#d9"], 102.2, 1.4);
    hide("#s9", 102.6, 1.8);

    /* ============ SCENE 8 · CLOSING (104 → 118) ============ */
    tl.fromTo("#t8", { y: 14 }, { y: 0, autoAlpha: 1, duration: 2 }, 104.8);
    tl.fromTo("#s8c", { y: H * 0.03, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 2.2 }, 105.4);
    tl.fromTo(".door-l", { rotationY: -112 }, { rotationY: 0, duration: 4.6, ease: "power3.inOut", immediateRender: false }, 111.6);
    tl.fromTo(".door-r", { rotationY: 112 }, { rotationY: 0, duration: 4.6, ease: "power3.inOut", immediateRender: false }, 111.6);
    hide("#t8", 112.8, 1.6);
    hide("#s8c", 112.8, 1.6);
    tl.to({}, { duration: 0.01 }, T_END); // fix total length

    tl.eventCallback("onUpdate", () => {
        const t = tl.time();
        flashes.active = t > 78 && t < 92.5;
        flashes.rc = t > 95 && t < 102.4;
    });
}

/* ───────────────────────── 5. Extras ───────────────────────── */

/* walking pose only bobs while the user scrolls */
let movingTimer;
addEventListener("scroll", () => {
    document.body.classList.add("moving");
    clearTimeout(movingTimer);
    movingTimer = setTimeout(() => document.body.classList.remove("moving"), 160);
}, { passive: true });

/* ---- countdown ---- */
const target = new Date(CONFIG.muhurtham.iso).getTime();
const pad = (n) => String(Math.max(0, n)).padStart(2, "0");
function tick() {
    let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    $("#cd-d").textContent = String(d).padStart(2, "0");
    $("#cd-h").textContent = pad(h);
    $("#cd-m").textContent = pad(m);
    $("#cd-s").textContent = pad(s);
}
tick();
setInterval(tick, 1000);

/* ---- audio: synthesised sea ambience (no files) + bell chime ---- */
let actx, ambientGain, ambientOn = false;
function ensureAudio() {
    if (actx) return actx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
    // brown noise through a slow-moving low-pass = surf
    const len = actx.sampleRate * 4, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    const src = actx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
    const lfo = actx.createOscillator(); lfo.frequency.value = 0.11;
    const lfoGain = actx.createGain(); lfoGain.gain.value = 380;
    lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
    ambientGain = actx.createGain(); ambientGain.gain.value = 0;
    src.connect(lp); lp.connect(ambientGain); ambientGain.connect(actx.destination);
    src.start(); lfo.start();
    return actx;
}
function chime() {
    const ctx = ensureAudio(); if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime;
    [[880, 0.18], [1318.5, 0.1], [1760, 0.06], [2637, 0.035]].forEach(([f, g]) => {
        const o = ctx.createOscillator(), a = ctx.createGain();
        o.type = "sine"; o.frequency.value = f;
        a.gain.setValueAtTime(0, t0); a.gain.linearRampToValueAtTime(g, t0 + 0.01); a.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6);
        o.connect(a); a.connect(ctx.destination); o.start(t0); o.stop(t0 + 2.7);
    });
}
$("#bell").addEventListener("click", () => {
    const b = $("#bell"); b.classList.remove("ring"); void b.offsetWidth; b.classList.add("ring"); chime();
});
$("#mute").addEventListener("click", () => {
    const ctx = ensureAudio(); if (!ctx) return;
    ambientOn = !ambientOn;
    if (ctx.state === "suspended") ctx.resume();
    ambientGain.gain.linearRampToValueAtTime(ambientOn ? 0.28 : 0, ctx.currentTime + 0.8);
    $("#mute").setAttribute("aria-pressed", String(ambientOn));
    $("#mute").setAttribute("aria-label", ambientOn ? "Turn ambient sound off" : "Turn ambient sound on");
});

/* ---- sangeet camera flashes ---- */
const flashes = { active: false, rc: false };
(function flashLoop() {
    setTimeout(flashLoop, 900 + Math.random() * 2200);
    if (!flashes.active || reduced) return;
    gsap.fromTo("#camFlash", { opacity: 0.5 }, { opacity: 0, duration: 0.35, ease: "power2.out" });
})();

// reception: press photographers — quick full-frame pops with a starburst where the camera is, often in bursts of two
(function photoFlashes() {
    setTimeout(photoFlashes, 380 + Math.random() * 1100);
    if (!flashes.rc || reduced) return;
    const pop = () => {
        const b = document.createElement("i");
        b.className = "rc-burst";
        b.style.left = `${rand(6, 94).toFixed(1)}%`;
        b.style.top = `${rand(58, 94).toFixed(1)}%`;
        $("#rcBursts").appendChild(b);
        setTimeout(() => b.remove(), 700);
        gsap.fromTo("#rcFlash", { opacity: rand(0.28, 0.5) }, { opacity: 0, duration: 0.32, ease: "power2.out" });
    };
    pop();
    if (Math.random() < 0.4) setTimeout(pop, 130 + Math.random() * 120);
})();

/* ---- RSVP → Google Sheet (Apps Script web app, see apps-script/rsvp.gs) ---------------------------
   Guard-rails here (the script repeats every one of them server-side):
   · names are normalised (case, accents, spacing, punctuation ignored) — same person = same row, so a repeat
     submission UPDATES the earlier reply instead of adding a new one
   · required fields / ranges, at least one event when accepting, no links or markup in the name
   · honeypot field, minimum fill time, one request at a time, cooldown between sends
   · timeout + safe retry (the server is idempotent), WhatsApp fallback if the sheet can't be reached */
const dlg = $("#rsvp"), form = $("#rsvpForm"), status = $("#rsvpStatus"), submitBtn = form.querySelector("button[type=submit]");
const details = $("#rsvpDetails"), hint = $("#rsvpHint");
const LAST_KEY = "kr-rsvp-last";
let openedAt = 0, sending = false;

const cleanName = (s) => s.normalize("NFKC").replace(/\s+/g, " ").trim();
const nameKey = (s) => cleanName(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const chosenEvents = () => $$("input[name=events]:checked", form).map((i) => i.value);
const isAttending = () => form.attending.value === "yes";
const readLast = () => { try { return JSON.parse(localStorage.getItem(LAST_KEY) || "null"); } catch { return null; } };
const say = (msg, kind = "") => { status.textContent = msg; status.className = "status " + kind; };

function waLink() {
    const name = cleanName(form.name.value);
    const names = { haldi: "Haldi", sangeet: "Sangeet", wedding: "Wedding", reception: "Reception" };
    const msg = isAttending()
        ? `Hi Kiran & Rutuja! ${name ? name + " here. " : ""}I'll be joining ${chosenEvents().map((e) => names[e]).join(", ") || "the celebrations"} (${form.guests.value} guest/s).`
        : `Hi Kiran & Rutuja! ${name ? name + " here. " : ""}Sorry, I won't be able to make it. Wishing you both all the happiness!`;
    return `https://wa.me/${CONFIG.rsvp.whatsapp}?text=${encodeURIComponent(msg)}`;
}
function syncUi() {
    details.hidden = !isAttending();
    $("[data-whatsapp]").href = waLink();
}
function validate() {
    const name = cleanName(form.name.value);
    if (name.length < 2 || !/\p{L}/u.test(name)) return "Please enter your full name.";
    if (/https?:|www\.|<|>|\.com\b/i.test(name)) return "Please enter just your name.";
    if (!form.side.value) return "Please tell us whose side you are from.";
    if (isAttending()) {
        if (!chosenEvents().length) return "Please tick at least one event you'll attend.";
        const g = parseInt(form.guests.value, 10);
        if (!(g >= 1 && g <= 8)) return "Please choose the number of guests.";
    }
    if (form.message.value.length > 300) return "Please keep your note under 300 characters.";
    return "";
}

$$("[data-rsvp]").forEach((b) => b.addEventListener("click", () => {
    openedAt = performance.now();
    const last = readLast();
    if (last && !form.name.value) form.name.value = last.name;
    hint.textContent = last
        ? `You replied as “${last.name}”. Send again with the same name and we'll simply update your reply.`
        : "Replied before? Use the same name and we will simply update your reply.";
    say(CONFIG.rsvp.deadline || "");
    syncUi();
    dlg.showModal();
}));
$("[data-close]").addEventListener("click", () => dlg.close());
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
form.addEventListener("input", syncUi);
form.addEventListener("change", syncUi);

async function post(payload) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    try {
        // text/plain keeps this a "simple" request (no CORS pre-flight, which Apps Script cannot answer)
        const r = await fetch(CONFIG.rsvp.endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload), signal: ctl.signal });
        return await r.json();
    } finally { clearTimeout(timer); }
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending) return;
    const problem = validate();
    if (problem) return say(problem, "err");
    if (!CONFIG.rsvp.endpoint) return say("RSVP isn't connected yet — please use the WhatsApp link below.", "err");

    const last = readLast();
    if (last && Date.now() - last.at < 8000) return say("One moment — your reply was just sent.", "ok");

    const attending = isAttending();
    const payload = {
        v: 1,
        name: cleanName(form.name.value),
        side: form.side.value,
        attending: attending ? "yes" : "no",
        guests: attending ? parseInt(form.guests.value, 10) : 0,
        events: attending ? chosenEvents() : [],
        message: form.message.value.replace(/\s+/g, " ").trim().slice(0, 300),
        website: form.website.value,                        // honeypot: humans leave it empty
        t: Math.round(performance.now() - openedAt),        // fill time (ms)
    };

    sending = true; submitBtn.disabled = true; say("Sending…");
    let res = null;
    for (let attempt = 0; attempt < 2 && !res; attempt++) {     // one safe retry: the sheet de-duplicates by name
        try { res = await post(payload); } catch { await new Promise((r) => setTimeout(r, 900)); }
    }
    sending = false; submitBtn.disabled = false;

    if (res && res.ok) {
        try { localStorage.setItem(LAST_KEY, JSON.stringify({ name: payload.name, key: nameKey(payload.name), at: Date.now() })); } catch { /* private mode */ }
        say(res.updated ? "Your reply has been updated. Thank you!" : attending ? "Thank you! We can’t wait to celebrate with you." : "Thank you for letting us know — you'll be in our hearts.", "ok");
        setTimeout(() => dlg.close(), 2600);
        return;
    }
    const msgs = {
        invalid_name: "Please check your name and try again.",
        invalid_side: "Please tell us whose side you are from.",
        choose_events: "Please tick at least one event you'll attend.",
        invalid_guests: "Please choose the number of guests.",
        too_many: "You've sent several replies in a short time — please wait a little and try again.",
        busy: "Many replies are coming in — please try again in a moment.",
    };
    say((res && msgs[res.error]) || "Couldn't reach the guest list just now — please try again, or use the WhatsApp link below.", "err");
});

/* ---- start ---- */
// wait for the hero artwork so pose sizes are known before positioning
await Promise.all($$("img:not([data-src])").map((i) => i.decode().catch(() => { })));
parkIntro();
build();
window.__kr = { get tl() { return master; } };   // QA handle: __kr.tl.time(36) jumps to that moment
let rz, lastW = frame.clientWidth, lastH = frame.clientHeight;
addEventListener("resize", () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
        // The frame is 100dvh, so on phones it grows/shrinks whenever the browser toolbar hides/shows while scrolling.
        // Every pixel position in the timeline was measured at build time, so re-measure and rebuild at the same progress
        // (otherwise the couple drifts off the sand / stage after the toolbar collapses).
        const w = frame.clientWidth, h = frame.clientHeight;
        if (Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 2) return;
        if (dlg.open) return;                                   // on-screen keyboard while filling the RSVP: leave the scene alone
        lastW = w; lastH = h;
        const p = st ? st.progress : 0;
        if (opened) { gsap.set(["#introL", "#introR", "#hang"], { x: 0, y: 0 }); } else { parkIntro(); }
        build();
        master.progress(p);
        ScrollTrigger.refresh();
    }, 120);
});
