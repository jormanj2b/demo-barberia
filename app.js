'use strict';
(function () {
  var SERVICES = [
    { id: 'clasico', name: 'Corte clásico', price: 18, min: 30, desc: 'Tijera y máquina, lavado y peinado.' },
    { id: 'fade', name: 'Degradado (fade)', price: 20, min: 40, desc: 'Skin, low o mid fade, con perfilado.' },
    { id: 'barba', name: 'Arreglo de barba', price: 12, min: 20, desc: 'Forma, perfilado a navaja y aceite.' },
    { id: 'combo', name: 'Corte y barba', price: 28, min: 50, desc: 'El más pedido. Corte completo y barba.' },
    { id: 'navaja', name: 'Afeitado a navaja', price: 22, min: 35, desc: 'Toalla caliente, espuma y bálsamo.' },
    { id: 'infantil', name: 'Corte infantil', price: 14, min: 25, desc: 'Hasta 12 años.' }
  ];
  var BARBERS = [
    { id: 'any', name: 'Cualquiera', note: 'Primera hora libre' },
    { id: 'andres', name: 'Andrés', img: 'img/barbero-1-400.webp' },
    { id: 'leo', name: 'Leo', img: 'img/barbero-2-400.webp' },
    { id: 'nuria', name: 'Nuria', img: 'img/barbero-3-400.webp' }
  ];
  // 0=domingo ... 6=sábado. [apertura, cierre] en minutos
  var HOURS = { 2: [600, 1200], 3: [600, 1200], 4: [600, 1200], 5: [600, 1200], 6: [540, 900] };
  var TZ = 'Europe/Madrid';

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
    if (/[^\p{L}\p{M}\d '’-]/u.test(v)) return 'Usa solo letras, espacios, apóstrofes y guiones (sin símbolos como < > / ; =).';
    if (/\d/.test(v)) return 'El nombre no puede llevar números.';
    if (!NAME_RE.test(v)) return 'Usa solo letras, espacios, apóstrofes y guiones.';
    if (v.length < min) return 'Escribe al menos ' + min + ' letras.';
    if (v.length > max) return 'Máximo ' + max + ' caracteres.';
    return '';
  }
  function phoneMsg(v, min, short) {
    if (/(?!^\+)\D/.test(v)) return 'El teléfono solo lleva números (y + al inicio para el código de país).';
    var d = v.replace(/\D/g, '');
    if (d.length < min) return short;
    if (d.length > 15) return 'Sobran dígitos: revisa el número.';
    return '';
  }
  function textMsg(v, max) {
    if (/[<>]/.test(v)) return 'Sin los signos < y >, por favor.';
    if (max && v.length > max) return 'Máximo ' + max + ' caracteres.';
    return '';
  }
  function isCharMsg(m) { return /números|Usa solo|solo lleva|solo acepta|signos/.test(m); }
  // Valida al escribir solo si hay un carácter no permitido (o si el campo ya estaba marcado), y siempre al salir del campo
  function live(input, rule, show) {
    input.addEventListener('input', function () { var m = rule(input.value); if (input.getAttribute('aria-invalid') === 'true' || isCharMsg(m)) show(m); });
    input.addEventListener('blur', function () { if (input.value) show(rule(input.value)); });
  }
  // Filtro al escribir o pegar: quita lo que no corresponde al tipo de campo y lo avisa.
  var FILTERS = {
    name: [/[^\p{L}\p{M} '’-]/gu, 'Este campo solo acepta letras, espacios, apóstrofes y guiones.'],
    digits: [/\D/g, 'Este campo solo acepta números.'],
    phone: [/(?!^\+)\D/g, 'El teléfono solo acepta números (y + al inicio para el código de país).'],
    user: [/[^A-Za-z0-9._-]/g, 'El usuario solo lleva letras sin acentos, números, puntos y guiones.'],
    text: [/[<>]/g, 'Los signos < y > no están permitidos.']
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
  function eur(v) { return v.toLocaleString('es-ES') + ' €'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }

  // Fecha y hora actuales en Valencia, sin depender del huso del visitante
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
  var fmtW = new Intl.DateTimeFormat('es-ES', { weekday: 'short', timeZone: 'UTC' });
  var fmtM = new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: 'UTC' });
  var fmtLong = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  var dayWrap = $('days');
  days.forEach(function (d) {
    var closed = !HOURS[d.dow];
    var b = el('button', { type: 'button', class: 'day', role: 'radio', 'aria-checked': 'false', 'aria-label': fmtLong.format(d.date) + (closed ? ', cerrado' : '') }, [
      el('span', { text: d.today ? 'hoy' : fmtW.format(d.date).replace('.', '') }),
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
    if (!state.date) { hint.textContent = 'Elige un día para ver las horas libres.'; return; }
    if (!state.service) { hint.textContent = 'Elige primero un servicio: las horas dependen de cuánto dura.'; return; }
    var h = HOURS[state.date.dow], dur = state.service.min, count = 0;
    for (var t = h[0]; t + dur <= h[1]; t += 30) {
      var past = state.date.today && t < now.min + 45;
      var free = past ? [] : freeBarbers(state.date, t, dur);
      var b = el('button', { type: 'button', class: 'slot', role: 'radio', 'aria-checked': 'false', text: hhmm(t) });
      if (!free.length) { b.disabled = true; b.setAttribute('aria-label', hhmm(t) + ', ocupado'); }
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
    hint.textContent = count ? count + ' horas libres el ' + fmtLong.format(state.date.date) + '.' : 'No quedan horas ese día. Prueba con otro.';
  }

  function barberName(id) { var b = BARBERS.filter(function (x) { return x.id === id; })[0]; return b ? b.name : ''; }
  function whenText() { return state.date && state.slot !== null ? fmtLong.format(state.date.date) + ', ' + hhmm(state.slot) : '—'; }
  function summary() {
    var q = function (k) { return document.querySelector('#summary [data-k="' + k + '"]'); };
    q('servicio').textContent = state.service ? state.service.name + ' (' + state.service.min + ' min)' : '—';
    q('barbero').textContent = state.barber === 'any' ? (state.slot !== null ? barberName(state.assigned) + ' (asignado)' : 'Cualquiera') : barberName(state.barber);
    q('cuando').textContent = whenText();
    q('total').textContent = state.service ? eur(state.service.price) : '—';
  }

  function showErr(id, msg) { var e = $('err-' + id); if (e) { e.textContent = msg || ''; e.hidden = !msg; } var i = $(id); if (i) i.setAttribute('aria-invalid', msg ? 'true' : 'false'); }
  var fieldRules = {
    nombre: function (v) { return nameMsg(clean(v), 2, 60, 'Escribe tu nombre para la reserva.'); },
    telefono: function (v) { return phoneMsg(clean(v), 9, 'Revisa el teléfono: necesita al menos 9 dígitos.'); }
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
    if (!state.service) missing.push('el servicio');
    if (!state.date || state.slot === null) missing.push('el día y la hora');
    gen.hidden = !missing.length;
    if (missing.length) { gen.textContent = 'Falta elegir ' + missing.join(' y ') + '.'; }
    if (missing.length || !okN || !okT) {
      if (!missing.length) $(okN ? 'telefono' : 'nombre').focus();
      return;
    }
    confirmBooking(nombre, tel);
  });

  function icsDate(d, m) { return d.key.replace(/-/g, '') + 'T' + pad(Math.floor(m / 60)) + pad(m % 60) + '00'; }
  function confirmBooking(nombre, tel) {
    var s = state.service, d = state.date, who = barberName(state.barber === 'any' ? state.assigned : state.barber);
    var code = 'CN-' + (hash(nombre + tel + d.key + state.slot) % 9000 + 1000);
    $('confirm-title').textContent = nombre + ', te esperamos el ' + fmtLong.format(d.date) + ' a las ' + hhmm(state.slot);
    $('confirm-text').textContent = s.name + ' con ' + who + ' · ' + eur(s.price) + ' · código ' + code + '. Llega 5 minutos antes.';
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Corte Norte//Reservas demo//ES', 'BEGIN:VEVENT',
      'UID:' + code + '@corte-norte.demo', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      'DTSTART;TZID=Europe/Madrid:' + icsDate(d, state.slot), 'DTEND;TZID=Europe/Madrid:' + icsDate(d, state.slot + s.min),
      'SUMMARY:' + s.name + ' en Corte Norte', 'DESCRIPTION:Con ' + who + '. Código ' + code + '.',
      'LOCATION:Barbería Corte Norte, Valencia', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var icsLink = $('ics');
    if (icsLink.dataset.url) URL.revokeObjectURL(icsLink.dataset.url);
    var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    icsLink.href = url; icsLink.dataset.url = url;
    var msg = 'Hola, soy ' + nombre + '. Reservé ' + s.name + ' con ' + who + ' el ' + fmtLong.format(d.date) + ' a las ' + hhmm(state.slot) + ' (código ' + code + ').';
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
