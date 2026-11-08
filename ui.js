// Shared by both render modes: theme toggle + copy buttons on code blocks.
(function () {
  var KEY = 'blog-theme', root = document.documentElement;
  var btn = document.getElementById('themeBtn');

  function label() { btn.textContent = root.getAttribute('data-theme') === 'dark' ? 'Light' : 'Dark'; }
  btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
    label();
  });
  label();

  function copy(text, done) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () {});
      return;
    }
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(ta);
  }

  window.BlogUI = {
    enhance: function (scope) {
      scope.querySelectorAll('.body pre').forEach(function (pre) {
        if (pre.parentNode.classList.contains('code')) return;
        var code = pre.querySelector('code');
        var m = code && /language-([\w+#-]+)/.exec(code.className);
        var wrap = document.createElement('div'); wrap.className = 'code';
        var head = document.createElement('div'); head.className = 'code-head';
        var name = document.createElement('span'); name.textContent = m ? m[1] : 'code';
        var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Copy';
        b.addEventListener('click', function () {
          copy(pre.textContent, function () {
            b.textContent = 'Copied';
            setTimeout(function () { b.textContent = 'Copy'; }, 1400);
          });
        });
        head.appendChild(name); head.appendChild(b);
        pre.parentNode.insertBefore(wrap, pre);
        wrap.appendChild(head); wrap.appendChild(pre);
      });
    }
  };
  window.BlogUI.enhance(document);
})();
