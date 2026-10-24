/* Конструктор постов TTS. Состояние → разметка холста → PNG/JPEG через html-to-image. */
(function () {
  'use strict';

  var STORE_KEY = 'tts-post-builder-v1';
  var EXAMPLE_IMG = 'assets/example.jpg';
  var FORMATS = {
    post:   { h: 1350, name: '4:5',  padTop: 72,  padBottom: 72 },
    square: { h: 1080, name: '1:1',  padTop: 64,  padBottom: 64 },
    story:  { h: 1920, name: '9:16', padTop: 222, padBottom: 200 } // поля под интерфейс сторис
  };
  var NUMERIC_CHIPS = { infoCount: true, exportScale: true };

  var DEFAULTS = {
    template: 'frame', format: 'post', theme: 'light', genre: 'cool', blobLevel: 'soft', logoTone: 'dark',
    image: { src: EXAMPLE_IMG, x: 50, y: 50, zoom: 1 },
    imageSize: 60,
    eyebrow: 'Спектакль-концерт',
    title: 'Мёртвые души', titleSize: 120, titleCaps: false,
    lead: 'Гоголь — Евгений Миронов и Мария Смольникова. Шнитке — Юрий Башмет и оркестр «Новая Россия».',
    subline: 'Миронов и Башмет на одной сцене · 29 апреля, Дом музыки',
    detailsLead: 'Поэма Гоголя и «Гоголь-сюита» Шнитке в одном вечере. Текст звучит голосами Евгения Миронова и Марии Смольниковой, музыку ведут Юрий Башмет и оркестр «Новая Россия». Режиссёр — Мария Брусникина.',
    age: '12+', slides: '0',
    infoCount: 2,
    info: [
      { label: 'Когда', a: '29 апреля, чт', b: 'начало в 19:00' },
      { label: 'Где', a: 'Дом музыки', b: 'Москва' },
      { label: 'Билеты', a: 'Без комиссии', b: 'и с выбором мест' }
    ],
    rows: [
      { label: 'Когда', a: '29 апреля 2027, четверг', b: 'Начало в 19:00' },
      { label: 'Где', a: 'Дом музыки', b: 'Москва' },
      { label: 'Билеты', a: 'Без комиссии, с выбором мест', b: 'Продажи только открылись — лучшие места ещё свободны' }
    ],
    exportScale: 1, jpegQuality: 0.92,
    caption: {
      hook: 'Евгений Миронов, Юрий Башмет на одной сцене',
      body: '«Мёртвые души» — спектакль-концерт, где отрывки из поэмы Гоголя звучат вместе с «Гоголь-сюитой» Альфреда Шнитке. На сцене — Евгений Миронов, Мария Смольникова, Юрий Башмет и Государственный симфонический оркестр «Новая Россия». Режиссёр — Мария Брусникина.',
      date: '29 апреля 2027', time: '19:00', venue: 'Дом музыки',
      link: '', price: '3 000',
      why: 'Билеты только поступили в продажу — лучшие места по стартовой цене разбирают первыми.'
    }
  };

  var state = load();
  var logoSeq = 0;

  /* ── хранение ── */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function merge(base, over) {
    if (Array.isArray(base)) return Array.isArray(over) ? over : base;
    if (base && typeof base === 'object') {
      var out = {};
      Object.keys(base).forEach(function (k) { out[k] = over && k in over ? merge(base[k], over[k]) : clone(base[k]); });
      return out;
    }
    return over === undefined ? base : over;
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) return merge(DEFAULTS, JSON.parse(raw));
    } catch (e) { /* хранилище недоступно — работаем с примером */ }
    return clone(DEFAULTS);
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) {
      // большая картинка может не влезть — сохраняем всё, кроме неё
      try { var s = clone(state); s.image.src = EXAMPLE_IMG; localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e2) { /* без сохранения */ }
    }
  }

  /* ── утилиты ── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function getPath(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function setPath(obj, path, val) {
    var ks = path.split('.'), o = obj;
    for (var i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = val;
  }
  function logo() {
    logoSeq += 1;
    return window.TTS_LOGO.replace(/mask0_14_6/g, 'ttsm' + logoSeq);
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  /* ── холст ── */
  // Вёрстка держит поля холста всегда: текст важнее картинки. Картинка уступает место тексту,
  // но не меньше MIN_IMAGE от высоты холста. Если и так не помещается — уменьшается название
  // (не больше чем на 20 %, не мельче 72 px), а дальше экспорт блокируется с подсказкой.
  var MIN_IMAGE = 0.3;
  var LEAD_MAX = 776; // 5 колонок из 6 — длина строки подводки

  function bars(slides) {
    if (!slides || slides === '0') return '';
    var p = slides.split('/'), active = +p[0], total = +p[1], out = '';
    for (var i = 1; i <= total; i++) out += '<span class="p-bar' + (i === active ? ' on' : '') + '"></span>';
    return '<span class="p-bars">' + out + '</span>';
  }
  function head(s) {
    var age = s.age ? '<span class="p-age">' + esc(s.age) + '</span>' : '';
    return '<div class="p-grid p-head">' +
      '<span class="p-logo">' + logo() + '</span>' +
      '<div class="p-meta">' + age + bars(s.slides) + '</div></div>';
  }
  function img(s, style) {
    var i = s.image, pos = i.x + '% ' + i.y + '%';
    return '<div class="p-img" style="' + style + '"><img src="' + esc(i.src) + '" alt="" style="object-position:' + pos +
      ';transform:scale(' + i.zoom + ');transform-origin:' + pos + '"></div>';
  }
  function title(size, s, marginTop) {
    var st = 'font-size:' + size + 'px' + (marginTop != null ? ';margin-top:' + marginTop + 'px' : '');
    return '<h1 class="p-title' + (s.titleCaps ? ' caps' : '') + '" style="' + st + '">' + esc(s.title) + '</h1>';
  }
  function textBlock(s, size) {
    return (s.eyebrow ? '<div class="p-eyebrow">' + esc(s.eyebrow) + '</div>' : '') +
      title(size, s, s.eyebrow ? 16 : 0) +
      (s.lead ? '<div class="p-lead" style="max-width:' + LEAD_MAX + 'px">' + br(s.lead) + '</div>' : '');
  }
  function info(s) {
    var n = s.infoCount;
    if (!n) return '';
    var span = 6 / n, cells = '';
    for (var k = 0; k < n; k++) {
      var c = s.info[k];
      cells += '<div class="p-info-cell" style="grid-column:span ' + span + '"><div class="p-label">' + esc(c.label) + '</div>' +
        '<div class="p-val">' + esc(c.a) + (c.b ? '<br><span>' + esc(c.b) + '</span>' : '') + '</div></div>';
    }
    return '<div class="p-grid p-info">' + cells + '</div>';
  }
  // Свечение на фоне холста — для шаблонов, где текст стоит на фоне (картинка в поле, детали)
  function blobs(s, kind) {
    if (s.blobLevel === 'none') return '';
    if (s.blobLevel === 'soft' && kind === 'frame') {
      var cls = s.genre === 'cool' ? 'p-blob-blue' : 'p-blob-genre p-blob-solo';
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
  // Свечение внутри текстовой панели под картинкой: растворяется до верхнего края панели,
  // поэтому картинка его не обрезает ровной линией
  function panelGlow(s) {
    if (s.blobLevel === 'none') return '';
    if (s.blobLevel === 'soft') return s.genre === 'cool' ? ' glow-soft-blue' : ' glow-soft-genre';
    return ' glow-full';
  }

  // size — кегль названия после подгонки; limit — нижняя граница, за которую не должен выходить элемент
  function renderPoster(s, size) {
    var f = FORMATS[s.format], H = f.h, pt = f.padTop, pb = f.padBottom, body = '';
    var minImg = Math.round(H * MIN_IMAGE);
    var attrs = 'class="poster" data-theme="' + s.theme + '" data-genre="' + s.genre + '"';
    size = size || s.titleSize;

    if (s.template === 'frame') {
      body = blobs(s, 'frame') +
        head(s) +
        img(s, 'flex:1 1 0;min-height:' + minImg + 'px;margin-top:40px') +
        '<div style="flex:0 0 auto;margin-top:56px"' + (s.infoCount ? '' : ' data-limit="' + (H - pb) + '"') + '>' + textBlock(s, size) + '</div>' +
        (s.infoCount ? '<div style="flex:0 0 auto;margin-top:44px" data-limit="' + (H - pb) + '">' + info(s) + '</div>' : '');
      return '<div ' + attrs + ' style="height:' + H + 'px;padding:' + pt + 'px 72px ' + pb + 'px">' + body + '</div>';
    }

    if (s.template === 'band') {
      var ih = Math.max(minImg, Math.round(H * s.imageSize / 100));
      var light = s.logoTone === 'light';
      var tone = light ? '#D6D6D2' : '#0D0D0D';
      var scrim = light ? '#0D0D0D' : '#F2F1EB';
      body =
        img(s, 'flex:0 1 ' + ih + 'px;min-height:' + minImg + 'px') +
        // мягкая подложка под шапкой, чтобы логотип читался на любой картинке
        '<div aria-hidden="true" style="position:absolute;top:0;left:0;right:0;height:' + (pt + 150) + 'px;z-index:1;background:linear-gradient(180deg,' + scrim + '73 0%,' + scrim + '00 100%)"></div>' +
        '<div style="position:absolute;top:' + pt + 'px;left:72px;right:72px;z-index:2;--p-fg:' + tone + ';--p-muted:' + tone + ';--p-bar-off:' + tone + '4D">' + head(s) + '</div>' +
        '<div class="p-panel' + panelGlow(s) + '" style="flex:1 0 auto;display:flex;flex-direction:column;justify-content:space-between;padding:64px 72px ' + pb + 'px" data-limit="' + H + '">' +
          '<div>' + textBlock(s, size) + '</div>' +
          (s.infoCount ? '<div style="margin-top:44px">' + info(s) + '</div>' : '') +
        '</div>';
      return '<div ' + attrs + ' style="height:' + H + 'px">' + body + '</div>';
    }

    if (s.template === 'cover') {
      var ch = Math.max(minImg, Math.round(H * s.imageSize / 100));
      body =
        img(s, 'flex:0 1 ' + ch + 'px;min-height:' + minImg + 'px') +
        '<div class="p-panel' + panelGlow(s) + '" style="flex:1 0 auto;display:flex;flex-direction:column;justify-content:space-between;padding:56px 72px ' + pb + 'px" data-limit="' + H + '">' +
          head(s) +
          '<div style="margin-top:40px">' + title(size, s, 0) +
          (s.subline ? '<div class="p-lead" style="margin-top:18px;max-width:' + LEAD_MAX + 'px">' + esc(s.subline) + '</div>' : '') + '</div>' +
        '</div>';
      return '<div ' + attrs + ' style="height:' + H + 'px">' + body + '</div>';
    }

    // details — без картинки
    var rows = s.rows.map(function (r, i) {
      return (i ? '<div class="p-rowline"></div>' : '') +
        '<div class="p-row-label">' + esc(r.label) + '</div>' +
        '<div class="p-row-val">' + esc(r.a) + (r.b ? '<br><span>' + esc(r.b) + '</span>' : '') + '</div>';
    }).join('');
    body = blobs(s, 'details') +
      head(s) +
      '<div class="p-grid" style="margin-top:56px" data-limit="' + (H - pb) + '">' +
        (s.eyebrow ? '<div class="p-eyebrow" style="grid-column:1/-1">' + esc(s.eyebrow) + '</div>' : '') +
        '<div style="grid-column:1/-1">' + title(Math.round(size * 0.87), s, s.eyebrow ? 16 : 0) + '</div>' +
        (s.detailsLead ? '<div class="p-lead" style="grid-column:1/6;margin-top:28px;font-size:30px;line-height:1.45">' + br(s.detailsLead) + '</div>' : '') +
        '<div class="p-rowline" style="margin-top:56px"></div>' + rows +
      '</div>';
    return '<div ' + attrs + ' style="height:' + H + 'px;padding:' + pt + 'px 72px ' + pb + 'px;justify-content:space-between">' + body + '</div>';
  }

  // Насколько содержимое вылезло за поля, px холста (0 — всё на месте)
  function overflowOf(poster, scale) {
    var top = poster.getBoundingClientRect().top, worst = 0;
    poster.querySelectorAll('[data-limit]').forEach(function (el) {
      var bottom = (el.getBoundingClientRect().bottom - top) / scale;
      worst = Math.max(worst, bottom - parseFloat(el.getAttribute('data-limit')));
    });
    return Math.ceil(worst > 0.5 ? worst : 0);
  }
  // Рендер с подгонкой: сначала уступает картинка (это делает вёрстка), затем название
  function layout(s, host, scale) {
    var size = s.titleSize, min = Math.max(72, Math.round(s.titleSize * 0.8)), over;
    for (;;) {
      host.innerHTML = renderPoster(s, size);
      over = overflowOf(host.firstElementChild, scale);
      if (!over || size <= min) break;
      size = Math.max(min, size - 4);
    }
    return { size: size, over: over };
  }

  /* ── предпросмотр ── */
  var stage = document.getElementById('stage');
  var stageInner = document.getElementById('stageInner');
  var previewScale = 1;
  var lastFit = { size: 0, over: 0 };

  function fit() {
    var H = FORMATS[state.format].h;
    var w = stage.clientWidth;
    var narrow = window.matchMedia('(max-width: 900px)').matches;
    var noteH = document.getElementById('fitNote').offsetHeight;
    var maxH = narrow ? window.innerHeight * 0.4 : window.innerHeight - 140 - (noteH ? noteH + 16 : 0);
    previewScale = Math.min(w / 1080, maxH / H);
    stageInner.style.transform = 'scale(' + previewScale + ')';
    stage.style.height = Math.round(H * previewScale) + 'px';
    stageInner.style.left = Math.max(0, (w - 1080 * previewScale) / 2) + 'px';
  }

  function renderPreview() {
    fit();
    lastFit = layout(state, stageInner, previewScale);
    var f = FORMATS[state.format];
    document.getElementById('previewMeta').textContent = f.name + ' · 1080 × ' + f.h;
    var note = document.getElementById('fitNote');
    if (lastFit.over) {
      note.className = 'fit-note bad';
      note.textContent = 'Текст не помещается на ' + lastFit.over + ' px. Сократите подводку или строки, уберите строку данных или выберите формат выше. Выгрузка недоступна, пока всё не встанет в поля.';
    } else if (lastFit.size < state.titleSize) {
      note.className = 'fit-note';
      note.textContent = 'Название уменьшено до ' + lastFit.size + ' px, чтобы всё поместилось.';
    } else {
      note.className = 'fit-note'; note.textContent = '';
    }
    stage.classList.toggle('over', !!lastFit.over);
    fit(); // высота предупреждения над холстом могла измениться
    document.querySelectorAll('[data-export], #exportAlbum').forEach(function (b) { b.disabled = !!lastFit.over; });
  }

  /* ── текст поста ── */
  function captionText() {
    var c = state.caption, out = [];
    if (c.hook) out.push('🎭 ' + c.hook + ' 🎭', '');
    if (c.body) out.push(c.body, '');
    if (c.date || c.time) out.push('📅 ' + [c.date, c.time].filter(Boolean).join(' | '));
    if (c.venue) out.push('📍 ' + c.venue);
    if (c.date || c.time || c.venue) out.push('');
    out.push('🎟️ Билеты без комиссии и выбор мест: ' + (c.link || '[ссылка]'));
    if (c.price) out.push('Цены — от ' + c.price + ' ₽');
    if (c.why) out.push('', c.why);
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function renderCaption() {
    var t = captionText();
    document.getElementById('captionOut').textContent = t;
    var cnt = document.getElementById('captionCount');
    cnt.textContent = t.length + ' / 1024 знаков — лимит подписи к фото в Telegram';
    cnt.classList.toggle('over', t.length > 1024);
  }

  /* ── панель ── */
  function syncControls() {
    document.querySelectorAll('[data-chips]').forEach(function (g) {
      var key = g.getAttribute('data-chips');
      g.querySelectorAll('.chip').forEach(function (b) {
        b.setAttribute('aria-pressed', String(String(state[key]) === b.getAttribute('data-value')));
      });
    });
    document.querySelectorAll('[data-bind]').forEach(function (el) {
      var v = getPath(state, el.getAttribute('data-bind'));
      if (el.type === 'checkbox') el.checked = !!v;
      else if (document.activeElement !== el) el.value = v == null ? '' : v;
    });
    document.querySelectorAll('[data-out]').forEach(function (o) { o.textContent = getPath(state, o.getAttribute('data-out')); });
    document.querySelectorAll('[data-show]').forEach(function (el) {
      el.hidden = el.getAttribute('data-show').split(' ').indexOf(state.template) === -1;
    });
  }

  function renderLists() {
    var info = '';
    for (var i = 0; i < state.infoCount; i++) {
      info += '<div class="list-item"><div class="list-item-head"><span class="label">Колонка ' + (i + 1) + '</span></div>' +
        '<div class="field"><input class="input" data-bind="info.' + i + '.label" maxlength="20" aria-label="Подпись колонки ' + (i + 1) + '" placeholder="Подпись"></div>' +
        '<div class="field"><input class="input" data-bind="info.' + i + '.a" maxlength="32" aria-label="Первая строка колонки ' + (i + 1) + '" placeholder="Первая строка"></div>' +
        '<div class="field"><input class="input" data-bind="info.' + i + '.b" maxlength="32" aria-label="Вторая строка колонки ' + (i + 1) + '" placeholder="Вторая строка, серым"></div></div>';
    }
    document.getElementById('infoList').innerHTML = info;

    var rows = state.rows.map(function (r, i) {
      return '<div class="list-item"><div class="list-item-head"><span class="label">Строка ' + (i + 1) + '</span>' +
        (state.rows.length > 1 ? '<button class="link-btn" type="button" data-del-row="' + i + '">Удалить</button>' : '') + '</div>' +
        '<div class="field"><input class="input" data-bind="rows.' + i + '.label" maxlength="20" aria-label="Подпись строки ' + (i + 1) + '" placeholder="Подпись"></div>' +
        '<div class="field"><input class="input" data-bind="rows.' + i + '.a" maxlength="70" aria-label="Значение строки ' + (i + 1) + '" placeholder="Значение"></div>' +
        '<div class="field"><input class="input" data-bind="rows.' + i + '.b" maxlength="70" aria-label="Вторая строка ' + (i + 1) + '" placeholder="Вторая строка, серым"></div></div>';
    }).join('');
    document.getElementById('rowsList').innerHTML = rows;
    document.getElementById('addRow').disabled = state.rows.length >= 5;
    syncControls();
  }

  function update(opts) {
    save();
    if (opts && opts.lists) renderLists(); else syncControls();
    renderPreview();
    renderCaption();
  }

  document.addEventListener('click', function (e) {
    var chip = e.target.closest('[data-chips] .chip');
    if (chip) {
      var key = chip.parentElement.getAttribute('data-chips');
      var val = chip.getAttribute('data-value');
      state[key] = NUMERIC_CHIPS[key] ? +val : val;
      update({ lists: key === 'infoCount' });
      return;
    }
    var del = e.target.closest('[data-del-row]');
    if (del) { state.rows.splice(+del.getAttribute('data-del-row'), 1); update({ lists: true }); }
  });

  document.addEventListener('input', function (e) {
    var el = e.target, path = el.getAttribute && el.getAttribute('data-bind');
    if (!path) return;
    var v = el.type === 'checkbox' ? el.checked : (el.hasAttribute('data-num') ? parseFloat(el.value) : el.value);
    setPath(state, path, v);
    update();
  });

  document.getElementById('addRow').addEventListener('click', function () {
    if (state.rows.length < 5) { state.rows.push({ label: 'Подпись', a: 'Значение', b: '' }); update({ lists: true }); }
  });

  var fileInput = document.getElementById('imageFile');
  document.getElementById('imageBtn').addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      state.image = { src: reader.result, x: 50, y: 50, zoom: 1 };
      update();
      fileInput.value = '';
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('imageReset').addEventListener('click', function () {
    state.image = clone(DEFAULTS.image); update();
  });

  document.getElementById('resetBtn').addEventListener('click', function () {
    if (!window.confirm('Вернуть пример и сбросить все поля?')) return;
    state = clone(DEFAULTS); update({ lists: true });
  });

  document.getElementById('copyCaption').addEventListener('click', function () {
    var t = captionText();
    var done = function () { toast('Текст скопирован'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done, function () { fallbackCopy(t); done(); });
    } else { fallbackCopy(t); done(); }
  });
  function fallbackCopy(t) {
    var ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* нет доступа к буферу */ }
    document.body.removeChild(ta);
  }

  /* ── экспорт ── */
  function slug(s) {
    var map = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
    return String(s).toLowerCase().split('').map(function (c) { return map[c] != null ? map[c] : c; }).join('')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'post';
  }
  function waitImages(root) {
    return Promise.all(Array.prototype.map.call(root.querySelectorAll('img'), function (im) {
      if (im.complete && im.naturalWidth) return im.decode ? im.decode().catch(function () {}) : null;
      return new Promise(function (r) { im.onload = im.onerror = r; });
    }));
  }
  var IS_WEBKIT = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Android/.test(navigator.userAgent);
  var IS_TOUCH = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  function download(dataUrl, name) {
    var a = document.createElement('a');
    a.href = dataUrl; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  // На телефоне — системное меню «Поделиться» (там есть «Сохранить изображение»), иначе обычная загрузка
  function deliver(items) {
    var downloadAll = function () { items.forEach(function (it) { download(it.url, it.name); }); };
    if (!IS_TOUCH || !navigator.canShare) { downloadAll(); return Promise.resolve(); }
    return Promise.all(items.map(function (it) {
      return fetch(it.url).then(function (r) { return r.blob(); }).then(function (b) { return new File([b], it.name, { type: b.type }); });
    })).then(function (files) {
      if (!navigator.canShare({ files: files })) { downloadAll(); return; }
      return navigator.share({ files: files }).catch(function (err) {
        if (err && err.name === 'AbortError') return; // меню закрыли
        downloadAll();
      });
    });
  }
  var TEMPLATE_NAMES = { frame: 'Картинка в поле', band: 'Картинка полосой', cover: 'Альбом · обложка', details: 'Альбом · детали' };
  function renderFile(s, type, suffix) {
    var off = document.getElementById('offscreen');
    var node = null;
    var H = FORMATS[s.format].h;
    var opts = {
      width: 1080, height: H, pixelRatio: s.exportScale,
      backgroundColor: s.theme === 'dark' ? '#0D0D0D' : '#F2F1EB'
    };
    var name = slug(s.title) + '-' + s.template + '-' + FORMATS[s.format].name.replace(':', 'x') + (suffix || '') + '.' + (type === 'png' ? 'png' : 'jpg');
    var make = function () {
      return type === 'png' ? window.htmlToImage.toPng(node, opts)
        : window.htmlToImage.toJpeg(node, Object.assign({ quality: s.jpegQuality }, opts));
    };
    return document.fonts.ready.then(function () {
      // та же подгонка, что в предпросмотре, но в масштабе 1:1
      var r = layout(s, off, 1);
      if (r.over) throw new Error('«' + TEMPLATE_NAMES[s.template] + '»: текст не помещается на ' + r.over + ' px');
      node = off.firstElementChild;
      return waitImages(node);
    }).then(function () {
      // Safari иногда рисует первый проход без картинки и шрифтов — первый результат отбрасываем
      return IS_WEBKIT ? make().then(make) : make();
    }).then(function (url) {
      off.innerHTML = '';
      return { url: url, name: name };
    });
  }
  function busy(on) {
    document.querySelectorAll('[data-export], #exportAlbum').forEach(function (b) { b.disabled = on || !!lastFit.over; });
  }
  document.querySelectorAll('[data-export]').forEach(function (b) {
    b.addEventListener('click', function () {
      busy(true);
      renderFile(state, b.getAttribute('data-export')).then(function (f) { return deliver([f]); })
        .then(function () { toast('Готово'); })
        .catch(function (err) { console.error(err); off().innerHTML = ''; toast('Не получилось сохранить: ' + (err && err.message || err)); })
        .then(function () { busy(false); });
    });
  });
  function off() { return document.getElementById('offscreen'); }
  document.getElementById('exportAlbum').addEventListener('click', function () {
    busy(true);
    var a = clone(state); a.template = 'cover'; a.slides = '1/2';
    var b = clone(state); b.template = 'details'; b.slides = '2/2';
    var files = [];
    renderFile(a, 'jpeg', '-1').then(function (f) { files.push(f); return renderFile(b, 'jpeg', '-2'); })
      .then(function (f) { files.push(f); return deliver(files); })
      .then(function () { toast('Готово: два файла'); })
      .catch(function (err) { console.error(err); off().innerHTML = ''; toast('Не получилось сохранить: ' + (err && err.message || err)); })
      .then(function () { busy(false); });
  });

  window.TTSPosterBuilder = { render: renderPoster, layout: layout, defaults: DEFAULTS };

  /* ── старт ── */
  document.getElementById('appLogo').innerHTML = logo();
  window.addEventListener('resize', renderPreview);
  if (window.ResizeObserver) new ResizeObserver(function () { renderPreview(); }).observe(stage);
  renderLists();
  renderPreview();
  renderCaption();
  if (document.fonts) document.fonts.ready.then(renderPreview);
})();
