import { supabase } from "../config/supabase.js";


/* =========================================================
   ÉLÉMENTS GLOBAUX
========================================================= */

const loading = document.getElementById("chapterLoading");
const errorBox = document.getElementById("chapterError");
const reader = document.getElementById("chapterReader");
const chapterTitle = document.getElementById("chapterTitle");
const chapterNumber = document.getElementById("chapterNumber");
const paperChapterNumber = document.getElementById("paperChapterNumber");
const seriesTitle = document.getElementById("seriesTitle");
const chapterType = document.getElementById("chapterType");
const chapterViews = document.getElementById("chapterViews");
const chapterImage = document.getElementById("chapterImage");
const chapterBackground = document.getElementById("chapterBackground");
const backToSeries = document.getElementById("backToSeries");
const chapterText = document.getElementById("chapterText");
const chapterImages = document.getElementById("chapterImages");
const previousChapter = document.getElementById("previousChapter");
const nextChapter = document.getElementById("nextChapter");
const readerControls = document.getElementById("readerControls");

const likeButton = document.getElementById("likeButton");
const likeIcon = document.getElementById("likeIcon");
const likeCount = document.getElementById("likeCount");

const commentButton = document.getElementById("commentButton");

const audioSection = document.getElementById("audioSection");
const audio = document.getElementById("chapterAudio");
const playButton = document.getElementById("audioPlay");
const progress = document.getElementById("audioProgress");
const muteButton = document.getElementById("audioMute");
const volume = document.getElementById("audioVolume");
const audioTime = document.getElementById("audioTime");


/* =========================================================
   PARAMÈTRES
========================================================= */

const params = new URLSearchParams(window.location.search);
const chapterId = params.get("id");

let currentChapter = null;


/* =========================================================
   UTILITAIRES
========================================================= */

function normalizeType(type) {
  return String(type || "")
    .trim()
    .toLowerCase();
}


function isNovelType(type) {
  const normalized = normalizeType(type);

  return (
    normalized === "novel" ||
    normalized === "roman" ||
    normalized === "roman/nouvelle"
  );
}


function isWebtoonType(type) {
  const normalized = normalizeType(type);

  return (
    normalized === "webtoon" ||
    normalized === "webtoon/manhwa"
  );
}


function isWebcomicType(type) {
  const normalized = normalizeType(type);

  return (
    normalized === "webcomic" ||
    normalized === "manga" ||
    normalized === "comic" ||
    normalized === "bd" ||
    isWebtoonType(normalized)
  );
}


function getContentType(chapter) {
  const type = normalizeType(chapter?.series?.type);

  if (isWebtoonType(type)) {
    return "webtoon";
  }

  if (isWebcomicType(type)) {
    return "manga";
  }

  return "novel";
}


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function parseImageUrls(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map(item => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed
          .filter(Boolean)
          .map(item => String(item).trim())
          .filter(Boolean);
      }
    } catch {
      // La valeur n'est probablement pas du JSON.
    }

    return trimmed
      .split(/\r?\n|,/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}


function getChapterImages(chapter) {
  const result = [];

  /*
   * Pour les Webcomics/Mangas, les pages officielles
   * sont stockées dans chapter_pages.
   */

  if (Array.isArray(chapter?.chapterPages)) {
    for (const page of chapter.chapterPages) {
      const imageUrl =
        String(page?.image_url || "").trim();

      if (
        imageUrl &&
        !result.includes(imageUrl)
      ) {
        result.push(imageUrl);
      }
    }
  }

  /*
   * Compatibilité avec l'ancien système image_urls.
   */

  const images =
    parseImageUrls(chapter?.image_urls);

  for (const image of images) {
    if (
      image &&
      !result.includes(image)
    ) {
      result.push(image);
    }
  }

  /*
   * Compatibilité avec chapter_image_url.
   * Cette image correspond normalement à la première page.
   */

  const mainImage =
    chapter?.chapter_image_url
      ? String(chapter.chapter_image_url).trim()
      : "";

  if (
    mainImage &&
    !result.includes(mainImage)
  ) {
    result.unshift(mainImage);
  }

  return result;
}


function formatChapterNumber(number) {
  if (
    number === null ||
    number === undefined ||
    number === ""
  ) {
    return "";
  }

  return `Chapitre ${number}`;
}


/* =========================================================
   SEO
========================================================= */

function cleanText(text) {
  if (!text) {
    return "";
  }

  const div = document.createElement("div");
  div.innerHTML = String(text);

  return (div.textContent || div.innerText || "")
    .replace(/\s+/g, " ")
    .trim();
}


function truncateText(text, maxLength = 155) {
  const cleaned = cleanText(text);

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 1).trim()}…`;
}


function setMetaName(name, content) {
  let meta = document.querySelector(
    `meta[name="${name}"]`
  );

  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.appendChild(meta);
  }

  meta.content = content || "";
}


function setMetaProperty(property, content) {
  let meta = document.querySelector(
    `meta[property="${property}"]`
  );

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("property", property);
    document.head.appendChild(meta);
  }

  meta.content = content || "";
}


function setCanonical(url) {
  let canonical = document.querySelector(
    'link[rel="canonical"]'
  );

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }

  canonical.href = url;
}


function setChapterSEO(chapter) {
  const series = chapter.series || {};

  const title =
    chapter.title ||
    `Chapitre ${chapter.chapter_number ?? ""}`.trim() ||
    "Lecture";

  const seriesName =
    series.title ||
    "BSCompany";

  const number =
    chapter.chapter_number !== null &&
    chapter.chapter_number !== undefined &&
    chapter.chapter_number !== ""
      ? `Chapitre ${chapter.chapter_number}`
      : "";

  const pageTitle = number
    ? `${seriesName} — ${number} : ${title} | BSCompany`
    : `${seriesName} — ${title} | BSCompany`;

  const descriptionSource =
    chapter.content ||
    series.description ||
    `Lisez ${title} sur BSCompany.`;

  const description =
    truncateText(descriptionSource) ||
    "Lisez ce chapitre publié par BSCompany et découvrez de nouvelles histoires.";

  const canonical =
    `${window.location.origin}` +
    `${window.location.pathname}` +
    `?id=${encodeURIComponent(chapter.id)}`;

  const images = getChapterImages(chapter);

  const image =
    images[0] ||
    series.cover_url ||
    "";

  document.title = pageTitle;

  setMetaName("description", description);
  setMetaName("robots", "index, follow");

  setCanonical(canonical);

  setMetaProperty("og:type", "article");
  setMetaProperty("og:title", pageTitle);
  setMetaProperty("og:description", description);
  setMetaProperty("og:url", canonical);

  if (image) {
    setMetaProperty(
      "og:image",
      image
    );
  }
}


/* =========================================================
   CHARGEMENT DU CHAPITRE
========================================================= */

async function loadChapter() {
  if (!chapterId) {
    showError();
    return;
  }

  try {
    const { data, error } = await supabase
      .from("chapters")
      .select(`
        *,
        series (
          id,
          title,
          type,
          cover_url,
          description
        )
      `)
      .eq("id", chapterId)
      .single();

    if (error) {
      console.error(
        "Erreur chargement chapitre :",
        error
      );

      showError();
      return;
    }

    if (!data) {
      showError();
      return;
    }

    /*
     * Les pages Manga/Webcomic sont stockées dans
     * chapter_pages et non dans chapters.image_urls.
     */

    const { data: pageRows, error: pagesError } =
      await supabase
        .from("chapter_pages")
        .select(`
          id,
          chapter_id,
          page_number,
          image_url
        `)
        .eq("chapter_id", data.id)
        .order(
          "page_number",
          {
            ascending: true
          }
        );

    if (pagesError) {
      console.error(
        "Erreur chargement pages Webcomic :",
        pagesError
      );
    } else {
      data.chapterPages =
        pageRows || [];
    }

    currentChapter = data;

    setChapterSEO(data);

    renderChapter(data);

    await loadChapterNavigation(data);

    setupAudio(data);

    if (loading) {
      loading.hidden = true;
    }

    if (reader) {
      reader.hidden = false;
    }

    if (readerControls) {
      readerControls.hidden = false;
    }

    await registerView(data);

  } catch (error) {
    console.error(
      "Erreur inattendue :",
      error
    );

    showError();
  }
}


/* =========================================================
   RENDU PRINCIPAL
========================================================= */

function renderChapter(chapter) {
  const contentType = getContentType(chapter);

  if (contentType === "novel") {
    renderNovelChapter(chapter);
    return;
  }

  ensureWebcomicStyles();

  if (contentType === "webtoon") {
    renderWebtoonChapter(chapter);
    return;
  }

  renderMangaChapter(chapter);
}


/* =========================================================
   LECTEUR ROMAN
   ---------------------------------------------------------
   Cette partie conserve le fonctionnement existant.
========================================================= */

function renderNovelChapter(chapter) {
  const number = chapter.chapter_number ?? "";

  if (chapterTitle) {
    chapterTitle.textContent =
      chapter.title ||
      `Chapitre ${number}`;
  }

  if (chapterNumber) {
    chapterNumber.textContent =
      formatChapterNumber(number);
  }

  if (paperChapterNumber) {
    paperChapterNumber.textContent =
      formatChapterNumber(number);
  }

  if (seriesTitle) {
    seriesTitle.textContent =
      chapter.series?.title || "";
  }

  if (chapterType) {
    chapterType.textContent = "Roman";
  }

  if (backToSeries && chapter.series?.id) {
    backToSeries.href =
      `serie.html?id=${encodeURIComponent(
        chapter.series.id
      )}`;
  }

  renderNovelMainImage(chapter);
  renderNovelText(chapter);
  renderNovelImages(chapter);
}


function renderNovelMainImage(chapter) {
  const mainImage =
    chapter.chapter_image_url ||
    parseImageUrls(chapter.image_urls)[0] ||
    "";

  if (mainImage) {
    if (chapterImage) {
      chapterImage.src = mainImage;
      chapterImage.alt =
        chapter.title ||
        "Illustration du chapitre";
      chapterImage.hidden = false;
    }

    if (chapterBackground) {
      chapterBackground.src = mainImage;
      chapterBackground.hidden = false;
    }

  } else {

    if (chapterImage) {
      chapterImage.hidden = true;
      chapterImage.removeAttribute("src");
    }

    if (chapterBackground) {
      chapterBackground.hidden = true;
      chapterBackground.removeAttribute("src");
    }
  }
}


function renderNovelText(chapter) {
  if (!chapterText) {
    return;
  }

  chapterText.innerHTML = "";

  const content = cleanText(chapter.content);

  if (!content) {
    const empty = document.createElement("p");

    empty.textContent =
      "Ce chapitre ne contient pas encore de texte.";

    chapterText.appendChild(empty);

    return;
  }

  const paragraphs = String(chapter.content)
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/);

  paragraphs.forEach(paragraph => {
    const cleaned = paragraph.trim();

    if (!cleaned) {
      return;
    }

    const p = document.createElement("p");

    /*
     * On conserve les retours simples à la ligne.
     */

    const lines = cleaned.split("\n");

    lines.forEach((line, index) => {
      if (index > 0) {
        p.appendChild(
          document.createElement("br")
        );
      }

      appendTextWithLinks(
        p,
        line
      );
    });

    chapterText.appendChild(p);
  });
}


function appendTextWithLinks(container, text) {
  const urlRegex =
    /(https?:\/\/[^\s]+)/g;

  let lastIndex = 0;
  let match;

  while (
    (match = urlRegex.exec(text)) !== null
  ) {
    const before =
      text.slice(
        lastIndex,
        match.index
      );

    if (before) {
      container.appendChild(
        document.createTextNode(before)
      );
    }

    const link =
      document.createElement("a");

    link.href = match[0];
    link.target = "_blank";
    link.rel =
      "noopener noreferrer";
    link.textContent = match[0];

    container.appendChild(link);

    lastIndex =
      match.index +
      match[0].length;
  }

  const remaining =
    text.slice(lastIndex);

  if (remaining) {
    container.appendChild(
      document.createTextNode(remaining)
    );
  }
}


function renderNovelImages(chapter) {
  if (!chapterImages) {
    return;
  }

  chapterImages.innerHTML = "";

  const images =
    parseImageUrls(chapter.image_urls);

  const mainImage =
    chapter.chapter_image_url || "";

  images
    .filter(image => image !== mainImage)
    .forEach((image, index) => {

      const img =
        document.createElement("img");

      img.src = image;

      img.alt =
        `${chapter.title || "Chapitre"} — illustration ${index + 1}`;

      img.loading = "lazy";
      img.decoding = "async";

      chapterImages.appendChild(img);
    });
}


/* =========================================================
   CHARGEMENT CSS WEBCOMIC
========================================================= */

function ensureWebcomicStyles() {
  const existing =
    document.querySelector(
      'link[href*="webcomic.css"]'
    );

  if (existing) {
    return;
  }

  const link =
    document.createElement("link");

  link.rel = "stylesheet";
  link.href = "./css/webcomic.css";

  document.head.appendChild(link);
}


/* =========================================================
   STRUCTURE COMMUNE WEBCOMIC
========================================================= */

function createWebcomicHeader(chapter, typeLabel) {
  const number =
    formatChapterNumber(
      chapter.chapter_number
    );

  const seriesName =
    chapter.series?.title ||
    "";

  const title =
    chapter.title ||
    `Chapitre ${chapter.chapter_number ?? ""}`;

  const views =
    Number(chapter.views || 0);

  const header =
    document.createElement("header");

  header.className =
    "webcomic-reader-header";

  header.innerHTML = `
    <div class="webcomic-reader-top">

      <a
        href="${chapter.series?.id
          ? `serie.html?id=${encodeURIComponent(chapter.series.id)}`
          : "index.html"}"
        class="webcomic-reader-back"
      >
        <span class="webcomic-reader-back-arrow">←</span>
        <span>Retour à l'œuvre</span>
      </a>

    </div>

    <div class="webcomic-reader-heading">

      <span class="webcomic-reader-type">
        ${escapeHtml(typeLabel)}
      </span>

      <p class="webcomic-reader-series">
        ${escapeHtml(seriesName)}
      </p>

      <p class="webcomic-reader-chapter-number">
        ${escapeHtml(number)}
      </p>

      <h1 class="webcomic-reader-title">
        ${escapeHtml(title)}
      </h1>

      <div class="webcomic-reader-meta">

        <span class="webcomic-reader-meta-item">

          <span class="webcomic-reader-meta-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/>
              <circle cx="12" cy="12" r="2.8"/>
            </svg>
          </span>

          <span>
            ${views} vues
          </span>

        </span>

      </div>

    </div>
  `;

  return header;
}


/* =========================================================
   LECTEUR MANGA
========================================================= */

function renderMangaChapter(chapter) {
  if (!reader) {
    return;
  }

  const images =
    getChapterImages(chapter);

  /*
   * Pour un Manga sans image, on affiche une erreur
   * spécifique plutôt que de laisser un lecteur vide.
   */

  if (!images.length) {
    renderWebcomicEmptyState(
      chapter,
      "Aucune page disponible",
      "Les pages de ce chapitre ne sont pas encore disponibles."
    );

    return;
  }

  /*
   * Le lecteur Roman est remplacé uniquement ici.
   * readerControls reste en dehors de #chapterReader.
   */

  reader.innerHTML = "";

  const header =
    createWebcomicHeader(
      chapter,
      "Manga"
    );

  reader.appendChild(header);

  const readingArea =
    document.createElement("section");

  readingArea.className =
    "webcomic-reading-area";

  const mangaReader =
    document.createElement("div");

  mangaReader.className =
    "webcomic-manga-reader";

  const stage =
    document.createElement("div");

  stage.className =
    "webcomic-manga-stage";

  const page =
    document.createElement("div");

  page.className =
    "webcomic-manga-page";

  const image =
    document.createElement("img");

  image.className =
    "webcomic-manga-image";

  image.alt =
    `${chapter.title || "Chapitre"} — page 1`;

  image.draggable = false;

  page.appendChild(image);

  /*
   * Clic/tap sur l'image :
   * ouvre ou ferme le plein écran.
   */

  let isDragging = false;

  async function toggleMangaFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      if (page.requestFullscreen) {
        await page.requestFullscreen();
      }

    } catch (error) {
      console.warn(
        "Le plein écran n'est pas disponible :",
        error
      );
    }
  }

  image.addEventListener(
    "click",
    () => {
      /*
       * Un swipe ne doit pas déclencher
       * l'ouverture du plein écran.
       */

      if (isDragging) {
        isDragging = false;
        return;
      }

      toggleMangaFullscreen();
    }
  );

  document.addEventListener(
    "fullscreenchange",
    () => {
      const fullscreen =
        document.fullscreenElement === page;

      page.classList.toggle(
        "webcomic-manga-page-fullscreen",
        fullscreen
      );

      image.classList.toggle(
        "webcomic-manga-image-fullscreen",
        fullscreen
      );
    }
  );

  const previousButton =
    createMangaArrow(
      "previous",
      "Page précédente",
      `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      `
    );

  const nextButton =
    createMangaArrow(
      "next",
      "Page suivante",
      `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      `
    );

  stage.appendChild(page);
  stage.appendChild(previousButton);
  stage.appendChild(nextButton);

  mangaReader.appendChild(stage);

  const pageInfo =
    document.createElement("div");

  pageInfo.className =
    "webcomic-manga-page-info";

  const currentPage =
    document.createElement("span");

  currentPage.className =
    "webcomic-manga-page-current";

  const separator =
    document.createElement("span");

  separator.className =
    "webcomic-manga-page-separator";

  separator.textContent = "/";

  const totalPage =
    document.createElement("span");

  totalPage.textContent =
    String(images.length);

  pageInfo.appendChild(currentPage);
  pageInfo.appendChild(separator);
  pageInfo.appendChild(totalPage);

  mangaReader.appendChild(pageInfo);

  const progressContainer =
    document.createElement("div");

  progressContainer.className =
    "webcomic-manga-progress";

  const progressBar =
    document.createElement("div");

  progressBar.className =
    "webcomic-manga-progress-bar";

  progressContainer.appendChild(
    progressBar
  );

  mangaReader.appendChild(
    progressContainer
  );

  const help =
    document.createElement("div");

  help.className =
    "webcomic-manga-help";

  help.innerHTML =
    "<strong>Astuce :</strong> utilisez les flèches ou les touches ← → pour changer de page.";

  mangaReader.appendChild(help);

  const end =
    createWebcomicChapterEnd();

  mangaReader.appendChild(end);

  readingArea.appendChild(mangaReader);

  reader.appendChild(readingArea);

  const navigation =
    createWebcomicNavigation();

  reader.appendChild(navigation);

  let currentPageIndex = 0;

  function updatePage(direction = 0) {
    if (!images.length) {
      return;
    }

    currentPageIndex =
      Math.max(
        0,
        Math.min(
          images.length - 1,
          currentPageIndex
        )
      );

    const imageUrl =
      images[currentPageIndex];

    image.classList.remove(
      "page-enter-next",
      "page-enter-prev"
    );

    /*
     * Force le navigateur à recalculer l'animation.
     */

    void image.offsetWidth;

    if (direction > 0) {
      image.classList.add(
        "page-enter-next"
      );
    } else if (direction < 0) {
      image.classList.add(
        "page-enter-prev"
      );
    }

    image.src = imageUrl;

    image.alt =
      `${chapter.title || "Chapitre"} — page ${currentPageIndex + 1}`;

    currentPage.textContent =
      String(currentPageIndex + 1);

    const percentage =
      images.length <= 1
        ? 100
        : ((currentPageIndex + 1) / images.length) * 100;

    progressBar.style.width =
      `${percentage}%`;

    previousButton.disabled =
      currentPageIndex === 0;

    nextButton.disabled =
      currentPageIndex === images.length - 1;
  }

  function goNext() {
    if (
      currentPageIndex >=
      images.length - 1
    ) {
      return;
    }

    currentPageIndex += 1;

    updatePage(1);
  }

  function goPrevious() {
    if (currentPageIndex <= 0) {
      return;
    }

    currentPageIndex -= 1;

    updatePage(-1);
  }

  previousButton.addEventListener(
    "click",
    goPrevious
  );

  nextButton.addEventListener(
    "click",
    goNext
  );

  /*
   * Navigation clavier.
   */

  function handleKeyboard(event) {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrevious();
    }
  }

  document.addEventListener(
    "keydown",
    handleKeyboard
  );

  /*
   * Navigation tactile simple.
   */

  let touchStartX = null;
  let touchStartY = null;

  stage.addEventListener(
    "touchstart",
    event => {
      const touch =
        event.changedTouches[0];

      touchStartX =
        touch.clientX;

      touchStartY =
        touch.clientY;

      isDragging = false;
    },
    { passive: true }
  );

  stage.addEventListener(
    "touchend",
    event => {
      if (
        touchStartX === null ||
        touchStartY === null
      ) {
        return;
      }

      const touch =
        event.changedTouches[0];

      const deltaX =
        touch.clientX -
        touchStartX;

      const deltaY =
        touch.clientY -
        touchStartY;

      touchStartX = null;
      touchStartY = null;

      /*
       * Marque le mouvement comme un déplacement
       * afin d'empêcher le clic de déclencher
       * le plein écran après un swipe.
       */

      if (
        Math.abs(deltaX) >= 20 ||
        Math.abs(deltaY) >= 20
      ) {
        isDragging = true;
      }

      /*
       * On ignore les mouvements principalement verticaux.
       */

      if (
        Math.abs(deltaX) < 45 ||
        Math.abs(deltaX) <= Math.abs(deltaY)
      ) {
        return;
      }

      if (deltaX < 0) {
        goNext();
      } else {
        goPrevious();
      }
    },
    { passive: true }
  );

  /*
   * Première page.
   */

  updatePage();

  /*
   * Empêche les images de rester dans un état
   * visuel incorrect après leur chargement.
   */

  image.addEventListener(
    "load",
    () => {
      image.classList.remove(
        "webcomic-image-loading"
      );

      image.classList.add(
        "webcomic-image-loaded"
      );
    }
  );
}


/* =========================================================
   FLÈCHES MANGA
========================================================= */

function createMangaArrow(
  direction,
  label,
  icon
) {
  const button =
    document.createElement("button");

  button.type = "button";

  button.className =
    `webcomic-manga-arrow ${direction}`;

  button.setAttribute(
    "aria-label",
    label
  );

  button.innerHTML = icon;

  return button;
}


/* =========================================================
   LECTEUR WEBTOON
   ---------------------------------------------------------
   MODIFIÉ :
   - lecture verticale
   - découpage automatique des bandes très longues
   - zoom
   - chargement progressif
========================================================= */

function renderWebtoonChapter(chapter) {
  if (!reader) {
    return;
  }

  const images =
    getChapterImages(chapter);

  if (!images.length) {
    renderWebcomicEmptyState(
      chapter,
      "Aucune page disponible",
      "Les pages de ce chapitre ne sont pas encore disponibles."
    );

    return;
  }

  reader.innerHTML = "";

  const header =
    createWebcomicHeader(
      chapter,
      "Webtoon"
    );

  reader.appendChild(header);

  const readingArea =
    document.createElement("section");

  readingArea.className =
    "webcomic-reading-area";

  const webtoonReader =
    document.createElement("div");

  webtoonReader.className =
    "webcomic-webtoon-reader";

  /* =======================================================
     CONTRÔLES DE ZOOM
  ======================================================= */

  const controls =
    document.createElement("div");

  controls.className =
    "webcomic-webtoon-controls";

  const zoomOut =
    document.createElement("button");

  zoomOut.type = "button";

  zoomOut.className =
    "webcomic-webtoon-control";

  zoomOut.setAttribute(
    "aria-label",
    "Réduire le zoom"
  );

  zoomOut.textContent = "−";

  const zoomValue =
    document.createElement("span");

  zoomValue.className =
    "webcomic-webtoon-zoom-value";

  zoomValue.textContent =
    "100%";

  const zoomIn =
    document.createElement("button");

  zoomIn.type = "button";

  zoomIn.className =
    "webcomic-webtoon-control";

  zoomIn.setAttribute(
    "aria-label",
    "Augmenter le zoom"
  );

  zoomIn.textContent = "+";

  const zoomReset =
    document.createElement("button");

  zoomReset.type = "button";

  zoomReset.className =
    "webcomic-webtoon-control";

  zoomReset.setAttribute(
    "aria-label",
    "Réinitialiser le zoom"
  );

  zoomReset.textContent =
    "↺";

  controls.appendChild(zoomOut);
  controls.appendChild(zoomValue);
  controls.appendChild(zoomIn);
  controls.appendChild(zoomReset);

  webtoonReader.appendChild(
    controls
  );

  /* =======================================================
     ZONE DE LECTURE
  ======================================================= */

  const stage =
    document.createElement("div");

  stage.className =
    "webcomic-webtoon-stage";

  const imageContainer =
    document.createElement("div");

  imageContainer.className =
    "webcomic-webtoon-images";

  stage.appendChild(
    imageContainer
  );

  webtoonReader.appendChild(
    stage
  );

  /* =======================================================
     ZOOM
  ======================================================= */

  let zoom = 1;

  function updateZoom() {
    zoom =
      Math.max(
        0.75,
        Math.min(
          2.5,
          zoom
        )
      );

    imageContainer.style.setProperty(
      "--webtoon-zoom",
      zoom.toFixed(2)
    );

    zoomValue.textContent =
      `${Math.round(zoom * 100)}%`;

    zoomOut.disabled =
      zoom <= 0.75;

    zoomIn.disabled =
      zoom >= 2.5;
  }

  zoomOut.addEventListener(
    "click",
    () => {
      zoom -= 0.25;
      updateZoom();
    }
  );

  zoomIn.addEventListener(
    "click",
    () => {
      zoom += 0.25;
      updateZoom();
    }
  );

  zoomReset.addEventListener(
    "click",
    () => {
      zoom = 1;
      updateZoom();
    }
  );

  /* =======================================================
     CRÉATION D'UNE IMAGE WEBTOON
  ======================================================= */

  function createWebtoonImage(
    imageUrl,
    imageIndex,
    partNumber
  ) {
    const wrapper =
      document.createElement("div");

    wrapper.className =
      "webcomic-webtoon-page-wrapper";

    const img =
      document.createElement("img");

    img.className =
      "webcomic-webtoon-page webcomic-image-loading";

    img.src =
      imageUrl;

    img.alt =
      `${chapter.title || "Chapitre"} — partie ${imageIndex + 1}.${partNumber}`;

    /*
     * Les premières parties sont prioritaires.
     */

    img.loading =
      imageIndex < 1 && partNumber <= 2
        ? "eager"
        : "lazy";

    img.decoding =
      "async";

    img.draggable =
      false;

    img.addEventListener(
      "load",
      () => {
        img.classList.remove(
          "webcomic-image-loading"
        );

        img.classList.add(
          "webcomic-image-loaded"
        );
      },
      { once: true }
    );

    img.addEventListener(
      "error",
      () => {
        img.classList.remove(
          "webcomic-image-loading"
        );

        img.classList.add(
          "webcomic-hidden"
        );
      },
      { once: true }
    );

    wrapper.appendChild(img);

    imageContainer.appendChild(
      wrapper
    );
  }

  /* =======================================================
     DÉCOUPAGE DES BANDES WEBTOON
  ======================================================= */

  /*
   * Au-delà de cette hauteur, une image est découpée.
   *
   * Le découpage est technique :
   * il sépare une très longue image en plusieurs
   * morceaux verticaux afin d'éviter d'avoir une
   * seule image gigantesque dans le lecteur.
   */

  const MAX_SLICE_HEIGHT =
    2200;

  async function processWebtoonImage(
    imageUrl,
    imageIndex
  ) {
    return new Promise(resolve => {

      const sourceImage =
        new Image();

      sourceImage.onload =
        async () => {

          try {

            const width =
              sourceImage.naturalWidth;

            const height =
              sourceImage.naturalHeight;

            /*
             * Image suffisamment courte :
             * aucun découpage nécessaire.
             */

            if (
              height <=
              MAX_SLICE_HEIGHT
            ) {

              createWebtoonImage(
                imageUrl,
                imageIndex,
                1
              );

              resolve();

              return;
            }

            /*
             * Image très longue :
             * découpage vertical automatique.
             */

            let offsetY = 0;
            let partNumber = 1;

            while (
              offsetY < height
            ) {

              const sliceHeight =
                Math.min(
                  MAX_SLICE_HEIGHT,
                  height - offsetY
                );

              const canvas =
                document.createElement(
                  "canvas"
                );

              canvas.width =
                width;

              canvas.height =
                sliceHeight;

              const context =
                canvas.getContext(
                  "2d"
                );

              if (!context) {
                throw new Error(
                  "Canvas non disponible."
                );
              }

              context.drawImage(
                sourceImage,

                0,
                offsetY,
                width,
                sliceHeight,

                0,
                0,
                width,
                sliceHeight
              );

              /*
               * Qualité élevée pour conserver
               * le texte et les dessins nets.
               */

              const sliceUrl =
                canvas.toDataURL(
                  "image/jpeg",
                  0.94
                );

              createWebtoonImage(
                sliceUrl,
                imageIndex,
                partNumber
              );

              offsetY +=
                sliceHeight;

              partNumber++;

              /*
               * Petite pause pour éviter de bloquer
               * complètement le navigateur sur téléphone.
               */

              await new Promise(
                requestAnimationFrame
              );
            }

            resolve();

          } catch (error) {

            console.error(
              "Erreur découpage Webtoon :",
              error
            );

            /*
             * Si le découpage échoue,
             * on conserve l'image originale.
             */

            createWebtoonImage(
              imageUrl,
              imageIndex,
              1
            );

            resolve();
          }
        };

      sourceImage.onerror =
        () => {

          console.error(
            "Impossible de charger l'image Webtoon :",
            imageUrl
          );

          const errorBlock =
            document.createElement(
              "div"
            );

          errorBlock.className =
            "webcomic-webtoon-image-error";

          errorBlock.textContent =
            "Impossible de charger cette bande.";

          imageContainer.appendChild(
            errorBlock
          );

          resolve();
        };

      sourceImage.src =
        imageUrl;
    });
  }

  /* =======================================================
     TRAITEMENT DES IMAGES
  ======================================================= */

  async function processAllImages() {

    for (
      let index = 0;
      index < images.length;
      index++
    ) {

      await processWebtoonImage(
        images[index],
        index
      );
    }
  }

  /*
   * On lance le traitement sans bloquer
   * le reste de la page.
   */

  processAllImages();

  /* =======================================================
     FIN DU CHAPITRE
  ======================================================= */

  const end =
    createWebcomicChapterEnd();

  webtoonReader.appendChild(
    end
  );

  readingArea.appendChild(
    webtoonReader
  );

  reader.appendChild(
    readingArea
  );

  const navigation =
    createWebcomicNavigation();

  reader.appendChild(
    navigation
  );

  /*
   * Zoom initial.
   */

  updateZoom();
}


/* =========================================================
   ÉTAT WEBCOMIC VIDE
========================================================= */

function renderWebcomicEmptyState(
  chapter,
  title,
  message
) {
  if (!reader) {
    return;
  }

  reader.innerHTML = "";

  reader.appendChild(
    createWebcomicHeader(
      chapter,
      isWebtoonType(chapter.series?.type)
        ? "Webtoon"
        : "Manga"
    )
  );

  const area =
    document.createElement("section");

  area.className =
    "webcomic-reading-area";

  const error =
    document.createElement("div");

  error.className =
    "webcomic-reader-error";

  error.innerHTML = `
    <div class="webcomic-reader-error-icon">
      !
    </div>

    <h2>
      ${escapeHtml(title)}
    </h2>

    <p>
      ${escapeHtml(message)}
    </p>
  `;

  area.appendChild(error);

  reader.appendChild(area);

  reader.appendChild(
    createWebcomicNavigation()
  );
}


/* =========================================================
   FIN DU CHAPITRE
========================================================= */

function createWebcomicChapterEnd() {
  const end =
    document.createElement("div");

  end.className =
    "webcomic-chapter-end";

  end.innerHTML = `
    <div class="webcomic-chapter-end-line"></div>

    <div class="webcomic-chapter-end-text">
      — Fin du chapitre —
    </div>
  `;

  return end;
}


/* =========================================================
   NAVIGATION WEBCOMIC
========================================================= */

function createWebcomicNavigation() {
  const nav =
    document.createElement("nav");

  nav.className =
    "webcomic-chapter-navigation";

  const previous =
    document.createElement("a");

  previous.href =
    previousChapter?.hidden
      ? "#"
      : previousChapter?.href || "#";

  previous.className =
    "webcomic-chapter-nav previous";

  if (
    previousChapter?.hidden ||
    !previousChapter?.href ||
    previousChapter.href.endsWith("#")
  ) {
    previous.classList.add(
      "webcomic-hidden"
    );
  }

  previous.innerHTML = `
    <span class="webcomic-chapter-nav-arrow">
      ←
    </span>

    <span class="webcomic-chapter-nav-content">
      <small>Précédent</small>
      <strong>Chapitre précédent</strong>
    </span>
  `;

  const next =
    document.createElement("a");

  next.href =
    nextChapter?.hidden
      ? "#"
      : nextChapter?.href || "#";

  next.className =
    "webcomic-chapter-nav next";

  if (
    nextChapter?.hidden ||
    !nextChapter?.href ||
    nextChapter.href.endsWith("#")
  ) {
    next.classList.add(
      "webcomic-hidden"
    );
  }

  next.innerHTML = `
    <span class="webcomic-chapter-nav-content">
      <small>Suivant</small>
      <strong>Chapitre suivant</strong>
    </span>

    <span class="webcomic-chapter-nav-arrow">
      →
    </span>
  `;

  nav.appendChild(previous);
  nav.appendChild(next);

  /*
   * La navigation est initialement générée avant que
   * loadChapterNavigation() ait rempli les liens.
   *
   * On la synchronise ensuite.
   */

  setTimeout(
    () => syncWebcomicNavigation(nav),
    0
  );

  return nav;
}


function syncWebcomicNavigation(nav) {
  if (!nav) {
    return;
  }

  const previous =
    nav.querySelector(
      ".webcomic-chapter-nav.previous"
    );

  const next =
    nav.querySelector(
      ".webcomic-chapter-nav.next"
    );

  if (previous) {
    if (
      previousChapter &&
      !previousChapter.hidden &&
      previousChapter.href
    ) {
      previous.href =
        previousChapter.href;

      previous.classList.remove(
        "webcomic-hidden"
      );

      updateWebcomicNavLabel(
        previous,
        previousChapter
      );

    } else {
      previous.classList.add(
        "webcomic-hidden"
      );
    }
  }

  if (next) {
    if (
      nextChapter &&
      !nextChapter.hidden &&
      nextChapter.href
    ) {
      next.href =
        nextChapter.href;

      next.classList.remove(
        "webcomic-hidden"
      );

      updateWebcomicNavLabel(
        next,
        nextChapter
      );

    } else {
      next.classList.add(
        "webcomic-hidden"
      );
    }
  }

  /*
   * Si un seul côté existe, le CSS garde néanmoins
   * une structure propre.
   */
}


function updateWebcomicNavLabel(
  element,
  source
) {
  const strong =
    element.querySelector("strong");

  if (!strong) {
    return;
  }

  const text =
    source.textContent ||
    source.querySelector("strong")?.textContent ||
    "";

  if (text.trim()) {
    strong.textContent =
      text.trim();
  }
}


/* =========================================================
   NAVIGATION ENTRE CHAPITRES
========================================================= */

async function loadChapterNavigation(chapter) {
  const seriesId =
    chapter.series_id;

  if (!seriesId) {
    hideChapterNavigation();
    return;
  }

  try {
    const { data, error } =
      await supabase
        .from("chapters")
        .select(`
          id,
          chapter_number,
          title
        `)
        .eq("series_id", seriesId)
        .order(
          "chapter_number",
          {
            ascending: true,
            nullsFirst: true
          }
        );

    if (error) {
      console.error(
        "Erreur navigation chapitres :",
        error
      );

      hideChapterNavigation();

      return;
    }

    const chapters =
      Array.isArray(data)
        ? data
        : [];

    const currentIndex =
      chapters.findIndex(
        item =>
          String(item.id) ===
          String(chapter.id)
      );

    if (
      currentIndex === -1
    ) {
      hideChapterNavigation();
      return;
    }

    const previous =
      currentIndex > 0
        ? chapters[currentIndex - 1]
        : null;

    const next =
      currentIndex <
      chapters.length - 1
        ? chapters[currentIndex + 1]
        : null;

    setupChapterNavButton(
      previousChapter,
      previous
    );

    setupChapterNavButton(
      nextChapter,
      next
    );

    /*
     * Si nous sommes en mode Webcomic,
     * synchroniser la navigation spécifique.
     */

    if (
      currentChapter &&
      getContentType(currentChapter) !== "novel"
    ) {
      const webcomicNav =
        document.querySelector(
          ".webcomic-chapter-navigation"
        );

      if (webcomicNav) {
        syncWebcomicNavigation(
          webcomicNav
        );
      }
    }

  } catch (error) {
    console.error(
      "Erreur navigation :",
      error
    );

    hideChapterNavigation();
  }
}


function setupChapterNavButton(
  element,
  chapter
) {
  if (!element) {
    return;
  }

  if (!chapter) {
    element.hidden = true;
    element.removeAttribute("href");

    return;
  }

  element.hidden = false;

  element.href =
    `chapter.html?id=${encodeURIComponent(
      chapter.id
    )}`;

  const strong =
    element.querySelector(
      "strong"
    );

  if (strong) {
    const number =
      chapter.chapter_number !== null &&
      chapter.chapter_number !== undefined &&
      chapter.chapter_number !== ""
        ? `Chapitre ${chapter.chapter_number}`
        : chapter.title ||
          "Chapitre";

    strong.textContent =
      number;
  }
}


function hideChapterNavigation() {
  if (previousChapter) {
    previousChapter.hidden = true;
  }

  if (nextChapter) {
    nextChapter.hidden = true;
  }
}


/* =========================================================
   AUDIO
========================================================= */

function setupAudio(chapter) {
  if (
    !audio ||
    !audioSection ||
    !playButton
  ) {
    return;
  }

  const soundUrl =
    chapter.sound_url ||
    chapter.sound_id ||
    null;

  if (!soundUrl) {
    audioSection.hidden = true;
    return;
  }

  audio.src = soundUrl;
  audio.loop = true;

  if (volume) {
    audio.volume =
      Number(volume.value || 1);
  }

  audioSection.hidden = false;

  playButton.onclick =
    async () => {
      if (audio.paused) {
        try {
          await audio.play();
        } catch (error) {
          console.warn(
            "Lecture audio bloquée :",
            error
          );
        }
      } else {
        audio.pause();
      }
    };

  audio.addEventListener(
    "play",
    updatePlayButton
  );

  audio.addEventListener(
    "pause",
    updatePlayButton
  );

  audio.addEventListener(
    "ended",
    updatePlayButton
  );

  audio.addEventListener(
    "timeupdate",
    updateAudioProgress
  );

  audio.addEventListener(
    "loadedmetadata",
    updateAudioProgress
  );

  audio.addEventListener(
    "canplay",
    attemptAutoplay,
    { once: true }
  );

  if (progress) {
    progress.addEventListener(
      "input",
      () => {
        if (!audio.duration) {
          return;
        }

        const percentage =
          Number(progress.value);

        audio.currentTime =
          (percentage / 100) *
          audio.duration;
      }
    );
  }

  if (muteButton) {
    muteButton.onclick =
      () => {
        audio.muted =
          !audio.muted;

        updateMuteButton();
      };
  }

  if (volume) {
    volume.addEventListener(
      "input",
      () => {
        const value =
          Number(volume.value);

        audio.volume =
          Math.max(
            0,
            Math.min(1, value)
          );

        if (value > 0) {
          audio.muted = false;
        }

        updateMuteButton();
      }
    );
  }

  updatePlayButton();
  updateMuteButton();
}


function attemptAutoplay() {
  if (!audio) {
    return;
  }

  audio
    .play()
    .catch(() => {
      /*
       * Les navigateurs peuvent bloquer
       * l'autoplay. Ce n'est pas une erreur.
       */
    });
}


function updatePlayButton() {
  if (!audio || !playButton) {
    return;
  }

  const playIcon =
    playButton.querySelector(
      ".play-icon"
    );

  const pauseIcon =
    playButton.querySelector(
      ".pause-icon"
    );

  if (audio.paused) {
    if (playIcon) {
      playIcon.hidden = false;
    }

    if (pauseIcon) {
      pauseIcon.hidden = true;
    }

    playButton.setAttribute(
      "aria-label",
      "Lire"
    );

  } else {

    if (playIcon) {
      playIcon.hidden = true;
    }

    if (pauseIcon) {
      pauseIcon.hidden = false;
    }

    playButton.setAttribute(
      "aria-label",
      "Mettre en pause"
    );
  }
}


function updateMuteButton() {
  if (
    !audio ||
    !muteButton
  ) {
    return;
  }

  if (audio.muted) {
    muteButton.setAttribute(
      "aria-label",
      "Activer le son"
    );

    muteButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 9v6h4l5 4V5L9 9H5Z"/>
        <path d="m18 9-5 6M13 9l5 6"/>
      </svg>
    `;

  } else {

    muteButton.setAttribute(
      "aria-label",
      "Couper le son"
    );

    muteButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 9v6h4l5 4V5L9 9H5Z"/>
        <path d="M17 9.5a4 4 0 0 1 0 5"/>
        <path d="M19.5 7a7.5 7.5 0 0 1 0 10"/>
      </svg>
    `;
  }
}


function updateAudioProgress() {
  if (
    !audio ||
    !progress
  ) {
    return;
  }

  if (
    !Number.isFinite(audio.duration) ||
    audio.duration <= 0
  ) {
    progress.value = 0;

    if (audioTime) {
      audioTime.textContent =
        "0:00";
    }

    return;
  }

  const percentage =
    (audio.currentTime /
      audio.duration) *
    100;

  progress.value =
    percentage;

  if (audioTime) {
    audioTime.textContent =
      `${formatTime(audio.currentTime)}`;
  }
}


function formatTime(seconds) {
  if (
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return "0:00";
  }

  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    Math.floor(seconds % 60);

  return (
    `${minutes}:` +
    `${String(remainingSeconds).padStart(2, "0")}`
  );
}


/* =========================================================
   VUES UNIQUES
========================================================= */

function getVisitorId() {
  const storageKey =
    "bscompany_visitor_id";

  let visitorId =
    localStorage.getItem(storageKey);

  if (visitorId) {
    return visitorId;
  }

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    visitorId =
      crypto.randomUUID();
  } else {
    visitorId =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
  }

  localStorage.setItem(
    storageKey,
    visitorId
  );

  return visitorId;
}


async function registerView(chapter) {
  if (
    !chapter?.id ||
    !chapterViews
  ) {
    return;
  }

  try {
    const visitorId =
      getVisitorId();

    const { error } =
      await supabase
        .from("chapter_views")
        .upsert(
          {
            chapter_id: chapter.id,
            visitor_id: visitorId
          },
          {
            onConflict:
              "chapter_id,visitor_id",
            ignoreDuplicates: true
          }
        );

    if (error) {
      console.error(
        "Erreur enregistrement vue :",
        error
      );

      return;
    }

    const { count, error: countError } =
      await supabase
        .from("chapter_views")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "chapter_id",
          chapter.id
        );

    if (countError) {
      console.error(
        "Erreur comptage vues :",
        countError
      );

      return;
    }

    chapterViews.textContent =
      String(count || 0);

  } catch (error) {
    console.error(
      "Erreur système vues :",
      error
    );
  }
}


/* =========================================================
   LIKES ANONYMES
========================================================= */

async function setupLikeButton(chapter) {
  if (
    !likeButton ||
    !likeCount ||
    !likeIcon
  ) {
    return;
  }

  const visitorId =
    getVisitorId();

  try {
    const { count, error: countError } =
      await supabase
        .from("likes")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "chapter_id",
          chapter.id
        );

    if (countError) {
      console.error(
        "Erreur comptage likes :",
        countError
      );
    } else {
      likeCount.textContent =
        String(count || 0);
    }

    const { data, error } =
      await supabase
        .from("likes")
        .select("id")
        .eq(
          "chapter_id",
          chapter.id
        )
        .eq(
          "visitor_id",
          visitorId
        )
        .maybeSingle();

    if (error) {
      console.error(
        "Erreur vérification like :",
        error
      );

      updateLikeButton(false);

    } else {

      updateLikeButton(
        Boolean(data)
      );
    }

    likeButton.onclick =
      async () => {

        if (
          likeButton.disabled
        ) {
          return;
        }

        likeButton.disabled = true;

        try {
          const { data: existingLike } =
            await supabase
              .from("likes")
              .select("id")
              .eq(
                "chapter_id",
                chapter.id
              )
              .eq(
                "visitor_id",
                visitorId
              )
              .maybeSingle();

          if (existingLike) {

            const { error: deleteError } =
              await supabase
                .from("likes")
                .delete()
                .eq(
                  "id",
                  existingLike.id
                );

            if (deleteError) {
              throw deleteError;
            }

            updateLikeButton(false);

          } else {

            const { error: insertError } =
              await supabase
                .from("likes")
                .insert({
                  user_id: null,
                  visitor_id: visitorId,
                  chapter_id: chapter.id,
                  profil_id: null,
                  series_id:
                    chapter.series_id
                });

            if (insertError) {
              throw insertError;
            }

            updateLikeButton(true);
          }

          const { count: newCount } =
            await supabase
              .from("likes")
              .select(
                "id",
                {
                  count: "exact",
                  head: true
                }
              )
              .eq(
                "chapter_id",
                chapter.id
              );

          likeCount.textContent =
            String(newCount || 0);

        } catch (error) {
          console.error(
            "Erreur like :",
            error
          );

          alert(
            "Impossible de modifier le like pour le moment."
          );

        } finally {
          likeButton.disabled =
            false;
        }
      };

  } catch (error) {
    console.error(
      "Erreur initialisation like :",
      error
    );
  }
}


function updateLikeButton(isLiked) {
  if (
    !likeButton ||
    !likeIcon
  ) {
    return;
  }

  likeButton.classList.toggle(
    "liked",
    isLiked
  );

  likeButton.setAttribute(
    "aria-pressed",
    String(isLiked)
  );

  likeButton.setAttribute(
    "aria-label",
    isLiked
      ? "Retirer le like"
      : "Aimer ce chapitre"
  );

  /*
   * Le HTML contient déjà les deux SVG.
   * On ne remplace donc pas le contenu par un emoji.
   */

  const outline =
    likeIcon.querySelector(
      ".heart-outline"
    );

  const filled =
    likeIcon.querySelector(
      ".heart-filled"
    );

  if (outline) {
    outline.hidden =
      isLiked;
  }

  if (filled) {
    filled.hidden =
      !isLiked;
  }
}


/* =========================================================
   COMMENTAIRES
   ---------------------------------------------------------
   Les commentaires restent hors du périmètre v0.1.
   On conserve seulement la compatibilité avec l'ancien HTML.
========================================================= */

function setupComments() {
  if (!commentButton) {
    return;
  }

  commentButton.addEventListener(
    "click",
    () => {
      const commentsSection =
        document.getElementById(
          "commentsSection"
        );

      if (commentsSection) {
        commentsSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }
  );
}


/* =========================================================
   ERREUR
========================================================= */

function showError() {
  if (loading) {
    loading.hidden = true;
  }

  if (reader) {
    reader.hidden = true;
  }

  if (readerControls) {
    readerControls.hidden = true;
  }

  if (errorBox) {
    errorBox.hidden = false;
  }
}


/* =========================================================
   MENU MOBILE
========================================================= */

function setupMobileMenu() {
  const mobileMenuBtn =
    document.getElementById(
      "mobileMenuBtn"
    );

  const navLinks =
    document.getElementById(
      "navLinks"
    );

  if (
    !mobileMenuBtn ||
    !navLinks
  ) {
    return;
  }

  mobileMenuBtn.addEventListener(
    "click",
    () => {
      const isOpen =
        navLinks.classList.toggle(
          "mobile-open"
        );

      mobileMenuBtn.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    }
  );
}


/* =========================================================
   DÉMARRAGE
========================================================= */

async function startReader() {
  setupMobileMenu();

  await loadChapter();

  if (currentChapter) {
    await setupLikeButton(
      currentChapter
    );

    setupComments();
  }
}


startReader();
