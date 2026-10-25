/* Справочник «Как не надо»: пары «Не так / Так», нарисованные тем же движком, что и конструктор.
   «Не так» собирается в обход ограничений конструктора — в нём самом большую часть этих ошибок не сделать. */
(function () {
  'use strict';
  var T = window.TTS;
  var esc = T.esc;
  var $ = function (id) { return document.getElementById(id); };
  var EXAMPLE = 'assets/example.jpg';
  var lowres = '';
  var env = { src: function (ref) { return ref === 'lowres' ? lowres : EXAMPLE; }, tone: function () { return 'dark'; } };

  function base(mut) {
    var s = T.clone(T.DEFAULTS);
    s.mode = 'advanced';
    if (mut) mut(s);
    return s;
  }
  // raw — без подгонки названия: так «Не так» показывает, во что превращается пост без ограничений конструктора
  function slideHtml(state, i, raw) {
    var spec = T.spec(state, env);
    if (raw) $('measure').innerHTML = T.renderSlide(spec, i || 0, spec.titleSize || T.BASE.frame);
    else T.layout(spec, i || 0, $('measure'), 1);
    var html = $('measure').innerHTML;
    $('measure').innerHTML = '';
    return { html: html, spec: spec };
  }
  var seq = 0;
  function uniq(html) { seq += 1; return html.replace(/ttsm(\d+)/g, 'ttsg' + seq + '_$1'); }
  function scaledBox(html, w, H, cropH) {
    var h = cropH || Math.round(H * w / 1080);
    var k = cropH ? Math.max(w / 1080, cropH / H) : w / 1080;
    var left = (w - 1080 * k) / 2, top = (h - H * k) / 2;
    return '<div class="pv-crop" style="width:' + w + 'px;height:' + h + 'px"><div class="pv-scaled-in" style="transform:translate(' + left + 'px,' + top + 'px) scale(' + k + ')">' + uniq(html) + '</div></div>';
  }

  /* ── правки «Не так», которых конструктор не допускает ── */
  var tweaks = {
    colors: function (p) {
      var m = p.querySelector('.smm-mark');
      if (m) m.style.cssText += ';background:#FB923C;color:#FFFFFF';
      p.querySelectorAll('.smm-line, .smm-age').forEach(function (el) { el.style.color = '#0047FF'; });
    },
    overImage: function (p) {
      var im = p.querySelector('.smm-img'), panel = p.querySelector('.smm-panel'), scrim = p.querySelector('.smm-scrim');
      im.style.cssText += ';position:absolute;inset:0;height:auto;flex:none;z-index:0';
      if (scrim) scrim.style.display = 'none';
      panel.style.cssText += ';background:none;z-index:1';
      p.style.setProperty('--smm-fg', '#FFFFFF'); p.style.setProperty('--smm-muted', '#EDEDED');
    },
    decor: function (p) {
      var im = p.querySelector('.smm-img');
      im.style.cssText += ';border-radius:48px;box-shadow:0 30px 60px #00000080;border:10px solid #FFFFFF';
      p.querySelector('.smm-title').style.textShadow = '0 8px 16px #00000059';
      var l = p.querySelector('.smm-line');
      if (l) l.style.cssText += ';background:#FFFFFF;border-radius:40px;padding:14px 28px;box-shadow:0 12px 30px #0000002E';
    },
    storyEdges: function (p) {
      p.style.paddingTop = '48px'; p.style.paddingBottom = '40px';
    }
  };

  var BAD_CAPTION = 'МЁРТВЫЕ ДУШИ!!! 🔥🔥🔥 СПЕШИТЕ!!! Евгений Миронов и Юрий Башмет на одной сцене в спектакле-концерте по поэме Гоголя с музыкой Шнитке, а также Мария Смольникова и оркестр Новая Россия, режиссер Мария Брусникина, 29.04 в 19.00 в Доме музыки, билеты от 3000 руб по ссылке, торопитесь, места разлетаются!!! 🎭🎭🎭';
  var BAD_TEXT = 'Спектакль-концерт "Мёртвые души" - Гоголь и Шнитке в одном вечере. Начало в 19:00, билеты от 3000 ₽, 10-12 ряды партера...';

  /* ── пары ── */
  var EX = [
    { id: 'overload', title: 'Не перегружайте картинку',
      why: 'Каждая лишняя строка делает мельче всё остальное: картинка ужимается, название уменьшается, а на телефоне текст сливается. На картинке — надзаголовок, название и одна строка «когда и где». Цена, состав, условия — в текст поста.',
      bad: function () { return base(function (s) { s.type = 'status'; s.status = 'few'; s.event.title = 'Мёртвые души. Гоголь и Шнитке'; s.adv.subline = '29 апреля, 19:00 · Дом музыки, Светлановский зал · от 3 000 ₽ · Миронов, Башмет'; }); },
      good: function () { return base(function (s) { s.type = 'status'; s.status = 'few'; }); } },
    { id: 'city', title: 'Не пишите город и очевидное',
      why: 'Сервис работает в одном городе — «Москва» на картинке ничего не сообщает и только удлиняет строку. То же с «билеты», «купить», «начало в»: дата и время говорят сами.',
      bad: function () { return base(function (s) { s.adv.subline = 'Начало 29 апреля в 19:00 · Москва, Дом музыки'; }); },
      good: function () { return base(); } },
    { id: 'caps', title: 'Не пишите название капсом',
      why: 'Капс читается медленнее и выглядит как крик. По правилу 14.3 названия событий пишутся обычным регистром, капс — только по решению владельца.',
      bad: function () { return base(function (s) { s.adv.titleCaps = true; }); },
      good: function () { return base(); } },
    { id: 'long-title', title: 'Не растягивайте название на три строки', raw: true,
      why: 'Три строки названия съедают картинку и ломают поля. На холсте — имя события, подробности — в текст поста. Конструктор сам уменьшит название до двух строк, но короткое всегда читается лучше.',
      bad: function () { return base(function (s) { s.event.title = 'Мёртвые души: Гоголь, Шнитке и оркестр «Новая Россия»'; s.adv.titleSize = 118; }); },
      good: function () { return base(); } },
    { id: 'emoji', title: 'Не ставьте на картинку эмодзи и восклицательные знаки',
      why: 'Эмодзи на холсте рисуются чужим шрифтом и спорят с типографикой, восклицательные знаки делают анонс крикливым. Эмодзи уместны в тексте поста — по одному в начале строки.',
      bad: function () { return base(function (s) { s.event.title = 'Мёртвые души 🔥'; s.event.kind = 'Только один вечер!!!'; }); },
      good: function () { return base(); } },
    { id: 'colors', title: 'Не раскрашивайте метки и подписи',
      why: 'Цветная метка и синие подписи — ещё три пятна рядом с афишей. Метка статуса — инверсия: светлая на тёмном, тёмная на светлом. Кобальт на холсте — только у активной палочки слайдов.',
      bad: function () { return base(function (s) { s.type = 'status'; s.status = 'few'; }); }, badTweak: tweaks.colors,
      good: function () { return base(function (s) { s.type = 'status'; s.status = 'few'; }); } },
    { id: 'glow', title: 'Не ставьте яркое свечение рядом с афишей',
      why: 'Яркое свечение и афиша — два пятна, и взгляду не за что зацепиться. С картинкой — «Рампа», тихий свет снизу. «Луч», «Глубина» и «Ореол» — для постов без картинки.',
      bad: function () { return base(function (s) { s.theme = 'dark'; s.genre = 'opera'; s.adv.fx = 'beam'; }); },
      good: function () { return base(function (s) { s.theme = 'dark'; s.genre = 'opera'; }); } },
    { id: 'over-image', title: 'Не кладите текст на картинку',
      why: 'На пёстрой афише текст и логотип теряются, а на другой картинке шаблон сломается. Текст стоит на спокойном поле — под картинкой.',
      bad: function () { return base(function (s) { s.layout = 'band'; }); }, badTweak: tweaks.overImage,
      good: function () { return base(function (s) { s.layout = 'band'; }); } },
    { id: 'decor', title: 'Не добавляйте рамки, тени и скругления',
      why: 'Скругления, тени и плашки — чужой стиль. Система угловатая: радиус не больше 2 px, без теней и рамок.',
      bad: function () { return base(); }, badTweak: tweaks.decor,
      good: function () { return base(); } },
    { id: 'lowres', title: 'Не берите маленькие картинки',
      why: 'Маленькая картинка растягивается и мылится. Нужен исходник от 1080 px по ширине — конструктор предупредит, если картинка мелкая.',
      bad: function () { return base(function (s) { s.event.image.ref = 'lowres'; }); },
      good: function () { return base(); } },
    { id: 'square', title: 'Не публикуйте квадрат в Instagram', view: 'tile',
      why: 'Сетка профиля показывает середину поста в пропорции 3:4. У квадрата срезается примерно по 135 px с каждой стороны — вместе с логотипом и краем текста. 4:5 теряет около 34 px, это внутри полей.',
      bad: function () { return base(function (s) { s.format = 'square'; }); },
      good: function () { return base(); } },
    { id: 'story', title: 'Не прячьте главное у краёв сторис', view: 'story',
      why: 'Верх сторис закрывают полоска прогресса и имя, низ — строка ответа. Название и даты у краёв окажутся под интерфейсом.',
      bad: function () { return base(function (s) { s.format = 'story'; }); }, badTweak: tweaks.storyEdges,
      good: function () { return base(function (s) { s.format = 'story'; }); } },
    { id: 'series', title: 'Не меняйте стиль от поста к посту', view: 'grid',
      why: 'В профиле посты стоят рядом. Если каждый в своей теме, шаблоне и со своим свечением, лента выглядит случайной. Выберите тему и шаблон на серию и держите их.',
      bad: function () {
        return [
          base(function (s) { s.layout = 'band'; s.theme = 'dark'; s.adv.titleCaps = true; }),
          base(function (s) { s.type = 'status'; s.status = 'start'; s.layout = 'type'; s.glow = 'halo'; s.genre = 'musical'; }),
          base(function (s) { s.layout = 'album'; s.theme = 'dark'; s.adv.fx = 'beam'; s.genre = 'opera'; }),
          base(function (s) { s.type = 'status'; s.status = 'few'; s.layout = 'band'; }),
          base(function (s) { s.type = 'change'; s.theme = 'dark'; }),
          base(function (s) { s.type = 'status'; s.status = 'last'; s.adv.titleCaps = true; s.adv.margins = 'tight'; })
        ];
      },
      good: function () {
        return [
          base(),
          base(function (s) { s.type = 'status'; s.status = 'start'; }),
          base(function (s) { s.layout = 'album'; }),
          base(function (s) { s.type = 'status'; s.status = 'few'; }),
          base(function (s) { s.type = 'change'; }),
          base(function (s) { s.type = 'status'; s.status = 'last'; })
        ];
      } },
    { id: 'caption', title: 'Не пишите текст поста сплошной стеной', view: 'tg',
      why: 'Абзац капсом с датой в середине не дочитывают. Структура канала: крючок, о чём, когда и где, билеты, почему сейчас. Конструктор собирает её сам — останется вписать крючок и пару предложений.',
      badCaption: BAD_CAPTION,
      bad: function () { return base(); }, good: function () { return base(); } },
    { id: 'typo', title: 'Не ставьте дефис вместо тире и кавычки-«лапки»', view: 'text',
      why: 'Дефис вместо тире, прямые кавычки и предлог в конце строки выглядят небрежно. Типограф конструктора исправляет это сам — в расширенном интерфейсе его можно выключить, но без причины не стоит.' }
  ];

  /* ── отрисовка ── */
  function shotWidth(view, cell) {
    var w = cell.clientWidth;
    if (view === 'tg') return Math.min(360, w);
    if (view === 'story') return Math.min(240, w);
    return Math.min(w, 360);
  }
  function renderShot(ex, kind, cell) {
    var view = ex.view || 'poster';
    var w = shotWidth(view, cell);
    var make = ex[kind], tweak = ex[kind + 'Tweak'];
    if (view === 'text') {
      var t = kind === 'bad' ? BAD_TEXT : T.typo(BAD_TEXT);
      cell.innerHTML = '<div class="g-text">' + esc(t).replace(/ /g, '<span class="g-nb"> </span>') + '</div>';
      return;
    }
    if (view === 'grid') {
      var tw = Math.floor((w - 4) / 3), th = Math.round(tw * 4 / 3);
      cell.innerHTML = '<div class="g-grid" style="grid-template-columns:repeat(3,' + tw + 'px)">' + make().map(function (st) {
        var r = slideHtml(st, 0);
        return scaledBox(r.html, tw, r.spec.H, th);
      }).join('') + '</div>';
      return;
    }
    var r = slideHtml(make(), 0, kind === 'bad' && ex.raw);
    if (view === 'tg') {
      var st = make();
      cell.innerHTML = T.previewTelegram({ H: r.spec.H, slides: [r.html], caption: kind === 'bad' ? ex.badCaption : T.captionText(st), tgTheme: 'dark' });
      return;
    }
    if (view === 'story') {
      cell.innerHTML = T.previewStory({ H: r.spec.H, slides: [r.html], handle: 'tickettoshow.ru', platform: 'ig' });
      if (tweak) tweak(cell.querySelector('.smm-canvas'));
      return;
    }
    if (view === 'tile') {
      var h = Math.round(w * 4 / 3);
      cell.innerHTML = '<div class="g-tile">' + scaledBox(r.html, w, r.spec.H, h) + '</div>';
      return;
    }
    cell.innerHTML = scaledBox(r.html, w, r.spec.H);
    if (tweak) tweak(cell.querySelector('.smm-canvas'));
  }

  function build() {
    $('toc').innerHTML = EX.map(function (ex, i) { return '<a href="#' + ex.id + '">' + (i + 1) + '. ' + esc(ex.title) + '</a>'; }).join('') +
      '<a href="#standard">Стандарт конструктора</a>';
    $('guideList').innerHTML = EX.map(function (ex, i) {
      return '<section class="g-section" id="' + ex.id + '">' +
        '<h3 class="g-title"><span class="step">' + (i + 1) + '</span>' + esc(ex.title) + '</h3>' +
        '<p class="g-why">' + esc(ex.why) + '</p>' +
        '<div class="g-pair g-view-' + (ex.view || 'poster') + '">' +
          '<figure class="g-fig"><figcaption class="g-bad">Не так</figcaption><div class="g-cell" data-ex="' + i + '" data-kind="bad"></div></figure>' +
          '<figure class="g-fig"><figcaption class="g-good">Так</figcaption><div class="g-cell" data-ex="' + i + '" data-kind="good"></div></figure>' +
        '</div></section>';
    }).join('');
    paint();
  }
  function paint() {
    document.querySelectorAll('.g-cell').forEach(function (cell) {
      renderShot(EX[+cell.getAttribute('data-ex')], cell.getAttribute('data-kind'), cell);
    });
  }

  // уменьшенная копия примера — для пары «маленькая картинка»
  function makeLowres() {
    return new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas'); c.width = 64; c.height = Math.round(64 * im.naturalHeight / im.naturalWidth);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        lowres = c.toDataURL('image/jpeg', 0.7); resolve();
      };
      im.onerror = resolve;
      im.src = EXAMPLE;
    });
  }

  $('appLogo').innerHTML = T.logo();
  var lastW = 0;
  Promise.all([makeLowres(), document.fonts ? document.fonts.ready : null]).then(function () {
    build();
    lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth; paint();
    });
  });
})();
