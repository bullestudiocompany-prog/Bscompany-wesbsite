export function initCarousel({
  viewport,
  prevBtn,
  nextBtn,
  dotsContainer,
  itemCount,
  visibleCount = 4
}) {
  if (!viewport || itemCount === 0) return;

  const pageCount = Math.max(
    1,
    Math.ceil(itemCount / visibleCount)
  );

  // =================================================
  // POINTS DU CARROUSEL
  // =================================================

  if (dotsContainer) {
    dotsContainer.innerHTML = Array.from({ length: pageCount })
      .map(
        (_, i) =>
          `<span data-page="${i}" class="${
            i === 0 ? 'active' : ''
          }"></span>`
      )
      .join('');
  }

  // =================================================
  // DÉFILEMENT MANUEL
  // =================================================

  function scrollByPage(direction) {
    const card = viewport.querySelector('.featured-card');

    if (!card) return;

    const cardWidth = card.getBoundingClientRect().width;
    const gap = 18;

    viewport.scrollBy({
      left: direction * (cardWidth + gap) * visibleCount,
      behavior: 'smooth'
    });
  }

  prevBtn?.addEventListener('click', () => {
    scrollByPage(-1);
  });

  nextBtn?.addEventListener('click', () => {
    scrollByPage(1);
  });

  // =================================================
  // MISE À JOUR DES POINTS
  // =================================================

  if (dotsContainer) {
    let scrollTimeout;

    viewport.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);

      scrollTimeout = setTimeout(() => {
        const maxScroll =
          viewport.scrollWidth - viewport.clientWidth;

        const progress =
          maxScroll > 0
            ? viewport.scrollLeft / maxScroll
            : 0;

        const activeIndex = Math.round(
          progress * (pageCount - 1)
        );

        dotsContainer
          .querySelectorAll('span')
          .forEach((dot, i) => {
            dot.classList.toggle(
              'active',
              i === activeIndex
            );
          });
      }, 80);
    });
  }

  // =================================================
  // ANIMATION AUTOMATIQUE
  // =================================================

  let autoScrollTimer;

  function startAutoScroll() {
    clearInterval(autoScrollTimer);

    autoScrollTimer = setInterval(() => {
      const cards = [
        ...viewport.querySelectorAll('.featured-card')
      ];

      if (cards.length <= 1) return;

      const card = cards[0];

      if (!card) return;

      const cardWidth =
        card.getBoundingClientRect().width;

      const gap = 18;

      const maxScroll =
        viewport.scrollWidth - viewport.clientWidth;

      // =================================================
      // CAS NORMAL
      // =================================================

      if (maxScroll > 0) {
        const currentScroll =
          viewport.scrollLeft;

        const nextPosition =
          currentScroll + cardWidth + gap;

        if (nextPosition >= maxScroll - 2) {
          viewport.scrollTo({
            left: 0,
            behavior: 'smooth'
          });
        } else {
          viewport.scrollTo({
            left: nextPosition,
            behavior: 'smooth'
          });
        }

        return;
      }

      // =================================================
      // CAS : PAS ASSEZ D'ŒUVRES POUR DÉFILER
      // =================================================

      const clone = card.cloneNode(true);

      viewport.appendChild(clone);

      const newMaxScroll =
        viewport.scrollWidth - viewport.clientWidth;

      viewport.scrollTo({
        left: newMaxScroll,
        behavior: 'smooth'
      });

      setTimeout(() => {
        if (!card.isConnected) return;

        card.remove();

        if (clone.isConnected) {
          clone.replaceWith(card);
        }

        viewport.scrollLeft = 0;
      }, 700);

    }, 5000);
  }

  startAutoScroll();
    }
