(() => {
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lang = document.documentElement.lang;
  var hero = document.getElementById("hero");
  var timers = [];
  function later(fn, ms) {
    var t = setTimeout(fn, ms);
    timers.push(t);
    return t;
  }
  function clamp(v, a, b) {
    return v < a ? a : Math.min(v, b);
  }
  function seg(p, a, b) {
    return clamp((p - a) / (b - a), 0, 1);
  }
  function eio(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function $(id) {
    return document.getElementById(id);
  }
  /* I18N = this page's strings (key -> text), DATA = {lang: scene data}; both come from the build (content/<lang>/home-script.json).
   Every visible text is already in the HTML of /, /en/ or /de/; the script only fills the scenes. */
  function tr(key) {
    return I18N[key] || "";
  }

  /* ---------------- scene data for this language ---------------- */
  function applyLang() {
    var D = DATA[lang];
    document.querySelectorAll("#sCode .sq").forEach((s, i) => {
      s.innerHTML = D.sql[i];
    });
    $("schemaList").innerHTML = D.schema
      .map((t) => '<div class="ln"><span>' + t[0] + '</span><i class="' + t[1] + '"></i></div>')
      .join("");
    buildRows();
  }

  /* ---------------- nav, reveal ---------------- */
  var nav = $("nav");
  function onScrollNav() {
    nav.classList.toggle("solid", window.scrollY > 40);
  }
  addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();
  var io = new IntersectionObserver(
    (es) => {
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
  );
  document.querySelectorAll(".reveal").forEach((el) => {
    var sib = Array.prototype.filter.call(el.parentElement.children, (c) => c.classList.contains("reveal"));
    el.style.transitionDelay = sib.indexOf(el) * 0.07 + "s";
    io.observe(el);
  });

  /* ---------------- hero: the logo is the loader ----------------
   THINKING  open ring (38 of 57.81 units) spins, stem hidden, centre dot pulses .55–1 every .96 s
   RESOLVE   ring slows and closes (.6 s), stem draws (.35 s), dot settles 1 → 1.4 → 1 (.5 s)
   WRITE     the stem's foot draws the baseline, the number counts up, rows follow one by one
   REOPEN    stem retracts (.25 s), ring opens back into the spinning arc */
  var hs = $("hs"),
    hsBox = $("hsBox"),
    hsLogo = $("hsLogo");
  var hArc = $("hsArc"),
    hGrp = $("hsGrp"),
    hStem = $("hsStem"),
    hDot = $("hsDot"),
    hQ = $("hsQ");
  var hSt = $("hsSt").children,
    hRowEls = [];
  var CIRC = 57.81,
    OPENL = 38,
    CYCLE = 9,
    SPIN = 540;
  var hT = 0,
    hAng = 0,
    hLastQ = -1,
    running = false,
    last = 0,
    heroSeen = true;
  var geo = { s: 1, k: 1, lx: 0, ly: 0 };
  function eo(t) {
    return 1 - (1 - t) ** 3;
  }
  function buildRows() {
    var H = DATA[lang].hero;
    for (var i = 0; i < 3; i++) hSt[i].textContent = H.st[i] + " …";
    hLastQ = -1;
    if (!running) hStep(0);
  }
  function layout() {
    var w = hsBox.parentNode.clientWidth,
      dw = hs.offsetWidth,
      dh = hs.offsetHeight;
    var sc = Math.min(1.2, w / dw);
    geo.s = sc;
    hs.style.transform = "scale(" + sc.toFixed(4) + ")";
    hsBox.style.width = dw * sc + "px";
    hsBox.style.height = dh * sc + "px";
    var lr = hsLogo.getBoundingClientRect(),
      hr = hero.getBoundingClientRect();
    geo.k = lr.width / 40;
    geo.lx = lr.left + 16.5 * geo.k;
    geo.ly = lr.top + 15.5 * geo.k;
    hero.style.setProperty("--gx", ((geo.lx - hr.left) / hr.width) * 100 + "%");
    hero.style.setProperty("--gy", ((geo.ly - hr.top) / hr.height) * 100 + "%");
  }
  function paint() {}
  function hSetAnswer(it) {
    var H = DATA[lang].hero;
    $("hsCap").innerHTML = it.cap;
    $("hsRows").innerHTML = it.rows
      .map(
        (r, i) =>
          '<div class="row' +
          (i ? "" : " top") +
          '"><span>' +
          r[0] +
          "</span><span>" +
          r[1] +
          '</span><i data-w="' +
          r[2] +
          '"></i></div>',
      )
      .join("");
    hRowEls = [].slice.call($("hsRows").children);
    $("hsRcT").innerHTML = H.rc[0] + " <b>·</b> " + H.rc[1] + " <b>·</b> " + it.sec;
  }
  function hSpin(c) {
    if (c < 0.6) return SPIN * eio(seg(c, 0.1, 0.6));
    if (c < 3.4) return SPIN;
    if (c < 4.0) return SPIN * (1 - eo(seg(c, 3.4, 4.0)));
    return 0;
  }
  function hStep(dt) {
    hT += dt;
    var Q = DATA[lang].hero.Q,
      qi = Math.floor(hT / CYCLE),
      c = hT - qi * CYCLE,
      it = Q[qi % Q.length];
    if (qi !== hLastQ) {
      hLastQ = qi;
      hSetAnswer(it);
    }
    var out = c < 8.5 ? 1 : 1 - eio(seg(c, 8.5, 8.85));
    hAng = (hAng + hSpin(c) * dt) % 360;
    hGrp.setAttribute("transform", "rotate(" + hAng.toFixed(2) + " 16.5 15.5)");
    var close = c < 3.4 ? 1 - eio(seg(c, 0.12, 0.62)) : eio(seg(c, 3.4, 4.0));
    var len = lerp(OPENL, CIRC, close);
    hArc.setAttribute("stroke-dasharray", len.toFixed(3) + " " + (CIRC - len + 0.001).toFixed(3));
    var stv = c < 3.4 ? 1 - eio(seg(c, 0, 0.25)) : eo(seg(c, 3.9, 4.25));
    hStem.setAttribute("stroke-dasharray", "20 20");
    hStem.setAttribute("stroke-dashoffset", (20 * (1 - stv)).toFixed(2));
    hStem.style.visibility = stv < 0.005 ? "hidden" : "visible";
    var d;
    if (c >= 3.9 && c < 4.5) {
      var k = seg(c, 4.0, 4.5);
      d = k < 0.55 ? lerp(1, 1.4, eo(k / 0.55)) : lerp(1.4, 1, eio((k - 0.55) / 0.45));
    } else if (c >= 4.5 || c < 0.2) {
      d = 1;
    } else {
      var ph = (hT % 0.96) / 0.96;
      d = lerp(0.55, 1, (1 - Math.cos(ph * Math.PI * 2)) / 2);
      if (c < 0.45) d = lerp(1, d, seg(c, 0.2, 0.45));
      if (c > 3.6) d = lerp(d, 1, seg(c, 3.6, 3.9));
    }
    hDot.setAttribute("r", (3.4 * d).toFixed(3));
    hDot.setAttribute("opacity", c < 3.6 && c > 0.3 ? (0.6 + 0.4 * d).toFixed(2) : 1);
    var n = Math.min(it.q.length, Math.floor(seg(c, 0.3, 1.5) * it.q.length));
    hQ.textContent = c < 0.12 ? "" : it.q.slice(0, n);
    $("hsCr").style.opacity = c < 1.7 ? (Math.floor(hT * 2) % 2 ? 0 : 1) : 0;
    var qo = c < 0.3 ? seg(c, 0.12, 0.3) : out;
    $("hsTxt").style.opacity = qo;
    $("hsLq").style.opacity = qo;
    $("hsProg").style.transform = "scaleX(" + (c < 8.5 ? eio(seg(c, 1.5, 3.9)) : 1).toFixed(3) + ")";
    $("hsProg").style.opacity = c < 4.6 ? 1 : c < 8.5 ? 1 - eo(seg(c, 4.6, 5.2)) : 0;
    var marks = [1.6, 2.4, 3.1, 3.95];
    for (var i = 0; i < 3; i++) {
      var a0 = seg(c, marks[i], marks[i] + 0.25),
        a1 = seg(c, marks[i + 1] - 0.2, marks[i + 1]);
      hSt[i].style.opacity = (a0 * (1 - a1)).toFixed(3);
      hSt[i].style.transform = "translateY(" + ((1 - a0) * 8 - a1 * 8).toFixed(1) + "px)";
    }
    $("hsBase").style.transform = "scaleX(" + (eo(seg(c, 4.15, 4.75)) * out).toFixed(3) + ")";
    var w = eo(seg(c, 4.3, 5.0)),
      num = $("hsNum");
    num.textContent = (it.pre || "") + Math.round(it.n * w) + (it.suf || "");
    num.style.opacity = (seg(c, 4.3, 4.5) * out).toFixed(3);
    num.style.transform = "translateY(" + ((1 - eo(seg(c, 4.3, 4.8))) * 10).toFixed(1) + "px)";
    $("hsCap").style.opacity = (seg(c, 4.75, 5.05) * out).toFixed(3);
    hRowEls.forEach((r, j) => {
      var t0 = 4.7 + j * 0.11,
        o = seg(c, t0, t0 + 0.3);
      r.style.opacity = (o * out).toFixed(3);
      r.style.transform = "translateX(" + ((1 - eo(o)) * 10).toFixed(1) + "px)";
      var bar = r.lastChild;
      bar.style.transform =
        "scaleX(" + (parseFloat(bar.getAttribute("data-w")) * eo(seg(c, t0 + 0.1, t0 + 0.75))).toFixed(3) + ")";
    });
    $("hsRc").style.opacity = (seg(c, 5.3, 5.7) * out).toFixed(3);
    hero.classList.toggle("locked", c >= 4.3 && c < 8.5);
  }
  function frame(t) {
    if (!running) return;
    var dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    if (heroSeen) hStep(dt);
    requestAnimationFrame(frame);
  }
  function staticHero() {
    running = false;
    hero.classList.add("static");
    hT = 6.5;
    hLastQ = -1;
    hStep(0);
  }
  function startHero() {
    layout();
    hero.classList.add("ready");
    if (reduce) {
      staticHero();
      return;
    }
    hT = 0;
    hLastQ = -1;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }
  new IntersectionObserver(
    (es) => {
      heroSeen = es[0].isIntersecting;
    },
    { threshold: 0 },
  ).observe(hero);

  /* ---------------- intro: the logo flies to its place in the hero (vector every frame, no bitmap scaling) ---------------- */
  var MARK =
    '<g class="lq-group"><circle class="lq-arc" cx="16.5" cy="15.5" r="9.2" fill="none" stroke="#5A48F5" stroke-width="4.6" stroke-linecap="round" transform="rotate(-90 16.5 15.5)"/></g><path class="lq-stem" d="M25.7 15.5v20" stroke="#5A48F5" stroke-width="4.6" stroke-linecap="round"/><circle class="lq-dot" cx="16.5" cy="15.5" r="3.4" fill="#0E0C24"/>';
  var introEl = null,
    rafZoom = 0,
    introPrev = null;
  function onKey(e) {
    if (e.key === "Escape") endIntro();
  }
  /* while the intro plays, the page behind it is inert; the overlay is a labelled region whose only control is the skip button (step0 d.8) */
  function pageInert(on) {
    [].forEach.call(document.body.children, (el) => {
      if (el !== introEl && el.id !== "intro") el.inert = on;
    });
  }
  function endIntro() {
    if (!introEl) return;
    cancelAnimationFrame(rafZoom);
    var el = introEl;
    introEl = null;
    pageInert(false);
    if (el.contains(document.activeElement)) {
      if (introPrev?.isConnected && introPrev !== document.body) introPrev.focus({ preventScroll: true });
      else document.activeElement.blur();
    }
    document.body.classList.remove("intro-on");
    var zm = el.querySelector(".zoom");
    if (zm) zm.style.display = "none";
    el.classList.add("gone");
    hero.classList.remove("pre");
    setTimeout(() => {
      el.remove();
    }, 480);
    removeEventListener("keydown", onKey);
    startHero();
  }
  function playIntro() {
    timers.forEach(clearTimeout);
    timers = [];
    running = false;
    hero.classList.remove("ready", "locked", "static", "pre", "fromintro");
    hT = 0;
    hLastQ = -1;
    hStep(0);
    window.scrollTo(0, 0);
    introPrev = document.activeElement;
    introEl = document.createElement("div");
    introEl.id = "intro";
    introEl.setAttribute("role", "region");
    introEl.setAttribute("aria-label", "Loquein");
    introEl.innerHTML =
      '<div class="row" aria-hidden="true"><svg class="mark" width="112" height="112" viewBox="0 0 40 40">' +
      MARK +
      '</svg><div class="word">' +
      "loquein"
        .split("")
        .map((c, i) => '<span class="ch' + (i >= 2 && i <= 4 ? " v" : "") + '">' + c + "</span>")
        .join("") +
      '</div></div><button class="skip" type="button">' +
      tr("intro.skip") +
      "</button>";
    document.body.appendChild(introEl);
    document.body.classList.add("intro-on");
    pageInert(true);
    var skipBtn = introEl.querySelector(".skip");
    skipBtn.addEventListener("click", endIntro);
    skipBtn.focus({ preventScroll: true });
    addEventListener("keydown", onKey);
    var mark = introEl.querySelector(".mark"),
      word = introEl.querySelector(".word"),
      chars = introEl.querySelectorAll(".ch");
    var grp = mark.querySelector(".lq-group"),
      arc = mark.querySelector(".lq-arc"),
      stem = mark.querySelector(".lq-stem"),
      dot = mark.querySelector(".lq-dot");
    later(() => {
      grp.classList.add("spin");
      dot.classList.add("pulse");
    }, 40);
    chars.forEach((c, i) => {
      later(
        () => {
          c.classList.add("on");
        },
        490 + i * 120,
      );
    });
    later(() => {
      arc.classList.add("closing");
      stem.classList.add("draw");
      dot.classList.remove("pulse");
      dot.classList.add("settle");
    }, 1480);
    later(() => {
      word.classList.add("out");
    }, 2550);
    later(() => {
      morphToLens(mark);
    }, 2750);
  }
  function morphToLens(mark) {
    if (!introEl) return;
    layout();
    var W = innerWidth,
      H = innerHeight,
      r = mark.getBoundingClientRect();
    var k0 = r.width / 40,
      k1 = geo.k;
    var p0x = r.left + 16.5 * k0,
      p0y = r.top + 15.5 * k0;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "zoom");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("shape-rendering", "geometricPrecision");
    svg.innerHTML =
      '<circle cx="16.5" cy="15.5" r="9.2" fill="none" stroke="#5A48F5" stroke-width="4.6"/><path d="M25.7 15.5v20" stroke="#5A48F5" stroke-width="4.6" stroke-linecap="round"/><circle cx="16.5" cy="15.5" r="3.4" fill="#0E0C24"/>';
    introEl.appendChild(svg);
    introEl.classList.add("morphing");
    mark.style.visibility = "hidden";
    hero.classList.add("pre", "fromintro");
    function set(e) {
      var k = Math.exp(lerp(Math.log(k0), Math.log(k1), e));
      var px = lerp(p0x, geo.lx, e),
        py = lerp(p0y, geo.ly, e);
      svg.setAttribute("viewBox", 16.5 - px / k + " " + (15.5 - py / k) + " " + W / k + " " + H / k);
    }
    set(0);
    var start = 0,
      dur = 1100;
    later(() => {
      if (introEl) introEl.classList.add("see-through");
    }, 260);
    function step(t) {
      if (!introEl) return;
      if (!start) start = t;
      var p = Math.min(1, (t - start) / dur);
      set(eio(p));
      if (p < 1) rafZoom = requestAnimationFrame(step);
      else endIntro();
    }
    rafZoom = requestAnimationFrame(step);
  }
  $("replay").addEventListener("click", playIntro);

  /* ---------------- pinned stories: shared ---------------- */
  function prog(sec) {
    var r = sec.getBoundingClientRect(),
      total = sec.offsetHeight - innerHeight;
    return clamp(-r.top / total, 0, 1);
  }
  function fit(box, scene, w, h) {
    var bw = box.getBoundingClientRect().width;
    var maxH = innerWidth <= 1080 ? innerHeight - 250 : innerHeight - 120;
    var s = Math.min(bw / w, maxH / h, 1.35);
    scene.style.transform = "scale(" + s + ")";
    scene.style.left = (bw - w * s) / 2 + "px";
    box.style.height = h * s + "px";
  }
  function vis(el, o, ty, tx, sc) {
    el.style.opacity = o;
    el.style.visibility = o < 0.01 ? "hidden" : "visible";
    el.style.transform =
      "translate(" + (tx || 0) + "px," + (ty || 0) + "px)" + (sc != null ? " scale(" + sc + ")" : "");
  }
  function railNav(navEl, p, idx) {
    navEl.querySelectorAll(".sn").forEach((s, i) => {
      s.classList.toggle("on", i === idx);
      s.classList.toggle("done", i < idx);
    });
    navEl.querySelector(".rail b").style.transform = "scaleY(" + p + ")";
    navEl.parentElement.querySelector(".pctv").textContent =
      (lang === "tr" ? "%" : "") + Math.round(p * 100) + (lang === "tr" ? "" : lang === "de" ? " %" : "%");
  }

  /* ---------------- isometric drawing ---------------- */
  var C30 = 0.866;
  function P(o, X, Y, Z) {
    return [o[0] + (X - Y) * C30, o[1] + (X + Y) * 0.5 - Z];
  }
  function pts(a) {
    return a.map((q) => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ");
  }
  function org(cx, cy, w, d, h) {
    return [cx - ((w - d) / 2) * C30, cy - ((w + d) / 4 - h)];
  }
  var PAL = {
    white: { t: "#FFFFFF", l: "#EEEBFA", r: "#DDD8F4", e: "rgba(90,72,245,.20)" },
    paper: { t: "#FFFFFF", l: "#F1EEE7", r: "#E4E0D6", e: "rgba(14,12,36,.10)" },
    lav: { t: "#F7F5FF", l: "#E7E3FB", r: "#D6D0F7", e: "rgba(90,72,245,.30)" },
    violet: { t: "#8D81FF", l: "#5A48F5", r: "#4231D8", e: "rgba(255,255,255,.35)" },
    ink: { t: "#3B3766", l: "#211D47", r: "#141133", e: "rgba(255,255,255,.12)" },
    pkg: { t: "#F3F1FE", l: "#DCD6FD", r: "#C6BEFA", e: "rgba(90,72,245,.35)" },
    sunp: { t: "#FFF8F2", l: "#FFE3D0", r: "#FFD0B2", e: "rgba(255,122,47,.28)" },
    blue: { t: "#7FB2FF", l: "#2D7DF6", r: "#1E63D6", e: "rgba(255,255,255,.35)" },
  };
  function box(o, X, Y, Z, w, d, h, c, attr) {
    var A = P(o, X, Y, Z + h),
      B = P(o, X + w, Y, Z + h),
      C = P(o, X + w, Y + d, Z + h),
      D = P(o, X, Y + d, Z + h),
      E = P(o, X + w, Y + d, Z),
      F = P(o, X, Y + d, Z),
      G = P(o, X + w, Y, Z);
    return (
      "<g" +
      (attr ? " " + attr : "") +
      ">" +
      '<polygon points="' +
      pts([D, C, E, F]) +
      '" fill="' +
      c.l +
      '"/>' +
      '<polygon points="' +
      pts([C, B, G, E]) +
      '" fill="' +
      c.r +
      '"/>' +
      '<polygon points="' +
      pts([A, B, C, D]) +
      '" fill="' +
      c.t +
      '"/>' +
      '<polyline points="' +
      pts([D, A, B]) +
      '" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="1.2"/>' +
      '<polyline points="' +
      pts([D, C, B]) +
      '" fill="none" stroke="' +
      c.e +
      '" stroke-width="1"/>' +
      '<line x1="' +
      C[0].toFixed(1) +
      '" y1="' +
      C[1].toFixed(1) +
      '" x2="' +
      E[0].toFixed(1) +
      '" y2="' +
      E[1].toFixed(1) +
      '" stroke="' +
      c.e +
      '" stroke-width="1"/></g>'
    );
  }
  function wire(o, X, Y, Z, w, d, h) {
    var A = P(o, X, Y, Z + h),
      B = P(o, X + w, Y, Z + h),
      C = P(o, X + w, Y + d, Z + h),
      D = P(o, X, Y + d, Z + h),
      E = P(o, X + w, Y + d, Z),
      F = P(o, X, Y + d, Z),
      G = P(o, X + w, Y, Z);
    return (
      '<g fill="none" stroke="rgba(90,72,245,.4)" stroke-width="1.2" stroke-dasharray="4 4"><polyline points="' +
      pts([A, B, C, D, A]) +
      '"/><polyline points="' +
      pts([D, F, E, G, B]) +
      '"/><line x1="' +
      C[0] +
      '" y1="' +
      C[1] +
      '" x2="' +
      E[0] +
      '" y2="' +
      E[1] +
      '"/></g>'
    );
  }
  function shadow(o, w, d, dz, op) {
    return (
      '<polygon points="' +
      pts([P(o, 0, 0, -dz), P(o, w, 0, -dz), P(o, w, d, -dz), P(o, 0, d, -dz)]) +
      '" fill="rgba(14,12,36,' +
      (op || 0.12) +
      ')" filter="url(#isoSoft)"/>'
    );
  }
  function topM(o, X, Y, Z) {
    var q = P(o, X, Y, Z);
    return "matrix(0.866 0.5 -0.866 0.5 " + q[0].toFixed(1) + " " + q[1].toFixed(1) + ")";
  }
  function frontM(o, X, Y, Z) {
    var q = P(o, X, Y, Z);
    return "matrix(0.866 0.5 0 1 " + q[0].toFixed(1) + " " + q[1].toFixed(1) + ")";
  }
  function cyl(o, X, Y, Z, r, h, attr, bands) {
    var t = P(o, X, Y, Z + h),
      b = P(o, X, Y, Z),
      rx = r * 1.2247,
      ry = r * 0.7071,
      s = "<g" + (attr ? " " + attr : "") + ">";
    s +=
      '<ellipse cx="' +
      b[0] +
      '" cy="' +
      (b[1] + 8) +
      '" rx="' +
      rx * 1.08 +
      '" ry="' +
      ry * 1.08 +
      '" fill="rgba(14,12,36,.16)" filter="url(#isoSoft)"/>';
    s +=
      '<path d="M' +
      (b[0] - rx) +
      " " +
      b[1] +
      " A" +
      rx +
      " " +
      ry +
      " 0 0 0 " +
      (b[0] + rx) +
      " " +
      b[1] +
      " L" +
      (t[0] + rx) +
      " " +
      t[1] +
      " A" +
      rx +
      " " +
      ry +
      " 0 0 0 " +
      (t[0] - rx) +
      " " +
      t[1] +
      ' Z" fill="url(#isoCyl)"/>';
    (bands || []).forEach((f) => {
      var q = P(o, X, Y, Z + h * f);
      s +=
        '<path d="M' +
        (q[0] - rx) +
        " " +
        q[1] +
        " A" +
        rx +
        " " +
        ry +
        " 0 0 0 " +
        (q[0] + rx) +
        " " +
        q[1] +
        '" fill="none" stroke="rgba(18,163,120,.3)" stroke-width="1.2"/>';
    });
    s +=
      '<ellipse cx="' +
      t[0] +
      '" cy="' +
      t[1] +
      '" rx="' +
      rx +
      '" ry="' +
      ry +
      '" fill="#F3FBF7" stroke="rgba(18,163,120,.4)" stroke-width="1.2"/>';
    s +=
      '<ellipse cx="' +
      t[0] +
      '" cy="' +
      t[1] +
      '" rx="' +
      rx * 0.55 +
      '" ry="' +
      ry * 0.55 +
      '" fill="none" stroke="rgba(18,163,120,.55)" stroke-width="1.6"/>';
    return s + "</g>";
  }
  /* v11: conduits. Every link in both stories is the same part: a tube that lies on the floor,
   runs along the grid, meets a platform at a collar and turns inside a junction block. */
  var TUBE = {
    sun: { d: "#EE8346", m: "#FFB68A", h: "rgba(255,255,255,.72)" },
    pink: { d: "#DC5591", m: "#F7A3C8", h: "rgba(255,255,255,.78)" },
  };
  PAL.pinkb = { t: "#F2428F", l: "#D92C79", r: "#B81F63", e: "rgba(255,255,255,.3)" };
  PAL.sunb = { t: "#FF9A5C", l: "#F26D1F", r: "#D9590F", e: "rgba(255,255,255,.3)" };
  function dOf(pp) {
    return "M" + pp.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" L");
  }
  function conduit(pp, w, c, cls) {
    var d = dOf(pp),
      k = (cls ? ' class="' + cls + '"' : "") + ' d="' + d + '" fill="none" stroke-linejoin="round"';
    return (
      "<path" +
      k +
      ' stroke="rgba(14,12,36,.15)" stroke-width="' +
      (w + 2) +
      '" transform="translate(0 ' +
      (w * 0.62).toFixed(1) +
      ')" filter="url(#isoSoft2)"/>' +
      "<path" +
      k +
      ' stroke="' +
      c.d +
      '" stroke-width="' +
      w +
      '"/>' +
      "<path" +
      k +
      ' stroke="' +
      c.m +
      '" stroke-width="' +
      (w * 0.66).toFixed(1) +
      '" transform="translate(0 ' +
      (-w * 0.17).toFixed(1) +
      ')"/>' +
      "<path" +
      k +
      ' stroke="' +
      c.h +
      '" stroke-width="' +
      Math.max(1.2, w * 0.14).toFixed(1) +
      '" transform="translate(0 ' +
      (-w * 0.33).toFixed(1) +
      ')"/>'
    );
  }
  function jblock(f, s, h, pal, lock) {
    var g = box(f, -s / 2, -s / 2, 0, s, s, h, pal);
    if (lock)
      g +=
        '<g transform="' +
        topM(f, 0, 0, h) +
        '"><rect x="-4.6" y="-1.6" width="9.2" height="7.4" rx="1.6" fill="#fff"/><path d="M-2.7 -1.6v-2.2a2.7 2.7 0 0 1 5.4 0v2.2" fill="none" stroke="#fff" stroke-width="1.7"/></g>';
    return g;
  }
  function floorGrid(o, u, x0, x1, y0, y1, id, fy) {
    var a = P(o, x0 * u, y0 * u, 0),
      b = P(o, x1 * u, y0 * u, 0),
      c = P(o, x1 * u, y1 * u, 0),
      d = P(o, x0 * u, y1 * u, 0);
    var cx = (b[0] + d[0]) / 2,
      cy = (a[1] + c[1]) / 2,
      rx = (b[0] - d[0]) / 2,
      ry = (c[1] - a[1]) / 2;
    var s =
      '<defs><radialGradient id="gf' +
      id +
      '"><stop offset=".45" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<mask id="gm' +
      id +
      '" maskUnits="userSpaceOnUse" x="' +
      (cx - rx) +
      '" y="' +
      (cy - ry) +
      '" width="' +
      2 * rx +
      '" height="' +
      2 * ry +
      '"><ellipse cx="' +
      cx +
      '" cy="' +
      cy +
      '" rx="' +
      rx * 0.78 +
      '" ry="' +
      ry * (fy || 0.86) +
      '" fill="url(#gf' +
      id +
      ')"/></mask></defs>';
    s += '<g class="fgrid" mask="url(#gm' + id + ')" stroke="rgba(90,72,245,.11)" stroke-width="1" fill="none">';
    var X, Y, p, q;
    for (X = x0; X <= x1; X += 2) {
      p = P(o, X * u, y0 * u, 0);
      q = P(o, X * u, y1 * u, 0);
      s +=
        '<line x1="' +
        p[0].toFixed(1) +
        '" y1="' +
        p[1].toFixed(1) +
        '" x2="' +
        q[0].toFixed(1) +
        '" y2="' +
        q[1].toFixed(1) +
        '"/>';
    }
    for (Y = y0; Y <= y1; Y += 2) {
      p = P(o, x0 * u, Y * u, 0);
      q = P(o, x1 * u, Y * u, 0);
      s +=
        '<line x1="' +
        p[0].toFixed(1) +
        '" y1="' +
        p[1].toFixed(1) +
        '" x2="' +
        q[0].toFixed(1) +
        '" y2="' +
        q[1].toFixed(1) +
        '"/>';
    }
    return s + "</g>";
  }
  function up(p, n) {
    return [p[0], p[1] - n];
  }
  function tower(o, X, Y, Z, w, n, ledPrefix) {
    var s = "";
    for (var i = 0; i < n; i++) {
      var z = Z + i * 18;
      s += box(o, X, Y, z, w, w, 15, PAL.white);
      s +=
        '<g transform="' +
        frontM(o, X, Y + w, z + 15) +
        '"><rect x="6" y="5.5" width="' +
        w * 0.42 +
        '" height="3" rx="1.5" fill="rgba(90,72,245,.28)"/><circle cx="' +
        (w - 8) +
        '" cy="7.5" r="2.4" fill="#2DBE7E"' +
        (ledPrefix ? ' id="' + ledPrefix + i + '"' : "") +
        '/><circle cx="' +
        (w - 15) +
        '" cy="7.5" r="2.4" fill="#B9B4FF"/></g>';
    }
    s +=
      '<g transform="' +
      topM(o, X + w / 2, Y + w / 2, Z + n * 18 - 3) +
      '"><circle r="7.5" fill="none" stroke="#5A48F5" stroke-width="3.4"/><circle r="2.6" fill="#0E0C24"/><path d="M7.5 0 V9" stroke="#5A48F5" stroke-width="3.4" stroke-linecap="round"/></g>';
    return s;
  }
  function laptop(o, X, Y, Z) {
    var s = box(o, X, Y, Z, 44, 32, 3, PAL.white);
    var a = P(o, X + 3, Y, Z + 3),
      b = P(o, X + 41, Y, Z + 3),
      c = P(o, X + 41, Y, Z + 31),
      d = P(o, X + 3, Y, Z + 31);
    s += '<polygon points="' + pts([a, b, c, d]) + '" fill="url(#isoScr)" stroke="#1C1940" stroke-width="1"/>';
    s +=
      '<g transform="' +
      frontM(o, X + 3, Y, Z + 31) +
      '"><rect x="5" y="5" width="18" height="3" rx="1.5" fill="#FF7A2F"/><rect x="5" y="11" width="27" height="2.5" rx="1.2" fill="rgba(255,255,255,.35)"/><rect x="5" y="16" width="15" height="2.5" rx="1.2" fill="rgba(255,255,255,.25)"/><rect x="24" y="19" width="10" height="5" rx="2" fill="#B9B4FF"/></g>';
    return s;
  }
  function applianceBox(o, X, Y, Z) {
    var s = box(o, X, Y, Z, 56, 46, 30, PAL.violet);
    s +=
      '<g transform="' +
      topM(o, X + 28, Y + 23, Z + 30) +
      '"><path d="M0 -11 L9 -7 V0 C9 6 5 9.5 0 11.5 C-5 9.5 -9 6 -9 0 V-7 Z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/><path d="M-4 .5 L-1 3.5 L4.5 -2.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>';
    s +=
      '<g transform="' +
      frontM(o, X, Y + 46, Z + 30) +
      '"><rect x="6" y="8" width="22" height="3" rx="1.5" fill="rgba(255,255,255,.6)"/><rect x="6" y="15" width="14" height="3" rx="1.5" fill="rgba(255,255,255,.35)"/><circle cx="48" cy="9.5" r="2.6" fill="#8FE0B9"/></g>';
    return s;
  }
  function miniLaptop(o, X, Y, Z, col) {
    var s = box(o, X, Y, Z, 26, 19, 2, PAL.white);
    var a = P(o, X + 2, Y, Z + 2),
      b = P(o, X + 24, Y, Z + 2),
      c = P(o, X + 24, Y, Z + 19),
      d = P(o, X + 2, Y, Z + 19);
    s += '<polygon points="' + pts([a, b, c, d]) + '" fill="url(#isoScr)" stroke="#1C1940" stroke-width=".8"/>';
    s +=
      '<g transform="' +
      frontM(o, X + 2, Y, Z + 19) +
      '"><rect x="3" y="3" width="11" height="2.4" rx="1.2" fill="' +
      col +
      '"/><rect x="3" y="7.5" width="16" height="2" rx="1" fill="rgba(255,255,255,.35)"/><rect x="3" y="11" width="9" height="2" rx="1" fill="rgba(255,255,255,.25)"/></g>';
    return s;
  }
  function place(el, x, y) {
    el.style.left = x.toFixed(1) + "px";
    el.style.top = y.toFixed(1) + "px";
  }

  /* ---------------- story A: how it works ---------------- */
  var A = $("nasil"),
    boxA = $("boxA"),
    scA = $("sceneA");
  var cipher = $("cipher"),
    wb = document.querySelectorAll("#sCipher .wbad span");
  var cls = document.querySelectorAll("#sCode .cl"),
    tags = document.querySelectorAll("#sCode .tg");
  var barsA = document.querySelectorAll("#sChart .bc i");
  var HEX = "0123456789abcdef";
  function cipherText(seedN) {
    var s = "",
      x = seedN * 9301 + 49297;
    for (var i = 0; i < 150; i++) {
      x = (x * 9301 + 49297) % 233280;
      s += HEX[x % 16];
      if (i % 4 === 3) s += " ";
    }
    return s;
  }
  var GA = {};
  function buildA() {
    /* one floor grid for the whole drawing: u is a grid cell, every platform edge and every tube sits on a grid line */
    var u = 19,
      O = [240, 44];
    var gp = (X, Y, Z) => P(O, X * u, Y * u, Z || 0);
    var iT = { w: 76, d: 76, h: 10 },
      iC = { w: 76, d: 76, h: 10 },
      iU = { w: 190, d: 114, h: 12 },
      iA = { w: 62, d: 44, h: 42 };
    var oT = gp(0, 10),
      oC = gp(6, 6),
      oU = gp(12, -4),
      oA = P(oU, 35, -112, 0);
    /* links lie on the ground and run in under the platforms they serve: nothing is added at the ends */
    var GZ = 16,
      gz = (X, Y, r) => P(O, X * u, Y * u, r - GZ);
    var w1 = 8,
      w2 = 13,
      z1 = 4,
      z2 = 6.5;
    var hRun = [gz(2, 12, z1), gz(8, 12, z1), gz(8, 8, z1)],
      tRun = [gz(8, 8, z2), gz(14, 8, z2), gz(14, -1, z2)];
    var s = floorGrid([O[0], O[1] + GZ], u, -4, 26, -14, 16, "A", 0.8);
    s +=
      conduit(hRun, w1, TUBE.sun) +
      conduit(tRun, w2, TUBE.pink) +
      '<path id="tunFlowA" d="' +
      dOf(tRun.map((q) => up(q, 2))) +
      '" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="22 400" opacity="0"/>';
    s += shadow(oA, iA.w, iA.d, 14, 0.1) + box(oA, 0, 0, 0, iA.w, iA.d, iA.h, PAL.blue);
    s +=
      '<g transform="' +
      topM(oA, iA.w / 2, iA.d / 2, iA.h) +
      '"><path d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4 Z" fill="#fff"/></g>';
    s += shadow(oT, iT.w, iT.d, 16) + box(oT, 0, 0, 0, iT.w, iT.d, iT.h, PAL.sunp);
    s += shadow(oC, iC.w, iC.d, 16) + box(oC, 0, 0, 0, iC.w, iC.d, iC.h, PAL.paper);
    s += shadow(oU, iU.w, iU.d, 18, 0.14) + box(oU, 0, 0, 0, iU.w, iU.d, iU.h, PAL.lav);
    var U4 = [P(oU, 0, 0, iU.h), P(oU, iU.w, 0, iU.h), P(oU, iU.w, iU.d, iU.h), P(oU, 0, iU.d, iU.h)];
    s +=
      '<polygon points="' +
      pts(U4) +
      '" fill="none" stroke="rgba(90,72,245,.5)" stroke-width="1.3" stroke-dasharray="5 5"/>';
    s +=
      '<polygon id="domeA" points="' +
      pts(U4) +
      '" fill="rgba(90,72,245,.08)" stroke="#5A48F5" stroke-width="2.6" opacity="0"/>';
    var hA = gz(4.7, 12, z1),
      hM = hRun[1],
      hB = gz(8, 10.7, z1);
    var tA = gz(10.7, 8, z2),
      tB = gz(14, 2.7, z2);
    s += jblock(gz(14, 8, 0), 24, 19, PAL.pinkb, true);
    s += laptop(oT, 16, 18, iT.h);
    s += '<g transform="' + topM(oT, 8, 60, iT.h) + '"><rect width="14" height="3" rx="1.5" fill="#FF7A2F"/></g>';
    s += tower(oC, 19, 19, iC.h, 38, 3);
    s += applianceBox(oU, 38, 28, iU.h);
    s += cyl(oU, 150, 60, iU.h, 22, 42, "", [0.33, 0.66]);
    /* the AI call leaves from the Appliance, roof to roof, and never touches Central */
    var appTop = P(oU, 66, 51, iU.h + 30),
      aiTop = P(oA, iA.w / 2, iA.d / 2, iA.h);
    s +=
      '<line id="aiLineA" x1="' +
      (appTop[0] + 13).toFixed(1) +
      '" y1="' +
      (appTop[1] - 7.5).toFixed(1) +
      '" x2="' +
      (aiTop[0] - 13).toFixed(1) +
      '" y2="' +
      (aiTop[1] + 7.5).toFixed(1) +
      '" stroke="#8A87A0" stroke-width="1.8" stroke-dasharray="4 4" stroke-linecap="round"/>';
    var hT = up(P(oT, 38, 18, iT.h + 31), 14),
      hC = up(P(oC, 38, 38, iC.h + 51), 16),
      hU = up(appTop, 16),
      hD = up(P(oU, 150, 60, iU.h + 42), 16);
    var r1 = 11,
      r2 = 15,
      kb = up(gz(14, 8, 0), 27);
    var mx = (hU[0] + hD[0]) / 2,
      my = Math.min(hU[1], hD[1]) - 34;
    var fwd0 = [hT, up(hA, r1), up(hM, r1 + 4), up(hB, r1), hC],
      fwd1 = [hC, up(tA, r2), kb, up(tB, r2), hU];
    s += '<path id="legA0" d="' + dOf(fwd0) + '" fill="none"/>';
    s += '<path id="legA1" d="' + dOf(fwd1) + '" fill="none"/>';
    s +=
      '<path id="legA2" d="M' +
      hU[0] +
      " " +
      hU[1] +
      " Q" +
      mx +
      " " +
      my +
      " " +
      hD[0] +
      " " +
      hD[1] +
      '" fill="none"/>';
    s +=
      '<path id="legA3" d="M' +
      hD[0] +
      " " +
      hD[1] +
      " Q" +
      mx +
      " " +
      my +
      " " +
      hU[0] +
      " " +
      hU[1] +
      " " +
      dOf(fwd1.slice().reverse().concat(fwd0.slice().reverse())).replace("M", "L") +
      '" fill="none"/>';
    s +=
      '<g id="pktA" opacity="0"><circle r="16" id="pktHalo" fill="#5A48F5" opacity=".18"/><circle r="8.5" id="pktCore" fill="#5A48F5" stroke="#fff" stroke-width="2.5"/><g id="pktLock" opacity="0"><rect x="-3.6" y="-.8" width="7.2" height="5.4" rx="1.2" fill="#fff"/><path d="M-2.2 -.8v-1.8a2.2 2.2 0 0 1 4.4 0V-.8" fill="none" stroke="#fff" stroke-width="1.3"/></g></g>';
    $("isoA").innerHTML = s;
    GA = { legs: [0, 1, 2, 3].map((i) => $("legA" + i)), cb: tA, ud: tB };
    GA.len = GA.legs.map((l) => l.getTotalLength());
    var tf = $("tunFlowA");
    if (tf.animate) {
      tf.animate([{ strokeDashoffset: 22 }, { strokeDashoffset: -200 }], { duration: 1300, iterations: Infinity });
    }
    var bT = P(oT, iT.w, iT.d, 0),
      bC = P(oC, iC.w, iC.d, 0),
      bU = P(oU, iU.w, iU.d, 0);
    place($("lTeam"), bT[0], bT[1] + 8);
    place($("lCentral"), bC[0] + 10, bC[1] + 24);
    place($("lZone"), bU[0], bU[1] + 10);
    var aF = P(oU, 66, 74, iU.h);
    place($("lApp"), aF[0] - 8, aF[1] + 5);
    var dF = P(oU, 150, 82, iU.h);
    place($("lDb"), dF[0] + 16, dF[1] + 8);
    var eH = gz(8, 12, 0),
      eT = gz(14, 8, 0);
    place($("lHttps"), eH[0] - 24, eH[1] + 8);
    place($("lTun"), eT[0], eT[1] + 20);
    /* notes are anchored by their right edge or their centre, so they sit right in every language */
    GA.ai = [aiTop[0], aiTop[1] - (iA.w + iA.d) / 4 - 24];
    GA.notes = [
      ["pAiOk", hU[0] - 24, 58, 1],
      ["pAiNo", hU[0] - 24, 84, 1],
      ["pStays", hU[0] - 24, 70, 1],
      ["pKeeps", bC[0], 46, 0.5],
    ];
    notesA();
  }
  function notesA() {
    if (GA.ai) place($("lAi"), Math.min(GA.ai[0], 714 - $("lAi").offsetWidth / 2), GA.ai[1]);
    (GA.notes || []).forEach((n) => {
      var el = $(n[0]);
      place(el, n[1] - el.offsetWidth * n[3], n[2]);
    });
  }
  var CAM = { a: { sc: 1, vw: 720 }, b: { sc: 1, vw: 720, vh: 680 } };
  function phone() {
    return innerWidth <= 760;
  }
  function phoneMaxH(box) {
    return innerHeight - (box.getBoundingClientRect().top - box.closest(".pin").getBoundingClientRect().top) - 12;
  }
  function camReset(cam, cami, scene) {
    cam.style.cssText = "";
    cami.style.transform = "";
    scene.style.width = "";
  }
  function layoutA() {
    notesA();
    var camA = $("camA"),
      camAi = $("camAi"),
      docA = $("docA");
    if (!phone()) {
      camReset(camA, camAi, scA);
      docA.style.cssText = "";
      fit(boxA, scA, 720, 670);
      return;
    }
    /* phone: the drawing follows the request, the text below is laid out at reading size */
    var bw = boxA.getBoundingClientRect().width,
      maxH = phoneMaxH(boxA),
      DOC = 300;
    var camH = clamp(maxH - DOC - 12, 120, 230),
      ds = Math.min(1, Math.max(0.6, (maxH - camH - 12) / DOC));
    CAM.a.ds = ds;
    CAM.a.lift = Math.min(camH * 0.62, 132);
    CAM.a.sc = camH / 300;
    CAM.a.vw = bw / CAM.a.sc;
    scA.style.transform = "none";
    scA.style.left = "0px";
    scA.style.width = bw + "px";
    camA.style.width = bw + "px";
    camA.style.height = camH + "px";
    camA.style.overflow = "hidden";
    docA.style.top = camH + 12 + "px";
    docA.style.width = bw / ds + "px";
    docA.style.height = DOC + "px";
    docA.style.transformOrigin = "0 0";
    boxA.style.height = camH + 12 + DOC * ds + "px";
  }
  function legPt(i, t) {
    return GA.legs[i].getPointAtLength(GA.len[i] * clamp(t, 0, 1));
  }
  function tickA() {
    if (!GA.legs) return;
    var p = prog(A);
    var idx = p < 0.16 ? 0 : p < 0.33 ? 1 : p < 0.5 ? 2 : p < 0.66 ? 3 : p < 0.82 ? 4 : 5;
    railNav($("navA"), p, idx);
    var q = seg(p, 0, 0.03),
      tq = seg(p, 0.02, 0.1);
    vis($("sQ"), q, (1 - eio(q)) * 14);
    $("sQt").style.clipPath = "inset(-40% " + (1 - tq) * 100 + "% -40% 0)";
    var pos,
      enc = false,
      show = 1,
      tag = "",
      rowsWord = lang === "tr" ? "satır" : lang === "de" ? "Zeilen" : "rows";
    if (p < 0.1) {
      show = seg(p, 0.07, 0.1);
      pos = legPt(0, 0);
      tag = tr("hero.s0");
    } else if (p < 0.16) {
      pos = legPt(0, eio(seg(p, 0.1, 0.16)));
      tag = tr("hero.s0");
    } else if (p < 0.2) {
      pos = legPt(1, 0);
      enc = p > 0.185;
      tag = tr("hero.s0");
    } else if (p < 0.29) {
      pos = legPt(1, eio(seg(p, 0.2, 0.29)));
      enc = pos.x < GA.ud[0] + 2;
    } else if (p < 0.68) {
      pos = legPt(2, 0);
      tag = p > 0.33 ? "SQL" : "";
    } else if (p < 0.73) {
      pos = legPt(2, eio(seg(p, 0.68, 0.73)));
      tag = tr("sc.tg0").replace(" ✓", "");
    } else if (p < 0.82) {
      pos = legPt(2, 1);
      tag = "6 " + rowsWord;
    } else if (p < 0.94) {
      pos = legPt(3, eio(seg(p, 0.82, 0.94)));
      enc = pos.x <= GA.ud[0] + 2 && pos.x >= GA.cb[0] - 2;
      tag = tr("hero.s3");
    } else {
      pos = legPt(3, 1);
      tag = tr("hero.s3");
      show = 1 - seg(p, 0.97, 1);
    }
    if (enc) tag = "a9f3·e71c";
    if (phone()) {
      var camX = clamp(pos.x - CAM.a.vw / 2, 0, Math.max(0, 800 - CAM.a.vw));
      $("camAi").style.transform =
        "translate(" + (-camX * CAM.a.sc).toFixed(1) + "px,0) scale(" + CAM.a.sc.toFixed(4) + ")";
      /* at the answer the text rises over the drawing, so the chart has room for a thumb */
      var lift = eio(seg(p, 0.86, 0.92));
      $("camA").style.opacity = (1 - 0.9 * lift).toFixed(3);
      $("docA").style.transform =
        "translateY(" + (-lift * CAM.a.lift).toFixed(1) + "px) scale(" + CAM.a.ds.toFixed(4) + ")";
    } else if ($("docA").style.transform) {
      $("docA").style.transform = "";
      $("camA").style.opacity = "";
    }
    var pk = $("pktA");
    pk.setAttribute("transform", "translate(" + pos.x.toFixed(1) + " " + pos.y.toFixed(1) + ")");
    pk.setAttribute("opacity", show);
    var pc = enc
      ? "#F2428F"
      : p < 0.16
        ? "#FF7A2F"
        : p < 0.68
          ? "#5A48F5"
          : p < 0.86
            ? "#12A378"
            : p > 0.93
              ? "#FF7A2F"
              : "#5A48F5";
    $("pktCore").setAttribute("fill", pc);
    $("pktHalo").setAttribute("fill", pc);
    $("sQ").style.setProperty("--p", p.toFixed(3));
    $("pktLock").setAttribute("opacity", enc ? 1 : 0);
    var tg = $("pkTag");
    tg.textContent = tag;
    tg.classList.toggle("enc", enc);
    place(tg, pos.x, pos.y - 40);
    tg.style.opacity = tag ? show : 0;
    $("lTeam").classList.toggle("hot", p < 0.11 || p > 0.93);
    $("lCentral").classList.toggle("hot", (p > 0.15 && p < 0.21) || (p > 0.88 && p < 0.91));
    $("lApp").classList.toggle("hot", p > 0.28 && p < 0.69);
    $("lDb").classList.toggle("hot", p > 0.71 && p < 0.81);
    $("lAi").classList.toggle("hot", p > 0.35 && p < 0.45);
    $("tunFlowA").setAttribute("opacity", (p > 0.19 && p < 0.3) || (p > 0.85 && p < 0.9) ? 1 : 0);
    vis($("pKeeps"), seg(p, 0.16, 0.19) * (1 - seg(p, 0.31, 0.33)) + seg(p, 0.86, 0.88) * (1 - seg(p, 0.94, 0.97)), 0);
    var cIn = seg(p, 0.17, 0.2),
      cOut = seg(p, 0.3, 0.33);
    vis($("sCipher"), cIn * (1 - cOut), (1 - eio(cIn)) * 24 - eio(cOut) * 12);
    if (cIn > 0 && cOut < 1) cipher.textContent = cipherText(Math.floor(p * 400));
    wb.forEach((w, i) => {
      w.classList.toggle("on", p > 0.21 + i * 0.03);
    });
    var ai = seg(p, 0.33, 0.36);
    $("aiLineA").setAttribute("stroke", ai > 0 && p < 0.66 ? "#2D7DF6" : "#8A87A0");
    vis($("pAiOk"), seg(p, 0.35, 0.38) * (1 - seg(p, 0.64, 0.66)), (1 - eio(seg(p, 0.35, 0.38))) * 10);
    vis($("pAiNo"), seg(p, 0.39, 0.42) * (1 - seg(p, 0.64, 0.66)), 0, (1 - eio(seg(p, 0.39, 0.42))) * -30);
    var codeIn = seg(p, 0.37, 0.41),
      coll = eio(seg(p, 0.69, 0.76));
    vis($("sCode"), codeIn * (1 - seg(p, 0.8, 0.83)), (1 - eio(codeIn)) * 24);
    $("sCode").style.height = lerp(196, 58, coll) + "px";
    cls.forEach((l, i) => {
      var a = seg(p, 0.4 + i * 0.02, 0.43 + i * 0.02);
      l.style.opacity = a * (1 - seg(coll, 0, 0.35));
    });
    $("sCode").querySelector(".chd").style.opacity = 1 - seg(coll, 0, 0.35);
    var sp = seg(p, 0.5, 0.62);
    $("scan").style.opacity = sp > 0 && sp < 1 ? 1 : 0;
    $("scan").style.top = lerp(44, 186, sp) + "px";
    tags.forEach((t, i) => {
      var a = seg(p, 0.52 + i * 0.028, 0.54 + i * 0.028);
      t.style.opacity = a;
      t.style.transform = "scale(" + lerp(0.7, 1, eio(a)) + ")";
    });
    vis($("sGate"), seg(p, 0.62, 0.65) * (1 - seg(p, 0.67, 0.7)), (1 - eio(seg(p, 0.62, 0.65))) * 14);
    $("strip").style.opacity = seg(coll, 0.4, 0.9);
    var dome = seg(p, 0.72, 0.76) * (1 - seg(p, 0.97, 1));
    $("domeA").setAttribute("opacity", dome);
    vis($("pStays"), phone() ? 0 : dome, (1 - eio(seg(p, 0.72, 0.76))) * 8);
    var ch = seg(p, 0.86, 0.9);
    vis($("sChart"), ch, (1 - eio(ch)) * 30);
    var grow = eio(seg(p, 0.88, 0.97));
    barsA.forEach((b, i) => {
      b.style.height =
        parseFloat(b.getAttribute("data-h")) * 100 * eio(seg(p, 0.88 + i * 0.012, 0.96 + i * 0.008)) + "%";
    });
    $("sNum").textContent = Math.round(315 * grow);
  }

  /* ---------------- story B: install ---------------- */
  var B = $("kurulum"),
    boxB = $("boxB"),
    scB = $("sceneB");
  var GB = {};
  function buildB() {
    /* Central stands straight behind the rack and the team straight beside Central, so both links are single straight runs on the floor */
    var iU = { cx: 262, cy: 352, w: 230, d: 138, h: 14 },
      iL = { w: 92, d: 92, h: 10 },
      iT = { w: 92, d: 92, h: 10 };
    var oU = org(iU.cx, iU.cy, iU.w, iU.d, iU.h),
      KX = 59,
      RX = KX + 33,
      LY = -230,
      TX = RX + 138;
    var oL = P(oU, RX - iL.w / 2, LY - iL.d / 2, 0),
      oT = P(oU, TX - iT.w / 2, LY - iT.d / 2, 0);
    var GZ = 16,
      s = floorGrid([oU[0], oU[1] + GZ], 23, -4, 16, -16, 10, "B");
    /* both links lie on the ground and are drawn first, so they run in under the platforms */
    var wT = 13,
      st = P(oU, RX, 40, 6.5 - GZ),
      en = P(oU, RX, LY, 6.5 - GZ),
      lk = P(oU, RX, -92, -GZ);
    var wH = 8,
      ha = P(oU, RX, LY, 4 - GZ),
      hb = P(oU, TX, LY, 4 - GZ);
    s += '<g id="teamLinkB" opacity="0">' + conduit([ha, hb], wH, TUBE.sun) + "</g>";
    s +=
      '<g id="tunB">' +
      conduit([st, en], wT, TUBE.pink, "tbs") +
      '<path id="flowB" d="' +
      dOf([up(st, 2), up(en, 2)]) +
      '" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0"/></g>';
    s += '<g id="tunLockB" opacity="0">' + jblock(lk, 24, 19, PAL.pinkb, true) + "</g>";
    s += '<g id="bIsland">' + shadow(oU, iU.w, iU.d, 20, 0.14) + box(oU, 0, 0, 0, iU.w, iU.d, iU.h, PAL.lav);
    var U4 = [P(oU, 0, 0, iU.h), P(oU, iU.w, 0, iU.h), P(oU, iU.w, iU.d, iU.h), P(oU, 0, iU.d, iU.h)];
    s +=
      '<polygon points="' +
      pts(U4) +
      '" fill="none" stroke="rgba(90,72,245,.5)" stroke-width="1.3" stroke-dasharray="5 5"/>';
    s += box(oU, KX, 44, iU.h, 66, 56, 5, PAL.ink) + wire(oU, KX, 44, iU.h + 5, 66, 56, 76) + "</g>";
    for (var i = 0; i < 4; i++) {
      var z = iU.h + 5 + i * 18;
      s +=
        '<g class="uB" id="uB' +
        i +
        '" opacity="0">' +
        box(oU, KX, 44, z, 66, 56, 15, PAL.white) +
        '<g transform="' +
        frontM(oU, KX, 100, z + 15) +
        '"><rect x="7" y="5.5" width="26" height="3" rx="1.5" fill="rgba(90,72,245,.28)"/><rect x="36" y="5.5" width="10" height="3" rx="1.5" fill="rgba(90,72,245,.16)"/><circle id="ledB' +
        i +
        '" cx="58" cy="7.5" r="2.6" fill="#CFC9BB"/></g></g>';
    }
    s +=
      '<g id="capB" opacity="0">' +
      box(oU, KX, 44, iU.h + 5 + 72, 66, 56, 4, PAL.violet) +
      '<g transform="' +
      topM(oU, RX, 72, iU.h + 5 + 76) +
      '"><path d="M0 -11 L9 -7 V0 C9 6 5 9.5 0 11.5 C-5 9.5 -9 6 -9 0 V-7 Z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/><path d="M-4 .5 L-1 3.5 L4.5 -2.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g></g>';
    s +=
      '<g id="pkgB" opacity="0">' +
      box(oU, 150, 34, iU.h, 36, 36, 36, PAL.pkg) +
      '<g transform="' +
      topM(oU, 150, 34, iU.h + 36) +
      '"><path d="M18 0 V36 M0 18 H36" stroke="#7B6CFF" stroke-width="3"/><circle cx="18" cy="18" r="6" fill="#5A48F5"/></g>' +
      '<g transform="' +
      frontM(oU, 150, 70, iU.h + 36) +
      '"><path d="M18 0 V36" stroke="#7B6CFF" stroke-width="3"/></g></g>';
    s +=
      '<line id="dbLinkB" x1="0" y1="0" x2="0" y2="0" stroke="#8A87A0" stroke-width="1.6" stroke-dasharray="4 4" opacity="0"/>';
    s += '<g id="dbB" opacity="0">' + cyl(oU, 182, 46, iU.h, 24, 44, "", [0.33, 0.66]) + "</g>";
    /* inbound wall on the right-front edge; the refused request arrives square to it */
    var wB = [P(oU, iU.w, 0, iU.h), P(oU, iU.w, iU.d, iU.h), P(oU, iU.w, iU.d, iU.h + 84), P(oU, iU.w, 0, iU.h + 84)];
    s +=
      '<polygon id="wallB" points="' +
      pts(wB) +
      '" fill="url(#isoWall)" stroke="rgba(192,54,92,.45)" stroke-width="1.3" stroke-dasharray="5 4" opacity="0"/>';
    var hit = P(oU, iU.w, 30, iU.h + 26),
      AL = 190;
    s +=
      '<g id="inB" opacity="0"><g transform="translate(' +
      hit[0].toFixed(1) +
      " " +
      hit[1].toFixed(1) +
      ') rotate(30)"><g class="bnc"><path d="M' +
      AL +
      ' 0 H22" stroke="#C0365C" stroke-width="1.8" fill="none"/><path d="M30 -6 L20 0 L30 6" fill="none" stroke="#C0365C" stroke-width="1.8"/></g></g>' +
      '<g transform="translate(' +
      hit[0].toFixed(1) +
      " " +
      hit[1].toFixed(1) +
      ')"><circle r="12" fill="#FCE6EC" stroke="#C0365C"/><path d="M-4.5 -4.5 L4.5 4.5 M4.5 -4.5 L-4.5 4.5" stroke="#C0365C" stroke-width="1.8"/></g></g>';
    /* Loquein Central */
    s +=
      '<g id="loqB" opacity="0">' +
      shadow(oL, iL.w, iL.d, 16) +
      box(oL, 0, 0, 0, iL.w, iL.d, iL.h, PAL.paper) +
      tower(oL, 27, 27, iL.h, 38, 3) +
      "</g>";
    s += '<g id="teamB" opacity="0">' + shadow(oT, iT.w, iT.d, 16) + box(oT, 0, 0, 0, iT.w, iT.d, iT.h, PAL.sunp);
    [
      [8, 10, "#FF7A2F"],
      [44, 14, "#5A48F5"],
      [18, 46, "#12A378"],
    ].forEach((a, k) => {
      s += '<g class="avB" id="avB' + k + '" opacity="0">' + miniLaptop(oT, a[0], a[1], iT.h, a[2]) + "</g>";
    });
    s += "</g>";
    $("isoB").innerHTML = s;
    var dl = $("dbLinkB"),
      r1 = P(oU, KX + 66, 76, iU.h + 30),
      r2 = P(oU, 182 - 20, 46 + 14, iU.h + 22);
    dl.setAttribute("x1", r1[0]);
    dl.setAttribute("y1", r1[1]);
    dl.setAttribute("x2", r2[0]);
    dl.setAttribute("y2", r2[1]);
    GB = { tubes: [].slice.call(document.querySelectorAll("#tunB .tbs")) };
    GB.tube = GB.tubes[1];
    var pk = P(oU, 168, 52, iU.h + 36);
    place($("pPkg"), pk[0] - 40, pk[1] - 96);
    place($("sigOk"), pk[0] - 40, pk[1] - 70);
    var rk = P(oU, KX, 100, iU.h + 44);
    place($("pSvc"), rk[0] - 168, rk[1] - 14);
    place($("pRo"), (r1[0] + r2[0]) / 2 - 10, (r1[1] + r2[1]) / 2 - 52);
    var bu = P(oU, iU.w, iU.d, 0);
    place($("lZoneB"), bu[0], bu[1] + 12);
    var lb = P(oL, iL.w, iL.d, 0);
    place($("lCenB"), lb[0] - 14, lb[1] + 12);
    var bt = P(oT, iT.w, iT.d, 0),
      lt = P(oL, iL.w / 2, iL.d / 2, iL.h + 54);
    GB.pos = {
      team: [bt[0], bt[1] + 8],
      ask: [708, bt[1] + 40],
      ready: [lt[0], lt[1] - 62],
      inb: [hit[0] + AL * 0.866 + 10, hit[1] + AL * 0.5 + 6],
      out: [lk[0] + 30, lk[1] - 78],
    };
    notesB();
  }
  /* notes are placed by their centre or right edge, so they sit right in every language */
  function notesB() {
    var q = GB.pos;
    if (!q) return;
    var w = (id) => $(id).offsetWidth;
    place($("lTeamB"), Math.min(q.team[0], 714 - w("lTeamB") / 2), q.team[1]);
    place($("iBubble"), q.ask[0] - w("iBubble"), q.ask[1]);
    place($("pReady"), q.ready[0] - w("pReady") / 2, q.ready[1]);
    place($("pIn"), q.inb[0] - w("pIn") / 2, q.inb[1]);
    place($("pOut"), q.out[0] - w("pOut"), q.out[1]);
  }
  function layoutB() {
    var camB = $("camB"),
      camBi = $("camBi");
    if (!phone()) {
      camReset(camB, camBi, scB);
      fit(boxB, scB, 720, 680);
    } else {
      /* phone: one camera over the whole drawing, it moves to the part each step talks about */
      var bw = boxB.getBoundingClientRect().width,
        camH = clamp(phoneMaxH(boxB), 300, 560);
      CAM.b.sc = 0.8;
      CAM.b.vw = bw / 0.8;
      CAM.b.vh = camH / 0.8;
      scB.style.transform = "none";
      scB.style.left = "0px";
      scB.style.width = bw + "px";
      camB.style.width = bw + "px";
      camB.style.height = camH + "px";
      camB.style.overflow = "hidden";
      boxB.style.height = camH + "px";
    }
    if (!GB.tube) return;
    GB.len = GB.tube.getTotalLength();
    notesB();
    GB.tubes.forEach((x) => {
      x.style.strokeDasharray = GB.len + " " + GB.len;
    });
    var fb = $("flowB");
    fb.style.strokeDasharray = "26 " + GB.len;
    if (!fb._anim && fb.animate) {
      fb._anim = fb.animate([{ strokeDashoffset: 26 }, { strokeDashoffset: -GB.len }], {
        duration: 1700,
        iterations: Infinity,
        easing: "cubic-bezier(.5,0,.5,1)",
      });
    }
  }
  var reqTicks = document.querySelectorAll("#cReq .tick");
  function grp(id, o, dy) {
    var g = $(id);
    g.style.opacity = o;
    g.style.transform = "translateY(" + (dy || 0) + "px)";
  }
  function tickB() {
    if (!GB.tube) return;
    var p = prog(B);
    var idx = p < 0.17 ? 0 : p < 0.34 ? 1 : p < 0.52 ? 2 : p < 0.7 ? 3 : p < 0.86 ? 4 : 5;
    railNav($("navB"), p, idx);
    if (phone()) {
      var cxM = Math.max(0, 760 - CAM.b.vw),
        cx = Math.min(cxM, 226) * (eio(seg(p, 0.5, 0.56)) - eio(seg(p, 0.68, 0.72))) + cxM * eio(seg(p, 0.84, 0.88));
      var cy = Math.max(0, 680 - CAM.b.vh) * eio(seg(p, 0.68, 0.74));
      $("camBi").style.transform =
        "translate(" +
        (-cx * CAM.b.sc).toFixed(1) +
        "px," +
        (-cy * CAM.b.sc).toFixed(1) +
        "px) scale(" +
        CAM.b.sc +
        ")";
    }
    var isl = seg(p, 0, 0.04);
    grp("bIsland", isl, (1 - eio(isl)) * 24);
    $("lZoneB").style.opacity = isl;
    vis($("cReq"), seg(p, 0.02, 0.06), (1 - eio(seg(p, 0.02, 0.06))) * 12);
    reqTicks.forEach((t, i) => {
      t.classList.toggle("on", p > 0.06 + i * 0.025);
    });
    $("led").classList.toggle("on", p > 0.46);
    var drop = seg(p, 0.18, 0.25),
      pkgOut = seg(p, 0.38, 0.42);
    grp("pkgB", drop > 0 ? 1 - pkgOut : 0, -(1 - eio(drop)) * 260 - eio(pkgOut) * 10);
    var pinOut = seg(p, 0.4, 0.43);
    vis($("pPkg"), seg(p, 0.26, 0.29) * (1 - pinOut), 0);
    var h = seg(p, 0.26, 0.32),
      full = "sha256 · 4be1c0f7 9a22d3e8 c09e51ab";
    $("hash").textContent = full.slice(0, Math.max(9, Math.round(full.length * h))) + (h < 1 ? "…" : "");
    vis($("sigOk"), seg(p, 0.31, 0.33) * (1 - pinOut), 0, 0, lerp(0.7, 1, eio(seg(p, 0.31, 0.33))));
    var n = 0;
    for (var i = 0; i < 4; i++) {
      var a = seg(p, 0.38 + i * 0.03, 0.41 + i * 0.03);
      grp("uB" + i, a, -(1 - eio(a)) * 46);
      $("ledB" + i).setAttribute("fill", a >= 1 ? "#2DBE7E" : "#CFC9BB");
      if (a >= 1) n++;
    }
    $("svcN").textContent = n + "/4";
    grp("capB", seg(p, 0.5, 0.52), -(1 - eio(seg(p, 0.5, 0.52))) * 20);
    vis($("pSvc"), seg(p, 0.37, 0.4), 0);
    var lq = seg(p, 0.5, 0.54);
    grp("loqB", lq, (1 - eio(lq)) * 20);
    $("lCenB").style.opacity = lq;
    var t = eio(seg(p, 0.54, 0.64));
    GB.tubes.forEach((x) => {
      x.style.strokeDashoffset = GB.len * (1 - t);
    });
    $("tunLockB").style.opacity = seg(t, 0.44, 0.54);
    $("flowB").style.opacity = t >= 1 ? 1 : 0;
    vis($("pOut"), seg(p, 0.6, 0.63) * (phone() ? 1 - seg(p, 0.84, 0.87) : 1), 0);
    $("wallB").style.opacity = seg(p, 0.62, 0.66);
    $("inB").style.opacity = seg(p, 0.64, 0.68);
    vis($("pIn"), seg(p, 0.66, 0.69), 0);
    var db = seg(p, 0.7, 0.73);
    grp("dbB", db, (1 - eio(db)) * 30);
    $("dbLinkB").style.opacity = seg(p, 0.72, 0.74);
    vis($("pRo"), seg(p, 0.72, 0.75), 0);
    vis($("cSchema"), seg(p, 0.73, 0.76), (1 - eio(seg(p, 0.73, 0.76))) * 14);
    $("tblN").textContent = Math.round(10 * eio(seg(p, 0.75, 0.84)));
    document.querySelectorAll("#schemaList .ln").forEach((l, i) => {
      l.classList.toggle("on", p > 0.76 + i * 0.014);
    });
    var tm = seg(p, 0.86, 0.89);
    grp("teamB", tm, (1 - eio(tm)) * 20);
    $("lTeamB").style.opacity = tm;
    $("teamLinkB").style.opacity = tm;
    for (var k = 0; k < 3; k++) {
      var av = seg(p, 0.88 + k * 0.02, 0.9 + k * 0.02);
      grp("avB" + k, av, (1 - eio(av)) * -18);
    }
    vis($("iBubble"), seg(p, 0.93, 0.96), (1 - eio(seg(p, 0.93, 0.96))) * 12);
    vis($("pReady"), seg(p, 0.9, 0.93), 0);
  }

  /* ---------------- security: stacked layers ---------------- */
  function buildL() {
    var cx = 300,
      s = "";
    var oc = org(cx, 372, 60, 60, 40);
    s += shadow(oc, 60, 60, 10, 0.18) + box(oc, 0, 0, 0, 60, 60, 40, PAL.violet);
    s +=
      '<g transform="' +
      topM(oc, 30, 30, 40) +
      '"><circle r="9" fill="none" stroke="#fff" stroke-width="3.4"/><circle r="3" fill="#fff"/><path d="M9 0 V11" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></g>';
    s +=
      '<text x="' +
      cx +
      '" y="456" text-anchor="middle" class="ln core" data-t="sec.core">' +
      tr("sec.core") +
      "</text>";
    s +=
      '<line x1="' +
      cx +
      '" y1="-8" x2="' +
      cx +
      '" y2="342" stroke="#5A48F5" stroke-width="1.5" stroke-dasharray="3 6" opacity=".45"/>';
    var plates = [
      ["sec.L4", "sec.L4s", 312, "thr4", "sec.x4", "18,163,120"],
      ["sec.L3", "sec.L3s", 242, "thr3", "sec.x3", "232,71,95"],
      ["sec.L2", "sec.L2s", 172, "thr2", "sec.x2", "90,72,245"],
      ["sec.L1", "sec.L1s", 102, "thr1", "sec.x1", "255,122,47"],
    ];
    var thr = "";
    plates.forEach((pl) => {
      var o = org(cx, pl[2], 190, 190, 5);
      var A = P(o, 0, 0, 5),
        Bp = P(o, 190, 0, 5),
        Cp = P(o, 190, 190, 5),
        Dp = P(o, 0, 190, 5),
        E = P(o, 190, 190, 0),
        F = P(o, 0, 190, 0),
        G = P(o, 190, 0, 0);
      var rgb = pl[5];
      s +=
        '<g><polygon points="' +
        pts([Dp, Cp, E, F]) +
        '" fill="rgba(' +
        rgb +
        ',.30)"/><polygon points="' +
        pts([Cp, Bp, G, E]) +
        '" fill="rgba(' +
        rgb +
        ',.42)"/><polygon points="' +
        pts([A, Bp, Cp, Dp]) +
        '" fill="rgba(' +
        rgb +
        ',.10)" stroke="rgba(' +
        rgb +
        ',.75)" stroke-width="1.4"/>' +
        '<polyline points="' +
        pts([Dp, A, Bp]) +
        '" fill="none" stroke="#fff" stroke-width="1.4"/></g>';
      s +=
        '<line x1="' +
        (Bp[0] + 4) +
        '" y1="' +
        Bp[1] +
        '" x2="' +
        (Bp[0] + 18) +
        '" y2="' +
        Bp[1] +
        '" stroke="rgba(' +
        rgb +
        ',.8)" stroke-width="1.5"/>';
      s +=
        '<text class="ln" x="' +
        (Bp[0] + 24) +
        '" y="' +
        (Bp[1] - 2) +
        '" data-t="' +
        pl[0] +
        '">' +
        tr(pl[0]) +
        '</text><text class="ls" x="' +
        (Bp[0] + 24) +
        '" y="' +
        (Bp[1] + 14) +
        '" data-t="' +
        pl[1] +
        '">' +
        tr(pl[1]) +
        "</text>";
      var hx = Dp[0],
        hy = Dp[1];
      thr +=
        '<g class="thr ' +
        pl[3] +
        '"><path d="M-150 ' +
        hy +
        " H" +
        (hx - 10) +
        '" stroke="#C0365C" stroke-width="1.8"/><path d="M' +
        (hx - 16) +
        " " +
        (hy - 6) +
        " L" +
        (hx - 6) +
        " " +
        hy +
        " L" +
        (hx - 16) +
        " " +
        (hy + 6) +
        '" fill="none" stroke="#C0365C" stroke-width="1.8"/><text class="th" x="-150" y="' +
        (hy - 10) +
        '" data-t="' +
        pl[4] +
        '">' +
        tr(pl[4]) +
        '</text><g class="hit" transform="translate(' +
        hx +
        " " +
        hy +
        ')"><circle r="10" fill="#FCE6EC" stroke="#C0365C"/><path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#C0365C" stroke-width="1.8"/></g></g>';
    });
    s += thr + '<circle class="beam" cx="' + cx + '" cy="-6" r="5.5" fill="#5A48F5" stroke="#fff" stroke-width="2"/>';
    $("lyr").innerHTML = s;
  }
  function tickAll() {
    tickA();
    tickB();
  }
  var ticking = false;
  addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          tickAll();
        });
      }
    },
    { passive: true },
  );
  addEventListener("resize", () => {
    layout();
    paint();
    layoutA();
    layoutB();
    tickAll();
  });

  /* ---------------- security: live audit stream ---------------- */
  var con = $("console"),
    conTimer = null,
    ci = 0,
    clockS = 23 * 3600 + 41 * 60 + 7;
  /* role colour as a class (rc0-rc3 in the stylesheet): no style attributes under the CSP */
  function roleC(r) {
    var h = 0;
    for (var i = 0; i < r.length; i++) h = (h * 31 + r.charCodeAt(i)) % 997;
    return h % 4;
  }
  function esc(t) {
    var d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
  }
  function fmt(sec) {
    return [Math.floor(sec / 3600) % 24, Math.floor(sec / 60) % 60, sec % 60]
      .map((v) => String(v).padStart(2, "0"))
      .join(":");
  }
  function addRow(it, instant) {
    clockS += 9 + ((ci * 17) % 40);
    var row = document.createElement("div");
    row.className = "srow" + (instant ? "" : " enter fresh");
    row.innerHTML =
      '<span class="tm">' +
      fmt(clockS) +
      '</span><span class="rl rc' +
      roleC(it.role) +
      '">' +
      esc(it.role) +
      '</span><div class="qs"><b>' +
      esc(it.q) +
      "</b><code>" +
      esc(it.sql) +
      '</code></div><div class="pips">' +
      it.c.map((c) => '<i class="pip" title="' + esc(c[1]) + '"></i>').join("") +
      '</div><div class="vd"><b></b><small></small></div>';
    var st = $("stream");
    st.insertBefore(row, st.firstChild);
    while (st.children.length > 4) st.removeChild(st.lastChild);
    var pips = row.querySelectorAll(".pip"),
      vd = row.querySelector(".vd");
    function verdict() {
      vd.classList.add(it.v, "on");
      vd.querySelector("b").textContent = tr("sec." + it.v);
      vd.querySelector("small").textContent = it.why;
    }
    if (instant) {
      it.c.forEach((c, i) => {
        pips[i].classList.add(c[0]);
      });
      verdict();
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        row.classList.remove("enter");
      });
    });
    it.c.forEach((c, i) => {
      setTimeout(
        () => {
          pips[i].classList.add(c[0]);
        },
        600 + i * 420,
      );
    });
    setTimeout(verdict, 600 + 3 * 420 + 200);
    setTimeout(() => {
      row.classList.remove("fresh");
    }, 3400);
  }
  function conStep() {
    var D = DATA[lang].console;
    addRow(D[ci % D.length], false);
    ci++;
  }
  function conPrefill() {
    var D = DATA[lang].console;
    $("stream").innerHTML = "";
    for (var k = 0; k < 3; k++) {
      addRow(D[ci % D.length], true);
      ci++;
    }
  }
  var conIO = new IntersectionObserver(
    (es) => {
      es.forEach((e) => {
        if (e.isIntersecting && !conTimer) {
          if (!$("stream").children.length) conPrefill();
          conStep();
          conTimer = setInterval(conStep, reduce ? 6000 : 3800);
        } else if (!e.isIntersecting && conTimer) {
          clearInterval(conTimer);
          conTimer = null;
        }
      });
    },
    { threshold: 0.2 },
  );
  conIO.observe(con);
  /* v7: chart views are real buttons */
  (() => {
    var sg = $("seg");
    if (!sg) return;
    var btns = [].slice.call(sg.querySelectorAll("button")),
      views = [].slice.call(document.querySelectorAll("#views .view"));
    btns.forEach((b) => {
      b.addEventListener("click", () => {
        var v = b.getAttribute("data-v");
        btns.forEach((x) => {
          x.setAttribute("aria-pressed", x === b ? "true" : "false");
        });
        views.forEach((x) => {
          x.classList.toggle("on", x.getAttribute("data-v") === v);
        });
      });
    });
  })();
  /* v7: product cards flip to show the detail */
  (() => {
    var tiles = [].slice.call(document.querySelectorAll(".bento .tile"));
    function set(t, open, focus) {
      t.classList.toggle("open", open);
      var more = t.querySelector(".more"),
        back = t.querySelector(".back");
      more.setAttribute("aria-expanded", open ? "true" : "false");
      more.tabIndex = open ? -1 : 0;
      back.setAttribute("aria-hidden", open ? "false" : "true");
      back.tabIndex = open ? 0 : -1;
      if (focus) (open ? back : more).focus({ preventScroll: true });
    }
    tiles.forEach((t) => {
      t.querySelector(".back").addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          t.click();
        }
      });
      t.addEventListener("click", (e) => {
        var open = !t.classList.contains("open"),
          viaKey = e.detail === 0;
        tiles.forEach((o) => {
          if (o !== t) set(o, false, false);
        });
        set(t, open, viaKey);
      });
    });
    addEventListener("keydown", (e) => {
      if (e.key === "Escape")
        tiles.forEach((t) => {
          if (t.classList.contains("open")) set(t, false, t.contains(document.activeElement));
        });
    });
  })();
  /* v7: small looping demos on the two new cards */
  [
    ["keyc", 900],
    ["wrc", 1800],
  ].forEach((d) => {
    var a = $(d[0]);
    if (!a) return;
    var t = null;
    function run() {
      a.classList.remove("done", "press");
      setTimeout(() => {
        a.classList.add("press");
      }, 2000);
      setTimeout(() => {
        a.classList.remove("press");
        a.classList.add("done");
      }, 2700);
    }
    new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (e.isIntersecting && !t) {
            setTimeout(run, d[1]);
            t = setInterval(run, 5600);
          } else if (!e.isIntersecting && t) {
            clearInterval(t);
            t = null;
          }
        });
      },
      { threshold: 0.3 },
    ).observe(a);
  });
  /* approval card in the product grid: approve, then reset */
  (() => {
    var a = $("appr");
    if (!a) return;
    var t = null;
    function run() {
      a.classList.remove("done", "press");
      setTimeout(() => {
        a.classList.add("press");
      }, 2200);
      setTimeout(() => {
        a.classList.remove("press");
        a.classList.add("done");
      }, 2500);
    }
    new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (e.isIntersecting && !t) {
            run();
            t = setInterval(run, 5200);
          } else if (!e.isIntersecting && t) {
            clearInterval(t);
            t = null;
          }
        });
      },
      { threshold: 0.3 },
    ).observe(a);
  })();

  /* inside the app: screen tabs over the real screenshots. Without JS every screen is shown, one under the other. */
  (() => {
    var root = $("app");
    if (!root) return;
    var bar = root.querySelector(".ax-tabbar"),
      tabs = [].slice.call(bar.querySelectorAll("[role=tab]"));
    var views = [].slice.call(root.querySelectorAll(".ax-view")),
      cur = 0;
    function show(i, focus) {
      cur = i;
      tabs.forEach((t, k) => {
        t.setAttribute("aria-selected", k === i ? "true" : "false");
        t.tabIndex = k === i ? 0 : -1;
      });
      views.forEach((v, k) => {
        v.classList.toggle("on", k === i);
        v.hidden = k !== i;
      });
      if (focus) tabs[i].focus();
      var t = tabs[i],
        bl = bar.scrollLeft,
        tl = t.offsetLeft;
      if (tl < bl || tl + t.offsetWidth > bl + bar.clientWidth)
        bar.scrollTo({ left: tl - 20, behavior: reduce ? "auto" : "smooth" });
    }
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => {
        show(i, false);
      });
    });
    bar.addEventListener("keydown", (e) => {
      var n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (e.key === "Home") {
        e.preventDefault();
        show(0, true);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        show(tabs.length - 1, true);
        return;
      }
      if (!n) return;
      e.preventDefault();
      show((cur + n + tabs.length) % tabs.length, true);
    });
    show(0, false);
  })();

  /* ---------------- start ---------------- */
  buildA();
  buildB();
  buildL();
  applyLang();
  function initStories() {
    layoutA();
    layoutB();
    tickAll();
  }
  if (document.fonts?.ready) document.fonts.ready.then(initStories);
  else initStories();
  /* the intro plays only when the visitor arrives from outside the site (no storage: the referrer decides, step0 h) */
  function fromOutside() {
    if (!document.referrer) return true;
    try {
      return new URL(document.referrer).origin !== location.origin;
    } catch {
      return true;
    }
  }
  if (reduce || !fromOutside()) startHero();
  else playIntro();
})();
