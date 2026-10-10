/* Navigation for both the signed-in dashboard and public bot demo. */
(() => {
  'use strict';
  const views = ['overview','setup','answers','customers','automation','install','account'];
  const words = (fi,sv,en) => document.documentElement.lang === 'sv' ? sv : document.documentElement.lang === 'en' ? en : fi;
  let activeSelect = null;
  let cleanup = () => {};

  function mount() {
    const select = document.querySelector('#app #dashboardSectionSelect');
    const top = select?.closest('.dashboard-topbar');
    if (!top) { if (activeSelect) { cleanup(); activeSelect = null; } return; }
    if (activeSelect === select) return;
    cleanup();
    activeSelect = select;
    const demo = location.pathname === '/assistant';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'dashboard-menu-toggle';
    toggle.setAttribute('aria-controls','dashboard-drawer');
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-label', words('Avaa valikko','Öppna menyn','Open menu'));
    toggle.innerHTML = '<span class="dashboard-menu-lines" aria-hidden="true"><span></span><span></span><span></span></span>';
    top.classList.add('dashboard-has-drawer');
    top.append(toggle);

    const layer = document.createElement('div');
    layer.id = 'dashboard-drawer';
    layer.className = 'dashboard-drawer-layer';
    layer.setAttribute('inert','');
    layer.setAttribute('aria-hidden','true');
    const backdrop = document.createElement('button');
    backdrop.className = 'dashboard-drawer-backdrop';
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label',words('Sulje','Stäng','Close'));
    const panel = document.createElement('aside');
    panel.className = 'dashboard-drawer-panel';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','true');
    panel.setAttribute('aria-labelledby','dashboard-drawer-title');
    const head = document.createElement('div');
    head.className = 'dashboard-drawer-head';
    const heading = document.createElement('div');
    heading.className = 'dashboard-drawer-heading';
    const kicker = document.createElement('small');
    kicker.textContent = 'RESPONDO AI';
    const title = document.createElement('strong');
    title.id = 'dashboard-drawer-title';
    title.textContent = words('Valikko','Meny','Menu');
    heading.append(kicker,title);
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'dashboard-drawer-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label',words('Sulje valikko','Stäng menyn','Close menu'));
    head.append(heading,closeBtn);
    const sub = document.createElement('p');
    sub.className = 'dashboard-drawer-subheading';
    sub.textContent = demo ? words('Tutustu kaikkiin toimintoihin','Upptäck alla funktioner','Explore all features')
      : words('Valitse hallittava osio','Välj vad du vill hantera','Choose a section to manage');
    const nav = document.createElement('nav');
    nav.className = 'dashboard-drawer-nav';
    nav.setAttribute('aria-label',words('Hallintapaneelin osiot','Kontrollpanelens avsnitt','Dashboard sections'));
    views.forEach((view,i) => {
      const option = [...select.options].find(o => o.value === view);
      if (!option) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dashboard-drawer-link';
      button.dataset.drawerSection = view;
      const number = document.createElement('span');
      number.className = 'dashboard-drawer-number';
      number.textContent = String(i+1).padStart(2,'0');
      const label = document.createElement('span');
      label.className = 'dashboard-drawer-label';
      label.textContent = option.textContent.trim();
      const arrow = document.createElement('span');
      arrow.className = 'dashboard-drawer-arrow';
      arrow.textContent = '›';
      arrow.setAttribute('aria-hidden','true');
      button.append(number,label,arrow);
      button.addEventListener('click',() => {
        select.value = view;
        select.dispatchEvent(new Event('change',{bubbles:true}));
        hide(false);
        toggle.focus();
      });
      nav.append(button);
    });
    const footer = document.createElement('div');
    footer.className = 'dashboard-drawer-footer';
    if (demo) {
      ['.demo-header-trial','.demo-header-login'].forEach((selector,i) => {
        const original = top.querySelector(selector);
        if (!original?.href) return;
        const link = document.createElement('a');
        link.className = i === 0 ? 'dashboard-drawer-cta' : 'dashboard-drawer-secondary';
        link.href = original.href;
        link.textContent = original.textContent.trim();
        footer.append(link);
      });
    } else {
      [['workspaceAddButton',words('＋ Lisää yritys','＋ Lägg till företag','＋ Add company'),'dashboard-drawer-secondary'],
       ['logoutTop',words('Kirjaudu ulos','Logga ut','Log out'),'dashboard-drawer-logout']].forEach(([id,label,cls]) => {
        const target = document.getElementById(id);
        if (!target) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = cls;
        b.textContent = label;
        b.addEventListener('click',() => { hide(false); target.click(); });
        footer.append(b);
      });
    }
    const langSection = document.createElement('div');
    langSection.className = 'dashboard-drawer-language';
    langSection.innerHTML = '<p>' + words('Kieli','Språk','Language') + '</p><div class="dashboard-drawer-language-buttons"><button type="button" data-drawer-lang="fi">Suomi</button><button type="button" data-drawer-lang="sv">Svenska</button><button type="button" data-drawer-lang="en">English</button></div>';
    langSection.querySelectorAll('[data-drawer-lang]').forEach(button => {
      const lang = button.dataset.drawerLang;
      button.setAttribute('aria-pressed', String(lang === document.documentElement.lang));
      button.addEventListener('click', () => {
        const target = top.querySelector('.premium-language-picker [data-lang-button="' + lang + '"]');
        if (target) { hide(false); target.click(); }
      });
    });
    panel.append(head,sub,nav,langSection,footer);
    layer.append(backdrop,panel);
    document.body.append(layer);
    let priorFocus = null;
    function sync() {
      layer.querySelectorAll('[data-drawer-section]').forEach(button => {
        const yes = button.dataset.drawerSection === select.value;
        button.classList.toggle('active',yes);
        if (yes) button.setAttribute('aria-current','page');
        else button.removeAttribute('aria-current');
      });
    }
    function hide(restore = true) {
      layer.classList.remove('is-open');
      layer.setAttribute('inert','');
      layer.setAttribute('aria-hidden','true');
      toggle.setAttribute('aria-expanded','false');
      document.body.classList.remove('dashboard-drawer-open');
      if (restore && priorFocus?.isConnected) priorFocus.focus();
      priorFocus = null;
    }
    function show() {
      priorFocus = document.activeElement;
      sync();
      layer.removeAttribute('inert');
      layer.setAttribute('aria-hidden','false');
      layer.classList.add('is-open');
      toggle.setAttribute('aria-expanded','true');
      document.body.classList.add('dashboard-drawer-open');
      closeBtn.focus();
    }
    function keyboard(e) {
      if (!layer.classList.contains('is-open')) return;
      if (e.key === 'Escape') { e.preventDefault(); hide(); }
      if (e.key !== 'Tab') return;
      const items = [...panel.querySelectorAll('button:not([disabled]),a[href]')];
      if (!items.length) return;
      if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0].focus(); }
    }
    toggle.addEventListener('click',() => layer.classList.contains('is-open') ? hide() : show());
    closeBtn.addEventListener('click',() => hide());
    backdrop.addEventListener('click',() => hide());
    select.addEventListener('change',sync);
    document.addEventListener('keydown',keyboard);
    sync();
    cleanup = () => {
      hide(false);
      select.removeEventListener('change',sync);
      document.removeEventListener('keydown',keyboard);
      toggle.remove();
      layer.remove();
      top.classList.remove('dashboard-has-drawer');
    };
  }
  function start() {
    const app = document.getElementById('app');
    if (!app) return;
    mount();
    new MutationObserver(mount).observe(app,{childList:true,subtree:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
