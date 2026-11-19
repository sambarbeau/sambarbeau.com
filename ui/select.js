// Keep each select as the form and application value. One popup serves all triggers.
(() => {
  const controls = new WeakMap();
  const list = document.createElement('div');
  list.className = 'site-options';
  list.id = 'site-select-options';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  document.body.append(list);

  let openSelect, active = -1, search = '', lastKeyTime = 0;
  let frame = 0, nextId = 0;

  function sync(select) {
    const button = controls.get(select);
    const value = select.selectedOptions[0]?.label || '';
    if (button.firstChild.textContent !== value) button.firstChild.textContent = value;
    button.disabled = select.matches(':disabled');
  }

  function enhance(select) {
    if (controls.has(select) || select.hidden || select.multiple || select.size > 1) return;
    const hadFocus = document.activeElement === select;
    const labels = Array.from(select.labels);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'site-select';
    button.id = select.id ? select.id + '-control' : 'site-select-control-' + ++nextId;
    button.setAttribute('role', 'combobox');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', list.id);
    for (const attr of ['aria-label', 'aria-labelledby', 'aria-describedby']) {
      if (select.hasAttribute(attr)) button.setAttribute(attr, select.getAttribute(attr));
    }
    if (!button.hasAttribute('aria-label') && !button.hasAttribute('aria-labelledby')) {
      const names = labels.map(label => {
        const copy = label.cloneNode(true);
        copy.querySelectorAll('select, input, button').forEach(el => el.remove());
        return copy.textContent.trim();
      });
      button.setAttribute('aria-label', names.join(' '));
    }
    labels.forEach(label => { label.htmlFor = button.id; });
    button.append(document.createElement('span'));
    controls.set(select, button);
    sync(select);
    select.after(button);
    select.classList.add('site-select-source');
    select.hidden = true;
    if (hadFocus) button.focus({ preventScroll: true });
    button.addEventListener('click', () => openSelect === select ? close() : open(select));
    button.addEventListener('keydown', event => keyboard(event, select));
    button.addEventListener('blur', () => { if (openSelect === select) close(); });
  }

  function enabled(index) {
    const option = openSelect?.options[index];
    return option && !option.hidden && !option.matches(':disabled');
  }

  function activate(index, scroll = true) {
    if (!enabled(index)) return;
    list.children[active]?.removeAttribute('data-active');
    active = index;
    const row = list.children[index];
    row.setAttribute('data-active', '');
    controls.get(openSelect).setAttribute('aria-activedescendant', row.id);
    if (scroll) {
      if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
      else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight)
        list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
    }
  }

  function move(start, step) {
    for (let i = start; i >= 0 && i < list.children.length; i += step) {
      if (enabled(i)) { activate(i); break; }
    }
  }

  function position() {
    const rect = controls.get(openSelect).getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    if (!rect.width || rect.bottom < 0 || rect.top > height) { close(); return; }
    const below = height - rect.bottom - 12, above = rect.top - 12;
    const up = below < Math.min(list.scrollHeight + 2, 256) && above > below;
    list.style.minWidth = Math.min(rect.width, width - 16) + 'px';
    list.style.maxHeight = Math.max(0, Math.min(320, up ? above : below)) + 'px';
    list.style.left = Math.max(8, Math.min(rect.left, width - list.offsetWidth - 8)) + 'px';
    list.style.top = (up ? rect.top - list.offsetHeight - 4 : rect.bottom + 4) + 'px';
  }

  function renderOptions() {
    const select = openSelect;
    active = -1;
    controls.get(select).removeAttribute('aria-activedescendant');
    const rows = Array.from(select.options, (option, i) => {
      const row = document.createElement('div');
      row.id = list.id + '-' + i;
      row.dataset.index = i;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(option.selected));
      if (option.matches(':disabled')) row.setAttribute('aria-disabled', 'true');
      row.hidden = option.hidden;
      row.textContent = option.label;
      return row;
    });
    list.replaceChildren(...rows);
    position();
    if (enabled(select.selectedIndex)) activate(select.selectedIndex);
    else move(0, 1);
  }

  function open(select) {
    close();
    openSelect = select;
    const button = controls.get(select);
    button.focus({ preventScroll: true });
    button.setAttribute('aria-expanded', 'true');
    list.setAttribute('aria-labelledby', button.id);
    list.hidden = false;
    renderOptions();
  }

  function close(commit = false) {
    if (!openSelect) return;
    const select = openSelect, index = active, button = controls.get(select);
    const changed = commit && enabled(index) && index !== select.selectedIndex;
    openSelect = undefined;
    active = -1;
    search = '';
    list.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.removeAttribute('aria-activedescendant');
    if (changed) {
      select.selectedIndex = index;
      sync(select);
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function keyboard(event, select) {
    if (event.ctrlKey || event.metaKey || event.isComposing) return;
    const key = event.key, wasOpen = openSelect === select;
    if (key === 'Tab') { if (wasOpen) close(true); return; }
    if (key === 'Escape') {
      if (wasOpen) { event.preventDefault(); event.stopPropagation(); close(); }
      return;
    }
    if (!['Enter', ' ', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key) &&
        (key.length !== 1 || event.altKey)) return;
    event.preventDefault();
    if (!wasOpen) open(select);
    if (key === 'Enter' || key === ' ') { if (wasOpen) close(true); return; }
    if (key === 'Home') { move(0, 1); return; }
    if (key === 'End') { move(list.children.length - 1, -1); return; }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      const step = key === 'ArrowDown' ? 1 : -1;
      if (wasOpen) move(active + step, step);
      return;
    }
    const now = Date.now(), letter = key.toLocaleLowerCase();
    search = now - lastKeyTime > 650 ? letter : search + letter;
    lastKeyTime = now;
    const prefix = Array.from(search).every(c => c === letter) ? letter : search;
    const start = Math.max(0, active + (prefix.length === 1 ? 1 : 0));
    for (let n = 0; n < select.length; n++) {
      const i = (start + n) % select.length;
      if (enabled(i) && select.options[i].label.toLocaleLowerCase().startsWith(prefix)) { activate(i); break; }
    }
  }

  list.addEventListener('mousedown', e => e.preventDefault()); // Keep keyboard focus on the trigger.
  list.addEventListener('pointermove', e => {
    const row = e.target.closest('[role="option"]');
    if (row && e.pointerType === 'mouse') activate(Number(row.dataset.index), false);
  });
  list.addEventListener('click', e => {
    const row = e.target.closest('[role="option"]');
    if (!row || !enabled(Number(row.dataset.index))) return;
    activate(Number(row.dataset.index), false);
    close(true);
  });
  document.addEventListener('pointerdown', e => {
    if (openSelect && !list.contains(e.target) && !controls.get(openSelect).contains(e.target)) close();
  }, true);
  window.addEventListener('resize', () => { if (openSelect) position(); });
  document.addEventListener('scroll', e => { if (openSelect && e.target !== list) position(); }, true);

  // Existing tools also change values from Reset, a preset, or the URL's song hash.
  function scheduleSync() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      document.querySelectorAll('select.site-select-source').forEach(sync);
    });
  }
  for (const event of ['input', 'change', 'click', 'reset', 'hashchange', 'pageshow'])
    window.addEventListener(event, scheduleSync, true);

  document.querySelectorAll('select').forEach(enhance);
  new MutationObserver(records => {
    if (openSelect && !openSelect.isConnected) close();
    for (const record of records) {
      const select = record.target.closest?.('select');
      if (select && controls.has(select)) {
        sync(select);
        if (openSelect === select) renderOptions();
      }
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches('select')) enhance(node);
        else node.querySelectorAll('select').forEach(enhance);
      }
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'selected'] });
})();
