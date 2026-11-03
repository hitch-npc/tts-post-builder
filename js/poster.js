/* Конструктор постов TTS — холст поста на классах SMM-слоя дизайн-системы (ds/ds-smm.css, решение №34).
   Из состояния собирается «спека», из спеки — разметка слайда. Вёрстка держит поля всегда: картинка уступает
   место тексту (не меньше 30 % высоты), название уменьшается до двух строк и до попадания в поля,
   а если не помогло — выгрузка закрывается. */
(function () {
  'use strict';
  var T = window.TTS;
  var esc = T.esc, br = T.br, fmt = T.fmt;

  // Кегль названия по шкале smm.tokens.json
  var BASE = { frame: 118, band: 118, cover: 118, details: 102, change: 94, digest: 94, type: 150, vtype: 118, collage: 102 };
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
    var v = state.video;
    var layout = type === 'change' ? 'change' : type === 'digest' ? 'digest'
      : type === 'video' ? (v.layout === 'band' ? 'band' : 'vtype') : state.layout;
    var wide = a.margins !== 'tight';
    var X = wide ? T.MARGINS.wide : T.MARGINS.tight;
    var story = f === 'story';
    var price = fmt.price(e.price);
    var when = fmt.dayMonth(e.date) + (e.time ? ', ' + e.time : '');
    // с днём недели — на холсте; зачёркнутая старая дата у переноса остаётся без него
    var whenDow = [fmt.dayMonth(e.date), fmt.dow(e.date), e.time].filter(Boolean).join(', ');

    var s = {
      type: type, layout: layout, format: f, H: T.FORMATS[f].h,
      x: X, pt: story ? T.STORY_PAD.top : X, pb: story ? T.STORY_PAD.bottom : X, wide: wide,
      theme: state.theme,
      // перенос — оранжевый (как тег «Мало мест»), отмена — красный; остальное — по жанру
      hue: type === 'change' ? (state.change.kind === 'cancel' ? 'red' : 'warm') : (T.GENRES[state.genre] || T.GENRES.other).hue,
      kind: ty(e.kind), title: ty(e.title), caps: !!a.titleCaps,
      titleSize: a.titleSize || 0,
      line: [whenDow, ty(e.venue)].filter(Boolean).join(' · '),
      age: e.age || '',
      image: { src: env && env.src ? env.src(e.image.ref) : '', x: e.image.x, y: e.image.y, zoom: e.image.zoom, ref: e.image.ref },
      imageSize: a.imageSize, logoTone: a.logoTone,
      manualBars: a.slides, manualFx: a.fx,
      titleFont: a.titleFont === 'cormorant' ? 'cormorant' : 'forum',
      // плотнее — там, где текст смотрят с мелкой сетки: обложка видео и подборка
      density: a.density >= 0 ? a.density : (type === 'video' || type === 'digest' ? 1 : 0),
      field: T.FIELDS[state.field] && !(simple && state.field === 'cobalt') ? state.field : 'auto',
      grain: a.grain !== false, rawNums: !!a.rawNums,
      typeStyle: v && T.TYPE_STYLES[v.style] ? v.style : 'poster', num: v ? String(v.num || '').trim() : '',
      maxLines: 2
    };
    if (type === 'video') {
      s.kind = ty(v.kind); s.title = ty(v.title); s.age = '';
      s.line = ty(v.line);
      if (layout === 'vtype') s.maxLines = T.VT_LINES[s.typeStyle];
    }
    if (type === 'status') s.mark = T.STATUSES[state.status].name;
    if (type === 'change') s.mark = T.CHANGES[state.change.kind].name;
    // цвет метки: инверсия по умолчанию; «как рисунок» берёт цвет рисунка или жанра; красный — только у переноса и отмены
    // только теги ядра: accent, green, orange, red, default; старые значения приводятся к ним
    var mc = { cobalt: 'accent', warm: 'orange' }[state.markColor] || state.markColor || 'invert';
    if (T.MARK_COLORS.indexOf(mc) === -1 || (mc === 'red' && type !== 'change')) mc = 'invert';
    s.markColor = mc;

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
        sub: [[fmt.dow(c.date), c.time].filter(Boolean).join(', '), ty(move && c.venue ? c.venue : e.venue), e.date ? 'вместо ' + fmt.dayMonth(e.date) : ''].filter(Boolean).join(' · '),
        was: when, venue: ty(e.venue),
        note: ty(c.note || T.CHANGES[c.kind].note)
      };
    }
    if (layout === 'collage') {
      var cl = state.collage;
      var pic = function (p) {
        var src = p && p.ref && env && env.src ? env.src(p.ref) : '';
        var dm = src && env && env.dims ? env.dims(src) : null;
        return { src: src, x: p ? p.x : 50, y: p ? p.y : 50, zoom: p ? p.zoom : 1, w: dm ? dm.w : 0, h: dm ? dm.h : 0 };
      };
      // разрыв билета зависит от названия — у каждого события свой; «Другой разрыв» сдвигает номер
      s.collage = {
        shape: T.SHAPES[cl.shape] ? cl.shape : 'ticket', depth: cl.depth,
        seed: (T.hashStr(e.title) + (cl.seed || 0)) >>> 0, side: ty(cl.side),
        // сетка: компоновка, ширина фигуры в колонках из 6, выравнивание фигуры
        grid: { stack: 1, bottom: 1, side: 1 }[cl.grid] ? cl.grid : 'stack',
        cols: [4, 5, 6].indexOf(+cl.cols) !== -1 ? +cl.cols : 6,
        align: { start: 1, center: 1, end: 1 }[cl.align] ? cl.align : 'start',
        p1: pic(cl.p1), p2: pic(cl.p2)
      };
    }
    if (type === 'digest') {
      var d = state.digest;
      s.title = ty(d.title); s.age = '';
      s.items = d.items.map(function (it) {
        var im = it.image && it.image.ref ? it.image : null;
        return {
          title: ty(it.title), day: fmt.dayMonth(it.date), time: [fmt.dow(it.date), it.time].filter(Boolean).join(', '), venue: ty(it.venue),
          img: im ? { src: env && env.src ? env.src(im.ref) : '', x: im.x, y: im.y } : null
        };
      });
      // превью — когда картинка есть у каждого события и событий не больше четырёх: иначе пустые клетки и тесно
      s.thumbs = s.items.length <= 4 && s.items.every(function (i) { return i.img; });
    }

    // свечение: «Рампа» с картинкой, выбранное — без картинки, у служебных постов и подборки — нет
    function autoFx(kind) {
      if (kind === 'type' || kind === 'vtype') return T.FX[state.glow] ? state.glow : 'studio';
      if (kind === 'details') return 'depth';
      if (kind === 'collage') return 'none';   // коллаж — на ровном фоне, свет спорит с объёмом фигуры
      if (kind === 'frame' || kind === 'band' || kind === 'cover') return 'footlight';
      return 'none';
    }
    // рисунок фона — у постов без картинки, обложек видео, переноса, отмены и подборки; вместо свечения
    var artKind = state.art || 'glass';
    var ART_LAYOUTS = { type: 1, vtype: 1, change: 1, digest: 1, collage: 1 };
    if (ART_LAYOUTS[layout] && T.ARTS && T.ARTS[artKind]) {
      // цвет: в расширенном интерфейсе — любой из цветов бренда, иначе по смыслу (жанр, перенос, отмена)
      // у переноса и отмены цвет по смыслу; свой — только вручную в расширенном интерфейсе
      var pick = state.artHue && state.artHue !== 'auto' && (type !== 'change' || state.mode === 'advanced') ? state.artHue : '';
      if (pick === 'red' && type !== 'change') pick = '';   // красный — сигнал тревоги, только у переноса и отмены
      s.art = { kind: artKind, seed: state.artSeed || 1, hue: pick || s.hue,
        calm: layout === 'digest' || layout === 'collage' ? 'list' : layout === 'vtype' && s.typeStyle === 'center' ? 'mid' : 'low' };
    }
    if (s.markColor === 'art') {
      var mh = (s.art && s.art.hue) || s.hue;
      // ближайший тег ядра; у цветов без своего тега (фиолетовый, бирюза, золото, серебро) — инверсия
      s.markColor = { cool: 'accent', cobalt: 'accent', green: 'green', warm: 'orange', red: 'red' }[mh] || 'invert';
    }
    function fxFor(kind) {
      if (s.art && ART_LAYOUTS[kind]) return 'none';
      // ручное свечение — только для постов с картинкой; без картинки свет выбирается в разделе «Вид»
      var manual = kind !== 'type' && kind !== 'vtype' && s.manualFx && s.manualFx !== 'auto' && T.FX[s.manualFx];
      return manual ? s.manualFx : autoFx(kind);
    }

    if (layout === 'vtype') {
      s.slides = [{ kind: 'vtype', bars: '', fx: fxFor('vtype') }];
    } else if (layout === 'album') {
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
  function fx(name) {
    if (!name || name === 'none') return '';
    return '<div class="smm-fx smm-fx--' + name + '">' + (T.FX_LAYERED[name] ? '<i></i><i></i><i></i>' : '') + '</div>';
  }
  // Название: цифры — в «прописном» начертании, иначе Cormorant рисует их старостильными
  function nums(s, raw) { return s.rawNums ? esc(raw) : T.numsHtml(raw); }
  function img(s) {
    var i = s.image, pos = i.x + '% ' + i.y + '%';
    return '<div class="smm-img" data-drag="event"><img src="' + esc(i.src) + '" alt="" style="object-position:' + pos +
      ';transform:scale(' + i.zoom + ');transform-origin:' + pos + '"></div>';
  }
  function kicker(s) {
    if (s.mark) return '<span class="smm-mark">' + esc(s.mark) + '</span>';
    return s.kind ? '<span class="smm-eyebrow">' + esc(s.kind) + '</span>' : '';
  }
  // Разметка названия обложки: «Колонка» — слово на строку, «Контраст» — первое слово крупнее остальных
  function titleHtml(s) {
    if (s.layout !== 'vtype') return nums(s, s.title);
    var words = s.title.split(/ +/).filter(Boolean);
    if (s.typeStyle === 'stack') return words.map(function (w) { return '<span class="bx-w">' + nums(s, w) + '</span>'; }).join('');
    if (s.typeStyle === 'contrast' && words.length > 1) {
      return '<span class="bx-w1">' + nums(s, words[0]) + '</span><span class="bx-rest">' + nums(s, words.slice(1).join(' ')) + '</span>';
    }
    return nums(s, s.title);
  }
  function title(s, size, extra) {
    return '<h2 class="smm-title' + (extra || '') + (s.caps ? ' smm-title--caps' : '') + '" data-title style="font-size:' + size + 'px">' + titleHtml(s) + '</h2>';
  }
  function line(text) { return text ? '<p class="smm-line">' + esc(text) + '</p>' : ''; }
  function canvasClass(s, layout) {
    return ['smm-canvas', 'smm-canvas--' + s.format, s.theme === 'light' ? 'smm-canvas--light' : '',
      s.hue !== 'cool' ? 'smm-canvas--' + s.hue : '', s.wide ? '' : 'smm-canvas--tight',
      'bx-tf-' + s.titleFont, s.density ? 'bx-d' + s.density : '', s.field !== 'auto' ? 'bx-field-' + s.field : '',
      s.grain && !s.art ? 'bx-grain' : '', s.markColor && s.markColor !== 'invert' ? 'bx-mark-' + s.markColor : '', layout].filter(Boolean).join(' ');
  }
  // слой рисунка: картинка из шейдера, класс smm-fx — чтобы лечь под текст, как свечение
  function art(s) {
    if (!s.art || !T.artUrl) return '';
    var url = T.artUrl({ kind: s.art.kind, seed: s.art.seed, theme: s.theme, hue: s.art.hue, field: s.field, w: 1080, h: s.H, calm: s.art.calm });
    return url ? '<img class="smm-fx bx-art" src="' + url + '" alt="">' : '';
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
      return '<div class="' + canvasClass(s, 'smm-sheet') + '">' + art(s) + fx(sl.fx) + head(s, sl.bars) +
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
          '<div class="smm-dg-what"><div class="smm-dg-title">' + nums(s, it.title) + '</div>' + (it.venue ? '<div class="smm-dg-meta">' + esc(it.venue) + '</div>' : '') + '</div>';
      }).join('');
      return '<div class="' + canvasClass(s, 'smm-sheet') + '">' + art(s) + fx(sl.fx) + head(s, sl.bars) +
        '<div class="smm-grid' + (s.thumbs ? ' smm-dg-thumbs' : '') + '" data-limit="' + lim + '">' + title(s, ts, ' smm-span') +
          '<div class="smm-gap"></div>' + items + '</div></div>';
    }
    if (k === 'collage') {
      // сверху надзаголовок и название, справа вертикальная строка, посередине фигура, внизу «когда и где»
      var c = s.collage;
      return '<div class="' + canvasClass(s, 'smm-collage bx-cl-l-' + c.grid + ' bx-cl-a-' + c.align) + '" style="--cl-cols:' + c.cols + '">' +
        art(s) + fx(sl.fx) + head(s, sl.bars) +
        '<div class="smm-text bx-cl-top">' + kicker(s) + title(s, ts) +
          (c.side ? '<span class="bx-cl-side">' + esc(c.side) + '</span>' : '') + '</div>' +
        '<div class="bx-cl-fig">' + T.collageSvg(c) + '</div>' +
        '<div class="bx-cl-foot" data-limit="' + lim + '">' + line(s.subline) + '</div></div>';
    }
    if (k === 'vtype') {
      var numeral = s.typeStyle === 'numeral' && s.num ? '<div class="bx-numeral" aria-hidden="true">' + nums(s, s.num) + '</div>' : '';
      return '<div class="' + canvasClass(s, 'smm-sheet smm-vt smm-vt--' + s.typeStyle) + '">' + art(s) + fx(sl.fx) + head(s, sl.bars) +
        '<div class="smm-text" data-limit="' + lim + '" style="--bx-ts:' + ts + 'px">' + kicker(s) + numeral + title(s, ts) + line(s.subline) + '</div></div>';
    }
    // type — без картинки, крупное название на рисунке или свечении
    return '<div class="' + canvasClass(s, 'smm-sheet smm-type') + '">' + art(s) + fx(sl.fx) + head(s, sl.bars) +
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
    var start = s.titleSize || (kind === 'vtype' ? T.VT_SIZE[s.typeStyle] : BASE.frame);
    // без картинки название крупнее и может уменьшаться сильнее, оставаясь крупным
    var big = kind === 'type' || kind === 'vtype';
    var min = Math.max(big ? 64 : 72, Math.round(start * (big ? 0.55 : 0.68)));
    var size = start, over, lines;
    for (;;) {
      host.innerHTML = T.renderSlide(s, i, size);
      var p = host.firstElementChild;
      over = overflowOf(p, scale || 1);
      lines = titleLines(p);
      if ((!over && lines <= (s.maxLines || 2)) || size <= min) break;
      size = Math.max(min, size - 4);
    }
    var px = function (v) { return Math.round(v * BASE[kind] / BASE.frame); };
    return { size: size, start: start, over: over, lines: lines, px: px(size), startPx: px(start) };
  };

  T.BASE = BASE;
  T.MIN_IMAGE = 0.3;
})();
