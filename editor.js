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

  // ---- publish: one commit (post + posts.json) through the GitHub API ----
  var B = BLOG.github, TKEY = 'blog-gh-token', repo = '/repos/' + B.owner + '/' + B.repo;
  var dirName = String(B.path || 'posts').replace(/^\/+|\/+$/g, '');
  $('target').textContent = B.owner + '/' + B.repo + ' (' + B.branch + ')';
  var tokenEl = $('token'), statusEl = $('status');

  function savedToken() { try { return localStorage.getItem(TKEY) || sessionStorage.getItem(TKEY) || ''; } catch (e) { return ''; } }
  function storeToken(t, remember) {
    try { localStorage.removeItem(TKEY); sessionStorage.removeItem(TKEY); (remember ? localStorage : sessionStorage).setItem(TKEY, t); } catch (e) {}
  }
  function say(msg, href) {
    statusEl.textContent = msg;
    if (href) { statusEl.appendChild(document.createTextNode(' ')); var a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'open'; statusEl.appendChild(a); }
  }
  function gh(path, o) {
    o = o || {};
    var headers = { 'Authorization': 'Bearer ' + tokenEl.value.trim(), 'Accept': o.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json' };
    if (o.body) headers['Content-Type'] = 'application/json';
    return fetch('https://api.github.com' + path, { method: o.method || 'GET', headers: headers, body: o.body ? JSON.stringify(o.body) : undefined }).then(function (r) {
      if (o.raw && r.ok) return r.text();
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var err = new Error(j.message || ('HTTP ' + r.status)); err.status = r.status; throw err; }
        return j;
      });
    });
  }
  function explain(err) {
    if (err.status === 401) return 'GitHub rejected the token (expired or wrong).';
    if (err.status === 403 || err.status === 404) return 'The token can\'t write to ' + B.owner + '/' + B.repo + '. It needs access to this repo with Contents: Read and write. (' + err.message + ')';
    if (err.status === 409 || err.status === 422) return 'The branch changed while publishing. Press Publish again. (' + err.message + ')';
    return err.message || 'Something went wrong.';
  }

  function watchRun(sha, tries) {
    if (tries > 40) return say('Committed. Check the Actions tab for the deploy.', 'https://github.com/' + B.owner + '/' + B.repo + '/actions');
    gh(repo + '/actions/runs?head_sha=' + sha + '&per_page=1').then(function (j) {
      var run = (j.workflow_runs || [])[0];
      if (!run) return setTimeout(function () { watchRun(sha, tries + 1); }, 4000);
      if (run.status !== 'completed') { say('Deploy to Arvan: ' + run.status.replace('_', ' ') + '…', run.html_url); return setTimeout(function () { watchRun(sha, tries + 1); }, 5000); }
      say(run.conclusion === 'success' ? 'Deployed. The post is live.' : 'Deploy finished with: ' + run.conclusion + '.', run.html_url);
    }, function () { say('Committed. Deploy status needs the token to also read Actions; check the Actions tab.', 'https://github.com/' + B.owner + '/' + B.repo + '/actions'); });
  }

  function publish() {
    var slug = fileName();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return say('File name must be letters, numbers and dashes (for example my-post).');
    if (!f.title.value.trim()) return say('Add a title first.');
    if (!tokenEl.value.trim()) return say('Paste a GitHub token first.');
    storeToken(tokenEl.value.trim(), $('remember').checked);
    var btn = $('publish'); btn.disabled = true; say('Reading the repository…');
    var ref = repo + '/git/ref/heads/' + encodeURIComponent(B.branch), headSha, list, postPath, existed;
    gh(ref).then(function (r) { headSha = r.object.sha; return gh(repo + '/git/commits/' + headSha); })
    .then(function (c) {
      var treeSha = c.tree.sha;
      return gh(repo + '/contents/' + dirName + '/posts.json?ref=' + encodeURIComponent(B.branch), { raw: true })
        .then(function (t) { return JSON.parse(t); }, function (e) { if (e.status === 404) return []; throw e; })
        .then(function (arr) {
          list = Array.isArray(arr) ? arr : [];
          var inFolder = slug + '/index.md', flat = slug + '.md';
          existed = list.indexOf(inFolder) > -1 || list.indexOf(flat) > -1;
          var entry = list.indexOf(inFolder) > -1 ? inFolder : flat;
          postPath = dirName + '/' + entry;
          if (!existed) list.push(entry);
          say('Creating the commit…');
          return Promise.all([
            gh(repo + '/git/blobs', { method: 'POST', body: { content: build(), encoding: 'utf-8' } }),
            gh(repo + '/git/blobs', { method: 'POST', body: { content: JSON.stringify(list, null, 2) + '\n', encoding: 'utf-8' } })
          ]).then(function (b) {
            return gh(repo + '/git/trees', { method: 'POST', body: { base_tree: treeSha, tree: [
              { path: postPath, mode: '100644', type: 'blob', sha: b[0].sha },
              { path: dirName + '/posts.json', mode: '100644', type: 'blob', sha: b[1].sha }] } });
          });
        });
    })
    .then(function (t) { return gh(repo + '/git/commits', { method: 'POST', body: { message: (existed ? 'Update post: ' : 'Add post: ') + slug, tree: t.sha, parents: [headSha] } }); })
    .then(function (c) { return gh(ref.replace('/git/ref/', '/git/refs/'), { method: 'PATCH', body: { sha: c.sha } }).then(function () { return c; }); })
    .then(function (c) { say((existed ? 'Updated ' : 'Published ') + postPath + '. Waiting for the deploy…', 'https://github.com/' + B.owner + '/' + B.repo + '/commit/' + c.sha); watchRun(c.sha, 0); })
    .catch(function (err) { say(explain(err)); })
    .then(function () { btn.disabled = false; });
  }
  tokenEl.value = savedToken(); $('remember').checked = (function () { try { return !!localStorage.getItem(TKEY); } catch (e) { return false; } })();
  $('publish').addEventListener('click', publish);
  $('forget').addEventListener('click', function () { try { localStorage.removeItem(TKEY); sessionStorage.removeItem(TKEY); } catch (e) {} tokenEl.value = ''; $('remember').checked = false; say('Token removed from this browser.'); });

  restore(); update();
})();
