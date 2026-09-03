// Correspondance type -> libellé affiché (Webtoon en base = "Webcomic" à l'affichage)
const TYPE_LABELS = {
  roman: 'Roman',
  novel: 'Webnovel',
  webtoon: 'Webcomic',
  webcomic: 'Webcomic'
};

function typeSlug(rawType) {
  return (rawType || 'webnovel').toString().trim().toLowerCase();
}

function typeLabel(rawType) {
  const slug = typeSlug(rawType);
  return TYPE_LABELS[slug] || (rawType || 'Webnovel');
}

// Certaines colonnes existent en double (fr/en) sur la table series — on prend celle qui est remplie
export function normalizeSeries(item) {
  return {
    id: item.id,
    title: item.title || item.titre || 'Sans titre',
    description: item.description || '',
    genre: item.genre || '',
    coverUrl: item.cover_url || '',
    type: item.type || '',
    status: item.status || item.statut || 'ongoing',
    rating: item.rating || '5.0',
    views: item.vues ?? item.views ?? 0,
    createdAt: item.created_at || null
  };
}

function formatViews(n) {
  const num = Number(n) || 0;
  if (num >= 1000) return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'K';
  return String(num);
}

export function timeAgo(dateString) {
  if (!dateString) return '';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diffMs / 36e5);
  if (hours < 1) return "À l'instant";
  if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  return new Date(dateString).toLocaleDateString('fr-FR');
}

// Carte pour la grille "Sorties récentes"
export function createCard(rawItem, extra = {}) {
  const item = normalizeSeries(rawItem);
  const slug = typeSlug(item.type);
  const chapterLabel = extra.latestChapter ? `Chapitre ${extra.latestChapter}` : null;

  return `
    <article class="story-card" data-id="${item.id}">
      <div class="story-top">
        <div class="story-cover">
          <img src="${item.coverUrl}" alt="${item.title}" loading="lazy" onerror="this.remove()">
        </div>
        <div class="story-info">
          <span class="type-badge type-${slug}">${typeLabel(item.type)}</span>
          <h3 class="story-title">${item.title}</h3>
          ${chapterLabel ? `<span class="chapter-badge">${chapterLabel}</span>` : ''}
          <p class="story-desc">${item.description}</p>
          <p class="story-time">${extra.timeAgoLabel || timeAgo(item.createdAt)}</p>
        </div>
      </div>
      <div class="story-footer">
        <div class="story-stats">
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg> ${formatViews(item.views)}</span>
          <span><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg> ${item.rating}</span>
        </div>
        <button class="bookmark-btn" aria-label="Sauvegarder" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>
    </article>
  `;
}

// Carte pour le carrousel "À la une"
export function createFeaturedCard(rawItem) {
  const item = normalizeSeries(rawItem);
  const slug = typeSlug(item.type);

  return `
    <article class="featured-card" data-id="${item.id}">
      <div class="featured-cover">
        <span class="type-badge type-${slug}">${typeLabel(item.type)}</span>
        <img src="${item.coverUrl}" alt="${item.title}" loading="lazy" onerror="this.remove()">
      </div>
      <div class="featured-info">
        <h3>${item.title}</h3>
        <div class="featured-meta">
          <span>${item.genre || typeLabel(item.type)}</span>
          <span class="rating"><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg> ${item.rating}</span>
        </div>
      </div>
    </article>
  `;
}
