// Reads everything from the address you opened:
//   /              -> posts/posts.json (list of .md files), then each .md
//   /#my-post      -> posts/my-post.md  (or posts/my-post/index.md)
//   /#tag/esp32    -> list filtered by tag
(function () {
  var R = window.BlogRender, app = document.getElementById('app');

  function el(tag, cls, text, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    for (var a in (attrs || {})) n.setAttribute(a, attrs[a]);
    return n;
  }
  function link(href, text, dir) { var a = el('a', null, text, { href: href }); if (dir) a.setAttribute('dir', dir); return a; }
  function getText(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' ' + r.status);
      return r.text();
    });
  }
  function slugOf(path) {
    var parts = path.split('/'), last = parts.pop(), stem = last.replace(/\.md$/i, '');
    return (stem.toLowerCase() === 'index' && parts.length) ? parts.pop() : stem;
  }
  function folderOf(path) { return path.indexOf('/') > -1 ? path.slice(0, path.lastIndexOf('/') + 1) : ''; }
  function parsePost(path, text) {
    var fm = R.parseFM(text);
    return { path: path, meta: R.normalize(fm.meta, slugOf(path)), body: fm.body };
  }

  function allPosts() {
    return getText('posts/posts.json').then(function (j) {
      var paths = JSON.parse(j), out = new Array(paths.length), i = 0;
      function worker() {
        if (i >= paths.length) return Promise.resolve();
        var n = i++;
        return getText('posts/' + paths[n]).then(function (t) { out[n] = parsePost('posts/' + paths[n], t); }).then(worker);
      }
      var ws = []; for (var k = 0; k < Math.min(6, paths.length); k++) ws.push(worker());
      return Promise.all(ws).then(function () {
        return out.filter(function (p) { return !p.meta.draft; })
          .sort(function (a, b) { return a.meta.date < b.meta.date ? 1 : a.meta.date > b.meta.date ? -1 : 0; });
      });
    });
  }

  function showMessage(text, home) {
    app.textContent = '';
    var p = el('p', 'note', text + ' ');
    if (home) p.appendChild(link('#', 'Back to all posts'));
    app.appendChild(p);
  }

  function showIndex(tag) {
    return allPosts().then(function (posts) {
      var tags = [];
      posts.forEach(function (p) { p.meta.tags.forEach(function (t) { if (tags.indexOf(t) < 0) tags.push(t); }); });
      tags.sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1; });
      app.textContent = '';
      document.title = BLOG.title;
      if (tags.length) {
        var nav = el('nav', 'tags'), all = link('#', 'all');
        if (!tag) all.className = 'on';
        nav.appendChild(all);
        tags.forEach(function (t) { var a = link('#tag/' + encodeURIComponent(t), t); if (t === tag) a.className = 'on'; nav.appendChild(a); });
        app.appendChild(nav);
      }
      var list = posts.filter(function (p) { return !tag || p.meta.tags.indexOf(tag) > -1; });
      if (!list.length) { app.appendChild(el('p', 'note', 'No posts yet. Add a .md file to the posts folder and list it in posts/posts.json.')); return; }
      var ul = el('ul', 'posts');
      list.forEach(function (p) {
        var li = el('li'), a = link('#' + encodeURIComponent(p.meta.slug), '');
        a.appendChild(el('time', null, p.meta.date));
        a.appendChild(el('span', 'ttl', p.meta.title, { dir: 'auto' }));
        if (p.meta.tags.length) a.appendChild(el('span', 'tg', p.meta.tags.join(', '), { dir: 'auto' }));
        li.appendChild(a); ul.appendChild(li);
      });
      app.appendChild(ul);
    });
  }

  function showPost(slug) {
    if (!/^[^\/\\]+$/.test(slug) || slug === '..') return showMessage("This post doesn't exist.", true);
    var first = 'posts/' + slug + '.md', second = 'posts/' + slug + '/index.md';
    return getText(first).then(function (t) { return [first, t]; }, function () {
      return getText(second).then(function (t) { return [second, t]; });
    }).then(function (r) {
      var p = parsePost(r[0], r[1]), art = el('article');
      art.appendChild(el('h1', null, p.meta.title, { dir: 'auto' }));
      var meta = el('div', 'meta'); meta.appendChild(el('time', null, p.meta.date));
      if (p.meta.tags.length) { meta.appendChild(document.createTextNode(' · ')); meta.appendChild(el('span', null, p.meta.tags.join(', '), { dir: 'auto' })); }
      art.appendChild(meta);
      art.appendChild(R.renderBody(p.body, p.meta.dir, folderOf(p.path)));
      var pn = el('nav', 'pn'); art.appendChild(pn);
      app.textContent = ''; app.appendChild(art);
      document.title = p.meta.title + ' — ' + BLOG.title;
      window.BlogUI.enhance(app);
      // previous / next need the list; if posts.json is missing the post still works
      allPosts().then(function (posts) {
        var i = posts.findIndex(function (x) { return x.meta.slug === p.meta.slug; });
        if (i < 0) return;
        var newer = posts[i - 1], older = posts[i + 1];
        pn.appendChild(newer ? link('#' + encodeURIComponent(newer.meta.slug), '← ' + newer.meta.title, 'auto') : el('span'));
        if (older) pn.appendChild(link('#' + encodeURIComponent(older.meta.slug), older.meta.title + ' →', 'auto'));
      }).catch(function () {});
    }).catch(function () { showMessage("This post doesn't exist.", true); });
  }

  function route() {
    var h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    window.scrollTo(0, 0);
    var go = !h ? showIndex('') : /^tag\//.test(h) ? showIndex(h.slice(4)) : showPost(h);
    Promise.resolve(go).catch(function () { showMessage("Couldn't load posts. Check that posts/posts.json exists, and open the site over http (not by double-clicking the file)."); });
  }
  window.addEventListener('hashchange', route);
  route();
})();
