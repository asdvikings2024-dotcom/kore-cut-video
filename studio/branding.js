(() => {
  // Show branding before revealing the app; every exit releases the gate.
  if (new URLSearchParams(location.search).has('previewModel') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const intro = document.createElement('div');
  document.documentElement.classList.add('kore-booting');
  intro.className = 'kore-intro';
  intro.setAttribute('aria-hidden', 'true');
  const logo = document.createElement('img');
  logo.src = './brand/kore-logo-transparent.webp';
  logo.alt = '';
  logo.width = 640;
  logo.height = 640;
  const mark = document.createElement('div');
  mark.className = 'kore-intro-mark';
  mark.append(logo);
  intro.append(mark);
  document.body.append(intro);
  const dismiss = () => {
    intro.remove();
    document.documentElement.classList.remove('kore-booting');
  };
  let started = false;
  const reveal = () => {
    if (started || !intro.isConnected) return;
    started = true;
    intro.classList.add('is-ready');
    setTimeout(dismiss, 3200);
  };
  logo.addEventListener('load', reveal, { once: true });
  intro.addEventListener('animationend', event => { if (event.target === intro) dismiss(); });
  logo.addEventListener('error', dismiss, { once: true });
  if (logo.complete && logo.naturalWidth) reveal();
  setTimeout(dismiss, 6000);
})();
