export function initCarousel({
  viewport,
  prevBtn,
  nextBtn,
  dotsContainer,
  itemCount,
  visibleCount = 4
}) {
  if (!viewport || itemCount === 0) return;

  // Évite d'initialiser deux fois le même carrousel
  if (viewport.dataset.carouselInitialized === 'true') return;
  viewport.dataset.carouselInitialized = 'true';

  // =================================================
  // CONFIGURATION
  // =================================================

  const AUTO_SPEED = 35; // pixels par seconde
  const pageCount = Math.max(
    1,
    Math.ceil(itemCount / visibleCount)
  );

  // =================================================
  // POINTS DU CARROUSEL
  // =================================================

  if (dotsContainer) {
    dotsContainer.innerHTML = Array.from(
      { length: pageCount },
      (_, i) =>
        `<span data-page="${i}" class="${
          i === 0 ? 'active' : ''
        }"></span>`
    ).join('');
  }

  // =================================================
  // CARTES ORIGINALES
  // =================================================

  const originalCards = [
    ...viewport.querySelectorAll('.featured-card')
  ];

  if (originalCards.length <= 1) {
    return;
  }

  // =================================================
  // CALCUL DU GAP RÉEL
  // =================================================

  function getGap() {
    const style = window.getComputedStyle(viewport);

    const gap =
      parseFloat(style.columnGap) ||
      parseFloat(style.gap) ||
      18;

    return gap;
  }

  // =================================================
  // LARGEUR D'UNE SÉRIE COMPLÈTE
  // =================================================

  function getSetWidth() {
    const firstCard = originalCards[0];

    if (!firstCard) return 0;

    const cardWidth =
      firstCard.getBoundingClientRect().width;

    const gap = getGap();

    return (
      (cardWidth + gap) * originalCards.length
    );
  }

  // =================================================
  // DUPLICATION DE LA SÉRIE
  // =================================================

  originalCards.forEach((card) => {
    const clone = card.cloneNode(true);

    clone.dataset.carouselClone = 'true';

    viewport.appendChild(clone);
  });

  // =================================================
  // DÉFILEMENT MANUEL
  // =================================================

  function scrollByPage(direction) {
    const card = originalCards[0];

    if (!card) return;

    const cardWidth =
      card.getBoundingClientRect().width;

    const gap = getGap();

    const distance =
      (cardWidth + gap) * visibleCount;

    viewport.scrollBy({
      left: direction * distance,
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
  // POINTS
  // =================================================

  function updateDots() {
    if (!dotsContainer) return;

    const setWidth = getSetWidth();

    if (setWidth <= 0) return;

    let position =
      viewport.scrollLeft % setWidth;

    if (position < 0) {
      position += setWidth;
    }

    const progress = position / setWidth;

    const activeIndex = Math.min(
      pageCount - 1,
      Math.floor(progress * pageCount)
    );

    dotsContainer
      .querySelectorAll('span')
      .forEach((dot, index) => {
        dot.classList.toggle(
          'active',
          index === activeIndex
        );
      });
  }

  viewport.addEventListener('scroll', updateDots);

  // =================================================
  // ANIMATION CONTINUE
  // =================================================

  let animationFrame = null;
  let lastTime = null;

  function animate(currentTime) {
    if (lastTime === null) {
      lastTime = currentTime;
    }

    const deltaTime =
      currentTime - lastTime;

    lastTime = currentTime;

    const setWidth = getSetWidth();

    if (setWidth > 0) {
      const movement =
        AUTO_SPEED * (deltaTime / 1000);

      viewport.scrollLeft += movement;

      // =================================================
      // BOUCLE PARFAITEMENT INVISIBLE
      // =================================================

      if (
        viewport.scrollLeft >=
        setWidth
      ) {
        viewport.scrollLeft -= setWidth;
      }

      updateDots();
    }

    animationFrame =
      requestAnimationFrame(animate);
  }

  animationFrame =
    requestAnimationFrame(animate);

  // =================================================
  // NETTOYAGE SI LA PAGE EST QUITTÉE
  // =================================================

  window.addEventListener(
    'beforeunload',
    () => {
      if (animationFrame) {
        cancelAnimationFrame(
          animationFrame
        );
      }
    },
    { once: true }
  );
                 }
