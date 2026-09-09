// ═══════════════════════════════════════════════════════════════
//  SOLICITUD DE ESPACIOS – Universidad de Valladolid Yucatán
// ═══════════════════════════════════════════════════════════════

const SHEET_ID    = '1_Ay2jGIsVMzyg0UkRd8j214ciiJjd2NGpSEcZsCVwBk';
const TEMPLATE_ID = '1MZ5gRnQTAt5DnPM7F8ldX03CSHzpx5AGxtrxCH-a3dQ';
const FOLDER_ID   = '14GUDCHZcfjCJIvemuMC5kb5vQBT3wW8w';
const CALENDAR_ID = 'c_65440cd6cd431b009a59852bc2fc4a8a82c4450992c7c8a34cc6d43765f7dd11@group.calendar.google.com';

const DIRECTORES = [
  'LE. Wendy Noemí Pacheco Jiménez M.E',
  'LI. Isely Belem Olivera Antonio',
  'LDG. Oscar Alejandro Cauich Molina M.E',
  'LA. Abril Salas Góngora M.A',
  'LC.E. Martha Paola Herrera García M.E',
  'LN. Luis Armando González Alzina M.E',
  'LD. Adriana Minelly Oy Romero',
  'L.P. Elizabeth Pérez Sonda',
  'ARQ. Emyly De La Rosa Gonzales Gomez M.E',
  'LCD. Gelmy Guadalupe Peraza Pérez',
  'LEF. José Concepción Díaz Martín M.A.E',
  'LA. Malena Díaz Vivas M.A.F',
];

const USERS_SHEET = 'Usuarios';
const HDR_USUARIOS = ['Usuario', 'Contraseña', 'Nombre', 'Rol', 'Activo'];
const SESSION_TTL  = 6 * 60 * 60; // 6 horas

const HDR_SOLICITUDES = [
  'Folio', 'Fecha Solicitud', 'Título Actividad', 'Director Academia',
  'Docente/Administrativo Responsable', 'Materia', 'Núm. Alumnos', 'Periodo',
  'Tipo de Evento', 'Requerimientos', 'Requerimientos Especiales',
  'Foto/Video/Publicación', 'URL Documento', 'Espacios', 'Fechas', 'Horarios'
];
const HDR_EVENTOS = [
  'Folio Solicitud', 'Espacio', 'Fecha', 'Hora Inicio', 'Hora Fin', 'Estado'
];

// ═══════════════════════════════════════════════════════════════
//  PUNTO DE ENTRADA
// ═══════════════════════════════════════════════════════════════
function doGet(e) {
  var appUrl = ScriptApp.getService().getUrl();
  var token  = (e && e.parameter && e.parameter.token) || '';
  var page   = (e && e.parameter && e.parameter.page)  || '';

  // Sin token o token inválido → login
  if (!token) return serveLogin(appUrl);
  var sess = validateToken(token);
  if (!sess.ok) return serveLogin(appUrl);

  var rol    = sess.data.rol;
  var nombre = sess.data.nombre;

  if (page === 'form') {
    var tpl = HtmlService.createTemplateFromFile('Index');
    tpl.token  = token;
    tpl.nombre = nombre;
    tpl.appUrl = appUrl;
    return tpl.evaluate()
      .setTitle('Solicitud de Espacios – UVY')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Default: menú principal
  var tpl = HtmlService.createTemplateFromFile('Menu');
  tpl.token  = token;
  tpl.nombre = nombre;
  tpl.rol    = rol;
  tpl.appUrl = appUrl;
  return tpl.evaluate()
    .setTitle('Portal UVY')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function serveLogin(appUrl) {
  var tpl = HtmlService.createTemplateFromFile('Login');
  tpl.appUrl = appUrl;
  return tpl.evaluate()
    .setTitle('Acceso – UVY')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════
function login(usuario, password) {
  try {
    usuario  = String(usuario  || '').trim();
    password = String(password || '');
    if (!usuario || !password) return { ok: false, error: 'Ingresa usuario y contraseña.' };

    var ss   = SpreadsheetApp.openById(SHEET_ID);
    var sh   = getOrCreateSheet(ss, USERS_SHEET,
                 [HDR_USUARIOS,
                  ['admin', 'UVY2024', 'Administrador', 'Director', 'SI']]);
    var rows = sh.getDataRange().getValues();

    for (var i = 1; i < rows.length; i++) {
      var r        = rows[i];
      var rowUser  = String(r[0] || '').trim();
      var rowPass  = String(r[1] || '');
      var nombre   = String(r[2] || rowUser);
      var rol      = String(r[3] || 'Usuario').trim();
      var activo   = String(r[4] || '').trim().toUpperCase();

      if (rowUser.toLowerCase() !== usuario.toLowerCase()) continue;
      if (activo === 'NO' || activo === 'FALSE')
        return { ok: false, error: 'Usuario inactivo. Contacta al administrador.' };
      if (rowPass !== password)
        return { ok: false, error: 'Usuario o contraseña incorrectos.' };

      var token = Utilities.getUuid();
      CacheService.getScriptCache().put(
        'sess_' + token,
        JSON.stringify({ usuario: rowUser, nombre: nombre, rol: rol }),
        SESSION_TTL
      );
      return { ok: true, token: token, nombre: nombre, rol: rol };
    }
    return { ok: false, error: 'Usuario o contraseña incorrectos.' };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

function validateToken(token) {
  try {
    if (!token) return { ok: false };
    var raw = CacheService.getScriptCache().get('sess_' + token);
    if (!raw) return { ok: false };
    return { ok: true, data: JSON.parse(raw) };
  } catch(e) {
    return { ok: false };
  }
}

function logout(token) {
  try { if (token) CacheService.getScriptCache().remove('sess_' + token); } catch(e) {}
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════
//  DISPONIBILIDAD  –  retorna [{ inicio:"HH:MM", fin:"HH:MM" }]
// ═══════════════════════════════════════════════════════════════
function getAvailability(espacio, fecha) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = getOrCreateSheet(ss, 'Eventos', HDR_EVENTOS);
    var rows  = sheet.getDataRange().getValues();
    var booked = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (String(r[1]).trim() === espacio.trim() &&
          fmtDate(r[2])       === fecha &&
          String(r[5]).trim() !== 'CANCELADO') {
        booked.push({ inicio: normalizeTime(r[3]), fin: normalizeTime(r[4]) });
      }
    }
    return booked;
  } catch (e) {
    return { error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════
//  ENVÍO DEL FORMULARIO
// ═══════════════════════════════════════════════════════════════
function submitForm(data) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var folio = nextFolio(ss, data.titulo);

    // 1. Guardar en Sheets
    saveSolicitud(ss, data, folio);
    saveEventos(ss, data.eventos, folio);

    // 2. Generar documento (no bloquea el evento si falla)
    var docUrl   = '';
    var docError = '';
    try {
      docUrl = generateDocument(data, folio);
      updateDocUrl(ss, folio, docUrl);
    } catch(e) {
      docError = e.message;
    }

    // 3. Crear evento en Calendar
    createCalendarEvents(data, folio, docUrl);

    return { ok: true, folio: folio, docUrl: docUrl, docError: docError };

  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════
//  FOLIO  –  SDE-ABREV-NNNN
// ═══════════════════════════════════════════════════════════════
function nextFolio(ss, titulo) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000); // espera hasta 10s si otro envío está en curso
  try {
    var cfg  = getOrCreateSheet(ss, 'Config', [['Clave', 'Valor'], ['FOLIO_COUNTER', 1]]);
    var vals = cfg.getDataRange().getValues();
    var row = -1, num = 1;
    for (var i = 0; i < vals.length; i++) {
      if (vals[i][0] === 'FOLIO_COUNTER') { row = i + 1; num = Number(vals[i][1]); }
    }
    if (row < 0) { cfg.appendRow(['FOLIO_COUNTER', 1]); row = cfg.getLastRow(); num = 1; }
    cfg.getRange(row, 2).setValue(num + 1);
    SpreadsheetApp.flush(); // fuerza escritura antes de liberar el lock
  } finally {
    lock.releaseLock();
  }

  var abrev = titulo.trim()
    .split(/\s+/)
    .map(function(w) { return w.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase(); })
    .join('').substring(0, 8);

  return 'SDE-' + abrev + '-' + String(num).padStart(4, '0');
}

/** Ejecutar manualmente para ajustar el contador: setFolioCounter(50) */
function setFolioCounter(n) {
  var ss  = SpreadsheetApp.openById(SHEET_ID);
  var cfg = getOrCreateSheet(ss, 'Config', [['Clave', 'Valor']]);
  var vals = cfg.getDataRange().getValues();
  for (var i = 0; i < vals.length; i++) {
    if (vals[i][0] === 'FOLIO_COUNTER') {
      cfg.getRange(i + 1, 2).setValue(n);
      return '✓ Contador actualizado a ' + n;
    }
  }
  cfg.appendRow(['FOLIO_COUNTER', n]);
  return '✓ Contador creado en ' + n;
}

// ═══════════════════════════════════════════════════════════════
//  GUARDAR EN SHEETS
// ═══════════════════════════════════════════════════════════════
function saveSolicitud(ss, data, folio) {
  var sh = getOrCreateSheet(ss, 'Solicitudes', HDR_SOLICITUDES);
  var espacios = data.eventos.map(function(e) { return e.espacio; }).join(' | ');
  var fechas   = data.eventos.map(function(e) { return e.fecha;   }).join(' | ');
  var horarios = data.eventos.map(function(e) { return e.inicio + '-' + e.fin; }).join(' | ');

  sh.appendRow([
    folio, new Date(), data.titulo, data.director,
    data.docente, data.materia, data.numAlumnos, data.periodo,
    data.tipoEvento, data.requerimientos, data.requerimientosEspeciales,
    data.fotoVideoPublicacion, '', espacios, fechas, horarios
  ]);
}

function saveEventos(ss, eventos, folio) {
  var sh = getOrCreateSheet(ss, 'Eventos', HDR_EVENTOS);
  eventos.forEach(function(e) {
    sh.appendRow([folio, e.espacio, new Date(e.fecha + 'T12:00:00'), e.inicio, e.fin, 'ACTIVO']);
    var lastRow = sh.getLastRow();
    sh.getRange(lastRow, 4).setNumberFormat('@STRING@');
    sh.getRange(lastRow, 5).setNumberFormat('@STRING@');
  });
}

function updateDocUrl(ss, folio, url) {
  var sh   = ss.getSheetByName('Solicitudes');
  if (!sh) return;
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0] === folio) { sh.getRange(i + 1, 13).setValue(url); break; }
  }
}

// ═══════════════════════════════════════════════════════════════
//  CALENDARIO
// ═══════════════════════════════════════════════════════════════
function createCalendarEvents(data, folio, docUrl) {
  var cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) throw new Error('Calendario no encontrado: ' + CALENDAR_ID);

  data.eventos.forEach(function(evt) {
    var p  = evt.fecha.split('-').map(Number);
    var si = evt.inicio.split(':').map(Number);
    var ei = evt.fin.split(':').map(Number);
    var start = new Date(p[0], p[1]-1, p[2], si[0], si[1]);
    var end   = new Date(p[0], p[1]-1, p[2], ei[0], ei[1]);
    var requiereFoto = (data.fotoVideoPublicacion || '').toLowerCase().indexOf('fotograf') >= 0 ? 'Sí' : 'No';

    var desc = [
      'Título de la actividad: '            + data.titulo,
      'Organizan: '                         + data.director,
      'Materia: '                           + data.materia,
      'Número de alumnos: '                 + data.numAlumnos + '  –  Semestre/Periodo: ' + data.periodo,
      'Tipo de evento: '                    + data.tipoEvento,
      'Requerimientos: '                    + data.requerimientos,
      'Requerimientos especiales: '         + data.requerimientosEspeciales,
      'Requerimiento Apoyo de fotografía: ' + requiereFoto,
      'Enlace al documento: '               + (docUrl ? docUrl : '(folio ' + folio + ')')
    ].join('\n');

    cal.createEvent('[' + folio + '] ' + data.titulo, start, end, {
      description: desc,
      location:    evt.espacio
    });
  });
}

// ═══════════════════════════════════════════════════════════════
//  DOCUMENTO
// ═══════════════════════════════════════════════════════════════
function generateDocument(data, folio) {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var copy   = DriveApp.getFileById(TEMPLATE_ID).makeCopy(folio, folder);
  var doc    = DocumentApp.openById(copy.getId());
  var body   = doc.getBody();

  var tz   = Session.getScriptTimeZone();
  var hoy  = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy');
  var requiereFoto = (data.fotoVideoPublicacion || '').toLowerCase().indexOf('fotograf') >= 0 ? 'Sí' : 'No';

  var map = {
    '{{Folio}}':                     folio,
    '{{FechaActual}}':               hoy,
    '{{Titulo}}':                    data.titulo,
    '{{Docente Responsable}}':       data.docente,
    '{{Director de Academia}}':      data.director,
    '{{Organizan}}':                 data.director,
    '{{Materia}}':                   data.materia,
    '{{Número de Alumnos}}':         String(data.numAlumnos),
    '{{Semestre}}':                  data.periodo,
    '{{Tipo de Evento}}':            data.tipoEvento,
    '{{Requerimientos}}':            data.requerimientos,
    '{{Requerimientos Especiales}}': data.requerimientosEspeciales,
    '{{RequiereFotografia}}':        requiereFoto,
    '{{SolicitudDeElaboracion}}':    'No',
    '{{LinkFlyer}}':                 'No'
  };

  for (var n = 1; n <= 5; n++) {
    var evt = data.eventos[n - 1] || null;
    map['{{Espacio solicitado ' + n + '}}']     = evt ? evt.espacio : '';
    map['{{Fecha de inicio Dia ' + n + '}}']    = evt ? evt.fecha   : '';
    map['{{Hora de inicio Dia ' + n + '}}']     = evt ? evt.inicio  : '';
    map['{{Hora de conclusión Dia ' + n + '}}'] = evt ? evt.fin     : '';
    map['{{ApoyoDelDepartamento ' + n + '}}']   = '';
  }

  var sections = [body];
  try { if (doc.getHeader()) sections.push(doc.getHeader()); } catch(e) {}
  try { if (doc.getFooter()) sections.push(doc.getFooter()); } catch(e) {}

  sections.forEach(function(section) {
    Object.keys(map).forEach(function(key) {
      try { section.replaceText(escapeRegex(key), map[key] || ''); } catch(e) {}
    });
  });

  doc.saveAndClose();
  return copy.getUrl();
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
function getOrCreateSheet(ss, name, header) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (header && header.length) {
      if (Array.isArray(header[0])) { header.forEach(function(r) { sh.appendRow(r); }); }
      else { sh.appendRow(header); }
    }
  }
  return sh;
}

function buildDirectorOptions() {
  return DIRECTORES.map(function(d) {
    return '<option value="' + d + '">' + d + '</option>';
  }).join('');
}

function fmtDate(val) {
  if (!val) return '';
  var d = (val instanceof Date) ? val : new Date(val);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function normalizeTime(val) {
  if (!val) return '';
  if (typeof val === 'string') return val.trim().substring(0, 5);
  if (val instanceof Date) {
    var h = val.getHours(), m = val.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  if (typeof val === 'number') {
    var mins = Math.round(val * 1440);
    var hh = Math.floor(mins / 60) % 24, mm = mins % 60;
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }
  return String(val).substring(0, 5);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
