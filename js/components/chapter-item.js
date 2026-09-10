// Gère les colonnes en double (fr/en) sur la table chapters
export function normalizeChapter(item) {
  return {
    id: item.id,
    seriesId: item.series_id,
    number: item.chapter_number ?? item.numero ?? null,
    title: item.title || item.titre || 'Sans titre',
    publishedAt: item.published_at || item.created_at || null,
    views: item.views ?? 0
  };
}

export function createChapterRow(rawChapter) {
  const c = normalizeChapter(rawChapter);

  const dateLabel = c.publishedAt
    ? new Date(c.publishedAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : '';

  return `
    <a
      class="chapter-row"
      data-chapter-id="${c.id}"
      href="chapter.html?id=${encodeURIComponent(c.id)}"
      aria-label="Lire ${c.title}"
    >
      <div class="chapter-num">${c.number ?? '–'}</div>

      <div class="chapter-details">
        <h4>${c.title}</h4>
        <p>${dateLabel}</p>
      </div>

      <svg
        class="chevron"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        width="18"
        height="18"
      >
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </a>
  `;
    }
