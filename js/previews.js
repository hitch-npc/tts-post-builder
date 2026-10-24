/* Конструктор постов TTS — превью: Telegram-канал, лента и сетка Instagram, сторис.
   Это приближённые макеты интерфейсов: размеры и обрезка как в приложениях, мелкие детали упрощены. */
(function () {
  'use strict';
  var T = window.TTS;
  var esc = T.esc;

  var seq = 0;
  // Копии холста получают свои id масок логотипа, иначе SVG ссылается на чужую маску
  function uniq(html) { seq += 1; return html.replace(/ttsm(\d+)/g, 'ttsp' + seq + '_$1'); }
  // Холст, уменьшенный до ширины w (высота по формату)
  function scaled(html, w, H) {
    var k = w / 1080;
    return '<div class="pv-scaled" style="width:' + w + 'px;height:' + Math.round(H * k) + 'px">' +
      '<div class="pv-scaled-in" style="transform:scale(' + k + ')">' + uniq(html) + '</div></div>';
  }
  // Холст, вписанный в кадр w×h с обрезкой по центру (как миниатюры в сетке)
  function cropped(html, w, h, H) {
    var k = Math.max(w / 1080, h / H);
    var left = (w - 1080 * k) / 2, top = (h - H * k) / 2;
    return '<div class="pv-crop" style="width:' + w + 'px;height:' + h + 'px">' +
      '<div class="pv-scaled-in" style="transform:translate(' + left + 'px,' + top + 'px) scale(' + k + ')">' + uniq(html) + '</div></div>';
  }
  function linkify(text) {
    return esc(text).replace(/(https?:\/\/[^\s<]+|\[ссылка\])/g, '<span class="pv-link">$1</span>');
  }
  function avatar(cls) { return '<span class="' + cls + '">' + T.logoMark() + '</span>'; }

  var ICON = {
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.2A8 8 0 1 1 20 11.5Z"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M21 4 3 11l7 2.5L12.5 21 21 4Z"/><path d="m10 13.5 4-4"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 3h12v18l-6-4.5L6 21V3Z"/></svg>',
    album: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 3h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" opacity=".95"/><path d="M4 7v13h13" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></svg>'
  };

  /* ── Telegram: пост в канале ── */
  T.previewTelegram = function (ctx) {
    var W = 312, H = ctx.H, n = ctx.slides.length, media;
    if (n === 1) media = scaled(ctx.slides[0], W, H);
    else {
      // альбом из двух картинок одного формата — рядом, одной высоты
      var w = (W - 2) / 2;
      media = '<div class="tg-album">' + ctx.slides.map(function (h) { return scaled(h, w, H); }).join('') + '</div>';
    }
    return '<div class="pv pv-tg" data-theme="' + ctx.tgTheme + '">' +
      '<div class="tg-bar">' + avatar('tg-ava') + '<div class="tg-name"><b>Ticket to Show</b><small>канал</small></div></div>' +
      '<div class="tg-chat"><div class="tg-msg">' +
        '<div class="tg-media">' + media + '</div>' +
        '<div class="tg-cap">' + linkify(ctx.caption) + '<span class="tg-time">' + ICON.eye + '19:00</span></div>' +
      '</div></div></div>';
  };

  /* ── Instagram: пост в ленте ── */
  T.previewFeed = function (ctx) {
    var W = 360, H = ctx.H, n = ctx.slides.length;
    var cap = ctx.caption.replace(/\s+/g, ' ').trim();
    // до «ещё» Instagram показывает примерно первые 125 знаков
    var short = cap.length > 125 ? esc(cap.slice(0, 125).replace(/\s+\S*$/, '')) + '… <span class="ig-more">ещё</span>' : esc(cap);
    var dots = '';
    if (n > 1) { for (var i = 0; i < n; i++) dots += '<i' + (i === 0 ? ' class="on"' : '') + '></i>'; }
    return '<div class="pv pv-ig">' +
      '<div class="ig-head">' + avatar('ig-ava') + '<b>' + esc(ctx.handle) + '</b><span class="ig-dots">•••</span></div>' +
      '<div class="ig-media">' + scaled(ctx.slides[0], W, H) + (n > 1 ? '<span class="ig-count">1/' + n + '</span>' : '') + '</div>' +
      '<div class="ig-actions"><span>' + ICON.heart + ICON.comment + ICON.send + '</span>' +
        (n > 1 ? '<span class="ig-car">' + dots + '</span>' : '<span></span>') + '<span>' + ICON.save + '</span></div>' +
      '<div class="ig-cap"><b>' + esc(ctx.handle) + '</b> ' + short + '</div>' +
      '<p class="pv-note">Ссылки в подписи Instagram не кликабельны — ссылка на билеты должна быть в шапке профиля.</p>' +
    '</div>';
  };

  /* ── Instagram: сетка профиля 3:4 ── */
  T.previewGrid = function (ctx) {
    var W = 360, gap = 2, tw = (W - gap * 2) / 3, th = Math.round(tw * 4 / 3), H = ctx.H;
    var tiles = '<div class="igg-tile igg-new" style="height:' + th + 'px">' + cropped(ctx.slides[0], tw, th, H) +
      (ctx.slides.length > 1 ? '<span class="igg-multi">' + ICON.album + '</span>' : '') + '<span class="igg-badge">Новый</span></div>';
    ctx.history.forEach(function (h) {
      tiles += '<div class="igg-tile" style="height:' + th + 'px"><img src="' + esc(h.thumb) + '" alt="">' +
        (h.multi ? '<span class="igg-multi">' + ICON.album + '</span>' : '') +
        '<button class="igg-del" type="button" data-hist-del="' + h.id + '" aria-label="Убрать из сетки">×</button></div>';
    });
    var total = 1 + ctx.history.length, fill = Math.max(9, Math.ceil(total / 3) * 3);
    for (var i = total; i < fill; i++) tiles += '<div class="igg-tile igg-empty" style="height:' + th + 'px"></div>';
    return '<div class="pv pv-igg">' +
      '<div class="igg-head">' + avatar('ig-ava igg-ava') + '<div><b>' + esc(ctx.handle) + '</b><small>Публикации</small></div></div>' +
      '<div class="igg-grid" style="grid-template-columns:repeat(3,' + tw + 'px);gap:' + gap + 'px">' + tiles + '</div>' +
      '<div class="igg-tools"><button class="btn btn-ghost btn-sm" type="button" id="histAdd">Добавить прошлые посты</button>' +
        (ctx.history.length ? '<button class="btn btn-ghost btn-sm" type="button" id="histClear">Очистить</button>' : '') + '</div>' +
      '<p class="pv-note">Сетка показывает середину поста в пропорции 3:4: у 4:5 срезается по 34 px с боков, у квадрата — по 135 px. ' +
        'Рядом — ваши прошлые выгрузки и добавленные картинки. Они хранятся только в этом браузере.</p>' +
    '</div>';
  };

  /* ── сторис: интерфейс поверх кадра ── */
  T.previewStory = function (ctx) {
    var W = 270, H = ctx.H, k = W / 1080;
    return '<div class="pv pv-story">' +
      '<div class="st-frame" style="width:' + W + 'px;height:' + Math.round(H * k) + 'px">' + scaled(ctx.slides[0], W, H) +
        '<div class="st-top"><div class="st-progress"><i></i></div>' +
          '<div class="st-user">' + avatar('st-ava') + '<b>' + esc(ctx.platform === 'tg' ? 'Ticket to Show' : ctx.handle) + '</b><small>2 ч</small></div></div>' +
        '<div class="st-bottom"><span class="st-reply">' + (ctx.platform === 'tg' ? 'Ответить' : 'Отправить сообщение') + '</span>' + ICON.heart + ICON.send + '</div>' +
      '</div>' +
      '<p class="pv-note">Верх и низ сторис закрывает интерфейс. В конструкторе поля сторис — 262 px сверху и 250 px снизу.</p>' +
    '</div>';
  };
})();
