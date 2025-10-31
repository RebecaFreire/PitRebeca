  (function(){
  document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function initSlider(slider){
      const track = slider.querySelector('[data-slider-track]');
      if (!track) {
        return null;
      }
      const slides = Array.from(track.children);
      if (!slides.length) {
        return null;
      }

      const prevBtn = slider.querySelector('[data-slider-prev]');
      const nextBtn = slider.querySelector('[data-slider-next]');
      const dotsContainer = slider.querySelector('[data-slider-dots]');
      const autoRotate = slider.dataset.autoplay === 'true';
      const autoRotateDelay = Number(slider.dataset.interval || 8000);
      const loop = slider.dataset.loop !== 'false';
      const dotClass = slider.dataset.dotClass || 'slider-dot';

      let activePage = 0;
      let slidesPerView = 1;
      let pageCount = 1;
      let autoRotateId = null;

      function getSlidesPerView(){
        const styleValue = window.getComputedStyle(slider).getPropertyValue('--slides-per-view');
        const numeric = parseFloat(styleValue);
        if (!Number.isNaN(numeric) && numeric > 0) {
          return numeric;
        }
        const datasetValue = parseFloat(slider.dataset.perView || '1');
        return Number.isNaN(datasetValue) || datasetValue <= 0 ? 1 : datasetValue;
      }

      function updateMetrics(){
        slidesPerView = Math.max(1, Math.round(getSlidesPerView()));
        pageCount = Math.max(1, Math.ceil(slides.length / slidesPerView));
      }

      function getState(){
        return { index: activePage, slidesPerView, pageCount };
      }

      function renderDots(){
        if (!dotsContainer) {
          return;
        }
        dotsContainer.innerHTML = '';
        for (let i = 0; i < pageCount; i += 1) {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = dotClass;
          dot.setAttribute('role', 'tab');
          dot.setAttribute('aria-label', `Ir para slide ${i + 1}`);
          dot.addEventListener('click', () => goToSlide(i));
          dotsContainer.appendChild(dot);
        }
      }

      function updateDots(){
        if (!dotsContainer) {
          return;
        }
        const dots = Array.from(dotsContainer.children);
        dots.forEach((dot, idx) => {
          const isActive = idx === activePage;
          dot.classList.toggle('is-active', isActive);
          dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
          dot.setAttribute('tabindex', isActive ? '0' : '-1');
        });
      }

      function emitChange(){
        slider.dispatchEvent(new CustomEvent('sliderChange', {
          detail: getState()
        }));
      }

      function updateSlideVisibility(){
        const start = activePage * slidesPerView;
        const end = start + slidesPerView;
        slides.forEach((slide, index) => {
          const hidden = index < start || index >= end;
          slide.setAttribute('aria-hidden', hidden ? 'true' : 'false');
        });
      }

      function goToSlide(targetPage, { auto = false } = {}){
        updateMetrics();
        if (loop) {
          if (targetPage < 0) {
            targetPage = pageCount - 1;
          }
          if (targetPage >= pageCount) {
            targetPage = 0;
          }
        } else {
          targetPage = Math.max(0, Math.min(targetPage, pageCount - 1));
        }
        activePage = targetPage;
        const offset = -100 * activePage;
        track.style.transform = `translateX(${offset}%)`;
        updateDots();
        updateSlideVisibility();
        emitChange();
        if (autoRotate && !auto) {
          restartAutoRotate();
        }
      }

      function goToNext(auto = false){
        goToSlide(activePage + 1, { auto });
      }

      function goToPrev(auto = false){
        goToSlide(activePage - 1, { auto });
      }

      function stopAutoRotate(){
        if (autoRotateId) {
          window.clearInterval(autoRotateId);
          autoRotateId = null;
        }
      }

      function startAutoRotate(){
        if (!autoRotate || prefersReducedMotion) {
          return;
        }
        updateMetrics();
        if (pageCount <= 1) {
          stopAutoRotate();
          return;
        }
        stopAutoRotate();
        autoRotateId = window.setInterval(() => goToNext(true), autoRotateDelay);
      }

      function restartAutoRotate(){
        stopAutoRotate();
        startAutoRotate();
      }

      function bindControls(){
        if (prevBtn) {
          prevBtn.addEventListener('click', () => goToPrev());
        }
        if (nextBtn) {
          nextBtn.addEventListener('click', () => goToNext());
        }
        slider.addEventListener('keydown', (event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goToPrev();
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            goToNext();
          }
        });
        slider.addEventListener('mouseenter', stopAutoRotate);
        slider.addEventListener('mouseleave', startAutoRotate);
        slider.addEventListener('focusin', stopAutoRotate);
        slider.addEventListener('focusout', startAutoRotate);
      }

      function handleResize(){
        const previousPageCount = pageCount;
        const previousSlidesPerView = slidesPerView;
        updateMetrics();
        if (pageCount !== previousPageCount) {
          renderDots();
        }
        if (activePage > pageCount - 1) {
          activePage = pageCount - 1;
        }
        if (activePage < 0) {
          activePage = 0;
        }
        const offset = -100 * activePage;
        track.style.transform = `translateX(${offset}%)`;
        updateDots();
        updateSlideVisibility();
        emitChange();
        if (autoRotate) {
          if (prefersReducedMotion || pageCount <= 1) {
            stopAutoRotate();
          } else if (previousSlidesPerView !== slidesPerView) {
            restartAutoRotate();
          } else if (!autoRotateId) {
            startAutoRotate();
          }
        }
      }

      function init(){
        if (!slider.hasAttribute('role')) {
          slider.setAttribute('role', 'region');
        }
        slider.setAttribute('aria-live', slider.getAttribute('aria-live') || 'polite');
        updateMetrics();
        renderDots();
        updateDots();
        track.style.transform = 'translateX(0)';
        updateSlideVisibility();
        bindControls();
        emitChange();
        startAutoRotate();
        window.addEventListener('resize', handleResize);
      }

      init();

      return {
        goToSlide,
        goToNext,
        goToPrev,
        stopAutoRotate,
        startAutoRotate,
        restartAutoRotate,
        getState,
        destroy(){
          stopAutoRotate();
          window.removeEventListener('resize', handleResize);
        },
        slides
      };
    }

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

    const kpiSlider = document.querySelector('.kpi-slider');
    if (kpiSlider) {
      const sliderApi = initSlider(kpiSlider);
      if (sliderApi) {
        const slides = sliderApi.slides;

        function animateVisibleCounters(index, slidesPerView){
          const start = index * slidesPerView;
          const end = start + slidesPerView;
          for (let i = start; i < end; i += 1) {
            const slide = slides[i];
            if (!slide) {
              continue;
            }
            slide.querySelectorAll('.kpi-value').forEach(animateCounter);
          }
        }

        function updateProgressBars(index, slidesPerView){
          const start = index * slidesPerView;
          const end = start + slidesPerView;
          slides.forEach((slide, slideIndex) => {
            const progress = slide.querySelector('.kpi-progress');
            if (!progress) {
              return;
            }

            const bar = progress.querySelector('.kpi-progress-bar');
            const valueLabel = progress.querySelector('.kpi-progress-value');
            const rawValue = Number(progress.dataset.progress || 0);
            const value = Math.max(0, Math.min(100, rawValue));
            const isVisible = slideIndex >= start && slideIndex < end;

            if (bar) {
              bar.style.setProperty('--progress', isVisible ? `${value}%` : '0%');
            }

            if (valueLabel) {
              valueLabel.textContent = `${value}%`;
            }
          });
        }

        kpiSlider.addEventListener('sliderChange', (event) => {
          const { index, slidesPerView } = event.detail;
          animateVisibleCounters(index, slidesPerView);
          updateProgressBars(index, slidesPerView);
        });

        const observer = new IntersectionObserver((entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const state = sliderApi.getState();
              animateVisibleCounters(state.index, state.slidesPerView);
              updateProgressBars(state.index, state.slidesPerView);
              obs.disconnect();
            }
          });
        }, { threshold: 0.4 });

        observer.observe(kpiSlider);
      }
    }

    const experienceSlider = document.querySelector('.experience-slider');
    if (experienceSlider) {
      initSlider(experienceSlider);
    }
  });
})();
