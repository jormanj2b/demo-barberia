'use strict';
(function () {
  var SERVICES = [
    { id: 'clasico', name: 'Classic cut', price: 35, min: 30, desc: 'Scissors and clippers, wash and style.' },
    { id: 'fade', name: 'Fade', price: 40, min: 40, desc: 'Skin, low or mid fade, with a lineup.' },
    { id: 'barba', name: 'Beard trim', price: 20, min: 20, desc: 'Shape, straight-razor edges and beard oil.' },
    { id: 'combo', name: 'Cut + beard', price: 55, min: 50, desc: 'Our most booked. Full cut and beard.' },
    { id: 'navaja', name: 'Straight razor shave', price: 40, min: 35, desc: 'Hot towel, lather and balm.' },
    { id: 'infantil', name: 'Kids cut', price: 25, min: 25, desc: 'Ages 12 and under.' }
  ];
  var BARBERS = [
    { id: 'any', name: 'Anyone', note: 'First open slot' },
    { id: 'andres', name: 'Andre', img: '../img/barbero-1-400.webp' },
    { id: 'leo', name: 'Leo', img: '../img/barbero-2-400.webp' },
    { id: 'nuria', name: 'Nora', img: '../img/barbero-3-400.webp' }
  ];
  // 0=domingo ... 6=sábado. [apertura, cierre] en minutos
  var HOURS = { 2: [600, 1200], 3: [600, 1200], 4: [600, 1200], 5: [600, 1200], 6: [540, 900] };
  var TZ = 'America/Chicago';

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function $(id) { return document.getElementById(id); }
  // Validación de campos: ayuda a quien escribe y evita datos raros. La protección de verdad es que
  // todo lo que escribe el usuario se muestra con textContent, nunca como HTML.
  var NAME_RE = /^\p{L}(?:[\p{L}\p{M}]|['’ -](?=\p{L}))*$/u;
  function clean(v) { return String(v || '').normalize('NFC').replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function cleanLong(v) { return String(v || '').normalize('NFC').replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim(); }
  function nameMsg(v, min, max, empty) {
    if (!v) return empty;
    if (/[^\p{L}\p{M}\d '’-]/u.test(v)) return 'Use letters, spaces, apostrophes and hyphens only (no symbols like < > / ; =).';
    if (/\d/.test(v)) return 'Names can’t contain numbers.';
    if (!NAME_RE.test(v)) return 'Use letters, spaces, apostrophes and hyphens only.';
    if (v.length < min) return 'Enter at least ' + min + ' letters.';
    if (v.length > max) return max + ' characters max.';
    return '';
  }
  function phoneMsg(v, min, short) {
    if (/(?!^\+)\D/.test(v)) return 'Phone numbers use digits only (and + at the start for a country code).';
    var d = v.replace(/\D/g, '');
    if (d.length < min) return short;
    if (d.length > 15) return 'Too many digits. Check the number.';
    return '';
  }
  function textMsg(v, max) {
    if (/[<>]/.test(v)) return 'Please leave out the < and > characters.';
    if (max && v.length > max) return max + ' characters max.';
    return '';
  }
  function isCharMsg(m) { return /numbers|letters, spaces|digits only|only accepts|characters\./.test(m); }
  // Valida al escribir solo si hay un carácter no permitido (o si el campo ya estaba marcado), y siempre al salir del campo
  function live(input, rule, show) {
    input.addEventListener('input', function () { var m = rule(input.value); if (input.getAttribute('aria-invalid') === 'true' || isCharMsg(m)) show(m); });
    input.addEventListener('blur', function () { if (input.value) show(rule(input.value)); });
  }
  // Filtro al escribir o pegar: quita lo que no corresponde al tipo de campo y lo avisa.
  var FILTERS = {
    name: [/[^\p{L}\p{M} '’-]/gu, 'This field only accepts letters, spaces, apostrophes and hyphens.'],
    digits: [/\D/g, 'This field only accepts numbers.'],
    phone: [/(?!^\+)\D/g, 'Phone numbers only accept digits (and + at the start for a country code).'],
    user: [/[^A-Za-z0-9._-]/g, 'Usernames use plain letters, numbers, dots and hyphens only.'],
    text: [/[<>]/g, 'The < and > characters aren’t allowed.']
  };
  function filter(input, kind, show) {
    input.addEventListener('input', function () {
      var k = typeof kind === 'function' ? kind() : kind, f = FILTERS[k];
      if (!f) return;
      var v = input.value, c = v.replace(f[0], '');
      if (c === v) return;
      var pos = Math.max(0, (input.selectionStart || c.length) - (v.length - c.length));
      input.value = c;
      try { input.setSelectionRange(pos, pos); } catch (e) {}
      if (show) show(f[1]);
    });
  }
  // Campos type=number: bloquea e, E, +, -, punto y coma (el navegador sí los deja escribir)
  function digitsOnlyNumber(input) {
    input.addEventListener('keydown', function (e) { if (['e', 'E', '+', '-', '.', ','].indexOf(e.key) > -1) e.preventDefault(); });
    input.addEventListener('paste', function (e) { var t = (e.clipboardData || window.clipboardData).getData('text'); if (/\D/.test(t)) e.preventDefault(); });
  }
  function eur(v) { return '$' + v.toLocaleString('en-US'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(m) { var h = Math.floor(m / 60), h12 = h % 12 || 12; return h12 + ':' + pad(m % 60) + ' ' + (h < 12 ? 'AM' : 'PM'); }

  // Current date and time in Chicago, whatever the visitor's time zone
  function nowMadrid() {
    var p = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, m: +p.month, d: +p.day, min: (+p.hour) * 60 + (+p.minute) };
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); }
  function busy(dateKey, barberId, start) { return hash(dateKey + barberId + start) % 100 < 32; }

  var state = { service: null, barber: 'any', date: null, slot: null, assigned: null };

  // Lista de precios
  var pl = $('price-list');
  SERVICES.forEach(function (s) {
    pl.appendChild(el('li', null, [
      el('span', { class: 'name', text: s.name }),
      el('span', { class: 'price', text: eur(s.price) }),
      el('span', { class: 'desc', text: s.desc + ' · ' + s.min + ' min' })
    ]));
  });

  // Paso 1 y 2
  var sc = $('service-choices');
  SERVICES.forEach(function (s) {
    var input = el('input', { type: 'radio', name: 'servicio', value: s.id, id: 's-' + s.id });
    sc.appendChild(el('label', { class: 'choice', for: 's-' + s.id }, [input,
      el('span', null, [el('b', { text: s.name }), el('small', { text: eur(s.price) + ' · ' + s.min + ' min' })])]));
    input.addEventListener('change', function () { state.service = s; state.slot = null; renderSlots(); summary(); });
  });
  var bc = $('barber-choices');
  BARBERS.forEach(function (b) {
    var input = el('input', { type: 'radio', name: 'barbero', value: b.id, id: 'b-' + b.id });
    if (b.id === 'any') input.checked = true;
    var inner = [];
    if (b.img) inner.push(el('img', { src: b.img, alt: '', width: '44', height: '44', loading: 'lazy' }));
    inner.push(el('b', { text: b.name }));
    if (b.note) inner.push(el('small', { text: b.note }));
    bc.appendChild(el('label', { class: 'choice', for: 'b-' + b.id }, [input, el('span', null, inner)]));
    input.addEventListener('change', function () { state.barber = b.id; state.slot = null; renderSlots(); summary(); });
  });

  // Paso 3: días
  var now = nowMadrid();
  var days = [];
  for (var i = 0; i < 15; i++) {
    var d = new Date(Date.UTC(now.y, now.m - 1, now.d + i, 12));
    days.push({ date: d, key: d.toISOString().slice(0, 10), dow: d.getUTCDay(), today: i === 0 });
  }
  var fmtW = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
  var fmtM = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
  var fmtLong = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  var dayWrap = $('days');
  days.forEach(function (d) {
    var closed = !HOURS[d.dow];
    var b = el('button', { type: 'button', class: 'day', role: 'radio', 'aria-checked': 'false', 'aria-label': fmtLong.format(d.date) + (closed ? ', closed' : '') }, [
      el('span', { text: d.today ? 'today' : fmtW.format(d.date).replace('.', '') }),
      el('b', { text: String(d.date.getUTCDate()) }),
      el('span', { text: fmtM.format(d.date).replace('.', '') })
    ]);
    if (closed) b.disabled = true;
    b.addEventListener('click', function () {
      state.date = d; state.slot = null;
      Array.prototype.forEach.call(dayWrap.children, function (c) { c.setAttribute('aria-checked', 'false'); });
      b.setAttribute('aria-checked', 'true');
      renderSlots(); summary();
    });
    dayWrap.appendChild(b);
  });

  function freeBarbers(d, start, dur) {
    var ids = state.barber === 'any' ? ['andres', 'leo', 'nuria'] : [state.barber];
    return ids.filter(function (id) {
      for (var t = start; t < start + dur; t += 10) { if (busy(d.key, id, t - (t % 30))) return false; }
      return true;
    });
  }

  var slotsWrap = $('slots'), hint = $('slots-hint');
  function renderSlots() {
    slotsWrap.textContent = '';
    if (!state.date) { hint.textContent = 'Pick a day to see open times.'; return; }
    if (!state.service) { hint.textContent = 'Pick a service first: open times depend on how long it takes.'; return; }
    var h = HOURS[state.date.dow], dur = state.service.min, count = 0;
    for (var t = h[0]; t + dur <= h[1]; t += 30) {
      var past = state.date.today && t < now.min + 45;
      var free = past ? [] : freeBarbers(state.date, t, dur);
      var b = el('button', { type: 'button', class: 'slot', role: 'radio', 'aria-checked': 'false', text: hhmm(t) });
      if (!free.length) { b.disabled = true; b.setAttribute('aria-label', hhmm(t) + ', booked'); }
      else count++;
      (function (t, free, b) {
        b.addEventListener('click', function () {
          state.slot = t; state.assigned = free[0];
          Array.prototype.forEach.call(slotsWrap.children, function (c) { c.setAttribute('aria-checked', 'false'); });
          b.setAttribute('aria-checked', 'true'); summary();
        });
      })(t, free, b);
      slotsWrap.appendChild(b);
    }
    hint.textContent = count ? count + (count === 1 ? ' open time on ' : ' open times on ') + fmtLong.format(state.date.date) + '.' : 'That day is fully booked. Try another one.';
  }

  function barberName(id) { var b = BARBERS.filter(function (x) { return x.id === id; })[0]; return b ? b.name : ''; }
  function whenText() { return state.date && state.slot !== null ? fmtLong.format(state.date.date) + ', ' + hhmm(state.slot) : '—'; }
  function summary() {
    var q = function (k) { return document.querySelector('#summary [data-k="' + k + '"]'); };
    q('servicio').textContent = state.service ? state.service.name + ' (' + state.service.min + ' min)' : '—';
    q('barbero').textContent = state.barber === 'any' ? (state.slot !== null ? barberName(state.assigned) + ' (assigned)' : 'Anyone') : barberName(state.barber);
    q('cuando').textContent = whenText();
    q('total').textContent = state.service ? eur(state.service.price) : '—';
  }

  function showErr(id, msg) { var e = $('err-' + id); if (e) { e.textContent = msg || ''; e.hidden = !msg; } var i = $(id); if (i) i.setAttribute('aria-invalid', msg ? 'true' : 'false'); }
  var fieldRules = {
    nombre: function (v) { return nameMsg(clean(v), 2, 60, 'Enter your name for the booking.'); },
    telefono: function (v) { return phoneMsg(clean(v), 10, 'Check your number: it needs at least 10 digits.'); }
  };
  // Aviso al momento si se cuela un número en el nombre o una letra en el teléfono
  Object.keys(fieldRules).forEach(function (k) { live($(k), fieldRules[k], function (m) { showErr(k, m); }); });
  filter($('nombre'), 'name', function (m) { showErr('nombre', m); });
  filter($('telefono'), 'phone', function (m) { showErr('telefono', m); });

  var form = $('booking'), gen = $('err-general');
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var nombre = clean($('nombre').value), telRaw = clean($('telefono').value);
    $('nombre').value = nombre; $('telefono').value = telRaw;
    var mN = fieldRules.nombre(nombre), mT = fieldRules.telefono(telRaw), okN = !mN, okT = !mT;
    var tel = telRaw.replace(/[^\d+]/g, '');
    showErr('nombre', mN); showErr('telefono', mT);
    var missing = [];
    if (!state.service) missing.push('a service');
    if (!state.date || state.slot === null) missing.push('a day and time');
    gen.hidden = !missing.length;
    if (missing.length) { gen.textContent = 'Please choose ' + missing.join(', plus ') + '.'; }
    if (missing.length || !okN || !okT) {
      if (!missing.length) $(okN ? 'telefono' : 'nombre').focus();
      return;
    }
    confirmBooking(nombre, tel);
  });

  function icsDate(d, m) { return d.key.replace(/-/g, '') + 'T' + pad(Math.floor(m / 60)) + pad(m % 60) + '00'; }
  function confirmBooking(nombre, tel) {
    var s = state.service, d = state.date, who = barberName(state.barber === 'any' ? state.assigned : state.barber);
    var code = 'NB-' + (hash(nombre + tel + d.key + state.slot) % 9000 + 1000);
    $('confirm-title').textContent = 'See you ' + fmtLong.format(d.date) + ' at ' + hhmm(state.slot) + ', ' + nombre;
    $('confirm-text').textContent = s.name + ' with ' + who + ' · ' + eur(s.price) + ' · confirmation ' + code + '. Please arrive 5 minutes early.';
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Northside Barber Co//Booking demo//EN', 'BEGIN:VEVENT',
      'UID:' + code + '@northside-barber.demo', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      'DTSTART;TZID=America/Chicago:' + icsDate(d, state.slot), 'DTEND;TZID=America/Chicago:' + icsDate(d, state.slot + s.min),
      'SUMMARY:' + s.name + ' at Northside Barber Co.', 'DESCRIPTION:With ' + who + '. Confirmation ' + code + '.',
      'LOCATION:Northside Barber Co.\\, Chicago\\, IL', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var icsLink = $('ics');
    if (icsLink.dataset.url) URL.revokeObjectURL(icsLink.dataset.url);
    var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    icsLink.href = url; icsLink.dataset.url = url;
    var msg = 'Hi, this is ' + nombre + '. I booked a ' + s.name.toLowerCase() + ' with ' + who + ' on ' + fmtLong.format(d.date) + ' at ' + hhmm(state.slot) + ' (confirmation ' + code + ').';
    $('wa').href = 'https://wa.me/?text=' + encodeURIComponent(msg);
    form.hidden = true;
    var c = $('confirm'); c.hidden = false; c.focus();
  }
  $('nueva').addEventListener('click', function () {
    $('confirm').hidden = true; form.hidden = false; state.slot = null; renderSlots(); summary();
    document.getElementById('reservar').scrollIntoView();
  });
  summary();
})();
