/* Конструктор постов TTS — интерфейс: панель, предпросмотр, проверки, выгрузка. */
(function () {
  'use strict';
  var T = window.TTS;
  var esc = T.esc;
  var $ = function (id) { return document.getElementById(id); };

  var state = null;
  var history = [];
  var current = { spec: null, slides: [], fit: null, img: null, checks: [] };

  /* ── картинки: размеры и яркость под логотипом ── */
  var imgCache = {};   // src → { el, w, h, ready }
  function imageMeta(src, onReady) {
    if (!src) return null;
    var m = imgCache[src];
    if (!m) {
      m = imgCache[src] = { el: new Image(), ready: false };
      m.el.onload = function () { m.ready = true; m.w = m.el.naturalWidth; m.h = m.el.naturalHeight; if (onReady) onReady(); };
      m.el.src = src;
    }
    return m.ready ? m : null;
  }
  var toneCache = {};
  // Яркость полосы под шапкой на картинке полосой: тёмная картинка — светлый логотип
  function autoTone(s) {
    var m = imageMeta(s.image.src, scheduleRender);
    if (!m) return 'dark';
    var bw = 1080, bh = Math.max(Math.round(s.H * T.MIN_IMAGE), Math.round(s.H * s.imageSize / 100));
    var key = [s.image.src.length, s.image.src.slice(-32), s.image.x, s.image.y, s.image.zoom, bh, s.pt].join('|');
    if (toneCache[key]) return toneCache[key];
    var nw = m.w, nh = m.h, s0 = Math.max(bw / nw, bh / nh), z = s.image.zoom || 1;
    var ox = (bw - nw * s0) * s.image.x / 100, oy = (bh - nh * s0) * s.image.y / 100;
    var Ox = bw * s.image.x / 100, Oy = bh * s.image.y / 100;
    function nat(px, py) { // точка кадра → точка исходной картинки
      var qx = Ox + (px - Ox) / z, qy = Oy + (py - Oy) / z;
      return [(qx - ox) / s0, (qy - oy) / s0];
    }
    var a = nat(0, Math.max(0, s.pt - 16)), b = nat(bw, Math.min(bh, s.pt + 84));
    var c = document.createElement('canvas'); c.width = 48; c.height = 8;
    var g = c.getContext('2d'), L = 0.5;
    try {
      g.drawImage(m.el, Math.max(0, a[0]), Math.max(0, a[1]), Math.max(1, b[0] - a[0]), Math.max(1, b[1] - a[1]), 0, 0, 48, 8);
      var d = g.getImageData(0, 0, 48, 8).data, sum = 0;
      for (var i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      L = sum / (d.length / 4) / 255;
    } catch (e) { /* картинка недоступна для чтения — оставляем тёмный логотип */ }
    return (toneCache[key] = L < 0.5 ? 'light' : 'dark');
  }
  var env = { src: function (ref) { return T.images.src(ref); }, tone: autoTone };

  /* ── вычисления ── */
  var renderQueued = false;
  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () { renderQueued = false; render(); });
  }
  function compute() {
    var s = T.spec(state, env);
    var host = $('measure');
    var slides = s.slides.map(function (_, i) {
      var f = T.layout(s, i, host, 1);
      var html = host.innerHTML, box = null;
      var im = host.querySelector('.p-img');
      if (im) box = { w: im.offsetWidth, h: im.offsetHeight };
      return { html: html, fit: f, box: box };
    });
    host.innerHTML = '';
    var overs = slides.map(function (x) { return x.fit.over; });
    var fit = {
      over: Math.max.apply(null, overs), overSlide: overs.indexOf(Math.max.apply(null, overs)),
      size: slides[0].fit.size, start: slides[0].fit.start
    };
    var img = null;
    if (s.layout === 'frame' || s.layout === 'band' || s.layout === 'album') {
      var m = imageMeta(s.image.src, scheduleRender);
      var box = slides[0].box;
      img = { example: !s.image.ref || s.image.ref === 'example' };
      if (m && box) {
        var cover = Math.max(box.w / m.w, box.h / m.h) * (s.image.zoom || 1);
        img.w = m.w; img.h = m.h; img.density = 1 / cover;
        img.needW = Math.ceil(m.w / img.density);
      }
    }
    current = { spec: s, slides: slides, fit: fit, img: img };
    current.caption = T.captionText(state);
    current.checks = T.checks(state, s, fit, img);
    current.blocked = current.checks.some(function (c) { return c.level === 'error'; });
  }

  /* ── предпросмотр ── */
  var stage = $('stage'), stageInner = $('stageInner'), guides = $('guides'), mock = $('mock');
  var previewScale = 1;
  function slideIndex() { return Math.min(current.slides.length, state.slide || 1) - 1; }

  function fitStage() {
    var H = current.spec.H, w = stage.clientWidth;
    var narrow = window.matchMedia('(max-width: 900px)').matches;
    var maxH = narrow ? window.innerHeight * 0.42 : window.innerHeight - 190;
    previewScale = Math.min(w / 1080, maxH / H);
    var t = 'scale(' + previewScale + ')', left = Math.max(0, (w - 1080 * previewScale) / 2) + 'px';
    stageInner.style.transform = t; stageInner.style.left = left;
    guides.style.transform = t; guides.style.left = left;
    stage.style.height = Math.round(H * previewScale) + 'px';
  }
  function guidesHtml(s) {
    var H = s.H, out = '<div class="g-box" style="height:' + H + 'px">';
    // поля холста
    out += '<div class="g-margin" style="left:' + T.SIDE + 'px;right:' + T.SIDE + 'px;top:' + s.pt + 'px;bottom:' + s.pb + 'px"></div>';
    if (s.format === 'story') {
      out += '<div class="g-cut" style="top:0;height:' + s.pt + 'px;left:0;right:0"><span>Интерфейс сторис</span></div>';
      out += '<div class="g-cut" style="bottom:0;height:' + s.pb + 'px;left:0;right:0"><span>Строка ответа</span></div>';
    } else {
      var cut = Math.round((1080 - H * 0.75) / 2);
      out += '<div class="g-cut" style="left:0;width:' + cut + 'px;top:0;bottom:0"></div>';
      out += '<div class="g-cut" style="right:0;width:' + cut + 'px;top:0;bottom:0"></div>';
      out += '<div class="g-label">Сетка Instagram 3:4 срезает по ' + cut + ' px с боков</div>';
    }
    return out + '</div>';
  }

  function render() {
    if (!state) return;
    compute();
    var s = current.spec, tab = state.tab, story = s.format === 'story';
    var isAlbum = current.slides.length > 1;

    document.querySelectorAll('.tab').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === tab)); });
    $('slideSwitch').hidden = !(isAlbum && tab === 'canvas');
    document.querySelectorAll('[data-slide]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-slide') === slideIndex() + 1)); });

    var note = $('fitNote');
    if (current.fit.over) { note.className = 'fit-note bad'; note.textContent = 'Текст не помещается на ' + current.fit.over + ' px — выгрузка закрыта. Подробности — в разделе «Проверка».'; }
    else { note.className = 'fit-note'; note.textContent = ''; }

    if (tab === 'canvas') {
      stage.hidden = false; mock.hidden = true;
      stageInner.innerHTML = current.slides[slideIndex()].html;
      stage.classList.toggle('over', !!current.fit.over);
      var showGuides = state.mode === 'advanced' && state.adv.guides;
      guides.innerHTML = showGuides ? guidesHtml(s) : '';
      fitStage();
    } else {
      stage.hidden = true; mock.hidden = false;
      var ctx = {
        H: s.H, slides: current.slides.map(function (x) { return x.html; }),
        caption: current.caption, handle: state.ig.handle || 'tickettoshow.ru',
        history: history, tgTheme: state.tgTheme
      };
      var html = '';
      if (story) {
        ctx.platform = tab === 'tg' ? 'tg' : 'ig';
        html = tab === 'grid' ? '<p class="pv-note pv-solo">Сторис не попадают в сетку профиля. Чтобы посмотреть пост в сетке, выберите формат «Пост 4:5».</p>'
          : T.previewStory(ctx);
      } else if (tab === 'tg') {
        html = '<div class="chips pv-switch" data-chips="tgTheme"><button class="chip" type="button" data-value="dark">Тёмный Telegram</button><button class="chip" type="button" data-value="light">Светлый</button></div>' +
          T.previewTelegram(ctx) +
          '<button class="btn btn-ghost btn-full pv-copy" type="button" data-copy-caption>Скопировать текст поста</button>';
      } else if (tab === 'feed') html = T.previewFeed(ctx);
      else html = T.previewGrid(ctx);
      mock.innerHTML = html;
      syncChips(mock);
    }
    var f = T.FORMATS[s.format];
    $('previewMeta').textContent = (tab === 'canvas' ? f.name + ' · 1080 × ' + f.h + (isAlbum ? ' · слайд ' + (slideIndex() + 1) + ' из 2' : '') : 'Примерно так пост выглядит на телефоне');

    // проверки
    $('checks').innerHTML = current.checks.map(function (c) {
      return '<li class="ck ck-' + c.level + '">' + esc(c.text) + '</li>';
    }).join('');
    var btn = $('exportBtn');
    btn.disabled = busyNow || current.blocked;
    btn.textContent = isAlbum ? 'Скачать альбом · 2 файла' : 'Скачать';
    $('exportHint').textContent = current.blocked ? 'Выгрузка закрыта, пока в проверке есть красные пункты.' :
      isAlbum ? 'Обложка и детали выгружаются вместе, в Telegram их отправляют одним альбомом.' : '';
    var cnt = $('captionCount');
    cnt.textContent = 'Текст поста: ' + current.caption.length + ' / 1024 знаков';
    cnt.classList.toggle('over', current.caption.length > 1024);
    syncAutoPlaceholders();
  }

  /* ── синхронизация панели ── */
  function getPath(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function setPath(obj, path, val) {
    var ks = path.split('.'), o = obj;
    for (var i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = val;
  }
  function conditions() {
    var layout = state.type === 'change' || state.type === 'digest' ? state.type : state.layout;
    return {
      mode: state.mode, type: state.type, layout: layout, format: state.format, kind: state.change.kind,
      titleSize: state.adv.titleSize ? 'manual' : 'auto',
      infoCount: state.adv.infoCount ? 'some' : 'none',
      customRows: state.adv.customRows ? 'yes' : 'no',
      exportType: state.adv.exportType
    };
  }
  function visible(el, c) {
    var rule = el.getAttribute('data-when');
    return rule.split(/\s+/).every(function (cl) {
      var p = cl.split(':'); return p[1].split(',').indexOf(String(c[p[0]])) !== -1;
    });
  }
  function syncChips(root) {
    (root || document).querySelectorAll('[data-chips]').forEach(function (g) {
      var key = g.getAttribute('data-chips'), v = getPath(state, key);
      g.querySelectorAll('.chip').forEach(function (b) {
        var on = b.hasAttribute('data-manual') ? !!v : String(v) === b.getAttribute('data-value');
        b.setAttribute('aria-pressed', String(on));
      });
    });
  }
  function syncControls() {
    var c = conditions();
    document.querySelectorAll('[data-when]').forEach(function (el) { el.hidden = !visible(el, c); });
    syncChips();
    document.querySelectorAll('[data-set-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-mode') === state.mode)); });
    document.querySelectorAll('[data-bind]').forEach(function (el) {
      var v = getPath(state, el.getAttribute('data-bind'));
      if (el.type === 'checkbox') el.checked = !!v;
      else if (document.activeElement !== el) el.value = v == null ? '' : v;
    });
    document.querySelectorAll('[data-out]').forEach(function (o) { o.textContent = getPath(state, o.getAttribute('data-out')); });
    document.querySelectorAll('[data-count]').forEach(function (o) {
      var len = String(getPath(state, o.getAttribute('data-count')) || '').length, soft = +o.getAttribute('data-soft') || 0;
      o.textContent = len + ' / ' + o.getAttribute('data-max');
      o.classList.toggle('over', soft && len > soft);
    });
    $('customInfo').checked = !!state.adv.customInfo;
    $('customRows').checked = !!state.adv.customRows;
    // номера шагов идут подряд по видимым разделам
    var n = 0;
    document.querySelectorAll('.panel > .sec').forEach(function (sec) {
      var st = sec.querySelector('.step');
      if (st && !sec.hidden) st.textContent = ++n;
    });
    $('typeHint').textContent = {
      announce: 'Новое событие: афиша, название, когда и где.',
      status: 'Тот же анонс с цветной меткой: зелёная — старт продаж, оранжевая — мало мест, красная — последние билеты.',
      change: 'Служебный пост без картинки и свечения: новая дата и что делать с билетами.',
      digest: 'От 3 до 5 событий одним списком на одной картинке.'
    }[state.type];
    var e = state.event;
    $('imgInfo').textContent = e.image.ref === 'example' ? 'Сейчас стоит картинка-пример.' : '';
  }
  function syncAutoPlaceholders() {
    var e = state.event;
    var auto = {
      subline: [T.fmt.short(e.date), e.venue].filter(Boolean).join(' · ').replace(/ /g, ' '),
      detailsLead: e.lead,
      why: state.type === 'status' ? T.STATUSES[state.status].why : 'Например: билеты только поступили в продажу',
      change: 'Соберётся из дат'
    };
    document.querySelectorAll('[data-auto-placeholder]').forEach(function (el) { el.placeholder = auto[el.getAttribute('data-auto-placeholder')] || ''; });
    var cn = $('cNote');
    if (cn) cn.placeholder = T.CHANGES[state.change.kind].note;
  }

  function renderLists() {
    // подборка
    var items = state.digest.items;
    $('digestList').innerHTML = items.map(function (it, i) {
      var p = 'digest.items.' + i + '.';
      return '<div class="list-item"><div class="list-item-head"><span class="label">Событие ' + (i + 1) + '</span>' +
        (items.length > 2 ? '<button class="link-btn" type="button" data-del-item="' + i + '">Удалить</button>' : '') + '</div>' +
        '<div class="field"><input class="input" data-bind="' + p + 'title" maxlength="36" aria-label="Название события ' + (i + 1) + '" placeholder="Название"></div>' +
        '<div class="row"><div class="field"><input class="input" type="date" data-bind="' + p + 'date" aria-label="Дата"></div>' +
        '<div class="field"><input class="input" type="time" data-bind="' + p + 'time" aria-label="Начало"></div></div>' +
        '<div class="row"><div class="field"><input class="input" data-bind="' + p + 'venue" maxlength="32" aria-label="Площадка" placeholder="Площадка"></div>' +
        '<div class="field"><input class="input" data-bind="' + p + 'price" inputmode="numeric" maxlength="9" aria-label="Цена от, ₽" placeholder="Цена от, ₽"></div></div>' +
        '<div class="field"><input class="input" type="url" data-bind="' + p + 'link" aria-label="Ссылка на это событие" placeholder="Ссылка на это событие — по желанию"></div></div>';
    }).join('');
    $('addItem').disabled = items.length >= 5;

    // свои значения строки данных
    var ci = state.adv.customInfo;
    $('infoList').innerHTML = !ci ? '' : ci.slice(0, state.adv.infoCount).map(function (c, i) {
      var p = 'adv.customInfo.' + i + '.';
      return '<div class="list-item"><div class="list-item-head"><span class="label">Колонка ' + (i + 1) + '</span></div>' +
        '<div class="field"><input class="input" data-bind="' + p + 'label" maxlength="16" aria-label="Подпись колонки ' + (i + 1) + '" placeholder="Подпись"></div>' +
        '<div class="field"><input class="input" data-bind="' + p + 'a" maxlength="24" aria-label="Первая строка колонки ' + (i + 1) + '" placeholder="Первая строка"></div>' +
        '<div class="field"><input class="input" data-bind="' + p + 'b" maxlength="24" aria-label="Вторая строка колонки ' + (i + 1) + '" placeholder="Вторая строка, серым"></div></div>';
    }).join('');

    // своя таблица
    var rows = state.adv.customRows;
    $('rowsList').innerHTML = !rows ? '' : rows.map(function (r, i) {
      var p = 'adv.customRows.' + i + '.';
      return '<div class="list-item"><div class="list-item-head"><span class="label">Строка ' + (i + 1) + '</span>' +
        (rows.length > 1 ? '<button class="link-btn" type="button" data-del-row="' + i + '">Удалить</button>' : '') + '</div>' +
        '<div class="field"><input class="input" data-bind="' + p + 'label" maxlength="16" aria-label="Подпись строки ' + (i + 1) + '" placeholder="Подпись"></div>' +
        '<div class="field"><input class="input" data-bind="' + p + 'a" maxlength="48" aria-label="Значение строки ' + (i + 1) + '" placeholder="Значение"></div>' +
        '<div class="field"><input class="input" data-bind="' + p + 'b" maxlength="56" aria-label="Вторая строка ' + (i + 1) + '" placeholder="Вторая строка, серым"></div></div>';
    }).join('');
    $('addRow').disabled = !rows || rows.length >= 5;
  }

  function update(opts) {
    T.saveState(state);
    if (opts && opts.lists) renderLists();
    syncControls();
    render();
  }

  /* ── события панели ── */
  document.addEventListener('click', function (e) {
    var chip = e.target.closest('[data-chips] .chip');
    if (chip) {
      var g = chip.parentElement, key = g.getAttribute('data-chips');
      var val = chip.getAttribute('data-value');
      var v = g.hasAttribute('data-num') ? +val : val;
      if (key === 'status' && Object.keys(T.STATUSES).some(function (k) { return T.STATUSES[k].why === state.caption.why; })) state.caption.why = '';
      setPath(state, key, v);
      if (key === 'layout' || key === 'type') state.slide = 1;
      update({ lists: key === 'adv.infoCount' });
      return;
    }
    var mode = e.target.closest('[data-set-mode]');
    if (mode) {
      state.mode = mode.getAttribute('data-set-mode');
      if (state.mode === 'simple' && state.format === 'square') state.format = 'post';
      update({ lists: true }); return;
    }
    var tab = e.target.closest('[data-tab]');
    if (tab) { state.tab = tab.getAttribute('data-tab'); update(); return; }
    var sl = e.target.closest('[data-slide]');
    if (sl) { state.slide = +sl.getAttribute('data-slide'); update(); return; }
    var del = e.target.closest('[data-del-item]');
    if (del) { state.digest.items.splice(+del.getAttribute('data-del-item'), 1); update({ lists: true }); return; }
    var delRow = e.target.closest('[data-del-row]');
    if (delRow) { state.adv.customRows.splice(+delRow.getAttribute('data-del-row'), 1); update({ lists: true }); return; }
    if (e.target.closest('[data-copy-caption]')) { copyCaption(); return; }
    var hd = e.target.closest('[data-hist-del]');
    if (hd) { T.history.remove(+hd.getAttribute('data-hist-del')).then(refreshHistory); return; }
    if (e.target.closest('#histAdd')) { $('histFile').click(); return; }
    if (e.target.closest('#histClear')) {
      if (window.confirm('Убрать из сетки все прошлые посты?')) T.history.clear().then(refreshHistory);
    }
  });

  document.addEventListener('input', function (e) {
    var el = e.target, path = el.getAttribute && el.getAttribute('data-bind');
    if (!path) return;
    var v = el.type === 'checkbox' ? el.checked : (el.hasAttribute('data-num') ? parseFloat(el.value) : el.value);
    if (/price$/.test(path)) v = String(v).replace(/\D/g, '');
    setPath(state, path, v);
    update();
  });

  $('addItem').addEventListener('click', function () {
    if (state.digest.items.length >= 5) return;
    state.digest.items.push({ title: '', date: '', time: '19:00', venue: '', price: '', link: '' });
    update({ lists: true });
  });
  $('customInfo').addEventListener('change', function () {
    if (this.checked) {
      var probe = T.clone(state); probe.adv.customInfo = null; probe.adv.infoCount = 3;
      state.adv.customInfo = T.spec(probe, env).info.map(function (c) { return { label: c.label, a: plain(c.a), b: plain(c.b) }; });
    } else state.adv.customInfo = null;
    update({ lists: true });
  });
  $('customRows').addEventListener('change', function () {
    if (this.checked) {
      var probe = T.clone(state); probe.adv.customRows = null;
      state.adv.customRows = T.spec(probe, env).rows.map(function (r) { return { label: r.label, a: plain(r.a), b: plain(r.b) }; });
    } else state.adv.customRows = null;
    update({ lists: true });
  });
  function plain(s) { return String(s || '').replace(/ /g, ' '); }
  $('addRow').addEventListener('click', function () {
    if (state.adv.customRows && state.adv.customRows.length < 5) { state.adv.customRows.push({ label: 'Подпись', a: 'Значение', b: '' }); update({ lists: true }); }
  });

  /* ── картинка ── */
  var fileInput = $('imageFile');
  $('imageBtn').addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    toast('Загружаю картинку…');
    T.readImage(file).then(function (r) {
      return T.images.put(r.data).then(function (id) {
        var old = state.event.image.ref;
        state.event.image = { ref: id, x: 50, y: 50, zoom: 1 };
        if (old && old !== 'example') T.images.drop(old);
        update();
        toast(r.origW > r.w ? 'Готово. Картинка уменьшена до ' + r.w + ' px по длинной стороне' : 'Готово');
      });
    }).catch(function (err) { toast(err.message || 'Не получилось открыть файл'); });
  });
  $('imageReset').addEventListener('click', function () {
    var old = state.event.image.ref;
    state.event.image = T.clone(T.DEFAULTS.event.image);
    if (old && old !== 'example') T.images.drop(old);
    update();
  });

  // Кадр двигается прямо на макете
  var drag = null;
  stage.addEventListener('pointerdown', function (e) {
    var box = e.target.closest && e.target.closest('.p-img');
    if (!box || !stageInner.contains(box)) return;
    var im = box.querySelector('img');
    if (!im || !im.naturalWidth) return;
    e.preventDefault();
    box.setPointerCapture(e.pointerId);
    var bw = box.offsetWidth, bh = box.offsetHeight, z = state.event.image.zoom || 1;
    var s0 = Math.max(bw / im.naturalWidth, bh / im.naturalHeight);
    drag = {
      box: box, im: im, sx: e.clientX, sy: e.clientY, x: state.event.image.x, y: state.event.image.y,
      ovx: Math.max(im.naturalWidth * s0 * z - bw, bw * 0.5), ovy: Math.max(im.naturalHeight * s0 * z - bh, bh * 0.5)
    };
    box.classList.add('dragging');
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = (e.clientX - drag.sx) / previewScale, dy = (e.clientY - drag.sy) / previewScale;
    var x = Math.max(0, Math.min(100, drag.x - dx / drag.ovx * 100));
    var y = Math.max(0, Math.min(100, drag.y - dy / drag.ovy * 100));
    drag.nx = Math.round(x); drag.ny = Math.round(y);
    var pos = drag.nx + '% ' + drag.ny + '%';
    drag.im.style.objectPosition = pos; drag.im.style.transformOrigin = pos;
  });
  function endDrag() {
    if (!drag) return;
    var d = drag; drag = null;
    d.box.classList.remove('dragging');
    if (d.nx == null) return;
    state.event.image.x = d.nx; state.event.image.y = d.ny;
    update();
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  /* ── история для сетки Instagram ── */
  function refreshHistory() {
    return T.history.list().then(function (h) { history = h.slice(0, 30); render(); });
  }
  $('histFile').addEventListener('change', function () {
    var files = Array.prototype.slice.call(this.files || []);
    this.value = '';
    if (!files.length) return;
    var base = history.length ? Math.min.apply(null, history.map(function (h) { return h.ts; })) : Date.now();
    Promise.all(files.map(function (f, i) {
      return T.readImage(f, 1600, 0.85).then(function (r) { return T.thumb(r.data, 432); })
        .then(function (thumb) { return thumb && T.history.add({ ts: base - 1 - i, thumb: thumb, title: f.name, multi: false, source: 'upload' }); });
    })).then(refreshHistory, function (err) { toast(err.message || 'Не получилось добавить картинки'); });
  });

  /* ── текст поста ── */
  function copyCaption() {
    var t = current.caption;
    var done = function () { toast('Текст поста скопирован'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { fallbackCopy(t); done(); });
    else { fallbackCopy(t); done(); }
  }
  function fallbackCopy(t) {
    var ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* нет доступа к буферу */ }
    document.body.removeChild(ta);
  }

  /* ── выгрузка ── */
  function waitImages(root) {
    return Promise.all(Array.prototype.map.call(root.querySelectorAll('img'), function (im) {
      if (im.complete && im.naturalWidth) return im.decode ? im.decode().catch(function () {}) : null;
      return new Promise(function (r) { im.onload = im.onerror = r; });
    }));
  }
  var IS_WEBKIT = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Android/.test(navigator.userAgent);
  var IS_TOUCH = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  function download(url, name) {
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  // На телефоне — системное меню «Поделиться» (там есть «Сохранить изображение»), иначе обычная загрузка
  function deliver(items) {
    var all = function () { items.forEach(function (it) { download(it.url, it.name); }); };
    if (!IS_TOUCH || !navigator.canShare) { all(); return Promise.resolve(); }
    return Promise.all(items.map(function (it) {
      return fetch(it.url).then(function (r) { return r.blob(); }).then(function (b) { return new File([b], it.name, { type: b.type }); });
    })).then(function (files) {
      if (!navigator.canShare({ files: files })) { all(); return; }
      return navigator.share({ files: files }).catch(function (err) { if (!err || err.name !== 'AbortError') all(); });
    });
  }
  function renderFile(s, i, opt) {
    var off = $('offscreen'), node;
    var name = T.slug(s.title) + '-' + state.type + '-' + T.FORMATS[s.format].name.replace(':', 'x') +
      (s.slides.length > 1 ? '-' + (i + 1) : '') + '.' + (opt.type === 'png' ? 'png' : 'jpg');
    var o = { width: 1080, height: s.H, pixelRatio: opt.scale, backgroundColor: s.theme === 'dark' ? '#0D0D0D' : '#F2F1EB' };
    var make = function () {
      return opt.type === 'png' ? window.htmlToImage.toPng(node, o) : window.htmlToImage.toJpeg(node, Object.assign({ quality: opt.quality }, o));
    };
    return document.fonts.ready.then(function () {
      var r = T.layout(s, i, off, 1);   // та же подгонка, что в предпросмотре, в масштабе 1:1
      if (r.over) throw new Error('текст не помещается на ' + r.over + ' px');
      node = off.firstElementChild;
      return waitImages(node);
    }).then(function () {
      // Safari иногда рисует первый проход без картинки и шрифтов — первый результат отбрасываем
      return IS_WEBKIT ? make().then(make) : make();
    }).then(function (url) { off.innerHTML = ''; return { url: url, name: name }; });
  }
  var busyNow = false;
  $('exportBtn').addEventListener('click', function () {
    if (current.blocked) return;
    var s = current.spec, simple = state.mode !== 'advanced';
    var opt = simple ? { type: 'jpeg', scale: 1, quality: 0.92 } : { type: state.adv.exportType, scale: state.adv.exportScale, quality: state.adv.jpegQuality };
    var files = [];
    busyNow = true; $('exportBtn').disabled = true;
    s.slides.reduce(function (p, _, i) {
      return p.then(function () { return renderFile(s, i, opt).then(function (f) { files.push(f); }); });
    }, Promise.resolve())
      .then(function () { return deliver(files); })
      .then(function () {
        toast(files.length > 1 ? 'Готово: ' + files.length + ' файла' : 'Готово');
        if (s.format !== 'story') {
          return T.thumb(files[0].url, 432).then(function (thumb) {
            return thumb && T.history.add({ ts: Date.now(), thumb: thumb, title: s.title, multi: files.length > 1, source: 'export' });
          }).then(refreshHistory);
        }
      })
      .catch(function (err) { console.error(err); $('offscreen').innerHTML = ''; toast('Не получилось сохранить: ' + (err && err.message || err)); })
      .then(function () { busyNow = false; render(); });
  });

  $('resetBtn').addEventListener('click', function () {
    if (!window.confirm('Вернуть пример и сбросить все поля?')) return;
    var keep = { mode: state.mode, ig: state.ig, tab: state.tab, tgTheme: state.tgTheme };
    var old = state.event.image.ref;
    state = Object.assign(T.clone(T.DEFAULTS), keep);
    if (old && old !== 'example') T.images.drop(old);
    update({ lists: true });
  });

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  window.TTSPosterBuilder = { state: function () { return state; }, current: function () { return current; }, set: function (s) { state = s; update({ lists: true }); } };

  /* ── старт ── */
  $('appLogo').innerHTML = T.logo();
  T.loadState().then(function (s) {
    state = s;
    return T.images.load(state.event.image.ref);
  }).then(function (src) {
    if (!src) state.event.image = T.clone(T.DEFAULTS.event.image); // картинка не нашлась в браузере
    renderLists(); syncControls(); render();
    refreshHistory();
    window.addEventListener('resize', scheduleRender);
    // перерисовка только при смене ширины колонки предпросмотра, иначе высота холста зациклит наблюдатель
    var lastW = 0, pv = stage.parentElement;
    if (window.ResizeObserver) new ResizeObserver(function () { if (pv.clientWidth !== lastW) { lastW = pv.clientWidth; scheduleRender(); } }).observe(pv);
    if (document.fonts) document.fonts.ready.then(scheduleRender);
    document.body.classList.add('ready');
  });
})();
