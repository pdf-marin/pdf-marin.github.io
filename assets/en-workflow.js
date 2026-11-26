/* Enhance the existing English examples on small screens; keep the source content. */
(() => {
  'use strict';
  const section = document.querySelector('html[lang="en"] #excel-demo');
  if (!section || section.dataset.workflowBound) return;
  const steps = section.querySelector('.excel-steps');
  const stage = section.querySelector('.excel-images');
  if (!steps || !stage) return;
  const items = [...steps.children];
  const panels = [...stage.querySelectorAll(':scope > figure')];
  if (items.length !== 3 || panels.length !== items.length ||
      panels.some(panel => !panel.querySelector('a[href] img'))) return;
  section.dataset.workflowBound = 'true';

  const mobile = matchMedia('(max-width: 760px)');
  const original = items.map(item => [...item.childNodes]);
  const remember = (node, names) => names.map(name => [name, node.getAttribute(name)]);
  const restore = (node, attrs) => attrs.forEach(([name, value]) => {
    if (value === null) node.removeAttribute(name); else node.setAttribute(name, value);
  });
  const stepAttrs = remember(steps, ['role', 'aria-label', 'aria-orientation']);
  const itemAttrs = items.map(item => remember(item, ['role']));
  const panelAttrs = panels.map(panel => remember(panel,
    ['id', 'role', 'aria-labelledby', 'tabindex', 'hidden', 'inert']));
  const buttons = items.map((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'excel-workflow-tab';
    button.id = 'excel-workflow-tab-' + (index + 1);
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', 'excel-workflow-panel-' + (index + 1));
    button.addEventListener('click', () => select(index));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      else if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else return;
      event.preventDefault();
      select(next);
      buttons[next].focus({preventScroll: true});
    });
    return button;
  });
  const hint = document.createElement('p');
  hint.className = 'excel-workflow-hint';
  hint.textContent = 'Choose a step to compare. Select the image to enlarge.';
  let selected = 0;
  let enabled = false;

  function select(index) {
    selected = index;
    buttons.forEach((button, current) => {
      const active = current === index;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      panels[current].hidden = !active;
      panels[current].toggleAttribute('inert', !active);
    });
  }

  function sync() {
    if (mobile.matches === enabled) return;
    const focused = document.activeElement;
    if (mobile.matches) {
      const focusedPanel = panels.findIndex(panel => panel.contains(focused));
      if (focusedPanel !== -1) selected = focusedPanel;
      steps.setAttribute('role', 'tablist');
      steps.setAttribute('aria-label', 'PDF to Excel workflow');
      steps.setAttribute('aria-orientation', 'horizontal');
      items.forEach((item, index) => {
        item.setAttribute('role', 'presentation');
        buttons[index].replaceChildren(...original[index]);
        item.replaceChildren(buttons[index]);
        const panel = panels[index];
        panel.id = 'excel-workflow-panel-' + (index + 1);
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', buttons[index].id);
        panel.tabIndex = 0;
      });
      steps.after(hint);
      section.classList.add('excel-workflow-ready');
      select(selected);
    } else {
      const focusedTab = buttons.indexOf(focused);
      section.classList.remove('excel-workflow-ready');
      hint.remove();
      restore(steps, stepAttrs);
      items.forEach((item, index) => {
        item.replaceChildren(...original[index]);
        restore(item, itemAttrs[index]);
        restore(panels[index], panelAttrs[index]);
      });
      if (focusedTab !== -1) panels[focusedTab].querySelector('a').focus({preventScroll: true});
    }
    enabled = mobile.matches;
  }
  mobile.addEventListener('change', sync);
  sync();
})();
