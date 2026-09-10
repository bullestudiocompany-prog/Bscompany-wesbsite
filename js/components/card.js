const TYPE_LABELS = {
  roman: 'Roman',
  webnovel: 'Webnovel',
  webtoon: 'Webcomic',
  webcomic: 'Webcomic',
  manga: 'Manga'
};

function typeSlug(rawType) {
  return String(rawType || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function typeLabel(rawType) {
  const slug = typeSlug(rawType);
  return TYPE_LABELS[slug] || rawType || '';
}

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

export function createCard(rawItem) {
  const item = normalizeSeries(rawItem);

  const type = typeLabel(item.type);
  const slug = typeSlug(item.type);

  return `
    <article class="series-card" data-id="${item.id}">
      <a href="serie.html?id=${encodeURIComponent(item.id)}" class="series-card-link">
        <div class="series-card-cover">
          ${
            item.coverUrl
              ? `<img src="${item.coverUrl}" alt="${item.title}" loading="lazy">`
              : `<div class="cover-placeholder"></div>`
          }

          ${
            type
              ? `<span class="series-card-type ${slug}">${type}</span>`
              : ''
          }
        </div>

        <div class="series-card-content">
          <h3>${item.title}</h3>

          ${
            item.genre
              ? `<p class="series-card-genre">${item.genre}</p>`
              : ''
          }

          ${
            item.description
              ? `<p class="series-card-description">${item.description}</p>`
              : ''
          }
        </div>
      </a>
    </article>
  `;
}

export function createFeaturedCard(rawItem) {
  const item = normalizeSeries(rawItem);

  const type = typeLabel(item.type);
  const slug = typeSlug(item.type);

  return `
    <article class="featured-card" data-id="${item.id}">
      <a href="serie.html?id=${encodeURIComponent(item.id)}" class="featured-card-link">
        <div class="featured-card-cover">
          ${
            item.coverUrl
              ? `<img src="${item.coverUrl}" alt="${item.title}" loading="lazy">`
              : `<div class="cover-placeholder"></div>`
          }

          ${
            type
              ? `<span class="featured-card-type ${slug}">${type}</span>`
              : ''
          }
        </div>

        <div class="featured-card-content">
          <h3>${item.title}</h3>

          ${
            item.genre
              ? `<p class="featured-card-genre">${item.genre}</p>`
              : ''
          }

          ${
            item.description
              ? `<p class="featured-card-description">${item.description}</p>`
              : ''
          }
        </div>
      </a>
    </article>
  `;
    }
