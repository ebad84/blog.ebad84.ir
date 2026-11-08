// Writing page: fill the fields, write Markdown, copy or download the finished .md file.
(function () {
  var R = window.BlogRender, KEY = 'blog-editor-draft';
  var $ = function (id) { return document.getElementById(id); };
  var f = { title: $('title'), slug: $('slug'), date: $('date'), tags: $('tags'), dir: $('dir'), desc: $('desc'), draft: $('draft'), text: $('text') };
  var slugTouched = false;

  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function yamlStr(s) {
    if (!/[:#\[\]]|^[-?!&*>|'"%@`]|^\s|\s$/.test(s)) return s;
    if (s.indexOf('"') < 0) return '"' + s + '"';
    if (s.indexOf("'") < 0) return "'" + s + "'";
    return '"' + s.replace(/"/g, "'") + '"';
  }
  function build() {
    var tags = f.tags.value.split(/[,،]/).map(function (t) { return t.trim(); }).filter(Boolean);
    var fm = ['---', 'title: ' + yamlStr(f.title.value.trim() || 'Untitled'), 'date: ' + (f.date.value || today())];
    if (tags.length) fm.push('tags: [' + tags.join(', ') + ']');
    if (f.dir.value !== 'auto') fm.push('dir: ' + f.dir.value);
    if (f.desc.value.trim()) fm.push('description: ' + yamlStr(f.desc.value.trim()));
    if (f.draft.checked) fm.push('draft: true');
    fm.push('---', '');
    return fm.join('\n') + '\n' + f.text.value.replace(/\s+$/, '') + '\n';
  }
  function fileName() { return (f.slug.value.trim() || slugify(f.title.value) || 'my-post'); }

  function update() {
    if (!slugTouched) f.slug.value = slugify(f.title.value);
    $('out').textContent = build();
    var pv = $('preview'); pv.textContent = '';
    pv.appendChild(R.renderBody(f.text.value, f.dir.value, 'posts/'));
    window.BlogUI.enhance(pv);
    var n = fileName();
    $('steps').textContent = 'Save it as posts/' + n + '.md, then add "' + n + '.md" to the list in posts/posts.json.';
    try { localStorage.setItem(KEY, JSON.stringify({ title: f.title.value, slug: f.slug.value, touched: slugTouched, date: f.date.value, tags: f.tags.value, dir: f.dir.value, desc: f.desc.value, draft: f.draft.checked, text: f.text.value })); } catch (e) {}
  }

  function restore() {
    var d = null; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    f.date.value = (d && d.date) || today();
    if (!d) return;
    f.title.value = d.title || ''; f.slug.value = d.slug || ''; slugTouched = !!d.touched; f.tags.value = d.tags || '';
    f.dir.value = d.dir || 'auto'; f.desc.value = d.desc || ''; f.draft.checked = !!d.draft; f.text.value = d.text || '';
  }

  f.slug.addEventListener('input', function () { slugTouched = f.slug.value !== ''; });
  Object.keys(f).forEach(function (k) { f[k].addEventListener('input', update); f[k].addEventListener('change', update); });

  $('copy').addEventListener('click', function () {
    var b = $('copy'), t = build();
    function done() { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1400); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done);
    else { var r = document.createRange(); r.selectNodeContents($('out')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); try { document.execCommand('copy'); done(); } catch (e) {} }
  });
  $('dl').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([build()], { type: 'text/markdown;charset=utf-8' }));
    a.download = fileName() + '.md';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('clear').addEventListener('click', function () {
    if (!confirm('Clear everything?')) return;
    Object.keys(f).forEach(function (k) { if (f[k].type === 'checkbox') f[k].checked = false; else f[k].value = ''; });
    f.dir.value = 'auto'; f.date.value = today(); slugTouched = false; update();
  });
  $('open').addEventListener('change', function (e) {
    var file = e.target.files[0]; if (!file) return;
    file.text().then(function (t) {
      var fm = R.parseFM(t), m = R.normalize(fm.meta, file.name.replace(/\.md$/i, ''));
      f.title.value = fm.meta.title ? m.title : ''; f.slug.value = m.slug; slugTouched = true;
      f.date.value = m.date || today(); f.tags.value = m.tags.join(', '); f.dir.value = m.dir;
      f.desc.value = m.description; f.draft.checked = m.draft; f.text.value = fm.body.replace(/^\s*\n/, '');
      e.target.value = ''; update();
    });
  });

  restore(); update();
})();
