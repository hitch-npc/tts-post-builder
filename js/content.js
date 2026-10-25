/* Конструктор постов TTS — текст поста для Telegram и проверки перед выгрузкой. */
(function () {
  'use strict';
  var T = window.TTS;
  var fmt = T.fmt;

  /* ── текст поста ── */
  // Структура канала: крючок → о чём → когда и где → билеты → почему сейчас
  T.captionText = function (state) {
    var simple = state.mode !== 'advanced';
    var ty = !simple && state.adv.typograph === false ? function (s) { return s || ''; } : T.typo;
    var c = state.caption, e = state.event, out = [];
    var link = e.link || '[ссылка]';
    var price = fmt.price(e.price);

    if (state.type === 'digest') {
      var d = state.digest;
      out.push('🎭 ' + ty(d.title) + ' 🎭', '');
      if (c.intro) out.push(ty(c.intro), '');
      d.items.forEach(function (it) {
        var p = fmt.price(it.price);
        out.push([fmt.short(it.date), it.time].filter(Boolean).join(', ') + ' — ' + ty('"' + it.title + '"'));
        out.push('📍 ' + [ty(it.venue), p ? 'от ' + p + ' ₽' : '', it.link].filter(Boolean).join(' · '));
        out.push('');
      });
      out.push('🎟️ Билеты без комиссии и выбор мест: ' + link);
      return clean(out);
    }

    if (state.type === 'change') {
      var ch = state.change, move = ch.kind === 'move';
      var name = ty((e.kind ? e.kind + ' ' : '') + '"' + e.title + '"');
      out.push((move ? 'Перенос: ' : 'Отмена: ') + ty('"' + e.title + '"'), '');
      if (c.change) out.push(ty(c.change), '');
      else if (move) out.push(name + ' переносится с ' + fmt.dayMonth(e.date) + ' на ' + fmt.long(ch.date) + '.', '');
      else out.push(name + ' ' + fmt.long(e.date) + (e.time ? ' в ' + e.time : '') + ' не состоится.', '');
      if (move) {
        out.push('📅 Новая дата: ' + [fmt.long(ch.date), ch.time].filter(Boolean).join(' | '));
        out.push('📍 ' + ty(ch.venue || e.venue));
        out.push('');
      }
      out.push('🎟️ ' + ty(ch.note || T.CHANGES[ch.kind].note));
      out.push('Подробности: ' + link);
      return clean(out);
    }

    if (c.hook) out.push('🎭 ' + ty(c.hook) + ' 🎭', '');
    if (c.body) out.push(ty(c.body), '');
    if (e.date || e.time) out.push('📅 ' + [fmt.long(e.date), e.time].filter(Boolean).join(' | '));
    if (e.venue) out.push('📍 ' + ty(e.venue));
    if (e.date || e.time || e.venue) out.push('');
    out.push('🎟️ Билеты без комиссии и выбор мест: ' + link);
    if (price) out.push('Цены — от ' + price + ' ₽');
    var why = c.why;
    if (state.type === 'status' && !why) why = T.STATUSES[state.status].why;
    if (why) out.push('', ty(why));
    return clean(out);
  };
  function clean(lines) { return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim(); }

  /* ── проверки ── */
  // Подсказка, что именно сократить, — по типу поста и слайду, который не поместился
  function overflowText(state, spec, fit) {
    var n = fit.over + ' px. ';
    if (spec.layout === 'digest') return 'Подборка не помещается на ' + n + 'Уберите одно событие или сократите названия и площадки.';
    if (spec.layout === 'change') return 'Текст не помещается на ' + n + 'Сократите текст про билеты или название площадки.';
    if (spec.layout === 'album' && fit.overSlide === 1) return 'Слайд деталей не помещается на ' + n + 'Сократите подводку или название.';
    var tips = [];
    if (String(state.event.title).length > 32) tips.push('сократите название');
    if (String(spec.subline || '').length > 40) tips.push('сократите строку под названием');
    if (spec.wide) tips.push('включите узкие поля в режиме Advanced');
    if (spec.layout === 'frame') tips.push('или возьмите макет «Картинка полосой» — в нём больше места для текста');
    var t = tips.join(', ');
    return 'Текст не помещается на ' + n + (t ? t.charAt(0).toUpperCase() + t.slice(1) + '.' : '');
  }

  // level: error — выгрузка закрыта; warn — стоит поправить; info — к сведению
  T.checks = function (state, spec, fit, img) {
    var out = [];
    var simple = state.mode !== 'advanced';
    var e = state.event;
    function add(level, text) { out.push({ level: level, text: text }); }
    var withImage = spec.layout === 'frame' || spec.layout === 'band' || spec.layout === 'album';

    if (fit && fit.over) add('error', overflowText(state, spec, fit));
    if (!String(spec.title || '').trim()) add('error', 'Нет названия.');
    if (state.type !== 'digest' && !e.date) add('error', 'Нет даты события.');
    if (state.type === 'digest') {
      var ph = state.digest.items.filter(function (it) { return !it.title.trim() || it.title.trim() === T.PLACEHOLDER_TITLE || it.venue.trim() === 'Площадка'; }).length;
      if (ph) add('error', 'В подборке остались строки-примеры: ' + ph + '. Заполните или удалите их.');
      if (state.digest.items.length < 3) add('info', 'В подборке лучше 3–5 событий.');
      var withImg = state.digest.items.filter(function (it) { return it.image && it.image.ref; }).length;
      if (withImg && !spec.thumbs) add('info', state.digest.items.length > 4 ? 'Превью видны, когда событий не больше четырёх. Сейчас подборка идёт списком.' : 'Превью видны, когда картинка есть у каждого события. Сейчас подборка идёт списком.');
      state.digest.items.forEach(function (it, i) { if (!it.date) add('error', 'У события ' + (i + 1) + ' нет даты.'); });
    }
    if (state.type === 'change' && state.change.kind === 'move') {
      if (!state.change.date) add('error', 'Нет новой даты.');
      else if (e.date && state.change.date <= e.date) add('warn', 'Новая дата не позже старой — проверьте даты.');
    }

    if (withImage && img) {
      if (img.example) add('warn', 'На макете картинка-пример. Загрузите афишу события.');
      else if (img.density && img.density < 0.75) {
        add('warn', 'Картинка мелкая для такого кадра — на экране она будет мягкой. Нужна примерно от ' + img.needW + ' px по ширине, сейчас ' + img.w + ' px.');
      }
      if (!simple && state.adv.exportScale === 2 && img.density && img.density < 1.5 && !img.example) {
        add('info', 'Для выгрузки 2× картинке не хватает разрешения: файл станет больше, но не чётче.');
      }
    }

    var titleLen = String(state.type === 'digest' ? state.digest.title : e.title).length;
    if (titleLen > 32) add('warn', 'Длинное название: ' + titleLen + ' ' + T.plural(titleLen, ['знак', 'знака', 'знаков']) + '. На картинке лучше коротко, подробности — в подводке.');
    if (spec.caps) add('warn', 'Название капсом. По правилу 14.3 названия событий пишутся обычным регистром.');
    var texts = [spec.kind, spec.title, spec.subline, spec.layout === 'album' ? spec.detailsLead : ''].concat((spec.items || []).map(function (i) { return i.title; }));
    if (texts.some(T.hasEmoji)) add('warn', 'Эмодзи на картинке. Им место в тексте поста, не на холсте.');
    if (texts.some(function (t) { return /!/.test(t || ''); })) add('warn', 'Восклицательный знак на картинке делает её крикливой. Уберите его.');
    if (spec.layout === 'album' && String(spec.detailsLead || '').length > 90) {
      add('warn', 'Фраза на слайде деталей длиннее 90 знаков. Оставьте одно предложение, остальное — в тексте поста.');
    }
    if (/москв|петербург|спб\b/i.test(spec.subline || '')) add('warn', 'Город на картинке не нужен: сервис работает в одном городе.');
    var kindWords = String(spec.kind || '').trim().split(/\s+/).filter(Boolean).length;
    if (kindWords > 3) add('warn', 'Надзаголовок длиннее трёх слов. Это ярлык, а не фраза.');
    if (spec.format === 'square') add('warn', 'В сетке Instagram квадрат обрежется по бокам примерно на 135 px — пострадают логотип и края текста. Для Instagram нужен 4:5.');
    if (withImage && spec.slides.some(function (sl) { return sl.kind !== 'details' && sl.fx !== 'none' && sl.fx !== 'footlight'; })) {
      add('warn', 'Яркое свечение спорит с афишей. С картинкой — «Рампа» или без свечения.');
    }
    if ((spec.layout === 'change' || spec.layout === 'digest') && spec.slides[0].fx !== 'none') add('info', 'У служебных постов и подборки свечения нет по стандарту — оно отвлекает от дат.');
    if (state.type !== 'digest' && e.date && e.date < T.todayIso()) add('warn', 'Дата события уже прошла.');
    if (state.type === 'digest' && state.digest.items.some(function (it) { return it.date && it.date < T.todayIso(); })) add('warn', 'В подборке есть прошедшая дата.');
    if (!e.link) add('warn', 'Нет ссылки на билеты — в тексте поста останется [ссылка].');
    var cap = T.captionText(state);
    if (cap.length > 1024) add('warn', 'Текст поста — ' + cap.length + ' ' + T.plural(cap.length, ['знак', 'знака', 'знаков']) + '. Telegram прикрепляет к картинке до 1024, длиннее — уйдёт отдельным сообщением.');
    if (state.type === 'change' && !state.change.note) add('info', 'В посте типовой текст про билеты. Сверьте его с правилами возврата.');
    if (fit && fit.lines > 2) add('warn', 'Название не встаёт в две строки даже уменьшенным. Сократите его — подробности в текст поста.');
    else if (fit && !fit.over && fit.size < fit.start) add('info', 'Название уменьшено до ' + fit.px + ' px, чтобы встать в две строки и в поля.');
    if (!out.some(function (c) { return c.level === 'error' || c.level === 'warn'; })) out.unshift({ level: 'ok', text: 'Всё по стандарту.' });
    return out;
  };
})();
