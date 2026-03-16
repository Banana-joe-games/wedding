// Fade-up on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(
  '.timeline-item, .info-card, .photo-item, .venue-text, .section-header, .gallery-item, .dc-col, .dc-restriction, .navetta-intro, .rsvp-buttons'
).forEach((el, i) => {
  el.classList.add('fade-up');
  el.style.transitionDelay = `${i * 60}ms`;
  observer.observe(el);
});

// Nav — light text on hero, dark after scroll
const nav = document.querySelector('.nav');
const heroH = document.querySelector('.hero').offsetHeight;

function updateNav() {
  const past = window.scrollY > heroH - 80;
  if (past) {
    nav.style.background = 'rgba(244,241,237,0.82)';
    nav.style.backdropFilter = 'blur(16px)';
    nav.style.WebkitBackdropFilter = 'blur(16px)';
    nav.style.mixBlendMode = 'normal';
    nav.style.borderBottom = '1px solid rgba(61,23,41,0.08)';
    nav.classList.remove('nav-hero');
  } else {
    nav.style.background = '';
    nav.style.backdropFilter = '';
    nav.style.WebkitBackdropFilter = '';
    nav.style.mixBlendMode = '';
    nav.style.borderBottom = '';
    nav.classList.add('nav-hero');
  }
}
nav.classList.add('nav-hero');
window.addEventListener('scroll', updateNav, { passive: true });

// Subtle parallax on the fixed background
const siteBg = document.querySelector('.site-bg');
if (siteBg) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY * 0.08;
    siteBg.style.transform = `translateY(${y}px)`;
  }, { passive: true });
}

// ─────────────────────────────────────────
//  RSVP — Modal + Steps + Google Sheets
// ─────────────────────────────────────────
// APPS SCRIPT (Code.gs) — copia esattamente questo:
//
//   function doPost(e) {
//     var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
//     var p = e.parameter;
//     sheet.appendRow([
//       new Date(),
//       p.risposta || '',
//       p.nome || '',
//       p.cognome || '',
//       p.plus_nome || '',
//       p.plus_cognome || '',
//       p.navetta || '',
//       p.corsa_andata_15 || '',
//       p.corsa_ritorno_00 || '',
//       p.corsa_ritorno_02 || ''
//     ]);
//     return ContentService.createTextOutput('ok');
//   }

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyv5M_K4aZQB8bztIjtMFx7a9Qov5JKahK0vUokyIiVBqcgQxVZ3jOBnsrwyBLGL7CO/exec';

// ── Hidden iframe + form for CORS-free submission ──
const hiddenIframe = document.createElement('iframe');
hiddenIframe.name = 'rsvp-iframe';
hiddenIframe.style.display = 'none';
document.body.appendChild(hiddenIframe);

const hiddenForm = document.createElement('form');
hiddenForm.method = 'POST';
hiddenForm.action = SHEET_URL;
hiddenForm.target = 'rsvp-iframe';
hiddenForm.style.display = 'none';

const fieldNames = [
  'risposta', 'nome', 'cognome',
  'plus_nome', 'plus_cognome',
  'navetta', 'corsa_andata_15',
  'corsa_ritorno_00', 'corsa_ritorno_02'
];

const hiddenInputs = {};
fieldNames.forEach(name => {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = name;
  hiddenInputs[name] = input;
  hiddenForm.appendChild(input);
});

document.body.appendChild(hiddenForm);

function sendToSheet(payload) {
  return new Promise((resolve) => {
    // Fill hidden inputs
    fieldNames.forEach(name => {
      hiddenInputs[name].value = payload[name] || '';
    });

    // Listen for iframe load (means submission went through)
    const onLoad = () => {
      hiddenIframe.removeEventListener('load', onLoad);
      resolve();
    };
    hiddenIframe.addEventListener('load', onLoad);

    // Submit
    hiddenForm.submit();

    // Fallback: resolve after 3s even if load doesn't fire
    setTimeout(resolve, 3000);
  });
}

// ── Modal ──
const modal = document.getElementById('rsvp-modal');
const rsvpForm = document.getElementById('rsvp-form');
const rsvpFeedback = document.getElementById('rsvp-feedback');
const steps = [
  document.getElementById('step-1'),
  document.getElementById('step-2'),
  document.getElementById('step-3'),
];

function openModal() {
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

// "Ci sarò" → open modal
document.getElementById('rsvp-yes').addEventListener('click', () => {
  rsvpFeedback.textContent = '';
  rsvpFeedback.className = 'rsvp-feedback';
  openModal();
});

// "Non ci sarò" → send decline directly
document.getElementById('rsvp-no').addEventListener('click', async () => {
  const nome = prompt('Il tuo nome e cognome, per favore:');
  if (!nome || !nome.trim()) return;

  rsvpFeedback.textContent = '';
  rsvpFeedback.className = 'rsvp-feedback';

  const parts = nome.trim().split(/\s+/);
  const payload = {
    risposta: 'Non ci sarò',
    nome: parts[0] || '',
    cognome: parts.slice(1).join(' ') || '',
    plus_nome: '',
    plus_cognome: '',
    navetta: 'No',
    corsa_andata_15: '',
    corsa_ritorno_00: '',
    corsa_ritorno_02: '',
  };

  try {
    await sendToSheet(payload);
    rsvpFeedback.textContent = 'Ci mancherai! Grazie per avercelo fatto sapere.';
    rsvpFeedback.classList.add('success');
  } catch {
    rsvpFeedback.textContent = 'Errore nell\'invio. Riprova tra poco.';
    rsvpFeedback.classList.add('error');
  }
});

// Close modal
document.getElementById('modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Step navigation
function showStep(n) {
  steps.forEach((s, i) => s.style.display = i === n ? '' : 'none');
}

document.getElementById('step-1-next').addEventListener('click', () => {
  const nome = document.getElementById('rsvp-nome');
  const cognome = document.getElementById('rsvp-cognome');
  if (!nome.value.trim() || !cognome.value.trim()) {
    nome.reportValidity();
    cognome.reportValidity();
    return;
  }
  showStep(1);
});
document.getElementById('step-2-back').addEventListener('click', () => showStep(0));
document.getElementById('step-2-next').addEventListener('click', () => showStep(2));
document.getElementById('step-3-back').addEventListener('click', () => showStep(1));

// +1 toggle
document.querySelectorAll('.rsvp-toggle[data-plus]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.rsvp-toggle[data-plus]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('plus-fields').style.display = btn.dataset.plus === 'yes' ? '' : 'none';
  });
});

// Shuttle toggle
document.querySelectorAll('.rsvp-shuttle').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.rsvp-shuttle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('shuttle-fields').style.display = btn.dataset.shuttle === 'yes' ? '' : 'none';
  });
});

// Submit
rsvpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(rsvpForm);
  const submitBtn = document.getElementById('rsvp-submit');

  const payload = {
    risposta: 'Ci sarò',
    nome: fd.get('nome'),
    cognome: fd.get('cognome'),
    plus_nome: fd.get('plus_nome') || '',
    plus_cognome: fd.get('plus_cognome') || '',
    navetta: document.querySelector('.rsvp-shuttle.active')?.dataset.shuttle === 'yes' ? 'Sì' : 'No',
    corsa_andata_15: fd.get('corsa_andata_15') || '',
    corsa_ritorno_00: fd.get('corsa_ritorno_00') || '',
    corsa_ritorno_02: fd.get('corsa_ritorno_02') || '',
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Invio in corso...';

  try {
    await sendToSheet(payload);
    closeModal();
    rsvpForm.reset();
    showStep(0);
    // Reset toggles
    document.querySelectorAll('.rsvp-toggle[data-plus]').forEach(b => b.classList.toggle('active', b.dataset.plus === 'no'));
    document.querySelectorAll('.rsvp-shuttle').forEach(b => b.classList.toggle('active', b.dataset.shuttle === 'no'));
    document.getElementById('plus-fields').style.display = 'none';
    document.getElementById('shuttle-fields').style.display = 'none';

    rsvpFeedback.textContent = 'Perfetto, ci vediamo il 13 giugno!';
    rsvpFeedback.classList.add('success');
  } catch {
    rsvpFeedback.textContent = 'Errore nell\'invio. Riprova tra poco.';
    rsvpFeedback.classList.add('error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Invia';
  }
});
