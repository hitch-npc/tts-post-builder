/* Конструктор постов TTS — коллаж: фигура из двух частей, в каждой своё фото, у частей объём.
   Рисуется встроенным SVG. Фото лежит в <defs> один раз, грани объёма — его копии через <use>,
   поэтому файл выгрузки не растёт от глубины. Грань — то же фото, затемнённое на 60 %,
   слои сдвигаются по диагонали вверх-вправо. */
(function () {
  'use strict';
  var T = window.TTS;
  var BW = 800;   // ширина фигуры в единицах рисунка; один слой объёма — одна единица
  var seq = 0;    // id внутри SVG уникальны на каждую отрисовку

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  T.hashStr = function (s) {
    var h = 2166136261; s = String(s || '');
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  // Рваный край билета: 13 зубцов поперёк фигуры, от правого края к левому, с лёгким наклоном
  function tearPts(seed) {
    var r = rng(seed), n = 13, pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      pts.push([1 - t, 0.45 + 0.1 * t + (i % 2 ? 1 : -1) * (0.012 + r() * 0.022)]);
    }
    return pts;
  }

  /* ── простые билеты: тело с вырезанными углами, разрыв поперёк ──
     Координаты — доли рамки; круг в долях по y сжат в asp раз, чтобы на холсте остаться кругом. */
  function arc(cx, cy, r, asp, a0, a1, n) {
    var out = [];
    for (var i = 0; i <= n; i++) {
      var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
      out.push([cx + r * Math.cos(a), cy + r * asp * Math.sin(a)]);
    }
    return out;
  }
  // разрыв: rough — рваный, perf — по перфорации, wave — мягкой волной; от левого края к правому (или сверху вниз)
  function tearLine(kind, seed, from, to, vertical) {
    var r = rng(seed), pts = [], n = kind === 'perf' ? 26 : kind === 'wave' ? 40 : 13, ph = r() * 6.28;
    for (var i = 0; i <= n; i++) {
      var t = i / n, base = from + (to - from) * t, off;
      if (kind === 'perf') off = (i % 2 ? 1 : -1) * 0.007;
      else if (kind === 'wave') off = 0.035 * Math.sin(ph + t * Math.PI * 3);
      else off = (i % 2 ? 1 : -1) * (0.012 + r() * 0.024);
      if (i === 0 || i === n) off = 0;
      pts.push(vertical ? [base + off, t] : [t, base + off]);
    }
    return pts;
  }
  // Две части билета. o: { asp, r — радиус выреза углов (0 — прямые), tear, at, to, vertical, notch — радиус выреза у разрыва }
  function ticketPieces(o, seed) {
    var a = o.asp, r = o.r, nr = o.notch || 0;
    var tl = r ? arc(0, 0, r, a, 90, 0, 6) : [[0, 0]], tr = r ? arc(1, 0, r, a, 180, 90, 6) : [[1, 0]];
    var br = r ? arc(1, 1, r, a, 270, 180, 6) : [[1, 1]], bl = r ? arc(0, 1, r, a, 0, -90, 6) : [[0, 1]];
    var tp = tearLine(o.tear, seed, o.at, o.to == null ? o.at : o.to, o.vertical);
    if (o.vertical) {
      var c0 = tp[0][0], c1 = tp[tp.length - 1][0];
      // вырезы-полукруги на кромках, через них идёт разрыв
      var nTopL = nr ? arc(c0, 0, nr, a, 180, 90, 8) : [], nTopR = nr ? arc(c0, 0, nr, a, 90, 0, 8) : [];
      var nBotL = nr ? arc(c1, 1, nr, a, 270, 180, 8) : [], nBotR = nr ? arc(c1, 1, nr, a, 360, 270, 8) : [];
      var mid = nr ? tp.slice(1, -1).map(function (p, i, arr) { var t = (i + 1) / (arr.length + 1); return [p[0], nr * a + (1 - 2 * nr * a) * t]; }) : tp;
      var left = tl.concat(nTopL.length ? nTopL : [], mid, nBotL.length ? nBotL : [], bl);
      var right = (nTopR.length ? nTopR : []).concat(tr, br, nBotR.length ? nBotR : [], mid.slice().reverse());
      return [
        { bb: [0, 0, 1, 1], poly: left, rot: -0.02 },
        { bb: [0, 0, 1, 1], poly: right, dx: 0.06, dy: -0.04, rot: 0.045 }
      ];
    }
    var top = tl.concat(tr, tp.slice().reverse());
    var bot = tp.concat(br, bl);
    return [
      { bb: [0, 0, 1, 1], poly: top, rot: 0.025 },
      { bb: [0, 0, 1, 1], poly: bot, dx: 0.05, dy: 0.05, rot: -0.04 }
    ];
  }
  T.TICKETS = {
    stub:  { asp: 1.6, r: 0.06, tear: 'rough', at: 0.7, vertical: true },               // корешок сбоку
    notch: { asp: 1.6, r: 0, tear: 'perf', at: 0.68, vertical: true, notch: 0.045 },   // классический: вырезы и перфорация
    diag:  { asp: 0.8, r: 0.09, tear: 'rough', at: 0.28, to: 0.72 },                    // наискосок
    wave:  { asp: 0.8, r: 0.09, tear: 'wave', at: 0.5 },                                 // мягкой волной
    strip: { asp: 0.62, r: 0.07, tear: 'perf', at: 0.74 }                               // высокий, корешок снизу по перфорации
  };

  // Части фигуры в долях рамки: bb — рамка фото, dx/dy — сдвиг части, rot — поворот в радианах
  function pieces(shape, seed) {
    if (T.TICKETS[shape]) return ticketPieces(T.TICKETS[shape], seed);
    if (shape === 'tt') return [
      { bb: [0, 0, 1, 0.5], poly: [[0, 0], [1, 0.05], [1, 0.21], [0.67, 0.19], [0.67, 0.5], [0.33, 0.48], [0.33, 0.17], [0, 0.15]] },
      { bb: [0.04, 0.52, 1, 0.48], poly: [[0.37, 0.52], [0.71, 0.54], [0.71, 0.83], [1.04, 0.85], [1.04, 1], [0.04, 0.96], [0.04, 0.81], [0.37, 0.79]] }
    ];
    if (shape === 'portal') return [
      { bb: [0, 0, 1, 0.5], arch: true },
      { bb: [-0.04, 0.54, 1.08, 0.46], poly: [[0.1, 0.54], [0.9, 0.56], [1.04, 1], [-0.04, 0.98]], dx: 0.05 }
    ];
    var tp = tearPts(seed);
    return [
      { bb: [0, 0, 1, 0.6], ticket: 'top', tp: tp, rot: 0.025 },
      { bb: [0, 0.4, 1, 0.6], ticket: 'bot', tp: tp, dx: 0.05, dy: 0.045, rot: -0.04 }
    ];
  }

  function n1(v) { return Math.round(v * 10) / 10; }

  // Контур части; bx, by — угол рамки фигуры с учётом сдвига части. Углы билета вырезаны внутрь.
  function piecePath(pc, bx, by, bw, bh) {
    var X = function (v) { return n1(bx + v * bw); }, Y = function (v) { return n1(by + v * bh); };
    var pt = function (x, y) { return n1(x) + ' ' + n1(y); };
    var line = function (pts) { return pts.map(function (p) { return 'L' + X(p[0]) + ' ' + Y(p[1]); }).join(''); };
    if (pc.poly) return 'M' + X(pc.poly[0][0]) + ' ' + Y(pc.poly[0][1]) + line(pc.poly.slice(1)) + 'Z';
    if (pc.arch) {
      var R = bw / 2;
      return 'M' + X(0) + ' ' + Y(0.5) + 'L' + pt(bx, by + R) + 'A' + n1(R) + ' ' + n1(R) + ' 0 0 1 ' + pt(bx + bw, by + R) + 'L' + X(1) + ' ' + Y(0.47) + 'Z';
    }
    var r = bw * 0.09, A = 'A' + n1(r) + ' ' + n1(r) + ' 0 0 0 ';
    if (pc.ticket === 'top') {
      return 'M' + pt(bx + r, by) + 'L' + pt(bx + bw - r, by) + A + pt(bx + bw, by + r) +
        line(pc.tp) + 'L' + pt(bx, by + r) + A + pt(bx + r, by) + 'Z';
    }
    var tp = pc.tp.slice().reverse();
    return 'M' + X(tp[0][0]) + ' ' + Y(tp[0][1]) + line(tp.slice(1)) +
      'L' + pt(bx + bw, by + bh - r) + A + pt(bx + bw - r, by + bh) +
      'L' + pt(bx + r, by + bh) + A + pt(bx, by + bh - r) + 'Z';
  }

  // Фото в рамке части: заполняет её целиком, x/y — фокус в процентах, как у картинки события
  function photo(p, qx, qy, qw, qh, id) {
    if (!p || !p.src) {
      return '<rect id="' + id + '" x="' + n1(qx) + '" y="' + n1(qy) + '" width="' + n1(qw) + '" height="' + n1(qh) + '" style="fill:var(--smm-line)"/>';
    }
    var href = ' href="' + T.esc(p.src) + '"';
    if (p.w && p.h) {
      var k = Math.max(qw / p.w, qh / p.h) * (p.zoom || 1), dw = p.w * k, dh = p.h * k;
      var x = qx + (qw - dw) * (p.x == null ? 50 : p.x) / 100, y = qy + (qh - dh) * (p.y == null ? 50 : p.y) / 100;
      return '<image id="' + id + '"' + href + ' x="' + n1(x) + '" y="' + n1(y) + '" width="' + n1(dw) + '" height="' + n1(dh) + '" preserveAspectRatio="none"/>';
    }
    // размеры фото ещё неизвестны — по центру, до следующей отрисовки
    return '<image id="' + id + '"' + href + ' x="' + n1(qx) + '" y="' + n1(qy) + '" width="' + n1(qw) + '" height="' + n1(qh) + '" preserveAspectRatio="xMidYMid slice"/>';
  }

  // c: { shape, depth, seed, p1, p2 }, p: { src, x, y, zoom, w, h }
  T.collageSvg = function (c) {
    seq += 1;
    var S = T.SHAPES[c.shape] || T.SHAPES.ticket, bw = BW, bh = BW / S.asp;
    var D = Math.max(0, Math.min(48, Math.round(+c.depth || 0)));
    var pcs = pieces(c.shape, c.seed), id = 'tcl' + seq + '-', defs = '', body = '';
    // нижняя часть рисуется первой — верхняя и её грани ложатся поверх
    [1, 0].forEach(function (j) {
      var pc = pcs[j], ph = j ? c.p2 : c.p1, k = id + j;
      var bx = (pc.dx || 0) * bw, by = (pc.dy || 0) * bh;
      var qx = bx + pc.bb[0] * bw, qy = by + pc.bb[1] * bh, qw = pc.bb[2] * bw, qh = pc.bb[3] * bh;
      var deg = Math.round((pc.rot || 0) * 18000 / Math.PI) / 100;
      var tr = deg ? ' transform="rotate(' + deg + ' ' + n1(qx + qw / 2) + ' ' + n1(qy + qh / 2) + ')"' : '';
      var clip = ' clip-path="url(#' + k + 'c)"';
      defs += '<clipPath id="' + k + 'c"><path d="' + piecePath(pc, bx, by, bw, bh) + '"/></clipPath>' + photo(ph, qx, qy, qw, qh, k + 'i');
      if (D) {
        defs += '<g id="' + k + 's"' + tr + '><g' + clip + '><use href="#' + k + 'i"/>' +
          '<rect x="' + (-bw) + '" y="' + n1(-bh) + '" width="' + 3 * bw + '" height="' + n1(3 * bh) + '" fill="#000" fill-opacity=".6"/></g></g>';
        for (var i = D; i >= 1; i--) body += '<use href="#' + k + 's" x="' + i + '" y="' + (-i) + '"/>';
      }
      body += '<g' + tr + '><g' + clip + '><use href="#' + k + 'i"/></g></g>';
    });
    // рамка рисунка: запас под поворот частей и под объём вверх-вправо
    var x0 = -0.06 * bw, y0 = -0.03 * bh - D, w = 1.18 * bw + D, h = 1.11 * bh + D;
    return '<svg class="bx-cl-svg" viewBox="' + [x0, y0, w, h].map(n1).join(' ') + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<defs>' + defs + '</defs>' + body + '</svg>';
  };
})();
