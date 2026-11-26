const hoursUrl = 'https://h4hours.org/';
const progressKey = 'h4-team-checklists-v1';
const page = document.body.dataset.page;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(text, href, className) {
  const node = element('a', text, className);
  const url = new URL(href, location.href);
  if (url.origin !== location.origin && url.protocol !== 'https:') {
    throw new Error('Unsupported resource URL');
  }
  node.href = url.href;
  return node;
}

function list(items, tag, format = item => document.createTextNode(item)) {
  const node = element(tag);
  for (const item of items) {
    const row = element('li');
    row.append(format(item));
    node.append(row);
  }
  return node;
}

async function load(name) {
  const response = await fetch(new URL(`../content/${name}.json`, import.meta.url));
  if (!response.ok) throw new Error(`Unable to load ${name}`);
  return response.json();
}

function finish(listId, render) {
  const container = document.getElementById(listId);
  render(container).catch(() => {
    container.replaceChildren(element('p', 'This section could not load. Refresh the page to try again.', 'notice'));
  }).finally(() => container.setAttribute('aria-busy', 'false'));
}

function revealAnchor(container) {
  const id = location.hash.slice(1);
  const target = document.getElementById(id);
  if (!target || !container.contains(target)) return;

  const disclosure = target.matches('details') ? target : target.querySelector('details');
  if (disclosure) disclosure.open = true;
  requestAnimationFrame(() => target.scrollIntoView());
}

function button(text, className = 'button button-quiet') {
  const node = element('button', text, className);
  node.type = 'button';
  return node;
}

let announcementTimer;
function announce(text) {
  let status = document.querySelector('.copy-status');
  if (!status) {
    status = element('div', '', 'copy-status');
    status.role = 'status';
    document.body.append(status);
  }
  status.textContent = text;
  clearTimeout(announcementTimer);
  announcementTimer = setTimeout(() => { status.textContent = ''; }, 4000);
}

function manualCopy(text, source) {
  const dialog = element('dialog');
  dialog.setAttribute('aria-labelledby', 'manual-copy-title');
  const title = element('h2', 'Copy the text');
  title.id = 'manual-copy-title';
  const instructions = element('p', 'Automatic copying is unavailable. Select and copy the text below.');
  const field = element('textarea');
  field.value = text;
  field.readOnly = true;
  field.setAttribute('aria-label', 'Text to copy');
  const close = button('Close');
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    dialog.remove();
    source.focus();
  }, { once: true });
  dialog.append(title, instructions, field, close);
  document.body.append(dialog);
  dialog.showModal();
  field.focus();
  field.select();
}

document.addEventListener('click', async event => {
  const source = event.target.closest('button[data-copy]');
  if (!source) return;
  try {
    await navigator.clipboard.writeText(source.dataset.copy);
    announce(source.dataset.copyKind === 'assignment'
      ? 'Assignment text copied. Ask your H4 lead to assign it in H4Hours.'
      : 'Text copied.');
  } catch {
    manualCopy(source.dataset.copy, source);
  }
});

async function renderMissions(container) {
  const [missions, tasks] = await Promise.all([load('missions'), load('tasks')]);
  container.replaceChildren(...missions.map(mission => {
    const card = element('details', '', 'panel');
    card.id = mission.id;
    const body = element('div', '', 'panel-body');
    const related = tasks.filter(task => task.missions.includes(mission.id));
    body.append(
      element('h3', 'Steps'), list(mission.steps, 'ol'),
      element('h3', 'Resources'), list(mission.resources, 'ul', resource => link(resource.label, resource.url)),
      element('h3', 'Get approval'), element('p', mission.approval),
      element('h3', 'You’re done when'), element('p', mission.complete)
    );
    if (related.length) {
      body.append(element('h3', 'Task cards'),
        list(related, 'ul', task => link(`${task.id} · ${task.title}`, `../tasks/#${encodeURIComponent(task.id)}`)));
    }
    const summary = element('summary');
    summary.append(
      element('span', `Mission ${mission.number} · ${mission.title}`),
      element('span', mission.goal, 'summary-note')
    );
    card.append(summary, body);
    return card;
  }));
  revealAnchor(container);
  window.addEventListener('hashchange', () => revealAnchor(container));
}

function readProgress(tasks) {
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey) || '{}');
    const progress = new Map();
    for (const task of tasks) {
      const checked = saved?.[task.id];
      if (Array.isArray(checked)) {
        progress.set(task.id, task.steps.map((_, index) => checked[index] === true));
      }
    }
    return progress;
  } catch {
    return new Map();
  }
}

function assignmentText(task) {
  const url = new URL(`/h4team/tasks/#${encodeURIComponent(task.id)}`, 'https://volunteers.howhiphophelps.org').href;
  const short = task.assignment?.trim() || `${task.id} · ${task.title}`;
  const withLink = `${short}\nInstructions: ${url}`;
  if (withLink.length <= 500) return withLink;
  if (short.length <= 500) return short;
  const prefix = `Use task ${task.id} · ${task.title}. `;
  const suffix = `\nInstructions: ${url}`;
  return prefix.slice(0, 500 - suffix.length).trimEnd() + suffix;
}

function taskCard(task, progress) {
  const card = element('article', '', 'panel task-card');
  card.id = task.id;
  const header = element('header');
  const duration = task.minimumMinutes ? `${task.minimumMinutes}–${task.minutes}` : task.minutes;
  header.append(element('p', `${task.id} · ${task.crew} · ${duration} min`, 'meta'),
    element('h2', task.title), element('p', task.purpose));
  const details = element('details');
  const body = element('div', '', 'panel-body');
  const fieldset = element('fieldset');
  fieldset.append(element('legend', 'Steps'));
  const saved = progress.get(task.id);
  const checked = Array.isArray(saved) ? saved : [];
  const boxes = task.steps.map((step, index) => {
    const label = element('label');
    const checkbox = element('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked[index] === true;
    label.append(checkbox, element('span', step));
    fieldset.append(label);
    return checkbox;
  });
  fieldset.addEventListener('change', () => {
    progress.set(task.id, boxes.map(box => box.checked));
    try {
      localStorage.setItem(progressKey, JSON.stringify(Object.fromEntries(progress)));
    } catch {
      announce('Checklist progress is available until you leave this page.');
    }
  });
  body.append(fieldset, element('p', 'Checklist progress stays on this device. Official completion is tracked in H4Hours.'));
  if (task.resources?.length) {
    body.append(element('h3', 'What you need'), list(task.resources, 'ul', resource =>
      resource.url ? link(resource.label, resource.url) : document.createTextNode(resource.label)));
  }
  body.append(element('h3', 'What to submit'), element('p', task.submit));
  if (task.approval) body.append(element('h3', 'Safety and approvals'), element('p', task.approval));

  const actions = element('div', '', 'actions');
  const copy = button('Copy assignment');
  copy.dataset.copy = assignmentText(task);
  copy.dataset.copyKind = 'assignment';
  actions.append(copy, link('Open H4Hours', hoursUrl, 'button'));
  body.append(actions, element('p', 'Assign the task and set its due date in H4Hours.'),
    link('Link to this task', `#${encodeURIComponent(task.id)}`));
  details.append(element('summary', 'Instructions and checklist'), body);
  card.append(header, details);
  return card;
}

async function renderTasks(container) {
  const [tasks, missions] = await Promise.all([load('tasks'), load('missions')]);
  const form = document.getElementById('task-filters');
  const count = document.getElementById('task-count');
  const progress = readProgress(tasks);

  for (const mission of missions) {
    form.elements.mission.add(new Option(mission.title, mission.id));
  }

  function update() {
    const values = new FormData(form);
    const terms = values.get('search').toLowerCase().trim().split(/\s+/);
    const crew = values.get('crew');
    const mission = values.get('mission');
    const time = values.get('time');
    const matches = tasks.filter(task => {
      const timeGroup = task.minutes <= 30 ? 'short' : 'medium';
      const text = [task.id, task.title, task.crew, task.purpose, ...task.steps].join(' ').toLowerCase();
      return (!crew || task.crew.split(' / ').includes(crew)) && (!mission || task.missions.includes(mission)) &&
        (!time || timeGroup === time) && terms.every(term => text.includes(term));
    });
    count.textContent = tasks.length ? `${matches.length} ${matches.length === 1 ? 'task' : 'tasks'}` : '';
    if (!tasks.length) {
      container.replaceChildren(element('p', 'The approved H4 task cards are pending. Ask your H4 lead for your next assignment.', 'notice'));
    } else if (!matches.length) {
      container.replaceChildren(element('p', 'No tasks match. Try a different search or reset your filters.', 'notice'));
    } else {
      container.replaceChildren(...matches.map(task => taskCard(task, progress)));
    }
  }

  form.addEventListener('input', update);
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('reset', () => queueMicrotask(update));
  window.addEventListener('hashchange', () => {
    if (tasks.some(task => task.id === location.hash.slice(1) && !document.getElementById(task.id))) {
      form.reset();
      queueMicrotask(() => revealAnchor(container));
      return;
    }
    revealAnchor(container);
  });
  update();
  revealAnchor(container);
}

async function renderResources(container) {
  const categories = await load('resources');
  container.replaceChildren(...categories.map(category => {
    const section = element('section', '', 'guide panel');
    section.append(element('h2', category.title));
    if (!category.items.length) {
      section.append(element('p', 'Check with your H4 lead for materials.'));
    }
    for (const resource of category.items) {
      const card = element('details', '', 'panel');
      card.id = resource.id;
      const body = element('div', '', 'panel-body');
      card.append(element('summary', resource.title), body);
      if (resource.description) body.append(element('p', resource.description));
      if (resource.image) {
        const url = new URL(resource.image.url, location.href);
        if (url.origin !== location.origin) throw new Error('Use local preview assets');
        const image = element('img');
        image.src = url.href;
        image.alt = resource.image.alt;
        image.width = resource.image.width;
        image.height = resource.image.height;
        image.loading = 'lazy';
        image.className = 'resource-preview';
        body.append(image);
      }
      if (resource.text) {
        const copy = button('Copy text');
        copy.dataset.copy = resource.text;
        copy.setAttribute('aria-label', `Copy text for ${resource.title}`);
        body.append(element('blockquote', resource.text), copy);
      }
      if (resource.download) {
        const label = resource.download.endsWith('.pdf') ? 'Download PDF' : 'Download image';
        const download = link(label, resource.download, 'button button-quiet');
        if (download.origin !== location.origin) throw new Error('Use local download assets');
        download.download = '';
        download.setAttribute('aria-label', `${label}: ${resource.title}`);
        body.append(download);
      }
      if (resource.url) {
        const open = link(resource.linkLabel || 'Open resource', resource.url, 'button button-quiet');
        body.append(open);
      }
      section.append(card);
    }
    return section;
  }));
  revealAnchor(container);
  window.addEventListener('hashchange', () => revealAnchor(container));
}

const mobileMenu = document.querySelector('.mobile-nav');
mobileMenu.addEventListener('keydown', event => {
  if (event.key === 'Escape' && mobileMenu.open) {
    mobileMenu.open = false;
    mobileMenu.querySelector('summary').focus();
  }
});

if (page === 'missions') finish('mission-list', renderMissions);
if (page === 'tasks') finish('task-list', renderTasks);
if (page === 'resources') finish('resource-list', renderResources);
if (page === 'lead') {
  const main = document.getElementById('main');
  revealAnchor(main);
  window.addEventListener('hashchange', () => revealAnchor(main));
}
