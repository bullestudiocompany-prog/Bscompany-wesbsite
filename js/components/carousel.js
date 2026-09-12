export function initCarousel({
  viewport,
  prevBtn,
  nextBtn,
  dotsContainer,
  itemCount,
  visibleCount = 4
}) {
  if (!viewport || itemCount === 0) return;

  if (viewport.dataset.carouselInitialized === 'true') {
    return;
  }

  viewport.dataset.carouselInitialized = 'true';

  /* =========================
     CONFIGURATION
  ========================= */

  const AUTO_SPEED = 30;

  /* =========================
     DOTS
  ========================= */

  const pageCount = Math.max(
    1,
    Math.ceil(itemCount / visibleCount)
  );

  if (dotsContainer) {
    dotsContainer.innerHTML = Array.from(
      { length: pageCount },
      (_, index) => `
        <span
          data-page="${index}"
          class="${index === 0 ? 'active' : ''}"
        ></span>
      `
    ).join('');
  }

  /* =========================
     CARTES ORIGINALES
  ========================= */

  const originalCards = [
    ...viewport.querySelectorAll('.featured-card')
  ];

  if (originalCards.length <= 1) {
    return;
  }

  /* =========================
     DÉSACTIVATION DU SNAP
     
     On ne modifie PAS le CSS.
     On désactive seulement le snap
     pendant que ce carrousel tourne.
  ========================= */

  viewport.style.scrollSnapType = 'none';

  /* =========================
     MESURE
  ========================= */

  function getCardWidth() {
    const card = originalCards[0];

    if (!card) return 0;

    return card.getBoundingClientRect().width;
  }

  function getGap() {
    const style =
      window.getComputedStyle(viewport);

    return (
      parseFloat(style.columnGap) ||
      parseFloat(style.gap) ||
      18
    );
  }

  function getSetWidth() {
    const cardWidth = getCardWidth();
    const gap = getGap();

    if (cardWidth <= 0) {
      return 0;
    }

    return (
      (cardWidth + gap) *
      originalCards.length
    );
  }

  /* =========================
     CLONAGE
  ========================= */

  /*
    On crée plusieurs séries de copies.
    Cela garantit qu'il y aura toujours
    du contenu devant le viewport.
  */

  for (let set = 0; set < 4; set++) {
    originalCards.forEach((card) => {
      const clone = card.cloneNode(true);

      clone.dataset.carouselClone = 'true';

      viewport.appendChild(clone);
    });
  }

  /* =========================
     BOUTONS
  ========================= */

  function scrollByPage(direction) {
    const cardWidth = getCardWidth();
    const gap = getGap();

    if (cardWidth <= 0) {
      return;
    }

    const distance =
      (cardWidth + gap) *
      visibleCount;

    viewport.scrollBy({
      left: direction * distance,
      behavior: 'smooth'
    });
  }

  prevBtn?.addEventListener(
    'click',
    () => {
      scrollByPage(-1);
    }
  );

  nextBtn?.addEventListener(
    'click',
    () => {
      scrollByPage(1);
    }
  );

  /* =========================
     DOTS
  ========================= */

  function updateDots() {
    if (!dotsContainer) return;

    const setWidth = getSetWidth();

    if (setWidth <= 0) return;

    let position =
      viewport.scrollLeft % setWidth;

    if (position < 0) {
      position += setWidth;
    }

    const progress =
      position / setWidth;

    const activeIndex = Math.min(
      pageCount - 1,
      Math.floor(
        progress * pageCount
      )
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

  /* =========================
     ANIMATION
  ========================= */

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
        AUTO_SPEED *
        (deltaTime / 1000);

      viewport.scrollLeft += movement;

      /*
        Quand on a parcouru exactement
        une série de cartes, on revient
        en arrière de cette même distance.

        Comme les cartes sont identiques,
        l'utilisateur ne voit aucun saut.
      */

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

  /* =========================
     RETOUR AU TEMPS NORMAL
     QUAND LA PAGE EST QUITTÉE
  ========================= */

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
