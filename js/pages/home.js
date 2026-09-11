import { supabase } from '../config/supabase.js';
import { createCard, createFeaturedCard } from '../components/card.js';
import { initCarousel } from '../components/carousel.js';

const featuredContainer = document.getElementById('featuredCarousel');
const recentContainer = document.getElementById('recent-grid');

function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Délai dépassé en contactant Supabase')),
        ms
      )
    )
  ]);
}

/* =========================================================
   CALCUL DES VUES DES ŒUVRES
   ========================================================= */

async function attachSeriesViews(series) {
  console.log('==========================================');
  console.log('HOME : DÉBUT DU CALCUL DES VUES');
  console.log('==========================================');

  if (!series || series.length === 0) {
    console.log('HOME : aucune série trouvée.');
    return series;
  }

  console.log('HOME : séries récupérées :', series);
  console.log('HOME : nombre de séries :', series.length);

  const seriesIds = series.map(seriesItem => seriesItem.id);

  console.log('HOME : IDs des séries :', seriesIds);

  /* ---------------------------------------------------------
     1. RÉCUPÉRER LES CHAPITRES
     --------------------------------------------------------- */

  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('id, series_id')
    .in('series_id', seriesIds);

  console.log('------------------------------------------');
  console.log('HOME : RÉSULTAT CHAPITRES');
  console.log('Chapitres :', chapters);
  console.log('Erreur chapitres :', chaptersError);
  console.log('Nombre de chapitres :', chapters?.length || 0);
  console.log('------------------------------------------');

  if (chaptersError) {
    console.error(
      'HOME : ERREUR lors de la récupération des chapitres :',
      chaptersError
    );

    return series.map(seriesItem => ({
      ...seriesItem,
      views: 0,
      vues: 0
    }));
  }

  if (!chapters || chapters.length === 0) {
    console.warn(
      'HOME : aucun chapitre trouvé pour les séries.'
    );

    return series.map(seriesItem => ({
      ...seriesItem,
      views: 0,
      vues: 0
    }));
  }

  const chapterIds = chapters.map(chapter => chapter.id);

  console.log(
    'HOME : IDs des chapitres utilisés pour chercher les vues :',
    chapterIds
  );

  /* ---------------------------------------------------------
     2. RÉCUPÉRER LES VUES
     --------------------------------------------------------- */

  const { data: views, error: viewsError } = await supabase
    .from('chapter_views')
    .select('id, chapter_id, visitor_id, viewed_at')
    .in('chapter_id', chapterIds);

  console.log('------------------------------------------');
  console.log('HOME : RÉSULTAT CHAPTER_VIEWS');
  console.log('Vues récupérées :', views);
  console.log('Erreur vues :', viewsError);
  console.log('Nombre total de vues récupérées :', views?.length || 0);
  console.log('------------------------------------------');

  if (viewsError) {
    console.error(
      'HOME : ERREUR lors de la récupération des vues :',
      viewsError
    );

    return series.map(seriesItem => ({
      ...seriesItem,
      views: 0,
      vues: 0
    }));
  }

  /* ---------------------------------------------------------
     3. COMPTER LES VUES PAR CHAPITRE
     --------------------------------------------------------- */

  const viewsByChapter = {};

  for (const view of views || []) {
    if (!view.chapter_id) {
      continue;
    }

    viewsByChapter[view.chapter_id] =
      (viewsByChapter[view.chapter_id] || 0) + 1;
  }

  console.log('HOME : VUES PAR CHAPITRE :');
  console.table(viewsByChapter);

  /* ---------------------------------------------------------
     4. ADDITIONNER LES VUES PAR ŒUVRE
     --------------------------------------------------------- */

  const viewsBySeries = {};

  for (const chapter of chapters) {
    const chapterViews =
      viewsByChapter[chapter.id] || 0;

    console.log(
      'HOME : chapitre',
      chapter.id,
      '→ série',
      chapter.series_id,
      '→',
      chapterViews,
      'vue(s)'
    );

    viewsBySeries[chapter.series_id] =
      (viewsBySeries[chapter.series_id] || 0) +
      chapterViews;
  }

  console.log('------------------------------------------');
  console.log('HOME : TOTAL DES VUES PAR ŒUVRE');
  console.log(viewsBySeries);
  console.table(viewsBySeries);
  console.log('------------------------------------------');

  /* ---------------------------------------------------------
     5. AJOUTER LE TOTAL AUX SÉRIES
     --------------------------------------------------------- */

  const result = series.map(seriesItem => {
    const totalViews =
      viewsBySeries[seriesItem.id] || 0;

    console.log(
      'HOME : ŒUVRE :',
      seriesItem.title,
      '| ID :',
      seriesItem.id,
      '| TOTAL VUES :',
      totalViews
    );

    return {
      ...seriesItem,

      views: totalViews,
      vues: totalViews
    };
  });

  console.log('==========================================');
  console.log('HOME : RÉSULTAT FINAL DES SÉRIES');
  console.log('==========================================');

  console.log(result);

  console.table(
    result.map(item => ({
      id: item.id,
      title: item.title,
      views: item.views,
      vues: item.vues
    }))
  );

  return result;
}

/* =========================================================
   CALCUL DES LIKES DES ŒUVRES
   ========================================================= */

async function attachSeriesLikes(series) {
  console.log('==========================================');
  console.log('HOME : DÉBUT DU CALCUL DES LIKES');
  console.log('==========================================');

  if (!series || series.length === 0) {
    console.log('HOME : aucune série trouvée.');
    return series;
  }

  const seriesIds = series.map(seriesItem => seriesItem.id);

  console.log(
    'HOME : IDs des séries pour les likes :',
    seriesIds
  );

  /* ---------------------------------------------------------
     1. RÉCUPÉRER LES CHAPITRES
     --------------------------------------------------------- */

  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('id, series_id')
    .in('series_id', seriesIds);

  console.log('------------------------------------------');
  console.log('HOME : CHAPITRES POUR LES LIKES');
  console.log('Chapitres :', chapters);
  console.log('Erreur chapitres :', chaptersError);
  console.log('------------------------------------------');

  if (chaptersError) {
    console.error(
      'HOME : ERREUR lors de la récupération des chapitres pour les likes :',
      chaptersError
    );

    return series.map(seriesItem => ({
      ...seriesItem,
      likes: 0
    }));
  }

  if (!chapters || chapters.length === 0) {
    console.warn(
      'HOME : aucun chapitre trouvé pour calculer les likes.'
    );

    return series.map(seriesItem => ({
      ...seriesItem,
      likes: 0
    }));
  }

  const chapterIds = chapters.map(chapter => chapter.id);

  /* ---------------------------------------------------------
     2. RÉCUPÉRER LES LIKES
     --------------------------------------------------------- */

  const { data: likes, error: likesError } = await supabase
    .from('likes')
    .select('chapter_id')
    .in('chapter_id', chapterIds);

  console.log('------------------------------------------');
  console.log('HOME : RÉSULTAT LIKES');
  console.log('Likes récupérés :', likes);
  console.log('Erreur likes :', likesError);
  console.log(
    'Nombre total de likes récupérés :',
    likes?.length || 0
  );
  console.log('------------------------------------------');

  if (likesError) {
    console.error(
      'HOME : ERREUR lors de la récupération des likes :',
      likesError
    );

    return series.map(seriesItem => ({
      ...seriesItem,
      likes: 0
    }));
  }

  /* ---------------------------------------------------------
     3. COMPTER LES LIKES PAR CHAPITRE
     --------------------------------------------------------- */

  const likesByChapter = {};

  for (const like of likes || []) {
    if (!like.chapter_id) {
      continue;
    }

    likesByChapter[like.chapter_id] =
      (likesByChapter[like.chapter_id] || 0) + 1;
  }

  console.log('HOME : LIKES PAR CHAPITRE :');
  console.table(likesByChapter);

  /* ---------------------------------------------------------
     4. ADDITIONNER LES LIKES PAR ŒUVRE
     --------------------------------------------------------- */

  const likesBySeries = {};

  for (const chapter of chapters) {
    const chapterLikes =
      likesByChapter[chapter.id] || 0;

    likesBySeries[chapter.series_id] =
      (likesBySeries[chapter.series_id] || 0) +
      chapterLikes;
  }

  console.log('------------------------------------------');
  console.log('HOME : TOTAL DES LIKES PAR ŒUVRE');
  console.log(likesBySeries);
  console.table(likesBySeries);
  console.log('------------------------------------------');

  /* ---------------------------------------------------------
     5. AJOUTER LE TOTAL AUX SÉRIES
     --------------------------------------------------------- */

  const result = series.map(seriesItem => {
    const totalLikes =
      likesBySeries[seriesItem.id] || 0;

    console.log(
      'HOME : ŒUVRE :',
      seriesItem.title,
      '| ID :',
      seriesItem.id,
      '| TOTAL LIKES :',
      totalLikes
    );

    return {
      ...seriesItem,
      likes: totalLikes
    };
  });

  console.log('==========================================');
  console.log('HOME : RÉSULTAT FINAL DES LIKES');
  console.log('==========================================');

  console.table(
    result.map(item => ({
      id: item.id,
      title: item.title,
      likes: item.likes
    }))
  );

  return result;
}

/* =========================================================
   CHARGEMENT DE LA PAGE D'ACCUEIL
   ========================================================= */

async function loadHomePage() {
  console.log('==========================================');
  console.log('HOME : CHARGEMENT DE LA PAGE');
  console.log('==========================================');

  const { data: rawSeries, error } = await withTimeout(
    supabase
      .from('series')
      .select('*')
  );

  console.log('HOME : séries brutes :', rawSeries);
  console.log('HOME : erreur séries :', error);

  if (error) {
    console.error(
      'Erreur Supabase (series):',
      error
    );

    if (recentContainer) {
      recentContainer.innerHTML =
        '<p class="error-state">Erreur lors du chargement des histoires.</p>';
    }

    return;
  }

  if (!rawSeries || rawSeries.length === 0) {
    if (recentContainer) {
      recentContainer.innerHTML =
        '<p class="empty-state">Aucune histoire disponible pour le moment.</p>';
    }

    return;
  }

  /* ========================================================
     CALCUL DES VUES RÉELLES
     ======================================================== */

  let series = await attachSeriesViews(rawSeries);

  /* ========================================================
     CALCUL DES LIKES RÉELS
     ======================================================== */

  series = await attachSeriesLikes(series);

  console.log('==========================================');
  console.log('HOME : SÉRIES APRÈS CALCUL DES VUES ET LIKES');
  console.log('==========================================');

  for (const item of series) {
    console.log(
      `${item.title} → ${item.views} vue(s) · ${item.likes} like(s)`
    );
  }

  /* ========================================================
     CARROUSEL "À LA UNE"
     ======================================================== */

  const featured = [...series]
    .sort(
      (a, b) =>
        (Number(b.views) || 0) -
        (Number(a.views) || 0)
    )
    .slice(0, 6);

  console.log('HOME : À LA UNE :', featured);

  if (featuredContainer) {
    featuredContainer.innerHTML =
      featured
        .map(createFeaturedCard)
        .join('');

    initCarousel({
      viewport: featuredContainer,
      prevBtn: document.getElementById('featuredPrev'),
      nextBtn: document.getElementById('featuredNext'),
      dotsContainer: document.getElementById('featuredDots'),
      itemCount: featured.length,
      visibleCount: 4
    });
  }

  /* ========================================================
     SORTIES RÉCENTES
     ======================================================== */

  const recent = [...series]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0)
    )
    .slice(0, 8);

  console.log('HOME : SORTIES RÉCENTES :', recent);

  if (recentContainer) {
    recentContainer.innerHTML =
      recent
        .map(item => {
          console.log(
            'HOME : ENVOI À createCard() :',
            item.title,
            '| views =',
            item.views,
            '| vues =',
            item.vues,
            '| likes =',
            item.likes
          );

          return createCard(item);
        })
        .join('');
  }

  console.log('==========================================');
  console.log('HOME : CHARGEMENT TERMINÉ');
  console.log('==========================================');
}

/* =========================================================
   LANCEMENT
   ========================================================= */

loadHomePage().catch(err => {
  console.error(
    'HOME : ERREUR INATTENDUE :',
    err
  );

  if (recentContainer) {
    recentContainer.innerHTML =
      `<p class="error-state">
        Impossible de contacter la base de données.
        Vérifie ta connexion et réessaie.
        (${err.message || err})
      </p>`;
  }
});

/* =========================================================
   MENU MOBILE
   ========================================================= */

const mobileMenuBtn =
  document.getElementById('mobileMenuBtn');

const navLinks =
  document.querySelector('.nav-links');

if (mobileMenuBtn && navLinks) {
  mobileMenuBtn.addEventListener('click', () => {
    const isOpen =
      navLinks.classList.toggle('mobile-open');

    mobileMenuBtn.setAttribute(
      'aria-expanded',
      String(isOpen)
    );

    mobileMenuBtn.setAttribute(
      'aria-label',
      isOpen
        ? 'Fermer le menu'
        : 'Ouvrir le menu'
    );

    mobileMenuBtn.textContent =
      isOpen ? '✕' : '☰';
  });

  navLinks
    .querySelectorAll('a')
    .forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove(
          'mobile-open'
        );

        mobileMenuBtn.setAttribute(
          'aria-expanded',
          'false'
        );

        mobileMenuBtn.setAttribute(
          'aria-label',
          'Ouvrir le menu'
        );

        mobileMenuBtn.textContent = '☰';
      });
    });
      }
