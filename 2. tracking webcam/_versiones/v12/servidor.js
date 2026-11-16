// Servidor local para el test de tracking (sin dependencias, usa el Node instalado).
// Sirve la carpeta SPOT CABINA para que la pagina pueda leer "1. tiesme modelo".
// La webcam solo funciona en https o en localhost, por eso hace falta este servidor.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// --port 8091 para correr otro al mismo tiempo (pruebas); por defecto 8090.
const argPort = process.argv.indexOf('--port');
const PORT = argPort > 0 ? +process.argv[argPort + 1] : 8090;
// v9: la pagina puede guardar grabaciones y analisis, SOLO dentro de "_pruebas" de esta carpeta.
const SERVIDOR_VERSION = 3; // v3: /__lista?todo=1 (para numerar las grabaciones seguidas)
const PRUEBAS = path.join(__dirname, '_pruebas');
const GUARDABLES = ['.mp4', '.webm', '.jsonl', '.json', '.jpg', '.txt'];
// Raiz servida: la carpeta que contiene "1. tiesme modelo" (SPOT CABINA), buscando hacia arriba.
// Asi funciona igual desde "2. tracking webcam" o desde una copia en "_versiones\vN".
function findRoot(dir) {
  for (let d = dir; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, '1. tiesme modelo'))) return d;
    if (path.dirname(d) === d) return path.resolve(__dirname, '..');
  }
}
const ROOT = findRoot(__dirname);
const PAGE = '/' + path.relative(ROOT, __dirname).split(path.sep).map(encodeURIComponent).join('/') + '/index.html';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.fbx': 'application/octet-stream',
  '.task': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.webm': 'video/webm',
  '.jsonl': 'application/json',
};

// Ruta pedida por la pagina (relativa a _pruebas) -> archivo, o null si se sale de _pruebas o no es un tipo permitido.
function rutaPruebas(rel, carpeta = false) {
  if (!rel) return null;
  const file = path.resolve(PRUEBAS, rel);
  if (!file.startsWith(PRUEBAS + path.sep)) return null;
  if (!carpeta && !GUARDABLES.includes(path.extname(file).toLowerCase())) return null;
  return file;
}
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

const server = http.createServer((req, res) => {
  let urlPath, params;
  try {
    const u = new URL(req.url, 'http://localhost');
    urlPath = decodeURIComponent(u.pathname); params = u.searchParams;
  } catch {
    res.writeHead(400); return res.end('bad url');
  }
  if (urlPath === '/') { res.writeHead(302, { Location: PAGE }); return res.end(); }

  // ---- v9: grabaciones y analisis ----
  if (urlPath === '/__servidor') return json(res, 200, { version: SERVIDOR_VERSION, pruebas: path.relative(ROOT, PRUEBAS) });
  if (urlPath === '/__guardar' && req.method === 'POST') {
    // ?ruta=grabaciones/x.mp4&modo=a (agrega al final) | w (crea de nuevo)
    const file = rutaPruebas(params.get('ruta'));
    if (!file) return json(res, 403, { error: 'ruta no permitida' });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const out = fs.createWriteStream(file, { flags: params.get('modo') === 'a' ? 'a' : 'w' });
    req.pipe(out);
    out.on('finish', () => json(res, 200, { ok: true, bytes: out.bytesWritten }));
    out.on('error', err => json(res, 500, { error: err.message }));
    return;
  }
  if (urlPath === '/__lista') {
    // ?ruta=grabaciones/bateria_x -> videos de esa carpeta (para analizar un lote)
    // ?ruta=grabaciones&todo=1    -> todo lo que hay (archivos y carpetas), para numerar
    const dir = rutaPruebas(params.get('ruta'), true);
    if (!dir || !fs.existsSync(dir)) return json(res, 404, { error: 'no existe' });
    const todo = params.get('todo') === '1';
    return json(res, 200, fs.readdirSync(dir).filter(f => todo || /\.(mp4|webm)$/i.test(f)).sort());
  }

  const file = path.resolve(ROOT, '.' + urlPath);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('not found: ' + urlPath); }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {
      // Los videos (texturas de cara y gorra) piden rangos para poder hacer loop.
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m && m[1] ? parseInt(m[1], 10) : 0;
      const end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${st.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Cache-Control': 'no-cache',
      });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': st.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
});

const url = `http://localhost:${PORT}${PAGE}`;

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    // Ya hay uno corriendo (doble click dos veces): solo abrimos la pagina.
    console.log('  El servidor ya estaba abierto. Abriendo ' + url);
    if (!process.argv.includes('--no-open')) exec(`start "" "${url}"`);
    setTimeout(() => process.exit(0), 1500);
  } else {
    console.error(err);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  Tracking tiesme corriendo en:');
  console.log('  ' + url);
  console.log('');
  console.log('  Cerra esta ventana para apagarlo.');
  if (!process.argv.includes('--no-open')) exec(`start "" "${url}"`);
});
