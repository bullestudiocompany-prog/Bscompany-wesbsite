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
  const labels = { roman: 'Roman', webnovel: 'Webnovel', webtoon: 'Webcomic', webcomic: 'Webcomic', manga: 'Manga' };
  return labels[slug] || rawType || 'Webnovel';
}

function renderSeriesHeader(rawItem) {
  const item = normalizeSeries(rawItem);
  const slug = (item.type || 'webnovel').toString().trim().toLowerCase();

  document.title = `${item.title} — BSCompany`;

  headerContainer.innerHTML = `
    <div class="series-cover-lg">
      <img src="${item.coverUrl}" alt="${item.title}" onerror="this.remove()">
    </div>
    <div class="series-info">
      <span class="type-badge type-${slug}">${typeLabel(item.type)}</span>
      <h1>${item.title}</h1>
      <div class="series-tags">
        ${item.genre ? `<span class="series-tag">${item.genre}</span>` : ''}
        <span class="series-tag">${item.status === 'completed' ? 'Terminé' : item.status === 'hiatus' ? 'En pause' : 'En cours'}</span>
      </div>
      <p class="series-desc">${item.description || 'Aucune description disponible pour le moment.'}</p>
      <div class="series-stats">
        <span>👁 ${item.views}</span>
        <span>★ ${item.rating}</span>
      </div>
    </div>
  `;
}

async function loadSeriePage() {
  const seriesId = getSeriesIdFromUrl();

  if (!seriesId) {
    headerContainer.innerHTML = '<p class="error-state">Aucune œuvre sélectionnée.</p>';
    return;
  }

  const { data: series, error: seriesError } = await supabase
    .from('series')
    .select('*')
    .eq('id', seriesId)
    .single();

  if (seriesError || !series) {
    console.error('Erreur Supabase (series):', seriesError);
    headerContainer.innerHTML = '<p class="error-state">Cette œuvre est introuvable.</p>';
    return;
  }

  renderSeriesHeader(series);

  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('*')
    .eq('series_id', seriesId);

  if (chaptersError) {
    console.error('Erreur Supabase (chapters):', chaptersError);
    chaptersContainer.innerHTML = '<p class="error-state">Impossible de charger les chapitres.</p>';
    return;
  }

  if (!chapters || chapters.length === 0) {
    chaptersCountEl.textContent = 'Aucun chapitre publié pour le moment.';
    chaptersContainer.innerHTML = '<p class="empty-state">Cette œuvre n\'a pas encore de chapitre en ligne.</p>';
    return;
  }

  const sorted = [...chapters].sort((a, b) => {
    const na = normalizeChapter(a).number ?? 0;
    const nb = normalizeChapter(b).number ?? 0;
    return na - nb;
  });

  chaptersCountEl.textContent = `${sorted.length} chapitre${sorted.length > 1 ? 's' : ''}`;
  chaptersContainer.innerHTML = sorted.map(createChapterRow).join('');
}

loadSeriePage().catch(err => {
  console.error('Erreur inattendue au chargement de la page:', err);
  headerContainer.innerHTML = `<p class="error-state">Impossible de contacter la base de données. (${err.message || err})</p>`;
});
