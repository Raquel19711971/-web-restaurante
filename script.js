// ── TRADUCCIONES ─────────────────────────────────────────────────────────
const TRANSLATIONS = {
  es: {
    'pretitle':           'Bienvenidos a',
    'reserva-titulo':     'Reserva tu mesa',
    'aviso-tarde-h3':     'Reservas por teléfono',
    'aviso-tarde-p':      'Para reservas de hoy a partir de las 19:00 h, llámanos directamente al <a href="tel:+34971191592" style="color:inherit;white-space:nowrap;">+34 971 191 592</a>.',
    'aviso-cierre-h3':    '',
    'aviso-cierre-p':     '',
    'label-nombre':       'Nombre completo',
    'placeholder-nombre': 'Tu nombre',
    'label-telefono':     'Teléfono',
    'label-confirmacion': '¿Cómo quieres recibir la confirmación?',
    'label-email':        'Email',
    'placeholder-email':  'tu@email.com',
    'label-personas':     'Número de personas',
    'label-fecha':        'Fecha',
    'hint-fecha':         '📅 Toca para elegir el día',
    'label-turno':        'Turno',
    'turno-default':      'Selecciona un turno',
    'label-concierge':    '🎩 Soy concierge / agencia',
    'label-nombre-concierge': 'Nombre / Hotel',
    'placeholder-concierge':  'Ej: Hotel Ibiza Gran Hotel',
    'btn-reservar':       'Solicitar reserva',
    'confirmacion-h3':    '¡Reserva recibida!',
    'confirmacion-nota':  'Nos pondremos en contacto contigo para confirmarla.',
    'btn-nueva':          'Nueva reserva',
    'ubicacion-h2':       'Dónde estamos',
    'footer-copy':        '© 2025 BAI BAI  ·  Todos los derechos reservados',
    'footer-admin':       'Área de gestión',
    'err-nombre':         'Introduce tu nombre.',
    'err-telefono':       'Introduce un teléfono válido.',
    'err-personas':       'Entre 1 y 90 personas.',
    'err-dia':            'Selecciona una fecha.',
    'err-turno':          'Selecciona un turno.',
    'err-email-req':      'Introduce tu email.',
    'err-email-inv':      'Email no válido.',
    'enviando':           'Enviando…',
    'completo':           'COMPLETO',
    'subtitulo-prefix':   'Servicio de cena · Turnos a las',
    'persona':            'persona',
    'personas':           'personas',
    'a-las':              'a las',
    'btn-lang-flag':      '🇬🇧',
    'btn-lang-title':     'Switch to English',
  },
  en: {
    'pretitle':           'Welcome to',
    'reserva-titulo':     'Book your table',
    'aviso-tarde-h3':     'Phone reservations',
    'aviso-tarde-p':      'For reservations from 19:00 today, please call us directly at <a href="tel:+34971191592" style="color:inherit;white-space:nowrap;">+34 971 191 592</a>.',
    'aviso-cierre-h3':    '',
    'aviso-cierre-p':     '',
    'label-nombre':       'Full name',
    'placeholder-nombre': 'Your name',
    'label-telefono':     'Phone',
    'label-confirmacion': 'How would you like to receive confirmation?',
    'label-email':        'Email',
    'placeholder-email':  'your@email.com',
    'label-personas':     'Number of guests',
    'label-fecha':        'Date',
    'hint-fecha':         '📅 Tap to select date',
    'label-turno':        'Seating time',
    'turno-default':      'Select a seating time',
    'label-concierge':    '🎩 I\'m a concierge / agency',
    'label-nombre-concierge': 'Name / Hotel',
    'placeholder-concierge':  'E.g.: Ibiza Gran Hotel',
    'btn-reservar':       'Request reservation',
    'confirmacion-h3':    'Reservation received!',
    'confirmacion-nota':  'We will contact you to confirm it.',
    'btn-nueva':          'New reservation',
    'ubicacion-h2':       'Location',
    'footer-copy':        '© 2025 BAI BAI  ·  All rights reserved',
    'footer-admin':       'Admin area',
    'err-nombre':         'Please enter your name.',
    'err-telefono':       'Please enter a valid phone number.',
    'err-personas':       'Between 1 and 90 guests.',
    'err-dia':            'Please select a date.',
    'err-turno':          'Please select a seating time.',
    'err-email-req':      'Please enter your email.',
    'err-email-inv':      'Invalid email.',
    'enviando':           'Sending…',
    'completo':           'FULLY BOOKED',
    'subtitulo-prefix':   'Dinner service · Seatings at',
    'persona':            'guest',
    'personas':           'guests',
    'a-las':              'at',
    'btn-lang-flag':      '🇪🇸',
    'btn-lang-title':     'Cambiar a español',
  }
};

let langActual = localStorage.getItem('baibai_lang') || 'es';

function t(key) {
  return TRANSLATIONS[langActual][key] || TRANSLATIONS['es'][key] || key;
}

function aplicarIdioma(lang) {
  langActual = lang;
  localStorage.setItem('baibai_lang', lang);
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (key === 'aviso-tarde-p' || key === 'aviso-cierre-p') {
      el.innerHTML = t(key);
    } else {
      el.textContent = t(key);
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  const btnLang = document.getElementById('btn-lang');
  if (btnLang) {
    btnLang.textContent = t('btn-lang-flag');
    btnLang.title = t('btn-lang-title');
  }

  const turnoSelect = document.getElementById('turno');
  if (turnoSelect && turnoSelect.options[0]) {
    turnoSelect.options[0].textContent = t('turno-default');
  }

  const turnosLabel = getTurnos().sort().join(' · ');
  document.getElementById('subtitulo-turnos').textContent = `${t('subtitulo-prefix')} ${turnosLabel}`;

  const btnReservarEl = document.querySelector('button[type="submit"].btn-reservar');
  if (btnReservarEl && !btnReservarEl.disabled) {
    btnReservarEl.textContent = t('btn-reservar');
  }
}
// ─────────────────────────────────────────────────────────────────────────

// ── SUPABASE ──────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://sudpdbfywhsidrerjcxz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rcNQwye5RVPNw66mGr53QA_nx9m6AWn';
// ─────────────────────────────────────────────────────────────────────────

// ─── EMAILJS — CONFIGURACIÓN ───────────────────────────────────────────────────
const EMAILJS_PUBLIC_KEY  = '93AVZmo6iBz2c1fmD';
const EMAILJS_SERVICE_ID  = 'service_h3pvqic';
const EMAILJS_TEMPLATE_ID = 'template_d8y1vbb';

emailjs.init(EMAILJS_PUBLIC_KEY);
// ────────────────────────────────────────────────────────────────────────────

const form         = document.getElementById('formulario');
const confirmacion = document.getElementById('confirmacion');
const resumen      = document.getElementById('resumen');
const btnReservar  = form.querySelector('.btn-reservar');

document.getElementById('btn-nueva-reserva').addEventListener('click', () => {
  form.reset();
  document.getElementById('campo-email').style.display = 'none';
  document.querySelectorAll('.error').forEach(e => e.textContent = '');
  document.querySelectorAll('.invalido').forEach(e => e.classList.remove('invalido'));
  cargarTurnos('');
  document.getElementById('aviso-tarde').classList.add('oculto');
  document.getElementById('aviso-cierre').classList.add('oculto');
  form.classList.remove('oculto');
  btnReservar.textContent = t('btn-reservar');
  btnReservar.disabled = false;
  confirmacion.classList.add('oculto');
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

const _hoyDate = new Date();
const hoy = `${_hoyDate.getFullYear()}-${String(_hoyDate.getMonth()+1).padStart(2,'0')}-${String(_hoyDate.getDate()).padStart(2,'0')}`;
document.getElementById('dia').min = hoy;
document.getElementById('dia').max = '';

async function getCierres() {
  try {
    const rows = await fetch(
      `${SUPABASE_URL}/rest/v1/cierres?select=fecha`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    ).then(r => r.json());
    return (rows || []).map(r => r.fecha);
  } catch (_) { return []; }
}

function getTurnos() {
  const guardados = localStorage.getItem('baibai_turnos');
  return guardados ? JSON.parse(guardados) : ['19:30', '21:00', '22:30'];
}

async function cargarTurnos(fecha) {
  const select = document.getElementById('turno');
  while (select.options.length > 1) select.remove(1);

  let personasPorTurno = {};
  if (fecha) {
    try {
      const rows = await fetch(
        `${SUPABASE_URL}/rest/v1/reservas?select=hora,personas&fecha=eq.${fecha}`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      ).then(r => r.json());
      rows.forEach(r => {
        const h = r.hora || '';
        if (!personasPorTurno[h]) personasPorTurno[h] = 0;
        personasPorTurno[h] += parseInt(r.personas || 0);
      });
    } catch (_) {}
  }

  getTurnos().sort().forEach(hora => {
    const lleno = fecha && (personasPorTurno[hora] || 0) >= 90;
    const opt = document.createElement('option');
    opt.value = hora;
    opt.textContent = lleno ? `${hora} h — ${t('completo')}` : `${hora} h`;
    opt.disabled = lleno;
    select.appendChild(opt);
  });
}

cargarTurnos('');

aplicarIdioma(langActual);

document.getElementById('btn-lang').addEventListener('click', () => {
  aplicarIdioma(langActual === 'es' ? 'en' : 'es');
});

// Mostrar/ocultar campo email según opción de confirmación
document.querySelectorAll('input[name="confirmacion_via"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const campoEmail = document.getElementById('campo-email');
    campoEmail.style.display = radio.value === 'email' ? 'block' : 'none';
    if (radio.value !== 'email') document.getElementById('email').value = '';
  });
});

document.getElementById('es-concierge').addEventListener('change', (e) => {
  document.getElementById('campo-nombre-concierge').style.display = e.target.checked ? 'block' : 'none';
  if (!e.target.checked) document.getElementById('nombre-concierge').value = '';
});

document.getElementById('dia').addEventListener('change', async (e) => {
  document.querySelector('.hint-fecha').style.display = 'none';
  const cerrados = await getCierres();
  const avisoEl = document.getElementById('aviso-cierre');
  const formEl  = document.getElementById('formulario');
  const fecha     = e.target.value;
  const avisoTarde = document.getElementById('aviso-tarde');
  const ahora     = new Date();
  const esHoy     = fecha === hoy;
  const despuesDe19 = ahora.getHours() >= 19;

  await cargarTurnos(fecha);

  avisoTarde.classList.add('oculto');
  avisoEl.classList.add('oculto');
  formEl.classList.remove('oculto');

  const turnoSelect = document.getElementById('turno');
  const btnReservar = document.querySelector('button[type="submit"]');
  turnoSelect.disabled = false;
  btnReservar.disabled = false;

  if (esHoy && despuesDe19) {
    avisoTarde.classList.remove('oculto');
    avisoTarde.scrollIntoView({ behavior: 'smooth', block: 'center' });
    while (turnoSelect.options.length > 1) turnoSelect.remove(1);
    turnoSelect.disabled = true;
    btnReservar.disabled = true;
  } else if (cerrados.includes(fecha)) {
    const fObj   = new Date(fecha + 'T00:00:00');
    const fES    = fObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const fEN    = fObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const tel    = '<a href="tel:+34690704321" style="color:inherit;white-space:nowrap;">+34 690 704 321</a>';
    document.querySelector('[data-i18n="aviso-cierre-h3"]').textContent = `Para reservas del ${fES}`;
    document.querySelector('[data-i18n="aviso-cierre-p"]').innerHTML =
      `Para reservas de este día, póngase en contacto con el restaurante directamente por teléfono ${tel}.<br><br>` +
      `For reservations on this day, please contact the restaurant directly by phone ${tel}.`;
    avisoEl.classList.remove('oculto');
    formEl.classList.add('oculto');
  }
});

function marcarError(id, msg) {
  document.getElementById(id).classList.add('invalido');
  document.getElementById('err-' + id).textContent = msg;
}

function limpiarError(id) {
  document.getElementById(id).classList.remove('invalido');
  document.getElementById('err-' + id).textContent = '';
}

function validar() {
  const campos = ['nombre', 'telefono', 'personas', 'dia', 'turno', 'email'];
  campos.forEach(limpiarError);

  const nombre   = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const personas = parseInt(document.getElementById('personas').value);
  const dia      = document.getElementById('dia').value;
  const turno    = document.getElementById('turno').value;
  const viaConf  = document.querySelector('input[name="confirmacion_via"]:checked').value;
  const email    = document.getElementById('email').value.trim();
  let ok = true;

  if (!nombre)                                              { marcarError('nombre',   t('err-nombre'));    ok = false; }
  if (!telefono || !/^[0-9\s\+\-]{9,15}$/.test(telefono)) { marcarError('telefono', t('err-telefono')); ok = false; }
  if (!personas || personas < 1 || personas > 90)          { marcarError('personas', t('err-personas')); ok = false; }
  if (!dia)                                                 { marcarError('dia',      t('err-dia'));       ok = false; }
  else if (dia < hoy)                                       { marcarError('dia',      t('err-dia'));       ok = false; }
  if (!turno)                                               { marcarError('turno',    t('err-turno'));     ok = false; }
  if (viaConf === 'email' && !email)                        { marcarError('email',    t('err-email-req')); ok = false; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))  { marcarError('email',    t('err-email-inv')); ok = false; }

  return ok;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validar()) return;

  const nombre       = document.getElementById('nombre').value.trim();
  const prefijo      = document.getElementById('prefijo').value;
  const telefono     = document.getElementById('telefono').value.trim();
  const personas     = document.getElementById('personas').value;
  const dia          = document.getElementById('dia').value;
  const turno        = document.getElementById('turno').value;
  const viaConf      = document.querySelector('input[name="confirmacion_via"]:checked').value;
  const email        = document.getElementById('email').value.trim();
  const esConcierge  = document.getElementById('es-concierge').checked;
  const nomConcierge = document.getElementById('nombre-concierge').value.trim();
  const origen       = esConcierge && nomConcierge ? `concierge: ${nomConcierge}` : 'web';

  const fecha    = new Date(dia + 'T00:00:00');
  const locale   = langActual === 'en' ? 'en-GB' : 'es-ES';
  const fechaStr = fecha.toLocaleDateString(locale, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const telefonoWa = prefijo + telefono.replace(/\D/g, '');

  btnReservar.textContent = t('enviando');
  btnReservar.disabled = true;

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    nombre, telefono: `+${telefonoWa}`, personas, dia: fechaStr, turno,
    email_cliente:  email || '—',
    telefono_wa:    telefonoWa,
    concierge:      esConcierge && nomConcierge ? nomConcierge : '—',
    confirm_url:    email ? `confirmar.html?n=${encodeURIComponent(nombre)}&e=${encodeURIComponent(email)}&p=${encodeURIComponent(personas)}&d=${encodeURIComponent(fechaStr)}&t=${encodeURIComponent(turno)}` : '',
  })
  .then(() => {
    // Guardar reserva en Supabase
    fetch(`${SUPABASE_URL}/rest/v1/reservas`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        nombre,
        telefono:   `+${telefonoWa}`,
        email:      email || null,
        personas:   parseInt(personas),
        fecha:      dia,
        hora:       turno,
        origen,
        comentarios: esConcierge && nomConcierge ? `Concierge: ${nomConcierge}` : null,
        idioma:     langActual,
        confirmada: false
      })
    }).catch(err => console.error('Supabase:', err));


    const pLabel = parseInt(personas) > 1 ? t('personas') : t('persona');
    resumen.textContent = `${nombre} · ${personas} ${pLabel} · ${fechaStr} ${t('a-las')} ${turno} h`;
    form.classList.add('oculto');
    confirmacion.classList.remove('oculto');
    confirmacion.scrollIntoView({ behavior: 'smooth', block: 'center' });
  })
  .catch((err) => {
    btnReservar.textContent = t('btn-reservar');
    btnReservar.disabled = false;
    alert('Error: ' + JSON.stringify(err));
  });
});
