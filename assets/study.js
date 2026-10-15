// The app's teaching models on the web. Mirrors Sources/NoteCore/StudyScenes.swift and StudyStage.swift:
// same values, curves, words and snapping, rendered from the same Cycles frames (every second frame).
(() => {
  "use strict";
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const de = (v, d = 1) => v.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const ease = t => { t = Math.min(1, Math.max(0, t)); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const pad = n => String(n).padStart(2, "0");
  const range = (a, b, s = 1) => { const out = []; for (let v = a; v <= b + 1e-9; v += s) out.push(v); return out; };
  const tick = (value, label = null) => ({ value, label });

  // Sun study: NOAA approximation for Zürich, 20 March, MEZ.
  const Sun = {
    lat: 47.37, lon: 8.54, tz: 1, day: 79,
    position(minutes) {
      const hour = minutes / 60;
      const g = 2 * Math.PI / 365 * (this.day - 1 + (hour - 12) / 24);
      const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
      const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
        + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
      const ha = ((minutes + eq + 4 * this.lon - 60 * this.tz) / 4 - 180) * Math.PI / 180;
      const lat = this.lat * Math.PI / 180;
      const cz = Math.max(-1, Math.min(1, Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha)));
      const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)) * 180 / Math.PI + 180;
      return { altitude: 90 - Math.acos(cz) * 180 / Math.PI, azimuth: az % 360 };
    },
    clock(m) { const v = Math.round(m); return pad(Math.floor(v / 60)) + ":" + pad(v % 60); },
    phase(m) {
      const a = this.position(m).altitude, morning = m < 12.5 * 60;
      if (a < -6) return "Nacht";
      if (a < 0) return morning ? "Morgendämmerung" : "Blaue Stunde";
      if (a < 12) return morning ? "Morgenlicht" : "Abendlicht";
      if (a < 39) return morning ? "Vormittag" : "Nachmittag";
      return "Mittagssonne";
    },
    now() { const d = new Date(); return Math.min(1260, Math.max(360, d.getHours() * 60 + d.getMinutes())); }
  };

  const Heart = {
    ecg(t) {
      const w = (c, s) => Math.exp(-Math.pow((t - c) / s, 2));
      return 0.13 * w(0.08, 0.022) - 0.1 * w(0.172, 0.007) + 1.0 * w(0.2, 0.009) - 0.24 * w(0.222, 0.008) + 0.27 * w(0.44, 0.042);
    },
    phase: t => t < .08 ? "Füllungsphase" : t < .2 ? "Vorhofkontraktion" : t < .25 ? "Anspannungsphase" : t < .48 ? "Austreibungsphase" : t < .56 ? "Entspannungsphase" : "Füllungsphase",
    segment: t => t < .04 ? "GRUNDLINIE" : t < .12 ? "P-WELLE" : t < .165 ? "PQ-STRECKE" : t < .235 ? "QRS-KOMPLEX" : t < .38 ? "ST-STRECKE" : t < .52 ? "T-WELLE" : "GRUNDLINIE"
  };

  const Bean = {
    cm: 10 / 1.95,
    logistic: (d, mid, rate, top) => top / (1 + Math.exp(-rate * (d - mid))) - top / (1 + Math.exp(rate * mid)),
    root(d) { return d > 1.8 ? Math.max(0, this.logistic(d, 6.0, 0.62, 1.12)) * this.cm : 0; },
    shoot(d) { return d > 3.2 ? Math.max(0, this.logistic(d, 8.2, 0.55, 2.35)) * this.cm : 0; },
    phase: d => d < 1.8 ? "Quellung" : d < 3.2 ? "Keimwurzel bricht durch" : d < 7.4 ? "Spross wächst im Haken" : d < 9.2 ? "Haken streckt sich" : "Primärblätter entfalten sich"
  };

  const Gear = {
    ratio: 1 + 48 / 12,
    stages: e => [ease(e / .48), ease((e - .26) / .46), ease((e - .52) / .46)],
    phase: e => e < .02 ? "Montiert" : e < .48 ? "Planetenträger löst sich" : e < .72 ? "Planeten kommen frei" : e < .98 ? "Sonnenrad kommt frei" : "Explosionsansicht"
  };

  const Money = {
    capital: y => 10000 * Math.pow(1.07, y),
    doubling: Math.log(2) / Math.log(1.07),
    euros: v => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(v)
  };

  const Law = {
    steps: ["Obersatz", "Definition", "Subsumtion", "Ergebnis"],
    tasks: ["HYPOTHESE", "MERKMALE BESTIMMEN", "SACHVERHALT ZUORDNEN", "HYPOTHESE BEANTWORTEN"],
    step: p => Math.min(3, Math.max(0, Math.floor(p * 4 + 1e-9))),
    angle(p) {
      const damped = (start, from, to, dur) => {
        if (p < start) return from;
        const x = Math.min(1, (p - start) / dur) * 6.5;
        return from + (to - from) * (1 - Math.exp(-0.9 * x) * (Math.cos(2.2 * x) + 0.41 * Math.sin(2.2 * x)));
      };
      const k = 5.5;
      let a = damped(0.27, 0, -k, 0.36);
      if (p >= 0.5) a = damped(0.5, -k, -k * 0.15, 0.22);
      if (p >= 0.6) a = damped(0.6, -k * 0.15, k * 1.3, 0.4);
      return a;
    }
  };

  const Reading = {
    chapters: ["Einleitung", "These", "Antithese", "Synthese"],
    chapter: p => Math.min(3, Math.max(0, Math.floor(p * 4 + 1e-9))),
    turn(p) { const q = p >= 1 ? 1 : p * 4 - this.chapter(p); return ease((q - .12) / .76); },
    page: p => 12 + Math.round(p * 220)
  };

  const numbered = (prefix, count) => k => `${prefix}-${String(Math.min(count - 1, k * 2)).padStart(3, "0")}`;

  const SCENES = {
    sun: {
      label: "Sonnenstudie des Pavillons", legend: "SONNENSTUDIE · 47° N · 20. MÄRZ", hint: "Ziehen verschiebt die Tageszeit",
      lower: 360, upper: 1260, frames: 61, file: k => { const m = 360 + k * 30; return `sunstudy-${pad(Math.floor(m / 60))}${pad(m % 60)}`; },
      primary: m => Sun.clock(m), phase: m => Sun.phase(m),
      detail(m) {
        const p = Sun.position(m);
        if (Math.abs(p.altitude) < .5) return `SONNE AM HORIZONT · AZIMUT ${Math.round(p.azimuth)}°`;
        if (p.altitude > 0) return `HÖHE ${Math.round(p.altitude)}° · AZIMUT ${Math.round(p.azimuth)}°`;
        return `SONNE ${Math.round(-p.altitude)}° UNTER DEM HORIZONT`;
      },
      curve(m) { const a = Sun.position(m).altitude; return (a < 0 ? a * .35 : a) / 42.6; },
      ticks: range(360, 1260, 60).map(m => tick(m, (m / 60) % 3 === 0 ? pad(m / 60) : null)),
      baseline: .31, amplitude: .234, page: 60, light: m => Math.max(0, Math.min(1, (Sun.position(m).altitude + 3) / 6)),
      rest: () => Sun.now(), clock: true, intro: 1.9
    },
    heart: {
      label: "Herzmodell im Herzzyklus", legend: "HERZZYKLUS · 75/MIN · EKG II", hint: "Ziehen bewegt den Herzzyklus",
      lower: 0, upper: .8, frames: 49, file: numbered("heart", 49),
      primary: t => de(t, 2) + " s", phase: Heart.phase,
      detail: t => (t >= .2 && t < .48 ? "SYSTOLE" : "DIASTOLE") + " · EKG " + Heart.segment(t),
      curve: Heart.ecg, ticks: range(0, 8).map(i => tick(i / 10, i % 2 === 0 ? de(i / 10) : null)),
      baseline: .25, amplitude: .17, page: .1, rest: () => .32, intro: 1.6
    },
    germination: {
      label: "Keimende Feuerbohne im Glas", legend: "KEIMUNGSSTUDIE · FEUERBOHNE", hint: "Ziehen lässt die Bohne keimen",
      lower: 0, upper: 14, frames: 61, file: numbered("germination", 61),
      primary: d => `Tag ${Math.floor(d + .001)}`, phase: Bean.phase,
      detail: d => `SPROSS ${de(Bean.shoot(d))} CM · WURZEL ${de(Bean.root(d))} CM`,
      curve: d => Bean.shoot(d) / Bean.shoot(14), ticks: range(0, 14).map(d => tick(d, d % 7 === 0 ? String(d) : null)),
      baseline: .17, amplitude: .13, page: 1, rest: () => 14, intro: 2.2
    },
    hyperboloid: {
      label: "Fadenmodell einer Regelfläche", legend: "REGELFLÄCHE · 48 GERADE FÄDEN", hint: "Ziehen verdreht die Fäden",
      lower: 0, upper: 180, frames: 61, file: numbered("hyperboloid", 61),
      primary: t => `${Math.round(t)}°`, phase: t => t < 1 ? "Zylinder" : t > 179 ? "Doppelkegel" : "Einschaliges Hyperboloid",
      detail: t => `TAILLE r = R · cos(θ/2) = ${de(Math.cos(t * Math.PI / 360), 2)} R`,
      curve: t => Math.cos(t * Math.PI / 360), ticks: range(0, 180, 15).map(t => tick(t, t % 45 === 0 ? `${t}°` : null)),
      baseline: .3, amplitude: .2, page: 15, rest: () => 120, intro: 1.8
    },
    gearbox: {
      label: "Planetengetriebe in der Explosionsansicht", legend: "PLANETENGETRIEBE · i = 5 : 1", hint: "Ziehen zerlegt das Getriebe",
      lower: 0, upper: 1, frames: 61, file: numbered("gearbox", 61),
      primary: e => `${Math.round(e * 100)} %`, phase: Gear.phase,
      detail: e => { const input = 150 * e; return `ANTRIEB ${Math.round(input)}° · ABTRIEB ${Math.round(input / Gear.ratio)}°`; },
      curve: e => Gear.stages(e).reduce((a, b) => a + b, 0) / 3,
      ticks: [tick(0, "MONTIERT"), ...range(1, 9).map(i => tick(i / 10)), tick(.48, "TRÄGER"), tick(.72, "PLANETEN"), tick(1, "SONNE")],
      baseline: .22, amplitude: .14, page: .1, rest: () => .75, intro: 2.0
    },
    compound: {
      label: "Münzstapel als Zinseszinsdiagramm", legend: "ZINSESZINS · 7 % · START 10.000 €", hint: "Ziehen lässt die Jahre vergehen",
      lower: 0, upper: 30, frames: 61, file: numbered("compound", 61),
      primary: y => `Jahr ${Math.floor(y + .001)}`, phase: y => Money.euros(Money.capital(y)),
      detail: y => `× ${de(Money.capital(y) / 10000, 2)} · VERDOPPELT IN ${de(Money.doubling)} J.`,
      curve: y => (y === 0 ? 0 : Money.capital(y) - 10000) / (Money.capital(30) - 10000),
      ticks: [...range(0, 30, 3).map(y => tick(y)), ...range(0, 30, 10).map(y => tick(y, String(y)))],
      baseline: .31, amplitude: .22, page: 3, rest: () => 30, intro: 2.2
    },
    balance: {
      label: "Balkenwaage im Gutachtenstil", legend: "GUTACHTENSTIL · ABWÄGUNG", hint: "Ziehen führt durch das Gutachten",
      lower: 0, upper: 1, frames: 61, file: numbered("balance", 61),
      primary: p => `${Law.step(p) + 1}/4`, phase: p => Law.steps[Law.step(p)],
      detail(p) {
        const a = Law.angle(p);
        const tilt = Math.abs(a) < .5 ? "GLEICHGEWICHT" : `${Math.round(Math.abs(a))}° ${a > 0 ? "RECHTS" : "LINKS"}`;
        return Law.tasks[Law.step(p)] + " · " + tilt;
      },
      curve: p => Law.angle(p) / 10,
      ticks: [...range(0, 20).map(i => tick(i / 20)), ...Law.steps.map((s, i) => tick(i / 4, s.toUpperCase()))],
      baseline: .2, amplitude: .1, page: .25, rest: () => 1, intro: 2.4
    },
    book: {
      label: "Aufgeschlagenes Buch, dessen Seiten sich wenden", legend: "LESESTUDIE · DIALEKTIK", hint: "Ziehen blättert durch das Argument",
      lower: 0, upper: 1, frames: 61, file: numbered("book", 61),
      primary: p => `S. ${Reading.page(p)}`, phase: p => Reading.chapters[Reading.chapter(p)],
      detail: p => `KAPITEL ${Reading.chapter(p) + 1} VON 4 · ${Math.round(p * 100)} % GELESEN`,
      curve: p => Math.sin(Math.PI * Reading.turn(p)),
      ticks: [...range(0, 20).map(i => tick(i / 20)), ...Reading.chapters.map((c, i) => tick(i / 4, c.toUpperCase()))],
      baseline: .27, amplitude: .15, page: .25, rest: () => .35, intro: 1.8
    }
  };
  for (const s of Object.values(SCENES)) {
    s.step = (s.upper - s.lower) / (s.frames - 1);
    s.count = Math.floor((s.frames - 1) / 2) + 1;   // shipped frames: every second render
    s.light = s.light || (() => 1);
    s.clamp = v => Math.min(s.upper, Math.max(s.lower, v));
    s.snap = v => s.clamp(s.lower + Math.round((v - s.lower) / s.step) * s.step);
  }

  const DISCIPLINES = {
    architecture: { scene: "sun", eyebrow: "DEIN STUDIENATELIER", title: "Gute Ideen\nbrauchen Raum.", sub: "Gedanken sammeln. Zusammenhänge zeichnen. Etwas Eigenes entwerfen." },
    medicine: { scene: "heart", eyebrow: "DEINE LEHRKLINIK", title: "Genau hinsehen.\nRuhig verstehen.", sub: "Anatomie, Fälle und Vorlesungen an einem Ort. Klar gegliedert wie ein guter Befund." },
    life: { scene: "germination", eyebrow: "DEIN LABOR", title: "Alles Lebendige\nbeginnt klein.", sub: "Beobachten, protokollieren, Muster erkennen. Vom ersten Keim bis zur eigenen Hypothese." },
    formal: { scene: "hyperboloid", eyebrow: "DEIN MODELLKABINETT", title: "Aus geraden Linien\nwird eine Kurve.", sub: "Definitionen, Beweise und Herleitungen, Schritt für Schritt bis zur Struktur dahinter." },
    engineering: { scene: "gearbox", eyebrow: "DEINE WERKSTATT", title: "Verstehen, wie\nes ineinandergreift.", sub: "Konstruieren, berechnen, debuggen. Jedes Teil an seinem Platz, jede Annahme nachvollziehbar." },
    economics: { scene: "compound", eyebrow: "DEIN KONTOR", title: "Kleine Schritte,\ngroße Wirkung.", sub: "Modelle, Kennzahlen und Fallstudien, die sich mit jedem Semester verzinsen." },
    law: { scene: "balance", eyebrow: "DEINE KANZLEI", title: "Erst abwägen,\ndann entscheiden.", sub: "Normen, Fälle und Gutachten sauber gegliedert, vom Obersatz bis zum Ergebnis." },
    humanities: { scene: "book", eyebrow: "DEIN LESESAAL", title: "Jeder Gedanke\nhat eine Geschichte.", sub: "Lesen, exzerpieren, argumentieren. Quellen und eigene Stimme an einem Ort." }
  };

  const stage = document.querySelector("[data-stage]");
  if (!stage) return;
  const base = stage.dataset.frames;
  const canvas = stage.querySelector("canvas");
  const fallback = stage.querySelector("img.frame");
  const svg = stage.querySelector("svg");
  const ctx = canvas.getContext("2d");
  const out = {
    legend: document.querySelector("[data-legend]"), primary: document.querySelector("[data-primary]"),
    phase: document.querySelector("[data-phase]"), detail: document.querySelector("[data-detail]"),
    rest: document.querySelector("[data-rest]"), hint: document.querySelector("[data-hint]")
  };
  const NS = "http://www.w3.org/2000/svg";
  const el = (name, attrs = {}) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) {
      const v = attrs[k];
      if (typeof v === "string" && v.startsWith("var(")) n.style.setProperty(k, v); else n.setAttribute(k, v);
    }
    return n;
  };
  const layers = { back: el("g", { class: "chart" }), travelled: el("path", { fill: "none", "stroke-linecap": "round" }), marker: el("g"), ghost: el("g") };
  svg.append(layers.back, layers.travelled, layers.marker, layers.ghost);

  const cache = {};
  let scene = SCENES.sun, value = Sun.now(), size = { w: 0, h: 0 }, tween = null, drag = null, hover = null, token = 0;

  function frames(s) {
    if (cache[s.file(0)]) return cache[s.file(0)];
    const list = Array.from({ length: s.count }, (_, k) => {
      const img = new Image();
      img.decoding = "async";
      img.dataset.src = `${base}${s.file(k)}.webp`;
      return img;
    });
    return (cache[s.file(0)] = list);
  }
  function load(s, first) {
    const list = frames(s);
    const order = [...list.keys()].sort((a, b) => Math.abs(a - first) - Math.abs(b - first));
    // Wait for load or error, never for decode(): a rejected decode after the image already loaded
    // would leave the promise pending forever. The timeout keeps the intro from waiting on a slow network.
    const settled = img => new Promise(done => {
      if (img.complete && img.naturalWidth) return done();
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
    const all = Promise.all(order.map(k => {
      const img = list[k];
      if (!img.src) img.src = img.dataset.src;
      return settled(img);
    }));
    return Promise.race([all, new Promise(done => setTimeout(done, 4000))]);
  }
  const ready = img => img && img.complete && img.naturalWidth > 0;

  const geo = {
    left: () => size.w * .07, right: () => size.w * .93,
    base: () => size.h * scene.baseline,
    x: v => geo.left() + (v - scene.lower) / (scene.upper - scene.lower) * (geo.right() - geo.left()),
    y: v => geo.base() - scene.curve(v) * scene.amplitude * size.h,
    at: x => scene.clamp(scene.lower + (x - geo.left()) / (geo.right() - geo.left()) * (scene.upper - scene.lower)),
    path(a, b) {
      const inc = (scene.upper - scene.lower) / 360; let v = a, d = `M${geo.x(v).toFixed(1)} ${geo.y(v).toFixed(1)}`;
      while (v < b) { v = Math.min(b, v + inc); d += `L${geo.x(v).toFixed(1)} ${geo.y(v).toFixed(1)}`; }
      return d;
    }
  };

  function drawBack() {
    layers.back.replaceChildren();
    if (!size.w) return;
    const muted = "var(--muted)";
    let lowest = 0;
    for (let i = 0; i <= 120; i++) lowest = Math.min(lowest, scene.curve(scene.lower + (scene.upper - scene.lower) * i / 120));
    const labelY = geo.base() + Math.max(13, -lowest * scene.amplitude * size.h + 10);
    layers.back.append(el("line", { x1: geo.left() - 8, x2: geo.right() + 8, y1: geo.base(), y2: geo.base(), stroke: muted, "stroke-opacity": .35, "stroke-width": .75 }));
    for (const t of scene.ticks) {
      const x = geo.x(t.value), major = t.label != null;
      layers.back.append(el("line", { x1: x, x2: x, y1: geo.base() - (major ? 5 : 3), y2: geo.base() + (major ? 5 : 3), stroke: muted, "stroke-opacity": major ? .6 : .35, "stroke-width": .75 }));
      if (major) {
        const anchor = t.value <= scene.lower ? "start" : t.value >= scene.upper ? "end" : "middle";
        const text = el("text", { x, y: labelY, "text-anchor": anchor, "dominant-baseline": "middle", "fill-opacity": .8 });
        text.textContent = t.label; layers.back.append(text);
      }
    }
    layers.back.append(el("path", { d: geo.path(scene.lower, scene.upper), fill: "none", stroke: muted, "stroke-opacity": .4, "stroke-width": 1, "stroke-linecap": "round", "stroke-dasharray": "2 4" }));
  }

  function drawFrame(v) {
    const list = frames(scene);
    const p = (scene.clamp(v) - scene.lower) / (scene.upper - scene.lower) * (scene.count - 1);
    let i0 = Math.floor(p), i1 = Math.min(scene.count - 1, i0 + 1), f = p - i0;
    if (!ready(list[i0])) { const near = nearestReady(list, p); if (near < 0) return false; i0 = i1 = near; f = 0; }
    if (!ready(list[i1])) { i1 = i0; f = 0; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1; ctx.drawImage(list[i0], 0, 0, canvas.width, canvas.height);
    if (f > .01 && i1 !== i0) { ctx.globalAlpha = f; ctx.drawImage(list[i1], 0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
    return true;
  }
  function nearestReady(list, p) {
    let best = -1, dist = Infinity;
    list.forEach((img, k) => { if (ready(img) && Math.abs(k - p) < dist) { dist = Math.abs(k - p); best = k; } });
    return best;
  }

  function render() {
    if (drawFrame(value)) { canvas.hidden = false; if (fallback) fallback.hidden = true; }
    if (size.w) {
      layers.travelled.setAttribute("d", geo.path(scene.lower, value));
      layers.travelled.style.stroke = "var(--signal)"; layers.travelled.setAttribute("stroke-opacity", .8); layers.travelled.setAttribute("stroke-width", 1.5);
      const x = geo.x(value), y = geo.y(value), light = scene.light(value);
      layers.marker.replaceChildren(
        el("circle", { cx: x, cy: y, r: 26, fill: "url(#glow)", opacity: .32 * light }),
        el("circle", { cx: x, cy: y, r: 6.5, fill: "var(--hero)", stroke: "var(--muted)", "stroke-width": 1.5, opacity: 1 - light }),
        el("circle", { cx: x, cy: y, r: 6.5, fill: "none", stroke: "var(--signal)", "stroke-width": 2, opacity: light }),
        el("circle", { cx: x, cy: y, r: 3, fill: "var(--signal)", opacity: light })
      );
      layers.ghost.replaceChildren();
      if (hover != null && !drag && !tween) {
        const gx = geo.x(hover), gy = geo.y(hover), label = el("text", { x: gx, y: gy - 16, "text-anchor": "middle", fill: "var(--accent)", style: "font: 500 10px var(--mono)" });
        label.textContent = scene.primary(hover);
        layers.ghost.append(el("circle", { cx: gx, cy: gy, r: 7, fill: "none", stroke: "var(--accent)", "stroke-opacity": .6, "stroke-dasharray": "2 2" }), label);
      }
    }
    const primary = scene.primary(value), phase = scene.phase(value);
    out.primary.textContent = primary; out.phase.textContent = phase; out.detail.textContent = scene.detail(value);
    stage.setAttribute("aria-valuenow", value.toFixed(3));
    stage.setAttribute("aria-valuetext", `${primary}, ${phase}`);
    const away = Math.abs(value - scene.rest()) > scene.step / 2;
    out.rest.classList.toggle("on", away && !tween && !drag);
  }

  function animate(to, duration, from = value) {
    const t = ++token;
    if (reduceMotion.matches || duration <= 0) { tween = null; value = to; render(); return; }
    const start = performance.now();
    tween = { to };
    const step = now => {
      if (t !== token) return;
      const k = Math.min(1, (now - start) / (duration * 1000));
      value = from + (to - from) * ease(k);
      if (k >= 1) tween = null;
      render();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const stop = () => { token++; tween = null; };

  function resize() {
    const r = stage.getBoundingClientRect();
    size = { w: r.width, h: r.height };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    svg.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
    drawBack(); render();
  }

  async function show(id, { intro = true, swap = false } = {}) {
    const next = SCENES[id]; if (!next) return;
    if (fallback && id !== "sun") fallback.hidden = true;
    stop(); scene = next;
    const rest = scene.rest();
    value = intro && !reduceMotion.matches ? scene.lower : rest;
    stage.setAttribute("aria-label", scene.label);
    stage.setAttribute("aria-valuemin", scene.lower); stage.setAttribute("aria-valuemax", scene.upper);
    out.legend.textContent = scene.legend; if (out.hint) out.hint.textContent = scene.hint;
    out.rest.querySelector("span").textContent = scene.clock ? "Jetzt" : "Zurücksetzen";
    if (swap) { stage.classList.remove("swap"); void stage.offsetWidth; stage.classList.add("swap"); }
    drawBack();
    const restIndex = Math.round((rest - scene.lower) / (scene.upper - scene.lower) * (scene.count - 1));
    stage.dataset.loading = "1";
    const mine = scene;
    load(scene, intro ? 0 : restIndex).then(() => {
      if (mine !== scene) return;
      stage.dataset.loading = "0";
      if (intro) animate(rest, scene.intro, scene.lower); else render();
    });
    render();
  }

  // Pointer: horizontal drags scrub (relative, like the app), a tap jumps, release snaps to a frame.
  stage.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, start: value, moved: false, scrub: null };
  });
  stage.addEventListener("pointermove", e => {
    const r = stage.getBoundingClientRect();
    if (!drag || drag.id !== e.pointerId) {
      if (e.pointerType === "mouse") { hover = geo.at(e.clientX - r.left); render(); }
      return;
    }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.scrub == null && Math.hypot(dx, dy) > 6) {
      drag.scrub = Math.abs(dx) > Math.abs(dy);
      if (drag.scrub) { stop(); drag.start = value; drag.x = e.clientX; stage.setPointerCapture(e.pointerId); }
    }
    if (drag.scrub) {
      drag.moved = true; hover = null;
      value = scene.clamp(drag.start + dx * (scene.upper - scene.lower) / (geo.right() - geo.left()));
      render();
    }
  });
  const release = e => {
    if (!drag || drag.id !== e.pointerId) return;
    const r = stage.getBoundingClientRect(), d = drag; drag = null;
    if (d.moved) animate(scene.snap(value), .32);
    else if (d.scrub == null && e.type === "pointerup") animate(scene.snap(geo.at(e.clientX - r.left)), .55);
    else render();
  };
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);
  stage.addEventListener("pointerleave", () => { if (hover != null) { hover = null; render(); } });
  stage.addEventListener("keydown", e => {
    const map = { ArrowRight: scene.step, ArrowUp: scene.step, ArrowLeft: -scene.step, ArrowDown: -scene.step, PageUp: scene.page, PageDown: -scene.page };
    let to = null;
    if (e.key in map) to = scene.snap(value + map[e.key]);
    if (e.key === "Home") to = scene.lower;
    if (e.key === "End") to = scene.upper;
    if (to == null) return;
    e.preventDefault(); stop(); value = scene.clamp(to); render();
  });
  out.rest.addEventListener("click", () => animate(scene.rest(), .6));

  // Disciplines: recolour the page with the app's palette and switch the teaching model.
  const buttons = [...document.querySelectorAll("[data-discipline]")];
  const text = { eyebrow: document.querySelector("[data-eyebrow]"), title: document.querySelector("[data-title]"), sub: document.querySelector("[data-sub]") };
  const themeColor = document.querySelector('meta[name="theme-color"]');
  function choose(id, { initial = false } = {}) {
    const d = DISCIPLINES[id]; if (!d) return;
    root.dataset.d = id;
    buttons.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.discipline === id)));
    text.eyebrow.textContent = d.eyebrow; text.title.textContent = d.title; text.sub.textContent = d.sub;
    if (!initial) for (const n of Object.values(text)) { n.classList.remove("retint"); void n.offsetWidth; n.classList.add("retint"); }
    if (themeColor) requestAnimationFrame(() => themeColor.setAttribute("content", getComputedStyle(document.body).getPropertyValue("--canvas").trim()));
    try { localStorage.setItem("smoogo.discipline", id); } catch (_) {}
    show(d.scene, { intro: true, swap: !initial });
  }
  buttons.forEach(b => b.addEventListener("click", () => {
    choose(b.dataset.discipline);
    const r = stage.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight - 120) stage.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "center" });
  }));

  new ResizeObserver(resize).observe(stage);
  let saved = null;
  try { saved = localStorage.getItem("smoogo.discipline"); } catch (_) {}
  choose(DISCIPLINES[saved] ? saved : "architecture", { initial: true });
  resize();
})();
