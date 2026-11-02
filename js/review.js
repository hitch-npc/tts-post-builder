/* Сверка сочетаний: сборки постов тем же движком, у каждой — «Допустимо» / «Нет».
   Оценки хранятся в браузере и копируются одним списком — по ним правятся «Как не надо» и ограничения конструктора. */
(function () {
  'use strict';
  var T = window.TTS;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'tts-review-r3';
  var env = { src: function () { return 'assets/example.jpg'; }, tone: function () { return 'dark'; } };
  var KINDS = Object.keys(T.ARTS);
  var HUES = ['cobalt', 'cool', 'violet', 'teal', 'green', 'gold', 'warm', 'silver'];   // красный — только у переноса и отмены
  var MARKS = { invert: 'инверсия', art: 'как рисунок', accent: 'кобальт', green: 'зелёный', orange: 'оранжевый', red: 'красный', default: 'нейтральный' };
  var FIELD = { auto: 'По теме', paper: 'Бумага', stone: 'Камень', graphite: 'Графит', night: 'Ночь', cobalt: 'Кобальт' };

  function st(o) {
    var s = T.clone(T.DEFAULTS);
    s.mode = 'advanced'; s.format = 'post';
    s.type = o.type || 'announce'; s.layout = o.layout || 'type';
    s.theme = o.theme || 'dark'; s.field = o.field || 'auto';
    s.art = o.art || 'glass'; s.artSeed = o.seed || 7; s.artHue = o.hue || 'auto';
    if (o.change) s.change.kind = o.change;
    if (o.style) { s.video.style = o.style; s.video.layout = 'type'; }
    if (o.genre) s.genre = o.genre;
    s.markColor = o.mark || 'invert';
    return s;
  }
  function label(o) {
    var t = { status: 'Статус продаж', announce: 'Анонс', change: o.change === 'cancel' ? 'Отмена' : 'Перенос', digest: 'Подборка', video: 'Обложка видео' }[o.type || 'announce'];
    return [t, o.theme === 'light' ? 'светлая' : 'тёмная', 'фон ' + FIELD[o.field || 'auto'].toLowerCase(),
      (T.ART_HUES[o.hue || 'auto'] || '').toLowerCase(), '«' + (T.ARTS[o.art] || 'без рисунка') + '»'].concat(o.mark ? ['метка: ' + (MARKS[o.mark] || o.mark)] : []).join(' · ');
  }

  // наборы: тёмный фон × цвета бренда — главный вопрос; затем светлая тема и типы постов
  var SETS = [];
  var a = [];
  HUES.forEach(function (h, i) { a.push({ theme: 'dark', field: 'auto', hue: h, art: KINDS[i % KINDS.length] }); });
  HUES.forEach(function (h, i) { a.push({ theme: 'dark', field: 'night', hue: h, art: KINDS[(i + 4) % KINDS.length] }); });
  HUES.forEach(function (h, i) { a.push({ theme: 'dark', field: 'graphite', hue: h, art: KINDS[(i + 7) % KINDS.length] }); });
  SETS.push({ id: 'A', title: 'Тёмный фон и цвета бренда', note: 'Один вид рисунка не повторяется подряд: оценивается сочетание фона и цвета.', items: a });
  var b = [];
  HUES.forEach(function (h, i) { b.push({ theme: 'light', field: i % 2 ? 'paper' : 'auto', hue: h, art: KINDS[(i + 2) % KINDS.length] }); });
  SETS.push({ id: 'B', title: 'Светлая тема и цвета бренда', note: 'Бумага и белый фон по теме — через одну.', items: b });
  var c = [
    { type: 'change', change: 'move', art: 'silk' }, { type: 'change', change: 'move', art: 'steps', field: 'night' },
    { type: 'change', change: 'cancel', art: 'smoke' }, { type: 'change', change: 'cancel', art: 'contour', theme: 'light' }, { type: 'change', change: 'move', art: 'glass', hue: 'red' },
    { type: 'digest', art: 'glass' }, { type: 'digest', art: 'rays', hue: 'violet' }, { type: 'digest', art: 'halftone', theme: 'light' },
    { type: 'video', style: 'poster', art: 'moon' }, { type: 'video', style: 'stack', art: 'chrome', hue: 'gold' },
    { type: 'video', style: 'center', art: 'rays', hue: 'teal' }, { type: 'video', style: 'numeral', art: 'grain', hue: 'cobalt' }
  ];
  var d = [
    { type: 'change', change: 'move', art: 'silk', mark: 'invert' }, { type: 'change', change: 'move', art: 'silk', mark: 'art' },
    { type: 'change', change: 'cancel', art: 'smoke', mark: 'art' }, { type: 'change', change: 'move', art: 'glass', theme: 'light', mark: 'art' },
    { type: 'status', art: 'rays', mark: 'accent' }, { type: 'status', art: 'rays', mark: 'art', hue: 'violet' },
    { type: 'status', art: 'moon', mark: 'default', hue: 'teal' }, { type: 'status', art: 'contour', mark: 'green', genre: 'musical' },
    { type: 'status', art: 'steps', mark: 'invert', hue: 'gold' }, { type: 'status', art: 'glass', mark: 'orange', genre: 'opera' },
    { type: 'status', art: 'silk', mark: 'accent', theme: 'light' }, { type: 'status', layout: 'frame', mark: 'accent' }
  ];
  SETS.push({ id: 'C', title: 'Типы постов', note: 'Перенос и отмена — свой цвет по смыслу; подборка и обложки видео — с цветами бренда.', items: c });
  SETS.push({ id: 'D', title: 'Цвет метки', note: 'Метка над названием: инверсия или тег ядра — кобальт, зелёный, оранжевый, красный, нейтральный.', items: d });

  var votes = {};
  try { votes = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { votes = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(votes)); } catch (e) { /* без хранилища — оценки живут до перезагрузки */ } }

  var seq = 0;
  function uniq(html) { seq += 1; return html.replace(/ttsm(\d+)/g, 'ttsr' + seq + '_$1'); }
  function render(o, w) {
    var spec = T.spec(st(o), env);
    T.layout(spec, 0, $('measure'), 1);
    var html = $('measure').innerHTML; $('measure').innerHTML = '';
    var h = Math.round(spec.H * w / 1080), k = w / 1080;
    return '<div class="pv-crop" style="width:' + w + 'px;height:' + h + 'px"><div class="pv-scaled-in" style="transform:scale(' + k + ')">' + uniq(html) + '</div></div>';
  }

  var all = [];
  function build() {
    var out = '';
    SETS.forEach(function (set) {
      out += '<section class="rv-sec"><h2>' + set.id + ' · ' + T.esc(set.title) + '</h2><p>' + T.esc(set.note) + '</p><div class="rv-grid">';
      set.items.forEach(function (o, i) {
        var id = set.id + (i + 1); o.id = id; all.push(o);
        out += '<div class="rv-card" data-id="' + id + '"><div class="rv-slot" data-slot="' + id + '"></div>' +
          '<span class="rv-id">' + id + '</span><span class="rv-name">' + T.esc(label(o)) + '</span>' +
          '<div class="rv-btns"><button class="btn btn-ghost btn-sm rv-ok" type="button" data-vote="ok">Допустимо</button>' +
          '<button class="btn btn-ghost btn-sm rv-no" type="button" data-vote="no">Нет</button></div></div>';
      });
      out += '</div></section>';
    });
    $('list').innerHTML = out;
    sync();
    // макеты дорисовываются по одному, чтобы страница не замирала
    var i = 0;
    (function step() {
      if (i >= all.length) return;
      var o = all[i++];
      document.querySelector('[data-slot="' + o.id + '"]').innerHTML = render(o, 220);
      setTimeout(step, 16);
    })();
  }

  function sync() {
    var ok = 0, no = 0;
    document.querySelectorAll('.rv-card').forEach(function (c) {
      var v = votes[c.getAttribute('data-id')] || '';
      c.setAttribute('data-v', v);
      c.querySelectorAll('[data-vote]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-vote') === v)); });
      if (v === 'ok') ok++; if (v === 'no') no++;
    });
    $('count').textContent = 'Допустимо: ' + ok + ' · Нет: ' + no + ' · Без оценки: ' + (all.length - ok - no);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-vote]');
    if (b) {
      var id = b.closest('.rv-card').getAttribute('data-id'), v = b.getAttribute('data-vote');
      votes[id] = votes[id] === v ? '' : v; if (!votes[id]) delete votes[id];
      save(); sync(); return;
    }
    var crop = e.target.closest('.rv-slot .pv-crop');
    if (crop) {
      var o = all.filter(function (x) { return x.id === crop.closest('.rv-card').getAttribute('data-id'); })[0];
      var w = Math.min(540, window.innerWidth - 32, Math.round((window.innerHeight - 32) * 1080 / 1350));
      $('box').innerHTML = render(o, w); $('box').hidden = false; return;
    }
    if (e.target.closest('#box')) { $('box').hidden = true; $('box').innerHTML = ''; return; }
    if (e.target.closest('#clear')) { votes = {}; save(); sync(); return; }
    if (e.target.closest('#copy')) {
      var lines = ['Сверка сочетаний r3'];
      [['ok', 'Допустимо'], ['no', 'Нет']].forEach(function (g) {
        var ids = all.filter(function (o) { return votes[o.id] === g[0]; });
        if (ids.length) lines.push(g[1] + ': ' + ids.map(function (o) { return o.id + ' (' + label(o) + ')'; }).join('; '));
      });
      var text = lines.join('\n');
      var done = function () { toast('Оценки скопированы'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { prompt('Скопируйте:', text); });
      else prompt('Скопируйте:', text);
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('box').hidden) { $('box').hidden = true; $('box').innerHTML = ''; } });

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  $('appLogo').innerHTML = T.logo();
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(build);
})();
