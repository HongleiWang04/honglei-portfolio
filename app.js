const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const menuToggle = $('.menu-toggle');
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? '收起导航' : '展开导航');
  $('.site-header nav').classList.toggle('open', open);
});
$$('.site-header nav a').forEach(a => a.addEventListener('click', () => {
  $('.site-header nav').classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));
const sections = $$('main > section');
function updateNavigation() {
  let active = sections[0];
  const marker = window.innerHeight * .33;
  sections.forEach(s => { if (s.getBoundingClientRect().top <= marker) active = s; });
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80) active = sections.at(-1);
  $$('.site-header nav a').forEach(a => {
    const selected = a.hash === '#' + active.id;
    a.classList.toggle('active', selected);
    if (selected) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
  });
  const next = sections[sections.indexOf(active) + 1];
  $('.scroll-cue').classList.toggle('hidden', !next);
  if (next) $('.scroll-cue').href = '#' + next.id;
}
let scrollScheduled = false;
window.addEventListener('scroll', () => {
  if (!scrollScheduled) requestAnimationFrame(() => { updateNavigation(); scrollScheduled = false; });
  scrollScheduled = true;
}, {passive:true});
updateNavigation();
const contactDialog = $('#contact-dialog');
$$('[data-contact]').forEach(b => b.addEventListener('click', () => contactDialog.showModal()));
$$('dialog').forEach(d => {
  $('.dialog-close', d).addEventListener('click', () => d.close());
  d.addEventListener('click', e => { if(e.target === d) { const r = d.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close(); } });
});
let toastTimer;
function toast(text) { $('.toast').textContent = text; $('.toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('.toast').classList.remove('visible'), 2400); }
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else {
      const input = document.createElement('textarea');
      input.value = text; input.style.cssText = 'position:fixed;left:-9999px';
      (document.querySelector('dialog[open]') || document.body).append(input); input.select();
      const copied = document.execCommand('copy'); input.remove(); if (!copied) throw new Error('copy');
    }
    toast('已复制：' + text);
  } catch { toast('请长按或选中联系方式复制'); }
}
$$('[data-copy]').forEach(b => b.addEventListener('click', () => copyText(b.dataset.copy)));
$('#year').textContent = new Date().getFullYear();
