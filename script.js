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
  btnReservar.textContent = 'Solicitar reserva';
  btnReservar.disabled = false;
  confirmacion.classList.add('oculto');
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

const hoy = new Date().toISOString().split('T')[0];
document.getElementById('dia').min = hoy;

function getCierres() {
  return JSON.parse(localStorage.getItem('baibai_cierres') || '[]');
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

  getTurnos().sort().forEach(t => {
    const lleno = fecha && (personasPorTurno[t] || 0) >= 90;
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = lleno ? `${t} h — COMPLETO` : `${t} h`;
    opt.disabled = lleno;
    select.appendChild(opt);
  });
}

cargarTurnos('');

// Subtítulo dinámico con los turnos reales
const turnosLabel = getTurnos().sort().join(' · ');
document.getElementById('subtitulo-turnos').textContent = `Servicio de cena · Turnos a las ${turnosLabel}`;

// Mostrar/ocultar campo email según opción de confirmación
document.querySelectorAll('input[name="confirmacion_via"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const campoEmail = document.getElementById('campo-email');
    campoEmail.style.display = radio.value === 'email' ? 'block' : 'none';
    if (radio.value !== 'email') document.getElementById('email').value = '';
  });
});

document.getElementById('dia').addEventListener('change', async (e) => {
  document.querySelector('.hint-fecha').style.display = 'none';
  const cerrados = getCierres();
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
    while (turnoSelect.options.length > 1) turnoSelect.remove(1);
    turnoSelect.disabled = true;
    btnReservar.disabled = true;
  } else if (cerrados.includes(fecha)) {
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

  if (!nombre)                                              { marcarError('nombre',   'Introduce tu nombre.');          ok = false; }
  if (!telefono || !/^[0-9\s\+\-]{9,15}$/.test(telefono)) { marcarError('telefono', 'Introduce un teléfono válido.'); ok = false; }
  if (!personas || personas < 1 || personas > 90)          { marcarError('personas', 'Entre 1 y 90 personas.');        ok = false; }
  if (!dia)                                                 { marcarError('dia',      'Selecciona una fecha.');          ok = false; }
  if (!turno)                                               { marcarError('turno',    'Selecciona un turno.');           ok = false; }
  if (viaConf === 'email' && !email)                        { marcarError('email',    'Introduce tu email.');            ok = false; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))  { marcarError('email',    'Email no válido.');               ok = false; }

  return ok;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validar()) return;

  const nombre   = document.getElementById('nombre').value.trim();
  const prefijo  = document.getElementById('prefijo').value;
  const telefono = document.getElementById('telefono').value.trim();
  const personas = document.getElementById('personas').value;
  const dia      = document.getElementById('dia').value;
  const turno    = document.getElementById('turno').value;
  const viaConf  = document.querySelector('input[name="confirmacion_via"]:checked').value;
  const email    = document.getElementById('email').value.trim();

  const fecha    = new Date(dia + 'T00:00:00');
  const fechaStr = fecha.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const telefonoWa = prefijo + telefono.replace(/\D/g, '');

  btnReservar.textContent = 'Enviando…';
  btnReservar.disabled = true;

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    nombre, telefono: `+${telefonoWa}`, personas, dia: fechaStr, turno,
    email_cliente:  email || '—',
    telefono_wa:    telefonoWa,
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
        origen:     'web',
        confirmada: false
      })
    }).catch(err => console.error('Supabase:', err));


    resumen.textContent = `${nombre} · ${personas} persona${personas > 1 ? 's' : ''} · ${fechaStr} a las ${turno} h`;
    form.classList.add('oculto');
    confirmacion.classList.remove('oculto');
    confirmacion.scrollIntoView({ behavior: 'smooth', block: 'center' });
  })
  .catch((err) => {
    btnReservar.textContent = 'Solicitar reserva';
    btnReservar.disabled = false;
    alert('Error: ' + JSON.stringify(err));
  });
});
