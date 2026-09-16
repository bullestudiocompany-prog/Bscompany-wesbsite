import { supabase } from "./supabaseClient.js";

/* =========================
HELPERS
========================= */

function $(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

function createSlug(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatChapterLabel(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const label = String(value).trim();

  if (!label) {
    return "";
  }

  if (
    label.toLowerCase().startsWith("chapitre")
  ) {
    return label;
  }

  return `Chapitre ${label}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} o`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} Ko`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

function formatRatio(width, height) {
  if (!width || !height) {
    return "—";
  }

  const ratio = width / height;

  /*
  On garde suffisamment de précision
  pour les images de manga/webtoon.
  */
  return `1:${(height / width).toFixed(2)}`;
}

function getOrientation(width, height) {
  if (!width || !height) {
    return "Inconnue";
  }

  if (width === height) {
    return "Carré";
  }

  return height > width
    ? "Portrait"
    : "Paysage";
}

function getFileExtension(file) {
  if (!file) {
    return "";
  }

  const name = String(file.name || "");

  if (!name.includes(".")) {
    return "";
  }

  return name
    .split(".")
    .pop()
    .toLowerCase();
}

function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(
        new Error(
          "Aucune image fournie."
        )
      );

      return;
    }

    const objectUrl =
      URL.createObjectURL(file);

    const image =
      new Image();

    image.onload = () => {
      const result = {
        width: image.naturalWidth,
        height: image.naturalHeight
      };

      URL.revokeObjectURL(
        objectUrl
      );

      resolve(result);
    };

    image.onerror = () => {
      URL.revokeObjectURL(
        objectUrl
      );

      reject(
        new Error(
          "Impossible de lire les dimensions de cette image."
        )
      );
    };

    image.src = objectUrl;
  });
}

function isAllowedImage(file) {
  if (!file) {
    return false;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  return allowedTypes.includes(
    file.type
  );
}

function isWebcomicSeries(series) {
  return Boolean(
    series &&
    series.type === "webcomic"
  );
}

function getWebcomicFormat(series) {
  if (!isWebcomicSeries(series)) {
    return null;
  }

  return (
    series.format === "manga" ||
    series.format === "webtoon"
  )
    ? series.format
    : null;
}

/* =========================
ANALYSE IMAGE WEBCOMIC
========================= */

function analyzeWebcomicImage(
  dimensions,
  file,
  format
) {
  const width =
    dimensions.width;

  const height =
    dimensions.height;

  const ratio =
    width / height;

  const result = {
    messages: [],
    errors: [],
    warnings: [],
    successes: [],
    info: []
  };

  if (
    !width ||
    !height
  ) {
    result.errors.push(
      "Dimensions impossibles à déterminer."
    );

    return result;
  }

  if (!isAllowedImage(file)) {
    result.errors.push(
      "Format non autorisé. Utilise JPEG, PNG ou WebP."
    );

    return result;
  }

  /*
  Taille :
  10 Mo = limite de sécurité utilisée
  pour les images administratives du site.

  Ce n'est pas une contrainte de format
  Manga/Webtoon.
  */
  if (
    file.size >
    10 * 1024 * 1024
  ) {
    result.errors.push(
      "Cette image dépasse la limite de 10 Mo."
    );
  } else {
    result.successes.push(
      "Poids du fichier acceptable."
    );
  }

  if (format === "manga") {
    /*
    Manga :

    Aucune résolution rigide.
    Les pages peuvent être :
    - portrait
    - paysage
    - carré

    On donne donc surtout
    des informations et avertissements.
    */

    result.info.push(
      "Le format Manga accepte les pages portrait, paysage ou carré."
    );

    if (width < 800) {
      result.warnings.push(
        "Largeur assez faible pour une page Manga. Une image plus grande peut offrir une meilleure lecture."
      );
    } else {
      result.successes.push(
        "Largeur suffisante pour une lecture confortable."
      );
    }

    if (height < 1000) {
      result.warnings.push(
        "Hauteur assez faible pour une page Manga."
      );
    }

    if (height > width) {
      result.successes.push(
        "Orientation portrait adaptée à une page Manga classique."
      );
    } else if (width > height) {
      result.info.push(
        "Orientation paysage détectée. Cela peut convenir à une double page ou une composition particulière."
      );
    } else {
      result.info.push(
        "Page carrée détectée."
      );
    }

    if (ratio >= 1.15) {
      result.info.push(
        "Ratio vertical compatible avec une page Manga."
      );
    }
  }

  if (format === "webtoon") {
    /*
    Webtoon :

    On privilégie fortement
    les images verticales.

    800 px est une largeur
    de référence courante.

    1280 px est utilisé ici
    comme hauteur théorique
    de segment.
    */

    const verticalRatio =
      height / width;

    if (height <= width) {
      result.warnings.push(
        "Cette image n'est pas verticale. Une bande Webtoon est normalement fortement verticale."
      );
    } else {
      result.successes.push(
        "Orientation verticale détectée."
      );
    }

    if (verticalRatio < 1.2) {
      result.warnings.push(
        "Cette image est peu verticale pour un Webtoon."
      );
    } else if (
      verticalRatio >= 1.5
    ) {
      result.successes.push(
        "Ratio vertical adapté au Webtoon."
      );
    } else {
      result.info.push(
        "Image verticale, mais relativement courte."
      );
    }

    if (width === 800) {
      result.successes.push(
        "Largeur de référence Webtoon : 800 px."
      );
    } else if (width > 800) {
      result.info.push(
        "Largeur supérieure à 800 px. L'image originale sera conservée."
      );
    } else {
      result.warnings.push(
        "Largeur inférieure à 800 px. La qualité peut être moins confortable sur grand écran."
      );
    }

    if (height > 1280) {
      const segments =
        Math.ceil(
          height / 1280
        );

      result.info.push(
        `Image longue détectée : environ ${segments} segment(s) théorique(s) de 1280 px.`
      );
    } else {
      result.info.push(
        "Hauteur inférieure ou égale à 1280 px."
      );
    }
  }

  return result;
}

function renderAnalysisMessages(
  analysis
) {
  let html = "";

  analysis.errors.forEach(
    (message) => {
      html += `
        <div class="webcomic-analysis-error">
          ❌ ${escapeHTML(message)}
        </div>
      `;
    }
  );

  analysis.warnings.forEach(
    (message) => {
      html += `
        <div class="webcomic-analysis-warning">
          ⚠️ ${escapeHTML(message)}
        </div>
      `;
    }
  );

  analysis.successes.forEach(
    (message) => {
      html += `
        <div class="webcomic-analysis-success">
          ✓ ${escapeHTML(message)}
        </div>
      `;
    }
  );

  analysis.info.forEach(
    (message) => {
      html += `
        <div class="webcomic-analysis-info">
          ℹ️ ${escapeHTML(message)}
        </div>
      `;
    }
  );

  return html;
}

/* =========================
ELEMENTS
========================= */

const loginSection = $("loginSection");
const adminSection = $("adminSection");
const loginForm = $("loginForm");
const loginError = $("loginError");
const logoutBtn = $("logoutBtn");

const seriesList = $("seriesList");

const addSeriesForm = $("addSeriesForm");
const seriesSubmitBtn = $("seriesSubmitBtn");
const seriesStatusMsg = $("seriesStatusMsg");

/* =========================
ELEMENTS FORMAT OEUVRE
========================= */

const seriesType = $("seriesType");
const seriesFormat = $("seriesFormat");
const seriesFormatGroup =
  $("seriesFormatGroup");

const editSeriesType =
  $("editSeriesType");

const editSeriesFormat =
  $("editSeriesFormat");

const editSeriesFormatGroup =
  $("editSeriesFormatGroup");

/* =========================
ELEMENTS MODIFICATION OEUVRE
========================= */

const editSeriesForm = $("editSeriesForm");
const editSeriesTitle = $("editSeriesTitle");
const editSeriesGenre = $("editSeriesGenre");
const editSeriesStatus = $("editSeriesStatus");
const editSeriesDescription = $("editSeriesDescription");
const editSeriesCover = $("editSeriesCover");
const editSeriesSubmitBtn = $("editSeriesSubmitBtn");
const cancelEditSeriesBtn = $("cancelEditSeriesBtn");
const editSeriesStatusMsg = $("editSeriesStatusMsg");

/* =========================
ELEMENTS CHAPITRES
========================= */

const chaptersList = $("chaptersList");
const selectedSeriesTitle = $("selectedSeriesTitle");
const newChapterBtn = $("newChapterBtn");

const addChapterForm = $("addChapterForm");
const chapterSubmitBtn = $("chapterSubmitBtn");
const chapterStatusMsg = $("chapterStatusMsg");
const chapterSound = $("chapterSound");

/* =========================
ELEMENTS WEBCOMIC
========================= */

const chapterContent =
  $("chapterContent");

const chapterContentGroup =
  $("chapterContentGroup");

const chapterImage =
  $("chapterImage");

const chapterImageGroup =
  $("chapterImageGroup");

const webcomicPagesGroup =
  $("webcomicPagesGroup");

const webcomicPageList =
  $("webcomicPageList");

const addWebcomicPageBtn =
  $("addWebcomicPageBtn");

/* =========================
ELEMENTS SONS
========================= */

const soundForm = $("soundForm");
const soundSubmitBtn = $("soundSubmitBtn");
const soundStatusMsg = $("soundStatusMsg");
const soundsList = $("soundsList");

/* =========================
DASHBOARD
========================= */

const seriesCount = $("seriesCount");
const chaptersCount = $("chaptersCount");
const soundsCount = $("soundsCount");

/* =========================
CARROUSEL
========================= */

const carouselForm = $("carouselForm");
const carouselSubmitBtn = $("carouselSubmitBtn");
const carouselStatusMsg = $("carouselStatusMsg");
const carouselList = $("carouselList");

/* =========================
ETAT
========================= */

let currentUser = null;

let selectedSeries = null;

let editingSeriesId = null;

let editingSeriesCoverUrl = null;

let editingChapterId = null;

let editingChapterImageUrl = null;

/*
Pages Webcomic actuellement présentes
dans le formulaire.

Chaque élément possède :

{
  id,
  pageNumber,
  imageUrl,
  file,
  existing
}
*/
let webcomicPages = [];

/* =========================
FORMAT OEUVRE UI
========================= */

function updateSeriesFormatUI(
  type,
  format = ""
) {
  const isWebcomic =
    type === "webcomic";

  if (seriesFormatGroup) {
    seriesFormatGroup.style.display =
      isWebcomic
        ? "block"
        : "none";
  }

  if (seriesFormat) {
    if (isWebcomic) {
      seriesFormat.required =
        true;

      if (
        format === "manga" ||
        format === "webtoon"
      ) {
        seriesFormat.value =
          format;
      }
    } else {
      seriesFormat.required =
        false;

      seriesFormat.value = "";
    }
  }
}

function updateEditSeriesFormatUI(
  type,
  format = ""
) {
  const isWebcomic =
    type === "webcomic";

  if (editSeriesFormatGroup) {
    editSeriesFormatGroup.style.display =
      isWebcomic
        ? "block"
        : "none";
  }

  if (editSeriesFormat) {
    if (isWebcomic) {
      editSeriesFormat.required =
        true;

      if (
        format === "manga" ||
        format === "webtoon"
      ) {
        editSeriesFormat.value =
          format;
      }
    } else {
      editSeriesFormat.required =
        false;

      editSeriesFormat.value = "";
    }
  }
}

if (seriesType) {
  seriesType.addEventListener(
    "change",
    () => {
      updateSeriesFormatUI(
        seriesType.value,
        seriesFormat?.value || ""
      );
    }
  );

  updateSeriesFormatUI(
    seriesType.value,
    seriesFormat?.value || ""
  );
}

if (editSeriesType) {
  editSeriesType.addEventListener(
    "change",
    () => {
      updateEditSeriesFormatUI(
        editSeriesType.value,
        editSeriesFormat?.value || ""
      );
    }
  );

  updateEditSeriesFormatUI(
    editSeriesType.value,
    editSeriesFormat?.value || ""
  );
}

/* =========================
WEBCOMIC CHAPTER UI
========================= */

function updateChapterEditorUI() {
  const isWebcomic =
    isWebcomicSeries(
      selectedSeries
    );

  if (
    chapterContentGroup
  ) {
    chapterContentGroup.style.display =
      isWebcomic
        ? "none"
        : "";
  }

  if (
    chapterImageGroup
  ) {
    chapterImageGroup.style.display =
      isWebcomic
        ? "none"
        : "";
  }

  if (
    webcomicPagesGroup
  ) {
    webcomicPagesGroup.style.display =
      isWebcomic
        ? "block"
        : "none";
  }

  if (chapterContent) {
    chapterContent.required =
      !isWebcomic;
  }

  if (chapterImage) {
    chapterImage.required =
      !isWebcomic &&
      !editingChapterId;
  }
}

/* =========================
WEBCOMIC PAGE STATE
========================= */

function clearWebcomicPages() {
  webcomicPages = [];

  if (webcomicPageList) {
    webcomicPageList.innerHTML =
      "";
  }
}

function getNextPageNumber() {
  if (
    webcomicPages.length ===
    0
  ) {
    return 1;
  }

  const numbers =
    webcomicPages
      .map(
        (page) =>
          Number(
            page.pageNumber
          )
      )
      .filter(
        Number.isFinite
      );

  if (numbers.length === 0) {
    return 1;
  }

  return (
    Math.max(...numbers) +
    1
  );
}

function createPageState(
  options = {}
) {
  return {
    id:
      options.id || null,

    pageNumber:
      options.pageNumber ??
      getNextPageNumber(),

    imageUrl:
      options.imageUrl ||
      null,

    file:
      options.file || null,

    existing:
      Boolean(
        options.existing
      ),

    removed:
      false
  };
}

function renderWebcomicPages() {
  if (!webcomicPageList) {
    return;
  }

  webcomicPageList.innerHTML =
    "";

  webcomicPages
    .filter(
      (page) =>
        !page.removed
    )
    .forEach(
      (page, index) => {
        renderWebcomicPageItem(
          page,
          index
        );
      }
    );
}

function renderWebcomicPageItem(
  page,
  index
) {
  if (!webcomicPageList) {
    return;
  }

  const item =
    document.createElement(
      "div"
    );

  item.className =
    "webcomic-page-item";

  item.dataset.pageId =
    page.id ||
    `new-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

  const displayNumber =
    Number.isFinite(
      Number(page.pageNumber)
    )
      ? Number(page.pageNumber)
      : index + 1;

  item.innerHTML = `
    <div class="webcomic-page-header">
      <strong>
        ${
          selectedSeries?.format ===
          "webtoon"
            ? "BANDE"
            : "PAGE"
        }
        ${String(
          displayNumber
        ).padStart(2, "0")}
      </strong>

      <button
        type="button"
        class="danger webcomic-remove-page"
      >
        🗑️ Supprimer
      </button>
    </div>

    <div class="webcomic-page-preview">
      ${
        page.imageUrl
          ? `
            <img
              src="${escapeAttribute(
                page.imageUrl
              )}"
              alt="Page ${escapeAttribute(
                displayNumber
              )}"
            >
          `
          : `
            <div class="webcomic-no-preview">
              Aperçu disponible après sélection
            </div>
          `
      }
    </div>

    <div class="webcomic-page-file">
      <label>
        ${
          page.existing
            ? "Remplacer cette image"
            : "Image de la page"
        }
      </label>

      <input
        type="file"
        class="webcomic-page-input"
        accept="image/jpeg,image/png,image/webp"
      >
    </div>

    <div class="webcomic-analysis">
      ${
        page.file
          ? `
            <div class="webcomic-analysis-loading">
              Analyse de l'image...
            </div>
          `
          : page.imageUrl
            ? `
              <div class="webcomic-analysis-info">
                Image existante.
                Sélectionne une nouvelle image
                uniquement si tu souhaites la remplacer.
              </div>
            `
            : `
              <div class="webcomic-analysis-info">
                Sélectionne une image pour afficher
                ses dimensions, son ratio et son poids.
              </div>
            `
      }
    </div>
  `;

  webcomicPageList.appendChild(
    item
  );

  const input =
    item.querySelector(
      ".webcomic-page-input"
    );

  const removeButton =
    item.querySelector(
      ".webcomic-remove-page"
    );

  if (input) {
    input.addEventListener(
      "change",
      async () => {
        const file =
          input.files?.[0] ||
          null;

        page.file = file;

        if (!file) {
          renderWebcomicPages();

          return;
        }

        await analyzeAndRenderPage(
          page,
          item,
          file
        );
      }
    );
  }

  if (removeButton) {
    removeButton.addEventListener(
      "click",
      () => {
        /*
        Pour une page existante,
        on ne supprime pas immédiatement
        la ligne Supabase.

        On la marque comme supprimée.
        La suppression réelle de la ligne
        sera effectuée lors de
        l'enregistrement du chapitre.
        */
        page.removed = true;

        renderWebcomicPages();
      }
    );
  }

  if (page.file) {
    analyzeAndRenderPage(
      page,
      item,
      page.file
    );
  }
}

async function analyzeAndRenderPage(
  page,
  item,
  file
) {
  const analysisContainer =
    item.querySelector(
      ".webcomic-analysis"
    );

  if (!analysisContainer) {
    return;
  }

  if (!isAllowedImage(file)) {
    analysisContainer.innerHTML = `
      <div class="webcomic-analysis-error">
        ❌ Format non autorisé.
        Utilise JPEG, PNG ou WebP.
      </div>
    `;

    return;
  }

  if (
    file.size >
    10 * 1024 * 1024
  ) {
    analysisContainer.innerHTML = `
      <div class="webcomic-analysis-error">
        ❌ Cette image dépasse 10 Mo.
      </div>
    `;

    return;
  }

  analysisContainer.innerHTML = `
    <div class="webcomic-analysis-loading">
      ⏳ Analyse des dimensions...
    </div>
  `;

  try {
    const dimensions =
      await getImageDimensions(
        file
      );

    const format =
      getWebcomicFormat(
        selectedSeries
      );

    const analysis =
      analyzeWebcomicImage(
        dimensions,
        file,
        format
      );

    const ratio =
      formatRatio(
        dimensions.width,
        dimensions.height
      );

    const orientation =
      getOrientation(
        dimensions.width,
        dimensions.height
      );

    const extension =
      getFileExtension(
        file
      );

    let segmentsHTML =
      "";

    if (
      format === "webtoon" &&
      dimensions.height > 1280
    ) {
      const count =
        Math.ceil(
          dimensions.height /
            1280
        );

      segmentsHTML = `
        <div class="webcomic-segments">
          <strong>
            Découpage théorique :
          </strong>

          <div>
            Environ ${count} segment(s)
            de 1280 px.
          </div>
        </div>
      `;
    }

    analysisContainer.innerHTML = `
      <div class="webcomic-analysis-details">

        <div>
          <strong>
            Dimensions
          </strong>
          <br>
          ${escapeHTML(
            dimensions.width
          )}
          ×
          ${escapeHTML(
            dimensions.height
          )}
          px
        </div>

        <div>
          <strong>
            Ratio
          </strong>
          <br>
          ${escapeHTML(
            ratio
          )}
        </div>

        <div>
          <strong>
            Poids
          </strong>
          <br>
          ${escapeHTML(
            formatBytes(
              file.size
            )
          )}
        </div>

        <div>
          <strong>
            Format
          </strong>
          <br>
          ${escapeHTML(
            extension
              ? extension.toUpperCase()
              : file.type
          )}
        </div>

        <div>
          <strong>
            Orientation
          </strong>
          <br>
          ${escapeHTML(
            orientation
          )}
        </div>

      </div>

      ${segmentsHTML}

      <div class="webcomic-analysis-messages">
        ${renderAnalysisMessages(
          analysis
        )}
      </div>

      <div class="webcomic-analysis-note">
        ℹ️ Aucune modification, compression,
        découpe ou déformation n'est appliquée
        automatiquement à l'image originale.
      </div>
    `;
  } catch (error) {
    console.error(error);

    analysisContainer.innerHTML = `
      <div class="webcomic-analysis-error">
        ❌ ${escapeHTML(
          error.message
        )}
      </div>
    `;
  }
}

if (addWebcomicPageBtn) {
  addWebcomicPageBtn.addEventListener(
    "click",
    () => {
      if (
        !selectedSeries ||
        !isWebcomicSeries(
          selectedSeries
        )
      ) {
        return;
      }

      const page =
        createPageState({
          pageNumber:
            getNextPageNumber()
        });

      webcomicPages.push(
        page
      );

      renderWebcomicPages();
    }
  );
}

/* =========================
VALIDATION PAGES WEBCOMIC
========================= */

function validateWebcomicPages() {
  const activePages =
    webcomicPages.filter(
      (page) =>
        !page.removed
    );

  if (
    activePages.length === 0
  ) {
    return {
      valid: false,
      message:
        "❌ Ajoute au moins une page au chapitre."
    };
  }

  for (
    const page of activePages
  ) {
    if (
      !page.existing &&
      !page.file
    ) {
      return {
        valid: false,
        message:
          "❌ Chaque page doit posséder une image."
      };
    }

    if (page.file) {
      if (
        !isAllowedImage(
          page.file
        )
      ) {
        return {
          valid: false,
          message:
            "❌ Une page utilise un format non autorisé. Utilise JPEG, PNG ou WebP."
        };
      }

      if (
        page.file.size >
        10 * 1024 * 1024
      ) {
        return {
          valid: false,
          message:
            "❌ Une page dépasse la limite de 10 Mo."
        };
      }
    }
  }

  return {
    valid: true,
    pages: activePages
  };
}

/* =========================
UPLOAD PAGE WEBCOMIC
========================= */

async function uploadWebcomicPage(
  page,
  chapterId,
  pageNumber
) {
  if (
    !page.file
  ) {
    return page.imageUrl ||
      null;
  }

  const extension =
    getFileExtension(
      page.file
    ) || "jpg";

  const filePath =
    `${selectedSeries.id}/${chapterId}/page-${String(
      pageNumber
    ).padStart(
      3,
      "0"
    )}-${Date.now()}.${extension}`;

  const {
    error: uploadError
  } = await supabase.storage
    .from("chapter-images")
    .upload(
      filePath,
      page.file,
      {
        upsert: false
      }
    );

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: publicUrlData
  } = supabase.storage
    .from("chapter-images")
    .getPublicUrl(
      filePath
    );

  return (
    publicUrlData?.publicUrl ||
    null
  );
}

/* =========================
SAUVEGARDE PAGES WEBCOMIC
========================= */

async function saveWebcomicPages(
  chapterId
) {
  const validation =
    validateWebcomicPages();

  if (!validation.valid) {
    throw new Error(
      validation.message.replace(
        /^❌\s*/,
        ""
      )
    );
  }

  const pages =
    validation.pages;

  /*
  On récupère les lignes existantes
  afin de gérer les suppressions.
  */
  const {
    data: existingRows,
    error: existingError
  } = await supabase
    .from("chapter_pages")
    .select(`
      id,
      page_number,
      image_url
    `)
    .eq(
      "chapter_id",
      chapterId
    )
    .order(
      "page_number",
      {
        ascending: true
      }
    );

  if (existingError) {
    throw existingError;
  }

  const activeIds =
    pages
      .map(
        (page) => page.id
      )
      .filter(Boolean);

  /*
  Suppression des anciennes lignes
  retirées du formulaire.
  */
  const idsToDelete =
    (existingRows || [])
      .filter(
        (row) =>
          !activeIds.includes(
            row.id
          )
      )
      .map(
        (row) => row.id
      );

  if (
    idsToDelete.length > 0
  ) {
    const {
      error: deleteError
    } = await supabase
      .from("chapter_pages")
      .delete()
      .in(
        "id",
        idsToDelete
      );

    if (deleteError) {
      throw deleteError;
    }
  }

  /*
  On trie les pages selon
  leur ordre actuel.
  */
  pages.sort(
    (a, b) =>
      Number(a.pageNumber) -
      Number(b.pageNumber)
  );

  let firstImageUrl =
    null;

  /*
  Pour éviter les doublons de page_number,
  on utilise un nouvel ordre séquentiel.
  */
  for (
    let index = 0;
    index < pages.length;
    index++
  ) {
    const page =
      pages[index];

    const pageNumber =
      index + 1;

    chapterStatusMsg.textContent =
      `⏳ Traitement de la page ${pageNumber}/${pages.length}...`;

    let imageUrl =
      page.imageUrl ||
      null;

    if (page.file) {
      imageUrl =
        await uploadWebcomicPage(
          page,
          chapterId,
          pageNumber
        );
    }

    if (!imageUrl) {
      throw new Error(
        `Impossible de déterminer l'image de la page ${pageNumber}.`
      );
    }

    if (!firstImageUrl) {
      firstImageUrl =
        imageUrl;
    }

    if (page.id) {
      const {
        error: updateError
      } = await supabase
        .from("chapter_pages")
        .update({
          page_number:
            pageNumber,
          image_url:
            imageUrl
        })
        .eq(
          "id",
          page.id
        )
        .eq(
          "chapter_id",
          chapterId
        );

      if (updateError) {
        throw updateError;
      }
    } else {
      const {
        error: insertError
      } = await supabase
        .from("chapter_pages")
        .insert({
          chapter_id:
            chapterId,
          page_number:
            pageNumber,
          image_url:
            imageUrl
        });

      if (insertError) {
        throw insertError;
      }
    }
  }

  /*
  chapter_image_url reste renseignée
  avec la première page.

  Cela permet de conserver les cartes,
  miniatures et anciens composants
  du site compatibles.
  */
  if (firstImageUrl) {
    const {
      error
    } = await supabase
      .from("chapters")
      .update({
        chapter_image_url:
          firstImageUrl
      })
      .eq(
        "id",
        chapterId
      );

    if (error) {
      throw error;
    }
  }

  return firstImageUrl;
}

/* =========================
CHARGEMENT PAGES WEBCOMIC
========================= */

async function loadWebcomicPages(
  chapterId
) {
  const {
    data,
    error
  } = await supabase
    .from("chapter_pages")
    .select(`
      id,
      chapter_id,
      page_number,
      image_url,
      created_at
    `)
    .eq(
      "chapter_id",
      chapterId
    )
    .order(
      "page_number",
      {
        ascending: true
      }
    );

  if (error) {
    throw error;
  }

  webcomicPages =
    (data || []).map(
      (page) =>
        createPageState({
          id: page.id,
          pageNumber:
            page.page_number,
          imageUrl:
            page.image_url,
          existing: true
        })
    );

  renderWebcomicPages();
}

/* =========================
NAVIGATION
========================= */

function showPage(pageName) {
  document
    .querySelectorAll(".page")
    .forEach((page) => {
      page.classList.remove(
        "active"
      );
    });

  const target =
    $(`page-${pageName}`);

  if (target) {
    target.classList.add(
      "active"
    );
  }

  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.page ===
          pageName
      );
    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function resetSeriesCreateForm() {
  editingSeriesId = null;
  editingSeriesCoverUrl = null;

  if (addSeriesForm) {
    addSeriesForm.reset();
  }

  const coverInput =
    $("seriesCover");

  if (coverInput) {
    coverInput.required =
      true;
  }

  updateSeriesFormatUI(
    seriesType?.value ||
      "webcomic",
    ""
  );

  if (seriesSubmitBtn) {
    seriesSubmitBtn.textContent =
      "Publier l'œuvre";

    seriesSubmitBtn.disabled =
      false;
  }

  if (seriesStatusMsg) {
    seriesStatusMsg.className =
      "status";

    seriesStatusMsg.textContent =
      "";
  }
}

function resetSeriesEdit() {
  editingSeriesId = null;
  editingSeriesCoverUrl = null;

  if (editSeriesForm) {
    editSeriesForm.reset();
  }

  updateEditSeriesFormatUI(
    editSeriesType?.value ||
      "webcomic",
    ""
  );

  if (editSeriesSubmitBtn) {
    editSeriesSubmitBtn.textContent =
      "Enregistrer les modifications";

    editSeriesSubmitBtn.disabled =
      false;
  }

  if (editSeriesStatusMsg) {
    editSeriesStatusMsg.className =
      "status";

    editSeriesStatusMsg.textContent =
      "";
  }
}

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "[data-page]"
      );

    if (!button) {
      return;
    }

    const page =
      button.dataset.page;

    if (
      page === "new-series"
    ) {
      resetSeriesCreateForm();
    }

    showPage(page);

    if (page === "series") {
      await loadSeries();
    }

    if (page === "sounds") {
      await loadSounds();
    }

    if (page === "carousel") {
      await loadCarousel();
    }
  }
);

/* =========================
AUTH
========================= */

function showAdmin(user) {
  currentUser = user;

  loginSection.classList.add(
    "hidden"
  );

  adminSection.classList.remove(
    "hidden"
  );

  console.log(
    "Connecté :",
    user.email
  );

  loadDashboard();
  loadSeries();
  loadSounds();
  loadCarousel();
}

function showLogin() {
  currentUser = null;

  selectedSeries = null;

  editingSeriesId = null;
  editingSeriesCoverUrl =
    null;

  editingChapterId = null;
  editingChapterImageUrl =
    null;

  clearWebcomicPages();

  loginSection.classList.remove(
    "hidden"
  );

  adminSection.classList.add(
    "hidden"
  );
}

async function checkSession() {
  const {
    data,
    error
  } = await supabase.auth.getSession();

  if (error) {
    console.error(
      "Erreur session :",
      error
    );

    showLogin();

    return;
  }

  if (data.session) {
    showAdmin(
      data.session.user
    );
  } else {
    showLogin();
  }
}

loginForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    loginError.className =
      "info";

    loginError.textContent =
      "⏳ Connexion...";

    const email =
      $("loginEmail")
        .value
        .trim();

    const password =
      $("loginPassword")
        .value;

    if (
      !email ||
      !password
    ) {
      loginError.className =
        "error";

      loginError.textContent =
        "❌ Remplis tous les champs.";

      return;
    }

    const {
      data,
      error
    } =
      await supabase.auth.signInWithPassword(
        {
          email,
          password
        }
      );

    if (error) {
      console.error(error);

      loginError.className =
        "error";

      loginError.textContent =
        "❌ " +
        error.message;

      return;
    }

    loginError.className =
      "success";

    loginError.textContent =
      "✅ Connexion réussie !";

    showAdmin(
      data.user
    );
  }
);

logoutBtn.addEventListener(
  "click",
  async () => {
    await supabase.auth.signOut();

    selectedSeries = null;

    editingSeriesId = null;
    editingSeriesCoverUrl =
      null;

    editingChapterId = null;
    editingChapterImageUrl =
      null;

    clearWebcomicPages();

    showLogin();
  }
);

/* =========================
DASHBOARD
========================= */

async function loadDashboard() {
  try {
    const [
      seriesResult,
      chaptersResult,
      soundsResult
    ] = await Promise.all([
      supabase
        .from("series")
        .select("id", {
          count: "exact",
          head: true
        }),

      supabase
        .from("chapters")
        .select("id", {
          count: "exact",
          head: true
        }),

      supabase.storage
        .from("sounds")
        .list("", {
          limit: 1000
        })
    ]);

    if (seriesCount) {
      seriesCount.textContent =
        seriesResult.count ??
        0;
    }

    if (chaptersCount) {
      chaptersCount.textContent =
        chaptersResult.count ??
        0;
    }

    if (soundsCount) {
      if (
        soundsResult.error
      ) {
        soundsCount.textContent =
          "0";
      } else {
        soundsCount.textContent =
          soundsResult.data
            ?.length ??
          0;
      }
    }
  } catch (error) {
    console.error(
      "Erreur dashboard :",
      error
    );
  }
}

/* =========================
SERIES
========================= */

async function loadSeries() {
  if (!seriesList) {
    return;
  }

  seriesList.innerHTML =
    "Chargement...";

  const {
    data,
    error
  } = await supabase
    .from("series")
    .select(`
      id,
      title,
      slug,
      type,
      format,
      genre,
      description,
      cover_url,
      status,
      author_id,
      created_at
    `)
    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (error) {
    console.error(error);

    seriesList.innerHTML = `
      <div class="item">
        <p class="error">
          Erreur :
          ${escapeHTML(
            error.message
          )}
        </p>
      </div>
    `;

    return;
  }

  if (
    !data ||
    data.length === 0
  ) {
    seriesList.innerHTML = `
      <div class="item">
        Aucune œuvre pour le moment.
      </div>
    `;

    return;
  }

  seriesList.innerHTML =
    data
      .map((series) => {
        const formatLabel =
          series.type ===
          "webcomic"
            ? series.format ===
              "manga"
              ? "Manga"
              : series.format ===
                "webtoon"
                ? "Webtoon"
                : "Format non défini"
            : "—";

        return `
          <div class="item">

            <div class="item-main">

              ${
                series.cover_url
                  ? `
                    <img
                      class="cover"
                      src="${escapeAttribute(
                        series.cover_url
                      )}"
                      alt="${escapeAttribute(
                        series.title
                      )}"
                    >
                  `
                  : `
                    <div class="cover"></div>
                  `
              }

              <div class="item-info">

                <div class="item-title">
                  ${escapeHTML(
                    series.title
                  )}
                </div>

                <div class="item-meta">

                  Type :
                  ${escapeHTML(
                    series.type ||
                      "—"
                  )}
                  <br>

                  Format :
                  ${escapeHTML(
                    formatLabel
                  )}
                  <br>

                  Genre :
                  ${escapeHTML(
                    series.genre ||
                      "—"
                  )}
                  <br>

                  Statut :
                  ${escapeHTML(
                    series.status ||
                      "—"
                  )}
                  <br>

                  Slug :
                  ${escapeHTML(
                    series.slug ||
                      "—"
                  )}

                </div>

              </div>

            </div>

            <div class="item-actions">

              <button
                type="button"
                data-open-series="${escapeAttribute(
                  series.id
                )}"
              >
                📖 Chapitres
              </button>

              <button
                type="button"
                class="secondary"
                data-edit-series="${escapeAttribute(
                  series.id
                )}"
              >
                ✏️ Modifier
              </button>

              <button
                type="button"
                class="danger"
                data-delete-series="${escapeAttribute(
                  series.id
                )}"
              >
                🗑️ Supprimer
              </button>

            </div>

          </div>
        `;
      })
      .join("");
}

/* =========================
OUVRIR UNE OEUVRE
========================= */

async function openSeries(
  seriesId
) {
  const {
    data,
    error
  } = await supabase
    .from("series")
    .select("*")
    .eq(
      "id",
      seriesId
    )
    .single();

  if (error) {
    console.error(error);

    alert(
      "Impossible de charger l'œuvre : " +
        error.message
    );

    return;
  }

  selectedSeries = data;

  selectedSeriesTitle.textContent =
    data.title || "—";

  const description =
    $("chapterSeriesDescription");

  if (description) {
    description.textContent =
      data.description ||
      "Gestion des chapitres.";
  }

  const newChapterSeriesTitle =
    $("newChapterSeriesTitle");

  if (
    newChapterSeriesTitle
  ) {
    newChapterSeriesTitle.textContent =
      data.title || "—";
  }

  clearWebcomicPages();

  updateChapterEditorUI();

  showPage("chapters");

  await loadChapters();
}

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "[data-open-series]"
      );

    if (!button) {
      return;
    }

    await openSeries(
      button.dataset
        .openSeries
    );
  }
);

/* =========================
MODIFIER UNE OEUVRE
========================= */

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "[data-edit-series]"
      );

    if (!button) {
      return;
    }

    const seriesId =
      button.dataset
        .editSeries;

    if (!seriesId) {
      return;
    }

    if (
      editSeriesStatusMsg
    ) {
      editSeriesStatusMsg.className =
        "status info";

      editSeriesStatusMsg.textContent =
        "⏳ Chargement de l'œuvre...";
    }

    const {
      data: series,
      error
    } = await supabase
      .from("series")
      .select(`
        id,
        title,
        slug,
        type,
        format,
        genre,
        description,
        cover_url,
        status,
        author_id
      `)
      .eq(
        "id",
        seriesId
      )
      .single();

    if (error) {
      console.error(error);

      if (
        editSeriesStatusMsg
      ) {
        editSeriesStatusMsg.className =
          "status error";

        editSeriesStatusMsg.textContent =
          "❌ Impossible de charger l'œuvre : " +
          error.message;
      }

      return;
    }

    editingSeriesId =
      series.id;

    editingSeriesCoverUrl =
      series.cover_url ||
      null;

    editSeriesTitle.value =
      series.title || "";

    editSeriesType.value =
      series.type ||
      "webcomic";

    updateEditSeriesFormatUI(
      series.type ||
        "webcomic",
      series.format ||
        ""
    );

    editSeriesGenre.value =
      series.genre || "";

    editSeriesStatus.value =
      series.status ||
      "ongoing";

    editSeriesDescription.value =
      series.description ||
      "";

    editSeriesCover.value =
      "";

    editSeriesSubmitBtn.textContent =
      "Enregistrer les modifications";

    editSeriesSubmitBtn.disabled =
      false;

    editSeriesStatusMsg.className =
      "status info";

    editSeriesStatusMsg.textContent =
      "✏️ Modification de l'œuvre.";

    showPage(
      "edit-series"
    );
  }
);

/* =========================
ENREGISTRER MODIFICATION OEUVRE
========================= */

if (editSeriesForm) {
  editSeriesForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!currentUser) {
        alert(
          "Tu dois être connecté."
        );

        return;
      }

      if (
        !editingSeriesId
      ) {
        editSeriesStatusMsg.className =
          "status error";

        editSeriesStatusMsg.textContent =
          "❌ Aucune œuvre n'est en cours de modification.";

        return;
      }

      const title =
        editSeriesTitle.value.trim();

      const type =
        editSeriesType.value;

      const format =
        editSeriesFormat?.value ||
        "";

      const genre =
        editSeriesGenre.value.trim();

      const status =
        editSeriesStatus.value;

      const description =
        editSeriesDescription.value.trim();

      const coverFile =
        editSeriesCover.files[0];

      if (!title) {
        editSeriesStatusMsg.className =
          "status error";

        editSeriesStatusMsg.textContent =
          "❌ Le titre est obligatoire.";

        return;
      }

      if (!description) {
        editSeriesStatusMsg.className =
          "status error";

        editSeriesStatusMsg.textContent =
          "❌ La description est obligatoire.";

        return;
      }

      /*
      Seul Webcomic possède un format.
      Le Roman reste avec format NULL.
      */
      if (
        type === "webcomic" &&
        ![
          "manga",
          "webtoon"
        ].includes(format)
      ) {
        editSeriesStatusMsg.className =
          "status error";

        editSeriesStatusMsg.textContent =
          "❌ Choisis un format : Manga ou Webtoon.";

        return;
      }

      if (coverFile) {
        if (
          !isAllowedImage(
            coverFile
          )
        ) {
          editSeriesStatusMsg.className =
            "status error";

          editSeriesStatusMsg.textContent =
            "❌ Format d'image non autorisé.";

          return;
        }

        if (
          coverFile.size >
          10 * 1024 * 1024
        ) {
          editSeriesStatusMsg.className =
            "status error";

          editSeriesStatusMsg.textContent =
            "❌ L'image ne doit pas dépasser 10 Mo.";

          return;
        }
      }

      editSeriesSubmitBtn.disabled =
        true;

      editSeriesStatusMsg.className =
        "status info";

      editSeriesStatusMsg.textContent =
        "⏳ Enregistrement...";

      try {
        let coverUrl =
          editingSeriesCoverUrl;

        if (coverFile) {
          const extension =
            getFileExtension(
              coverFile
            );

          const slug =
            createSlug(title);

          const filePath =
            `${slug}-${Date.now()}.${extension}`;

          editSeriesStatusMsg.textContent =
            "⏳ Envoi de la nouvelle couverture...";

          const {
            error: uploadError
          } = await supabase.storage
            .from(
              "Cover series"
            )
            .upload(
              filePath,
              coverFile,
              {
                upsert: false
              }
            );

          if (uploadError) {
            throw uploadError;
          }

          const {
            data:
              publicUrlData
          } =
            supabase.storage
              .from(
                "Cover series"
              )
              .getPublicUrl(
                filePath
              );

          coverUrl =
            publicUrlData.publicUrl;
        }

        const slug =
          createSlug(title);

        editSeriesStatusMsg.textContent =
          "⏳ Mise à jour de l'œuvre...";

        const {
          data: updatedSeries,
          error: updateError
        } = await supabase
          .from("series")
          .update({
            title,
            slug,
            type,

            /*
            Roman :
            NULL

            Webcomic :
            manga/webtoon
            */
            format:
              type ===
              "webcomic"
                ? format
                : null,

            genre,
            description,
            cover_url:
              coverUrl,
            status
          })
          .eq(
            "id",
            editingSeriesId
          )
          .select("id");

        if (updateError) {
          throw updateError;
        }

        if (
          !updatedSeries ||
          updatedSeries.length ===
            0
        ) {
          throw new Error(
            "L'œuvre n'a pas été modifiée. Supabase n'a modifié aucune ligne."
          );
        }

        if (
          selectedSeries &&
          selectedSeries.id ===
            editingSeriesId
        ) {
          selectedSeries = {
            ...selectedSeries,
            title,
            slug,
            type,
            format:
              type ===
              "webcomic"
                ? format
                : null,
            genre,
            description,
            cover_url:
              coverUrl,
            status
          };

          if (
            selectedSeriesTitle
          ) {
            selectedSeriesTitle.textContent =
              title;
          }

          const descriptionElement =
            $(
              "chapterSeriesDescription"
            );

          if (
            descriptionElement
          ) {
            descriptionElement.textContent =
              description;
          }

          const newChapterSeriesTitle =
            $(
              "newChapterSeriesTitle"
            );

          if (
            newChapterSeriesTitle
          ) {
            newChapterSeriesTitle.textContent =
              title;
          }

          updateChapterEditorUI();
        }

        editSeriesStatusMsg.className =
          "status success";

        editSeriesStatusMsg.textContent =
          "✅ Œuvre modifiée avec succès !";

        editingSeriesId =
          null;

        editingSeriesCoverUrl =
          null;

        editSeriesForm.reset();

        updateEditSeriesFormatUI(
          editSeriesType?.value ||
            "webcomic",
          ""
        );

        editSeriesSubmitBtn.textContent =
          "Enregistrer les modifications";

        await loadSeries();
        await loadDashboard();

        showPage(
          "series"
        );
      } catch (error) {
        console.error(error);

        editSeriesStatusMsg.className =
          "status error";

        editSeriesStatusMsg.textContent =
          "❌ Erreur : " +
          error.message;
      } finally {
        editSeriesSubmitBtn.disabled =
          false;
      }
    }
  );
}

/* =========================
ANNULER MODIFICATION OEUVRE
========================= */

if (
  cancelEditSeriesBtn
) {
  cancelEditSeriesBtn.addEventListener(
    "click",
    () => {
      resetSeriesEdit();

      showPage(
        "series"
      );

      loadSeries();
    }
  );
}

/* =========================
SUPPRIMER UNE OEUVRE
========================= */

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "[data-delete-series]"
      );

    if (!button) {
      return;
    }

    const id =
      button.dataset
        .deleteSeries;

    if (
      !confirm(
        "Supprimer définitivement cette œuvre ?"
      )
    ) {
      return;
    }

    const {
      error
    } = await supabase
      .from("series")
      .delete()
      .eq(
        "id",
        id
      );

    if (error) {
      console.error(error);

      alert(
        "Erreur : " +
          error.message
      );

      return;
    }

    if (
      selectedSeries &&
      selectedSeries.id ===
        id
    ) {
      selectedSeries = null;
    }

    await loadSeries();
    await loadDashboard();
  }
);

/* =========================
CREER UNE OEUVRE
========================= */

addSeriesForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!currentUser) {
      alert(
        "Tu dois être connecté."
      );

      return;
    }

    const title =
      $("seriesTitle")
        .value
        .trim();

    const type =
      $("seriesType")
        .value;

    const format =
      $("seriesFormat")
        ?.value || "";

    const genre =
      $("seriesGenre")
        .value
        .trim();

    const status =
      $("seriesStatus")
        .value;

    const description =
      $("seriesDescription")
        .value
        .trim();

    const coverFile =
      $("seriesCover")
        .files[0];

    if (
      !title ||
      !description ||
      !coverFile
    ) {
      seriesStatusMsg.className =
        "status error";

      seriesStatusMsg.textContent =
        "❌ Remplis tous les champs obligatoires.";

      return;
    }

    if (
      type ===
        "webcomic" &&
      ![
        "manga",
        "webtoon"
      ].includes(format)
    ) {
      seriesStatusMsg.className =
        "status error";

      seriesStatusMsg.textContent =
        "❌ Choisis un format : Manga ou Webtoon.";

      return;
    }

    if (
      type === "novel" &&
      format
    ) {
      seriesStatusMsg.className =
        "status error";

      seriesStatusMsg.textContent =
        "❌ Le format ne doit pas être défini pour un Roman.";

      return;
    }

    if (
      !isAllowedImage(
        coverFile
      )
    ) {
      seriesStatusMsg.className =
        "status error";

      seriesStatusMsg.textContent =
        "❌ Format d'image non autorisé.";

      return;
    }

    if (
      coverFile.size >
      10 * 1024 * 1024
    ) {
      seriesStatusMsg.className =
        "status error";

      seriesStatusMsg.textContent =
        "❌ L'image ne doit pas dépasser 10 Mo.";

      return;
    }

    seriesSubmitBtn.disabled =
      true;

    seriesStatusMsg.className =
      "status info";

    seriesStatusMsg.textContent =
      "⏳ Envoi de la couverture...";

    try {
      const extension =
        getFileExtension(
          coverFile
        );

      const slug =
        createSlug(title);

      const filePath =
        `${slug}-${Date.now()}.${extension}`;

      const {
        error: uploadError
      } = await supabase.storage
        .from(
          "Cover series"
        )
        .upload(
          filePath,
          coverFile,
          {
            upsert: false
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data:
          publicUrlData
      } =
        supabase.storage
          .from(
            "Cover series"
          )
          .getPublicUrl(
            filePath
          );

      const coverUrl =
        publicUrlData.publicUrl;

      seriesStatusMsg.textContent =
        "⏳ Création de l'œuvre...";

      const {
        error: insertError
      } = await supabase
        .from("series")
        .insert({
          title,
          slug,
          type,

          /*
          Roman :
          NULL

          Webcomic :
          manga/webtoon
          */
          format:
            type ===
            "webcomic"
              ? format
              : null,

          description,
          cover_url:
            coverUrl,
          status,
          author_id:
            currentUser.id,
          genre
        });

      if (insertError) {
        throw insertError;
      }

      seriesStatusMsg.className =
        "status success";

      seriesStatusMsg.textContent =
        "✅ Œuvre publiée avec succès !";

      addSeriesForm.reset();

      updateSeriesFormatUI(
        $("seriesType")
          ?.value ||
          "webcomic",
        ""
      );

      await loadSeries();
      await loadDashboard();
    } catch (error) {
      console.error(error);

      seriesStatusMsg.className =
        "status error";

      seriesStatusMsg.textContent =
        "❌ Erreur : " +
        error.message;
    }

    seriesSubmitBtn.disabled =
      false;
  }
);

/* =========================
CHAPITRES
========================= */

async function loadChapters() {
  if (!selectedSeries) {
    chaptersList.innerHTML = `
      <div class="item">
        Aucune œuvre sélectionnée.
      </div>
    `;

    return;
  }

  chaptersList.innerHTML =
    "Chargement...";

  const {
    data,
    error
  } = await supabase
    .from("chapters")
    .select(`
      id,
      series_id,
      chapter_number,
      chapter_label,
      title,
      content,
      chapter_image_url,
      published_at,
      views,
      sound_url,
      created_at
    `)
    .eq(
      "series_id",
      selectedSeries.id
    )
    .order(
      "chapter_number",
      {
        ascending: true
      }
    );

  if (error) {
    console.error(error);

    chaptersList.innerHTML = `
      <div class="item">
        <p class="error">
          Erreur :
          ${escapeHTML(
            error.message
          )}
        </p>
      </div>
    `;

    return;
  }

  if (
    !data ||
    data.length === 0
  ) {
    chaptersList.innerHTML = `
      <div class="item">
        Aucun chapitre pour cette œuvre.
      </div>
    `;

    return;
  }

  chaptersList.innerHTML =
    data
      .map((chapter) => {
        const displayLabel =
          formatChapterLabel(
            chapter.chapter_label ??
              chapter.chapter_number
          );

        const published =
          chapter.published_at
            ? new Date(
                chapter.published_at
              ).toLocaleString(
                "fr-FR"
              )
            : "Non publié";

        return `
          <div class="item">

            <div class="item-main">

              ${
                chapter.chapter_image_url
                  ? `
                    <img
                      class="cover"
                      src="${escapeAttribute(
                        chapter.chapter_image_url
                      )}"
                      alt="${escapeAttribute(
                        chapter.title ||
                          displayLabel
                      )}"
                    >
                  `
                  : `
                    <div class="cover"></div>
                  `
              }

              <div class="item-info">

                <div class="item-title">
                  ${escapeHTML(
                    displayLabel
                  )}

                  ${
                    chapter.title
                      ? ` — ${escapeHTML(
                          chapter.title
                        )}`
                      : ""
                  }
                </div>

                <div class="item-meta">

                  Numéro interne :
                  ${escapeHTML(
                    chapter.chapter_number
                  )}
                  <br>

                  Publication :
                  ${escapeHTML(
                    published
                  )}
                  <br>

                  Vues :
                  ${escapeHTML(
                    chapter.views ??
                      0
                  )}
                  <br>

                  ${
                    chapter.sound_url
                      ? "🎵 Son associé"
                      : "🔇 Aucun son"
                  }

                </div>

              </div>

            </div>

            <div class="item-actions">

              <button
                type="button"
                class="secondary"
                data-edit-chapter="${escapeAttribute(
                  chapter.id
                )}"
              >
                ✏️ Modifier
              </button>

              <button
                type="button"
                class="danger"
                data-delete-chapter="${escapeAttribute(
                  chapter.id
                )}"
              >
                🗑️ Supprimer
              </button>

            </div>

          </div>
        `;
      })
      .join("");
}

/* =========================
NOUVEAU CHAPITRE
========================= */

newChapterBtn.addEventListener(
  "click",
  async () => {
    if (editingChapterId) {
      editingChapterId =
        null;

      editingChapterImageUrl =
        null;

      addChapterForm.reset();

      clearWebcomicPages();

      if (chapterImage) {
        chapterImage.required =
          !isWebcomicSeries(
            selectedSeries
          );
      }

      chapterSubmitBtn.textContent =
        "Publier le chapitre";

      newChapterBtn.textContent =
        "➕ Nouveau chapitre";

      chapterStatusMsg.className =
        "status";

      chapterStatusMsg.textContent =
        "";

      if (
        selectedSeries
      ) {
        $(
          "newChapterSeriesTitle"
        ).textContent =
          selectedSeries.title;
      }

      updateChapterEditorUI();

      showPage(
        "chapters"
      );

      return;
    }

    if (!selectedSeries) {
      alert(
        "Sélectionne d'abord une œuvre."
      );

      return;
    }

    editingChapterId =
      null;

    editingChapterImageUrl =
      null;

    addChapterForm.reset();

    clearWebcomicPages();

    chapterSubmitBtn.textContent =
      "Publier le chapitre";

    newChapterBtn.textContent =
      "➕ Nouveau chapitre";

    chapterStatusMsg.className =
      "status";

    chapterStatusMsg.textContent =
      "";

    $(
      "newChapterSeriesTitle"
    ).textContent =
      selectedSeries.title;

    await loadSoundOptions();

    updateChapterEditorUI();

    /*
    Pour un nouveau Webcomic,
    on ajoute automatiquement
    la première page afin que
    l'administrateur puisse commencer.
    */
    if (
      isWebcomicSeries(
        selectedSeries
      )
    ) {
      webcomicPages.push(
        createPageState({
          pageNumber: 1
        })
      );

      renderWebcomicPages();
    }

    showPage(
      "new-chapter"
    );
  }
);

/* =========================
MODIFIER UN CHAPITRE
========================= */

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "[data-edit-chapter]"
      );

    if (!button) {
      return;
    }

    const chapterId =
      button.dataset
        .editChapter;

    if (!selectedSeries) {
      alert(
        "Aucune œuvre sélectionnée."
      );

      return;
    }

    chapterStatusMsg.className =
      "status info";

    chapterStatusMsg.textContent =
      "⏳ Chargement du chapitre...";

    const {
      data: chapter,
      error
    } = await supabase
      .from("chapters")
      .select(`
        id,
        series_id,
        chapter_number,
        chapter_label,
        title,
        content,
        chapter_image_url,
        sound_url,
        published_at,
        views
      `)
      .eq(
        "id",
        chapterId
      )
      .single();

    if (error) {
      console.error(error);

      alert(
        "Impossible de charger le chapitre : " +
          error.message
      );

      return;
    }

    editingChapterId =
      chapter.id;

    editingChapterImageUrl =
      chapter.chapter_image_url ||
      null;

    $("chapterNumber").value =
      chapter.chapter_number ??
      "";

    $("chapterLabel").value =
      chapter.chapter_label ??
      "";

    $("chapterTitle").value =
      chapter.title ?? "";

    $("chapterContent").value =
      chapter.content ?? "";

    await loadSoundOptions();

    $("chapterSound").value =
      chapter.sound_url ||
      "";

    /*
    Roman :
    ancienne logique.

    Webcomic :
    les pages viennent de chapter_pages.
    */
    if (
      isWebcomicSeries(
        selectedSeries
      )
    ) {
      clearWebcomicPages();

      try {
        await loadWebcomicPages(
          chapter.id
        );
      } catch (pageError) {
        console.error(
          pageError
        );

        chapterStatusMsg.className =
          "status error";

        chapterStatusMsg.textContent =
          "❌ Impossible de charger les pages : " +
          pageError.message;

        return;
      }
    }

    chapterImage.required =
      false;

    chapterSubmitBtn.textContent =
      "Enregistrer les modifications";

    newChapterBtn.textContent =
      "↩️ Annuler la modification";

    chapterStatusMsg.className =
      "status info";

    chapterStatusMsg.textContent =
      "✏️ Modification du chapitre.";

    $(
      "newChapterSeriesTitle"
    ).textContent =
      selectedSeries.title;

    updateChapterEditorUI();

    showPage(
      "new-chapter"
    );
  }
);

/* =========================
CREER / MODIFIER CHAPITRE
========================= */

addChapterForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!selectedSeries) {
      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ Aucune œuvre sélectionnée.";

      return;
    }

    const isWebcomic =
      isWebcomicSeries(
        selectedSeries
      );

    const webcomicFormat =
      getWebcomicFormat(
        selectedSeries
      );

    const chapterNumber =
      Number(
        $("chapterNumber")
          .value
      );

    const chapterLabel =
      $("chapterLabel")
        .value
        .trim();

    const title =
      $("chapterTitle")
        .value
        .trim();

    const content =
      $("chapterContent")
        .value
        .trim();

    const imageFile =
      $("chapterImage")
        .files[0];

    const soundUrl =
      $("chapterSound")
        .value;

    /* =========================
    VALIDATION COMMUNE
    ========================= */

    if (
      !chapterNumber ||
      chapterNumber < 1
    ) {
      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ Le numéro interne est invalide.";

      return;
    }

    if (!chapterLabel) {
      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ Le numéro / libellé affiché est obligatoire.";

      return;
    }

    if (!title) {
      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ Le titre est obligatoire.";

      return;
    }

    /* =========================
    VALIDATION WEBCOMIC
    ========================= */

    if (isWebcomic) {
      if (
        ![
          "manga",
          "webtoon"
        ].includes(
          webcomicFormat
        )
      ) {
        chapterStatusMsg.className =
          "status error";

        chapterStatusMsg.textContent =
          "❌ Le format de cette œuvre Webcomic est invalide. Choisis Manga ou Webtoon dans les paramètres de l'œuvre.";

        return;
      }

      const validation =
        validateWebcomicPages();

      if (!validation.valid) {
        chapterStatusMsg.className =
          "status error";

        chapterStatusMsg.textContent =
          validation.message;

        return;
      }

      /*
      Le contenu texte et l'image
      unique du chapitre ne sont
      pas utilisés pour le Webcomic.
      */
    } else {
      /* =========================
      VALIDATION ROMAN
      ========================= */

      if (!content) {
        chapterStatusMsg.className =
          "status error";

        chapterStatusMsg.textContent =
          "❌ Le contenu est obligatoire.";

        return;
      }

      if (
        !editingChapterId &&
        !imageFile
      ) {
        chapterStatusMsg.className =
          "status error";

        chapterStatusMsg.textContent =
          "❌ L'image du chapitre est obligatoire.";

        return;
      }

      if (imageFile) {
        if (
          !isAllowedImage(
            imageFile
          )
        ) {
          chapterStatusMsg.className =
            "status error";

          chapterStatusMsg.textContent =
            "❌ Format d'image non autorisé.";

          return;
        }

        if (
          imageFile.size >
          10 * 1024 * 1024
        ) {
          chapterStatusMsg.className =
            "status error";

          chapterStatusMsg.textContent =
            "❌ L'image ne doit pas dépasser 10 Mo.";

          return;
        }
      }
    }

    chapterSubmitBtn.disabled =
      true;

    chapterStatusMsg.className =
      "status info";

    chapterStatusMsg.textContent =
      "⏳ Enregistrement...";

    try {
      /* =========================
      MODIFICATION
      ========================= */

      if (editingChapterId) {
        /*
        =========================
        MODIFICATION WEBCOMIC
        =========================
        */

        if (isWebcomic) {
          chapterStatusMsg.textContent =
            "⏳ Mise à jour des informations du chapitre...";

          const {
            data:
              updatedChapter,
            error:
              updateError
          } = await supabase
            .from("chapters")
            .update({
              chapter_number:
                chapterNumber,

              chapter_label:
                chapterLabel,

              title,

              /*
              Un Webcomic n'utilise
              pas le contenu texte.
              */
              content:
                null,

              sound_url:
                soundUrl ||
                null
            })
            .eq(
              "id",
              editingChapterId
            )
            .select("id");

          if (updateError) {
            throw updateError;
          }

          if (
            !updatedChapter ||
            updatedChapter.length ===
              0
          ) {
            throw new Error(
              "Le chapitre n'a pas été modifié. Supabase n'a modifié aucune ligne."
            );
          }

          await saveWebcomicPages(
            editingChapterId
          );

          chapterStatusMsg.className =
            "status success";

          chapterStatusMsg.textContent =
            "✅ Chapitre Webcomic modifié avec succès !";

          editingChapterId =
            null;

          editingChapterImageUrl =
            null;

          clearWebcomicPages();

          addChapterForm.reset();

          chapterSubmitBtn.textContent =
            "Publier le chapitre";

          newChapterBtn.textContent =
            "➕ Nouveau chapitre";

          updateChapterEditorUI();

          await loadChapters();
          await loadDashboard();

          chapterSubmitBtn.disabled =
            false;

          showPage(
            "chapters"
          );

          return;
        }

        /*
        =========================
        MODIFICATION ROMAN
        =========================
        */

        let chapterImageUrl =
          editingChapterImageUrl;

        if (imageFile) {
          const extension =
            getFileExtension(
              imageFile
            );

          const filePath =
            `${selectedSeries.id}/${editingChapterId}-${Date.now()}.${extension}`;

          chapterStatusMsg.textContent =
            "⏳ Envoi de la nouvelle image...";

          const {
            error:
              uploadError
          } =
            await supabase.storage
              .from(
                "chapter-images"
              )
              .upload(
                filePath,
                imageFile,
                {
                  upsert: false
                }
              );

          if (uploadError) {
            throw uploadError;
          }

          const {
            data:
              publicUrlData
          } =
            supabase.storage
              .from(
                "chapter-images"
              )
              .getPublicUrl(
                filePath
              );

          chapterImageUrl =
            publicUrlData.publicUrl;
        }

        chapterStatusMsg.textContent =
          "⏳ Mise à jour du chapitre...";

        const {
          data:
            updatedChapter,
          error:
            updateError
        } = await supabase
          .from("chapters")
          .update({
            chapter_number:
              chapterNumber,

            chapter_label:
              chapterLabel,

            title,

            content,

            chapter_image_url:
              chapterImageUrl,

            sound_url:
              soundUrl ||
              null
          })
          .eq(
            "id",
            editingChapterId
          )
          .select("id");

        if (updateError) {
          throw updateError;
        }

        if (
          !updatedChapter ||
          updatedChapter.length ===
            0
        ) {
          throw new Error(
            "Le chapitre n'a pas été modifié. Supabase n'a modifié aucune ligne."
          );
        }

        chapterStatusMsg.className =
          "status success";

        chapterStatusMsg.textContent =
          "✅ Chapitre modifié avec succès !";

        editingChapterId =
          null;

        editingChapterImageUrl =
          null;

        addChapterForm.reset();

        chapterImage.required =
          true;

        chapterSubmitBtn.textContent =
          "Publier le chapitre";

        newChapterBtn.textContent =
          "➕ Nouveau chapitre";

        await loadChapters();
        await loadDashboard();

        chapterSubmitBtn.disabled =
          false;

        showPage(
          "chapters"
        );

        return;
      }

      /* =========================
      CREATION WEBCOMIC
      ========================= */

      if (isWebcomic) {
        chapterStatusMsg.textContent =
          "⏳ Création du chapitre Webcomic...";

        /*
        Le chapitre est créé avant
        les pages afin de récupérer
        son UUID.
        */
        const {
          data:
            newChapter,
          error:
            insertError
        } = await supabase
          .from("chapters")
          .insert({
            series_id:
              selectedSeries.id,

            chapter_number:
              chapterNumber,

            chapter_label:
              chapterLabel,

            title,

            content:
              null,

            chapter_image_url:
              null,

            sound_url:
              soundUrl ||
              null,

            published_at:
              new Date().toISOString(),

            views: 0
          })
          .select("id")
          .single();

        if (insertError) {
          throw insertError;
        }

        if (
          !newChapter ||
          !newChapter.id
        ) {
          throw new Error(
            "Le chapitre a été créé mais son identifiant n'a pas été retourné."
          );
        }

        try {
          await saveWebcomicPages(
            newChapter.id
          );
        } catch (pageError) {
          /*
          Si la création des pages échoue,
          on tente de supprimer le chapitre
          afin d'éviter un chapitre vide.
          */
          await supabase
            .from("chapters")
            .delete()
            .eq(
              "id",
              newChapter.id
            );

          throw pageError;
        }

        chapterStatusMsg.className =
          "status success";

        chapterStatusMsg.textContent =
          "✅ Chapitre Webcomic publié avec succès !";

        addChapterForm.reset();

        editingChapterId =
          null;

        editingChapterImageUrl =
          null;

        clearWebcomicPages();

        chapterSubmitBtn.textContent =
          "Publier le chapitre";

        newChapterBtn.textContent =
          "➕ Nouveau chapitre";

        updateChapterEditorUI();

        await loadChapters();
        await loadDashboard();

        chapterSubmitBtn.disabled =
          false;

        showPage(
          "chapters"
        );

        return;
      }

      /* =========================
      CREATION ROMAN
      ========================= */

      let chapterImageUrl =
        null;

      if (imageFile) {
        const extension =
          getFileExtension(
            imageFile
          );

        const filePath =
          `${selectedSeries.id}/${Date.now()}-${createSlug(
            title
          )}.${extension}`;

        chapterStatusMsg.textContent =
          "⏳ Envoi de l'image...";

        const {
          error:
            uploadError
        } =
          await supabase.storage
            .from(
              "chapter-images"
            )
            .upload(
              filePath,
              imageFile,
              {
                upsert: false
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data:
            publicUrlData
        } =
          supabase.storage
            .from(
              "chapter-images"
            )
            .getPublicUrl(
              filePath
            );

        chapterImageUrl =
          publicUrlData.publicUrl;
      }

      chapterStatusMsg.textContent =
        "⏳ Publication du chapitre...";

      const {
        error: insertError
      } = await supabase
        .from("chapters")
        .insert({
          series_id:
            selectedSeries.id,

          chapter_number:
            chapterNumber,

          chapter_label:
            chapterLabel,

          title,

          content,

          chapter_image_url:
            chapterImageUrl,

          sound_url:
            soundUrl ||
            null,

          published_at:
            new Date().toISOString(),

          views: 0
        });

      if (insertError) {
        throw insertError;
      }

      chapterStatusMsg.className =
        "status success";

      chapterStatusMsg.textContent =
        "✅ Chapitre publié avec succès !";

      addChapterForm.reset();

      editingChapterId =
        null;

      editingChapterImageUrl =
        null;

      chapterImage.required =
        true;

      chapterSubmitBtn.textContent =
        "Publier le chapitre";

      newChapterBtn.textContent =
        "➕ Nouveau chapitre";

      updateChapterEditorUI();

      await loadChapters();
      await loadDashboard();

      chapterSubmitBtn.disabled =
        false;

      showPage(
        "chapters"
      );
    } catch (error) {
      console.error(error);

      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ Erreur : " +
        error.message;

      chapterSubmitBtn.disabled =
        false;
    }
  }
);

/* =========================
SUPPRIMER UN CHAPITRE
========================= */

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "[data-delete-chapter]"
      );

    if (!button) {
      return;
    }

    const id =
      button.dataset
        .deleteChapter;

    if (
      !confirm(
        "Supprimer définitivement ce chapitre ?"
      )
    ) {
      return;
    }

    const {
      data:
        deletedChapter,
      error
    } = await supabase
      .from("chapters")
      .delete()
      .eq(
        "id",
        id
      )
      .select("id");

    if (error) {
      console.error(error);

      alert(
        "Erreur lors de la suppression : " +
          error.message
      );

      return;
    }

    if (
      !deletedChapter ||
      deletedChapter.length ===
        0
    ) {
      alert(
        "❌ Le chapitre n'a pas été supprimé. Supabase n'a supprimé aucune ligne."
      );

      return;
    }

    await loadChapters();
    await loadDashboard();
  }
);

/* =========================
SONS
========================= */

async function loadSounds() {
  if (!soundsList) {
    return;
  }

  soundsList.innerHTML =
    "Chargement...";

  const {
    data,
    error
  } = await supabase.storage
    .from("sounds")
    .list(
      "",
      {
        limit: 1000,
        sortBy: {
          column: "name",
          order: "asc"
        }
      }
    );

  if (error) {
    console.error(error);

    soundsList.innerHTML = `
      <div class="item">
        <p class="error">
          Erreur :
          ${escapeHTML(
            error.message
          )}
        </p>
      </div>
    `;

    return;
  }

  const files =
    (data || []).filter(
      (file) => file.name
    );

  if (
    files.length ===
    0
  ) {
    soundsList.innerHTML = `
      <div class="item">
        Aucun son pour le moment.
      </div>
    `;

    return;
  }

  soundsList.innerHTML =
    files
      .map((file) => {
        const {
          data:
            publicUrlData
        } =
          supabase.storage
            .from("sounds")
            .getPublicUrl(
              file.name
            );

        const url =
          publicUrlData.publicUrl;

        return `
          <div class="item">

            <div class="sound-row">

              <div class="sound-name">

                <strong>
                  ${escapeHTML(
                    file.name
                  )}
                </strong>

              </div>

              <audio
                controls
                src="${escapeAttribute(
                  url
                )}"
              ></audio>

              <button
                type="button"
                class="danger"
                data-delete-sound="${escapeAttribute(
                  file.name
                )}"
              >
                🗑️ Supprimer
              </button>

            </div>

          </div>
        `;
      })
      .join("");
}

async function loadSoundOptions() {
  if (!chapterSound) {
    return;
  }

  const currentValue =
    chapterSound.value;

  const {
    data,
    error
  } = await supabase.storage
    .from("sounds")
    .list(
      "",
      {
        limit: 1000,
        sortBy: {
          column: "name",
          order: "asc"
        }
      }
    );

  if (error) {
    console.error(error);

    return;
  }

  const files =
    (data || []).filter(
      (file) => file.name
    );

  chapterSound.innerHTML = `
    <option value="">
      Aucun son
    </option>
  `;

  files.forEach(
    (file) => {
      const {
        data:
          publicUrlData
      } =
        supabase.storage
          .from("sounds")
          .getPublicUrl(
            file.name
          );

      const option =
        document.createElement(
          "option"
        );

      option.value =
        publicUrlData.publicUrl;

      option.textContent =
        file.name;

      chapterSound.appendChild(
        option
      );
    }
  );

  if (currentValue) {
    chapterSound.value =
      currentValue;
  }
}

/* =========================
AJOUTER UN SON
========================= */

soundForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const file =
      $("soundFile")
        .files[0];

    if (!file) {
      soundStatusMsg.className =
        "status error";

      soundStatusMsg.textContent =
        "❌ Sélectionne un fichier audio.";

      return;
    }

    soundSubmitBtn.disabled =
      true;

    soundStatusMsg.className =
      "status info";

    soundStatusMsg.textContent =
      "⏳ Envoi du son...";

    try {
      const extension =
        getFileExtension(
          file
        );

      const baseName =
        file.name.replace(
          /\.[^/.]+$/,
          ""
        );

      const fileName =
        `${createSlug(
          baseName
        )}-${Date.now()}.${extension}`;

      const {
        error
      } = await supabase.storage
        .from("sounds")
        .upload(
          fileName,
          file,
          {
            upsert: false
          }
        );

      if (error) {
        throw error;
      }

      soundStatusMsg.className =
        "status success";

      soundStatusMsg.textContent =
        "✅ Son ajouté avec succès !";

      soundForm.reset();

      await loadSounds();
      await loadSoundOptions();
      await loadDashboard();
    } catch (error) {
      console.error(error);

      soundStatusMsg.className =
        "status error";

      soundStatusMsg.textContent =
        "❌ Erreur : " +
        error.message;
    } finally {
      soundSubmitBtn.disabled =
        false;
    }
  }
);

/* =========================
SUPPRIMER UN SON
========================= */

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "[data-delete-sound]"
      );

    if (!button) {
      return;
    }

    const fileName =
      button.dataset
        .deleteSound;

    if (
      !confirm(
        "Supprimer définitivement ce son ?"
      )
    ) {
      return;
    }

    const {
      error
    } = await supabase.storage
      .from("sounds")
      .remove([
        fileName
      ]);

    if (error) {
      console.error(error);

      alert(
        "Erreur : " +
          error.message
      );

      return;
    }

    await loadSounds();
    await loadSoundOptions();
    await loadDashboard();
  }
);

/* =========================
CARROUSEL
========================= */

async function loadCarousel() {
  if (!carouselList) {
    return;
  }

  carouselList.innerHTML =
    "Chargement...";

  const {
    data,
    error
  } = await supabase
    .from("carousel_slides")
    .select(`
      id,
      type,
      title,
      description,
      image_url,
      button_text,
      button_url,
      duration,
      display_order,
      active,
      start_at,
      end_at,
      created_at
    `)
    .order(
      "display_order",
      {
        ascending: true
      }
    )
    .order(
      "created_at",
      {
        ascending: true
      }
    );

  if (error) {
    console.error(error);

    carouselList.innerHTML = `
      <div class="item">
        <p class="error">
          Erreur :
          ${escapeHTML(
            error.message
          )}
        </p>
      </div>
    `;

    return;
  }

  if (
    !data ||
    data.length ===
      0
  ) {
    carouselList.innerHTML = `
      <div class="item">
        Aucun contenu dans le carrousel.
      </div>
    `;

    return;
  }

  carouselList.innerHTML =
    data
      .map((slide) => {
        const typeLabel =
          slide.type ===
          "evenement"
            ? "🎉 Événement"
            : "ℹ️ Information";

        const statusLabel =
          slide.active
            ? "🟢 Actif"
            : "🔴 Inactif";

        return `
          <div class="item">

            <div class="item-main">

              ${
                slide.image_url
                  ? `
                    <img
                      class="cover"
                      src="${escapeAttribute(
                        slide.image_url
                      )}"
                      alt="${escapeAttribute(
                        slide.title
                      )}"
                    >
                  `
                  : `
                    <div class="cover"></div>
                  `
              }

              <div class="item-info">

                <div class="item-title">
                  ${escapeHTML(
                    slide.title
                  )}
                </div>

                <div class="item-meta">

                  ${typeLabel}

                  <br>

                  Durée :
                  ${escapeHTML(
                    slide.duration
                  )}
                  secondes

                  <br>

                  Ordre :
                  ${escapeHTML(
                    slide.display_order
                  )}

                  <br>

                  ${statusLabel}

                  ${
                    slide.button_text
                      ? `
                        <br>
                        Bouton :
                        ${escapeHTML(
                          slide.button_text
                        )}
                      `
                      : ""
                  }

                </div>

              </div>

            </div>

            ${
              slide.description
                ? `
                  <div
                    class="item-meta"
                    style="margin-top:12px;"
                  >
                    ${escapeHTML(
                      slide.description
                    )}
                  </div>
                `
                : ""
            }

            <div class="item-actions">

              <button
                type="button"
                class="secondary"
                data-edit-carousel="${escapeAttribute(
                  slide.id
                )}"
              >
                ✏️ Modifier
              </button>

              <button
                type="button"
                class="danger"
                data-delete-carousel="${escapeAttribute(
                  slide.id
                )}"
              >
                🗑️ Supprimer
              </button>

            </div>

          </div>
        `;
      })
      .join("");
}

/* =========================
AJOUTER UN CONTENU AU CARROUSEL
========================= */

if (carouselForm) {
  carouselForm.addEventListener(
    "submit",
    async (event) => {
      if (
        carouselForm.dataset
          .editingId
      ) {
        return;
      }

      event.preventDefault();

      const type =
        $("carouselType")
          .value;

      const title =
        $("carouselTitle")
          .value
          .trim();

      const description =
        $("carouselDescription")
          .value
          .trim();

      const imageFile =
        $("carouselImage")
          .files[0];

      const buttonText =
        $("carouselButtonText")
          .value
          .trim();

      const buttonUrl =
        $("carouselButtonUrl")
          .value
          .trim();

      const duration =
        Number(
          $("carouselDuration")
            .value
        );

      const displayOrder =
        Number(
          $("carouselOrder")
            .value
        );

      const active =
        $("carouselActive")
          .value ===
        "true";

      if (!title) {
        carouselStatusMsg.className =
          "status error";

        carouselStatusMsg.textContent =
          "❌ Le titre est obligatoire.";

        return;
      }

      if (
        !duration ||
        duration < 1
      ) {
        carouselStatusMsg.className =
          "status error";

        carouselStatusMsg.textContent =
          "❌ La durée doit être supérieure à 0.";

        return;
      }

      carouselSubmitBtn.disabled =
        true;

      carouselStatusMsg.className =
        "status info";

      carouselStatusMsg.textContent =
        "⏳ Enregistrement...";

      try {
        let imageUrl =
          null;

        if (imageFile) {
          if (
            !isAllowedImage(
              imageFile
            )
          ) {
            throw new Error(
              "Format d'image non autorisé."
            );
          }

          if (
            imageFile.size >
            10 * 1024 * 1024
          ) {
            throw new Error(
              "L'image ne doit pas dépasser 10 Mo."
            );
          }

          const extension =
            getFileExtension(
              imageFile
            );

          const filePath =
            `carousel/${Date.now()}-${createSlug(
              title
            )}.${extension}`;

          carouselStatusMsg.textContent =
            "⏳ Envoi de l'image...";

          const {
            error:
              uploadError
          } =
            await supabase.storage
              .from(
                "chapter-images"
              )
              .upload(
                filePath,
                imageFile,
                {
                  upsert: false
                }
              );

          if (uploadError) {
            throw uploadError;
          }

          const {
            data:
              publicUrlData
          } =
            supabase.storage
              .from(
                "chapter-images"
              )
              .getPublicUrl(
                filePath
              );

          imageUrl =
            publicUrlData.publicUrl;
        }

        carouselStatusMsg.textContent =
          "⏳ Création du contenu...";

        const {
          error
        } = await supabase
          .from(
            "carousel_slides"
          )
          .insert({
            type,
            title,
            description:
              description ||
              null,
            image_url:
              imageUrl,
            button_text:
              buttonText ||
              null,
            button_url:
              buttonUrl ||
              null,
            duration,
            display_order:
              Number.isFinite(
                displayOrder
              )
                ? displayOrder
                : 0,
            active
          });

        if (error) {
          throw error;
        }

        carouselStatusMsg.className =
          "status success";

        carouselStatusMsg.textContent =
          "✅ Contenu ajouté au carrousel !";

        carouselForm.reset();

        $("carouselDuration")
          .value = 10;

        $("carouselOrder")
          .value = 0;

        $("carouselActive")
          .value = "true";

        await loadCarousel();
      } catch (error) {
        console.error(error);

        carouselStatusMsg.className =
          "status error";

        carouselStatusMsg.textContent =
          "❌ Erreur : " +
          error.message;
      } finally {
        carouselSubmitBtn.disabled =
          false;
      }
    }
  );
}

/* =========================
MODIFIER UN CONTENU DU CARROUSEL
========================= */

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "[data-edit-carousel]"
      );

    if (!button) {
      return;
    }

    const id =
      button.dataset
        .editCarousel;

    const {
      data: slide,
      error
    } = await supabase
      .from(
        "carousel_slides"
      )
      .select("*")
      .eq(
        "id",
        id
      )
      .single();

    if (error) {
      console.error(error);

      alert(
        "Impossible de charger ce contenu : " +
          error.message
      );

      return;
    }

    $("carouselType").value =
      slide.type ||
      "information";

    $("carouselTitle")
      .value =
      slide.title || "";

    $("carouselDescription")
      .value =
      slide.description ||
      "";

    $("carouselButtonText")
      .value =
      slide.button_text ||
      "";

    $("carouselButtonUrl")
      .value =
      slide.button_url ||
      "";

    $("carouselDuration")
      .value =
      slide.duration ||
      10;

    $("carouselOrder")
      .value =
      slide.display_order ??
      0;

    $("carouselActive")
      .value =
      slide.active
        ? "true"
        : "false";

    carouselForm.dataset
      .editingId =
      slide.id;

    carouselForm.dataset
      .editingImageUrl =
      slide.image_url || "";

    carouselSubmitBtn.textContent =
      "Enregistrer les modifications";

    carouselStatusMsg.className =
      "status info";

    carouselStatusMsg.textContent =
      "✏️ Modification du contenu.";

    showPage(
      "carousel"
    );
  }
);

/* =========================
ENREGISTRER MODIFICATION CARROUSEL
========================= */

if (carouselForm) {
  carouselForm.addEventListener(
    "submit",
    async (event) => {
      const editingId =
        carouselForm.dataset
          .editingId;

      if (!editingId) {
        return;
      }

      event.preventDefault();

      const type =
        $("carouselType")
          .value;

      const title =
        $("carouselTitle")
          .value
          .trim();

      const description =
        $("carouselDescription")
          .value
          .trim();

      const imageFile =
        $("carouselImage")
          .files[0];

      const buttonText =
        $("carouselButtonText")
          .value
          .trim();

      const buttonUrl =
        $("carouselButtonUrl")
          .value
          .trim();

      const duration =
        Number(
          $("carouselDuration")
            .value
        );

      const displayOrder =
        Number(
          $("carouselOrder")
            .value
        );

      const active =
        $("carouselActive")
          .value ===
        "true";

      if (!title) {
        carouselStatusMsg.className =
          "status error";

        carouselStatusMsg.textContent =
          "❌ Le titre est obligatoire.";

        return;
      }

      if (
        !duration ||
        duration < 1
      ) {
        carouselStatusMsg.className =
          "status error";

        carouselStatusMsg.textContent =
          "❌ La durée doit être supérieure à 0.";

        return;
      }

      carouselSubmitBtn.disabled =
        true;

      carouselStatusMsg.className =
        "status info";

      carouselStatusMsg.textContent =
        "⏳ Mise à jour...";

      try {
        let imageUrl =
          carouselForm.dataset
            .editingImageUrl ||
          null;

        if (imageFile) {
          if (
            !isAllowedImage(
              imageFile
            )
          ) {
            throw new Error(
              "Format d'image non autorisé."
            );
          }

          if (
            imageFile.size >
            10 * 1024 * 1024
          ) {
            throw new Error(
              "L'image ne doit pas dépasser 10 Mo."
            );
          }

          const extension =
            getFileExtension(
              imageFile
            );

          const filePath =
            `carousel/${Date.now()}-${createSlug(
              title
            )}.${extension}`;

          carouselStatusMsg.textContent =
            "⏳ Envoi de la nouvelle image...";

          const {
            error:
              uploadError
          } =
            await supabase.storage
              .from(
                "chapter-images"
              )
              .upload(
                filePath,
                imageFile,
                {
                  upsert: false
                }
              );

          if (uploadError) {
            throw uploadError;
          }

          const {
            data:
              publicUrlData
          } =
            supabase.storage
              .from(
                "chapter-images"
              )
              .getPublicUrl(
                filePath
              );

          imageUrl =
            publicUrlData.publicUrl;
        }

        const {
          error
        } = await supabase
          .from(
            "carousel_slides"
          )
          .update({
            type,
            title,
            description:
              description ||
              null,
            image_url:
              imageUrl,
            button_text:
              buttonText ||
              null,
            button_url:
              buttonUrl ||
              null,
            duration,
            display_order:
              Number.isFinite(
                displayOrder
              )
                ? displayOrder
                : 0,
            active
          })
          .eq(
            "id",
            editingId
          );

        if (error) {
          throw error;
        }

        carouselStatusMsg.className =
          "status success";

        carouselStatusMsg.textContent =
          "✅ Contenu modifié avec succès !";

        delete carouselForm
          .dataset
          .editingId;

        delete carouselForm
          .dataset
          .editingImageUrl;

        carouselForm.reset();

        $("carouselDuration")
          .value = 10;

        $("carouselOrder")
          .value = 0;

        $("carouselActive")
          .value = "true";

        carouselSubmitBtn.textContent =
          "Ajouter au carrousel";

        await loadCarousel();
      } catch (error) {
        console.error(error);

        carouselStatusMsg.className =
          "status error";

        carouselStatusMsg.textContent =
          "❌ Erreur : " +
          error.message;
      } finally {
        carouselSubmitBtn.disabled =
          false;
      }
    }
  );
}

/* =========================
SUPPRIMER UN CONTENU DU CARROUSEL
========================= */

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "[data-delete-carousel]"
      );

    if (!button) {
      return;
    }

    const id =
      button.dataset
        .deleteCarousel;

    if (
      !confirm(
        "Supprimer définitivement ce contenu du carrousel ?"
      )
    ) {
      return;
    }

    const {
      data:
        deletedSlide,
      error
    } = await supabase
      .from(
        "carousel_slides"
      )
      .delete()
      .eq(
        "id",
        id
      )
      .select("id");

    if (error) {
      console.error(error);

      alert(
        "Erreur lors de la suppression : " +
          error.message
      );

      return;
    }

    if (
      !deletedSlide ||
      deletedSlide.length ===
        0
    ) {
      alert(
        "❌ Le contenu n'a pas été supprimé. Supabase n'a supprimé aucune ligne."
      );

      return;
    }

    await loadCarousel();
  }
);

/* =========================
AUTH STATE
========================= */

supabase.auth.onAuthStateChange(
  (event, session) => {
    console.log(
      "Auth :",
      event
    );

    if (session) {
      showAdmin(
        session.user
      );
    } else {
      showLogin();
    }
  }
);

/* =========================
DEMARRAGE
========================= */

checkSession();
