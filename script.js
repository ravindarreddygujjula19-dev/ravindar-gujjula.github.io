/* =====================================================================
   Portfolio site script
   Sections: 1) restore saved edits  2) page behaviour  3) visual effects
             4) blog reader / writer  5) in-page editor
   Elements the script creates at runtime get the class "edit-ui" so they
   are never saved into the downloaded index.html.
   ===================================================================== */

const STORE_KEY = 'portfolio-content-v2';
const OWNER_KEY = 'portfolio-owner';
const root = document.documentElement;
const fineMouse = matchMedia('(pointer: fine)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let editing = false;

/* ---------- 1) Restore edits saved in this browser ---------- */
try {
  const saved = JSON.parse(localStorage.getItem(STORE_KEY));
  if (saved) {
    document.querySelector('main').innerHTML = saved.main;
    document.querySelector('.logo').innerHTML = saved.logo;
    document.querySelector('.site-footer p').innerHTML = saved.footer;
  }
} catch (e) { /* ignore corrupt saved data */ }

/* ---------- 2) Page behaviour ---------- */
document.getElementById('year').textContent = new Date().getFullYear();

// Mobile menu
const nav = document.querySelector('.nav');
document.querySelector('.menu-toggle').addEventListener('click', () => nav.classList.toggle('open'));
nav.addEventListener('click', e => { if (e.target.tagName === 'A') nav.classList.remove('open'); });

// Theme (dark by default; remembers choice)
root.dataset.theme = localStorage.getItem('theme') || 'dark';
document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  localStorage.setItem('theme', next);
  readAccent();
});

// Typing effect in hero (words come from the data-phrases attribute)
const typed = document.getElementById('typed');
let phrases = JSON.parse(typed.dataset.phrases);
let phraseIdx = 0, charIdx = 0, deleting = false;
function type() {
  const word = phrases[phraseIdx % phrases.length] || '';
  typed.textContent = word.slice(0, charIdx);
  if (!deleting && charIdx >= word.length) { deleting = true; return setTimeout(type, 1600); }
  if (deleting && charIdx <= 0) { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; }
  charIdx += deleting ? -1 : 1;
  setTimeout(type, deleting ? 40 : 80);
}
type();

// Scroll reveal
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.section').forEach(el => {
  el.classList.add('reveal');
  revealObserver.observe(el);
});

// Highlight the nav link of the section on screen
const spy = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    nav.querySelectorAll('a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
  });
}, { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('main section[id]').forEach(s => spy.observe(s));

// Count-up numbers
const countObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    countObserver.unobserve(entry.target);
    if (!editing && !reduceMotion) animateCount(entry.target);
  });
}, { threshold: 0.6 });
document.querySelectorAll('.stat-num').forEach(el => countObserver.observe(el));

function animateCount(el) {
  const final = el.textContent.trim();
  const m = final.match(/^(\d+)(.*)$/);
  if (!m) return;
  const target = +m[1], suffix = m[2], t0 = performance.now(), dur = 1400;
  el.dataset.final = final;   // lets save/download restore the real value if caught mid-animation
  (function step(t) {
    const p = Math.min((t - t0) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
    if (p < 1) requestAnimationFrame(step);
    else { el.textContent = final; delete el.dataset.final; }
  })(t0);
}

// Contact form (placeholder: wire to Formspree/Netlify Forms or your own backend)
document.getElementById('contact-form').addEventListener('submit', e => {
  e.preventDefault();
  document.getElementById('form-status').textContent = 'Thanks! (Demo only: connect a form service to receive messages.)';
  e.target.reset();
});

/* ---------- 3) Visual effects ---------- */
function runtimeEl(tag, className, html) {
  const el = document.createElement(tag);
  el.className = className + ' edit-ui';
  if (html) el.innerHTML = html;
  return el;
}

// Scroll progress bar
const progress = runtimeEl('div', 'scroll-progress');
document.body.appendChild(progress);
addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.setProperty('--progress', max > 0 ? Math.min(scrollY / max, 1) : 0);
}, { passive: true });

// Colour used by the particle network (follows the theme)
let accentRGB = '0,229,160';
function readAccent() {
  const hex = getComputedStyle(root).getPropertyValue('--accent').trim();
  const n = parseInt(hex.replace('#', ''), 16);
  if (!isNaN(n)) accentRGB = [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
}
readAccent();

// Particle network background
if (!reduceMotion) {
  const canvas = runtimeEl('canvas', 'bg-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const mouse = { x: -999, y: -999 };
  let w, h, pts = [];

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(80, (w * h) / 17000));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35
    }));
  };
  resize();
  addEventListener('resize', resize);
  addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });

  (function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.fillStyle = 'rgba(' + accentRGB + ',.7)';
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, 6.283); ctx.fill();
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j], d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 130) {
          ctx.strokeStyle = 'rgba(' + accentRGB + ',' + ((1 - d / 130) * .3) + ')';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      if (dm < 170) {
        ctx.strokeStyle = 'rgba(' + accentRGB + ',' + ((1 - dm / 170) * .5) + ')';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
    }
  })();
}

// Soft glow that follows the cursor (mouse devices only)
if (fineMouse && !reduceMotion) {
  const glow = runtimeEl('div', 'cursor-glow');
  document.body.appendChild(glow);
  let gx = 0, gy = 0, pending = false;
  addEventListener('mousemove', e => {
    gx = e.clientX; gy = e.clientY;
    if (!pending) {
      pending = true;
      requestAnimationFrame(() => { glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px)'; pending = false; });
    }
  }, { passive: true });
}

// 3D tilt on cards
let tiltEl = null;
function resetTilt(el) {
  el.style.removeProperty('--rx');
  el.style.removeProperty('--ry');
  if (!el.getAttribute('style')) el.removeAttribute('style');
}
if (fineMouse && !reduceMotion) {
  document.addEventListener('mousemove', e => {
    if (editing) return;
    const el = e.target.closest ? e.target.closest('.tilt') : null;
    if (tiltEl && tiltEl !== el) resetTilt(tiltEl);
    tiltEl = el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--ry', (((e.clientX - r.left) / r.width - .5) * 8).toFixed(2) + 'deg');
    el.style.setProperty('--rx', (-((e.clientY - r.top) / r.height - .5) * 8).toFixed(2) + 'deg');
  });
  document.addEventListener('mouseleave', () => { if (tiltEl) { resetTilt(tiltEl); tiltEl = null; } });
}

/* ---------- 4) Blog reader / writer ---------- */
function sanitize(html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  t.content.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(n => n.remove());
  t.content.querySelectorAll('*').forEach(n => {
    [...n.attributes].forEach(a => {
      if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
    });
    n.removeAttribute('contenteditable');
  });
  return t.innerHTML;
}

const modal = runtimeEl('div', 'modal',
  '<div class="modal-box" role="dialog" aria-modal="true">' +
    '<button class="modal-close" type="button" aria-label="Close">✕</button>' +
    '<div class="modal-toolbar" hidden>' +
      '<button type="button" data-cmd="bold"><b>B</b></button>' +
      '<button type="button" data-cmd="italic"><i>I</i></button>' +
      '<button type="button" data-cmd="formatBlock" data-val="<h2>">Heading</button>' +
      '<button type="button" data-cmd="formatBlock" data-val="<h3>">Subheading</button>' +
      '<button type="button" data-cmd="formatBlock" data-val="<p>">Paragraph</button>' +
      '<button type="button" data-cmd="insertUnorderedList">• List</button>' +
      '<button type="button" data-cmd="insertOrderedList">1. List</button>' +
      '<button type="button" data-cmd="formatBlock" data-val="<blockquote>">Quote</button>' +
      '<button type="button" data-cmd="formatBlock" data-val="<pre>">Code</button>' +
      '<button type="button" data-cmd="createLink">Link</button>' +
      '<button type="button" data-cmd="insertImage">Image</button>' +
      '<button type="button" data-cmd="removeFormat">Clear</button>' +
      '<button type="button" data-cmd="done" class="modal-done">✓ Done writing</button>' +
      '<span class="modal-hint">Then press Save in the bar below.</span>' +
    '</div>' +
    '<p class="post-meta"></p>' +
    '<h2 class="modal-title"></h2>' +
    '<div class="modal-body prose"></div>' +
  '</div>');
modal.hidden = true;
document.body.appendChild(modal);

const mTitle = modal.querySelector('.modal-title');
const mBody = modal.querySelector('.modal-body');
const mMeta = modal.querySelector('.post-meta');
const mBar = modal.querySelector('.modal-toolbar');
let openPost = null, modalEditing = false;

function openModal(post, edit) {
  openPost = post;
  modalEditing = edit;
  mTitle.textContent = post.querySelector('.post-title').textContent;
  mBody.innerHTML = sanitize(post.querySelector('.post-body').innerHTML);
  const words = mBody.textContent.trim().split(/\s+/).filter(Boolean).length;
  const tag = post.querySelector('.tag');
  mMeta.textContent = [post.querySelector('.post-date').textContent.trim(), tag && tag.textContent.trim(), Math.max(1, Math.round(words / 200)) + ' min read']
    .filter(Boolean).join('  ·  ');
  [mTitle, mBody].forEach(el => edit ? el.setAttribute('contenteditable', 'true') : el.removeAttribute('contenteditable'));
  if (!edit) mBody.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
  mBar.hidden = !edit;
  modal.hidden = false;
  modal.scrollTop = 0;
  document.body.classList.add('modal-open');
  if (edit) mBody.focus();
}

function closeModal() {
  if (modal.hidden) return;
  if (modalEditing && openPost) {
    openPost.querySelector('.post-title').textContent = mTitle.textContent.trim() || 'Untitled';
    openPost.querySelector('.post-body').innerHTML = sanitize(mBody.innerHTML);
    toast('Post updated. Press Save in the bar to keep it.');
  }
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  modalEditing = false;
  openPost = null;
}

modal.addEventListener('click', e => {
  if (e.target === modal || e.target.closest('.modal-close')) closeModal();
});
addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

mBar.addEventListener('mousedown', e => e.preventDefault());   // keep the text selection while clicking buttons
mBar.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.cmd === 'done') { closeModal(); return; }
  if (!mBody.contains(getSelection().anchorNode)) return;
  const cmd = b.dataset.cmd;
  if (cmd === 'createLink') {
    const url = prompt('Link address (URL):', 'https://');
    if (url) document.execCommand('createLink', false, url);
  } else if (cmd === 'insertImage') {
    const url = prompt('Image address (URL):', 'https://');
    if (url) document.execCommand('insertImage', false, url);
  } else {
    document.execCommand(cmd, false, b.dataset.val || null);
  }
});

// Open a post from the blog list
document.addEventListener('click', e => {
  if (editing) return;
  const post = e.target.closest('.post');
  if (post) openModal(post, false);
});
document.addEventListener('keydown', e => {
  if (!editing && e.key === 'Enter' && e.target.classList && e.target.classList.contains('post')) openModal(e.target, false);
});

/* ---------- 5) In-page editor (open the site with ?edit at the end of the address) ---------- */
const EDITABLE = [
  '.logo', '.hero h1', '.badge', '.role-title', '.tagline', '.terminal-body',
  '.section h2', '.kicker', '.muted', '.subhead',
  '.stat-num', '.stat-label',
  '.about-grid > p', '.facts li',
  '.icon', '.skill h3', '.skill p',
  '.job h3', '.company', '.dates', '.job-loc', '.job li',
  '.cert h3', '.issuer', '.cert-meta',
  '.achv h3', '.achv p',
  '.tag', '.card h3', '.card p',
  '.post-title', '.post-date', '.post-excerpt',
  '.ci-label', '.ci-text',
  '.site-footer p'
].join(',');

const TEMPLATES = {
  skill: '<div class="skill tilt"><span class="icon">⭐</span><h3>New skill</h3><p>Short description</p></div>',
  project: '<article class="card tilt"><span class="tag">TAG</span><h3>Project name</h3><p>Describe what you built and the tools you used.</p><a href="#" class="editlink">View project &rarr;</a></article>',
  job: '<article class="job"><div class="job-head"><h3>Job title</h3><span class="company">Company name</span><span class="dates">Mon YYYY &ndash; Present</span></div><p class="job-loc">City, Country</p><ul><li>Describe an achievement or responsibility.</li></ul></article>',
  edu: '<article class="job"><div class="job-head"><h3>Degree or course</h3><span class="company">University or institute</span><span class="dates">YYYY &ndash; YYYY</span></div></article>',
  cert: '<article class="cert tilt"><span class="icon">\u{1F3C5}</span><h3>Certification name</h3><p class="issuer">Issuing organization</p><p class="cert-meta">Issued YYYY &middot; ID: XXXXXX</p><a href="#" class="editlink" target="_blank" rel="noopener">Verify credential &rarr;</a></article>',
  ach: '<article class="achv tilt"><span class="icon">\u{1F3C6}</span><h3>Achievement title</h3><p>What you achieved and its impact.</p></article>',
  contact: '<div class="contact-item"><span class="ci-label">Label</span><a class="ci-link editlink" href="#">value</a></div>',
  post: '<article class="post tilt" tabindex="0"><span class="tag">TOPIC</span><h3 class="post-title">New post title</h3><p class="post-date">' +
    new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    '</p><p class="post-excerpt">A one or two line summary shown on the blog list.</p><div class="post-body" hidden><p>Start writing your post here.</p></div><span class="read">Read more &rarr;</span></article>'
};

function toast(msg) {
  const t = runtimeEl('div', 'edit-toast');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function makeEditable(scope) {
  scope.querySelectorAll(EDITABLE).forEach(el => el.setAttribute('contenteditable', 'true'));
  if (scope.matches && scope.matches(EDITABLE)) scope.setAttribute('contenteditable', 'true');
}

function addButton(parent, className, label, title) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className + ' edit-ui';
  b.textContent = label;
  if (title) b.title = title;
  parent.appendChild(b);
  return b;
}

// Make one item (skill, job, post, ...) editable and give it its extra buttons
function decorate(item) {
  makeEditable(item);
  addButton(item, 'edit-del', '✕', 'Remove');
  if (item.matches('.post')) addButton(item, 'edit-postbtn', '✎ Write post');
  if (item.matches('#exp-list > .job')) addButton(item, 'edit-bullet', '+ Add bullet');
}

function enterEdit() {
  editing = true;
  document.body.classList.add('editing');
  document.querySelectorAll('.tilt').forEach(resetTilt);
  document.querySelectorAll('.stat-num[data-final]').forEach(el => { el.textContent = el.dataset.final; delete el.dataset.final; });
  makeEditable(document);
  document.querySelectorAll('[data-kind]').forEach(container => {
    [...container.children].forEach(decorate);
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'edit-add edit-ui';
    add.textContent = container.dataset.add || '+ Add';
    container.insertAdjacentElement('afterend', add);
  });
  document.getElementById('edit-bar').hidden = false;
  document.getElementById('edit-fab').hidden = true;
}

function exitEdit() {
  closeModal();
  editing = false;
  document.body.classList.remove('editing');
  document.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  document.querySelectorAll('.edit-del, .edit-add, .edit-postbtn, .edit-bullet').forEach(el => el.remove());
  document.getElementById('edit-bar').hidden = true;
  document.getElementById('edit-fab').hidden = false;
}

// Returns a copy of a node with all editor UI and animation state removed
function cleanClone(node) {
  const c = node.cloneNode(true);
  c.querySelectorAll('.edit-ui').forEach(e => e.remove());
  c.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable'));
  c.querySelectorAll('.reveal').forEach(e => e.classList.remove('reveal', 'visible'));
  c.querySelectorAll('.nav a.active').forEach(e => e.classList.remove('active'));
  c.querySelectorAll('.tilt').forEach(e => { e.style.removeProperty('--rx'); e.style.removeProperty('--ry'); if (!e.getAttribute('style')) e.removeAttribute('style'); });
  c.querySelectorAll('[data-final]').forEach(e => { e.textContent = e.dataset.final; e.removeAttribute('data-final'); });
  const t = c.querySelector('#typed'); if (t) t.textContent = '';
  const s = c.querySelector('#form-status'); if (s) s.textContent = '';
  return c;
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify({
    main: cleanClone(document.querySelector('main')).innerHTML,
    logo: cleanClone(document.querySelector('.logo')).innerHTML,
    footer: cleanClone(document.querySelector('.site-footer p')).innerHTML
  }));
  toast('Saved in this browser');
}

function downloadSite() {
  const doc = cleanClone(document.documentElement);
  doc.removeAttribute('data-theme');
  doc.querySelector('body').classList.remove('editing', 'modal-open');
  doc.querySelector('.nav').classList.remove('open');
  doc.querySelector('body').style.removeProperty('padding-bottom');
  const html = '<!DOCTYPE html>\n' + doc.outerHTML;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = 'index.html';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Downloaded index.html. Replace your old file with it to publish.');
}

function editTypingWords() {
  const input = prompt('Words for the typing effect, separated by commas:', phrases.join(', '));
  if (input === null) return;
  const list = input.split(',').map(s => s.trim()).filter(Boolean);
  if (!list.length) return;
  phrases = list;
  typed.dataset.phrases = JSON.stringify(list);
  phraseIdx = 0; charIdx = 0; deleting = false;
}

// Build the editor bar
document.body.appendChild(runtimeEl('div', 'editor-root',
  '<button id="edit-fab" class="edit-fab" type="button" hidden>✎ Edit site</button>' +
  '<div id="edit-bar" class="edit-bar" hidden>' +
    '<span class="edit-label">✎ Edit mode: click any text to change it</span>' +
    '<button type="button" data-act="save">Save</button>' +
    '<button type="button" data-act="words">Typing words</button>' +
    '<button type="button" data-act="download">Download site</button>' +
    '<button type="button" data-act="reset">Reset</button>' +
    '<button type="button" data-act="done">Done</button>' +
  '</div>'));

const params = new URLSearchParams(location.search);
if (params.has('edit')) localStorage.setItem(OWNER_KEY, '1');
if (localStorage.getItem(OWNER_KEY) === '1') document.getElementById('edit-fab').hidden = false;
if (params.has('edit')) enterEdit();

document.getElementById('edit-fab').addEventListener('click', enterEdit);

document.getElementById('edit-bar').addEventListener('click', e => {
  const act = e.target.dataset.act;
  if (act === 'save') save();
  else if (act === 'words') editTypingWords();
  else if (act === 'download') downloadSite();
  else if (act === 'done') exitEdit();
  else if (act === 'reset' && confirm('Discard all saved edits and go back to the original content?')) {
    localStorage.removeItem(STORE_KEY);
    location.reload();
  }
});

document.addEventListener('click', e => {
  if (!editing) return;

  const del = e.target.closest('.edit-del');
  if (del) { del.parentElement.remove(); return; }

  const postBtn = e.target.closest('.edit-postbtn');
  if (postBtn) { openModal(postBtn.closest('.post'), true); return; }

  const bullet = e.target.closest('.edit-bullet');
  if (bullet) {
    const job = bullet.closest('.job');
    let ul = job.querySelector('ul');
    if (!ul) { ul = document.createElement('ul'); job.insertBefore(ul, bullet); }
    const li = document.createElement('li');
    li.textContent = 'New bullet';
    li.setAttribute('contenteditable', 'true');
    ul.appendChild(li);
    li.focus();
    return;
  }

  const add = e.target.closest('.edit-add');
  if (add) {
    const container = add.previousElementSibling;
    const kind = container.dataset.kind;
    container.insertAdjacentHTML(container.dataset.prepend ? 'afterbegin' : 'beforeend', TEMPLATES[kind]);
    const item = container.dataset.prepend ? container.firstElementChild : container.lastElementChild;
    decorate(item);
    if (kind === 'post') openModal(item, true);
    else item.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Links: click to change the address (and the shown text for contact links)
  const link = e.target.closest('.editlink');
  if (link) {
    e.preventDefault();
    const url = prompt('Link address (URL):', link.getAttribute('href'));
    if (url !== null) link.setAttribute('href', url.trim());
    if (link.matches('.ci-link')) {
      const label = prompt('Text to show:', link.textContent);
      if (label !== null && label.trim()) link.textContent = label.trim();
    }
    return;
  }

  if (e.target.closest('.logo')) e.preventDefault();
});

// An empty bullet disappears when you leave it
document.addEventListener('focusout', e => {
  if (editing && e.target.matches && e.target.matches('.job li') && !e.target.textContent.trim()) e.target.remove();
});

// Single-line fields: Enter does not add a new line (except in the terminal box and blog editor)
document.addEventListener('keydown', e => {
  if (editing && e.key === 'Enter' && e.target.isContentEditable && !e.target.closest('pre, .modal-body')) e.preventDefault();
});

// Paste as plain text so formatting from other pages doesn't leak in
document.addEventListener('paste', e => {
  if (!editing || !e.target.isContentEditable) return;
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
});
