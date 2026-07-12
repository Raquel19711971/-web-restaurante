// ── SUPABASE ─────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://sudpdbfywhsidrerjcxz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rcNQwye5RVPNw66mGr53QA_nx9m6AWn';

async function sbFetch(path, options = {}) {
  const { headers: extraHeaders, ...rest } = options;
  const { data: { session } } = await supabaseAuth.auth.getSession();
  const token = session?.access_token || SUPABASE_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
      ...extraHeaders
    },
    ...rest
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function fromSupabase(row) {
  const fechaStr = row.fecha
    ? new Date(row.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
    : '';
  return {
    id:            row.id,
    nombre:        row.nombre       || '',
    telefono:      row.telefono     || '',
    email:         row.email        || '',
    personas:      row.personas     || 0,
    diaRaw:        row.fecha        || '',
    dia:           fechaStr,
    turno:         row.hora         || '',
    mesa:          row.mesa         || '',
    notas:         row.comentarios  || '',
    origen:        row.origen       || 'web',
    confirmada:    row.confirmada   || false,
    idioma:        row.idioma       || 'es',
    fechaRegistro: row.created_at
      ? new Date(row.created_at).toLocaleString('es-ES')
      : ''
  };
}

async function getReservas() {
  const rows = await sbFetch('reservas?select=*&order=created_at.asc');
  return (rows || []).map(fromSupabase);
}

async function insertReserva(reserva) {
  await sbFetch('reservas', {
    method: 'POST',
    body: JSON.stringify({
      nombre:      reserva.nombre,
      telefono:    reserva.telefono    || null,
      email:       reserva.email       || null,
      personas:    parseInt(reserva.personas) || 0,
      fecha:       reserva.diaRaw,
      hora:        reserva.turno,
      mesa:        reserva.mesa        || null,
      comentarios: reserva.notas       || null,
      origen:      reserva.origen      || 'web',
      confirmada:  reserva.confirmada  || false
    })
  });
}

async function actualizarCampo(id, campo, valor) {
  const colMap = { notas: 'comentarios', turno: 'hora', diaRaw: 'fecha' };
  const col = colMap[campo] || campo;
  await sbFetch(`reservas?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ [col]: valor })
  });
}

async function cancelarReserva(id) {
  await sbFetch(`reservas?id=eq.${id}`, {
    method: 'DELETE',
    headers: { 'Prefer': 'return=minimal' }
  });
}

async function marcarConfirmada(id) {
  await sbFetch(`reservas?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ confirmada: true })
  });
}
// ─────────────────────────────────────────────────────────────────────────

const TURNOS_DEFAULT = ['19:30', '21:00', '22:30'];
let turnosGlobal = [...TURNOS_DEFAULT];

function getTurnos() {
  const guardados = localStorage.getItem('baibai_turnos');
  return guardados ? JSON.parse(guardados) : TURNOS_DEFAULT;
}

function formatTelefono(tel) {
  if (!tel || tel === '—') return tel;
  const sinEspacios = tel.replace(/\s/g, '');
  if (sinEspacios.startsWith('+') && !sinEspacios.startsWith('+34')) return tel;
  const digits = tel.replace(/\D/g, '').replace(/^34/, '');
  const clean = digits.slice(-9);
  if (clean.length === 9) {
    return `+34 ${clean.slice(0,3)} ${clean.slice(3,6)} ${clean.slice(6)}`;
  }
  return tel;
}

const filtroPicker = document.getElementById('filtro-fecha');
const contenido    = document.getElementById('contenido-informe');

function actualizarFechaImpresion(val) {
  const f = new Date(val + 'T00:00:00');
  document.getElementById('print-fecha').textContent =
    '· ' + f.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

filtroPicker.value = new Date().toISOString().split('T')[0];
actualizarFechaImpresion(filtroPicker.value);
filtroPicker.addEventListener('change', (e) => {
  actualizarFechaImpresion(e.target.value);
  renderizar();
});

async function getTurnosCompletos() {
  try {
    const rows = await sbFetch('turnos_completos?select=fecha,turno');
    return rows || [];
  } catch (_) { return []; }
}

function isCompletoEn(lista, fecha, turno) {
  return lista.some(c => c.fecha === fecha && c.turno === turno);
}

async function toggleCompleto(fecha, turno) {
  const lista = await getTurnosCompletos();
  if (isCompletoEn(lista, fecha, turno)) {
    await sbFetch(`turnos_completos?fecha=eq.${fecha}&turno=eq.${encodeURIComponent(turno)}`, {
      method: 'DELETE',
      headers: { 'Prefer': 'return=minimal' }
    });
  } else {
    await sbFetch('turnos_completos', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({ fecha, turno })
    });
  }
}

async function actualizarBadgePendientes() {
  const reservas = await getReservas();
  const n = reservas.filter(r => !r.confirmada).length;
  const badge = document.getElementById('badge-pendientes');
  badge.textContent = n;
  badge.style.display = n > 0 ? 'inline' : 'none';
}

async function enviarWAInterno(id) {
  const reservas = await getReservas();
  const r = reservas.find(r => r.id === id);
  if (!r) return;
  const pers = parseInt(r.personas);
  const origen = r.origen && r.origen.startsWith('concierge:') ? r.origen : 'Teléfono';
  const msg = `🍽️ Nueva reserva BAI BAI\n👤 ${r.nombre}\n👥 ${pers} persona${pers > 1 ? 's' : ''}\n📅 ${r.dia}\n🕐 ${r.turno} h\n📌 Origen: ${origen}${r.notas ? '\n📝 ' + r.notas : ''}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  await marcarConfirmada(id);
  renderizar();
}

async function confirmarManualesExistentes() {
  if (localStorage.getItem('baibai_manuales_confirmadas')) return;
  await sbFetch('reservas?origen=neq.web&confirmada=eq.false', {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({ confirmada: true })
  });
  localStorage.setItem('baibai_manuales_confirmadas', '1');
}

async function confirmarWA(id) {
  const reservas = await getReservas();
  const r = reservas.find(r => r.id === id);
  if (!r) return;
  const tel      = r.telefono.replace(/\D/g, '');
  const pers     = parseInt(r.personas);
  const locale   = r.idioma === 'en' ? 'en-GB' : 'es-ES';
  const diaLocal = r.diaRaw
    ? new Date(r.diaRaw + 'T00:00:00').toLocaleDateString(locale, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
    : r.dia;
  const msg = r.idioma === 'en'
    ? `Hi ${r.nombre}, your reservation at BAI BAI is confirmed: ${pers} guest${pers > 1 ? 's' : ''} on ${diaLocal} at ${r.turno} h. Thank you for choosing us. If you need to modify or cancel your reservation, please contact us at +34 971 191 592. We look forward to welcoming you, see you soon!`
    : `Hola ${r.nombre}, su reserva en BAI BAI está confirmada: ${pers} persona${pers > 1 ? 's' : ''} el ${diaLocal} a las ${r.turno} h. Gracias por elegirnos. Si necesita modificar o cancelar su reserva, por favor póngase en contacto con nosotros llamando al +34 971 191 592. ¡Estamos deseando recibirle, nos vemos pronto!`;
  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  await marcarConfirmada(id);
  await actualizarBadgePendientes();
  if (document.getElementById('vista-pendientes').style.display !== 'none') {
    renderizarPendientes();
  } else {
    renderizar();
  }
}

async function confirmarEmail(id) {
  const reservas = await getReservas();
  const r = reservas.find(r => r.id === id);
  if (!r || !r.email) return;
  try {
    const locale   = r.idioma === 'en' ? 'en-GB' : 'es-ES';
    const diaLocal = r.diaRaw
      ? new Date(r.diaRaw + 'T00:00:00').toLocaleDateString(locale, {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })
      : r.dia;
    const labels = r.idioma === 'en'
      ? {
          lbl_asunto:    `Reservation Confirmed! – BAI BAI – ${diaLocal}`,
          lbl_titulo:    'Reservation Confirmed!',
          lbl_nombre:    'Name',
          lbl_personas:  'Guests',
          lbl_fecha:     'Date',
          lbl_turno:     'Seating',
          lbl_gracias:   'Thank you for choosing us.',
          lbl_contacto:  'If you need to modify or cancel your reservation, please contact us at',
          lbl_despedida: 'We look forward to welcoming you, see you soon!',
        }
      : {
          lbl_asunto:    `¡Reserva Confirmada! – BAI BAI – ${diaLocal}`,
          lbl_titulo:    '¡Reserva Confirmada!',
          lbl_nombre:    'Nombre',
          lbl_personas:  'Personas',
          lbl_fecha:     'Fecha',
          lbl_turno:     'Turno',
          lbl_gracias:   'Gracias por elegirnos.',
          lbl_contacto:  'Si necesita modificar su reserva, por favor póngase en contacto con nosotros llamando al',
          lbl_despedida: '¡Estamos deseando recibirle, nos vemos pronto!',
        };
    emailjs.init('93AVZmo6iBz2c1fmD');
    await emailjs.send('service_h3pvqic', 'template_confirmacion_cl', {
      nombre:        r.nombre,
      email_cliente: r.email,
      personas:      r.personas,
      dia:           diaLocal,
      turno:         r.turno,
      ...labels,
    });
    await marcarConfirmada(id);
    await actualizarBadgePendientes();
    if (document.getElementById('vista-pendientes').style.display !== 'none') {
      renderizarPendientes();
    } else {
      renderizar();
    }
  } catch (e) {
    alert('Error al enviar el email. Inténtalo de nuevo.');
  }
}

function filaPendienteHTML(r) {
  const btnConfirmar = r.email
    ? `<button class="btn-email" onclick="confirmarEmail(${r.id})">📧 Confirmar</button>`
    : `<button class="btn-wa" onclick="confirmarWA(${r.id})">💬 Confirmar</button>`;
  return `
    <tr>
      <td class="td-nombre">${r.nombre}</td>
      <td class="td-telefono">${formatTelefono(r.telefono)}</td>
      <td class="td-personas">${r.personas}</td>
      <td class="td-muted" style="line-height:1.4">
        <span style="display:block;font-weight:600;text-transform:capitalize">${r.dia.split(', ')[0]}</span>
        <span style="font-size:0.82rem">${r.dia.split(', ')[1]?.replace(/ de \d{4}$/, '') || ''}</span>
      </td>
      <td class="td-muted" style="white-space:nowrap">${r.turno} h</td>
      <td class="col-cancelar">
        ${btnConfirmar}
      </td>
    </tr>`;
}

async function renderizarPendientes() {
  const todas = (await getReservas()).filter(r => !r.confirmada);
  todas.sort((a, b) => a.diaRaw.localeCompare(b.diaRaw));
  const contenedor = document.getElementById('contenido-pendientes');

  if (todas.length === 0) {
    contenedor.innerHTML = `
      <div class="sin-reservas">
        <p>Todo confirmado</p>
        <p>No hay reservas pendientes de confirmación</p>
      </div>`;
    return;
  }

  const porFecha = {};
  todas.forEach(r => {
    if (!porFecha[r.diaRaw]) porFecha[r.diaRaw] = [];
    porFecha[r.diaRaw].push(r);
  });

  let html = '';
  Object.keys(porFecha).sort().forEach(fecha => {
    const reservas = porFecha[fecha];
    html += `
      <div class="turno-bloque">
        <div class="turno-titulo">
          <h2>${reservas[0].dia}</h2>
          <div class="linea"></div>
          <span class="badge">${reservas.length} pendiente${reservas.length !== 1 ? 's' : ''}</span>
        </div>
        <table class="tabla-reservas">
          <thead><tr>
            <th>Nombre</th><th>Teléfono</th><th>Personas</th>
            <th>Fecha</th><th>Turno</th><th class="col-cancelar"></th>
          </tr></thead>
          <tbody>${reservas.map(r => filaPendienteHTML(r)).join('')}</tbody>
        </table>
      </div>`;
  });

  contenedor.innerHTML = html;
}

function filaHTML(r) {
  const esManual = r.origen && r.origen !== 'web';
  const iconoWA = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="vertical-align:middle;margin-right:4px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.17 1.535 5.943L.057 23.928l6.188-1.453A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.002-1.366l-.36-.214-3.714.872.936-3.62-.235-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>`;
  let accion;
  if (esManual && !r.confirmada) {
    accion = `<button class="btn-wa-interno" onclick="enviarWAInterno(${r.id})">${iconoWA}Enviar</button>`;
  } else if (r.confirmada) {
    accion = `<span class="tick-confirmada">✓</span>`;
  } else if (r.email) {
    accion = `<button class="btn-email" onclick="confirmarEmail(${r.id})">📧 Confirmar</button>`;
  } else {
    accion = `<button class="btn-wa" onclick="confirmarWA(${r.id})">💬 Confirmar</button>`;
  }
  const turnoOpts = turnosGlobal.map(t =>
    `<option value="${t}" ${r.turno === t ? 'selected' : ''}>${t} h</option>`
  ).join('');
  return `
    <tr class="${r.confirmada ? 'fila-confirmada' : ''}">
      <td class="td-nombre">${r.nombre}</td>
      <td class="td-telefono">${formatTelefono(r.telefono)}</td>
      <td class="td-personas td-input">
        <input type="number" class="input-personas" min="1" max="90" value="${r.personas}"
          data-id="${r.id}" data-campo="personas" />
      </td>
      <td class="td-input col-print-hide">
        <select class="select-turno" data-id="${r.id}">${turnoOpts}</select>
      </td>
      <td class="td-input">
        <input type="text" placeholder="—" value="${r.mesa || ''}"
          data-id="${r.id}" data-campo="mesa" />
      </td>
      <td class="td-input">
        ${r.origen && r.origen.startsWith('concierge: ') ? `<span class="tag-origen">${origenLabel(r.origen)}</span><br>` : ''}
        <textarea placeholder="Alergias, peticiones…"
          data-id="${r.id}" data-campo="notas">${r.notas || ''}</textarea>
      </td>
      <td class="col-cancelar">
        ${accion}
        <button class="btn-cancelar" data-id="${r.id}" title="Cancelar reserva">✕</button>
      </td>
    </tr>`;
}

async function renderizar() {
  const fecha = filtroPicker.value;
  const todas = await getReservas();
  const turnosCompletosLista = await getTurnosCompletos();
  turnosGlobal = [...new Set([...getTurnos(), ...todas.map(r => r.turno).filter(Boolean)])].sort();
  const delDia = todas.filter(r => r.diaRaw === fecha);

  const totalPersonas    = delDia.reduce((s, r) => s + parseInt(r.personas || 0), 0);
  const totalConfirmadas = delDia.filter(r => r.confirmada).length;
  document.getElementById('total-reservas').textContent    = delDia.length;
  document.getElementById('total-personas').textContent    = totalPersonas;
  document.getElementById('total-confirmadas').textContent = totalConfirmadas;

  if (delDia.length === 0) {
    contenido.innerHTML = `
      <div class="sin-reservas">
        <p>Sin reservas para este día</p>
        <p>Selecciona otra fecha o espera nuevas reservas</p>
      </div>`;
    return;
  }

  let html = '';

  const turnosDelDia = [...new Set([...getTurnos(), ...delDia.map(r => r.turno)])].sort();
  turnosDelDia.forEach(turno => {
    const delTurno = delDia.filter(r => r.turno === turno);
    const personasTurno = delTurno.reduce((s, r) => s + parseInt(r.personas || 0), 0);
    const completo = isCompletoEn(turnosCompletosLista, fecha, turno);

    html += `
      <div class="turno-bloque">
        <div class="turno-titulo">
          <h2>${turno} h</h2>
          ${completo ? '<span class="badge-completo">COMPLETO</span>' : ''}
          <div class="linea"></div>
          <span class="badge">${delTurno.length} reserva${delTurno.length !== 1 ? 's' : ''} · ${personasTurno} personas · <span style="color:${Math.max(0,90-personasTurno)<=10?'#e07070':'inherit'}">${Math.max(0, 90 - personasTurno)} libres</span></span>
          <button class="btn-toggle-turno ${completo ? 'es-completo' : ''}"
            data-fecha="${fecha}" data-turno="${turno}">
            ${completo ? 'Abrir turno' : 'Cerrar turno'}
          </button>
        </div>
        ${delTurno.length === 0
          ? '<p class="turno-vacio">Sin reservas aún</p>'
          : `<table class="tabla-reservas">
              <thead><tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Personas</th>
                <th class="col-print-hide">Turno</th>
                <th>Nº Mesa</th>
                <th>Anotaciones</th>
                <th class="col-cancelar"></th>
              </tr></thead>
              <tbody>${delTurno.map(r => filaHTML(r)).join('')}</tbody>
            </table>`
        }
      </div>`;
  });

  contenido.innerHTML = html;

  contenido.querySelectorAll('[data-campo]').forEach(el => {
    el.addEventListener('change', async (e) => {
      await actualizarCampo(Number(e.target.dataset.id), e.target.dataset.campo, e.target.value);
      if (e.target.dataset.campo === 'personas') await renderizar();
    });
  });

  contenido.querySelectorAll('.select-turno').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      await actualizarCampo(Number(e.target.dataset.id), 'turno', e.target.value);
      await renderizar();
    });
  });

  contenido.querySelectorAll('.btn-toggle-turno').forEach(btn => {
    btn.addEventListener('click', async () => {
      await toggleCompleto(btn.dataset.fecha, btn.dataset.turno);
      renderizar();
    });
  });

  contenido.querySelectorAll('.btn-cancelar').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = Number(e.target.dataset.id);
      if (!confirm('¿Cancelar esta reserva?')) return;
      await cancelarReserva(id);
      await renderizar();
    });
  });
}

// ── GESTIÓN DE DÍAS CERRADOS ──────────────────────────────────────────────

async function getCierres() {
  try {
    const rows = await sbFetch('cierres?select=fecha&order=fecha.asc');
    return (rows || []).map(r => r.fecha);
  } catch (_) { return []; }
}

async function addCierre(fecha) {
  await sbFetch('cierres', {
    method: 'POST',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({ fecha })
  });
}

async function removeCierre(fecha) {
  await sbFetch(`cierres?fecha=eq.${fecha}`, {
    method: 'DELETE',
    headers: { 'Prefer': 'return=minimal' }
  });
}

async function renderizarCierres() {
  const lista = await getCierres();
  const contenedor = document.getElementById('cierres-lista');

  if (lista.length === 0) {
    contenedor.innerHTML = '<span style="color:var(--muted);font-size:0.82rem;">Ninguno</span>';
    return;
  }

  contenedor.innerHTML = lista
    .sort()
    .map(fecha => {
      const f = new Date(fecha + 'T00:00:00');
      const label = f.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
      return `<span class="cierre-tag">${label}
        <button data-fecha="${fecha}" title="Eliminar cierre">✕</button>
      </span>`;
    }).join('');

  contenedor.querySelectorAll('button[data-fecha]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await removeCierre(btn.dataset.fecha);
      await renderizarCierres();
    });
  });
}

document.getElementById('btn-add-cierre').addEventListener('click', async () => {
  const fecha = document.getElementById('cierre-fecha').value;
  if (!fecha) return;
  try {
    await addCierre(fecha);
    document.getElementById('cierre-fecha').value = '';
    await renderizarCierres();
  } catch (e) {
    alert('Error al cerrar el día: ' + e.message);
  }
});

renderizarCierres();

// ── GESTIÓN DE TURNOS ─────────────────────────────────────────────────────

function renderizarTurnos() {
  const lista = getTurnos();
  const contenedor = document.getElementById('turnos-lista');

  contenedor.innerHTML = lista
    .sort()
    .map(turno => `
      <span class="cierre-tag" style="color:var(--gold);border-color:rgba(201,168,76,0.3);background:rgba(201,168,76,0.08);">
        ${turno} h
        <button data-turno="${turno}" title="Eliminar turno">✕</button>
      </span>`)
    .join('');

  contenedor.querySelectorAll('button[data-turno]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nuevos = getTurnos().filter(t => t !== btn.dataset.turno);
      localStorage.setItem('baibai_turnos', JSON.stringify(nuevos));
      renderizarTurnos();
    });
  });
}

document.getElementById('btn-add-turno').addEventListener('click', () => {
  const val = document.getElementById('turno-nuevo').value;
  if (!val) return;
  const lista = getTurnos();
  if (!lista.includes(val)) {
    lista.push(val);
    localStorage.setItem('baibai_turnos', JSON.stringify(lista));
  }
  document.getElementById('turno-nuevo').value = '';
  renderizarTurnos();
});

renderizarTurnos();

// ── CALENDARIO MENSUAL ────────────────────────────────────────────────────

let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

async function renderCalendario() {
  const reservas = await getReservas();
  const cierres  = await getCierres();
  const hoyStr   = new Date().toISOString().split('T')[0];

  const numDias      = new Date(calYear, calMonth + 1, 0).getDate();
  const primerDiaSem = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;

  document.getElementById('cal-titulo').textContent = `${MESES[calMonth]} ${calYear}`;

  let totalReservasMes = 0;
  let totalPersonasMes = 0;

  const datosPorDia = {};
  for (let d = 1; d <= numDias; d++) {
    const fecha  = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const delDia = reservas.filter(r => r.diaRaw === fecha);
    const nPers  = delDia.reduce((s, r) => s + parseInt(r.personas || 0), 0);
    datosPorDia[d] = { nRes: delDia.length, nPers, fecha };
    totalReservasMes += delDia.length;
    totalPersonasMes += nPers;
  }

  document.getElementById('cal-total-reservas').innerHTML = `<strong>${totalReservasMes}</strong> reservas`;
  document.getElementById('cal-total-personas').innerHTML = `<strong>${totalPersonasMes}</strong> personas`;

  const cabecera = DIAS_SEMANA.map(d => `<div class="cal-dia-nombre">${d}</div>`).join('');

  let celdas = '';
  for (let i = 0; i < primerDiaSem; i++) {
    celdas += '<div class="cal-celda vacio"></div>';
  }

  for (let d = 1; d <= numDias; d++) {
    const { nRes, nPers, fecha } = datosPorDia[d];
    const esCerrado = cierres.includes(fecha);
    const esHoy     = fecha === hoyStr;

    let clase;
    if (esCerrado)        clase = 'cerrado';
    else if (nPers === 0) clase = 'sin-reservas';
    else if (nPers <= 25) clase = 'tranquilo';
    else if (nPers <= 60) clase = 'moderado';
    else                  clase = 'ocupado';

    if (esHoy) clase += ' hoy';

    let inner;
    if (esCerrado) {
      inner = `<div class="cal-num">${d}</div><div class="cal-cerrado-label">Cerrado</div>`;
    } else if (nRes === 0) {
      inner = `<div class="cal-num">${d}</div>`;
    } else {
      inner = `<div class="cal-num">${d}</div>
        <div class="cal-dato"><strong>${nRes}</strong> res.</div>
        <div class="cal-dato"><strong>${nPers}</strong> pers.</div>`;
    }

    celdas += `<div class="cal-celda ${clase}" data-fecha="${fecha}">${inner}</div>`;
  }

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = cabecera + celdas;

  grid.querySelectorAll('.cal-celda[data-fecha]:not(.cerrado)').forEach(celda => {
    celda.addEventListener('click', () => {
      document.getElementById('tab-diario').click();
      filtroPicker.value = celda.dataset.fecha;
      renderizar();
    });
  });
}

document.getElementById('cal-prev').addEventListener('click', () => {
  if (--calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendario();
});

document.getElementById('cal-next').addEventListener('click', () => {
  if (++calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendario();
});

// ── ENTRADA MANUAL ────────────────────────────────────────────────────────

const toggleManual = document.getElementById('toggle-manual');
const formManual   = document.getElementById('form-manual');

toggleManual.addEventListener('click', () => {
  const abierto = formManual.classList.toggle('visible');
  toggleManual.classList.toggle('abierto', abierto);
});

async function poblarTurnosManual() {
  const sel = document.getElementById('m-turno');
  sel.innerHTML = '<option value="">Selecciona turno</option>';
  const reservas = await getReservas();
  const turnosReales = reservas.map(r => r.turno).filter(Boolean);
  const todos = [...new Set([...getTurnos(), ...turnosReales])].sort();
  todos.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = `${t} h`;
    sel.appendChild(opt);
  });
}
poblarTurnosManual();

document.getElementById('m-fecha').value = filtroPicker.value;
filtroPicker.addEventListener('change', () => {
  document.getElementById('m-fecha').value = filtroPicker.value;
});

function getConcierges() {
  return JSON.parse(localStorage.getItem('baibai_concierges') || '[]');
}

function guardarConcierge(nombre) {
  const lista = getConcierges();
  if (nombre && !lista.includes(nombre)) {
    lista.push(nombre);
    lista.sort();
    localStorage.setItem('baibai_concierges', JSON.stringify(lista));
  }
}

function actualizarDatalistConcierges() {
  const dl = document.getElementById('concierges-lista');
  dl.innerHTML = getConcierges().map(n => `<option value="${n}">`).join('');
}

actualizarDatalistConcierges();

document.querySelectorAll('input[name="m-origen"]').forEach(r => {
  r.addEventListener('change', () => {
    const esConcierge = r.value === 'concierge';
    document.getElementById('m-campo-tel').style.display       = '';
    document.getElementById('m-campo-concierge').style.display = esConcierge ? '' : 'none';
    if (!esConcierge) document.getElementById('m-concierge').value = '';
  });
});

document.getElementById('btn-añadir-manual').addEventListener('click', async () => {
  const nombre    = document.getElementById('m-nombre').value.trim();
  const personas  = document.getElementById('m-personas').value;
  const origen    = document.querySelector('input[name="m-origen"]:checked').value;
  const tel       = document.getElementById('m-telefono').value.trim();
  const concierge = document.getElementById('m-concierge').value.trim();
  const turno     = document.getElementById('m-turno').value;
  const fecha     = document.getElementById('m-fecha').value;

  if (!nombre || !personas || !turno || !fecha) {
    alert('Rellena nombre, personas, turno y fecha.');
    return;
  }
  if (origen === 'telefono' && !tel) {
    alert('Introduce el teléfono.');
    return;
  }
  if (origen === 'concierge' && !concierge) {
    alert('Introduce el nombre del concierge.');
    return;
  }

  if (origen === 'concierge') guardarConcierge(concierge);

  await insertReserva({
    nombre,
    telefono:   tel || '—',
    email:      null,
    personas,
    diaRaw:     fecha,
    turno,
    mesa:       '',
    notas:      '',
    origen:     origen === 'concierge' ? `concierge: ${concierge}` : origen,
    confirmada: false
  });

  document.getElementById('m-nombre').value    = '';
  document.getElementById('m-personas').value  = '';
  document.getElementById('m-telefono').value  = '';
  document.getElementById('m-concierge').value = '';
  document.querySelector('input[name="m-origen"][value="telefono"]').checked = true;
  document.getElementById('m-campo-tel').style.display       = '';
  document.getElementById('m-campo-concierge').style.display = 'none';
  document.getElementById('m-turno').value = '';
  actualizarDatalistConcierges();

  filtroPicker.value = fecha;
  actualizarFechaImpresion(fecha);
  await actualizarBadgePendientes();
  await renderizar();
});

// ── TAB TOGGLE ─────────────────────────────────────────────────────────────

function origenLabel(origen) {
  if (!origen || origen === 'web')        return '🌐 Web';
  if (origen === 'telefono')              return '📞 Teléfono';
  if (origen === 'instagram')             return '📷 Instagram';
  if (origen === 'presencial')            return '🚶 Presencial';
  if (origen.startsWith('concierge: '))   return `🎩 ${origen.replace('concierge: ', '')}`;
  return origen;
}

async function renderizarStats() {
  const desde = document.getElementById('stats-desde').value;
  const hasta = document.getElementById('stats-hasta').value;
  const contenedor = document.getElementById('contenido-stats');

  const todas = (await getReservas()).filter(r => {
    if (desde && r.diaRaw < desde) return false;
    if (hasta && r.diaRaw > hasta) return false;
    return true;
  });

  if (todas.length === 0) {
    contenedor.innerHTML = '<div class="sin-reservas"><p>Sin reservas en ese período</p></div>';
    return;
  }

  const porOrigen = {};
  todas.forEach(r => {
    const origen = r.origen || 'web';
    if (!porOrigen[origen]) porOrigen[origen] = { reservas: 0, personas: 0 };
    porOrigen[origen].reservas++;
    porOrigen[origen].personas += parseInt(r.personas || 0);
  });

  const totalRes  = todas.length;
  const totalPers = todas.reduce((s, r) => s + parseInt(r.personas || 0), 0);

  const filas = Object.entries(porOrigen)
    .sort((a, b) => b[1].reservas - a[1].reservas)
    .map(([origen, d]) => `
      <tr>
        <td style="font-size:18px;font-weight:600;color:var(--text);">${origenLabel(origen)}</td>
        <td style="font-size:20px;font-weight:700;text-align:center;color:var(--gold);">${d.reservas}</td>
        <td style="font-size:20px;font-weight:700;text-align:center;color:var(--text);">${d.personas}</td>
      </tr>`).join('');

  contenedor.innerHTML = `
    <table class="tabla-reservas" style="max-width:500px;">
      <thead><tr>
        <th>Origen</th><th style="text-align:center;">Reservas</th><th style="text-align:center;">Personas</th>
      </tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr style="border-top:1px solid var(--gold);">
        <td style="font-weight:700;color:var(--gold);padding:0.9rem 1rem;">TOTAL</td>
        <td style="font-size:20px;font-weight:700;text-align:center;color:var(--gold);">${totalRes}</td>
        <td style="font-size:20px;font-weight:700;text-align:center;color:var(--text);">${totalPers}</td>
      </tr></tfoot>
    </table>`;
}

document.getElementById('btn-calcular-stats').addEventListener('click', renderizarStats);

function setTab(activo) {
  const vistas = { diario: 'vista-diaria', mensual: 'vista-mensual', pendientes: 'vista-pendientes', stats: 'vista-stats' };
  Object.entries(vistas).forEach(([t, vistaId]) => {
    document.getElementById(vistaId).style.display = t === activo ? '' : 'none';
    document.getElementById(`tab-${t}`).classList.toggle('active', t === activo);
  });
  const esDiario = activo === 'diario';
  document.getElementById('filtro-fecha').style.display = esDiario ? '' : 'none';
  document.querySelector('.btn-imprimir').style.display  = esDiario ? '' : 'none';
}

document.getElementById('tab-diario').addEventListener('click', () => setTab('diario'));

document.getElementById('tab-mensual').addEventListener('click', () => {
  setTab('mensual');
  renderCalendario();
});

document.getElementById('tab-pendientes').addEventListener('click', () => {
  setTab('pendientes');
  renderizarPendientes();
});

document.getElementById('tab-stats').addEventListener('click', () => {
  setTab('stats');
  const hoy = new Date().toISOString().split('T')[0];
  const enero = hoy.substring(0, 4) + '-01-01';
  if (!document.getElementById('stats-desde').value) document.getElementById('stats-desde').value = enero;
  if (!document.getElementById('stats-hasta').value)  document.getElementById('stats-hasta').value  = hoy;
  renderizarStats();
});

// ── INICIO ────────────────────────────────────────────────────────────────
confirmarManualesExistentes().then(() => renderizar());
actualizarBadgePendientes();

setInterval(() => {
  renderizar();
  actualizarBadgePendientes();
}, 30000);
