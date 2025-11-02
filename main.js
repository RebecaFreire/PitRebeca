(function(){
  document.addEventListener('DOMContentLoaded', function(){
    const slider = document.querySelector('.kpi-slider');
    if (!slider) {
      return;
    }

    const track = slider.querySelector('.kpi-track');
    const slides = Array.from(slider.querySelectorAll('.kpi-slide'));
    const prevBtn = slider.querySelector('.kpi-control--prev');
    const nextBtn = slider.querySelector('.kpi-control--next');
    let dotsContainer = slider.querySelector('.kpi-dots');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let activeIndex = 0;
    let autoRotateId = null;
    const intervalAttr = slider.getAttribute('data-interval');
    const autoRotateDelay = intervalAttr ? Number(intervalAttr) : 8000;

    function formatValue(value, decimals){
      const factor = Math.pow(10, decimals);
      return (Math.round(value * factor) / factor).toFixed(decimals);
    }

    function animateCounter(counter){
      const target = parseFloat(counter.dataset.target);
      if (Number.isNaN(target)) {
        return;
      }

      const prefix = counter.dataset.prefix || '';
      const suffix = counter.dataset.suffix || '';
      const decimals = Number(counter.dataset.decimals || 0);
      const duration = Number(counter.dataset.duration || 1200);
      const startValue = Number(counter.dataset.start || 0);

      if (prefersReducedMotion) {
        counter.textContent = `${prefix}${formatValue(target, decimals)}${suffix}`;
        counter.dataset.animated = 'true';
        return;
      }

      if (counter.dataset.animated === 'true') {
        return;
      }

      let startTimestamp = null;
      function step(timestamp){
        if (!startTimestamp) {
          startTimestamp = timestamp;
        }
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = startValue + (target - startValue) * progress;
        counter.textContent = `${prefix}${formatValue(currentValue, decimals)}${suffix}`;
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          counter.dataset.animated = 'true';
          counter.textContent = `${prefix}${formatValue(target, decimals)}${suffix}`;
        }
      }

      counter.dataset.animated = 'false';
      counter.textContent = `${prefix}${formatValue(startValue, decimals)}${suffix}`;
      window.requestAnimationFrame(step);
    }

    function animateSlideCounters(index){
      const slide = slides[index];
      if (!slide) {
        return;
      }
      slide.querySelectorAll('.kpi-value').forEach(animateCounter);
    }

    function updateProgressBars(index){
      slides.forEach((slide, slideIndex) => {
        const progress = slide.querySelector('.kpi-progress');
        if (!progress) {
          return;
        }

        const bar = progress.querySelector('.kpi-progress-bar');
        const valueLabel = progress.querySelector('.kpi-progress-value');
        const rawValue = Number(progress.dataset.progress || 0);
        const value = Math.max(0, Math.min(100, rawValue));
        const isActive = slideIndex === index;

        if (bar) {
          bar.style.setProperty('--progress', isActive ? `${value}%` : '0%');
        }

        if (valueLabel) {
          valueLabel.textContent = `${value}%`;
        }
      });
    }

    function ensureDotsContainer(){
      if (dotsContainer) {
        return dotsContainer;
      }
      dotsContainer = document.createElement('div');
      dotsContainer.className = 'kpi-dots';
      dotsContainer.setAttribute('role', 'tablist');
      slider.appendChild(dotsContainer);
      return dotsContainer;
    }

    function updateDots(){
      const container = ensureDotsContainer();
      const dots = Array.from(container.querySelectorAll('.kpi-dot'));
      if (!dots.length) {
        return;
      }
      dots.forEach((dot, idx) => {
        const isActive = idx === activeIndex;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        dot.setAttribute('tabindex', isActive ? '0' : '-1');
      });
    }

    function goToSlide(targetIndex, { auto = false } = {}){
      if (slides.length === 0) {
        return;
      }
      if (targetIndex < 0) {
        targetIndex = slides.length - 1;
      }
      if (targetIndex >= slides.length) {
        targetIndex = 0;
      }
      activeIndex = targetIndex;
      const offset = -100 * activeIndex;
      track.style.transform = `translateX(${offset}%)`;
      animateSlideCounters(activeIndex);
      updateProgressBars(activeIndex);
      updateDots();

      if (!auto) {
        restartAutoRotate();
      }
    }

    function createDots(){
      const container = ensureDotsContainer();
      container.innerHTML = '';
      slides.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'kpi-dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Ir para indicador ${idx + 1}`);
        dot.addEventListener('click', () => goToSlide(idx));
        container.appendChild(dot);
      });
    }

    function bindControls(){
      if (prevBtn) {
        prevBtn.addEventListener('click', () => goToSlide(activeIndex - 1));
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', () => goToSlide(activeIndex + 1));
      }
      slider.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          goToSlide(activeIndex - 1);
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          goToSlide(activeIndex + 1);
        }
      });
    }

    function stopAutoRotate(){
      if (autoRotateId) {
        window.clearInterval(autoRotateId);
        autoRotateId = null;
      }
    }

    function startAutoRotate(){
      if (prefersReducedMotion || slides.length <= 1 || !Number.isFinite(autoRotateDelay) || autoRotateDelay <= 0) {
        return;
      }
      stopAutoRotate();
      autoRotateId = window.setInterval(() => {
        goToSlide(activeIndex + 1, { auto: true });
      }, autoRotateDelay);
    }

    function restartAutoRotate(){
      stopAutoRotate();
      startAutoRotate();
    }

    function init(){
      createDots();
      updateDots();
      bindControls();
      track.style.transform = 'translateX(0)';
      updateProgressBars(activeIndex);
      animateSlideCounters(activeIndex);
    }

    init();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateSlideCounters(activeIndex);
          updateProgressBars(activeIndex);
          observer.disconnect();
        }
      });
    }, { threshold: 0.4 });

    observer.observe(slider);

    startAutoRotate();

    slider.addEventListener('mouseenter', stopAutoRotate);
    slider.addEventListener('mouseleave', startAutoRotate);
    slider.addEventListener('focusin', stopAutoRotate);
    slider.addEventListener('focusout', startAutoRotate);
  });
})();
