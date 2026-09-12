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
// ANIMATION AUTOMATIQUE FLUIDE
// =================================================

let autoScrollAnimation;
let lastTime = null;

function startAutoScroll() {

  cancelAnimationFrame(autoScrollAnimation);

  lastTime = null;

  function animate(currentTime) {

    if (!lastTime) {
      lastTime = currentTime;
    }

    const deltaTime =
      currentTime - lastTime;

    lastTime = currentTime;

    const cards =
      [...viewport.querySelectorAll('.featured-card')];

    if (cards.length > 1) {

      const card = cards[0];

      const cardWidth =
        card.getBoundingClientRect().width;

      const gap = 18;

      const maxScroll =
        viewport.scrollWidth -
        viewport.clientWidth;

      // =============================================
      // CAS NORMAL : IL Y A DE L'ESPACE POUR DÉFILER
      // =============================================

      if (maxScroll > 0) {

        /*
         * Vitesse en pixels par seconde.
         * 25 = déplacement lent et fluide.
         */
        const speed = 25;

        viewport.scrollLeft +=
          speed * (deltaTime / 1000);

        /*
         * Retour au début lorsqu'on arrive
         * à la fin du carrousel.
         */
        if (
          viewport.scrollLeft >=
          maxScroll - 1
        ) {

          viewport.scrollLeft = 0;

        }

      }

      // =============================================
      // CAS : PAS ASSEZ D'ŒUVRES POUR DÉFILER
      // =============================================

      else {

        /*
         * On ne fait rien ici.
         *
         * Le carrousel reste simplement immobile
         * lorsqu'il n'y a pas assez d'œuvres.
         */
      }
    }

    autoScrollAnimation =
      requestAnimationFrame(animate);
  }

  autoScrollAnimation =
    requestAnimationFrame(animate);
}

startAutoScroll();}
