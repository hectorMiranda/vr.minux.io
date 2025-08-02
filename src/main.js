// Launcher: discovers registered scenes, renders the catalog, reports device
// capabilities, and boots the selected scene into an App on demand.
import './scenes/index.js'; // side-effect: registers every scene
import { all, search, categories } from './scenes/registry.js';
import { detectCapabilities, capBadges } from './xr/capabilities.js';
import { App } from './core/app.js';
import { createVRButton } from './xr/vr-button.js';

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const kid of kids) node.append(kid?.nodeType ? kid : document.createTextNode(kid ?? ''));
  return node;
};

const state = { app: null, activeCategory: null, query: '' };

function setStatus(msg) {
  $('#status').textContent = msg;
}

function renderCaps(caps) {
  const host = $('#caps');
  host.replaceChildren(
    ...capBadges(caps).map((b) => el('span', { class: `cap ${b.ok ? 'ok' : 'no'}` }, b.label)),
  );
}

function renderSidebar() {
  const nav = $('#categories');
  const cats = ['All', ...categories()];
  nav.replaceChildren(
    ...cats.map((c) =>
      el(
        'a',
        {
          class: `cat-link ${(state.activeCategory ?? 'All') === c ? 'active' : ''}`,
          href: '#',
          onclick: (e) => {
            e.preventDefault();
            state.activeCategory = c === 'All' ? null : c;
            renderSidebar();
            renderGrid();
          },
        },
        c,
      ),
    ),
  );
}

function visibleScenes() {
  let list = state.query ? search(state.query) : all();
  if (state.activeCategory) list = list.filter((s) => s.category === state.activeCategory);
  return list;
}

function renderGrid() {
  const grid = $('#grid');
  const list = visibleScenes();
  setStatus(`${list.length} test${list.length === 1 ? '' : 's'} shown · ${all().length} total`);
  grid.replaceChildren(
    ...list.map((s) =>
      el(
        'article',
        { class: 'card', onclick: () => openScene(s) },
        el('h3', {}, s.title),
        el('p', {}, s.description || '—'),
        el('div', { class: 'tags' }, ...(s.tags || []).map((t) => el('span', { class: 'tag' }, t))),
      ),
    ),
  );
}

async function openScene(meta) {
  location.hash = meta.id;
  $('#grid').hidden = true;
  $('#stage').hidden = false;
  $('#stage-title').textContent = meta.title;
  setStatus(`Loading "${meta.title}"…`);

  const host = $('#canvas-host');
  host.replaceChildren();
  state.app = new App(host);
  await state.app.setScene(meta.factory);

  const xrSlot = $('#xr-slot');
  xrSlot.replaceChildren(await createVRButton(state.app.session));
  setStatus(`Running "${meta.title}".`);
}

function closeScene() {
  state.app?.dispose();
  state.app = null;
  $('#stage').hidden = true;
  $('#grid').hidden = false;
  location.hash = '';
  renderGrid();
}

async function boot() {
  renderCaps(await detectCapabilities());
  renderSidebar();
  renderGrid();

  $('#back').addEventListener('click', closeScene);
  $('#search').addEventListener('input', (e) => {
    state.query = e.target.value;
    renderGrid();
  });

  // Deep link: open the scene named in the URL hash.
  const id = location.hash.slice(1);
  if (id) {
    const meta = all().find((s) => s.id === id);
    if (meta) openScene(meta);
  }
}

boot();
