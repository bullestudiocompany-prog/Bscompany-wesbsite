export function initCarousel({ viewport, prevBtn, nextBtn, dotsContainer, itemCount, visibleCount = 4 }) {
  if (!viewport || itemCount === 0) return;

  const pageCount = Math.max(1, Math.ceil(itemCount / visibleCount));

  if (dotsContainer) {
    dotsContainer.innerHTML = Array.from({ length: pageCount })
      .map((_, i) => `<span data-page="${i}" class="${i === 0 ? 'active' : ''}"></span>`)
      .join('');
  }

  function scrollByPage(direction) {
    const card = viewport.querySelector('.featured-card');
    if (!card) return;
    const cardWidth = card.getBoundingClientRect().width;
    const gap = 18;
    viewport.scrollBy({ left: direction * (cardWidth + gap) * visibleCount, behavior: 'smooth' });
  }

  prevBtn?.addEventListener('click', () => scrollByPage(-1));
  nextBtn?.addEventListener('click', () => scrollByPage(1));

  if (dotsContainer) {
    let scrollTimeout;
    viewport.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const maxScroll = viewport.scrollWidth - viewport.clientWidth;
        const progress = maxScroll > 0 ? viewport.scrollLeft / maxScroll : 0;
        const activeIndex = Math.round(progress * (pageCount - 1));
        dotsContainer.querySelectorAll('span').forEach((dot, i) => {
          dot.classList.toggle('active', i === activeIndex);
        });
      }, 80);
    });
  }

    // =================================================
  //  // =================================================
  // ANIMATION AUTOMATIQUE
  // =================================================

  let autoScrollTimer;

  function startAutoScroll() {

    clearInterval(autoScrollTimer);

    autoScrollTimer = setInterval(() => {

      const maxScroll =
        viewport.scrollWidth -
        viewport.clientWidth;

      if (maxScroll <= 0) return;

      const card =
        viewport.querySelector('.featured-card');

      if (!card) return;

      const cardWidth =
        card.getBoundingClientRect().width;

      const gap = 18;

      const pageWidth =
        (cardWidth + gap) *
        visibleCount;

      if (
        viewport.scrollLeft >=
        maxScroll - 5
      ) {

        viewport.scrollTo({
          left: 0,
          behavior: 'smooth'
        });

      } else {

        viewport.scrollBy({
          left: pageWidth,
          behavior: 'smooth'
        });

      }

    }, 5000);
  }

  startAutoScroll();
}

