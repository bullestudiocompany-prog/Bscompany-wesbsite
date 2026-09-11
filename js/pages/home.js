import { supabase } from '../config/supabase.js';
import {
  createCard,
  createFeaturedCard,
  timeAgo
} from '../components/card.js';
import { initCarousel } from '../components/carousel.js';


// =====================================================
// DOM
// =====================================================

const featuredContainer =
  document.getElementById('featuredCarousel');

const recentContainer =
  document.getElementById('recent-grid');

const featuredPrev =
  document.getElementById('featuredPrev');

const featuredNext =
  document.getElementById('featuredNext');

const featuredDots =
  document.getElementById('featuredDots');


// =====================================================
// TIMEOUT
// =====================================================

function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Timeout')),
        ms
      )
    )
  ]);
}


// =====================================================
// AJOUT DES VUES AUX SÉRIES
// =====================================================

async function attachSeriesViews(series) {
  if (!series?.length) return series;

  const seriesIds = series.map(item => item.id);

  const { data: chapters, error: chaptersError } =
    await withTimeout(
      supabase
        .from('chapters')
        .select('id, series_id')
        .in('series_id', seriesIds),
      8000
    );

  if (chaptersError) {
    console.error(
      'HOME : ERREUR CHAPITRES POUR LES VUES :',
      chaptersError
    );

    return series.map(item => ({
      ...item,
      views: 0,
      vues: 0
    }));
  }

  if (!chapters?.length) {
    return series.map(item => ({
      ...item,
      views: 0,
      vues: 0
    }));
  }

  const chapterIds =
    chapters.map(chapter => chapter.id);

  const { data: viewRows, error: viewsError } =
    await withTimeout(
      supabase
        .from('chapter_views')
        .select('chapter_id')
        .in('chapter_id', chapterIds),
      8000
    );

  if (viewsError) {
    console.error(
      'HOME : ERREUR VUES :',
      viewsError
    );

    return series.map(item => ({
      ...item,
      views: 0,
      vues: 0
    }));
  }

  const viewsByChapter = {};

  (viewRows || []).forEach(row => {
    viewsByChapter[row.chapter_id] =
      (viewsByChapter[row.chapter_id] || 0) + 1;
  });

  const viewsBySeries = {};

  chapters.forEach(chapter => {
    const count =
      viewsByChapter[chapter.id] || 0;

    viewsBySeries[chapter.series_id] =
      (viewsBySeries[chapter.series_id] || 0) + count;
  });

  return series.map(item => {
    const total =
      viewsBySeries[item.id] || 0;

    return {
      ...item,
      views: total,
      vues: total
    };
  });
}


// =====================================================
// AJOUT DES LIKES AUX SÉRIES
// =====================================================

async function attachSeriesLikes(series) {
  if (!series?.length) return series;

  const seriesIds =
    series.map(item => item.id);

  const { data: chapters, error: chaptersError } =
    await withTimeout(
      supabase
        .from('chapters')
        .select('id, series_id')
        .in('series_id', seriesIds),
      8000
    );

  if (chaptersError) {
    console.error(
      'HOME : ERREUR CHAPITRES POUR LES LIKES :',
      chaptersError
    );

    return series.map(item => ({
      ...item,
      likes: 0
    }));
  }

  if (!chapters?.length) {
    return series.map(item => ({
      ...item,
      likes: 0
    }));
  }

  const chapterIds =
    chapters.map(chapter => chapter.id);

  const { data: likeRows, error: likesError } =
    await withTimeout(
      supabase
        .from('likes')
        .select('chapter_id')
        .in('chapter_id', chapterIds),
      8000
    );

  if (likesError) {
    console.error(
      'HOME : ERREUR LIKES :',
      likesError
    );

    return series.map(item => ({
      ...item,
      likes: 0
    }));
  }

  const likesByChapter = {};

  (likeRows || []).forEach(row => {
    likesByChapter[row.chapter_id] =
      (likesByChapter[row.chapter_id] || 0) + 1;
  });

  const likesBySeries = {};

  chapters.forEach(chapter => {
    const count =
      likesByChapter[chapter.id] || 0;

    likesBySeries[chapter.series_id] =
      (likesBySeries[chapter.series_id] || 0) + count;
  });

  return series.map(item => ({
    ...item,
    likes:
      likesBySeries[item.id] || 0
  }));
}


// =====================================================
// CHARGEMENT DE LA PAGE D'ACCUEIL
// =====================================================

async function loadHomePage() {
  try {

    // =================================================
    // CHARGEMENT DES SÉRIES
    // =================================================

    const {
      data: rawSeries,
      error: seriesError
    } = await withTimeout(
      supabase
        .from('series')
        .select('*'),
      8000
    );

    if (seriesError) {
      console.error(
        'HOME : ERREUR CHARGEMENT SÉRIES :',
        seriesError
      );

      if (recentContainer) {
        recentContainer.innerHTML =
          '<p class="empty-message">Impossible de charger les œuvres.</p>';
      }

      return;
    }

    if (!rawSeries?.length) {
      console.log(
        'HOME : AUCUNE SÉRIE DISPONIBLE'
      );

      if (recentContainer) {
        recentContainer.innerHTML =
          '<p class="empty-message">Aucune œuvre disponible pour le moment.</p>';
      }

      return;
    }


    // =================================================
    // AJOUT DES VUES
    // =================================================

    let series =
      await attachSeriesViews(rawSeries);


    // =================================================
    // AJOUT DES LIKES
    // =================================================

    series =
      await attachSeriesLikes(series);


    // =================================================
    // À LA UNE
    // Basé sur les vues
    // =================================================

    const featured = [...series]
      .sort(
        (a, b) =>
          Number(b.views || b.vues || 0) -
          Number(a.views || a.vues || 0)
      )
      .slice(0, 6);

    console.log(
      'HOME : À LA UNE :',
      featured
    );

    if (featuredContainer) {

      featuredContainer.innerHTML =
        featured
          .map(item =>
            createFeaturedCard(item)
          )
          .join('');

      try {

  initCarousel({
  viewport: featuredContainer,
  prevBtn: featuredPrev,
  nextBtn: featuredNext,
  dotsContainer: featuredDots,
  itemCount: featured.length,
  visibleCount: 4
});

} catch (carouselError) {

  console.error(
    'HOME : ERREUR CARROUSEL :',
    carouselError
  );

}
    }


    // =================================================
    // SORTIES RÉCENTES
    //
    // Un chapitre est considéré comme récent
    // pendant 96 heures après sa publication.
    // =================================================

    const FOUR_DAYS =
      4 * 24 * 60 * 60 * 1000;

    const now =
      Date.now();


    // =================================================
    // RÉCUPÉRATION DES CHAPITRES
    // =================================================

    const {
      data: chapters,
      error: chaptersError
    } = await withTimeout(
      supabase
        .from('chapters')
        .select(`
          id,
          series_id,
          chapter_number,
          chapter_label,
          title,
          published_at
        `)
        .not(
          'published_at',
          'is',
          null
        )
        .order(
          'published_at',
          {
            ascending: false
          }
        ),
      8000
    );


    // =================================================
    // ERREUR CHARGEMENT CHAPITRES
    // =================================================

    if (chaptersError) {

      console.error(
        'HOME : ERREUR CHARGEMENT CHAPITRES RÉCENTS :',
        chaptersError
      );

      if (recentContainer) {
        recentContainer.innerHTML =
          '<p class="empty-message">Impossible de charger les sorties récentes.</p>';
      }

      return;
    }


    // =================================================
    // INDEX DES SÉRIES
    // =================================================

    const seriesMap =
      new Map(
        series.map(item => [
          String(item.id),
          item
        ])
      );


    // =================================================
    // FILTRE DES CHAPITRES DES 96 DERNIÈRES HEURES
    // =================================================

    const recentChapters =
      (chapters || [])
        .filter(chapter => {

          const publishedAt =
            new Date(
              chapter.published_at
            ).getTime();


          // Date invalide
          if (
            Number.isNaN(
              publishedAt
            )
          ) {
            return false;
          }


          // Ne pas afficher une date future
          if (
            publishedAt > now
          ) {
            return false;
          }


          // Seulement les chapitres
          // publiés depuis moins de 96 heures
          return (
            now - publishedAt <
            FOUR_DAYS
          );

        });


    // =================================================
    // UNE SEULE SORTIE PAR ŒUVRE
    //
    // Les chapitres sont triés du plus récent
    // au plus ancien.
    //
    // Le premier chapitre rencontré pour une série
    // est donc son dernier chapitre publié.
    // =================================================

    const recentBySeries =
      new Map();


    for (const chapter of recentChapters) {

      const seriesId =
        String(
          chapter.series_id
        );


      if (
        !recentBySeries.has(seriesId)
      ) {

        recentBySeries.set(
          seriesId,
          chapter
        );

      }

    }


    // =================================================
    // MAXIMUM 8 ŒUVRES RÉCENTES
    // =================================================

    const recentUniqueChapters =
      Array.from(
        recentBySeries.values()
      ).slice(0, 8);


    console.log(
      'HOME : SORTIES RÉCENTES UNIQUES :',
      recentUniqueChapters
    );


    // =================================================
    // AFFICHAGE DES SORTIES RÉCENTES
    // =================================================

    if (recentContainer) {

      const cards =
        recentUniqueChapters
          .map(chapter => {

            const seriesItem =
              seriesMap.get(
                String(
                  chapter.series_id
                )
              );


            // Si la série correspondante
            // n'existe plus
            if (!seriesItem) {

              console.warn(
                'HOME : SÉRIE INTROUVABLE POUR LE CHAPITRE :',
                chapter
              );

              return '';

            }


            console.log(
              'HOME : SORTIE RÉCENTE :',
              seriesItem.title,
              '| chapitre =',
              chapter.chapter_label ??
                chapter.chapter_number,
              '| publié =',
              chapter.published_at
            );


            // ------------------------------------------------
            // La carte reçoit :
            //
            // Nom de l'œuvre
            // Chapitre / libellé personnalisé
            // Temps depuis publication
            // ------------------------------------------------

            return createCard(
              seriesItem,
              {
                chapterLabel:
                  chapter.chapter_label ??
                  chapter.chapter_number,

                timeAgoLabel:
                  timeAgo(
                    chapter.published_at
                  )
              }
            );

          })
          .join('');


      // =================================================
      // AUCUNE SORTIE RÉCENTE
      // =================================================

      if (!cards) {

        recentContainer.innerHTML =
          '<p class="empty-message">Aucune sortie récente pour le moment.</p>';

      } else {

        recentContainer.innerHTML =
          cards;

      }

    }

  } catch (error) {

    console.error(
      'HOME : ERREUR GÉNÉRALE :',
      error
    );

    if (recentContainer) {

      recentContainer.innerHTML =
        '<p class="empty-message">Une erreur est survenue lors du chargement.</p>';

    }
  }
}


// =====================================================
// LANCEMENT
// =====================================================

loadHomePage();


// =====================================================
// MENU MOBILE
// =====================================================

const menuToggle =
  document.querySelector(
    '.menu-toggle'
  );

const mobileMenu =
  document.querySelector(
    '.mobile-menu'
  );


if (
  menuToggle &&
  mobileMenu
) {

  menuToggle.addEventListener(
    'click',
    () => {

      mobileMenu.classList.toggle(
        'active'
      );

      menuToggle.classList.toggle(
        'active'
      );

    }
  );


  // ---------------------------------------------------
  // Fermeture du menu lorsqu'on clique sur un lien
  // ---------------------------------------------------

  mobileMenu
    .querySelectorAll('a')
    .forEach(link => {

      link.addEventListener(
        'click',
        () => {

          mobileMenu.classList.remove(
            'active'
          );

          menuToggle.classList.remove(
            'active'
          );

        }
      );

    });

      }
