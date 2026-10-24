/* Конструктор постов TTS — холст поста: из состояния собирается «спека», из спеки — разметка слайда.
   Вёрстка держит поля всегда: картинка уступает место тексту (не меньше 30 % высоты),
   название уменьшается до двух строк и до попадания в поля, а если не помогло — выгрузка блокируется. */
(function () {
  'use strict';
  var T = window.TTS;
  var esc = T.esc, br = T.br, fmt = T.fmt;

  var MIN_IMAGE = 0.3;
  var LEAD_MAX = 776;          // 5 колонок из 6 — длина строки подводки
  var TITLE_AUTO = 118;        // --smm-fs-display
  var TITLE_AUTO_MIN = 80;

  /* ── спека: всё, что нужно холсту, уже посчитано и выверено ── */
  // env.src(ref) → адрес картинки; env.tone(spec) → 'dark' | 'light' для логотипа на картинке
  T.spec = function (state, env) {
    var simple = state.mode !== 'advanced';
    var a = simple ? T.ADV_DEFAULTS : state.adv;
    var ty = a.typograph === false ? function (s) { return s || ''; } : T.typo;
    var e = state.event, f = state.format;
    if (simple && f === 'square') f = 'post';
    var F = T.FORMATS[f];
    var type = state.type;
    var service = type === 'change';
    var blobLevel = a.blobLevel === 'auto' ? (service ? 'none' : 'soft') : a.blobLevel;
    var blob = a.blobColor === 'auto' ? (T.GENRES[state.genre] || T.GENRES.other).blob : a.blobColor;
    var price = fmt.price(e.price);

    var s = {
      type: type, format: f, H: F.h, pt: F.padTop, pb: F.padBottom,
      theme: state.theme, blob: blob, blobLevel: blobLevel,
      layout: type === 'change' ? 'change' : type === 'digest' ? 'digest' : state.layout,
      kind: ty(e.kind), title: ty(e.title), caps: !!a.titleCaps,
      titleSize: a.titleSize || 0,
      lead: ty(e.lead), age: e.age || '',
      image: { src: env && env.src ? env.src(e.image.ref) : '', x: e.image.x, y: e.image.y, zoom: e.image.zoom, ref: e.image.ref },
      imageSize: a.imageSize, logoTone: a.logoTone,
      slides: [], manualBars: a.slides
    };
    if (type === 'status') s.tag = { text: T.STATUSES[state.status].name, tone: T.STATUSES[state.status].tag };
    if (type === 'change') s.tag = { text: T.CHANGES[state.change.kind].name, tone: T.CHANGES[state.change.kind].tag };

    // строка данных под подводкой
    var autoInfo = [
      { label: 'Когда', a: fmt.short(e.date), b: e.time ? 'начало в ' + e.time : '' },
      { label: 'Где', a: ty(e.venue), b: ty(e.city) },
      { label: 'Билеты', a: price ? 'от ' + price + ' ₽' : 'в продаже', b: 'без комиссии' }
    ];
    var info = a.customInfo || autoInfo;
    s.info = info.slice(0, a.infoCount);

    // таблица на слайде деталей
    var autoRows = [
      { label: 'Когда', a: fmt.longDow(e.date), b: e.time ? 'Начало в ' + e.time : '' },
      { label: 'Где', a: ty(e.venue), b: ty(e.city) },
      { label: 'Билеты', a: price ? 'От ' + price + ' ₽' : 'В продаже', b: 'Без комиссии, с выбором мест' }
    ];
    s.rows = (a.customRows || autoRows).map(function (r) { return { label: r.label, a: ty(r.a), b: ty(r.b) }; });
    s.subline = ty(a.subline) || [fmt.short(e.date), ty(e.venue)].filter(Boolean).join(' · ');
    s.detailsLead = ty(a.detailsLead) || s.lead;

    if (type === 'change') {
      var c = state.change, move = c.kind === 'move';
      s.change = {
        move: move,
        oldWhen: [fmt.short(e.date), e.time].filter(Boolean).join(' · '),
        newDay: fmt.dayMonth(c.date),
        newRest: [fmt.dowFull(c.date), c.time ? 'начало в ' + c.time : ''].filter(Boolean).join(', '),
        venueChanged: move && !!c.venue && c.venue !== e.venue,
        venue: ty(move && c.venue ? c.venue : e.venue), city: ty(e.city),
        note: ty(c.note || T.CHANGES[c.kind].note)
      };
    }
    if (type === 'digest') {
      var d = state.digest;
      s.kind = ty(d.kind); s.title = ty(d.title); s.age = '';
      s.items = d.items.map(function (it) {
        var p = fmt.price(it.price);
        return {
          title: ty(it.title), day: fmt.dayMonth(it.date),
          when: [fmt.dow(it.date), it.time].filter(Boolean).join(', '),
          meta: [ty(it.venue), p ? 'от ' + p + ' ₽' : ''].filter(Boolean).join(' · ')
        };
      });
    }

    // слайды
    if (s.layout === 'album') {
      s.slides = [{ kind: 'cover', bars: '1/2' }, { kind: 'details', bars: '2/2' }];
    } else {
      var bars = s.manualBars && s.manualBars !== 'auto' && s.manualBars !== '0' ? s.manualBars : '';
      s.slides = [{ kind: s.layout, bars: bars }];
    }
    if (s.layout === 'band' || s.layout === 'album') {
      s.tone = s.logoTone !== 'auto' ? s.logoTone : (env && env.tone ? env.tone(s) : 'dark');
    }
    return s;
  };

  /* ── части холста ── */
  var logoSeq = 0;
  function logo() { logoSeq += 1; return window.TTS_LOGO.replace(/mask0_14_6/g, 'ttsm' + logoSeq); }
  T.logo = logo;
  // Только глаз из логотипа — для круглых аватаров в превью площадок
  T.logoMark = function () { return logo().replace('viewBox="0 0 676 194"', 'viewBox="-40 -65 321 321"'); };

  function barsHtml(v) {
    if (!v) return '';
    var p = v.split('/'), active = +p[0], total = +p[1], out = '';
    for (var i = 1; i <= total; i++) out += '<span class="p-bar' + (i === active ? ' on' : '') + '"></span>';
    return '<span class="p-bars">' + out + '</span>';
  }
  function head(s, bars) {
    var age = s.age ? '<span class="p-age">' + esc(s.age) + '</span>' : '';
    return '<div class="p-grid p-head">' +
      '<span class="p-logo">' + logo() + '</span>' +
      '<div class="p-meta">' + age + barsHtml(bars) + '</div></div>';
  }
  function img(s, style) {
    var i = s.image, pos = i.x + '% ' + i.y + '%';
    return '<div class="p-img" data-drag="event" style="' + style + '"><img src="' + esc(i.src) + '" alt="" style="object-position:' + pos +
      ';transform:scale(' + i.zoom + ');transform-origin:' + pos + '"></div>';
  }
  function tag(s) {
    return s.tag ? '<span class="p-tag p-tag-' + s.tag.tone + '">' + esc(s.tag.text) + '</span>' : '';
  }
  function kicker(s, style) {
    if (!s.tag && !s.kind) return '';
    return '<div class="p-kicker"' + (style ? ' style="' + style + '"' : '') + '>' + tag(s) +
      (s.kind ? '<span class="p-eyebrow">' + esc(s.kind) + '</span>' : '') + '</div>';
  }
  function title(s, size, marginTop) {
    var st = 'font-size:' + size + 'px' + (marginTop ? ';margin-top:' + marginTop + 'px' : '');
    return '<h1 class="p-title' + (s.caps ? ' caps' : '') + '" data-title style="' + st + '">' + esc(s.title) + '</h1>';
  }
  function textBlock(s, size) {
    var k = kicker(s);
    return k + title(s, size, k ? 20 : 0) +
      (s.lead ? '<div class="p-lead" style="max-width:' + LEAD_MAX + 'px">' + br(s.lead) + '</div>' : '');
  }
  function info(s) {
    var n = s.info.length;
    if (!n) return '';
    var span = 6 / n, cells = '';
    s.info.forEach(function (c) {
      cells += '<div class="p-info-cell" style="grid-column:span ' + span + '"><div class="p-label">' + esc(c.label) + '</div>' +
        '<div class="p-val">' + esc(c.a) + (c.b ? '<br><span>' + esc(c.b) + '</span>' : '') + '</div></div>';
    });
    return '<div class="p-grid p-info">' + cells + '</div>';
  }
  // Свечение на фоне холста — для слайдов, где текст стоит на фоне
  function blobs(s, kind) {
    if (s.blobLevel === 'none') return '';
    if (s.blobLevel === 'soft' && kind === 'frame') {
      var cls = s.blob === 'cool' ? 'p-blob-blue' : 'p-blob-genre';
      return '<div class="p-blob ' + cls + '" style="right:-340px;bottom:-400px;width:900px;height:900px;opacity:.55"></div>';
    }
    var pos = {
      frame:   ['right:-300px;bottom:-340px', 'left:-320px;bottom:-260px'],
      details: ['right:-380px;top:-420px',    'left:-320px;bottom:-260px']
    }[kind];
    var op = s.blobLevel === 'soft' ? ';opacity:.7' : '';
    return '<div class="p-blob p-blob-blue" style="' + pos[0] + ';width:1100px;height:1100px' + op + '"></div>' +
           '<div class="p-blob p-blob-genre" style="' + pos[1] + ';width:900px;height:900px' + op + '"></div>';
  }
  // Свечение внутри текстовой панели под картинкой: гаснет раньше верхнего края панели
  function panelGlow(s) {
    if (s.blobLevel === 'none') return '';
    if (s.blobLevel === 'soft') return s.blob === 'cool' ? ' glow-soft-blue' : ' glow-soft-genre';
    return ' glow-full';
  }
  function rowsHtml(rows) {
    return rows.map(function (r) {
      return '<div class="p-rowline"></div>' +
        '<div class="p-row-label">' + esc(r.label) + '</div>' +
        '<div class="p-row-val' + (r.cls ? ' ' + r.cls : '') + '">' + (r.html || esc(r.a) + (r.b ? '<br><span>' + esc(r.b) + '</span>' : '')) + '</div>';
    }).join('');
  }
  function attrs(s) {
    return 'class="poster" data-theme="' + s.theme + '" data-genre="' + s.blob + '" data-format="' + s.format + '"';
  }

  /* ── слайды ── */
  // size — кегль названия после подгонки; data-limit — нижняя граница, за которую не должен выходить элемент
  T.renderSlide = function (s, i, size) {
    var sl = s.slides[i] || s.slides[0];
    var H = s.H, pt = s.pt, pb = s.pb, X = T.SIDE, body;
    var minImg = Math.round(H * MIN_IMAGE);
    size = size || s.titleSize || TITLE_AUTO;

    if (sl.kind === 'frame') {
      var hasInfo = s.info.length > 0;
      body = blobs(s, 'frame') +
        head(s, sl.bars) +
        img(s, 'flex:1 1 0;min-height:' + minImg + 'px;margin-top:40px') +
        '<div style="flex:0 0 auto;margin-top:56px"' + (hasInfo ? '' : ' data-limit="' + (H - pb) + '"') + '>' + textBlock(s, size) + '</div>' +
        (hasInfo ? '<div style="flex:0 0 auto;margin-top:44px" data-limit="' + (H - pb) + '">' + info(s) + '</div>' : '');
      return '<div ' + attrs(s) + ' style="height:' + H + 'px;padding:' + pt + 'px ' + X + 'px ' + pb + 'px">' + body + '</div>';
    }

    if (sl.kind === 'band') {
      var ih = Math.max(minImg, Math.round(H * s.imageSize / 100));
      var light = s.tone === 'light';
      var tone = light ? '#D6D6D2' : '#0D0D0D';
      var scrim = light ? '#0D0D0D' : '#F2F1EB';
      body =
        img(s, 'flex:0 1 ' + ih + 'px;min-height:' + minImg + 'px') +
        // мягкая подложка под шапкой, чтобы логотип читался на любой картинке
        '<div aria-hidden="true" style="position:absolute;top:0;left:0;right:0;height:' + (pt + 170) + 'px;z-index:1;background:linear-gradient(180deg,' + scrim + '73 0%,' + scrim + '00 100%)"></div>' +
        '<div style="position:absolute;top:' + pt + 'px;left:' + X + 'px;right:' + X + 'px;z-index:2;--p-fg:' + tone + ';--p-muted:' + tone + ';--p-bar-off:' + tone + '4D">' + head(s, sl.bars) + '</div>' +
        '<div class="p-panel' + panelGlow(s) + '" style="flex:1 0 auto;display:flex;flex-direction:column;justify-content:space-between;padding:64px ' + X + 'px ' + pb + 'px" data-limit="' + H + '">' +
          '<div>' + textBlock(s, size) + '</div>' +
          (s.info.length ? '<div style="margin-top:44px">' + info(s) + '</div>' : '') +
        '</div>';
      return '<div ' + attrs(s) + ' style="height:' + H + 'px">' + body + '</div>';
    }

    if (sl.kind === 'cover') {
      var ch = Math.max(minImg, Math.round(H * s.imageSize / 100));
      body =
        img(s, 'flex:0 1 ' + ch + 'px;min-height:' + minImg + 'px') +
        '<div class="p-panel' + panelGlow(s) + '" style="flex:1 0 auto;display:flex;flex-direction:column;justify-content:space-between;padding:56px ' + X + 'px ' + pb + 'px" data-limit="' + H + '">' +
          head(s, sl.bars) +
          '<div style="margin-top:40px">' + (s.tag ? '<div class="p-kicker">' + tag(s) + '</div>' : '') +
            title(s, size, s.tag ? 20 : 0) +
            (s.subline ? '<div class="p-lead" style="margin-top:18px;max-width:' + LEAD_MAX + 'px">' + esc(s.subline) + '</div>' : '') +
          '</div>' +
        '</div>';
      return '<div ' + attrs(s) + ' style="height:' + H + 'px">' + body + '</div>';
    }

    var content = '';
    if (sl.kind === 'details') {
      content = kicker(s, 'grid-column:1/-1') +
        '<div style="grid-column:1/-1">' + title(s, Math.round(size * 0.87), s.kind || s.tag ? 20 : 0) + '</div>' +
        (s.detailsLead ? '<div class="p-lead" style="grid-column:1/6;margin-top:28px">' + br(s.detailsLead) + '</div>' : '') +
        '<div style="grid-column:1/-1;height:48px"></div>' + rowsHtml(s.rows);
    } else if (sl.kind === 'change') {
      var c = s.change, rows = [];
      if (c.move) {
        rows.push({ label: 'Новая дата', html: '<span class="p-num">' + esc(c.newDay) + '</span>' + (c.newRest ? '<br><span>' + esc(c.newRest) + '</span>' : '') });
        rows.push({ label: 'Было', a: c.oldWhen, cls: 'p-was' });
        rows.push({ label: c.venueChanged ? 'Новое место' : 'Где', a: c.venue, b: c.city });
      } else {
        rows.push({ label: 'Дата', a: c.oldWhen, cls: 'p-was' });
        rows.push({ label: 'Где', a: c.venue, b: c.city });
      }
      rows.push({ label: 'Билеты', a: c.note });
      content = kicker(s, 'grid-column:1/-1') +
        '<div style="grid-column:1/-1">' + title(s, Math.round(size * 0.8), 20) + '</div>' +
        '<div style="grid-column:1/-1;height:56px"></div>' + rowsHtml(rows);
    } else if (sl.kind === 'digest') {
      var it = Math.max(40, Math.min(52, Math.round(size * 0.44)));
      content = kicker(s, 'grid-column:1/-1') +
        '<div style="grid-column:1/-1">' + title(s, Math.round(size * 0.75), s.kind ? 20 : 0) + '</div>' +
        '<div style="grid-column:1/-1;height:48px"></div>' +
        s.items.map(function (x) {
          return '<div class="p-rowline"></div>' +
            '<div class="p-dg-when"><span class="p-num">' + esc(x.day) + '</span><span class="p-label">' + esc(x.when) + '</span></div>' +
            '<div class="p-dg-what"><div class="p-dg-title" style="font-size:' + it + 'px">' + esc(x.title) + '</div>' +
            (x.meta ? '<div class="p-dg-meta">' + esc(x.meta) + '</div>' : '') + '</div>';
        }).join('');
    }
    body = blobs(s, 'details') + head(s, sl.bars) +
      '<div class="p-grid" style="margin-top:56px" data-limit="' + (H - pb) + '">' + content + '</div>';
    return '<div ' + attrs(s) + ' style="height:' + H + 'px;padding:' + pt + 'px ' + X + 'px ' + pb + 'px;justify-content:space-between">' + body + '</div>';
  };

  /* ── подгонка ── */
  // Насколько содержимое вылезло за поля, px холста (0 — всё на месте)
  function overflowOf(poster, scale) {
    var top = poster.getBoundingClientRect().top, worst = 0;
    poster.querySelectorAll('[data-limit]').forEach(function (el) {
      var bottom = (el.getBoundingClientRect().bottom - top) / scale;
      worst = Math.max(worst, bottom - parseFloat(el.getAttribute('data-limit')));
    });
    return Math.ceil(worst > 0.5 ? worst : 0);
  }
  function titleLines(poster) {
    var t = poster.querySelector('[data-title]');
    if (!t) return 0;
    var fs = parseFloat(t.style.fontSize) || 100;
    return Math.round(t.offsetHeight / fs);
  }
  // Рендер одного слайда с подгонкой названия. Возвращает кегль, вылет за поля и число строк названия.
  T.layout = function (s, i, host, scale) {
    var start = s.titleSize || TITLE_AUTO;
    var min = s.titleSize ? Math.max(72, Math.round(start * 0.8)) : TITLE_AUTO_MIN;
    var size = start, over, lines;
    for (;;) {
      host.innerHTML = T.renderSlide(s, i, size);
      var p = host.firstElementChild;
      over = overflowOf(p, scale || 1);
      lines = titleLines(p);
      if ((!over && lines <= 2) || size <= min) break;
      size = Math.max(min, size - 4);
    }
    return { size: size, start: start, over: over, lines: lines };
  };
  // Подгонка всех слайдов поста. Кегль названия на альбоме общий — по самому тесному слайду.
  T.layoutAll = function (s, host, scale) {
    var res = s.slides.map(function (_, i) { return T.layout(s, i, host, scale); });
    return {
      slides: res,
      over: Math.max.apply(null, res.map(function (r) { return r.over; })),
      size: Math.min.apply(null, res.map(function (r) { return r.size; })),
      start: res[0].start,
      lines: Math.max.apply(null, res.map(function (r) { return r.lines; }))
    };
  };

  T.MIN_IMAGE = MIN_IMAGE;
})();
