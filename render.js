// Shared by the blog (app.js) and the writing page (editor.js).
(function () {
  marked.use({ gfm: true, renderer: { html: function (h) { return esc(typeof h === 'string' ? h : (h.text || h.raw || '')); } } });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function scalar(v) {
    v = v.trim();
    if (v.length > 1 && v[0] === v[v.length - 1] && (v[0] === '"' || v[0] === "'")) return v.slice(1, -1);
    if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
    return v;
  }
  // Front matter: simple "key: value", "[a, b]" lists or "- item" lists. Not full YAML.
  function parseFM(text) {
    text = text.replace(/^\uFEFF/, '');
    var m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
    if (!m) return { meta: {}, body: text };
    var meta = {}, key = null;
    m[1].split(/\r?\n/).forEach(function (line) {
      if (!line.trim() || /^\s*#/.test(line)) return;
      var item = /^\s+-\s+(.*)$/.exec(line);
      if (item && key) { if (!Array.isArray(meta[key])) meta[key] = []; meta[key].push(scalar(item[1])); return; }
      var kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
      if (!kv) return;
      key = kv[1].toLowerCase();
      var val = kv[2].trim();
      if (val[0] === '[' && val[val.length - 1] === ']') {
        meta[key] = val.slice(1, -1).split(',').filter(function (x) { return x.trim(); }).map(scalar);
      } else meta[key] = val === '' ? '' : scalar(val);
    });
    return { meta: meta, body: text.slice(m[0].length) };
  }
  function normalize(meta, slug) {
    var tags = meta.tags || [];
    if (typeof tags === 'string') tags = tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    var dir = String(meta.dir || 'auto').toLowerCase();
    return { slug: slug, title: String(meta.title || slug), date: String(meta.date || ''),
      tags: tags.map(String), dir: /^(auto|rtl|ltr)$/.test(dir) ? dir : 'auto',
      description: String(meta.description || ''), draft: meta.draft === true };
  }
  function fixUrl(u, base) {
    if (!u || /^([a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(u)) return u;
    try { return new URL(u, base).href; } catch (e) { return u; }
  }
  // base: folder the .md file lives in, so "files/x.bin" and "img/a.png" resolve next to the post.
  function renderBody(markdown, dir, base) {
    var box = document.createElement('div');
    box.className = 'body';
    if (dir && dir !== 'auto') box.setAttribute('dir', dir);
    box.innerHTML = DOMPurify.sanitize(marked.parse(markdown));
    var abs = new URL(base || './', location.href).href;
    box.querySelectorAll('img').forEach(function (i) { i.src = fixUrl(i.getAttribute('src'), abs); i.loading = 'lazy'; });
    box.querySelectorAll('a[href]').forEach(function (a) { a.setAttribute('href', fixUrl(a.getAttribute('href'), abs)); });
    if (!dir || dir === 'auto') {
      box.querySelectorAll('p,h1,h2,h3,h4,h5,h6,blockquote,ul,ol,li,th,td').forEach(function (n) { n.setAttribute('dir', 'auto'); });
    }
    return box;
  }

  window.BlogRender = { parseFM: parseFM, normalize: normalize, renderBody: renderBody };
  var s = document.getElementById('siteName'), f = document.getElementById('foot');
  if (s) s.textContent = BLOG.title;
  if (f) f.textContent = BLOG.footer;
})();
