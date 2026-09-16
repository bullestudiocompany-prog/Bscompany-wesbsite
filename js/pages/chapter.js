import { supabase } from "../config/supabase.js";

/* =========================================================
   DOM
========================================================= */

const loading = document.getElementById("chapterLoading");
const errorBox = document.getElementById("chapterError");
const errorMessage = document.getElementById("chapterErrorMessage");

const reader = document.getElementById("chapterReader");
const readerControls = document.getElementById("readerControls");

const chapterBackground = document.getElementById("chapterBackground");

const backToSeries = document.getElementById("backToSeries");

const chapterImageWrap = document.getElementById("chapterImageWrap");
const chapterImage = document.getElementById("chapterImage");

const chapterType = document.getElementById("chapterType");
const seriesTitle = document.getElementById("seriesTitle");
const chapterNumber = document.getElementById("chapterNumber");
const chapterTitle = document.getElementById("chapterTitle");

const readingArea = document.getElementById("readingArea");
const readingPaper = document.getElementById("readingPaper");

const paperChapterNumber = document.getElementById("paperChapterNumber");
const chapterText = document.getElementById("chapterText");
const chapterImages = document.getElementById("chapterImages");

const mangaReader = document.getElementById("mangaReader");
const mangaViewport = document.getElementById("mangaViewport");
const mangaPageStage = document.getElementById("mangaPageStage");
const mangaPageImage = document.getElementById("mangaPageImage");
const mangaPageLoading = document.getElementById("mangaPageLoading");

const mangaPrevious = document.getElementById("mangaPrevious");
const mangaNext = document.getElementById("mangaNext");

const mangaBottomPrevious =
  document.getElementById("mangaBottomPrevious");

const mangaBottomNext =
  document.getElementById("mangaBottomNext");

const mangaPageCounter =
  document.getElementById("mangaPageCounter");

const mangaBottomCounter =
  document.getElementById("mangaBottomCounter");

const mangaFullscreen =
  document.getElementById("mangaFullscreen");

const webtoonReader = document.getElementById("webtoonReader");
const webtoonPages = document.getElementById("webtoonPages");
const webtoonPageCount = document.getElementById("webtoonPageCount");

const webtoonFullscreen =
  document.getElementById("webtoonFullscreen");

const previousChapter =
  document.getElementById("previousChapter");

const nextChapter =
  document.getElementById("nextChapter");

const chapterViews =
  document.getElementById("chapterViews");

const commentButton =
  document.getElementById("commentButton");

const commentCount =
  document.getElementById("commentCount");

const likeButton =
  document.getElementById("likeButton");

const likeIcon =
  document.getElementById("likeIcon");

const likeCount =
  document.getElementById("likeCount");

const audioSection =
  document.getElementById("audioSection");

const chapterAudio =
  document.getElementById("chapterAudio");

const audioPlay =
  document.getElementById("audioPlay");

const audioProgress =
  document.getElementById("audioProgress");

const audioTime =
  document.getElementById("audioTime");

const audioMute =
  document.getElementById("audioMute");

const audioVolume =
  document.getElementById("audioVolume");

const mobileMenuButton =
  document.getElementById("mobileMenuButton");

const navLinks =
  document.getElementById("navLinks");

/* =========================================================
   STATE
========================================================= */

const params = new URLSearchParams(window.location.search);
const chapterId = params.get("id");

let currentChapter = null;
let currentPages = [];

let mangaCurrentPage = 0;

let mangaTouchStartX = 0;
let mangaTouchStartY = 0;

let controlsHideTimer = null;

/* =========================================================
   HELPERS
========================================================= */

function cleanText(value) {
  if (!value) return "";

  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value, maxLength = 160) {
  const text = cleanText(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function linkifyText(text) {
  const escaped = escapeHtml(text);

  return escaped.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
}

function getChapterNumberLabel(chapter) {
  if (chapter?.chapter_label) {
    return chapter.chapter_label;
  }

  if (
    chapter?.chapter_number !== null &&
    chapter?.chapter_number !== undefined
  ) {
    const number = Number(chapter.chapter_number);

    if (Number.isFinite(number)) {
      return Number.isInteger(number)
        ? String(number)
        : String(number);
    }

    return String(chapter.chapter_number);
  }

  if (chapter?.numero !== null && chapter?.numero !== undefined) {
    return String(chapter.numero);
  }

  return "";
}

function getSeriesType(chapter) {
  return chapter?.series?.type || "novel";
}

function getSeriesFormat(chapter) {
  return chapter?.series?.format || null;
}

function isWebcomic(chapter) {
  return getSeriesType(chapter) === "webcomic";
}

function isManga(chapter) {
  return (
    isWebcomic(chapter) &&
    getSeriesFormat(chapter) === "manga"
  );
}

function isWebtoon(chapter) {
  return (
    isWebcomic(chapter) &&
    getSeriesFormat(chapter) === "webtoon"
  );
}

/* =========================================================
   SEO
========================================================= */

function setMetaName(name, content) {
  const element = document.querySelector(
    `meta[name="${name}"]`
  );

  if (element) {
    element.setAttribute("content", content || "");
  }
}

function setMetaProperty(property, content) {
  const element = document.querySelector(
    `meta[property="${property}"]`
  );

  if (element) {
    element.setAttribute("content", content || "");
  }
}

function setCanonical(url) {
  const element =
    document.getElementById("canonicalUrl");

  if (element) {
    element.href = url;
  }
}

function setChapterSEO(chapter, pages = []) {
  const series = chapter.series || {};

  const seriesName =
    series.title ||
    series.titre ||
    "BSCompany";

  const number =
    getChapterNumberLabel(chapter);

  const title =
    chapter.title ||
    chapter.titre ||
    "";

  const chapterLabel = number
    ? `Chapitre ${number}`
    : title;

  const pageTitle = [
    seriesName,
    chapterLabel,
    title
  ]
    .filter(Boolean)
    .join(" — ");

  const description =
    truncateText(chapter.content) ||
    truncateText(series.description) ||
    `Lisez ${chapterLabel || "ce chapitre"} sur BSCompany.`;

  let image =
    chapter.chapter_image_url ||
    null;

  if (!image && pages.length > 0) {
    image = pages[0].image_url;
  }

  if (!image && Array.isArray(chapter.image_urls)) {
    image = chapter.image_urls[0];
  }

  if (!image) {
    image = series.cover_url || "";
  }

  document.title =
    pageTitle || "Lecture — BSCompany";

  setMetaName("description", description);

  setMetaProperty(
    "og:title",
    pageTitle || "Lecture — BSCompany"
  );

  setMetaProperty(
    "og:description",
    description
  );

  setMetaProperty(
    "og:image",
    image
  );

  setMetaName(
    "twitter:title",
    pageTitle || "Lecture — BSCompany"
  );

  setMetaName(
    "twitter:description",
    description
  );

  setMetaName(
    "twitter:image",
    image
  );

  const canonical =
    `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(chapter.id)}`;

  setCanonical(canonical);
}

/* =========================================================
   CHAPTER PAGES
========================================================= */

async function loadChapterPages(chapter) {
  if (!isWebcomic(chapter)) {
    return [];
  }

  const { data, error } = await supabase
    .from("chapter_pages")
    .select(`
      id,
      chapter_id,
      page_number,
      image_url
    `)
    .eq("chapter_id", chapter.id)
    .order("page_number", {
      ascending: true
    });

  if (error) {
    console.warn(
      "Impossible de charger chapter_pages:",
      error
    );

    return [];
  }

  if (Array.isArray(data) && data.length > 0) {
    return data;
  }

  /*
    Compatibilité avec les anciens chapitres.
    On utilise image_urls uniquement si chapter_pages
    ne contient aucune page.
  */

  if (Array.isArray(chapter.image_urls)) {
    return chapter.image_urls
      .filter(Boolean)
      .map((url, index) => ({
        id: `legacy-${chapter.id}-${index + 1}`,
        chapter_id: chapter.id,
        page_number: index + 1,
        image_url: url
      }));
  }

  return [];
}

/* =========================================================
   LOAD CHAPTER
========================================================= */

async function loadChapter() {
  if (!chapterId) {
    showError(
      "Aucun chapitre n’a été indiqué."
    );
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
          format,
          cover_url,
          description
        )
      `)
      .eq("id", chapterId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        "Chapitre introuvable."
      );
    }

    currentChapter = data;

    currentPages =
      await loadChapterPages(data);

    setChapterSEO(
      data,
      currentPages
    );

    renderChapter(data);

    await loadChapterNavigation(data);

    setupAudio(data);

    loading.hidden = true;
    reader.hidden = false;
    readerControls.hidden = false;

    registerView(data);

  } catch (error) {
    console.error(
      "Erreur chargement chapitre:",
      error
    );

    showError(
      "Ce chapitre est introuvable ou n’a pas pu être chargé."
    );
  }
}

/* =========================================================
   RENDER CHAPTER
========================================================= */

function renderChapter(chapter) {
  const series = chapter.series || {};

  const type =
    series.type || "novel";

  const format =
    series.format || null;

  const seriesName =
    series.title ||
    series.titre ||
    "Œuvre";

  const number =
    getChapterNumberLabel(chapter);

  const title =
    chapter.title ||
    chapter.titre ||
    "Chapitre sans titre";

  /* ---------------------------------------------
     HEADER
  --------------------------------------------- */

  seriesTitle.textContent =
    seriesName;

  chapterTitle.textContent =
    title;

  chapterNumber.textContent =
    number
      ? `Chapitre ${number}`
      : "Chapitre";

  paperChapterNumber.textContent =
    number
      ? `Chapitre ${number}`
      : "Chapitre";

  if (type === "novel") {
    chapterType.textContent = "ROMAN";
  } else if (format === "manga") {
    chapterType.textContent = "MANGA";
  } else if (format === "webtoon") {
    chapterType.textContent = "WEBTOON";
  } else {
    chapterType.textContent = "WEBCOMIC";
  }

  if (series.id) {
    const seriesUrl =
      `./serie.html?id=${encodeURIComponent(series.id)}`;

    backToSeries.href = seriesUrl;
    seriesTitle.href = seriesUrl;
  }

  /* ---------------------------------------------
     HERO IMAGE
  --------------------------------------------- */

  let heroImage =
    chapter.chapter_image_url ||
    null;

  if (!heroImage && currentPages.length) {
    heroImage =
      currentPages[0].image_url;
  }

  if (
    !heroImage &&
    Array.isArray(chapter.image_urls)
  ) {
    heroImage =
      chapter.image_urls[0];
  }

  if (!heroImage) {
    heroImage =
      series.cover_url || "";
  }

  if (heroImage) {
    chapterImage.src = heroImage;
    chapterImage.alt =
      `${seriesName} — ${title}`;

    chapterImageWrap.hidden = false;

    const backgroundImage =
      chapterBackground.querySelector(
        ".reader-background-image"
      );

    if (backgroundImage) {
      backgroundImage.style.backgroundImage =
        `url("${heroImage}")`;
    }
  } else {
    chapterImageWrap.hidden = true;
  }

  /* ---------------------------------------------
     READER BRANCH
  --------------------------------------------- */

  readingPaper.hidden = true;
  mangaReader.hidden = true;
  webtoonReader.hidden = true;

  readingArea.classList.remove(
    "reader-mode-novel",
    "reader-mode-manga",
    "reader-mode-webtoon"
  );

  if (type === "novel") {
    renderNovelReader(chapter);

    readingPaper.hidden = false;

    readingArea.classList.add(
      "reader-mode-novel"
    );

    return;
  }

  if (format === "manga") {
    renderMangaReader(chapter);

    mangaReader.hidden = false;

    readingArea.classList.add(
      "reader-mode-manga"
    );

    return;
  }

  if (format === "webtoon") {
    renderWebtoonReader(chapter);

    webtoonReader.hidden = false;

    readingArea.classList.add(
      "reader-mode-webtoon"
    );

    return;
  }

  /*
    Si un ancien webcomic n'a pas encore
    de format défini, on garde un fallback
    visuel simple.
  */

  renderLegacyWebcomic(chapter);

  readingPaper.hidden = false;

  readingArea.classList.add(
    "reader-mode-novel"
  );
}

/* =========================================================
   ROMAN
========================================================= */

function renderNovelReader(chapter) {
  const content =
    chapter.content ||
    chapter.contenu ||
    "";

  chapterText.innerHTML = "";

  if (content.trim()) {
    const paragraphs =
      content
        .split(/\n\s*\n|\r?\n/)
        .map(item => item.trim())
        .filter(Boolean);

    chapterText.innerHTML =
      paragraphs
        .map(
          paragraph =>
            `<p>${linkifyText(paragraph)}</p>`
        )
        .join("");
  } else {
    chapterText.innerHTML =
      `<p class="empty-reading-message">
        Aucun texte n’est disponible pour ce chapitre.
      </p>`;
  }

  renderLegacyImages(chapter);
}

function renderLegacyImages(chapter) {
  chapterImages.innerHTML = "";

  if (
    !Array.isArray(chapter.image_urls) ||
    chapter.image_urls.length === 0
  ) {
    return;
  }

  const mainImage =
    chapter.chapter_image_url;

  const images =
    chapter.image_urls.filter(
      url => url && url !== mainImage
    );

  images.forEach((url, index) => {
    const figure =
      document.createElement("figure");

    figure.className =
      "chapter-inline-image";

    const image =
      document.createElement("img");

    image.src = url;

    image.alt =
      `Illustration ${index + 1}`;

    image.loading = "lazy";

    figure.appendChild(image);

    chapterImages.appendChild(
      figure
    );
  });
}

/* =========================================================
   FALLBACK WEBCOMIC
========================================================= */

function renderLegacyWebcomic(chapter) {
  const content =
    chapter.content ||
    chapter.contenu ||
    "";

  chapterText.innerHTML = "";

  if (content.trim()) {
    chapterText.innerHTML =
      content
        .split(/\n\s*\n|\r?\n/)
        .map(item => item.trim())
        .filter(Boolean)
        .map(
          paragraph =>
            `<p>${linkifyText(paragraph)}</p>`
        )
        .join("");
  }

  renderLegacyImages(chapter);
}

/* =========================================================
   MANGA
========================================================= */

function renderMangaReader(chapter) {
  if (!currentPages.length) {
    mangaPageStage.innerHTML = `
      <div class="comic-empty-state">
        <div class="comic-empty-icon">◫</div>
        <h2>Pages indisponibles</h2>
        <p>
          Les pages de ce chapitre n’ont pas encore été publiées.
        </p>
      </div>
    `;

    mangaPageCounter.textContent = "0 / 0";
    mangaBottomCounter.textContent = "0 / 0";

    mangaPrevious.disabled = true;
    mangaNext.disabled = true;
    mangaBottomPrevious.disabled = true;
    mangaBottomNext.disabled = true;

    return;
  }

  /*
    On remet l'image dans le stage si un état vide
    avait précédemment été affiché.
  */

  mangaPageStage.innerHTML = `
    <img
      id="mangaPageImage"
      class="manga-page-image"
      src=""
      alt=""
      draggable="false"
    >

    <div
      id="mangaPageLoading"
      class="manga-page-loading"
      hidden
    >
      <div class="chapter-loader"></div>
    </div>
  `;

  /*
    Les références DOM ont été remplacées,
    on les récupère à nouveau.
  */

  window.__bsMangaPageImage =
    mangaPageStage.querySelector(
      "#mangaPageImage"
    );

  window.__bsMangaPageLoading =
    mangaPageStage.querySelector(
      "#mangaPageLoading"
    );

  mangaCurrentPage = 0;

  updateMangaPage(
    mangaCurrentPage,
    false
  );
}

function updateMangaPage(index, animate = true) {
  if (!currentPages.length) {
    return;
  }

  const total =
    currentPages.length;

  mangaCurrentPage =
    Math.max(
      0,
      Math.min(index, total - 1)
    );

  const page =
    currentPages[mangaCurrentPage];

  const image =
    window.__bsMangaPageImage ||
    document.getElementById(
      "mangaPageImage"
    );

  const loader =
    window.__bsMangaPageLoading ||
    document.getElementById(
      "mangaPageLoading"
    );

  if (!image || !page) {
    return;
  }

  const pageNumber =
    Number(page.page_number) ||
    mangaCurrentPage + 1;

  mangaPageCounter.textContent =
    `${pageNumber} / ${total}`;

  mangaBottomCounter.textContent =
    `${pageNumber} / ${total}`;

  mangaPrevious.disabled =
    mangaCurrentPage === 0;

  mangaBottomPrevious.disabled =
    mangaCurrentPage === 0;

  mangaNext.disabled =
    mangaCurrentPage === total - 1;

  mangaBottomNext.disabled =
    mangaCurrentPage === total - 1;

  if (animate) {
    mangaPageStage.classList.remove(
      "page-changing"
    );

    void mangaPageStage.offsetWidth;

    mangaPageStage.classList.add(
      "page-changing"
    );
  }

  if (loader) {
    loader.hidden = false;
  }

  image.onload = () => {
    if (loader) {
      loader.hidden = true;
    }
  };

  image.onerror = () => {
    if (loader) {
      loader.hidden = true;
    }

    image.alt =
      "Impossible de charger cette page";
  };

  image.src = page.image_url;

  image.alt =
    `Page ${pageNumber} du chapitre`;

  mangaViewport.focus({
    preventScroll: true
  });

  updateMangaChapterButtons();
}

function updateMangaChapterButtons() {
  const isFirst =
    mangaCurrentPage === 0;

  const isLast =
    mangaCurrentPage === currentPages.length - 1;

  mangaPrevious.setAttribute(
    "aria-disabled",
    String(isFirst)
  );

  mangaNext.setAttribute(
    "aria-disabled",
    String(isLast)
  );
}

function mangaGoPrevious() {
  if (mangaCurrentPage > 0) {
    updateMangaPage(
      mangaCurrentPage - 1
    );
    return;
  }

  /*
    Au début du manga, on laisse la navigation
    chapitre précédente gérer le reste.
  */

  if (
    previousChapter &&
    previousChapter.getAttribute("href") !== "#"
  ) {
    window.location.href =
      previousChapter.href;
  }
}

function mangaGoNext() {
  if (
    mangaCurrentPage <
    currentPages.length - 1
  ) {
    updateMangaPage(
      mangaCurrentPage + 1
    );
    return;
  }

  /*
    Dernière page :
    le bouton chapitre suivant prend le relais.
  */

  if (
    nextChapter &&
    nextChapter.getAttribute("href") !== "#"
  ) {
    window.location.href =
      nextChapter.href;
  }
}

/* =========================================================
   MANGA SWIPE
========================================================= */

function setupMangaSwipe() {
  if (!mangaViewport) {
    return;
  }

  mangaViewport.addEventListener(
    "touchstart",
    event => {
      if (!event.touches.length) {
        return;
      }

      mangaTouchStartX =
        event.touches[0].clientX;

      mangaTouchStartY =
        event.touches[0].clientY;
    },
    {
      passive: true
    }
  );

  mangaViewport.addEventListener(
    "touchend",
    event => {
      if (!event.changedTouches.length) {
        return;
      }

      const endX =
        event.changedTouches[0].clientX;

      const endY =
        event.changedTouches[0].clientY;

      const deltaX =
        endX - mangaTouchStartX;

      const deltaY =
        endY - mangaTouchStartY;

      /*
        On considère uniquement les vrais gestes
        horizontaux.
      */

      if (
        Math.abs(deltaX) < 45 ||
        Math.abs(deltaX) < Math.abs(deltaY)
      ) {
        return;
      }

      if (deltaX < 0) {
        mangaGoNext();
      } else {
        mangaGoPrevious();
      }
    },
    {
      passive: true
    }
  );
}

/* =========================================================
   WEBTOON
========================================================= */

function renderWebtoonReader(chapter) {
  webtoonPages.innerHTML = "";

  if (!currentPages.length) {
    webtoonPages.innerHTML = `
      <div class="comic-empty-state">
        <div class="comic-empty-icon">▤</div>

        <h2>Images indisponibles</h2>

        <p>
          Les images de ce chapitre n’ont pas encore été publiées.
        </p>
      </div>
    `;

    webtoonPageCount.textContent =
      "0 images";

    return;
  }

  webtoonPageCount.textContent =
    `${currentPages.length} ${
      currentPages.length > 1
        ? "images"
        : "image"
    }`;

  currentPages.forEach(
    (page, index) => {
      const figure =
        document.createElement("figure");

      figure.className =
        "webtoon-page";

      figure.dataset.page =
        String(
          Number(page.page_number) ||
          index + 1
        );

      const image =
        document.createElement("img");

      image.src =
        page.image_url;

      image.alt =
        `Image ${
          Number(page.page_number) ||
          index + 1
        } du chapitre`;

      image.loading =
        index < 2
          ? "eager"
          : "lazy";

      image.decoding =
        "async";

      figure.appendChild(image);

      webtoonPages.appendChild(
        figure
      );
    }
  );
}

/* =========================================================
   FULLSCREEN
========================================================= */

async function toggleFullscreen(element) {
  try {
    if (!document.fullscreenElement) {
      await element.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  } catch (error) {
    console.warn(
      "Plein écran indisponible:",
      error
    );
  }
}

/* =========================================================
   NAVIGATION
========================================================= */

async function loadChapterNavigation(chapter) {
  const seriesId =
    chapter.series_id ||
    chapter.series?.id;

  if (!seriesId) {
    return;
  }

  const { data, error } =
    await supabase
      .from("chapters")
      .select(`
        id,
        chapter_number,
        chapter_label,
        title,
        published_at
      `)
      .eq("series_id", seriesId)
      .order("chapter_number", {
        ascending: true
      });

  if (error) {
    console.warn(
      "Erreur navigation chapitres:",
      error
    );

    return;
  }

  if (!Array.isArray(data)) {
    return;
  }

  const currentIndex =
    data.findIndex(
      item => item.id === chapter.id
    );

  if (currentIndex === -1) {
    return;
  }

  const previous =
    data[currentIndex - 1] || null;

  const next =
    data[currentIndex + 1] || null;

  configureChapterNav(
    previousChapter,
    previous,
    "Chapitre précédent"
  );

  configureChapterNav(
    nextChapter,
    next,
    "Chapitre suivant"
  );
}

function configureChapterNav(
  element,
  chapter,
  fallback
) {
  if (!element) {
    return;
  }

  if (!chapter) {
    element.classList.add("disabled");
    element.setAttribute(
      "aria-disabled",
      "true"
    );
    element.href = "#";

    const strong =
      element.querySelector("strong");

    if (strong) {
      strong.textContent =
        fallback === "Chapitre précédent"
          ? "Premier chapitre"
          : "Dernier chapitre";
    }

    return;
  }

  element.classList.remove("disabled");
  element.removeAttribute(
    "aria-disabled"
  );

  element.href =
    `./chapter.html?id=${encodeURIComponent(chapter.id)}`;

  const number =
    getChapterNumberLabel(chapter);

  const title =
    chapter.title ||
    chapter.titre ||
    "";

  const strong =
    element.querySelector("strong");

  if (strong) {
    strong.textContent =
      number
        ? `Chapitre ${number}${title ? ` — ${title}` : ""}`
        : title || fallback;
  }
}

/* =========================================================
   AUDIO
========================================================= */

function setupAudio(chapter) {
  if (!audioSection || !chapterAudio) {
    return;
  }

  const soundUrl =
    chapter.sound_url ||
    chapter.sound_id ||
    "";

  if (!soundUrl) {
    audioSection.hidden = true;
    return;
  }

  audioSection.hidden = false;

  chapterAudio.src =
    soundUrl;

  chapterAudio.loop = true;
  chapterAudio.volume = 1;

  audioVolume.value = "1";

  updateAudioButton();

  audioPlay.onclick = () => {
    if (chapterAudio.paused) {
      chapterAudio
        .play()
        .catch(() => {
          /*
            Le navigateur peut bloquer
            l'autoplay. L'utilisateur pourra
            alors lancer la lecture manuellement.
          */
        });
    } else {
      chapterAudio.pause();
    }
  };

  chapterAudio.addEventListener(
    "play",
    updateAudioButton
  );

  chapterAudio.addEventListener(
    "pause",
    updateAudioButton
  );

  chapterAudio.addEventListener(
    "timeupdate",
    updateAudioProgress
  );

  chapterAudio.addEventListener(
    "loadedmetadata",
    updateAudioProgress
  );

  audioProgress.addEventListener(
    "input",
    () => {
      if (!chapterAudio.duration) {
        return;
      }

      const percentage =
        Number(audioProgress.value);

      chapterAudio.currentTime =
        chapterAudio.duration *
        (percentage / 100);
    }
  );

  audioMute.onclick = () => {
    chapterAudio.muted =
      !chapterAudio.muted;

    updateMuteButton();
  };

  audioVolume.addEventListener(
    "input",
    () => {
      chapterAudio.volume =
        Number(audioVolume.value);

      chapterAudio.muted =
        chapterAudio.volume === 0;

      updateMuteButton();
    }
  );
}

function updateAudioButton() {
  if (!audioPlay || !chapterAudio) {
    return;
  }

  const playing =
    !chapterAudio.paused;

  audioPlay.classList.toggle(
    "is-playing",
    playing
  );

  audioPlay.setAttribute(
    "aria-label",
    playing
      ? "Mettre en pause"
      : "Lire"
  );
}

function updateAudioProgress() {
  if (
    !chapterAudio ||
    !audioProgress
  ) {
    return;
  }

  const duration =
    chapterAudio.duration;

  if (!duration || !Number.isFinite(duration)) {
    audioProgress.value = "0";
    audioTime.textContent = "0:00";
    return;
  }

  const percentage =
    (chapterAudio.currentTime /
      duration) *
    100;

  audioProgress.value =
    String(percentage);

  audioTime.textContent =
    formatTime(
      chapterAudio.currentTime
    );
}

function updateMuteButton() {
  if (!audioMute || !chapterAudio) {
    return;
  }

  audioMute.classList.toggle(
    "is-muted",
    chapterAudio.muted ||
      chapterAudio.volume === 0
  );
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes =
    Math.floor(seconds / 60);

  const remaining =
    Math.floor(seconds % 60);

  return `${minutes}:${String(
    remaining
  ).padStart(2, "0")}`;
}

/* =========================================================
   VIEWS
========================================================= */

function getVisitorId() {
  const key =
    "bscompany_visitor_id";

  let visitorId =
    localStorage.getItem(key);

  if (!visitorId) {
    visitorId =
      crypto.randomUUID();

    localStorage.setItem(
      key,
      visitorId
    );
  }

  return visitorId;
}

async function registerView(chapter) {
  try {
    const visitorId =
      getVisitorId();

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

    const { count, error } =
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

    if (!error) {
      chapterViews.textContent =
        String(count || 0);
    }
  } catch (error) {
    console.warn(
      "Erreur compteur de vues:",
      error
    );
  }
}

/* =========================================================
   LIKES
========================================================= */

async function setupLikeButton(chapter) {
  if (!likeButton) {
    return;
  }

  const visitorId =
    getVisitorId();

  try {
    const { count, error } =
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

    if (!error) {
      likeCount.textContent =
        String(count || 0);
    }

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

    setLikeState(
      Boolean(existingLike)
    );

    likeButton.onclick =
      async () => {
        likeButton.disabled =
          true;

        try {
          if (existingLikeState()) {
            await supabase
              .from("likes")
              .delete()
              .eq(
                "chapter_id",
                chapter.id
              )
              .eq(
                "visitor_id",
                visitorId
              );
          } else {
            await supabase
              .from("likes")
              .insert({
                user_id: null,
                visitor_id: visitorId,
                chapter_id: chapter.id,
                profil_id: null,
                series_id:
                  chapter.series_id ||
                  chapter.series?.id ||
                  null
              });
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

          setLikeState(
            !existingLikeState()
          );

        } catch (error) {
          console.error(
            "Erreur like:",
            error
          );
        } finally {
          likeButton.disabled =
            false;
        }
      };

  } catch (error) {
    console.warn(
      "Erreur initialisation like:",
      error
    );
  }
}

function existingLikeState() {
  return (
    likeButton.getAttribute(
      "aria-pressed"
    ) === "true"
  );
}

function setLikeState(liked) {
  likeButton.setAttribute(
    "aria-pressed",
    String(liked)
  );

  likeButton.classList.toggle(
    "liked",
    liked
  );

  if (likeIcon) {
    likeIcon.classList.toggle(
      "heart-filled",
      liked
    );
  }
}

/* =========================================================
   COMMENTS
========================================================= */

function setupComments() {
  if (!commentButton) {
    return;
  }

  commentButton.addEventListener(
    "click",
    () => {
      const comments =
        document.getElementById(
          "commentsSection"
        );

      if (comments) {
        comments.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }
  );

  /*
    Le système de commentaires n'est pas
    actif dans la v0.1.
  */

  if (commentCount) {
    commentCount.textContent = "0";
  }
}

/* =========================================================
   READER CONTROLS
========================================================= */

function setupReaderControls() {
  if (!readerControls) {
    return;
  }

  const showControls = () => {
    readerControls.classList.remove(
      "controls-hidden"
    );

    clearTimeout(
      controlsHideTimer
    );

    controlsHideTimer =
      setTimeout(
        () => {
          /*
            On évite de cacher les contrôles
            pendant qu'un utilisateur interagit
            avec l'audio.
          */

          if (
            document.activeElement ===
              audioProgress ||
            document.activeElement ===
              audioVolume
          ) {
            return;
          }

          readerControls.classList.add(
            "controls-hidden"
          );
        },
        4500
      );
  };

  document.addEventListener(
    "mousemove",
    showControls,
    {
      passive: true
    }
  );

  document.addEventListener(
    "touchstart",
    showControls,
    {
      passive: true
    }
  );

  document.addEventListener(
    "keydown",
    showControls
  );

  readerControls.addEventListener(
    "mouseenter",
    () => {
      clearTimeout(
        controlsHideTimer
      );

      readerControls.classList.remove(
        "controls-hidden"
      );
    }
  );

  readerControls.addEventListener(
    "mouseleave",
    showControls
  );

  showControls();
}

/* =========================================================
   MOBILE MENU
========================================================= */

function setupMobileMenu() {
  if (
    !mobileMenuButton ||
    !navLinks
  ) {
    return;
  }

  mobileMenuButton.addEventListener(
    "click",
    () => {
      const opened =
        navLinks.classList.toggle(
          "mobile-open"
        );

      mobileMenuButton.setAttribute(
        "aria-expanded",
        String(opened)
      );
    }
  );

  navLinks
    .querySelectorAll("a")
    .forEach(link => {
      link.addEventListener(
        "click",
        () => {
          navLinks.classList.remove(
            "mobile-open"
          );

          mobileMenuButton.setAttribute(
            "aria-expanded",
            "false"
          );
        }
      );
    });
}

/* =========================================================
   KEYBOARD
========================================================= */

function setupKeyboardNavigation() {
  document.addEventListener(
    "keydown",
    event => {
      if (
        !currentChapter ||
        !isManga(currentChapter)
      ) {
        return;
      }

      if (
        event.target instanceof
          HTMLInputElement ||
        event.target instanceof
          HTMLTextAreaElement ||
        event.target instanceof
          HTMLButtonElement
      ) {
        /*
          Les boutons manga sont gérés
          directement.
        */
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        mangaGoPrevious();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        mangaGoNext();
      }

      if (event.key === " ") {
        /*
          Sur la zone Manga uniquement,
          espace peut afficher/cacher
          les contrôles.
        */

        if (
          document.activeElement ===
          mangaViewport
        ) {
          event.preventDefault();

          readerControls.classList.toggle(
            "controls-hidden"
          );
        }
      }
    }
  );
}

/* =========================================================
   CLICK MANGA PAGE
========================================================= */

function setupMangaPageInteraction() {
  if (!mangaPageStage) {
    return;
  }

  mangaPageStage.addEventListener(
    "click",
    () => {
      if (!isManga(currentChapter)) {
        return;
      }

      readerControls.classList.toggle(
        "controls-hidden"
      );
    }
  );
}

/* =========================================================
   FULLSCREEN BUTTONS
========================================================= */

function setupFullscreenButtons() {
  if (mangaFullscreen) {
    mangaFullscreen.addEventListener(
      "click",
      () => {
        toggleFullscreen(
          mangaReader
        );
      }
    );
  }

  if (webtoonFullscreen) {
    webtoonFullscreen.addEventListener(
      "click",
      () => {
        toggleFullscreen(
          webtoonReader
        );
      }
    );
  }
}

/* =========================================================
   BUTTON EVENTS
========================================================= */

function setupMangaButtons() {
  mangaPrevious.addEventListener(
    "click",
    mangaGoPrevious
  );

  mangaBottomPrevious.addEventListener(
    "click",
    mangaGoPrevious
  );

  mangaNext.addEventListener(
    "click",
    mangaGoNext
  );

  mangaBottomNext.addEventListener(
    "click",
    mangaGoNext
  );
}

/* =========================================================
   ERROR
========================================================= */

function showError(message) {
  loading.hidden = true;
  reader.hidden = true;
  readerControls.hidden = true;

  errorBox.hidden = false;

  errorMessage.textContent =
    message ||
    "Une erreur est survenue.";
}

/* =========================================================
   START
========================================================= */

async function startReader() {
  setupMobileMenu();
  setupMangaButtons();
  setupMangaSwipe();
  setupMangaPageInteraction();
  setupFullscreenButtons();
  setupKeyboardNavigation();
  setupReaderControls();
  setupComments();

  await loadChapter();

  if (currentChapter) {
    await setupLikeButton(
      currentChapter
    );
  }
}

startReader();
