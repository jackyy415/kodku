(function () {
  var root = document.getElementById('portfolio');
  if (!root) return;

  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
  var panels = Array.prototype.slice.call(root.querySelectorAll('[role="tabpanel"]'));
  var dots = Array.prototype.slice.call(root.querySelectorAll('.portfolio-dot'));
  var metaEl = root.querySelector('.portfolio-meta');
  var scopePanel = document.getElementById('scope-panel');
  var scopeFields = scopePanel
    ? {
        problem: scopePanel.querySelector('[data-scope="problem"]'),
        users: scopePanel.querySelector('[data-scope="users"]'),
        build: scopePanel.querySelector('[data-scope="build"]'),
        handover: scopePanel.querySelector('[data-scope="handover"]'),
        terms: scopePanel.querySelector('[data-scope="terms"]')
      }
    : null;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var activeIndex = tabs.findIndex(function (tab) {
    return tab.getAttribute('aria-selected') === 'true';
  });
  if (activeIndex < 0) activeIndex = 0;

  function updateScope(tab) {
    if (!scopeFields) return;
    Object.keys(scopeFields).forEach(function (key) {
      var el = scopeFields[key];
      if (el) el.textContent = tab.getAttribute('data-' + key) || '';
    });
  }

  function updateMeta(tab) {
    if (!metaEl) return;
    metaEl.innerHTML =
      '<span class="portfolio-meta-problem">' +
      (tab.getAttribute('data-meta-problem') || '') +
      '</span>' +
      '<span class="portfolio-meta-users">' +
      (tab.getAttribute('data-meta-users') || '') +
      '</span>';
  }

  function selectTab(index) {
    if (index < 0 || index >= tabs.length) return;
    activeIndex = index;
    var tab = tabs[index];

    tabs.forEach(function (t, i) {
      var selected = i === index;
      t.setAttribute('aria-selected', selected ? 'true' : 'false');
      t.tabIndex = selected ? 0 : -1;
    });

    panels.forEach(function (panel, i) {
      var active = i === index;
      panel.classList.toggle('is-active', active);
      panel.setAttribute('aria-hidden', active ? 'false' : 'true');
      if (reducedMotion) {
        panel.hidden = !active;
      } else {
        panel.hidden = false;
      }
    });

    dots.forEach(function (dot, i) {
      dot.classList.toggle('is-active', i === index);
      dot.setAttribute('aria-current', i === index ? 'true' : 'false');
    });

    root.dataset.accent = tab.getAttribute('data-accent') || 'teal';
    updateMeta(tab);
    updateScope(tab);
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      selectTab(index);
    });

    tab.addEventListener('keydown', function (event) {
      var next = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        next = (index + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        next = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = tabs.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      selectTab(next);
      tabs[next].focus();
    });
  });

  dots.forEach(function (dot, index) {
    dot.addEventListener('click', function () {
      selectTab(index);
      tabs[index].focus();
    });
  });

  if (!reducedMotion) {
    root.classList.add('portfolio--animated');
  }

  selectTab(activeIndex);
})();
