/* =====================================================================
   art.js - small painted-style SVG props (the couple itself is real artwork in
   assets/couple/*.webp): flower strings, floral arch, mandap, umbrellas, garlands,
   monogram arch, map illustration, footprints.
   ===================================================================== */

const rnd = (seed) => { // tiny deterministic PRNG so layout is stable between loads
    let s = seed;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

const SYM = { "#f5a623": "fl-m", "#fbbf3d": "fl-m", "#e58f12": "fl-m", "#f7b733": "fl-m", "#f08ab4": "fl-r", "#f7b6cf": "fl-r", "#e0679a": "fl-r", "#ffffff": "fl-j", "#fffaf0": "fl-j" };

/** Flowers strung along a quadratic curve (painted flower sprites defined in index.html). */
export function flowerString(p0, p1, p2, n, colors, r = 3.2, seed = 7) {
    const R = rnd(seed);
    let out = "";
    for (let i = 0; i <= n; i++) {
        const t = i / n, u = 1 - t;
        const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
        const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
        const c = colors[Math.floor(R() * colors.length)];
        const rr = r * (0.8 + R() * 0.5);
        const id = SYM[c];
        if (id) {
            const s = rr * 2.9;
            out += `<use href="#${id}" x="${(x - s / 2).toFixed(1)}" y="${(y - s / 2).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" transform="rotate(${Math.round(R() * 360)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
        } else {
            out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(1)}" fill="${c}"/>`;
        }
    }
    return out;
}

export const MARIGOLD = ["#f5a623", "#fbbf3d", "#e58f12", "#f7b733"];
const PINKS = ["#f08ab4", "#f7b6cf", "#e0679a", "#ffffff"];
const MIX = [...MARIGOLD, ...PINKS, "#fffaf0"];

/** Floral arch with fairy lights (scene 2). The wooden bench + couple is real artwork on top. */
export function arch() {
    return `<svg class="arch" viewBox="0 0 240 190" overflow="visible" aria-hidden="true">
  <path d="M30 176 L30 70 Q30 8 120 8 Q210 8 210 70 L210 176" fill="none" stroke="#b08a5a" stroke-width="5"/>
  <g>${flowerString([30, 176], [14, 100], [34, 54], 16, MIX, 4.2, 21)}${flowerString([34, 54], [60, 6], [120, 8], 14, MIX, 4.4, 22)}${flowerString([120, 8], [180, 6], [206, 54], 14, MIX, 4.4, 23)}${flowerString([206, 54], [226, 100], [210, 176], 16, MIX, 4.2, 24)}</g>
  <g class="twinkle">${flowerString([40, 70], [60, 28], [120, 22], 12, ["#fff3c2"], 1.6, 31)}${flowerString([120, 22], [180, 28], [200, 70], 12, ["#fff3c2"], 1.6, 32)}</g>
  <g>${flowerString([40, 176], [120, 190], [200, 176], 18, MIX, 3.6, 41)}</g>
</svg>`;
}

export function mandap() {
    const pil = (x) => `<rect x="${x}" y="70" width="14" height="260" fill="#f0e2c4" stroke="#c9a24f" stroke-width="1.5"/>
  ${flowerString([x + 7, 80], [x + 20, 200], [x + 7, 326], 22, MIX, 5.2, x)}${flowerString([x + 7, 80], [x - 6, 200], [x + 7, 326], 22, MARIGOLD, 4.6, x + 1)}`;
    let strings = "";
    for (let i = 0; i < 9; i++) {
        const x = 70 + i * 20;
        strings += flowerString([x, 74], [x + 3, 100 + (i % 3) * 14], [x, 126 + (i % 3) * 22], 7, i % 2 ? MARIGOLD : ["#fffaf0", "#f7b6cf"], 3.4, 60 + i);
    }
    return `<svg class="mandap" viewBox="0 0 300 360" overflow="visible" aria-hidden="true">
  <ellipse cx="150" cy="338" rx="150" ry="20" fill="#f3e6c9"/><ellipse cx="150" cy="338" rx="150" ry="20" fill="none" stroke="#d7b46a" stroke-width="2"/>
  ${pil(34)}${pil(252)}
  <path d="M20 74 Q150 30 280 74 L280 86 Q150 44 20 86Z" fill="#e9b44c"/><path d="M20 74 Q150 30 280 74" fill="none" stroke="#b08d4f" stroke-width="2"/>
  <g>${flowerString([20, 80], [150, 38], [280, 80], 34, MIX, 5.4, 5)}</g>
  <g>${strings}</g>
  <g class="twinkle" fill="#fff3c2">${flowerString([30, 96], [150, 60], [270, 96], 26, ["#fff3c2"], 1.8, 71)}</g>
  <g>${flowerString([60, 330], [150, 320], [240, 330], 26, ["#e0679a", "#c0262d", "#f7b6cf"], 4, 81)}</g>
</svg>`;
}

/** Painted umbrella (planted: pole bottom is the SVG bottom edge). */
export function umbrella(main = "#f2a7c3", alt = "#fff4f0", id = "u") {
    let ribs = "", fringe = "";
    for (let i = 0; i <= 8; i++) {
        const x = 10 + i * 12.5;
        ribs += `<path d="M60 14 Q${x} 44 ${x} 70" stroke="#b07a8e" stroke-width=".8" fill="none" opacity=".6"/>`;
        fringe += `<path d="M${x} 70 L${x} ${78 + (i % 2) * 4}" stroke="#d9a441" stroke-width="1"/><circle cx="${x}" cy="${80 + (i % 2) * 4}" r="2.1" fill="#d9a441"/>`;
    }
    return `<svg class="umbrella" viewBox="0 0 120 190" overflow="visible" aria-hidden="true">
  <defs><radialGradient id="ug-${id}" cx=".5" cy=".2" r=".9"><stop offset="0" stop-color="${alt}"/><stop offset="1" stop-color="${main}"/></radialGradient></defs>
  <path d="M60 4 L60 14" stroke="#d9a441" stroke-width="3"/>
  <path d="M6 70 Q10 14 60 12 Q110 14 114 70 Q101 62 87 70 Q73 62 60 70 Q47 62 33 70 Q19 62 6 70Z" fill="url(#ug-${id})" stroke="#c08aa0" stroke-width=".8"/>
  ${ribs}${fringe}
  <path d="M60 70 L60 188" stroke="#b9873f" stroke-width="3.2"/></svg>`;
}

export function mapIllustration() {
    return `<svg class="map-ill" viewBox="0 0 300 150" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
  <rect width="300" height="150" fill="#f4eadb"/>
  <path d="M170 0 Q150 40 185 70 Q215 98 190 150 L300 150 L300 0Z" fill="#cfe4ee"/>
  <path d="M170 0 Q150 40 185 70 Q215 98 190 150" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="6 5"/>
  <g stroke="#e5d6bd" stroke-width="5" fill="none"><path d="M0 100 L170 78"/><path d="M60 0 L100 150"/><path d="M0 40 L150 30"/><path d="M120 0 L130 150"/></g>
  <g stroke="#fff" stroke-width="2" fill="none"><path d="M0 100 L170 78"/><path d="M60 0 L100 150"/></g>
  <g class="pin"><path d="M118 70 Q98 44 118 24 Q138 44 118 70Z" fill="#c0262d"/><circle cx="118" cy="40" r="6" fill="#fff"/></g>
</svg>`;
}

/** Footprints: n steps, a shoe print for the groom and one for the bride each (positioned by main.js to match the walk). */
export function footprints(n = 8) {
    return '<i class="fp g"></i><i class="fp b"></i>'.repeat(n);
}
