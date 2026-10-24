/* Конструктор постов TTS — хранение в браузере.
   Настройки — в localStorage, картинки и история выгрузок — в IndexedDB: там нет лимита в 5 МБ,
   поэтому большая афиша не пропадает после перезагрузки. */
(function () {
  'use strict';
  var T = window.TTS;
  var KEY = 'tts-post-builder-v2';
  var KEY_V1 = 'tts-post-builder-v1';
  var DB_NAME = 'tts-post-builder';
  var EXAMPLE = 'assets/example.jpg';

  /* ── IndexedDB: картинки и история ── */
  var dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('IndexedDB недоступна')); return; }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains('images')) d.createObjectStore('images');
        if (!d.objectStoreNames.contains('history')) d.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    dbp.catch(function () { /* без IndexedDB работаем в памяти */ });
    return dbp;
  }
  function tx(store, mode, fn) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var t = d.transaction(store, mode), st = t.objectStore(store), res;
        var r = fn(st);
        if (r) r.onsuccess = function () { res = r.result; };
        t.oncomplete = function () { resolve(res); };
        t.onerror = t.onabort = function () { reject(t.error); };
      });
    });
  }

  var mem = {};           // id → dataURL, чтобы рисовать синхронно
  function newId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  T.images = {
    src: function (ref) {
      if (!ref || ref === 'example') return EXAMPLE;
      return mem[ref] || '';
    },
    has: function (ref) { return !ref || ref === 'example' || !!mem[ref]; },
    put: function (dataUrl) {
      var id = newId('img-');
      mem[id] = dataUrl;
      return tx('images', 'readwrite', function (st) { return st.put(dataUrl, id); })
        .then(function () { return id; }, function () { return id; });
    },
    load: function (ref) {
      if (!ref || ref === 'example' || mem[ref]) return Promise.resolve(T.images.src(ref));
      return tx('images', 'readonly', function (st) { return st.get(ref); })
        .then(function (v) { if (v) mem[ref] = v; return v || ''; }, function () { return ''; });
    },
    drop: function (ref) {
      if (!ref || ref === 'example') return Promise.resolve();
      delete mem[ref];
      return tx('images', 'readwrite', function (st) { return st.delete(ref); }).catch(function () {});
    }
  };

  // История для сетки Instagram: выгруженные посты и добавленные вручную прошлые посты
  var histMem = [];
  T.history = {
    list: function () {
      return tx('history', 'readonly', function (st) { return st.getAll(); })
        .then(function (rows) { rows = rows || []; return rows.sort(function (a, b) { return b.ts - a.ts; }); },
              function () { return histMem.slice().sort(function (a, b) { return b.ts - a.ts; }); });
    },
    add: function (item) {
      return tx('history', 'readwrite', function (st) { return st.add(item); })
        .catch(function () { item.id = histMem.length + 1; histMem.push(item); });
    },
    remove: function (id) {
      histMem = histMem.filter(function (h) { return h.id !== id; });
      return tx('history', 'readwrite', function (st) { return st.delete(id); }).catch(function () {});
    },
    clear: function () {
      histMem = [];
      return tx('history', 'readwrite', function (st) { return st.clear(); }).catch(function () {});
    }
  };

  /* ── состояние ── */
  function merge(base, over) {
    if (Array.isArray(base)) return Array.isArray(over) ? over : base;
    if (base === null) return over === undefined ? null : over;
    if (base && typeof base === 'object') {
      var out = {};
      Object.keys(base).forEach(function (k) { out[k] = over && typeof over === 'object' && k in over ? merge(base[k], over[k]) : T.clone(base[k]); });
      return out;
    }
    return over === undefined ? base : over;
  }

  // Старые сохранения (первая версия конструктора) переносятся в новую схему
  function fromV1(o) {
    var s = T.clone(T.DEFAULTS);
    var genre = { cool: 'theatre', warm: 'opera', green: 'musical' }[o.genre] || 'theatre';
    s.theme = o.theme === 'dark' ? 'dark' : 'light';
    s.genre = genre;
    s.layout = o.template === 'band' ? 'band' : (o.template === 'cover' || o.template === 'details') ? 'album' : 'frame';
    s.format = o.format === 'story' ? 'story' : 'post';
    if (o.eyebrow != null) s.event.kind = o.eyebrow;
    if (o.title) s.event.title = o.title;
    if (o.lead != null) s.event.lead = o.lead;
    if (o.age != null) s.event.age = o.age;
    var c = o.caption || {};
    var iso = T.parseRuDate(c.date);
    if (iso) s.event.date = iso;
    if (c.time) s.event.time = c.time;
    if (c.venue) s.event.venue = c.venue;
    if (o.info && o.info[1] && o.info[1].b) s.event.city = o.info[1].b;
    if (c.price) s.event.price = String(c.price).replace(/\D/g, '');
    if (c.link) s.event.link = c.link;
    ['hook', 'body', 'why'].forEach(function (k) { if (c[k] != null) s.caption[k] = c[k]; });
    if (o.image) { s.event.image.x = o.image.x; s.event.image.y = o.image.y; s.event.image.zoom = o.image.zoom; }
    return { state: s, imageData: o.image && /^data:image\//.test(o.image.src || '') ? o.image.src : null };
  }

  T.loadState = function () {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return Promise.resolve(merge(T.DEFAULTS, JSON.parse(raw)));
      var v1 = localStorage.getItem(KEY_V1);
      if (v1) {
        var m = fromV1(JSON.parse(v1));
        var done = function () {
          T.saveState(m.state);
          try { localStorage.removeItem(KEY_V1); } catch (e) { /* ничего */ }
          return m.state;
        };
        if (!m.imageData) return Promise.resolve(done());
        return T.images.put(m.imageData).then(function (id) { m.state.event.image.ref = id; return done(); });
      }
    } catch (e) { /* хранилище недоступно — работаем с примером */ }
    return Promise.resolve(T.clone(T.DEFAULTS));
  };
  T.saveState = function (s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* без сохранения */ }
  };

  /* ── загрузка картинки: уменьшение до 2560 px по длинной стороне и JPEG ── */
  T.readImage = function (file, maxSide, quality) {
    maxSide = maxSide || 2560;
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () {
        var w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, maxSide / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        var g = c.getContext('2d');
        g.fillStyle = '#F2F1EB'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve({ data: c.toDataURL('image/jpeg', quality || 0.92), w: c.width, h: c.height, origW: w, origH: h });
      };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Не получилось открыть файл. Подойдут JPEG, PNG или WebP.')); };
      im.src = url;
    });
  };
  // Уменьшенная копия для сетки Instagram
  T.thumb = function (dataUrl, width) {
    return new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () {
        var k = width / im.naturalWidth, c = document.createElement('canvas');
        c.width = width; c.height = Math.round(im.naturalHeight * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      im.onerror = function () { resolve(''); };
      im.src = dataUrl;
    });
  };
})();
