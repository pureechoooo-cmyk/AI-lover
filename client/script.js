const DESIGN_WIDTH = 1440;
const pageCanvas = document.getElementById('pageCanvas');
const pageViewport = document.getElementById('pageViewport');
let lastViewportWidth = 0;
let lastPageHeight = 0;
let pageFitFrame = 0;

function updatePageFit() {
  pageFitFrame = 0;
  const viewportWidth = document.documentElement.clientWidth;
  const scale = viewportWidth / DESIGN_WIDTH;
  const pageHeight = pageCanvas ? Math.ceil(pageCanvas.scrollHeight * scale) : 0;

  if (Math.abs(viewportWidth - lastViewportWidth) > 1) {
    lastViewportWidth = viewportWidth;
    document.documentElement.style.setProperty('--page-scale', String(scale));
  }

  if (pageCanvas && pageViewport && Math.abs(pageHeight - lastPageHeight) > 1) {
    lastPageHeight = pageHeight;
    document.documentElement.style.setProperty('--page-height', `${pageHeight}px`);
  }
}

function schedulePageFit() {
  if (pageFitFrame) return;
  pageFitFrame = requestAnimationFrame(updatePageFit);
}

updatePageFit();
window.addEventListener('resize', () => {
  // Mobile browser chrome changes the viewport height while scrolling. The
  // fixed-width canvas only needs recalculation when its usable width changes.
  if (Math.abs(document.documentElement.clientWidth - lastViewportWidth) > 1) {
    schedulePageFit();
  }
});
window.addEventListener('load', schedulePageFit);
if (document.fonts?.ready) {
  document.fonts.ready.then(schedulePageFit);
}

const progress = document.getElementById('progress');

function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? window.scrollY / max : 0;
  progress.style.width = `${ratio * DESIGN_WIDTH}px`;
}

window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();

function getCanvasOffsetTop(element) {
  let top = 0;
  let node = element;
  while (node && node !== pageCanvas) {
    top += node.offsetTop;
    node = node.offsetParent;
  }
  return top;
}

function scrollToCanvasTarget(target, behavior = 'smooth') {
  const scale = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-scale')) || 1;
  if (pageViewport) pageViewport.scrollTop = 0;
  window.scrollTo({ top: getCanvasOffsetTop(target) * scale, behavior });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener('click', (event) => {
  const hash = link.getAttribute('href');
  const target = hash && hash.length > 1 ? document.querySelector(hash) : null;
  if (!target) return;

  event.preventDefault();
  try {
    history.pushState(null, '', hash);
  } catch (_) {
    // file:// previews can reject history changes; scrolling still works.
  }
  scrollToCanvasTarget(target);
}));

function restoreHashPosition() {
  const target = location.hash ? document.querySelector(location.hash) : null;
  if (target) setTimeout(() => requestAnimationFrame(() => scrollToCanvasTarget(target, 'auto')), 0);
}

window.addEventListener('load', restoreHashPosition);

const quizResult = document.getElementById('quiz-result');
const quizTypes = {
  A: '情绪陪伴型',
  B: '情绪陪伴型',
  C: '现实关系疲惫型',
  D: '想象满足型',
  E: '工具体验型'
};

document.querySelectorAll('.quiz-options button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.quiz-options button').forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
    quizResult.textContent = quizTypes[button.dataset.answer];
  });
});

const chatSteps = [...document.querySelectorAll('.chat-step')];
const chatNext = document.getElementById('chat-next');
const chatLabels = ['继续', '新建对话', '重新播放'];
let chatIndex = 0;

chatNext.addEventListener('click', () => {
  chatIndex = (chatIndex + 1) % chatSteps.length;
  chatSteps.forEach((step, index) => step.classList.toggle('active', index === chatIndex));
  chatNext.textContent = chatLabels[chatIndex];
});

function activateReveal(el) {
  el.classList.add('in');
}

const chartFrames = [...document.querySelectorAll('.figure iframe[data-src]')];
const compactChartMode = window.matchMedia('(max-width: 760px)').matches;

function loadChartFrame(iframe) {
  if (!iframe.hasAttribute('src') && iframe.dataset.src) {
    iframe.src = iframe.dataset.src;
  }
}

if ('IntersectionObserver' in window) {
  const chartObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const iframe = entry.target;
      if (entry.isIntersecting) {
        loadChartFrame(iframe);
      } else if (compactChartMode && iframe.hasAttribute('src')) {
        // Keep only nearby charts alive on phones to avoid WebView/Safari
        // reloading the whole document under cross-origin iframe memory pressure.
        iframe.removeAttribute('src');
      }
    });
  }, { rootMargin: compactChartMode ? '900px 0px' : '600px 0px', threshold: 0 });

  chartFrames.forEach((iframe) => chartObserver.observe(iframe));
} else {
  chartFrames.forEach(loadChartFrame);
}

document.querySelectorAll([
  '.article > p',
  '.article > blockquote',
  '.article > h2',
  '.article > h3',
  '.article > figure',
  '.article > section',
  '.chapter-copy'
].join(',')).forEach((el) => el.classList.add('reveal'));

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealEls = document.querySelectorAll('.reveal');

if (reduceMotion) {
  revealEls.forEach(activateReveal);
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      activateReveal(entry.target);
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  revealEls.forEach((el) => revealObserver.observe(el));
}
