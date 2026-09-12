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

  // =====================================================
  // POINTS DE NAVIGATION
  // =====================================================

  if (dotsContainer) {
    dotsContainer.innerHTML = Array.from(
      { length: pageCount }
    )
      .map(
        (_, i) =>
          `<span data-page="${i}" class="${i === 0 ? 'active' : ''}"></span>`
      )
      .join('');
  }

  // =====================================================
  // DÉFILEMENT MANUEL
  // =====================================================

  function scrollByPage(direction) {
    const card =
      viewport.querySelector('.featured-card');

    if (!card) return;

    const cardWidth =
      card.getBoundingClientRect().width;

    const gap = 18;

    viewport.scrollBy({
      left:
        direction *
        (cardWidth + gap) *
        visibleCount,
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

  // =====================================================
  // MISE À JOUR DES POINTS
  // =====================================================

  if (dotsContainer) {
    let scrollTimeout;

    viewport.addEventListener(
      'scroll',
      () => {
        clearTimeout(scrollTimeout);

        scrollTimeout = setTimeout(() => {
          const maxScroll =
            viewport.scrollWidth -
            viewport.clientWidth;

          const progress =
            maxScroll > 0
              ? viewport.scrollLeft / maxScroll
              : 0;

          const activeIndex =
            Math.round(
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
      }
    );
  }

  // =====================================================
  // ANIMATION AUTOMATIQUE CONTINUE
  // =====================================================

  let autoScrollAnimation = null;
  let lastTime = null;

  const AUTO_SPEED = 25;

  // =====================================================
  // PRÉPARATION DE LA BOUCLE INFINIE
  // =====================================================

  const originalCards = [
    ...viewport.querySelectorAll(
      '.featured-card'
    )
  ];

  if (originalCards.length > 1) {
    originalCards.forEach(card => {
      const clone =
        card.cloneNode(true);

      clone.setAttribute(
        'data-carousel-clone',
        'true'
      );

      viewport.appendChild(clone);
    });
  }

  // =====================================================
  // ANIMATION
  // =====================================================

  function startAutoScroll() {
    cancelAnimationFrame(
      autoScrollAnimation
    );

    lastTime = null;

    function animate(currentTime) {

      if (lastTime === null) {
        lastTime = currentTime;
      }

      const deltaTime =
        currentTime - lastTime;

      lastTime = currentTime;

      // -------------------------------------------------
      // PAS ASSEZ D'ŒUVRES
      // -------------------------------------------------

      if (originalCards.length <= 1) {

        autoScrollAnimation =
          requestAnimationFrame(
            animate
          );

        return;
      }

      // -------------------------------------------------
      // LARGEUR D'UNE CARTE
      // -------------------------------------------------

      const firstCard =
        originalCards[0];

      if (!firstCard) {
        autoScrollAnimation =
          requestAnimationFrame(
            animate
          );

        return;
      }

      const cardWidth =
        firstCard.getBoundingClientRect()
          .width;

      const gap = 18;

      const oneSetWidth =
        (cardWidth + gap) *
        originalCards.length;

      // -------------------------------------------------
      // DÉFILEMENT CONTINU
      // -------------------------------------------------

      viewport.scrollLeft +=
        AUTO_SPEED *
        (deltaTime / 1000);

      // -------------------------------------------------
      // RETOUR INVISIBLE AU DÉBUT
      // -------------------------------------------------

      if (
        viewport.scrollLeft >=
        oneSetWidth
      ) {
        viewport.scrollLeft -=
          oneSetWidth;
      }

      autoScrollAnimation =
        requestAnimationFrame(
          animate
        );
    }

    autoScrollAnimation =
      requestAnimationFrame(
        animate
      );
  }

  startAutoScroll();
}      requestAnimationFrame(animate);
  }

  autoScrollAnimation =
    requestAnimationFrame(animate);
}

startAutoScroll();}
