import { supabase } from '../config/supabase.js';
import { normalizeSeries } from '../components/card.js';
import { normalizeChapter, createChapterRow } from '../components/chapter-item.js';

const headerContainer = document.getElementById('seriesHeader');
const chaptersContainer = document.getElementById('chaptersList');
const chaptersCountEl = document.getElementById('chaptersCount');

function getSeriesIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function typeLabel(rawType) {
  const slug = (rawType || 'webnovel').toString().trim().toLowerCase();

  const labels = {
    novel: 'Roman',
    roman: 'Roman',
    webnovel: 'Webnovel',
    webtoon: 'Webcomic',
    webcomic: 'Webcomic',
    manga: 'Manga'
  };

  return labels[slug] || rawType || 'Webnovel';
}

/* =========================================================
   AFFICHAGE DE L'ŒUVRE
========================================================= */

function renderSeriesHeader(rawItem) {
  const item = normalizeSeries(rawItem);
  const slug = (item.type || 'webnovel').toString().trim().toLowerCase();

  document.title = `${item.title} — BSCompany`;

  headerContainer.innerHTML = `
    <div class="series-cover-lg">
      <img src="${item.coverUrl}" alt="${item.title}" onerror="this.remove()">
    </div>

    <div class="series-info">
      <span class="type-badge type-${slug}">
        ${typeLabel(item.type)}
      </span>

      <h1>${item.title}</h1>

      <div class="series-tags">
        ${item.genre ? `<span class="series-tag">${item.genre}</span>` : ''}

        <span class="series-tag">
          ${
            item.status === 'completed'
              ? 'Terminé'
              : item.status === 'hiatus'
                ? 'En pause'
                : 'En cours'
          }
        </span>
      </div>

      <p class="series-desc">
        ${item.description || 'Aucune description disponible pour le moment.'}
      </p>

      <div class="series-stats">
        <span>👁 ${item.views}</span>
        <span>❤️ ${item.likes}</span>
      </div>
    </div>
  `;
}

/* =========================================================
   CALCUL DES VUES DE L'ŒUVRE
========================================================= */

async function getSeriesViews(seriesId) {
  console.log('==========================================');
  console.log('SERIE : CALCUL DES VUES');
  console.log('Série ID :', seriesId);
  console.log('==========================================');

  /* ---------------------------------------------------------
     1. Récupérer les chapitres de cette œuvre
  --------------------------------------------------------- */

  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('id, series_id')
    .eq('series_id', seriesId);

  console.log('SERIE : chapitres :', chapters);
  console.log('SERIE : erreur chapitres :', chaptersError);

  if (chaptersError) {
    console.error(
      'SERIE : impossible de récupérer les chapitres :',
      chaptersError
    );

    return 0;
  }

  if (!chapters || chapters.length === 0) {
    console.log('SERIE : aucun chapitre pour cette œuvre.');
    return 0;
  }

  const chapterIds = chapters.map(chapter => chapter.id);

  console.log(
    'SERIE : IDs des chapitres :',
    chapterIds
  );

  /* ---------------------------------------------------------
     2. Récupérer les vues de ces chapitres
  --------------------------------------------------------- */

  const { data: views, error: viewsError } = await supabase
    .from('chapter_views')
    .select('id, chapter_id, visitor_id, viewed_at')
    .in('chapter_id', chapterIds);

  console.log('SERIE : vues récupérées :', views);
  console.log('SERIE : erreur vues :', viewsError);

  if (viewsError) {
    console.error(
      'SERIE : impossible de récupérer les vues :',
      viewsError
    );

    return 0;
  }

  const totalViews = views ? views.length : 0;

  console.log(
    'SERIE : TOTAL DES VUES =',
    totalViews
  );

  return totalViews;
}

/* =========================================================
   CALCUL DES LIKES DE L'ŒUVRE
========================================================= */

async function getSeriesLikes(seriesId) {
  console.log('==========================================');
  console.log('SERIE : CALCUL DES LIKES');
  console.log('Série ID :', seriesId);
  console.log('==========================================');

  /* ---------------------------------------------------------
     1. Récupérer les chapitres de cette œuvre
  --------------------------------------------------------- */

  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('id, series_id')
    .eq('series_id', seriesId);

  console.log('SERIE : chapitres pour les likes :', chapters);
  console.log(
    'SERIE : erreur chapitres pour les likes :',
    chaptersError
  );

  if (chaptersError) {
    console.error(
      'SERIE : impossible de récupérer les chapitres pour les likes :',
      chaptersError
    );

    return 0;
  }

  if (!chapters || chapters.length === 0) {
    console.log('SERIE : aucun chapitre pour calculer les likes.');
    return 0;
  }

  const chapterIds = chapters.map(chapter => chapter.id);

  console.log(
    'SERIE : IDs des chapitres pour les likes :',
    chapterIds
  );

  /* ---------------------------------------------------------
     2. Récupérer les likes de ces chapitres
  --------------------------------------------------------- */

  const { data: likes, error: likesError } = await supabase
    .from('likes')
    .select('chapter_id')
    .in('chapter_id', chapterIds);

  console.log('SERIE : likes récupérés :', likes);
  console.log('SERIE : erreur likes :', likesError);

  if (likesError) {
    console.error(
      'SERIE : impossible de récupérer les likes :',
      likesError
    );

    return 0;
  }

  const totalLikes = likes ? likes.length : 0;

  console.log(
    'SERIE : TOTAL DES LIKES =',
    totalLikes
  );

  return totalLikes;
}

/* =========================================================
   CHARGEMENT DE LA PAGE
========================================================= */

async function loadSeriePage() {
  const seriesId = getSeriesIdFromUrl();

  if (!seriesId) {
    headerContainer.innerHTML =
      '<p class="error-state">Aucune œuvre sélectionnée.</p>';

    return;
  }

  /* ---------------------------------------------------------
     1. Récupérer l'œuvre
  --------------------------------------------------------- */

  const { data: series, error: seriesError } = await supabase
    .from('series')
    .select('*')
    .eq('id', seriesId)
    .single();

  if (seriesError || !series) {
    console.error(
      'Erreur Supabase (series):',
      seriesError
    );

    headerContainer.innerHTML =
      '<p class="error-state">Cette œuvre est introuvable.</p>';

    return;
  }

  /* ---------------------------------------------------------
     2. Calculer les vraies vues depuis chapter_views
  --------------------------------------------------------- */

  const totalViews = await getSeriesViews(seriesId);

  console.log(
    'SERIE : vues finales pour',
    series.title,
    '=',
    totalViews
  );

  /* ---------------------------------------------------------
     3. Calculer les vrais likes depuis likes
  --------------------------------------------------------- */

  const totalLikes = await getSeriesLikes(seriesId);

  console.log(
    'SERIE : likes finaux pour',
    series.title,
    '=',
    totalLikes
  );

  /*
     On met à jour les propriétés utilisées par normalizeSeries().

     normalizeSeries() utilise :
     item.vues ?? item.views ?? 0
     et
     item.likes ?? 0
  */

  const seriesWithStats = {
    ...series,
    views: totalViews,
    vues: totalViews,
    likes: totalLikes
  };

  /* ---------------------------------------------------------
     4. Afficher l'en-tête
  --------------------------------------------------------- */

  renderSeriesHeader(seriesWithStats);

  /* ---------------------------------------------------------
     5. Récupérer les chapitres
  --------------------------------------------------------- */

  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('*')
    .eq('series_id', seriesId);

  if (chaptersError) {
    console.error(
      'Erreur Supabase (chapters):',
      chaptersError
    );

    chaptersContainer.innerHTML =
      '<p class="error-state">Impossible de charger les chapitres.</p>';

    return;
  }

  if (!chapters || chapters.length === 0) {
    chaptersCountEl.textContent =
      'Aucun chapitre publié pour le moment.';

    chaptersContainer.innerHTML =
      '<p class="empty-state">Cette œuvre n\'a pas encore de chapitre en ligne.</p>';

    return;
  }

  /* ---------------------------------------------------------
     6. Trier les chapitres
  --------------------------------------------------------- */

  const sorted = [...chapters].sort((a, b) => {
    const na = normalizeChapter(a).number ?? 0;
    const nb = normalizeChapter(b).number ?? 0;

    return na - nb;
  });

  chaptersCountEl.textContent =
    `${sorted.length} chapitre${sorted.length > 1 ? 's' : ''}`;

  chaptersContainer.innerHTML =
    sorted.map(createChapterRow).join('');
}

/* =========================================================
   LANCEMENT
========================================================= */

loadSeriePage().catch(err => {
  console.error(
    'Erreur inattendue au chargement de la page:',
    err
  );

  if (headerContainer) {
    headerContainer.innerHTML = `
      <p class="error-state">
        Impossible de contacter la base de données.
        (${err.message || err})
      </p>
    `;
  }
});
