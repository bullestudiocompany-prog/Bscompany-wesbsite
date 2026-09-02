export function createCard(item) {
  return `
    <article class="recent-card">
      <img src="${item.cover_url}" alt="${item.title}" class="recent-cover">
      <div class="recent-info">
        <div>
          <span class="badge badge-${item.type.toLowerCase()}">${item.type}</span>
          <h3 style="font-size: 0.9rem; margin-top:4px;">${item.title}</h3>
        </div>
        <div style="font-size: 0.75rem; color: #666;">
          ★ ${item.rating || '5.0'}
        </div>
      </div>
    </article>
  `;
}

