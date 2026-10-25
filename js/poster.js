/* Конструктор постов TTS — холст поста на классах SMM-слоя дизайн-системы (ds/ds-smm.css, решение №34).
   Из состояния собирается «спека», из спеки — разметка слайда. Вёрстка держит поля всегда: картинка уступает
   место тексту (не меньше 30 % высоты), название уменьшается до двух строк и до попадания в поля,
   а если не помогло — выгрузка закрывается. */
(function () {
  'use strict';
  var T = window.TTS;
  var esc = T.esc, br = T.br, fmt = T.fmt;

  // Кегль названия по шкале smm.tokens.json
  var BASE = { frame: 118, band: 118, cover: 118, details: 102, change: 94, digest: 94, type: 150 };
  var NB = ' ';

  /* ── спека: всё, что нужно холсту, уже посчитано и выверено ── */
  // env.src(ref) → адрес картинки; env.tone(spec) → 'dark' | 'light' для логотипа на картинке
  T.spec = function (state, env) {
    var simple = state.mode !== 'advanced';
    var a = simple ? T.ADV_DEFAULTS : state.adv;
    var ty = a.typograph === false ? function (s) { return s || ''; } : T.typo;
    var e = state.event, f = state.format;
    if (simple && f === 'square') f = 'post';
    var type = state.type;
    var layout = type === 'change' ? 'change' : type === 'digest' ? 'digest' : state.layout;
    var wide = a.margins !== 'tight';
    var X = wide ? T.MARGINS.wide : T.MARGINS.tight;
    var story = f === 'story';
    var price = fmt.price(e.price);
    var when = fmt.dayMonth(e.date) + (e.time ? ', ' + e.time : '');

    var s = {
      type: type, layout: layout, format: f, H: T.FORMATS[f].h,
      x: X, pt: story ? T.STORY_PAD.top : X, pb: story ? T.STORY_PAD.bottom : X, wide: wide,
      theme: state.theme, hue: (T.GENRES[state.genre] || T.GENRES.other).hue,
      kind: ty(e.kind), title: ty(e.title), caps: !!a.titleCaps,
      titleSize: a.titleSize || 0,
      line: [when, ty(e.venue)].filter(Boolean).join(' · '),
      age: e.age || '',
      image: { src: env && env.src ? env.src(e.image.ref) : '', x: e.image.x, y: e.image.y, zoom: e.image.zoom, ref: e.image.ref },
      imageSize: a.imageSize, logoTone: a.logoTone,
      manualBars: a.slides, manualFx: a.fx
    };
    if (type === 'status') s.mark = T.STATUSES[state.status].name;
    if (type === 'change') s.mark = T.CHANGES[state.change.kind].name;

    // слайд деталей альбома: одна фраза и пункты в одну строку
    var autoRows = [
      { label: 'Когда', a: fmt.short(e.date) + (e.time ? ' · ' + e.time : '') },
      { label: 'Где', a: ty(e.venue) },
      { label: 'Билеты', a: price ? 'от ' + price + NB + '₽, без комиссии' : 'Без комиссии' }
    ];
    s.rows = (a.customRows || autoRows).map(function (r) { return { label: r.label, a: ty(r.a) }; });
    s.subline = ty(a.subline) || s.line;
    s.detailsLead = ty(a.detailsLead || e.lead);

    if (type === 'change') {
      var c = state.change, move = c.kind === 'move';
      s.change = {
        move: move,
        newDay: fmt.dayMonth(c.date),
        sub: [c.time, ty(move && c.venue ? c.venue : e.venue), e.date ? 'вместо ' + fmt.dayMonth(e.date) : ''].filter(Boolean).join(' · '),
        was: when, venue: ty(e.venue),
        note: ty(c.note || T.CHANGES[c.kind].note)
      };
    }
    if (type === 'digest') {
      var d = state.digest;
      s.title = ty(d.title); s.age = '';
      s.items = d.items.map(function (it) {
        var im = it.image && it.image.ref ? it.image : null;
        return {
          title: ty(it.title), day: fmt.dayMonth(it.date), time: it.time || '', venue: ty(it.venue),
          img: im ? { src: env && env.src ? env.src(im.ref) : '', x: im.x, y: im.y } : null
        };
      });
      // превью — когда картинка есть у каждого события и событий не больше четырёх: иначе пустые клетки и тесно
      s.thumbs = s.items.length <= 4 && s.items.every(function (i) { return i.img; });
    }

    // свечение: «Рампа» с картинкой, выбранное — без картинки, у служебных постов и подборки — нет
    function autoFx(kind) {
      if (kind === 'type') return state.glow || 'depth';
      if (kind === 'details') return 'depth';
      if (kind === 'frame' || kind === 'band' || kind === 'cover') return 'footlight';
      return 'none';
    }
    function fxFor(kind) { return s.manualFx && s.manualFx !== 'auto' ? s.manualFx : autoFx(kind); }

    if (layout === 'album') {
      s.slides = [{ kind: 'cover', bars: '1/2', fx: fxFor('cover') }, { kind: 'details', bars: '2/2', fx: fxFor('details') }];
    } else {
      var bars = s.manualBars && s.manualBars !== 'auto' && s.manualBars !== '0' ? s.manualBars : '';
      s.slides = [{ kind: layout, bars: bars, fx: fxFor(layout) }];
    }
    if (layout === 'band') s.tone = s.logoTone !== 'auto' ? s.logoTone : (env && env.tone ? env.tone(s) : 'dark');
    return s;
  };

  /* ── части холста ── */
  var logoSeq = 0;
  function logo() { logoSeq += 1; return window.TTS_LOGO.replace(/mask0_14_6/g, 'ttsm' + logoSeq); }
  T.logo = logo;
  // Только глаз из логотипа — для круглых аватаров в превью площадок
  T.logoMark = function () { return logo().replace('viewBox="0 0 676 194"', 'viewBox="-40 -65 321 321"'); };

  function bars(v) {
    if (!v) return '';
    var p = v.split('/'), active = +p[0], total = +p[1], out = '';
    for (var i = 1; i <= total; i++) out += '<span class="smm-dot' + (i === active ? ' smm-dot--active' : '') + '"></span>';
    return '<span class="smm-dots">' + out + '</span>';
  }
  function head(s, b) {
    var age = s.age ? '<span class="smm-age">' + esc(s.age) + '</span>' : '';
    return '<div class="smm-head"><span class="smm-logo">' + logo() + '</span><div class="smm-meta">' + age + bars(b) + '</div></div>';
  }
  function fx(name) { return name && name !== 'none' ? '<div class="smm-fx smm-fx--' + name + '"></div>' : ''; }
  function img(s) {
    var i = s.image, pos = i.x + '% ' + i.y + '%';
    return '<div class="smm-img" data-drag="event"><img src="' + esc(i.src) + '" alt="" style="object-position:' + pos +
      ';transform:scale(' + i.zoom + ');transform-origin:' + pos + '"></div>';
  }
  function kicker(s) {
    if (s.mark) return '<span class="smm-mark">' + esc(s.mark) + '</span>';
    return s.kind ? '<span class="smm-eyebrow">' + esc(s.kind) + '</span>' : '';
  }
  function title(s, size, extra) {
    return '<h2 class="smm-title' + (extra || '') + (s.caps ? ' smm-title--caps' : '') + '" data-title style="font-size:' + size + 'px">' + esc(s.title) + '</h2>';
  }
  function line(text) { return text ? '<p class="smm-line">' + esc(text) + '</p>' : ''; }
  function canvasClass(s, layout) {
    return ['smm-canvas', 'smm-canvas--' + s.format, s.theme === 'light' ? 'smm-canvas--light' : '',
      s.hue !== 'cool' ? 'smm-canvas--' + s.hue : '', s.wide ? '' : 'smm-canvas--tight', layout].filter(Boolean).join(' ');
  }

  /* ── слайды ── */
  // size — кегль основного макета (118 по шкале); у остальных макетов кегль меняется в той же пропорции.
  // data-limit — нижняя граница, за которую не должен выходить элемент.
  T.renderSlide = function (s, i, size) {
    var sl = s.slides[i] || s.slides[0];
    var H = s.H, k = sl.kind, lim = H - s.pb;
    var ts = Math.round((size || BASE.frame) * BASE[k] / BASE.frame);

    if (k === 'frame') {
      return '<div class="' + canvasClass(s, 'smm-frame') + '">' + fx(sl.fx) + head(s, sl.bars) + img(s) +
        '<div class="smm-text" data-limit="' + lim + '">' + kicker(s) + title(s, ts) + line(s.subline) + '</div></div>';
    }
    if (k === 'band') {
      var tone = s.tone === 'light' ? 'smm-band--on-dark' : 'smm-band--on-light';
      return '<div class="' + canvasClass(s, 'smm-band ' + tone) + '" style="--smm-img-h:' + s.imageSize + '%">' + img(s) +
        '<div class="smm-scrim"></div>' + head(s, sl.bars) +
        '<div class="smm-panel" data-limit="' + H + '">' + fx(sl.fx) +
          '<div class="smm-text">' + kicker(s) + title(s, ts) + line(s.subline) + '</div></div></div>';
    }
    if (k === 'cover') {
      return '<div class="' + canvasClass(s, 'smm-cover') + '" style="--smm-img-h:' + s.imageSize + '%">' + img(s) +
        '<div class="smm-panel" data-limit="' + H + '">' + fx(sl.fx) + head(s, sl.bars) +
          '<div class="smm-text">' + (s.mark ? '<span class="smm-mark">' + esc(s.mark) + '</span>' : '') + title(s, ts) + line(s.subline) + '</div></div></div>';
    }
    if (k === 'details') {
      var rows = s.rows.map(function (r) {
        return '<div class="smm-rule"></div><div class="smm-row-label">' + esc(r.label) + '</div><div class="smm-row-val">' + esc(r.a) + '</div>';
      }).join('');
      return '<div class="' + canvasClass(s, 'smm-sheet') + '">' + fx(sl.fx) + head(s, sl.bars) +
        '<div class="smm-grid" data-limit="' + lim + '">' + title(s, ts, ' smm-span') +
          (s.detailsLead ? '<p class="smm-lead">' + br(s.detailsLead) + '</p>' : '') +
          '<div class="smm-gap"></div>' + rows + '</div></div>';
    }
    if (k === 'change') {
      var c = s.change;
      var body = c.move
        ? '<div class="smm-big">' + esc(c.newDay) + '</div>' + (c.sub ? '<p class="smm-sub">' + esc(c.sub) + '</p>' : '')
        : '<p class="smm-line"><span class="smm-was">' + esc(c.was) + '</span>' + (c.venue ? ' · ' + esc(c.venue) : '') + '</p>';
      return '<div class="' + canvasClass(s, 'smm-sheet') + '">' + fx(sl.fx) + head(s, sl.bars) +
        '<div class="smm-text" data-limit="' + lim + '"><span class="smm-mark">' + esc(s.mark) + '</span>' + title(s, ts) + body +
          (c.note ? '<p class="smm-note">' + esc(c.note) + '</p>' : '') + '</div></div>';
    }
    if (k === 'digest') {
      var items = s.items.map(function (it) {
        var thumb = '';
        if (s.thumbs) {
          thumb = it.img ? '<div class="smm-dg-thumb"><img src="' + esc(it.img.src) + '" alt="" style="object-position:' + it.img.x + '% ' + it.img.y + '%"></div>'
            : '<div class="smm-dg-thumb"></div>';
        }
        return '<div class="smm-rule"></div>' + thumb +
          '<div class="smm-dg-when"><span class="smm-num">' + esc(it.day) + '</span>' + (it.time ? '<span class="smm-label">' + esc(it.time) + '</span>' : '') + '</div>' +
          '<div class="smm-dg-what"><div class="smm-dg-title">' + esc(it.title) + '</div>' + (it.venue ? '<div class="smm-dg-meta">' + esc(it.venue) + '</div>' : '') + '</div>';
      }).join('');
      return '<div class="' + canvasClass(s, 'smm-sheet') + '">' + fx(sl.fx) + head(s, sl.bars) +
        '<div class="smm-grid' + (s.thumbs ? ' smm-dg-thumbs' : '') + '" data-limit="' + lim + '">' + title(s, ts, ' smm-span') +
          '<div class="smm-gap"></div>' + items + '</div></div>';
    }
    // type — без картинки, крупное название на свечении
    return '<div class="' + canvasClass(s, 'smm-sheet smm-type') + '">' + fx(sl.fx) + head(s, sl.bars) +
      '<div class="smm-text" data-limit="' + lim + '">' + kicker(s) + title(s, ts) + line(s.subline) + '</div></div>';
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
    return Math.round(t.offsetHeight / (fs * (parseFloat(getComputedStyle(t).lineHeight) / fs || 1)));
  }
  // Рендер одного слайда с подгонкой названия. Возвращает кегль (по шкале основного макета), вылет и число строк.
  T.layout = function (s, i, host, scale) {
    var kind = (s.slides[i] || s.slides[0]).kind;
    var start = s.titleSize || BASE.frame;
    // без картинки название крупнее и может уменьшаться сильнее, оставаясь крупным
    var min = Math.max(kind === 'type' ? 64 : 72, Math.round(start * (kind === 'type' ? 0.55 : 0.68)));
    var size = start, over, lines;
    for (;;) {
      host.innerHTML = T.renderSlide(s, i, size);
      var p = host.firstElementChild;
      over = overflowOf(p, scale || 1);
      lines = titleLines(p);
      if ((!over && lines <= 2) || size <= min) break;
      size = Math.max(min, size - 4);
    }
    var px = function (v) { return Math.round(v * BASE[kind] / BASE.frame); };
    return { size: size, start: start, over: over, lines: lines, px: px(size), startPx: px(start) };
  };

  T.BASE = BASE;
  T.MIN_IMAGE = 0.3;
})();
