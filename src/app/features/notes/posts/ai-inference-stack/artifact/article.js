/*
 * The scripts from "The AI Inference Stack" artifact, run against the post's
 * shadow root instead of a whole document. Changes from the original:
 *
 * - The module scripts and the runtime share this function's scope in place of
 *   window.MODS, window.KIT and window.DATA. DATA comes from article.data.json.
 * - Queries, the tooltip and its listeners go through the shadow root. CSS
 *   variables are read from the shadow host, where article.css defines them.
 * - setTimeout, setInterval, requestAnimationFrame and window listeners are
 *   wrapped below, so the returned teardown stops everything the article
 *   started. The router reuses the page, so nothing may outlive the post.
 * - The tab hash keeps the post's path and the router's history state. A bare
 *   "#l1-overview" resolves against <base href> and would point at the home page.
 * - Scrolling to a panel clears the site navbar as well as the rack.
 * - The theme switch is gone, with the dark palette it served.
 */
import DATA from './article.data.json';

export function mountArticle(shadow) {
  const lifetime = new AbortController();
  const { signal } = lifetime;
  const intervals = new Set();
  const timeouts = new Set();
  const frames = new Set();
  /* These shadow the window functions for all the code below. */
  function setInterval(fn, ms) { const id = window.setInterval(fn, ms); intervals.add(id); return id; }
  function clearInterval(id) { intervals.delete(id); window.clearInterval(id); }
  function setTimeout(fn, ms) { const id = window.setTimeout(() => { timeouts.delete(id); fn(); }, ms); timeouts.add(id); return id; }
  function clearTimeout(id) { timeouts.delete(id); window.clearTimeout(id); }
  function requestAnimationFrame(fn) { const id = window.requestAnimationFrame((t) => { frames.delete(id); fn(t); }); frames.add(id); return id; }
  function cancelAnimationFrame(id) { frames.delete(id); window.cancelAnimationFrame(id); }
  function addEventListener(type, fn, opts) { window.addEventListener(type, fn, { ...(typeof opts === 'object' ? opts : {}), signal }); }
  const MODS = {};

  /* Trace a request: a token falls through the seven trays, then output tokens stream back up. */
  MODS.trace = function (root, cfg, K) {
    var layers = cfg.layers, N = layers.length;
    var wrap = K.el("div", "two", null, root);
    var left = K.el("div", null, null, wrap), right = K.el("div", "fig", null, wrap);
    var W = 540, TOP = 34, ROW = 74, H = TOP + N * ROW + 26;
    var s = K.sv("svg", { "class": "anim", viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "A request token travels from your app down to the GPU, then tokens stream back up." }, left);
    var defs = K.sv("defs", null, s);
    var glow = K.sv("filter", { id: "trace-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
    K.sv("feGaussianBlur", { stdDeviation: "4" }, glow);
    // wires: down on the right, back up on the left
    K.sv("line", { x1: 506, x2: 506, y1: 10, y2: H - 14, stroke: "var(--token)", "stroke-width": 2, "stroke-dasharray": "5 6", opacity: .7 }, s);
    K.sv("line", { x1: 24, x2: 24, y1: 10, y2: H - 14, stroke: "var(--rule)", "stroke-width": 2, "stroke-dasharray": "2 6" }, s);
    var lab1 = K.sv("text", { x: 506, y: 8, "text-anchor": "middle", "font-family": "var(--f-ui)", "font-size": 11, fill: "var(--muted)" }, s); lab1.textContent = "request";
    var lab2 = K.sv("text", { x: 24, y: 8, "text-anchor": "middle", "font-family": "var(--f-ui)", "font-size": 11, fill: "var(--muted)" }, s); lab2.textContent = "tokens";
    var trays = layers.map(function (L, i) {
      var y = TOP + i * ROW;
      var g = K.sv("g", { tabindex: "0", role: "button", "aria-label": L.id.toUpperCase() + " " + L.name + ": show this layer", style: "cursor:pointer" }, s);
      var body = K.sv("rect", { x: 44, y: y, width: 446, height: ROW - 12, rx: 5, fill: "var(--surface-2)", stroke: "var(--rule)", "stroke-width": 1.4 }, g);
      K.sv("rect", { x: 44, y: y, width: 10, height: ROW - 12, rx: 3, fill: "var(--" + L.id + ")" }, g);
      var id = K.sv("text", { "class": "tr-id", x: 70, y: y + 26, "font-family": "var(--f-mono)", "font-weight": 700, "font-size": 15, fill: "var(--" + L.id + ")" }, g); id.textContent = L.id.toUpperCase();
      var nm = K.sv("text", { "class": "tr-nm", x: 104, y: y + 26, "font-family": "var(--f-ui)", "font-weight": 600, "font-size": 17, fill: "var(--ink)" }, g); nm.textContent = L.name;
      var sb = K.sv("text", { "class": "tr-sb", x: 104, y: y + 46, "font-family": "var(--f-ui)", "font-size": 13, fill: "var(--muted)" }, g); sb.textContent = L.products;
      var halo = K.sv("circle", { cx: 470, cy: y + (ROW - 12) / 2, r: 9, fill: "var(--" + L.id + ")", opacity: 0, filter: "url(#trace-glow)" }, g);
      var led = K.sv("circle", { cx: 470, cy: y + (ROW - 12) / 2, r: 5, fill: "var(--rule)" }, g);
      g.addEventListener("click", function () { pick(i); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(i); } });
      return { g: g, body: body, led: led, halo: halo, y: y + (ROW - 12) / 2, id: L.id };
    });
    var token = K.sv("circle", { cx: 506, cy: 14, r: 9, fill: "var(--token)", stroke: "var(--surface-2)", "stroke-width": 3 }, s);
    var ups = K.sv("g", null, s);

    // narration
    var head = K.el("div", "fig-h", null, right);
    var kick = K.el("p", "ph-eyebrow", "", head);
    var title = K.el("h3", "fig-title", "", head);
    var body = K.el("div", "prose", null, right);
    var meta = K.el("p", "fig-note", "", right);
    var trip = K.el("div", null, null, right);
    var tripBar = K.el("div", "meter", null, trip), tripFill = K.el("i", null, null, tripBar);
    var tripLab = K.el("p", "fig-note", "", trip);
    var ctl = K.el("div", "btns", null, right);
    var playB = K.button(ctl, "Pause", "primary"), stepB = K.button(ctl, "Next layer"), openB = K.button(ctl, "Open this layer");
    var ph = "down", pos = -0.6, upT = 0, paused = K.RM, spawned = 0, dots = [], focus = -1;

    function light(i) {
      trays.forEach(function (t, k) {
        var on = k === i, past = k < i;
        t.body.setAttribute("stroke", on ? "var(--" + t.id + ")" : "var(--rule)");
        t.body.setAttribute("stroke-width", on ? 2.6 : 1.4);
        t.body.setAttribute("fill", on ? "color-mix(in srgb, var(--" + t.id + ") 13%, var(--surface-2))" : "var(--surface-2)");
        t.led.setAttribute("fill", on || past || ph === "up" ? "var(--" + t.id + ")" : "var(--rule)");
        t.halo.setAttribute("opacity", on ? .9 : 0);
      });
    }
    function narrate(i) {
      focus = i;
      if (i < 0) {
        kick.textContent = "Your app";
        title.textContent = "client.chat.completions.create()";
        body.innerHTML = "<p>" + cfg.intro + "</p>";
        meta.textContent = "";
        openB.disabled = true;
        return;
      }
      if (i >= N) {
        kick.textContent = "Decode";
        title.textContent = "Tokens stream back up";
        body.innerHTML = "<p>" + cfg.outro + "</p>";
        meta.textContent = "";
        openB.disabled = true;
        return;
      }
      var L = layers[i];
      kick.innerHTML = '<span class="chip" style="background:var(--' + L.id + ')">' + L.id.toUpperCase() + "</span> " + L.name;
      title.textContent = L.head;
      body.innerHTML = "<p>" + L.does + "</p>";
      meta.textContent = "Owner: " + L.owner + ". Products: " + L.products + ".";
      openB.disabled = false;
    }
    function setTrip() {
      var p = ph === "down" ? Math.max(0, Math.min(1, (pos + 0.6) / (N - 0.4))) : 1;
      tripFill.style.width = (p * 100) + "%";
      tripFill.style.background = "var(--token)";
      tripLab.innerHTML = p >= 1 ? cfg.tripDone : cfg.tripGoing;
    }
    function yAt(p) { return p < 0 ? 14 + (p + 0.6) / 0.6 * (trays[0].y - 14) : trays[0].y + p * ROW; }
    function frame(dt) {
      if (ph === "down") {
        var before = Math.round(pos);
        pos += dt * 1.15;
        var near = Math.round(pos), frac = Math.abs(pos - near);
        if (near >= 0 && near < N && frac < 0.18) pos += dt * -0.85; // dwell at each tray
        if (near !== before && near >= 0 && near < N) narrate(near);
        if (pos >= N - 1 + 0.25) { ph = "up"; upT = 0; spawned = 0; narrate(N); }
        token.setAttribute("cy", yAt(Math.min(pos, N - 1)));
        light(Math.max(-1, Math.min(N - 1, Math.round(pos))));
      } else {
        upT += dt;
        if (spawned < 14 && upT > spawned * 0.22) {
          var d = K.sv("circle", { cx: 24, cy: trays[N - 1].y, r: 5, fill: "var(--l" + (1 + (spawned % 7)) + ")" }, ups);
          dots.push({ el: d, y: trays[N - 1].y });
          spawned++;
        }
        dots.forEach(function (d) { d.y -= dt * 260; d.el.setAttribute("cy", d.y); d.el.setAttribute("opacity", Math.max(0, Math.min(1, (d.y - 4) / 60))); });
        dots = dots.filter(function (d) { if (d.y < 0) { d.el.remove(); return false; } return true; });
        token.setAttribute("opacity", Math.max(0, 1 - upT * 2));
        light(N);
        if (upT > 5.2) restart();
      }
      setTrip();
    }
    var loop = K.loop(frame);
    function restart() {
      ph = "down"; pos = -0.6; upT = 0; spawned = 0;
      dots.forEach(function (d) { d.el.remove(); }); dots = [];
      token.setAttribute("opacity", 1); token.setAttribute("cy", 14);
      narrate(-1); light(-1); setTrip();
    }
    function pick(i) {
      paused = true; loop.stop(); playB.textContent = "Play"; playB.setAttribute("aria-pressed", "false");
      ph = "down"; pos = i; token.setAttribute("opacity", 1); token.setAttribute("cy", yAt(i));
      light(i); narrate(i); setTrip();
    }
    playB.addEventListener("click", function () {
      paused = !paused;
      playB.textContent = paused ? "Play" : "Pause";
      if (paused) loop.stop(); else { if (ph === "down" && pos >= N - 1) restart(); loop.start(); }
    });
    stepB.addEventListener("click", function () {
      var i = focus < 0 ? 0 : focus + 1;
      if (i >= N) { restart(); pick(0); return; }
      pick(i);
    });
    openB.addEventListener("click", function () { if (focus >= 0 && focus < N) K.go(layers[focus].id, null, { scroll: "force" }); });
    restart();
    if (K.RM) { playB.textContent = "Play"; pick(0); }
    return {
      start: function () { if (!paused) loop.start(); },
      stop: function () { loop.stop(); }
    };
  };

  /* Front-panel readouts on the overview: small live instruments beside each headline number. */
  MODS.panels = function (root, cfg, K) {
    var loops = [];
    // token counter: a single user's best-case decode speed, counted from page open
    var spendOut = K.$("[data-live=spend]", root), spendViz = K.$("[data-viz=spend]", root);
    var t0 = performance.now(), perSec = cfg.tps;
    var pts = [];
    var spendLoop = K.loop(function () {
      var sec = (performance.now() - t0) / 1000;
      if (spendOut) spendOut.textContent = Math.round(sec * perSec).toLocaleString("en-US");
      if (spendViz) {
        pts.push(sec * perSec);
        if (pts.length > 120) pts.shift();
        var max = Math.max(0.01, pts[pts.length - 1]), d = "";
        pts.forEach(function (v, i) { d += (i ? "L" : "M") + (i / 119 * 200).toFixed(1) + " " + (32 - v / max * 28).toFixed(1); });
        spendViz.firstChild.setAttribute("d", d);
      }
    });
    loops.push(spendLoop);
    // layers: seven LEDs light in sequence, then the 2023 picture with two
    var leds = K.$$("[data-viz=layers] rect", root), layerLab = K.$("[data-live=layers]", root), lt = 0;
    loops.push(K.loop(function (dt) {
      lt += dt;
      var cyc = lt % 6, show2023 = cyc > 4;
      leds.forEach(function (r, i) {
        var on = show2023 ? (i === 3 || i === 5) : cyc * 3 > i;
        r.setAttribute("opacity", on ? 1 : .18);
        r.setAttribute("fill", show2023 ? "var(--old)" : "var(--l" + (i + 1) + ")");
      });
      if (layerLab) layerLab.textContent = show2023 ? cfg.layers2023 : cfg.layers2026;
    }));
    // latency: a packet crosses seven segments, slowed down
    var pkts = K.$$("[data-viz=lat] circle", root), lat = 0;
    loops.push(K.loop(function (dt) {
      lat = (lat + dt / 1.6) % 1;
      pkts.forEach(function (p, i) { var u = (lat + i / pkts.length) % 1; p.setAttribute("cx", 6 + u * 188); p.setAttribute("opacity", Math.min(1, Math.min(u, 1 - u) * 8)); });
    }));
    // cache: list price against cached price, breathing
    var cbar = K.$("[data-viz=cache] .cached", root), ct = 0;
    loops.push(K.loop(function (dt) {
      ct += dt;
      if (cbar) cbar.setAttribute("width", (20 * (0.85 + 0.15 * Math.sin(ct * 2.4))).toFixed(1));
    }));
    return {
      start: function () { if (!K.RM) loops.forEach(function (l) { l.start(); }); else if (spendOut) spendOut.textContent = "0"; },
      stop: function () { loops.forEach(function (l) { l.stop(); }); }
    };
  };

  /* Ambient motion along painted paths: the token in the rack, KV packets on a cable, data on a GPU bus. */
  MODS.pathflow = function (root, cfg, K) {
    var svg = K.$(".plate-ov", root);
    if (!svg || K.RM) return {};
    var g = K.sv("g", { "class": "flow" }, svg), items = [];
    (cfg.paths || []).forEach(function (p) {
      var path = K.sv("path", { d: p.d, fill: "none", stroke: "none" }, g), len = path.getTotalLength();
      for (var i = 0; i < (p.count || 1); i++) {
        var c = K.sv("circle", { r: p.r || 9, fill: p.color || "var(--token)", stroke: p.stroke || "#fff", "stroke-width": p.sw == null ? 2.5 : p.sw, opacity: 0 }, g);
        items.push({ c: c, path: path, len: len, t: i / (p.count || 1), dur: p.dur || 3, fade: p.fade !== false });
      }
    });
    var loop = K.loop(function (dt) {
      items.forEach(function (it) {
        it.t = (it.t + dt / it.dur) % 1;
        var pt = it.path.getPointAtLength(it.t * it.len);
        it.c.setAttribute("cx", pt.x); it.c.setAttribute("cy", pt.y);
        it.c.setAttribute("opacity", it.fade ? Math.min(1, Math.min(it.t, 1 - it.t) * 8) : 1);
      });
    });
    return { start: loop.start, stop: loop.stop };
  };

  /* 2023 against 2026: seven layers collapse into the two-box picture and back. */
  MODS.morph = function (root, cfg, K) {
    var box = K.el("div", "morph", null, root);
    var top = K.el("div", "row", null, box);
    var seg = K.seg(top, ["2023 picture", "2026 stack"], function (i) { user = true; set(i === 0); }, 1);
    var auto = K.button(top, "Auto-play");
    var note = K.el("p", "says", "", box);
    var list = K.el("div", "mlist", null, box);
    var rows = cfg.layers.map(function (L, i) {
      var r = K.el("div", "mrow " + L.id, null, list);
      r.style.setProperty("--c", "var(--" + L.id + ")");
      K.el("span", "mband", null, r);
      K.el("span", "mid", L.id.toUpperCase(), r);
      var nm = K.el("span", "mname", L.name, r);
      var pr = K.el("span", "mprod", L.products, r);
      if (L.id === "l6") K.el("span", "mmodel", "“the model”", r);
      return { r: r, nm: nm, pr: pr, L: L };
    });
    var old = false, user = false, timer = null;
    function set(is2023) {
      old = is2023;
      seg.set(is2023 ? 0 : 1);
      list.classList.toggle("y2023", is2023);
      rows.forEach(function (o) {
        if (o.L.id === "l4") { o.nm.textContent = is2023 ? "vLLM" : o.L.name; o.pr.textContent = is2023 ? "the whole serving story" : o.L.products; }
        if (o.L.id === "l1") { o.pr.textContent = is2023 ? "your code" : o.L.products; }
      });
      note.innerHTML = is2023 ? cfg.note2023 : cfg.note2026;
    }
    function startAuto() {
      if (K.RM) return;
      stopAuto();
      auto.setAttribute("aria-pressed", "true");
      timer = setInterval(function () { set(!old); }, 2600);
    }
    function stopAuto() { if (timer) clearInterval(timer); timer = null; auto.setAttribute("aria-pressed", "false"); }
    auto.addEventListener("click", function () { if (timer) stopAuto(); else startAuto(); });
    K.$$(".seg .btn", top).forEach(function (b) { b.addEventListener("click", stopAuto); });
    set(false);
    return { start: function () { if (!user) startAuto(); }, stop: stopAuto };
  };

  /* L1: reorder the parts of a prompt and watch how much of it the cache can reuse. */
  MODS.promptlab = function (root, cfg, K) {
    var blocks = cfg.blocks.map(function (b) { return Object.assign({}, b); });
    var order = cfg.start.slice();
    var read = cfg.read_pct / 100;
    var top = K.el("div", "row", null, root);
    var best = K.button(top, "Put the stable parts first", "primary");
    var worst = K.button(top, "Reset to the timestamp-first prompt");
    K.el("span", "example", "Example prompt, sizes illustrative", top);
    var grid = K.el("div", "two even", null, root);
    var listBox = K.el("div", "fig", null, grid);
    K.el("p", "fig-sub", "Drag a part, or use the arrows. The cache matches from the first token until the first part that changed since the last request.", listBox);
    var list = K.el("ol", "plist", null, listBox);
    var side = K.el("div", "fig", null, grid);
    var barWrap = K.el("div", "pbar-wrap", null, side);
    var bar = K.el("div", "pbar", null, barWrap);
    var scan = K.el("i", "pscan", null, barWrap);
    var legend = K.el("div", "legend-row", null, side);
    legend.innerHTML = '<span><i style="background:var(--layer)"></i>served from cache</span><span><i style="background:var(--old)"></i>computed again</span>';
    var ro = K.el("div", "readouts", null, side);
    var rHit = K.readout(ro, "of input tokens from cache", true), rCost = K.readout(ro, "input cost against list price"), rBreak = K.readout(ro, "first part that changed");
    var says = K.el("p", "says", "", side);
    var anim = null;

    function render(animate) {
      var first = new Map();
      Array.prototype.forEach.call(list.children, function (li) { first.set(li.dataset.k, li.getBoundingClientRect().top); });
      list.innerHTML = "";
      order.forEach(function (k, i) {
        var b = blocks.filter(function (x) { return x.k === k; })[0];
        var li = K.el("li", "pitem" + (b.changes ? " changes" : ""), null, list);
        li.dataset.k = k;
        li.draggable = true;
        li.style.setProperty("--c", b.changes ? "var(--old)" : "var(--layer)");
        K.el("span", "pgrip", "⋮⋮", li).setAttribute("aria-hidden", "true");
        var t = K.el("span", "ptext", null, li);
        K.el("b", null, b.name, t);
        K.el("small", null, b.tokens.toLocaleString("en-US") + " tokens · " + (b.changes ? "changes every request" : b.note), t);
        var up = K.el("button", "parr", "↑", li), dn = K.el("button", "parr", "↓", li);
        up.type = dn.type = "button";
        up.setAttribute("aria-label", "Move " + b.name + " up"); dn.setAttribute("aria-label", "Move " + b.name + " down");
        up.disabled = i === 0; dn.disabled = i === order.length - 1;
        up.addEventListener("click", function () { move(i, i - 1, true); });
        dn.addEventListener("click", function () { move(i, i + 1, true); });
        li.addEventListener("dragstart", function (e) { li.classList.add("drag"); e.dataTransfer.setData("text/plain", String(i)); e.dataTransfer.effectAllowed = "move"; });
        li.addEventListener("dragend", function () { li.classList.remove("drag"); });
        li.addEventListener("dragover", function (e) { e.preventDefault(); li.classList.add("over"); });
        li.addEventListener("dragleave", function () { li.classList.remove("over"); });
        li.addEventListener("drop", function (e) { e.preventDefault(); li.classList.remove("over"); var from = +e.dataTransfer.getData("text/plain"); if (from !== i) move(from, i, false); });
      });
      if (animate && !K.RM) {
        Array.prototype.forEach.call(list.children, function (li) {
          var was = first.get(li.dataset.k); if (was == null) return;
          var dy = was - li.getBoundingClientRect().top;
          if (!dy) return;
          li.style.transition = "none"; li.style.transform = "translateY(" + dy + "px)";
          requestAnimationFrame(function () { li.style.transition = "transform .45s cubic-bezier(.3,0,.2,1)"; li.style.transform = ""; });
        });
      }
      measure();
    }
    function move(from, to, focusArrow) {
      var k = order.splice(from, 1)[0];
      order.splice(to, 0, k);
      render(true);
      if (focusArrow) { var li = list.children[to]; var btn = li && li.querySelectorAll(".parr")[to < from ? 0 : 1]; if (btn && !btn.disabled) btn.focus(); }
    }
    function measure() {
      var total = 0, hit = 0, broken = null;
      order.forEach(function (k) {
        var b = blocks.filter(function (x) { return x.k === k; })[0];
        if (b.changes && !broken) broken = b;
        if (!broken) hit += b.tokens;
        total += b.tokens;
      });
      bar.innerHTML = "";
      var acc = 0, segs = [];
      order.forEach(function (k) {
        var b = blocks.filter(function (x) { return x.k === k; })[0];
        var s = K.el("span", "pseg", null, bar);
        s.style.width = (100 * b.tokens / total) + "%";
        s.title = b.name;
        segs.push({ el: s, end: (acc += b.tokens) / total, cached: acc <= hit });
      });
      var share = hit / total, cost = (1 - share) + share * read;
      if (anim) anim();
      var hitTxt = Math.round(share * 100) + "%", costTxt = Math.round(cost * 100) + "%";
      function paint(p) {
        segs.forEach(function (sg) { sg.el.className = "pseg " + (sg.end <= p + 1e-6 ? (sg.cached ? "hit" : "miss") : ""); });
        scan.style.left = (p * 100) + "%";
      }
      rHit.textContent = "…"; rCost.textContent = "…";
      anim = K.tween(1100, function (t) { paint(t); }, function () {
        paint(1);
        rHit.textContent = hitTxt; rCost.textContent = costTxt;
        rBreak.textContent = broken ? broken.name : "none";
        says.innerHTML = share > 0.9
          ? "The repeated parts lead, so the next request reuses <b>" + hitTxt + "</b> of its input and pays about <b>" + costTxt + "</b> of list price for it."
          : share > 0
            ? "The match stops at <b>" + broken.name + "</b>. Everything after it is computed again, even the parts that never change."
            : "<b>" + broken.name + "</b> comes first and changes every time, so nothing matches. Every request pays full price, and no error says so.";
      });
    }
    best.addEventListener("click", function () { order = cfg.best.slice(); render(true); });
    worst.addEventListener("click", function () { order = cfg.start.slice(); render(true); });
    render(false);
    return {};
  };

  /* L2: requests flow through a gateway that meters tokens, routes by price and falls back on failure. */
  MODS.gwsim = function (root, cfg, K) {
    var ratio = cfg.ratio;
    var ctl = K.el("div", "row", null, root);
    var st = { rate: 5, small: 30, down: false };
    K.slider(ctl, "gw-rate", "Traffic", 1, 12, st.rate, function (v) { return v + " req/s"; }, function (v) { st.rate = v; });
    K.slider(ctl, "gw-small", "Routed to the small model", 0, 90, st.small, function (v) { return v + "%"; }, function (v) { st.small = v; });
    var downB = K.button(ctl, "Take the large model down");
    downB.setAttribute("aria-pressed", "false");
    downB.addEventListener("click", function () { st.down = !st.down; downB.setAttribute("aria-pressed", String(st.down)); downB.textContent = st.down ? "Bring the large model back" : "Take the large model down"; });
    var cvBox = K.el("div", null, null, root);
    var C = K.canvas(cvBox, 0.36, 260, 360);
    var ro = K.el("div", "readouts", null, root);
    var rSent = K.readout(ro, "requests sent"), rLim = K.readout(ro, "waiting on the token budget"), rRetry = K.readout(ro, "retries (billed twice)"), rSpend = K.readout(ro, "spend per minute, small-model tokens = 1", true), rLarge = K.readout(ro, "share of spend on the large model");
    K.el("p", "fig-note", "Simulation. The large model costs " + ratio + " times the small one per token, the input price ratio between Claude 3.5 Sonnet and Claude 3 Haiku. The gateway refills a fixed token budget each second.", root);
    var P = K.pal(root), rnd = K.rng(7);
    var dots = [], acc = 0, bucket = 1, sent = 0, retries = 0, spendWin = [], tAll = 0;
    function geo() {
      var w = C.w, h = C.h;
      return { app: { x: w * 0.08, y: h / 2 }, gw: { x: w * 0.42, y: h / 2, w: w * 0.16, h: h * 0.62 },
        prov: [{ x: w * 0.86, y: h * 0.2, name: "Large model" }, { x: w * 0.86, y: h * 0.5, name: "Small model" }, { x: w * 0.86, y: h * 0.8, name: "Fallback provider" }] };
    }
    function box(ctx, x, y, w, h, fill, stroke, label, sub) {
      ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = P.ink; ctx.font = "600 13px " + K.css("--f-ui"); ctx.textAlign = "center";
      ctx.fillText(label, x, y + (sub ? -2 : 4));
      if (sub) { ctx.fillStyle = P.muted; ctx.font = "400 11px " + K.css("--f-ui"); ctx.fillText(sub, x, y + 14); }
    }
    function frame(dt) {
      tAll += dt;
      var G = geo(), ctx = C.ctx;
      acc += dt * st.rate;
      while (acc >= 1) {
        acc -= 1;
        var tok = 0.2 + rnd() * rnd() * 1.6;
        dots.push({ x: G.app.x, y: G.app.y + (rnd() - 0.5) * 30, tok: tok, ph: "in", t: 0, route: -1, retry: false });
        sent++;
      }
      bucket = Math.min(1, bucket + dt * 0.55);
      var waiting = 0;
      dots.forEach(function (d) {
        if (d.ph === "in") {
          d.t += dt * 1.6;
          if (d.t >= 1) {
            var need = d.tok * 0.09;
            if (bucket >= need) { bucket -= need; d.ph = "route"; d.t = 0; d.route = rnd() * 100 < st.small ? 1 : 0; }
            else { d.ph = "wait"; }
          }
        } else if (d.ph === "wait") {
          waiting++;
          var need2 = d.tok * 0.09;
          if (bucket >= need2) { bucket -= need2; d.ph = "route"; d.t = 0; d.route = rnd() * 100 < st.small ? 1 : 0; }
        } else if (d.ph === "route") {
          d.t += dt * 1.3;
          if (d.t >= 1) {
            if (d.route === 0 && st.down && !d.retry) { d.ph = "bounce"; d.t = 0; d.retry = true; retries++; spendWin.push({ t: tAll, v: d.tok * ratio * 0.5, large: d.tok * ratio * 0.5 }); }
            else { d.ph = "done"; d.t = 0; var cost = d.tok * (d.route === 1 ? 1 : ratio); spendWin.push({ t: tAll, v: cost, large: d.route === 1 ? 0 : cost }); }
          }
        } else if (d.ph === "bounce") {
          d.t += dt * 1.8;
          if (d.t >= 1) { d.ph = "route"; d.t = 0; d.route = 2; }
        } else if (d.ph === "done") { d.t += dt * 2; }
      });
      spendWin = spendWin.filter(function (s) { return tAll - s.t < 4; });
      dots = dots.filter(function (d) { return !(d.ph === "done" && d.t > 1); });
      // draw
      ctx.clearRect(0, 0, C.w, C.h);
      G.prov.forEach(function (p, i) {
        ctx.strokeStyle = P.rule; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.moveTo(G.gw.x + G.gw.w / 2, G.gw.y); ctx.bezierCurveTo(G.gw.x + G.gw.w, G.gw.y, p.x - 120, p.y, p.x - 60, p.y); ctx.stroke(); ctx.setLineDash([]);
        var dead = i === 0 && st.down;
        box(ctx, p.x, p.y, 120, 46, dead ? P.surface : P.surface_2, dead ? P.bad : (i === 1 ? P.layer : P.ink_2), p.name, dead ? "returning errors" : (i === 0 ? ratio + "× price" : i === 1 ? "1× price" : "same price as large"));
      });
      ctx.strokeStyle = P.rule; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(G.app.x + 44, G.app.y); ctx.lineTo(G.gw.x - G.gw.w / 2, G.gw.y); ctx.stroke(); ctx.setLineDash([]);
      box(ctx, G.app.x, G.app.y, 88, 50, P.surface_2, P.ink_2, "Your app", "one key");
      box(ctx, G.gw.x, G.gw.y, G.gw.w, G.gw.h, P.surface_2, P.layer, "", "");
      ctx.fillStyle = P.ink; ctx.font = "600 13px " + K.css("--f-ui"); ctx.textAlign = "center"; ctx.fillText("AI gateway", G.gw.x, G.gw.y - G.gw.h / 2 + 20);
      // token bucket gauge
      var bx = G.gw.x - 12, by = G.gw.y + G.gw.h / 2 - 22, bh = G.gw.h * 0.6;
      ctx.fillStyle = P.surface; ctx.strokeStyle = P.rule; ctx.beginPath(); ctx.roundRect(bx, by - bh, 24, bh, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = bucket < 0.15 ? P.bad : P.layer;
      ctx.beginPath(); ctx.roundRect(bx + 3, by - 3 - (bh - 6) * bucket, 18, (bh - 6) * bucket, 3); ctx.fill();
      ctx.fillStyle = P.muted; ctx.font = "400 11px " + K.css("--f-ui"); ctx.textAlign = "center"; ctx.fillText("token budget", G.gw.x, by + 13);
      dots.forEach(function (d) {
        var x, y, gx = G.gw.x - G.gw.w / 2, gy = G.gw.y;
        if (d.ph === "in") { x = G.app.x + 44 + (gx - G.app.x - 44) * d.t; y = d.y + (gy - d.y) * d.t; }
        else if (d.ph === "wait") { var qi = dots.filter(function (o) { return o.ph === "wait"; }).indexOf(d); x = gx - 12 - (qi % 8) * 9; y = gy + 40 + Math.floor(qi / 8) * 9; }
        else {
          var p = G.prov[d.route < 0 ? 0 : d.route], t = d.ph === "done" ? 1 : d.ph === "bounce" ? 1 - d.t : d.t;
          var x0 = G.gw.x + G.gw.w / 2, x1 = p.x - 60;
          var u = 1 - t;
          x = u * u * u * x0 + 3 * u * u * t * (x0 + G.gw.w / 2) + 3 * u * t * t * (x1 - 60) + t * t * t * x1;
          y = u * u * u * gy + 3 * u * u * t * gy + 3 * u * t * t * p.y + t * t * t * p.y;
          if (d.ph === "done") x += d.t * 50;
        }
        ctx.globalAlpha = d.ph === "done" ? Math.max(0, 1 - d.t) : 1;
        ctx.fillStyle = d.ph === "wait" ? P.muted : d.retry ? P.bad : d.route === 1 ? P.layer : P.ink_2;
        ctx.beginPath(); ctx.arc(x, y, 2.5 + d.tok * 3.2, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      });
      var spend = spendWin.reduce(function (a, s) { return a + s.v; }, 0) / 4 * 60;
      var large = spendWin.reduce(function (a, s) { return a + s.large; }, 0) / 4 * 60;
      rSent.textContent = sent.toLocaleString("en-US");
      rLim.textContent = waiting;
      rRetry.textContent = retries;
      rSpend.textContent = Math.round(spend).toLocaleString("en-US");
      rLarge.textContent = spend > 0 ? Math.round(100 * Math.min(1, large / spend)) + "%" : "0%";
    }
    var loop = K.loop(frame);
    return {
      start: function () { P = K.pal(root); C.resize(); if (K.RM) { for (var i = 0; i < 90; i++) frame(0.05); } else loop.start(); },
      stop: loop.stop,
      resize: function () { C.resize(); },
      theme: function () { P = K.pal(root); }
    };
  };

  /* L3: prefill against decode on one pool, with chunked prefill, and on split pools. */
  MODS.pdsim = function (root, cfg, K) {
    var mode = 0;
    var top = K.el("div", "row", null, root);
    K.seg(top, ["One pool", "One pool, chunked prefill", "Split pools"], function (i) { mode = i; reset(); }, 0);
    var box = K.el("div", null, null, root);
    var C = K.canvas(box, 0.27, 230, 300);
    var lg = K.el("div", "legend-row", null, root);
    lg.innerHTML = '<span><i style="background:var(--token)"></i>prefill: reading a new prompt</span><span><i style="background:var(--l4)"></i>decode step: one token per running request</span><span><i style="background:var(--l3)"></i>KV cache moving between pools</span>';
    var ro = K.el("div", "readouts", null, root);
    var rGap = K.readout(ro, "longest pause between one user's tokens", true), rDone = K.readout(ro, "new prompts read"), rPools = K.readout(ro, "GPU pools");
    var says = K.el("p", "says", "", root);
    K.el("p", "fig-note", "Simulation in decode steps. Long prompts arrive at random; their prefill takes several steps.", root);
    var P = K.pal(root), rnd;
    var now, lanes, pend, toks, nextArr, done, packets;
    var WIN = 64, SPEED = 7;
    function reset() {
      rnd = K.rng(11);
      now = 0; pend = []; toks = []; nextArr = 3; done = 0; packets = [];
      lanes = mode === 2 ? [{ name: "Prefill pool", busy: 0, b: [] }, { name: "Decode pool", busy: 0, b: [] }] : [{ name: "One GPU pool", busy: 0, b: [] }];
      rPools.textContent = mode === 2 ? "2" : "1";
      says.innerHTML = [cfg.say0, cfg.say1, cfg.say2][mode];
    }
    function sched() {
      while (nextArr <= now + 2) { var len = 6 + Math.round(rnd() * 4); pend.push({ at: nextArr, len: len, rem: len }); nextArr += 18 + rnd() * 10; }
      var ready = function () { return pend.filter(function (p) { return p.at <= now; }); };
      if (mode < 2) {
        var L = lanes[0];
        while (L.busy <= now + 1) {
          var s = L.busy, r = ready();
          if (r.length && mode === 0) { var p = r[0]; pend.splice(pend.indexOf(p), 1); L.b.push({ s: s, len: p.len, k: "pre" }); L.busy = s + p.len; done++; }
          else if (r.length && mode === 1) {
            var q = r[0]; L.b.push({ s: s, len: 1, k: "dec" }); toks.push(s + 1);
            var c = Math.min(q.rem, q.len / 5); L.b.push({ s: s + 1, len: 0.5, k: "pre" }); q.rem -= c;
            if (q.rem <= 1e-6) { pend.splice(pend.indexOf(q), 1); done++; }
            L.busy = s + 1.5;
          } else { L.b.push({ s: s, len: 1, k: "dec" }); toks.push(s + 1); L.busy = s + 1; }
        }
      } else {
        var Pp = lanes[0], D = lanes[1];
        while (Pp.busy <= now + 1) {
          var rr = ready();
          if (rr.length) { var pp = rr[0]; pend.splice(pend.indexOf(pp), 1); Pp.b.push({ s: Pp.busy, len: pp.len, k: "pre" }); Pp.busy += pp.len; packets.push(Pp.busy); done++; }
          else { Pp.busy = Math.max(Pp.busy, now) + 0.5; }
        }
        while (D.busy <= now + 1) { D.b.push({ s: D.busy, len: 1, k: "dec" }); toks.push(D.busy + 1); D.busy += 1; }
      }
    }
    function frame(dt) {
      now += dt * SPEED;
      sched();
      var ctx = C.ctx, w = C.w, h = C.h, px = (w - 130) / WIN, right = w - 12, laneH = mode === 2 ? 46 : 60;
      ctx.clearRect(0, 0, w, h);
      ctx.font = "600 12px " + K.css("--f-ui"); ctx.textAlign = "left";
      var ys = mode === 2 ? [26, 106] : [40];
      lanes.forEach(function (L, li) {
        var y = ys[li];
        ctx.fillStyle = P.ink_2; ctx.fillText(L.name, 10, y + laneH / 2 + 4);
        ctx.fillStyle = P.surface; ctx.fillRect(118, y, right - 118, laneH);
        L.b = L.b.filter(function (b) { return b.s + b.len > now - WIN; });
        L.b.forEach(function (b) {
          if (b.s > now) return;
          var x0 = right - (now - b.s) * px, x1 = right - (now - Math.min(now, b.s + b.len)) * px;
          x0 = Math.max(118, x0);
          if (x1 <= x0) return;
          ctx.fillStyle = b.k === "pre" ? P.token : P.l4;
          ctx.beginPath(); ctx.roundRect(x0 + 1, y + 6, Math.max(1, x1 - x0 - 2), laneH - 12, 3); ctx.fill();
        });
      });
      if (mode === 2) {
        packets = packets.filter(function (t) { return t > now - 2; });
        packets.forEach(function (t) {
          if (t > now) return;
          var k = Math.min(1, (now - t) / 1.6);
          ctx.fillStyle = P.l3; ctx.beginPath(); ctx.arc(right - 8, ys[0] + laneH - 2 + k * (ys[1] - ys[0] - laneH + 8), 6, 0, 7); ctx.fill();
        });
      }
      // one user's token stream
      var ty = h - 40;
      ctx.fillStyle = P.ink_2; ctx.fillText("One user's tokens", 10, ty + 4);
      ctx.strokeStyle = P.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(118, ty); ctx.lineTo(right, ty); ctx.stroke();
      toks = toks.filter(function (t) { return t > now - WIN - 2; });
      var shown = toks.filter(function (t) { return t <= now && t > now - WIN; }).sort(function (a, b) { return a - b; });
      var gap = 1;
      shown.forEach(function (t, i) {
        ctx.fillStyle = P.l4; ctx.beginPath(); ctx.arc(right - (now - t) * px, ty, 4, 0, 7); ctx.fill();
        if (i) gap = Math.max(gap, t - shown[i - 1]);
      });
      if (shown.length) gap = Math.max(gap, now - shown[shown.length - 1]);
      ctx.fillStyle = P.muted; ctx.font = "400 11px " + K.css("--f-ui"); ctx.textAlign = "right"; ctx.fillText("now", right, h - 12); ctx.textAlign = "left"; ctx.fillText("earlier", 120, h - 12);
      rGap.textContent = gap.toFixed(1) + " steps";
      rDone.textContent = done;
    }
    var loop = K.loop(frame);
    reset();
    return {
      start: function () { P = K.pal(root); C.resize(); if (K.RM) { for (var i = 0; i < 200; i++) frame(0.05); } else loop.start(); },
      stop: loop.stop, resize: function () { C.resize(); }, theme: function () { P = K.pal(root); }
    };
  };

  /* L4: static batching against continuous batching on the same queue of requests. */
  MODS.batchsim = function (root, cfg, K) {
    var SLOTS = 6, MAXL = 40;
    var lens = (function () { var r = K.rng(5), a = []; for (var i = 0; i < 400; i++) a.push(4 + Math.round(Math.pow(r(), 1.6) * (MAXL - 4))); return a; })();
    var ctl = K.el("div", "btns", null, root);
    var playB = K.button(ctl, "Pause", "primary"), resetB = K.button(ctl, "Reset");
    var grid = K.el("div", "two even", null, root);
    function panel(name, sub) {
      var p = K.el("div", "bpanel", null, grid);
      var h = K.el("div", "fig-h", null, p);
      K.el("h4", "fig-title", name, h); K.el("p", "fig-sub", sub, h);
      var rows = [];
      for (var i = 0; i < SLOTS; i++) {
        var r = K.el("div", "slot", null, p);
        var tgt = K.el("span", "tgt", null, r), fill = K.el("span", "fill", null, r);
        rows.push({ r: r, tgt: tgt, fill: fill });
      }
      var ro = K.el("div", "readouts", null, p);
      return { rows: rows, done: K.readout(ro, "requests finished", true), use: K.readout(ro, "slot-steps doing work") };
    }
    var A = panel("Static batching", "A new batch starts only when every request in it has finished."), B = panel("Continuous batching (Orca)", "A finished request leaves at the next step, and a waiting one takes its seat.");
    var says = K.el("p", "says", "", root);
    var sims, acc = 0, paused = K.RM;
    function mk(cont) { return { cont: cont, next: 0, slots: [], busy: 0, total: 0, done: 0 }; }
    function reset() {
      sims = [mk(false), mk(true)];
      sims.forEach(function (s) { for (var i = 0; i < SLOTS; i++) s.slots.push({ L: lens[s.next++], p: 0 }); });
      draw();
    }
    function step(s) {
      var active = 0;
      s.slots.forEach(function (sl) {
        s.total++;
        if (sl && sl.p < sl.L) { sl.p++; s.busy++; active++; if (sl.p >= sl.L) s.done++; }
      });
      if (s.cont) s.slots = s.slots.map(function (sl) { return sl.p >= sl.L ? { L: lens[s.next++], p: 0, fresh: true } : sl; });
      else if (s.slots.every(function (sl) { return sl.p >= sl.L; })) s.slots = s.slots.map(function () { return { L: lens[s.next++], p: 0, fresh: true }; });
    }
    function draw() {
      [A, B].forEach(function (pn, k) {
        var s = sims[k];
        pn.rows.forEach(function (row, i) {
          var sl = s.slots[i];
          row.tgt.style.width = (100 * sl.L / MAXL) + "%";
          row.fill.style.width = (100 * sl.p / MAXL) + "%";
          row.r.classList.toggle("idle", sl.p >= sl.L);
          if (sl.fresh) { row.r.classList.remove("flash"); void row.r.offsetWidth; row.r.classList.add("flash"); sl.fresh = false; }
        });
        pn.done.textContent = s.done;
        pn.use.textContent = s.total ? Math.round(100 * s.busy / s.total) + "%" : "0%";
      });
      var a = sims[0].done, b = sims[1].done;
      says.innerHTML = b > a && a > 0 ? "Same requests, same GPU: continuous batching has finished <b>" + b + "</b> to static batching's <b>" + a + "</b>. Orca reported " + cfg.orca + " the throughput of FasterTransformer at equal latency." : "Both panels draw from the same queue. Watch the idle slots on the left.";
    }
    var loop = K.loop(function (dt) { acc += dt * 9; while (acc >= 1) { acc--; sims.forEach(step); } draw(); });
    playB.addEventListener("click", function () { paused = !paused; playB.textContent = paused ? "Play" : "Pause"; if (paused) loop.stop(); else loop.start(); });
    resetB.addEventListener("click", reset);
    reset();
    if (K.RM) { playB.textContent = "Play"; for (var i = 0; i < 120; i++) sims.forEach(step); draw(); }
    return { start: function () { if (!paused) loop.start(); }, stop: loop.stop };
  };

  /* L4: KV cache memory as blocks. Slabs reserve the longest answer; pages grow on demand. */
  MODS.pagedsim = function (root, cfg, K) {
    var COLS = 16, ROWS = 6, N = COLS * ROWS, MAXB = 10;
    var mode = 1, share = false;
    var top = K.el("div", "row", null, root);
    K.seg(top, ["Slabs (before)", "Pages (vLLM)"], function (i) { mode = i; reset(); }, 1);
    var shB = K.button(top, "Share the system prompt");
    shB.setAttribute("aria-pressed", "false");
    shB.addEventListener("click", function () { share = !share; shB.setAttribute("aria-pressed", String(share)); reset(); });
    var gridEl = K.el("div", "kvgrid", null, root);
    gridEl.setAttribute("role", "img");
    gridEl.setAttribute("aria-label", "GPU memory drawn as blocks of KV cache");
    var cells = [];
    for (var i = 0; i < N; i++) cells.push(K.el("i", null, null, gridEl));
    var lg = K.el("div", "legend-row", null, root);
    lg.innerHTML = '<span><i style="background:var(--layer)"></i>holds tokens</span><span><i class="hatch"></i>reserved, still empty</span><span><i style="background:var(--token)"></i>shared prefix block</span><span><i style="background:var(--surface);border:1px solid var(--rule)"></i>free</span>';
    var ro = K.el("div", "readouts", null, root);
    var rRun = K.readout(ro, "requests running", true), rWait = K.readout(ro, "requests waiting"), rUsed = K.readout(ro, "of memory holding tokens"), rRes = K.readout(ro, "reserved but empty");
    var says = K.el("p", "says", "", root);
    var owner, kind, reqs, queue, nextId, rnd, acc = 0;
    function reset() {
      rnd = K.rng(3); owner = new Array(N).fill(-1); kind = new Array(N).fill(""); reqs = []; queue = 0; nextId = 0;
      if (share && mode === 1) { owner[0] = -2; kind[0] = "shared"; }
      says.innerHTML = mode === 0 ? cfg.saySlab : share ? cfg.sayShare : cfg.sayPage;
      for (var t = 0; t < 14; t++) tick();
      draw();
    }
    function free() { var a = []; for (var i = 0; i < N; i++) if (owner[i] === -1) a.push(i); return a; }
    function admit() {
      var r = { id: nextId++, len: 2 + Math.round(rnd() * (MAXB - 2)), have: 0, cells: [], hold: 0 };
      if (mode === 0) {
        var run = 0;
        for (var i = 0; i < N; i++) {
          run = owner[i] === -1 ? run + 1 : 0;
          if (run === MAXB) { for (var j = i - MAXB + 1; j <= i; j++) { owner[j] = r.id; kind[j] = "resv"; r.cells.push(j); } reqs.push(r); return true; }
        }
        return false;
      }
      var f = free();
      if (!f.length) return false;
      if (share) r.have = 1;
      reqs.push(r); grow(r);
      return true;
    }
    function grow(r) {
      if (r.have >= r.len) return;
      if (mode === 0) { kind[r.cells[r.have]] = "used"; r.have++; return; }
      var f = free();
      if (!f.length) return;
      var c = f[Math.floor(rnd() * f.length)];
      owner[c] = r.id; kind[c] = "used"; r.cells.push(c); r.have++;
    }
    function tick() {
      queue = Math.min(12, queue + (rnd() < 0.9 ? 1 : 0) + (rnd() < 0.45 ? 1 : 0));
      while (queue > 0 && admit()) queue--;
      reqs.forEach(function (r) { if (r.have < r.len) { if (rnd() < 0.75) grow(r); } else r.hold++; });
      reqs = reqs.filter(function (r) {
        if (r.hold > 2) { r.cells.forEach(function (c) { owner[c] = -1; kind[c] = ""; }); return false; }
        return true;
      });
    }
    function draw() {
      var used = 0, resv = 0;
      cells.forEach(function (c, i) {
        var k = kind[i];
        c.className = k ? k + " c" + (owner[i] >= 0 ? owner[i] % 4 : 0) : "";
        if (k === "used" || k === "shared") used++;
        if (k === "resv") resv++;
      });
      rRun.textContent = reqs.length; rWait.textContent = queue;
      rUsed.textContent = Math.round(100 * used / N) + "%"; rRes.textContent = Math.round(100 * resv / N) + "%";
    }
    var loop = K.loop(function (dt) { acc += dt * 3.2; while (acc >= 1) { acc--; tick(); } draw(); });
    reset();
    return { start: function () { if (!K.RM) loop.start(); }, stop: loop.stop };
  };

  /* L5: CPU launch overhead against GPU work, in eager mode, compiled, and as one CUDA graph. */
  MODS.launch = function (root, cfg, K) {
    var modes = [
      { name: "Eager PyTorch", kernels: 8, k: 2, launches: 8 },
      { name: "torch.compile", kernels: 3, k: 5, launches: 3 },
      { name: "Compiled + CUDA graph", kernels: 3, k: 5, launches: 1 }
    ];
    var LAUNCH = 6, mode = 0;
    var top = K.el("div", "row", null, root);
    K.seg(top, modes.map(function (m) { return m.name; }), function (i) { mode = i; build(); t = 0; }, 0);
    K.el("span", "example", "Illustrative timings", top);
    var W = 900, H = 190;
    var s = K.sv("svg", { "class": "anim", viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Timeline of CPU kernel launches and GPU kernels for one decode step" }, root);
    var defs = K.sv("defs", null, s);
    var pat = K.sv("pattern", { id: "idle-hatch", width: 8, height: 8, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    K.sv("rect", { width: 8, height: 8, fill: "var(--surface)" }, pat);
    K.sv("line", { x1: 0, y1: 0, x2: 0, y2: 8, stroke: "var(--old)", "stroke-width": 3, opacity: .5 }, pat);
    var labels = [["CPU", 40], ["GPU", 110]];
    labels.forEach(function (l) { var tx = K.sv("text", { x: 10, y: l[1] + 26, "font-family": "var(--f-ui)", "font-weight": 600, "font-size": 15, fill: "var(--ink-2)" }, s); tx.textContent = l[0]; });
    var lane = K.sv("g", null, s), head = K.sv("line", { x1: 70, x2: 70, y1: 26, y2: 176, stroke: "var(--token)", "stroke-width": 2.5 }, s);
    var ro = K.el("div", "readouts", null, root);
    var rBusy = K.readout(ro, "GPU busy during the step", true), rEnd = K.readout(ro, "time to finish the step"), rLaunch = K.readout(ro, "CPU launches");
    var says = K.el("p", "says", "", root);
    var blocks = [], endT = 0, t = 0, scale = 1;
    function build() {
      var m = modes[mode];
      lane.innerHTML = ""; blocks = [];
      var cpu = 0, gpu = 0, gpuWork = 0;
      if (m.launches === 1) {
        blocks.push({ lane: 0, s: 0, e: LAUNCH, kind: "cpu" });
        gpu = LAUNCH;
        for (var i = 0; i < m.kernels; i++) { blocks.push({ lane: 1, s: gpu, e: gpu + m.k, kind: "gpu" }); gpu += m.k; gpuWork += m.k; }
      } else {
        for (var j = 0; j < m.kernels; j++) {
          blocks.push({ lane: 0, s: cpu, e: cpu + LAUNCH, kind: "cpu" }); cpu += LAUNCH;
          var st = Math.max(cpu, gpu);
          if (st > gpu) blocks.push({ lane: 1, s: gpu, e: st, kind: "idle" });
          blocks.push({ lane: 1, s: st, e: st + m.k, kind: "gpu" }); gpu = st + m.k; gpuWork += m.k;
        }
      }
      endT = gpu;
      scale = (W - 90) / 56;
      blocks.forEach(function (b) {
        b.el = K.sv("rect", { x: 70 + b.s * scale, y: b.lane ? 116 : 46, width: 0, height: 40, rx: 4,
          fill: b.kind === "gpu" ? "var(--layer)" : b.kind === "cpu" ? "var(--ink-2)" : "url(#idle-hatch)", opacity: b.kind === "idle" ? .9 : 1 }, lane);
      });
      rBusy.textContent = Math.round(100 * gpuWork / Math.max(1, endT)) + "%";
      rEnd.textContent = endT + " units";
      rLaunch.textContent = m.launches;
      says.innerHTML = cfg.says[mode];
    }
    function paint() {
      blocks.forEach(function (b) { var w = Math.max(0, Math.min(t, b.e) - b.s) * scale; b.el.setAttribute("width", Math.max(0, w - 2)); });
      head.setAttribute("x1", 70 + Math.min(t, endT) * scale); head.setAttribute("x2", 70 + Math.min(t, endT) * scale);
    }
    var loop = K.loop(function (dt) { t += dt * 14; if (t > endT + 12) t = 0; paint(); });
    build();
    if (K.RM) { t = 999; paint(); }
    return { start: function () { if (!K.RM) loop.start(); }, stop: loop.stop };
  };

  /* L6: where the attention scores live. Standard attention round-trips them through HBM; FlashAttention keeps them on chip. */
  MODS.flash = function (root, cfg, K) {
    var n = 6;
    var top = K.el("div", "row", null, root);
    K.slider(top, "fa-n", "Prompt length (tiles per side)", 4, 10, n, function (v) { return v + " × " + v; }, function (v) { n = v; build(); });
    var W = 900, H = 330;
    var s = K.sv("svg", { "class": "anim", viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Standard attention against FlashAttention: where the score matrix is stored" }, root);
    var ro = K.el("div", "readouts", null, root);
    var rStd = K.readout(ro, "score tiles moved through HBM, standard"), rFa = K.readout(ro, "score tiles moved through HBM, FlashAttention", true), rGrow = K.readout(ro, "growth when the prompt doubles, standard");
    var says = K.el("p", "says", cfg.say, root);
    var cols = [{ x: 20, name: "Standard attention" }, { x: 470, name: "FlashAttention" }];
    var parts = [], t = 0;
    function txt(x, y, str, size, weight, fill, anchor) { var e = K.sv("text", { x: x, y: y, "font-family": "var(--f-ui)", "font-size": size || 13, "font-weight": weight || 400, fill: fill || "var(--ink-2)", "text-anchor": anchor || "start" }, s); e.textContent = str; return e; }
    function build() {
      s.innerHTML = ""; parts = [];
      cols.forEach(function (c, ci) {
        txt(c.x, 22, c.name, 16, 700, "var(--ink)");
        K.sv("rect", { x: c.x, y: 36, width: 410, height: 104, rx: 8, fill: "color-mix(in srgb, var(--layer) 8%, var(--surface-2))", stroke: "var(--layer)", "stroke-width": 1.6 }, s);
        txt(c.x + 12, 56, "On-chip SRAM", 13, 700, "var(--layer)"); txt(c.x + 12, 74, "fast, small", 12, 400, "var(--muted)");
        K.sv("rect", { x: c.x, y: 176, width: 410, height: 140, rx: 8, fill: "var(--surface)", stroke: "var(--ink-2)", "stroke-width": 1.4 }, s);
        txt(c.x + 12, 196, "HBM", 13, 700, "var(--ink-2)"); txt(c.x + 50, 196, "large, slower to reach", 12, 400, "var(--muted)");
        ["Q", "K", "V"].forEach(function (lab, li) {
          txt(c.x + 14, 226 + li * 28, lab, 12, 700);
          for (var i = 0; i < 6; i++) K.sv("rect", { x: c.x + 30 + i * 18, y: 214 + li * 28, width: 14, height: 14, rx: 2, fill: "var(--l" + (li + 1) + ")", opacity: .75 }, s);
        });
        txt(c.x + 236, 214, ci ? "no score matrix stored here" : "score matrix S, then P", 12, 400, "var(--muted)");
        var cell = Math.min(24, 150 / n), gx = c.x + 236, gy = 222, sram = [], hbm = [];
        for (var r = 0; r < n; r++) for (var q = 0; q < n; q++) {
          if (!ci) hbm.push(K.sv("rect", { x: gx + q * cell, y: gy + r * cell * 0.55, width: cell - 2, height: cell * 0.55 - 2, rx: 1.5, fill: "var(--old)", opacity: .12 }, s));
          sram.push(K.sv("rect", { x: c.x + 236 + q * cell, y: 50 + r * cell * 0.55, width: cell - 2, height: cell * 0.55 - 2, rx: 1.5, fill: "var(--layer)", opacity: .1 }, s));
        }
        var pkt = K.sv("circle", { cx: c.x + 200, cy: 160, r: 6, fill: "var(--token)", opacity: 0 }, s);
        var arrow = K.sv("line", { x1: c.x + 200, x2: c.x + 200, y1: 140, y2: 176, stroke: "var(--token)", "stroke-width": 3, "stroke-dasharray": "4 4", opacity: .6 }, s);
        parts.push({ sram: sram, hbm: hbm, pkt: pkt, count: 0, x: c.x });
      });
      var std = 4 * n * n;
      rStd.textContent = std.toLocaleString("en-US"); rFa.textContent = "0"; rGrow.textContent = "4×";
      t = 0;
    }
    function frame(dt) {
      t += dt;
      var cyc = (t % 7) / 7, total = n * n;
      // standard: compute in SRAM, then write to HBM tile by tile, then read back
      var A = parts[0], B = parts[1];
      var k = Math.floor(cyc * total * 2) % (total * 2);
      A.sram.forEach(function (r, i) { r.setAttribute("opacity", i === k % total ? .95 : .1); });
      A.hbm.forEach(function (r, i) { r.setAttribute("opacity", k < total ? (i <= k ? .75 : .12) : (i === k - total ? .95 : .5)); });
      var down = k < total, pyA = down ? 140 + (cyc * total * 2 % 1) * 40 : 176 - (cyc * total * 2 % 1) * 40;
      A.pkt.setAttribute("cy", pyA); A.pkt.setAttribute("opacity", .95);
      // flash: tiles light up in SRAM and are never written; only the output row goes down
      var kb = Math.floor(cyc * total) % total;
      B.sram.forEach(function (r, i) { r.setAttribute("opacity", i === kb ? .95 : i < kb && Math.floor(i / n) === Math.floor(kb / n) ? .35 : .1); });
      var rowDone = (kb % n) === n - 1;
      B.pkt.setAttribute("opacity", rowDone ? .95 : 0);
      B.pkt.setAttribute("cy", 140 + ((cyc * total) % 1) * 40);
    }
    var loop = K.loop(frame);
    build();
    return { start: function () { if (!K.RM) loop.start(); else frame(1.3); }, stop: loop.stop };
  };

  /* L7: one decode step on H100 datasheet numbers. Step time = max(bytes / bandwidth, FLOPs / peak). */
  MODS.batchlab = function (root, data, K) {
    var BATCH = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
    var CTX = [512, 1024, 2048, 4096, 8192, 16384, 32768];
    var st = { m: 0, fp8: false, b: 0, c: 2 };
    var models = data.models || [];
    function gb(x) { return x >= 100e9 ? Math.round(x / 1e9) + " GB" : (x / 1e9).toFixed(1) + " GB"; }
    function ctxLabel(n) { return n >= 1024 ? (n / 1024) + "K" : String(n); }
    function money(x) { return x >= 10 ? "$" + x.toFixed(0) : x >= 1 ? "$" + x.toFixed(2) : "$" + x.toFixed(3); }
    function rate(x) { return x >= 1e4 ? (x / 1000).toFixed(1) + "K" : Math.round(x).toLocaleString("en-US"); }
    function calc(m, fp8, batch, ctx) {
      var wBytes = m.params * 1e9 * (fp8 ? 1 : 2), kvTok = m.kv_kb * 1000 * (fp8 ? 0.5 : 1), kvBytes = batch * ctx * kvTok, cap = data.mem * 1e9 * m.gpus;
      var tMem = (wBytes + kvBytes) / (data.bw * 1e12 * m.gpus), tCmp = 2 * m.params * 1e9 * batch / ((fp8 ? data.fp8 : data.bf16) * 1e12 * m.gpus);
      var t = Math.max(tMem, tCmp), tps = batch / t;
      return { w: wBytes, kv: kvBytes, cap: cap, fits: wBytes + kvBytes <= cap, t: t, tps: tps, user: 1 / t, busy: tCmp / t, memBound: tMem >= tCmp,
        cost: (data.price * m.gpus / 3600) / tps * 1e6, maxBatch: Math.floor((cap - wBytes) / (ctx * kvTok)) };
    }
    var ctl = K.el("div", "row", null, root);
    var segM = K.seg(ctl, models.map(function (m) { return m.name; }), function (i) { st.m = i; draw(); }, 0);
    var segP = K.seg(ctl, ["BF16", "FP8"], function (i) { st.fp8 = i === 1; draw(); }, 0);
    var sl = K.el("div", "row", null, root);
    var sB = K.slider(sl, "bl-batch", "Requests in the batch", 0, BATCH.length - 1, st.b, function (v) { return String(BATCH[v]); }, function (v) { st.b = v; draw(); });
    var sC = K.slider(sl, "bl-ctx", "Tokens per request (prompt + answer so far)", 0, CTX.length - 1, st.c, function (v) { return ctxLabel(CTX[v]); }, function (v) { st.c = v; draw(); });
    var memBox = K.el("div", "fig", null, root);
    var memHead = K.el("p", "fig-sub", "", memBox);
    var bar = K.el("div", "membar", null, memBox), bw = K.el("span", "mw", null, bar), bk = K.el("span", "mk", null, bar);
    var legend = K.el("p", "fig-note", "", memBox);
    var ro = K.el("div", "readouts", null, root);
    var vStep = K.readout(ro, "per decode step"), vTps = K.readout(ro, "tokens/s, whole batch", true), vUser = K.readout(ro, "tokens/s, each user"), vCost = K.readout(ro, "per million output tokens", true), vBusy = K.readout(ro, "tensor cores busy");
    var chartBox = K.el("div", "chart", null, root);
    var says = K.el("p", "says", "", root);
    says.setAttribute("aria-live", "polite");
    var autoT = null;
    function chart(m) {
      chartBox.innerHTML = "";
      var W = Math.round(Math.min(900, Math.max(320, chartBox.clientWidth || 640))), H = W < 480 ? 200 : 210, L = 52, R = 14, T = 16, B = 36;
      var s = K.sv("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Throughput against batch size" }, chartBox);
      var pts = BATCH.map(function (b) { return calc(m, st.fp8, b, CTX[st.c]); });
      var ymax = Math.max.apply(null, pts.map(function (p) { return p.tps; }));
      var step = Math.pow(10, Math.floor(Math.log10(ymax))), top = Math.ceil(ymax / step) * step;
      var x = function (i) { return L + i * (W - L - R) / (BATCH.length - 1); }, y = function (v) { return H - B - v / top * (H - B - T); };
      [0, top / 2, top].forEach(function (v) {
        K.sv("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), "class": v ? "gl" : "base" }, s);
        var t = K.sv("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", "class": "ax" }, s); t.textContent = rate(v);
      });
      BATCH.forEach(function (b, i) { var t = K.sv("text", { x: x(i), y: H - B + 18, "text-anchor": "middle", "class": "ax" }, s); t.textContent = b; });
      var cap = K.sv("text", { x: W - R, y: H - 2, "text-anchor": "end", "class": "ax" }, s); cap.textContent = "requests in the batch";
      var ok = "", bad = "", lastOk = -1;
      pts.forEach(function (p, i) { if (p.fits) { ok += (ok ? "L" : "M") + x(i) + " " + y(p.tps); lastOk = i; } });
      pts.forEach(function (p, i) { if (!p.fits) bad += (bad ? "L" : (lastOk >= 0 ? "M" + x(lastOk) + " " + y(pts[lastOk].tps) + "L" : "M")) + x(i) + " " + y(p.tps); });
      var area = ok ? ok + "L" + x(lastOk) + " " + y(0) + "L" + x(0) + " " + y(0) + "Z" : "";
      if (area) K.sv("path", { d: area, fill: "var(--layer)", opacity: .1 }, s);
      if (ok) K.sv("path", { d: ok, fill: "none", stroke: "var(--layer)", "stroke-width": 2.5 }, s);
      if (bad) K.sv("path", { d: bad, fill: "none", stroke: "var(--bad)", "stroke-width": 2, "stroke-dasharray": "5 4" }, s);
      if (lastOk >= 0 && lastOk < BATCH.length - 1) {
        var xm = (x(lastOk) + x(lastOk + 1)) / 2;
        K.sv("line", { x1: xm, x2: xm, y1: T, y2: H - B, stroke: "var(--bad)", "stroke-dasharray": "3 3" }, s);
        var mt = K.sv("text", { x: xm + 5, y: T + 12, "class": "ax", fill: "var(--bad)" }, s); mt.textContent = "memory full";
      }
      var cur = pts[st.b];
      K.sv("circle", { cx: x(st.b), cy: y(cur.tps), r: 6, fill: cur.fits ? "var(--layer)" : "var(--bad)", stroke: "var(--surface-2)", "stroke-width": 2 }, s);
    }
    function draw() {
      var m = models[st.m]; if (!m) return;
      var batch = BATCH[st.b], ctx = CTX[st.c], r = calc(m, st.fp8, batch, ctx);
      var scale = Math.max(r.cap, r.w + r.kv);
      bw.style.width = (100 * r.w / scale) + "%"; bk.style.width = (100 * r.kv / scale) + "%";
      bar.classList.toggle("over", !r.fits);
      bar.style.setProperty("--cap", (100 * r.cap / scale) + "%");
      memHead.textContent = "GPU memory: " + gb(r.w + r.kv) + " needed of " + gb(r.cap) + (m.gpus > 1 ? " across " + m.gpus + " GPUs" : "");
      legend.textContent = "Weights " + gb(r.w) + " · KV cache " + gb(r.kv) + (r.fits ? "" : " · does not fit");
      vStep.textContent = (r.t * 1000).toFixed(r.t < 0.01 ? 1 : 0) + " ms";
      vTps.textContent = rate(r.tps); vUser.textContent = rate(r.user); vCost.textContent = money(r.cost);
      var busy = r.busy * 100; vBusy.textContent = (busy < 1 ? busy.toFixed(1) : Math.round(busy)) + "%";
      ro.classList.toggle("dim", !r.fits);
      chart(m);
      if (!r.fits) says.innerHTML = "The KV cache for " + batch + " requests of " + ctxLabel(ctx) + " tokens does not fit: at most <b>" + Math.max(r.maxBatch, 0) + "</b> can share these GPUs. A real engine would queue the rest or preempt running requests.";
      else if (r.memBound) says.innerHTML = "<b>Memory-bound.</b> Each step reads " + gb(r.w + r.kv) + " to make " + batch + (batch === 1 ? " token" : " tokens") + ", so the tensor cores are busy " + vBusy.textContent + " of the time. Adding requests costs almost nothing until memory runs out.";
      else says.innerHTML = "<b>Compute-bound.</b> The batch finally gives the tensor cores enough math per byte read. More requests now raise total throughput slowly and slow every user.";
    }
    var demo = K.button(K.el("div", "btns", null, root), "Animate the batch filling up");
    demo.addEventListener("click", function () {
      if (autoT) { clearInterval(autoT); autoT = null; demo.textContent = "Animate the batch filling up"; return; }
      st.b = 0; sB.set(0); draw(); demo.textContent = "Stop";
      autoT = setInterval(function () { if (st.b >= BATCH.length - 1) { clearInterval(autoT); autoT = null; demo.textContent = "Animate the batch filling up"; return; } st.b++; sB.set(st.b); draw(); }, 700);
    });
    draw();
    return { stop: function () { if (autoT) { clearInterval(autoT); autoT = null; demo.textContent = "Animate the batch filling up"; } }, resize: function () { draw(); } };
  };

  /* Prefix cache: send a request into the tree and watch how much of it matches. */
  MODS.radix = function (root, cfg, K) {
    var read = cfg.read_pct / 100;
    var N = {
      root: { x: 50, y: 190, w: 70, t: "start", tok: 0 },
      sys: { x: 200, y: 190, w: 150, t: "System prompt + tools", tok: 3000 },
      aDoc: { x: 390, y: 70, w: 140, t: "User A: contract", tok: 20000 },
      a2: { x: 550, y: 70, w: 110, t: "A, turn 2", tok: 400 },
      a3: { x: 680, y: 70, w: 110, t: "A, turn 3", tok: 400 },
      bQ: { x: 390, y: 180, w: 140, t: "User B: question", tok: 300 },
      fs: { x: 390, y: 280, w: 140, t: "Few-shot examples", tok: 2500 }
    };
    var reqs = [
      { label: "User A, turn 4", path: ["root", "sys", "aDoc", "a2", "a3"], add: { from: "a3", x: 810, y: 70, w: 110, t: "A, turn 4", tok: 350 } },
      { label: "User B, next turn", path: ["root", "sys", "bQ"], add: { from: "bQ", x: 550, y: 180, w: 110, t: "B, turn 2", tok: 250 } },
      { label: "A brand-new user", path: ["root", "sys"], add: { from: "sys", x: 390, y: 360, w: 150, t: "New user's question", tok: 300 } },
      { label: "Timestamp first", path: ["root"], add: { from: "root", x: 200, y: 360, w: 170, t: "12:03, then everything", tok: 3320 }, miss: true }
    ];
    var top = K.el("div", "row", null, root);
    K.el("span", "fig-sub", "Send a request:", top);
    var btns = reqs.map(function (r, i) { var b = K.button(top, r.label); b.addEventListener("click", function () { user = true; send(i); }); return b; });
    K.el("span", "example", "Example token counts", top);
    var W = 940, H = 400;
    var s = K.sv("svg", { "class": "anim", viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "A prefix tree of cached prompts" }, root);
    var edgeG = K.sv("g", null, s), nodeG = K.sv("g", null, s), addG = K.sv("g", null, s);
    var parent = { sys: "root", aDoc: "sys", a2: "aDoc", a3: "a2", bQ: "sys", fs: "sys" };
    function right(n) { return n.x + n.w / 2; } function left(n) { return n.x - n.w / 2; }
    function edge(a, b, cls) {
      var d = "M" + right(a) + " " + a.y + " C" + (right(a) + 24) + " " + a.y + " " + (left(b) - 24) + " " + b.y + " " + left(b) + " " + b.y;
      return K.sv("path", { d: d, fill: "none", stroke: "var(--rule)", "stroke-width": 2, "class": cls || "" }, edgeG);
    }
    var edges = {}, boxes = {};
    Object.keys(parent).forEach(function (k) { edges[k] = edge(N[parent[k]], N[k]); });
    function node(n, g) {
      var grp = K.sv("g", null, g);
      var r = K.sv("rect", { x: n.x - n.w / 2, y: n.y - 20, width: n.w, height: 40, rx: n === N.root ? 20 : 7, fill: "var(--surface-2)", stroke: "var(--ink-2)", "stroke-width": 1.4 }, grp);
      var t = K.sv("text", { x: n.x, y: n.y + (n.tok ? -1 : 5), "text-anchor": "middle", "font-family": "var(--f-ui)", "font-weight": 600, "font-size": 13, fill: "var(--ink)" }, grp); t.textContent = n.t;
      if (n.tok) { var u = K.sv("text", { x: n.x, y: n.y + 14, "text-anchor": "middle", "font-family": "var(--f-mono)", "font-size": 10.5, fill: "var(--muted)" }, grp); u.textContent = n.tok.toLocaleString("en-US") + " tokens"; }
      return { g: grp, r: r };
    }
    Object.keys(N).forEach(function (k) { boxes[k] = node(N[k], nodeG); });
    var ro = K.el("div", "readouts", null, root);
    var rHit = K.readout(ro, "tokens matched in the cache", true), rNew = K.readout(ro, "tokens computed fresh"), rCost = K.readout(ro, "input cost against list price", true);
    var says = K.el("p", "says", "", root);
    var timers = [], cur = 0, user = false, cycle = null;
    function clear() {
      timers.forEach(clearTimeout); timers = [];
      addG.innerHTML = "";
      Object.keys(boxes).forEach(function (k) { boxes[k].r.setAttribute("fill", "var(--surface-2)"); boxes[k].r.setAttribute("stroke", "var(--ink-2)"); boxes[k].r.setAttribute("stroke-width", 1.4); boxes[k].g.setAttribute("opacity", .55); });
      Object.keys(edges).forEach(function (k) { edges[k].setAttribute("stroke", "var(--rule)"); edges[k].setAttribute("stroke-width", 2); });
    }
    function send(i) {
      cur = i; clear();
      btns.forEach(function (b, k) { b.setAttribute("aria-pressed", String(k === i)); });
      var r = reqs[i], dly = K.RM ? 0 : 380, hit = 0;
      r.path.forEach(function (k, j) {
        hit += N[k].tok;
        timers.push(setTimeout(function () {
          boxes[k].g.setAttribute("opacity", 1);
          boxes[k].r.setAttribute("fill", r.miss && k === "root" ? "var(--surface-2)" : "color-mix(in srgb, var(--layer) 18%, var(--surface-2))");
          boxes[k].r.setAttribute("stroke", "var(--layer)"); boxes[k].r.setAttribute("stroke-width", 2.4);
          if (edges[k]) { edges[k].setAttribute("stroke", "var(--layer)"); edges[k].setAttribute("stroke-width", 3.5); }
        }, j * dly));
      });
      timers.push(setTimeout(function () {
        var a = r.add, from = N[a.from];
        var e = edge(from, a);
        addG.appendChild(e);
        e.setAttribute("stroke", "var(--old)"); e.setAttribute("stroke-width", 3); e.setAttribute("stroke-dasharray", "6 4");
        var nb = node(a, addG);
        nb.r.setAttribute("fill", "color-mix(in srgb, var(--old) 16%, var(--surface-2))"); nb.r.setAttribute("stroke", "var(--old)"); nb.r.setAttribute("stroke-width", 2.4);
        var total = hit + a.tok, cost = (hit * read + a.tok) / total;
        rHit.textContent = hit.toLocaleString("en-US"); rNew.textContent = a.tok.toLocaleString("en-US"); rCost.textContent = Math.round(cost * 100) + "%";
        says.innerHTML = r.miss ? cfg.sayMiss : i === 0 ? cfg.sayA : i === 1 ? cfg.sayB : cfg.sayNew;
      }, r.path.length * dly + 120));
    }
    function auto() { if (K.RM || user) return; stopAuto(); cycle = setInterval(function () { if (user) { stopAuto(); return; } send((cur + 1) % reqs.length); }, 4600); }
    function stopAuto() { if (cycle) clearInterval(cycle); cycle = null; }
    send(0);
    return { start: auto, stop: function () { stopAuto(); } };
  };

  /* DeepSeek, one day: prefill and decode units at published sizes, cache hits flowing from SSD. */
  MODS.dsday = function (root, cfg, K) {
    var wrap = K.el("div", "dsgrid", null, root);
    var W = 900, H = 370, scroller = K.el("div", "ds-scroll", null, wrap);
    var s = K.sv("svg", { "class": "anim ds-svg", viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Animated diagram of one DeepSeek prefill unit of four nodes and one decode unit of eighteen nodes" }, scroller);
    var side = K.$(".dsside", root);
    if (side) wrap.appendChild(side);
    function txt(x, y, str, size, weight, fill, anchor) { var e = K.sv("text", { x: x, y: y, "font-family": "var(--f-ui)", "font-size": size || 12, "font-weight": weight || 400, fill: fill || "var(--ink-2)", "text-anchor": anchor || "start" }, s); e.textContent = str; return e; }
    K.sv("rect", { x: 120, y: 34, width: 220, height: 210, rx: 8, fill: "var(--surface-2)", stroke: "var(--token)", "stroke-width": 2 }, s);
    txt(120, 24, cfg.prefillLabel, 15, 700, "var(--ink)");
    K.sv("rect", { x: 400, y: 34, width: 490, height: 300, rx: 8, fill: "var(--surface-2)", stroke: "var(--l1)", "stroke-width": 2 }, s);
    txt(400, 24, cfg.decodeLabel, 15, 700, "var(--ink)");
    K.sv("rect", { x: 120, y: 270, width: 220, height: 64, rx: 8, fill: "var(--surface)", stroke: "var(--ink-2)", "stroke-width": 1.4 }, s);
    txt(132, 296, "3FS · KV cache on SSD", 14, 700, "var(--ink)");
    txt(132, 318, cfg.hitLine, 13, 400, "var(--muted)");
    txt(4, 128, "Requests", 14, 600); txt(4, 146, "arrive", 13, 400, "var(--muted)");
    txt(W - 4, 360, "output tokens leave →", 13, 400, "var(--muted)", "end");
    var gpus = [], pre = [], dec = [];
    for (var n = 0; n < 4; n++) { var row = []; for (var g = 0; g < 8; g++) row.push(K.sv("rect", { x: 136 + g * 24, y: 52 + n * 46, width: 18, height: 30, rx: 3, fill: "var(--token)", opacity: .35 }, s)); pre.push(row); }
    for (var c = 0; c < 3; c++) for (var r = 0; r < 6; r++) {
      var nd = [];
      for (var q = 0; q < 8; q++) nd.push(K.sv("rect", { x: 416 + c * 158 + q * 18, y: 50 + r * 46, width: 14, height: 30, rx: 2.5, fill: "var(--l1)", opacity: .3 }, s));
      dec.push(nd);
    }
    var parts = [], acc = 0, rnd = K.rng(9), hit = cfg.hit / 100;
    function flash(rects) { rects.forEach(function (rc) { rc._f = 1; }); }
    function spawn() {
      var node = Math.floor(rnd() * 4);
      parts.push({ kind: "in", t: 0, x0: 60, y0: 136, x1: 128, y1: 67 + node * 46, node: node });
      if (rnd() < hit) parts.push({ kind: "hit", t: 0, x0: 230, y0: 270, x1: 230, y1: 236, node: node, col: "var(--layer)" });
    }
    var loop = K.loop(function (dt) {
      acc += dt * 2.4;
      while (acc >= 1) { acc--; spawn(); }
      parts.forEach(function (p) {
        p.t += dt * (p.kind === "out" ? 1.2 : 1.4);
        if (p.t >= 1 && !p.done) {
          p.done = true;
          if (p.kind === "in") { flash(pre[p.node]); var d = Math.floor(rnd() * 18); parts.push({ kind: "kv", t: 0, x0: 340, y0: 67 + p.node * 46, x1: 416 + (d % 3) * 158, y1: 65 + Math.floor(d / 3) * 46, node: d }); }
          else if (p.kind === "hit") flash(pre[p.node]);
          else if (p.kind === "kv") { flash(dec[p.node]); for (var k = 0; k < 3; k++) parts.push({ kind: "out", t: -k * 0.25, x0: 416 + (p.node % 3) * 158 + 140, y0: 65 + Math.floor(p.node / 3) * 46, x1: W - 6, y1: 340 }); }
        }
        if (!p.el) p.el = K.sv("circle", { r: p.kind === "out" ? 3 : 5, fill: p.kind === "kv" ? "var(--l3)" : p.kind === "hit" ? "var(--layer)" : p.kind === "out" ? "var(--l1)" : "var(--token)" }, s);
        var t = Math.max(0, Math.min(1, p.t)), e = t * t * (3 - 2 * t);
        p.el.setAttribute("cx", p.x0 + (p.x1 - p.x0) * e); p.el.setAttribute("cy", p.y0 + (p.y1 - p.y0) * e - Math.sin(t * Math.PI) * (p.kind === "kv" ? 28 : 0));
        p.el.setAttribute("opacity", p.t < 0 ? 0 : p.kind === "out" ? 1 - t : 1);
      });
      parts = parts.filter(function (p) { if (p.t >= 1 && p.done) { if (p.el) p.el.remove(); return false; } return true; });
      pre.concat(dec).forEach(function (rects) { rects.forEach(function (rc) { if (rc._f) { rc._f = Math.max(0, rc._f - dt * 1.8); rc.setAttribute("opacity", .3 + .7 * rc._f); } }); });
    });
    var arc = K.$(".donut-arc", root);
    return {
      start: function () {
        if (arc) { var L = 2 * Math.PI * 52; arc.style.strokeDasharray = L; K.tween(1200, function (t) { arc.style.strokeDashoffset = L * (1 - hit * t); }); }
        if (!K.RM) loop.start();
      },
      stop: loop.stop
    };
  };

  /* Silent failures: every panel stays green while cache hits fall and time to first token climbs. */
  MODS.dash = function (root, cfg, K) {
    var grid = K.el("div", "dash", null, root);
    var tiles = K.el("div", "dtiles", null, grid);
    function tile(name, html) { var t = K.el("div", "dtile", null, tiles); K.el("small", null, name, t); var b = K.el("div", "dval", null, t); b.innerHTML = html; return b; }
    var gauge = tile("GPU busy", '<svg viewBox="0 0 100 56" class="gauge"><path d="M10 50 A40 40 0 0 1 90 50" class="g-bg"/><path d="M50 10 A40 40 0 0 1 90 50" class="g-ok"/><line x1="50" y1="50" x2="80" y2="24" class="g-n"/></svg>');
    tile("HTTP status", '<span class="okc">✓</span> all OK');
    tile("Errors", '<span class="okc">✓</span> none');
    tile("Replicas up", '<span class="dots"><i></i><i></i><i></i></span>');
    var right = K.el("div", "dcharts", null, grid);
    var C = K.canvas(right, 0.56, 240, 340);
    var ctl = K.el("div", "btns", null, root);
    var dep = K.button(ctl, "Deploy the timestamp-first template", "primary"), back = K.button(ctl, "Roll back");
    back.disabled = true;
    var status = K.el("p", "says", cfg.calm, root);
    K.el("p", "fig-note", "Simulation of the failure pattern. The four left panels read the same in both states.", root);
    var P = K.pal(root), rnd = K.rng(4);
    var hist = [], bad = false, marks = [], t = 0, hit = 0.82, ttft = 0.22, needle = K.$(".g-n", gauge);
    dep.addEventListener("click", function () { bad = true; marks.push({ t: t, label: "template deploy" }); dep.disabled = true; back.disabled = false; status.innerHTML = cfg.broken; });
    back.addEventListener("click", function () { bad = false; marks.push({ t: t, label: "rollback" }); dep.disabled = false; back.disabled = true; status.innerHTML = cfg.fixed; });
    function line(ctx, x0, y0, w, h, key, color, label) {
      ctx.fillStyle = P.ink_2; ctx.font = "600 12.5px " + K.css("--f-ui"); ctx.textAlign = "left"; ctx.fillText(label, x0, y0 - 8);
      ctx.strokeStyle = P.rule; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, w, h);
      ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.beginPath();
      hist.forEach(function (p, i) { var x = x0 + w - (t - p.t) / 30 * w, y = y0 + h - p[key] * h; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.stroke();
      var last = hist[hist.length - 1];
      if (last) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x0 + w, y0 + h - last[key] * h, 4, 0, 7); ctx.fill(); }
      marks.forEach(function (m) {
        var x = x0 + w - (t - m.t) / 30 * w; if (x < x0) return;
        ctx.strokeStyle = P.token; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = P.token_ink; ctx.font = "500 11px " + K.css("--f-ui"); ctx.fillText(m.label, Math.min(x + 4, x0 + w - 90), y0 + 13);
      });
    }
    function frame(dt) {
      t += dt;
      var hT = bad ? 0.06 : 0.82, fT = bad ? 0.78 : 0.22;
      hit += (hT - hit) * dt * 0.9; ttft += (fT - ttft) * dt * 0.7;
      hist.push({ t: t, hit: Math.max(0, Math.min(1, hit + (rnd() - .5) * .05)), ttft: Math.max(0, Math.min(1, ttft + (rnd() - .5) * .05)) });
      hist = hist.filter(function (p) { return t - p.t < 30; });
      marks = marks.filter(function (m) { return t - m.t < 30; });
      var ctx = C.ctx, w = C.w, h = C.h, pad = 12, ch = (h - 70) / 2;
      ctx.clearRect(0, 0, w, h);
      line(ctx, pad, 26, w - pad * 2, ch, "hit", P.layer === P.bad ? P.l3 : P.l3, "Prefix-cache hit rate (higher is better)");
      line(ctx, pad, 26 + ch + 38, w - pad * 2, ch, "ttft", P.bad, "Time to first token (lower is better)");
      if (needle) needle.setAttribute("x2", 78 + Math.sin(t * 3) * 2);
    }
    var loop = K.loop(frame);
    return {
      start: function () { P = K.pal(root); C.resize(); if (K.RM) { for (var i = 0; i < 300; i++) frame(0.1); } else loop.start(); },
      stop: loop.stop, resize: function () { C.resize(); }, theme: function () { P = K.pal(root); }
    };
  };

  /* Cost model: your bill, your token mix, three levers; every assumption is editable and every step shows its formula. */
  MODS.billcut = function (root, cfg, K) {
    var st = { bill: 50000, s: 50, h: 0, r: 0, a: 0, read: cfg.read_pct, k: cfg.small_ratio, disc: cfg.batch_discount };
    var inBox = K.el("div", "billin", null, root);
    var lab = K.el("label", "ctl", null, inBox); lab.setAttribute("for", "bc-bill");
    K.el("span", null, "Your monthly API bill, in dollars", lab);
    var inp = K.el("input", "num", null, lab); inp.id = "bc-bill"; inp.type = "number"; inp.min = "100"; inp.step = "100"; inp.value = st.bill; inp.inputMode = "numeric";
    var pres = K.el("div", "btns", null, inBox);
    [5000, 50000, 500000].forEach(function (v) { var b = K.button(pres, "$" + (v >= 1000 ? (v / 1000) + "K" : v)); b.classList.add("mini"); b.addEventListener("click", function () { inp.value = v; st.bill = v; draw(); }); });
    K.el("span", "example", "Example starting value; type your own", inBox);
    inp.addEventListener("input", function () { var v = parseFloat(inp.value); if (v > 0) { st.bill = v; draw(); } });
    var ctl = K.el("div", "billctl", null, root);
    K.slider(ctl, "bc-s", "Input tokens' share of the bill", 5, 95, st.s, function (v) { return v + "%"; }, function (v) { st.s = v; draw(); }, "Agents and document chat lean toward input.");
    var hs = K.slider(ctl, "bc-h", "Input tokens served from the prompt cache", 0, 95, st.h, function (v) { return v + "%"; }, function (v) { st.h = v; draw(); }, "DeepSeek's production service reported " + cfg.ds_hit + "%.");
    var hsB = K.button(ctl.lastChild, "Use " + cfg.ds_hit + "%"); hsB.classList.add("mini");
    hsB.addEventListener("click", function (e) { e.preventDefault(); st.h = Math.round(cfg.ds_hit); hs.set(st.h); draw(); });
    K.slider(ctl, "bc-r", "Requests routed to a smaller model", 0, 90, st.r, function (v) { return v + "%"; }, function (v) { st.r = v; draw(); }, "Easy requests: classification, extraction, short answers.");
    K.slider(ctl, "bc-a", "Work that can wait for a batch API", 0, 90, st.a, function (v) { return v + "%"; }, function (v) { st.a = v; draw(); }, "Evaluations, backfills, nightly summaries.");
    var det = K.el("details", "assume", null, root);
    K.el("summary", null, "Pricing assumptions (editable)", det);
    var ag = K.el("div", "billctl", null, det);
    K.slider(ag, "bc-read", "Cache read price, % of the input price", 5, 50, st.read, function (v) { return v + "%"; }, function (v) { st.read = v; draw(); }, "Anthropic bills cache reads at " + cfg.read_pct + "%.");
    K.slider(ag, "bc-k", "Large model price ÷ small model price", 2, 30, st.k, function (v) { return v + "×"; }, function (v) { st.k = v; draw(); }, "Claude 3.5 Sonnet's input price was " + cfg.small_ratio + "× Claude 3 Haiku's.");
    K.slider(ag, "bc-disc", "Batch API discount", 10, 70, st.disc, function (v) { return v + "%"; }, function (v) { st.disc = v; draw(); }, "Anthropic's Message Batches API: " + cfg.batch_discount + "% off.");
    var preset = K.button(K.el("div", "btns", null, root), "Show one way to halve it", "primary");
    var fig = K.el("div", "chart", null, root);
    var says = K.el("p", "says", "", root);
    says.setAttribute("aria-live", "polite");
    var math = K.el("ol", "billmath", null, root);
    var rows = null, cur = null, stopT = null, scaleB = null;
    function usd(x) { return "$" + (x >= 1e6 ? (x / 1e6).toFixed(2) + "M" : x >= 1000 ? (x / 1000).toFixed(x >= 10000 ? 1 : 2) + "K" : Math.round(x)); }
    function model() {
      var B = st.bill, read = st.read / 100, k = st.k, disc = st.disc / 100;
      var I0 = B * st.s / 100, O0 = B - I0, I1 = I0 * (1 - (st.h / 100) * (1 - read)), c1 = I1 + O0;
      var c2 = c1 * (1 - (st.r / 100) * (1 - 1 / k)), c3 = c2 * (1 - (st.a / 100) * disc);
      return { v: [[0, B], [c1, B], [c2, c1], [c3, c2], [0, c3]], I0: I0, I1: I1, c1: c1, c2: c2, c3: c3 };
    }
    var labels = ["Today", "Prompt cache", "Smaller model", "Batch API", "New bill"];
    function build() {
      fig.innerHTML = ""; scaleB = st.bill;
      var W = Math.round(Math.min(860, Math.max(320, fig.clientWidth || 640))), rowH = 36, L = W < 480 ? 104 : 128, R = 78, H = labels.length * rowH + 30;
      var s = K.sv("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Waterfall of the monthly bill after each lever" }, fig);
      var x = function (v) { return L + v / scaleB * (W - L - R); };
      var hl = K.sv("line", { x1: x(scaleB / 2), x2: x(scaleB / 2), y1: 2, y2: H - 22, stroke: "var(--ink)", "stroke-dasharray": "4 3" }, s);
      var ht = K.sv("text", { x: x(scaleB / 2), y: H - 6, "text-anchor": "middle", "class": "ax" }, s); ht.textContent = "half: " + usd(scaleB / 2);
      rows = labels.map(function (l, i) {
        var y = 8 + i * rowH;
        var t = K.sv("text", { x: L - 10, y: y + 19, "text-anchor": "end", "class": "axl" }, s); t.textContent = l;
        var r = K.sv("rect", { y: y + 4, height: rowH - 14, rx: 3, fill: i === 0 || i === 4 ? "var(--old)" : "var(--layer)", opacity: i === 0 ? .7 : i === 4 ? 1 : .55 }, s);
        var v = K.sv("text", { y: y + 19, "class": "val" }, s);
        return { r: r, v: v };
      });
      rows.x = x;
    }
    function paint(vals) {
      rows.forEach(function (row, i) {
        var a = vals[i][0], b = vals[i][1], x0 = rows.x(a), x1 = rows.x(b);
        row.r.setAttribute("x", x0); row.r.setAttribute("width", Math.max(i === 0 || i === 4 ? 1 : 0, x1 - x0));
        if (i === 4) row.r.setAttribute("fill", b <= scaleB / 2 + 0.5 ? "var(--layer)" : "var(--old)");
        row.v.setAttribute("x", x1 + 6);
        row.v.textContent = i === 0 || i === 4 ? usd(b) : (b - a > 0.005 * scaleB ? "−" + usd(b - a) : "");
      });
    }
    function draw() {
      if (scaleB !== st.bill) { build(); cur = null; }
      var m = model(), target = m.v, from = cur || target;
      if (stopT) stopT();
      stopT = K.tween(450, function (t) { var v = from.map(function (p, i) { return [p[0] + (target[i][0] - p[0]) * t, p[1] + (target[i][1] - p[1]) * t]; }); cur = v; paint(v); });
      var pct = Math.round(100 * (st.bill - m.c3) / st.bill);
      says.innerHTML = m.c3 <= st.bill / 2 ? "New bill: <b>" + usd(m.c3) + "</b> a month, " + pct + "% lower, with no new hardware." : "New bill: <b>" + usd(m.c3) + "</b> a month, " + pct + "% lower. Still " + usd(m.c3 - st.bill / 2) + " above half.";
      math.innerHTML = "";
      [["Input spend", "bill × input share", usd(st.bill) + " × " + st.s + "% = " + usd(m.I0)],
       ["After the cache", "input × (1 − hit rate × (1 − read price))", usd(m.I0) + " × (1 − " + st.h + "% × " + (100 - st.read) + "%) = " + usd(m.I1)],
       ["After routing", "total × (1 − routed × (1 − 1 ÷ price ratio))", usd(m.c1) + " × (1 − " + st.r + "% × " + (100 - 100 / st.k).toFixed(1) + "%) = " + usd(m.c2)],
       ["After batching", "total × (1 − batchable × discount)", usd(m.c2) + " × (1 − " + st.a + "% × " + st.disc + "%) = " + usd(m.c3)]].forEach(function (r) {
        var li = K.el("li", null, null, math); K.el("b", null, r[0], li); K.el("code", null, r[1], li); K.el("span", null, r[2], li);
      });
    }
    preset.addEventListener("click", function () {
      [["bc-h", "h", Math.round(cfg.ds_hit)], ["bc-r", "r", 30], ["bc-a", "a", 20]].forEach(function (p, i) {
        setTimeout(function () { st[p[1]] = p[2]; var e = K.$("#" + p[0], root); e.value = p[2]; e.dispatchEvent(new Event("input")); }, K.RM ? 0 : i * 600);
      });
    });
    build(); draw();
    return { resize: function () { build(); paint(cur || model().v); } };
  };

  /* Learning modules: phases, KV calculator, latency, roofline, glossary and design drills. */

  /* Prefill reads the whole prompt in one pass; decode adds one token per pass and reads every cached entry. */
  MODS.phases = function (root, cfg, K) {
    var P = cfg.prompt, O = cfg.output, N = P.length + O.length;
    var ctl = K.el("div", "btns", null, root);
    var playB = K.button(ctl, "Pause", "primary"), stepB = K.button(ctl, "Step"), resetB = K.button(ctl, "Restart");
    var W = 920, H = 340, s = K.sv("svg", { "class": "anim", viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Prefill processes the prompt in one pass; decode adds one token per pass" }, root);
    function txt(x, y, str, size, weight, fill, anchor) { var e = K.sv("text", { x: x, y: y, "font-family": "var(--f-ui)", "font-size": size || 13, "font-weight": weight || 400, fill: fill || "var(--ink-2)", "text-anchor": anchor || "start" }, s); e.textContent = str; return e; }
    txt(10, 24, "PROMPT TOKENS", 11.5, 700, "var(--muted)"); txt(470, 24, "OUTPUT TOKENS", 11.5, 700, "var(--muted)");
    txt(10, 214, "KV CACHE IN GPU MEMORY", 11.5, 700, "var(--muted)");
    var bw = 58, gap = 6, toks = [], slots = [], lines = K.sv("g", null, s);
    P.concat(O).forEach(function (w, i) {
      var x = i < P.length ? 10 + i * (bw + gap) : 470 + (i - P.length) * (bw + gap);
      var g = K.sv("g", null, s);
      var r = K.sv("rect", { x: x, y: 36, width: bw, height: 38, rx: 6, fill: "var(--surface)", stroke: "var(--rule)", "stroke-width": 1.4 }, g);
      var t = K.sv("text", { x: x + bw / 2, y: 60, "text-anchor": "middle", "font-family": "var(--f-mono)", "font-size": 12, fill: "var(--muted)" }, g); t.textContent = w;
      toks.push({ r: r, t: t, x: x + bw / 2 });
      var sx = 10 + i * ((W - 20) / N);
      var sr = K.sv("rect", { x: sx, y: 226, width: (W - 20) / N - 4, height: 50, rx: 4, fill: "var(--surface)", stroke: "var(--rule)" }, s);
      slots.push({ r: sr, x: sx + ((W - 20) / N - 4) / 2 });
    });
    var label = txt(W / 2, 306, "", 16, 600, "var(--ink)", "middle"), sub = txt(W / 2, 328, "", 13, 400, "var(--muted)", "middle");
    var ro = K.el("div", "readouts", null, root);
    var rPass = K.readout(ro, "forward passes", true), rKV = K.readout(ro, "KV entries stored"), rOut = K.readout(ro, "tokens out"), rRead = K.readout(ro, "KV entries read this pass");
    var step = -1, timer = null, paused = K.RM;
    function draw() {
      lines.innerHTML = "";
      var filled = step < 0 ? 0 : P.length + step, cur = step;
      toks.forEach(function (tk, i) {
        var isP = i < P.length, shown = isP || i - P.length < step;
        var active = (cur === 0 && isP) || (cur > 0 && i === P.length + cur - 1);
        tk.r.setAttribute("fill", active ? "color-mix(in srgb, var(--layer) 22%, var(--surface-2))" : shown && !isP ? "var(--surface-2)" : "var(--surface)");
        tk.r.setAttribute("stroke", active ? "var(--layer)" : "var(--rule)");
        tk.r.setAttribute("stroke-width", active ? 2.4 : 1.4);
        tk.t.setAttribute("fill", isP || shown ? "var(--ink)" : "transparent");
      });
      slots.forEach(function (sl, i) {
        sl.r.setAttribute("fill", i < filled ? (i < P.length ? "color-mix(in srgb, var(--token) 55%, var(--surface))" : "color-mix(in srgb, var(--layer) 55%, var(--surface))") : "var(--surface)");
      });
      if (cur === 0) {
        P.forEach(function (_, i) { K.sv("line", { x1: toks[i].x, y1: 76, x2: slots[i].x, y2: 224, stroke: "var(--token)", "stroke-width": 1.6, opacity: .7 }, lines); });
        label.textContent = "Prefill: one forward pass over all " + P.length + " prompt tokens at once";
        sub.textContent = "Every prompt token is computed in parallel, and each writes its keys and values to the cache.";
      } else if (cur > 0) {
        var me = toks[P.length + cur - 1];
        for (var i = 0; i < P.length + cur - 1; i++) K.sv("line", { x1: slots[i].x, y1: 224, x2: me.x, y2: 76, stroke: "var(--layer)", "stroke-width": 1, opacity: .35 }, lines);
        label.textContent = "Decode step " + cur + ": one new token";
        sub.textContent = "The new token attends to every cached entry, then adds its own. Weights are read again for this one token.";
      } else { label.textContent = "Press Play or Step"; sub.textContent = "A prompt arrives with " + P.length + " tokens."; }
      rPass.textContent = Math.max(0, cur + 1); rKV.textContent = filled; rOut.textContent = Math.max(0, cur);
      rRead.textContent = cur <= 0 ? "0" : String(P.length + cur - 1);
    }
    function adv() { step = step >= O.length ? -1 : step + 1; draw(); }
    function start() { if (timer || paused) return; timer = setInterval(adv, 1100); }
    function stop() { clearInterval(timer); timer = null; }
    playB.addEventListener("click", function () { paused = !paused; playB.textContent = paused ? "Play" : "Pause"; if (paused) stop(); else start(); });
    stepB.addEventListener("click", function () { paused = true; playB.textContent = "Play"; stop(); adv(); });
    resetB.addEventListener("click", function () { step = -1; draw(); });
    if (K.RM) playB.textContent = "Play";
    draw();
    return { start: start, stop: stop };
  };

  /* KV cache size from model shape, context length and concurrency, against H100 memory. */
  MODS.kvcalc = function (root, cfg, K) {
    var CTX = [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072], REQ = [1, 2, 4, 8, 16, 32, 64, 128, 256];
    var st = { m: 1, c: 6, r: 4 };
    var top = K.el("div", "row", null, root);
    K.seg(top, cfg.models.map(function (m) { return m.name; }), function (i) { st.m = i; draw(); }, st.m);
    var sl = K.el("div", "row", null, root);
    function ctxL(n) { return n >= 1024 ? (n / 1024) + "K" : String(n); }
    K.slider(sl, "kv-ctx", "Tokens per request", 0, CTX.length - 1, st.c, function (v) { return ctxL(CTX[v]); }, function (v) { st.c = v; draw(); });
    K.slider(sl, "kv-req", "Requests in memory at once", 0, REQ.length - 1, st.r, function (v) { return String(REQ[v]); }, function (v) { st.r = v; draw(); });
    var formula = K.el("p", "formula", "", root);
    var cells = K.el("div", "gpucells", null, root);
    var ro = K.el("div", "readouts", null, root);
    var rTok = K.readout(ro, "KV cache per token"), rReq = K.readout(ro, "per request"), rAll = K.readout(ro, "for all requests", true), rGpu = K.readout(ro, "H100s of memory, KV alone", true);
    var says = K.el("p", "says", "", root);
    function gb(b) { return b >= 1e12 ? (b / 1e12).toFixed(2) + " TB" : b >= 1e9 ? (b / 1e9).toFixed(b >= 100e9 ? 0 : 1) + " GB" : (b / 1e6).toFixed(0) + " MB"; }
    function draw() {
      var m = cfg.models[st.m], per = m.kv_kb * 1000, ctx = CTX[st.c], req = REQ[st.r];
      var one = per * ctx, all = one * req, gpus = all / (cfg.mem * 1e9);
      formula.innerHTML = m.formula;
      rTok.textContent = Math.round(per / 1000).toLocaleString("en-US") + " KB"; rReq.textContent = gb(one); rAll.textContent = gb(all);
      rGpu.textContent = gpus < 0.1 ? gpus.toFixed(2) : gpus.toFixed(1);
      cells.innerHTML = "";
      var n = Math.min(24, Math.max(1, Math.ceil(gpus))), rest = gpus;
      for (var i = 0; i < n; i++) {
        var c = K.el("div", "gcell", null, cells), f = K.el("i", null, null, c);
        var share = Math.max(0, Math.min(1, rest)); rest -= 1;
        f.style.width = (share * 100) + "%";
        K.el("span", null, "H100 " + (i + 1), c);
      }
      if (Math.ceil(gpus) > 24) K.el("p", "fig-note", "+" + (Math.ceil(gpus) - 24) + " more GPUs of memory not drawn", cells);
      says.innerHTML = gpus <= 0.5 ? "Fits easily. Memory is left for weights and more requests." : gpus <= 1 ? "Most of one GPU's memory goes to KV cache, before counting the weights." : "<b>The KV cache alone needs " + gpus.toFixed(1) + " GPUs' worth of memory.</b> Engines respond by paging, quantizing the cache, sharing prefixes or offloading to CPU memory and SSD.";
    }
    draw();
    return {};
  };

  /* Latency arithmetic: end-to-end time = TTFT + (output tokens - 1) x TPOT, with a live stream preview. */
  MODS.latency = function (root, cfg, K) {
    var st = { ttft: 500, tpot: 30, n: 300 };
    var sl = K.el("div", "row", null, root);
    K.slider(sl, "lat-ttft", "Time to first token", 1, 30, 5, function (v) { return (v * 100) + " ms"; }, function (v) { st.ttft = v * 100; draw(); });
    K.slider(sl, "lat-tpot", "Time per output token", 5, 120, 30, function (v) { return v + " ms"; }, function (v) { st.tpot = v; draw(); });
    K.slider(sl, "lat-n", "Output tokens", 1, 40, 6, function (v) { return String(v * 50); }, function (v) { st.n = v * 50; draw(); });
    K.el("span", "example", "Your numbers; start from an example", root);
    var bar = K.el("div", "latbar", null, root), b1 = K.el("span", "lb-ttft", null, bar), b2 = K.el("span", "lb-dec", null, bar);
    var ro = K.el("div", "readouts", null, root);
    var rE2E = K.readout(ro, "end-to-end latency", true), rSpeed = K.readout(ro, "tokens per second, one user"), rShare = K.readout(ro, "share spent before the first token");
    var box = K.el("div", "streambox card", null, root);
    var sb = K.el("div", "btns", null, box), go = K.button(sb, "Stream an answer at these speeds", "primary");
    var clock = K.el("span", "fig-note", "", sb);
    var out = K.el("p", "streamtext", "", box);
    var words = cfg.text.split(" "), timer = null;
    function draw() {
      var e2e = st.ttft + (st.n - 1) * st.tpot;
      b1.style.width = (100 * st.ttft / e2e) + "%"; b2.style.width = (100 * (e2e - st.ttft) / e2e) + "%";
      b1.textContent = "TTFT"; b2.textContent = "decode: " + (st.n - 1) + " × TPOT";
      rE2E.textContent = (e2e / 1000).toFixed(2) + " s"; rSpeed.textContent = (1000 / st.tpot).toFixed(1); rShare.textContent = Math.round(100 * st.ttft / e2e) + "%";
    }
    function stopStream() { if (timer) clearTimeout(timer); timer = null; go.textContent = "Stream an answer at these speeds"; }
    go.addEventListener("click", function () {
      if (timer) { stopStream(); return; }
      out.textContent = ""; go.textContent = "Stop";
      var t0 = performance.now(), i = 0;
      out.classList.add("waiting");
      function tick() {
        clock.textContent = ((performance.now() - t0) / 1000).toFixed(2) + " s";
        if (i >= words.length) { out.classList.remove("waiting"); timer = null; go.textContent = "Stream again"; return; }
        out.classList.remove("waiting");
        out.textContent += (i ? " " : "") + words[i++];
        timer = setTimeout(tick, st.tpot);
      }
      timer = setTimeout(tick, st.ttft);
    });
    draw();
    return { stop: stopStream };
  };

  /* Roofline: attainable TFLOPS = min(peak, bandwidth x arithmetic intensity). */
  MODS.roofline = function (root, cfg, K) {
    root.classList.add("chart");
    var st = { kind: 0, fp8: false, b: 0, p: 4 };
    var BATCH = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024], PROMPT = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
    var top = K.el("div", "row", null, root);
    K.seg(top, ["Decode", "Prefill"], function (i) { st.kind = i; draw(true); }, 0);
    K.seg(top, ["BF16", "FP8"], function (i) { st.fp8 = i === 1; draw(true); }, 0);
    var sl = K.el("div", "row", null, root);
    var sB = K.slider(sl, "rf-b", "Requests in the decode batch", 0, BATCH.length - 1, st.b, function (v) { return String(BATCH[v]); }, function (v) { st.b = v; draw(true); });
    var sP = K.slider(sl, "rf-p", "Prompt tokens in one prefill", 0, PROMPT.length - 1, st.p, function (v) { return String(PROMPT[v]); }, function (v) { st.p = v; draw(true); });
    var W = 900, H = 340, L = 64, R = 20, T = 20, B = 46;
    var s = K.sv("svg", { "class": "anim", viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Roofline chart for an H100" }, root);
    var x = function (v) { return L + Math.log2(v) / Math.log2(8192) * (W - L - R); };
    var y = function (v) { return H - B - Math.log10(v) / Math.log10(4000) * (H - B - T); };
    [1, 4, 16, 64, 256, 1024, 4096].forEach(function (v) { K.sv("line", { x1: x(v), x2: x(v), y1: T, y2: H - B, "class": "gl" }, s); var t = K.sv("text", { x: x(v), y: H - B + 18, "text-anchor": "middle", "class": "ax" }, s); t.textContent = v; });
    [1, 10, 100, 1000].forEach(function (v) { K.sv("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), "class": "gl" }, s); var t = K.sv("text", { x: L - 8, y: y(v) + 4, "text-anchor": "end", "class": "ax" }, s); t.textContent = v; });
    var xl = K.sv("text", { x: W - R, y: H - 8, "text-anchor": "end", "class": "ax" }, s); xl.textContent = "arithmetic intensity, FLOPs per byte read";
    var yl = K.sv("text", { x: 14, y: T + 4, "class": "ax" }, s); yl.textContent = "TFLOPS";
    var roof = K.sv("path", { fill: "none", stroke: "var(--ink-2)", "stroke-width": 2.5 }, s);
    var ridge = K.sv("line", { stroke: "var(--token)", "stroke-dasharray": "4 4", "stroke-width": 1.5 }, s);
    var ridgeT = K.sv("text", { "class": "ax", fill: "var(--token-ink)" }, s);
    var memT = K.sv("text", { "class": "axl" }, s), cmpT = K.sv("text", { "class": "axl" }, s);
    var dot = K.sv("circle", { r: 9, fill: "var(--layer)", stroke: "var(--surface-2)", "stroke-width": 3 }, s);
    var ro = K.el("div", "readouts", null, root);
    var rAI = K.readout(ro, "FLOPs per byte"), rAtt = K.readout(ro, "attainable TFLOPS", true), rPeak = K.readout(ro, "of peak"), rBound = K.readout(ro, "limited by", true);
    var says = K.el("p", "says", "", root);
    var sweep = K.button(K.el("div", "btns", null, root), "Sweep the decode batch from 1 to 1,024");
    var cur = null, stopT = null, sweepT = null;
    function draw(animate) {
      var peak = st.fp8 ? cfg.fp8 : cfg.bf16, bw = cfg.bw, rx = peak / bw;
      roof.setAttribute("d", "M" + x(1) + " " + y(bw) + " L" + x(rx) + " " + y(peak) + " L" + x(8192) + " " + y(peak));
      ridge.setAttribute("x1", x(rx)); ridge.setAttribute("x2", x(rx)); ridge.setAttribute("y1", y(peak)); ridge.setAttribute("y2", H - B);
      ridgeT.setAttribute("x", x(rx) + 6); ridgeT.setAttribute("y", H - B - 8); ridgeT.textContent = "ridge: " + Math.round(rx) + " FLOPs/byte";
      memT.setAttribute("x", x(1.3)); memT.setAttribute("y", y(bw * 28)); memT.textContent = "memory-bound: " + bw + " TB/s × intensity";
      cmpT.setAttribute("x", x(rx) + 14); cmpT.setAttribute("y", y(peak) - 10); cmpT.textContent = "compute-bound: " + peak.toLocaleString("en-US") + " TFLOPS";
      var ai = (st.kind === 0 ? BATCH[st.b] : PROMPT[st.p]) * (st.fp8 ? 2 : 1);
      var att = Math.min(peak, bw * ai), target = [x(ai), y(att)];
      sB.input.disabled = st.kind !== 0; sP.input.disabled = st.kind !== 1;
      if (stopT) stopT();
      var from = cur || target;
      if (animate) stopT = K.tween(500, function (t) { cur = [from[0] + (target[0] - from[0]) * t, from[1] + (target[1] - from[1]) * t]; dot.setAttribute("cx", cur[0]); dot.setAttribute("cy", cur[1]); });
      else { cur = target; dot.setAttribute("cx", cur[0]); dot.setAttribute("cy", cur[1]); }
      rAI.textContent = Math.round(ai).toLocaleString("en-US"); rAtt.textContent = Math.round(att).toLocaleString("en-US");
      rPeak.textContent = Math.round(100 * att / peak) + "%"; rBound.textContent = ai < rx ? "memory" : "compute";
      says.innerHTML = st.kind === 0
        ? (ai < rx ? "<b>Decode with " + BATCH[st.b] + (BATCH[st.b] === 1 ? " request" : " requests") + "</b> does about " + Math.round(ai) + " FLOPs per byte of weights read. The tensor cores wait on memory, so a bigger batch is nearly free." : "<b>A decode batch this large</b> finally does enough math per byte to keep the tensor cores busy. The KV cache usually runs out of memory before this point.")
        : "<b>Prefill over " + PROMPT[st.p] + " tokens</b> reuses each weight for every prompt token, so " + (ai < rx ? "short prompts stay memory-bound." : "it runs compute-bound. Prefill time grows with prompt length.");
    }
    sweep.addEventListener("click", function () {
      if (sweepT) { clearInterval(sweepT); sweepT = null; sweep.textContent = "Sweep the decode batch from 1 to 1,024"; return; }
      st.kind = 0; K.$$(".seg", root)[0].querySelector(".btn").click(); st.b = 0; sB.set(0); draw(true); sweep.textContent = "Stop";
      sweepT = setInterval(function () { if (st.b >= BATCH.length - 1) { clearInterval(sweepT); sweepT = null; sweep.textContent = "Sweep the decode batch from 1 to 1,024"; return; } st.b++; sB.set(st.b); draw(true); }, 650);
    });
    draw(false);
    return { stop: function () { if (sweepT) { clearInterval(sweepT); sweepT = null; sweep.textContent = "Sweep the decode batch from 1 to 1,024"; } } };
  };

  /* Glossary with a filter box; layer chips jump to the layer. */
  MODS.glossary = function (root, cfg, K) {
    var lab = K.el("label", "ctl", null, root); lab.setAttribute("for", "gl-q");
    K.el("span", null, "Filter terms", lab);
    var q = K.el("input", "gl-input", null, lab); q.id = "gl-q"; q.type = "search"; q.placeholder = "Try “KV”, “prefill” or “Triton”";
    var count = K.el("p", "fig-note", "", root);
    var list = K.el("dl", "gloss", null, root);
    var rows = cfg.terms.map(function (t) {
      var dt = K.el("dt", null, null, list), dd = K.el("dd", null, null, list);
      K.el("b", null, t.t, dt);
      (t.l || []).forEach(function (l) {
        var c = K.el("button", "lchip-btn", "L" + l, dt); c.type = "button"; c.style.setProperty("--rc", "var(--l" + l + ")");
        c.setAttribute("aria-label", "Open layer " + l);
        c.addEventListener("click", function () { K.go("l" + l, null, { scroll: "force" }); });
      });
      dd.textContent = t.d;
      return { dt: dt, dd: dd, key: (t.t + " " + t.d).toLowerCase() };
    });
    function filter() {
      var v = q.value.trim().toLowerCase(), n = 0;
      rows.forEach(function (r) { var on = !v || r.key.indexOf(v) >= 0; r.dt.hidden = r.dd.hidden = !on; if (on) n++; });
      count.textContent = n + " of " + rows.length + " terms";
    }
    q.addEventListener("input", filter);
    filter();
    return {};
  };

  /* A system design drill: name the scarce resource, walk the layers, then the decision boundaries. */
  MODS.drill = function (root, cfg, K) {
    var box = K.el("div", "drill", null, root);
    var sc = K.el("div", "drill-sc", null, box);
    K.el("p", "drill-k", "Scenario", sc);
    K.el("p", "drill-q", null, sc).innerHTML = cfg.scenario;
    var s1 = K.el("section", "drill-step", null, box), s2 = K.el("section", "drill-step", null, box), s3 = K.el("section", "drill-step", null, box);
    function head(sec, n, t) { var h = K.el("h4", null, null, sec); K.el("span", "drill-n", String(n), h); h.appendChild(document.createTextNode(t)); }
    head(s1, 1, "Name the scarce resource"); head(s2, 2, "Walk the stack, top to bottom"); head(s3, 3, "What would change the design");
    var b1 = K.button(s1, "Reveal"), a1 = K.el("p", "drill-a", null, s1); a1.hidden = true; a1.innerHTML = cfg.scarce;
    var b2 = K.button(s2, "Reveal the first layer"), ol = K.el("ol", "drill-layers", null, s2), shown = 0;
    var b3 = K.button(s3, "Reveal"), ul = K.el("ul", "drill-sw", null, s3); ul.hidden = true;
    cfg.switches.forEach(function (w) { K.el("li", null, null, ul).innerHTML = w; });
    b1.addEventListener("click", function () { a1.hidden = false; b1.hidden = true; });
    b2.addEventListener("click", function () {
      var stp = cfg.steps[shown++];
      var li = K.el("li", "drill-li", null, ol); li.style.setProperty("--rc", "var(--l" + stp.l + ")");
      var c = K.el("span", "lchip", "L" + stp.l, li); c.style.setProperty("--rc", "var(--l" + stp.l + ")");
      var d = K.el("div", null, null, li); K.el("b", null, stp.title, d); K.el("p", null, null, d).innerHTML = stp.text;
      b2.textContent = shown >= cfg.steps.length ? "All layers shown" : "Reveal the next layer";
      b2.disabled = shown >= cfg.steps.length;
    });
    b3.addEventListener("click", function () { ul.hidden = false; b3.hidden = true; });
    var reset = K.button(K.el("div", "btns", null, box), "Hide the answers");
    reset.addEventListener("click", function () { a1.hidden = true; b1.hidden = false; ol.innerHTML = ""; shown = 0; b2.disabled = false; b2.textContent = "Reveal the first layer"; ul.hidden = true; b3.hidden = false; });
    return {};
  };
  /* Seven Layers: rack navigation, tabs, figures and the module runtime. */
  (function () {
    "use strict";
    var doc = document, root = shadow.host;
    var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ------------------------------------------------------------ helpers */
    function $(s, r) { return (r || shadow).querySelector(s); }
    function $$(s, r) { return Array.prototype.slice.call((r || shadow).querySelectorAll(s)); }
    function el(tag, cls, text, parent) {
      var e = doc.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      if (parent) parent.appendChild(e);
      return e;
    }
    var NS = "http://www.w3.org/2000/svg";
    function sv(tag, attrs, parent) {
      var e = doc.createElementNS(NS, tag);
      for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    }
    function store(key, val) {
      try {
        if (val === undefined) return localStorage.getItem("seven-layers:" + key);
        localStorage.setItem("seven-layers:" + key, val);
      } catch (e) { return null; }
      return null;
    }
    function css(name, from) { return getComputedStyle(from || root).getPropertyValue(name).trim(); }
    function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    function tween(ms, fn, done) {
      if (RM) { fn(1); if (done) done(); return function () {}; }
      var t0 = performance.now(), stop = false;
      function step(now) {
        if (stop) return;
        var t = Math.min(1, (now - t0) / ms);
        fn(ease(t));
        if (t < 1) requestAnimationFrame(step); else if (done) done();
      }
      requestAnimationFrame(step);
      return function () { stop = true; };
    }
    var KIT = { $: $, $$: $$, el: el, sv: sv, css: css, tween: tween, ease: ease, RM: RM, store: store, data: DATA };
    KIT.canvas = function (parent, ratio, minH, maxH) {
      var cv = el("canvas", null, null, parent), ctx = cv.getContext("2d"), o = { cv: cv, ctx: ctx, w: 0, h: 0 };
      o.resize = function () {
        var w = parent.clientWidth || 640, h = Math.round(w * ratio), d = Math.min(2, window.devicePixelRatio || 1);
        if (minH) h = Math.max(minH, h);
        if (maxH) h = Math.min(maxH, h);
        cv.width = Math.round(w * d); cv.height = Math.round(h * d); cv.style.height = h + "px";
        ctx.setTransform(d, 0, 0, d, 0, 0); o.w = w; o.h = h;
      };
      o.resize();
      return o;
    };
    KIT.pal = function (node) {
      var cs = getComputedStyle(node), p = {};
      ["bg", "surface", "surface-2", "ink", "ink-2", "muted", "rule", "token", "token-ink", "old", "good", "bad", "layer", "l1", "l2", "l3", "l4", "l5", "l6", "l7"].forEach(function (n) {
        p[n.replace("-", "_")] = cs.getPropertyValue("--" + n).trim();
      });
      return p;
    };
    KIT.rng = function (seed) {
      var s = (seed >>> 0) || 1;
      return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; };
    };
    KIT.loop = function (fn) {
      var id = 0, last = 0, on = false;
      function f(t) { if (!on) return; var dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t; fn(dt, t); id = requestAnimationFrame(f); }
      return {
        start: function () { if (on) return; on = true; last = 0; id = requestAnimationFrame(f); },
        stop: function () { on = false; cancelAnimationFrame(id); },
        running: function () { return on; }
      };
    };
    KIT.button = function (parent, label, cls) { var b = el("button", "btn" + (cls ? " " + cls : ""), label, parent); b.type = "button"; return b; };
    KIT.seg = function (parent, labels, onPick, start) {
      var g = el("div", "seg", null, parent), bs = [];
      g.setAttribute("role", "group");
      labels.forEach(function (l, i) {
        var b = KIT.button(g, l); bs.push(b);
        b.addEventListener("click", function () { set(i); onPick(i); });
      });
      function set(i) { bs.forEach(function (b, k) { b.setAttribute("aria-pressed", String(k === i)); }); }
      set(start || 0);
      return { set: set, el: g };
    };
    KIT.slider = function (parent, id, label, min, max, val, fmt, onInput, note) {
      var w = el("label", "ctl", null, parent);
      w.setAttribute("for", id);
      var top = el("span", "ctl-top", null, w);
      el("span", null, label, top);
      var out = el("b", null, "", top);
      var r = el("input", null, null, w);
      r.type = "range"; r.id = id; r.min = min; r.max = max; r.step = 1; r.value = val;
      function upd() { out.textContent = fmt(+r.value); }
      r.addEventListener("input", function () { upd(); onInput(+r.value); });
      if (note) el("span", "ctl-note", note, w);
      upd();
      return { input: r, set: function (v) { r.value = v; upd(); } };
    };
    KIT.readout = function (parent, label, hl) {
      var d = el("div", "ro" + (hl ? " hl" : ""), null, parent), b = el("b", null, "", d);
      el("span", null, label, d);
      return b;
    };

    /* ------------------------------------------------------------ tooltip */
    var tip = el("div", "tip", null, shadow);
    tip.setAttribute("role", "tooltip");
    function showTip(html, x, y) {
      tip.innerHTML = "";
      if (typeof html === "function") html(tip); else tip.textContent = html;
      tip.classList.add("on");
      var w = tip.offsetWidth, h = tip.offsetHeight;
      var left = Math.min(Math.max(8, x - w / 2), innerWidth - w - 8);
      var top = y - h - 14 < 8 ? y + 18 : y - h - 14;
      tip.style.left = left + "px";
      tip.style.top = top + "px";
    }
    function hideTip() { tip.classList.remove("on"); }
    KIT.showTip = showTip; KIT.hideTip = hideTip;
    function tipTarget(e) { return e.target.closest && e.target.closest(".f, [data-tip]"); }
    shadow.addEventListener("pointerover", function (e) {
      var t = tipTarget(e); if (!t) return;
      var r = t.getBoundingClientRect();
      showTip(t.getAttribute("data-tip"), r.left + r.width / 2, r.top);
    });
    shadow.addEventListener("pointerout", function (e) { if (tipTarget(e)) hideTip(); });
    shadow.addEventListener("focusin", function (e) {
      var t = tipTarget(e); if (!t) return;
      var r = t.getBoundingClientRect();
      showTip(t.getAttribute("data-tip"), r.left + r.width / 2, r.top);
    });
    shadow.addEventListener("focusout", function (e) { if (tipTarget(e)) hideTip(); });
    addEventListener("scroll", hideTip, { passive: true });

    /* ------------------------------------------------------------ module runtime */
    var live = [];
    function initMods(scope) {
      $$("[data-mod]", scope).forEach(function (node) {
        if (!node._inst) {
          var fn = MODS[node.getAttribute("data-mod")];
          if (!fn) return;
          try { node._inst = fn(node, DATA.mods && DATA.mods[node.getAttribute("data-key")] || {}, KIT) || {}; }
          catch (err) { node._inst = {}; if (window.console) console.error(err); }
        }
        if (node._inst.start) node._inst.start();
        if (live.indexOf(node) < 0) live.push(node);
      });
    }
    function stopMods() {
      live.forEach(function (node) { if (node._inst && node._inst.stop) node._inst.stop(); });
      live = [];
    }

    /* ------------------------------------------------------------ navigation */
    var sections = $$(".panel");
    var order = [];
    sections.forEach(function (s) {
      $$(".tab", s).forEach(function (t) { order.push([s.getAttribute("data-sec"), t.getAttribute("data-tab"), t.getAttribute("data-label"), s.getAttribute("data-short")]); });
    });
    var cur = { sec: null, tab: null }, booted = false;
    var visited = {};
    try { visited = JSON.parse(store("visited") || "{}") || {}; } catch (e) { visited = {}; }
    function paintProgress() {
      var n = order.filter(function (o) { return visited[o[0] + "-" + o[1]]; }).length;
      $$("[data-go]").forEach(function (b) {
        var sec = b.getAttribute("data-go"), tabs = order.filter(function (o) { return o[0] === sec; });
        if (!tabs.length) return;
        var seen = tabs.filter(function (o) { return visited[o[0] + "-" + o[1]]; }).length;
        b.classList.toggle("seen", seen > 0);
        b.classList.toggle("done", seen === tabs.length);
      });
      var m = $(".rack-progress");
      if (m) { $("i", m).style.width = (100 * n / order.length) + "%"; $(".rp-count", m).textContent = n + " of " + order.length + " tabs explored"; }
    }
    function markVisit(sec, tab) { visited[sec + "-" + tab] = 1; store("visited", JSON.stringify(visited)); paintProgress(); }
    var rp = $(".rp-reset");
    if (rp) rp.addEventListener("click", function () { visited = {}; store("visited", "{}"); markVisit(cur.sec, cur.tab); });
    var rackToken = $(".rack-token");

    function moveToken(sec) {
      if (!rackToken) return;
      var tray = $('.tray[data-go="' + sec + '"]');
      var trays = $(".trays");
      if (tray && trays) {
        rackToken.style.opacity = 1;
        rackToken.style.setProperty("--ty", (tray.offsetTop + tray.offsetHeight / 2 - 6) + "px");
      } else if (sec === "overview") {
        rackToken.style.opacity = 1;
        rackToken.style.setProperty("--ty", "-10px");
      } else {
        var last = $$(".tray").pop();
        rackToken.style.setProperty("--ty", (last ? last.offsetTop + last.offsetHeight + 4 : 0) + "px");
        rackToken.style.opacity = 0.35;
      }
    }

    function placeBar(tabs) {
      var on = $('.tab[aria-selected="true"]', tabs), bar = $(".tab-bar", tabs);
      if (!on || !bar) return;
      bar.style.width = on.offsetWidth + "px";
      bar.style.transform = "translateX(" + on.offsetLeft + "px)";
    }

    function go(sec, tab, opts) {
      opts = opts || {};
      var s = $('.panel[data-sec="' + sec + '"]') || sections[0];
      sec = s.getAttribute("data-sec");
      var tabs = $$(".tab", s);
      var t = tabs.filter(function (x) { return x.getAttribute("data-tab") === tab; })[0] || tabs[0];
      tab = t.getAttribute("data-tab");
      if (cur.sec === sec && cur.tab === tab) return;
      stopMods();
      hideTip();
      var newSec = cur.sec !== sec;
      sections.forEach(function (x) { x.hidden = x !== s; });
      if (newSec) { s.classList.remove("enter"); void s.offsetWidth; s.classList.add("enter"); }
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute("aria-selected", on ? "true" : "false");
        x.tabIndex = on ? 0 : -1;
        var p = $('.tp[data-tab="' + x.getAttribute("data-tab") + '"]', s);
        if (p) {
          p.hidden = !on;
          if (on && !newSec) { p.classList.remove("enter"); void p.offsetWidth; p.classList.add("enter"); }
        }
      });
      $$(".tray, .jack, .brand").forEach(function (b) {
        var on = b.getAttribute("data-go") === sec;
        b.classList.toggle("on", on);
        if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
      });
      cur = { sec: sec, tab: tab };
      markVisit(sec, tab);
      placeBar($(".tabs", s));
      moveToken(sec);
      var panel = $('.tp[data-tab="' + tab + '"]', s);
      nextBar(panel);
      initMods(panel);
      $$(".dg", panel).forEach(initDiagram);
      $$(".chart[data-chart]", panel).forEach(initChart);
      $$(".tl", panel).forEach(initTimeline);
      $$(".quiz", panel).forEach(initQuiz);
      $$(".check[data-key]", panel).forEach(initCheck);
      $$(".compare", panel).forEach(initCompare);
      $$(".plate", panel).forEach(initPlate);
      if (booted) countUp(panel);
      try { history.replaceState(history.state, "", location.pathname + location.search + "#" + sec + "-" + tab); } catch (e) { /* sandboxed */ }
      store("at", sec + "-" + tab);
      if (opts.scroll !== false) {
        var top = s.getBoundingClientRect().top + scrollY - 12 - stuck();
        if (scrollY > top || opts.scroll === "force") scrollTo({ top: Math.max(0, top), behavior: RM ? "auto" : "smooth" });
      }
      if (opts.focus) { var h = $(".ph-title", s); h.tabIndex = -1; h.focus({ preventScroll: true }); }
    }
    KIT.go = go;

    /* Height of what sticks above a panel: the site navbar, and on narrow screens the rack. */
    function stuck() {
      var rack = $(".rack");
      if (!rack) return 0;
      return (parseFloat(getComputedStyle(rack).top) || 0) + (innerWidth <= 900 ? rack.offsetHeight : 0);
    }

    function nextBar(panel) {
      if (!panel || $(".nextbar", panel)) return;
      var sec = panel.closest(".panel").getAttribute("data-sec"), tab = panel.getAttribute("data-tab");
      var i = -1;
      order.forEach(function (o, k) { if (o[0] === sec && o[1] === tab) i = k; });
      var bar = el("div", "nextbar", null, panel);
      function btn(o, cls, label) {
        var b = el("button", "nb " + cls, null, bar);
        b.type = "button";
        el("small", null, label, b);
        el("span", null, o[0] === sec ? o[2] : o[3] + ": " + o[2], b);
        b.addEventListener("click", function () { go(o[0], o[1], { scroll: "force" }); });
      }
      if (i > 0) btn(order[i - 1], "prev", "Previous");
      if (i >= 0 && i < order.length - 1) btn(order[i + 1], "next", "Next");
    }

    $$("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () { go(b.getAttribute("data-go"), b.getAttribute("data-go-tab"), { focus: b.classList.contains("tray") || b.classList.contains("jack") ? false : false }); });
    });
    $$(".tabs").forEach(function (tabs) {
      var bar = el("span", "tab-bar", null, tabs);
      bar.setAttribute("aria-hidden", "true");
      $$(".tab", tabs).forEach(function (t, i, all) {
        t.addEventListener("click", function () { go(tabs.closest(".panel").getAttribute("data-sec"), t.getAttribute("data-tab"), { scroll: false }); });
        t.addEventListener("keydown", function (e) {
          var k = e.key, j = i;
          if (k === "ArrowRight") j = (i + 1) % all.length;
          else if (k === "ArrowLeft") j = (i - 1 + all.length) % all.length;
          else if (k === "Home") j = 0;
          else if (k === "End") j = all.length - 1;
          else return;
          e.preventDefault();
          all[j].click();
          all[j].focus();
        });
      });
    });
    addEventListener("resize", function () {
      $$(".tabs").forEach(placeBar);
      if (cur.sec) moveToken(cur.sec);
      live.forEach(function (node) { if (node._inst && node._inst.resize) node._inst.resize(); });
    });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { if (signal.aborted) return; $$(".tabs").forEach(placeBar); if (cur.sec) moveToken(cur.sec); });

    /* ------------------------------------------------------------ count-up numbers */
    function countUp(scope) {
      if (RM) return;
      $$(".stat-value .f, .fp-lcd .f, .count", scope).forEach(function (n) {
        if (n._counted) return;
        n._counted = true;
        var text = n.textContent, m = text.match(/(\d[\d,]*\.?\d*)/);
        if (!m) return;
        var target = parseFloat(m[1].replace(/,/g, "")), dec = (m[1].split(".")[1] || "").length;
        var pre = text.slice(0, m.index), post = text.slice(m.index + m[1].length), comma = m[1].indexOf(",") >= 0;
        tween(900, function (t) {
          var v = target * t;
          var s = dec ? v.toFixed(dec) : String(Math.round(v));
          if (comma) s = Number(s).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
          n.textContent = pre + s + post;
        }, function () { n.textContent = text; });
      });
    }

    /* ------------------------------------------------------------ table rows light the rack */
    $$("tr[data-layer]").forEach(function (tr) {
      var tray = $('.tray[data-go="l' + tr.getAttribute("data-layer") + '"]');
      function on() { if (tray) tray.classList.add("peek"); }
      function off() { if (tray) tray.classList.remove("peek"); }
      tr.addEventListener("mouseenter", on); tr.addEventListener("mouseleave", off);
      tr.addEventListener("focusin", on); tr.addEventListener("focusout", off);
    });

    /* ------------------------------------------------------------ paintings */
    function initPlate(fig) {
      if (fig._ok) return; fig._ok = true;
      var card = $(".spot-card", fig), spots = $$(".spot", fig);
      spots.forEach(function (b, i) {
        b.style.setProperty("--d", (i * 0.35) + "s");
        b.addEventListener("click", function () {
          var was = b.getAttribute("aria-pressed") === "true";
          spots.forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
          if (was) { card.hidden = true; return; }
          b.setAttribute("aria-pressed", "true");
          card.hidden = false;
          card.innerHTML = "";
          el("h4", null, null, card).innerHTML = b.getAttribute("data-title");
          el("p", null, null, card).innerHTML = b.getAttribute("data-text");
        });
      });
      $$(".tray-hit", fig).forEach(function (h) {
        h.addEventListener("click", function () { go(h.getAttribute("data-to"), null, { scroll: "force" }); });
      });
    }

    /* ------------------------------------------------------------ diagrams with steps */
    function initDiagram(fig) {
      if (fig._ok) return; fig._ok = true;
      var steps = (DATA.diagrams || {})[fig.getAttribute("data-key")] || [];
      var svg = $("svg", fig);
      var parts = $$(":scope > [id]", svg);
      var box = el("div", "steps", null, fig);
      var h = el("h4", null, null, box), p = el("p", null, null, box);
      var ctl = el("div", "btns", null, box);
      var back = el("button", "btn", "Back", ctl), next = el("button", "btn primary", "Next", ctl), play = el("button", "btn", "Play", ctl);
      [back, next, play].forEach(function (b) { b.type = "button"; });
      var dots = el("div", "step-dots", null, box);
      steps.forEach(function () { el("i", null, null, dots); });
      var i = -1, timer = null;
      function render() {
        if (i < 0) {
          h.textContent = "The whole picture";
          p.textContent = "Hover or tap a part for its detail, or press Next to walk through it.";
          parts.forEach(function (x) { x.classList.remove("dim", "hot"); });
        } else {
          var st = steps[i];
          h.textContent = (i + 1) + " of " + steps.length + ". " + st.title;
          p.innerHTML = st.text;
          parts.forEach(function (x) {
            var on = st.focus.indexOf(x.id) >= 0;
            x.classList.toggle("dim", !on);
            x.classList.toggle("hot", on);
          });
        }
        $$("i", dots).forEach(function (d, k) { d.classList.toggle("on", k <= i); });
        back.disabled = i < 0;
        next.textContent = i >= steps.length - 1 ? "Start over" : "Next";
      }
      function advance() { i = i >= steps.length - 1 ? -1 : i + 1; render(); }
      back.addEventListener("click", function () { stopPlay(); i = Math.max(-1, i - 1); render(); });
      next.addEventListener("click", function () { stopPlay(); advance(); });
      function stopPlay() { if (timer) { clearInterval(timer); timer = null; play.textContent = "Play"; play.setAttribute("aria-pressed", "false"); } }
      play.addEventListener("click", function () {
        if (timer) { stopPlay(); return; }
        play.textContent = "Pause"; play.setAttribute("aria-pressed", "true");
        if (i >= steps.length - 1) i = -1;
        advance();
        timer = setInterval(function () { if (i >= steps.length - 1) { stopPlay(); return; } advance(); }, 3400);
      });
      fig._stop = stopPlay;
      render();
    }

    /* ------------------------------------------------------------ bar charts */
    function initChart(fig) {
      if (fig._ok) { if (fig._grow) fig._grow(); return; } fig._ok = true;
      var spec = (DATA.charts || {})[fig.getAttribute("data-chart")];
      if (!spec) return;
      var mount = $(".chart-mount", fig);
      var series = spec.series, cats = spec.categories, n = cats.length;
      var max = spec.max || Math.max.apply(null, series.map(function (s) { return Math.max.apply(null, s.values); }));
      var ticks = spec.ticks;
      var bars = [];
      function color(c) { return c.indexOf("--") === 0 ? "var(" + c + ")" : c; }
      function draw() {
        mount.innerHTML = "";
        bars = [];
        var W = Math.max(320, mount.clientWidth || 640), H = spec.height || 260, L = 46, R = 10, T = 18, B = 40;
        var s = sv("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": spec.alt || "" }, mount);
        var y = function (v) { return H - B - (v / ticks[ticks.length - 1]) * (H - B - T); };
        ticks.forEach(function (tv) {
          sv("line", { x1: L, x2: W - R, y1: y(tv), y2: y(tv), "class": tv === 0 ? "base" : "gl" }, s);
          var t = sv("text", { x: L - 8, y: y(tv) + 4, "text-anchor": "end", "class": "ax" }, s);
          t.textContent = spec.fmt ? tv.toFixed(spec.fmtDec || 0) : String(tv);
        });
        var band = (W - L - R) / n, gap = 2, bw = Math.min(54, (band * 0.62 - gap * (series.length - 1)) / series.length);
        cats.forEach(function (c, ci) {
          var cx = L + band * ci + band / 2;
          var lbl = sv("text", { x: cx, y: H - B + 20, "text-anchor": "middle", "class": "axl" }, s);
          lbl.textContent = c;
          series.forEach(function (se, si) {
            var x = cx - (series.length * bw + gap * (series.length - 1)) / 2 + si * (bw + gap);
            var v = se.values[ci];
            var g = sv("g", { "class": "bar", tabindex: "0", role: "img", "aria-label": c + ", " + se.name + ": " + v + " " + (spec.unit || "") }, s);
            var path = sv("path", { fill: color(se.color) }, g);
            var label = null;
            if (spec.labels === "all" || (spec.labels === "max" && v === max)) {
              label = sv("text", { x: x + bw / 2, "text-anchor": "middle", "class": "val" }, g);
            }
            bars.push({ path: path, x: x, w: bw, v: v, y: y, base: H - B, label: label });
            function tipOn(e) {
              var r = path.getBoundingClientRect();
              showTip(function (t) {
                var b = el("b", null, c, t); el("br", null, null, t);
                t.appendChild(doc.createTextNode(se.name + ": " + v.toLocaleString("en-US") + " " + (spec.unit || "")));
              }, r.left + r.width / 2, r.top);
            }
            g.addEventListener("pointerenter", tipOn); g.addEventListener("focus", tipOn);
            g.addEventListener("pointerleave", hideTip); g.addEventListener("blur", hideTip);
          });
        });
        grow(true);
      }
      function shape(b, t) {
        var top = b.y(b.v * t), h = b.base - top, r = Math.min(4, h, b.w / 2);
        b.path.setAttribute("d", "M" + b.x + " " + b.base + " V" + (top + r) + " Q" + b.x + " " + top + " " + (b.x + r) + " " + top +
          " H" + (b.x + b.w - r) + " Q" + (b.x + b.w) + " " + top + " " + (b.x + b.w) + " " + (top + r) + " V" + b.base + " Z");
        if (b.label) { b.label.setAttribute("y", top - 6); b.label.textContent = t > .98 ? b.v.toLocaleString("en-US") : ""; }
      }
      function grow() { tween(900, function (t) { bars.forEach(function (b, k) { shape(b, Math.min(1, Math.max(0, t * 1.4 - k * 0.06))); }); }, function () { bars.forEach(function (b) { shape(b, 1); }); }); }
      fig._grow = grow;
      draw();
      var tb = $(".showtbl", fig), table = $(".tbl-wrap", fig);
      if (tb && table) tb.addEventListener("click", function () { table.hidden = !table.hidden; tb.textContent = table.hidden ? "Show the numbers" : "Hide the numbers"; });
      var lastW = mount.clientWidth;
      addEventListener("resize", function () { if (Math.abs(mount.clientWidth - lastW) > 30 && mount.offsetParent) { lastW = mount.clientWidth; draw(); } });
    }

    /* ------------------------------------------------------------ timeline */
    function initTimeline(box) {
      if (box._ok) return; box._ok = true;
      var spec = (DATA.timelines || {})[box.getAttribute("data-key")];
      var track = el("div", "tl-track", null, box);
      var card = el("div", "tl-card", null, box);
      card.setAttribute("aria-live", "polite");
      var ctl = el("div", "btns", null, box);
      var prev = el("button", "btn", "Earlier", ctl), next = el("button", "btn", "Later", ctl), play = el("button", "btn primary", "Play the years", ctl);
      [prev, next, play].forEach(function (b) { b.type = "button"; });
      var W = 1000, H = 92, L = 18, R = 18;
      var s = sv("svg", { "class": "tl-svg", viewBox: "0 0 " + W + " " + H, role: "group", "aria-label": spec.title || "Timeline" }, track);
      var t0 = Date.parse(spec.start), t1 = Date.parse(spec.end);
      var x = function (d) { return L + (Date.parse(d) - t0) / (t1 - t0) * (W - L - R); };
      spec.eras.forEach(function (e, k) {
        sv("rect", { x: x(e.from), y: 4, width: x(e.to) - x(e.from), height: 52, rx: 4, "class": "era" + (k % 2 ? " b" : "") }, s);
        var t = sv("text", { x: x(e.from) + 8, y: 18, "class": "era-t" }, s); t.textContent = e.label;
      });
      sv("line", { x1: L, x2: W - R, y1: 44, y2: 44, "class": "axis" }, s);
      var prog = sv("line", { x1: L, x2: L, y1: 44, y2: 44, "class": "prog" }, s);
      for (var yr = new Date(t0).getFullYear() + 1; yr <= new Date(t1).getFullYear(); yr++) {
        var xx = x(yr + "-01-01");
        sv("line", { x1: xx, x2: xx, y1: 40, y2: 48, "class": "axis" }, s);
        var yt = sv("text", { x: xx, y: 74, "text-anchor": "middle", "class": "yr" }, s); yt.textContent = yr;
      }
      var i = 0, timer = null;
      var evs = spec.events.map(function (e, k) {
        var g = sv("g", { "class": "ev " + e.kind, tabindex: "0", role: "button", "aria-label": e.label + ": " + e.title }, s);
        sv("circle", { cx: x(e.date), cy: 44, r: 6 }, g);
        sv("rect", { x: x(e.date) - 9, y: 26, width: 18, height: 36, fill: "transparent" }, g);
        g.addEventListener("click", function () { stop(); sel(k); });
        g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); stop(); sel(k); } });
        return g;
      });
      function sel(k) {
        i = k;
        var e = spec.events[k];
        evs.forEach(function (g, j) { g.classList.toggle("on", j === k); });
        prog.setAttribute("x2", x(e.date));
        card.innerHTML = "";
        el("small", null, e.label, card);
        el("h4", null, e.title, card);
        el("p", null, null, card).innerHTML = e.text;
        prev.disabled = k === 0; next.disabled = k === spec.events.length - 1;
      }
      function stop() { if (timer) { clearInterval(timer); timer = null; play.textContent = "Play the years"; } }
      prev.addEventListener("click", function () { stop(); sel(Math.max(0, i - 1)); });
      next.addEventListener("click", function () { stop(); sel(Math.min(spec.events.length - 1, i + 1)); });
      play.addEventListener("click", function () {
        if (timer) { stop(); return; }
        play.textContent = "Pause";
        if (i >= spec.events.length - 1) sel(0);
        timer = setInterval(function () { if (i >= spec.events.length - 1) { stop(); return; } sel(i + 1); }, 2300);
      });
      sel(0);
    }

    /* ------------------------------------------------------------ compare cards */
    function initCompare(box) {
      if (box._ok) return; box._ok = true;
      var cards = $$(".cmp", box), seg = $$(".seg .btn", box);
      function setAll(side) {
        seg.forEach(function (b, k) { b.setAttribute("aria-pressed", String(k === side)); });
        cards.forEach(function (c, k) {
          if (RM) { c.classList.toggle("flip", side === 1); return; }
          setTimeout(function () { c.classList.toggle("flip", side === 1); }, k * 110);
        });
      }
      seg.forEach(function (b, k) { b.addEventListener("click", function () { setAll(k); }); });
      cards.forEach(function (c) { c.addEventListener("click", function () { c.classList.toggle("flip"); }); });
      if (!RM) setTimeout(function () { setAll(1); }, 700); else setAll(1);
    }

    /* ------------------------------------------------------------ quiz */
    function initQuiz(box) {
      if (box._ok) return; box._ok = true;
      var spec = (DATA.quizzes || {})[box.getAttribute("data-key")];
      var i = 0, right = 0, marks = [];
      var card = el("div", "card", null, box);
      function render() {
        card.innerHTML = "";
        var head = el("div", "q-head", null, card);
        el("span", "fig-sub", i < spec.questions.length ? "Question " + (i + 1) + " of " + spec.questions.length : "Your result", head);
        var pr = el("div", "q-prog", null, head);
        spec.questions.forEach(function (_, k) { el("i", marks[k] || (k === i ? "cur" : ""), null, pr); });
        if (i >= spec.questions.length) {
          var share = right / spec.questions.length, res = spec.results[0];
          spec.results.forEach(function (r) { if (share >= r.min) res = r; });
          var rb = el("div", "q-res", null, card);
          el("b", null, right + " of " + spec.questions.length, rb);
          el("h4", "fig-title", res.label, rb);
          el("p", null, res.text, rb);
          var again = el("button", "btn primary", "Try again", rb); again.type = "button";
          again.addEventListener("click", function () { i = 0; right = 0; marks = []; render(); });
          return;
        }
        var q = spec.questions[i];
        el("p", "q-q", null, card).innerHTML = q.q;
        var opts = el("div", "q-opts", null, card), done = false;
        q.options.forEach(function (o, k) {
          var b = el("button", "q-opt", null, opts); b.type = "button";
          el("i", null, "ABCD"[k], b);
          el("span", null, null, b).innerHTML = o;
          b.addEventListener("click", function () {
            if (done) return; done = true;
            var ok = k === q.answer;
            if (ok) right++;
            marks[i] = ok ? "ok" : "no";
            b.classList.add(ok ? "ok" : "no");
            if (!ok) opts.children[q.answer].classList.add("ok");
            var ex = el("div", "q-exp", null, card); ex.innerHTML = "<b>" + (ok ? "Right. " : "Not quite. ") + "</b>" + q.explain;
            var nx = el("button", "btn primary", i === spec.questions.length - 1 ? "See your result" : "Next question", card); nx.type = "button";
            nx.style.marginTop = "12px";
            nx.addEventListener("click", function () { i++; render(); });
            nx.focus();
          });
        });
      }
      render();
    }

    /* ------------------------------------------------------------ checklist */
    function initCheck(box) {
      if (box._ok) return; box._ok = true;
      var key = "check:" + box.getAttribute("data-key");
      var savedTicks = {};
      try { savedTicks = JSON.parse(store(key) || "{}") || {}; } catch (e) { savedTicks = {}; }
      var inputs = $$("input[type=checkbox]", box), meter = $(".meter i", box.parentNode), count = $(".check-count", box.parentNode);
      function update() {
        var n = inputs.filter(function (x) { return x.checked; }).length;
        if (meter) meter.style.width = (100 * n / inputs.length) + "%";
        if (count) count.textContent = n + " of " + inputs.length + " on your dashboard";
      }
      inputs.forEach(function (x) {
        x.checked = !!savedTicks[x.id];
        x.addEventListener("change", function () { savedTicks[x.id] = x.checked; store(key, JSON.stringify(savedTicks)); update(); });
      });
      update();
    }

    /* ------------------------------------------------------------ boot */
    $$(".tray").forEach(function (t, i) { t.style.setProperty("--d", (i * 0.47) + "s"); });
    var hash = (location.hash || "").replace("#", "");
    var start = hash || store("at") || "overview-start";
    var dash = start.indexOf("-");
    go(dash > 0 ? start.slice(0, dash) : start, dash > 0 ? start.slice(dash + 1) : null, { scroll: false });
    booted = true;
    addEventListener("hashchange", function () {
      var h = (location.hash || "").replace("#", ""), d = h.indexOf("-");
      if (h) go(d > 0 ? h.slice(0, d) : h, d > 0 ? h.slice(d + 1) : null, { scroll: "force" });
    });
  })();

  return () => {
    lifetime.abort();
    intervals.forEach((id) => window.clearInterval(id));
    timeouts.forEach((id) => window.clearTimeout(id));
    frames.forEach((id) => window.cancelAnimationFrame(id));
  };
}
