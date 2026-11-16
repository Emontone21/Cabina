// Copia la version de la carpeta principal a _versiones/vN: rutas absolutas al modelo y a lib, cartel VIEJA, ABRIR_vN.bat.
// Uso:  node archivar_version.js "<carpeta 2. tracking webcam>" v9
const fs = require('fs'), path = require('path');
const [MAIN, N] = process.argv.slice(2);
const DST = path.join(MAIN, '_versiones', N);
if (fs.existsSync(DST)) throw new Error('ya existe ' + DST);
fs.mkdirSync(DST);
const rep = (txt, from, to, file) => { if (!txt.includes(from)) throw new Error(`no encuentro "${from}" en ${file}`); return txt.split(from).join(to); };
const files = {
  'app.js': t => rep(rep(t, "'../1. tiesme modelo/tiesme_test01.fbx'", "'/1. tiesme modelo/tiesme_test01.fbx'", 'app.js'),
    "'../1. tiesme modelo/texturas/'", "'/1. tiesme modelo/texturas/'", 'app.js'),
  'cara.js': t => rep(t, "'../1. tiesme modelo/estados_cara/'", "'/1. tiesme modelo/estados_cara/'", 'cara.js'),
  // (la v12 tenía el título sin espacio antes del <span>: se acepta igual)
  'index.html': t => rep(rep(t.split(`Tracking tiesme ${N}<span id="fps">`).join(`Tracking tiesme ${N} <span id="fps">`), '<body>\n',
    `<body>\n<div id="vieja" style="position:fixed;inset:0;z-index:99;background:rgba(120,0,0,.92);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font:600 22px system-ui;text-align:center;padding:30px">ESTA ES UNA VERSIÓN VIEJA<br><span style="font-weight:400;font-size:16px">La actual se abre con <b>ABRIR_TEST.bat</b> en la carpeta <b>2. tracking webcam</b>.<br>Cerrá esta pestaña y la ventana negra de esta versión.</span><button onclick="document.getElementById('vieja').remove()" style="font:14px system-ui;padding:8px 14px;border-radius:6px;border:0;cursor:pointer">Usarla igual (comparar)</button></div>\n`, 'index.html'),
    `<div class="titulo">Tracking tiesme ${N} <span id="fps"></span></div>`, `<div class="titulo"><span style="color:#ff7a7a">VIEJA ${N}</span> <span id="fps"></span></div>`, 'index.html'),
  'servidor.js': t => t,
  'LEEME.md': t => t,
};
// desde la v8: las librerias locales quedan en la carpeta principal (rutas absolutas)
const libFix = { 'index.html': t => t.split('"./lib/').join('"/2.%20tracking%20webcam/lib/'),
  'app.js': t => t.split("new URL('lib/', import.meta.url)").join("new URL('/2.%20tracking%20webcam/lib/', location.href)") };
for (const [f, fn] of Object.entries(files)) {
  const src = fs.readFileSync(path.join(MAIN, f), 'utf8').replace(/\r\n/g, '\n');
  const crlf = fs.readFileSync(path.join(MAIN, f), 'utf8').includes('\r\n');
  let out = fn(src);
  if (libFix[f]) out = libFix[f](out);
  if (crlf) out = out.replace(/\n/g, '\r\n');
  fs.writeFileSync(path.join(DST, f), out);
}
fs.writeFileSync(path.join(DST, `ABRIR_${N}.bat`), `@echo off\r\ntitle Tracking tiesme VIEJA ${N}\r\ncd /d "%~dp0"\r\nnode servidor.js\r\npause\r\n`);
console.log('ok', fs.readdirSync(DST).join(', '));
