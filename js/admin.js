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

const seriesFormat = $("seriesFormat");
const seriesFormatGroup = $("seriesFormatGroup");

/* =========================
ELEMENTS MODIFICATION OEUVRE
========================= */

const editSeriesForm = $("editSeriesForm");
const editSeriesTitle = $("editSeriesTitle");
const editSeriesType = $("editSeriesType");
const editSeriesGenre = $("editSeriesGenre");
const editSeriesStatus = $("editSeriesStatus");
const editSeriesDescription = $("editSeriesDescription");
const editSeriesCover = $("editSeriesCover");
const editSeriesSubmitBtn = $("editSeriesSubmitBtn");
const cancelEditSeriesBtn = $("cancelEditSeriesBtn");
const editSeriesStatusMsg = $("editSeriesStatusMsg");

const editSeriesFormat = $("editSeriesFormat");
const editSeriesFormatGroup = $("editSeriesFormatGroup");

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

const chapterContent = $("chapterContent");
const chapterContentGroup = $("chapterContentGroup");

const chapterImage = $("chapterImage");
const chapterImageGroup = $("chapterImageGroup");

const webcomicPagesGroup = $("webcomicPagesGroup");
const webcomicPageList = $("webcomicPageList");
const addWebcomicPageBtn = $("addWebcomicPageBtn");

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
IDs des pages déjà présentes au moment
où l'édition d'un WebComic est ouverte.

Cela permet de détecter les pages
supprimées pendant l'édition.
*/
let editingWebcomicPageIds = [];

/* =========================
FORMAT OEUVRE
========================= */

function isWebcomicSeries(series) {
  return (
    series &&
    series.type === "webcomic"
  );
}

function isMangaSeries(series) {
  return (
    isWebcomicSeries(series) &&
    series.format === "manga"
  );
}

function isWebtoonSeries(series) {
  return (
    isWebcomicSeries(series) &&
    series.format === "webtoon"
  );
}

/*
Affiche ou masque le choix du format
dans les formulaires d'œuvre.
*/
function updateSeriesFormatVisibility(
  type,
  format = ""
) {
  const isWebcomic =
    type === "webcomic";

  if (seriesFormatGroup) {
    seriesFormatGroup.style.display =
      isWebcomic ? "" : "none";
  }

  if (editSeriesFormatGroup) {
    editSeriesFormatGroup.style.display =
      isWebcomic ? "" : "none";
  }

  if (seriesFormat && !isWebcomic) {
    seriesFormat.value = "";
  }

  if (
    editSeriesFormat &&
    !isWebcomic
  ) {
    editSeriesFormat.value = "";
  }

  if (
    seriesFormat &&
    isWebcomic &&
    format
  ) {
    seriesFormat.value = format;
  }

  if (
    editSeriesFormat &&
    isWebcomic &&
    format
  ) {
    editSeriesFormat.value =
      format;
  }
}

/* =========================
INTERFACE CHAPITRE
========================= */

function updateChapterEditorUI() {
  if (!selectedSeries) {
    return;
  }

  const isWebcomic =
    isWebcomicSeries(
      selectedSeries
    );

  if (chapterContentGroup) {
    chapterContentGroup.style.display =
      isWebcomic ? "none" : "";
  }

  if (chapterImageGroup) {
    chapterImageGroup.style.display =
      isWebcomic ? "none" : "";
  }

  if (webcomicPagesGroup) {
    webcomicPagesGroup.style.display =
      isWebcomic ? "" : "none";
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
GESTION DES PAGES WEBCOMIC
========================= */

function resetWebcomicPages() {
  editingWebcomicPageIds = [];

  if (webcomicPageList) {
    webcomicPageList.innerHTML = "";
  }
}

/*
Crée un élément de page.

existingPage :
{
  id,
  page_number,
  image_url
}

Pour une nouvelle page :
existingPage = null
*/
function createWebcomicPageItem(
  existingPage = null
) {
  if (!webcomicPageList) {
    return null;
  }

  const item =
    document.createElement("div");

  item.className =
    "webcomic-page-item";

  if (existingPage) {
    item.dataset.pageId =
      existingPage.id;

    item.dataset.pageNumber =
      existingPage.page_number;
  }

  const currentPageNumber =
    existingPage
      ? existingPage.page_number
      : webcomicPageList.children.length + 1;

  item.innerHTML = `
    <strong>
      Page ${escapeHTML(
        currentPageNumber
      )}
    </strong>

    ${
      existingPage &&
      existingPage.image_url
        ? `
          <div
            style="
              margin-bottom:10px;
            "
          >
            <img
              src="${escapeAttribute(
                existingPage.image_url
              )}"
              alt="Page ${escapeAttribute(
                currentPageNumber
              )}"
              style="
                display:block;
                width:100%;
                max-height:260px;
                object-fit:contain;
                border-radius:8px;
                background:#05080d;
              "
            >
          </div>
        `
        : ""
    }

    <input
      type="file"
      class="webcomic-page-file"
      accept="image/jpeg,image/png,image/webp"
    >

    ${
      existingPage
        ? `
          <button
            type="button"
            class="danger webcomic-remove-page"
          >
            🗑️ Supprimer cette page
          </button>
        `
        : `
          <button
            type="button"
            class="secondary webcomic-remove-page"
          >
            Retirer
          </button>
        `
    }
  `;

  webcomicPageList.appendChild(item);

  return item;
}

function addNewWebcomicPage() {
  createWebcomicPageItem(null);
}

function getWebcomicPageItems() {
  if (!webcomicPageList) {
    return [];
  }

  return Array.from(
    webcomicPageList.querySelectorAll(
      ".webcomic-page-item"
    )
  );
}

function getWebcomicPageFiles() {
  return getWebcomicPageItems().map(
    (item, index) => {
      const input =
        item.querySelector(
          ".webcomic-page-file"
        );

      return {
        item,
        index,
        pageId:
          item.dataset.pageId ||
          null,
        pageNumber:
          Number(
            item.dataset.pageNumber
          ) ||
          index + 1,
        file:
          input?.files?.[0] ||
          null
      };
    }
  );
}

function validateWebcomicFile(
  file
) {
  if (!file) {
    return null;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (
    !allowedTypes.includes(
      file.type
    )
  ) {
    return "Format d'image non autorisé.";
  }

  if (
    file.size >
    10 * 1024 * 1024
  ) {
    return "Une image ne doit pas dépasser 10 Mo.";
  }

  return null;
}

async function uploadChapterImage(
  file,
  path
) {
  const {
    error: uploadError
  } = await supabase.storage
    .from("chapter-images")
    .upload(
      path,
      file,
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
      path
    );

  return publicUrlData.publicUrl;
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
    .querySelectorAll("[data-page]")
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

/* =========================
RESET CREATION OEUVRE
========================= */

function resetSeriesCreateForm() {
  editingSeriesId = null;
  editingSeriesCoverUrl = null;

  if (addSeriesForm) {
    addSeriesForm.reset();
  }

  const coverInput =
    $("seriesCover");

  if (coverInput) {
    coverInput.required = true;
  }

  updateSeriesFormatVisibility(
    $("seriesType")?.value ||
      "webcomic",
    $("seriesFormat")?.value ||
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

/* =========================
RESET MODIFICATION OEUVRE
========================= */

function resetSeriesEdit() {
  editingSeriesId = null;
  editingSeriesCoverUrl = null;

  if (editSeriesForm) {
    editSeriesForm.reset();
  }

  updateSeriesFormatVisibility(
    $("editSeriesType")?.value ||
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

/* =========================
NAVIGATION GENERALE
========================= */

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

    if (page === "new-series") {
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
CHANGEMENT TYPE OEUVRE
========================= */

const seriesTypeInput =
  $("seriesType");

if (seriesTypeInput) {
  seriesTypeInput.addEventListener(
    "change",
    () => {
      updateSeriesFormatVisibility(
        seriesTypeInput.value,
        seriesFormat?.value || ""
      );
    }
  );
}

if (editSeriesType) {
  editSeriesType.addEventListener(
    "change",
    () => {
      updateSeriesFormatVisibility(
        editSeriesType.value,
        editSeriesFormat?.value ||
          ""
      );
    }
  );
}

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
  editingSeriesCoverUrl = null;

  editingChapterId = null;
  editingChapterImageUrl = null;

  editingWebcomicPageIds = [];

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

    if (!email || !password) {
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

    showAdmin(data.user);
  }
);

logoutBtn.addEventListener(
  "click",
  async () => {
    await supabase.auth.signOut();

    selectedSeries = null;

    editingSeriesId = null;
    editingSeriesCoverUrl = null;

    editingChapterId = null;
    editingChapterImageUrl = null;

    editingWebcomicPageIds = [];

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
        seriesResult.count ?? 0;
    }

    if (chaptersCount) {
      chaptersCount.textContent =
        chaptersResult.count ?? 0;
    }

    if (soundsCount) {
      if (soundsResult.error) {
        soundsCount.textContent =
          "0";
      } else {
        soundsCount.textContent =
          soundsResult.data?.length ??
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

                  ${
                    series.type ===
                      "webcomic" &&
                    series.format
                      ? `
                        <br>
                        Format :
                        ${escapeHTML(
                          series.format
                        )}
                      `
                      : ""
                  }

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

async function openSeries(seriesId) {
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

  if (newChapterSeriesTitle) {
    newChapterSeriesTitle.textContent =
      data.title || "—";
  }

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
      button.dataset.openSeries
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
      button.dataset.editSeries;

    if (!seriesId) {
      return;
    }

    if (editSeriesStatusMsg) {
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

      if (editSeriesStatusMsg) {
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

    editSeriesGenre.value =
      series.genre || "";

    editSeriesStatus.value =
      series.status ||
      "ongoing";

    editSeriesDescription.value =
      series.description || "";

    if (editSeriesFormat) {
      editSeriesFormat.value =
        series.type ===
        "webcomic"
          ? series.format ||
            ""
          : "";
    }

    updateSeriesFormatVisibility(
      series.type,
      series.format || ""
    );

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

    showPage("edit-series");
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

      if (!editingSeriesId) {
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
        type === "webcomic"
          ? editSeriesFormat?.value ||
            null
          : null;

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

      if (
        type === "webcomic" &&
        !["manga", "webtoon"].includes(
          format
        )
      ) {
        editSeriesStatusMsg.className =
          "status error";

        editSeriesStatusMsg.textContent =
          "❌ Choisis un format : Manga ou Webtoon.";

        return;
      }

      if (coverFile) {
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/webp"
        ];

        if (
          !allowedTypes.includes(
            coverFile.type
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
            coverFile.name
              .split(".")
              .pop();

          const slug =
            createSlug(title);

          const filePath =
            `${slug}-${Date.now()}.${extension}`;

          editSeriesStatusMsg.textContent =
            "⏳ Envoi de la nouvelle couverture...";

          const {
            error: uploadError
          } = await supabase.storage
            .from("Cover series")
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
            data: publicUrlData
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
            format,
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
            format,
            genre,
            description,
            cover_url:
              coverUrl,
            status
          };

          if (selectedSeriesTitle) {
            selectedSeriesTitle.textContent =
              title;
          }

          const descriptionElement =
            $(
              "chapterSeriesDescription"
            );

          if (descriptionElement) {
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

        editingSeriesId = null;
        editingSeriesCoverUrl =
          null;

        editSeriesForm.reset();

        editSeriesSubmitBtn.textContent =
          "Enregistrer les modifications";

        await loadSeries();
        await loadDashboard();

        showPage("series");
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

if (cancelEditSeriesBtn) {
  cancelEditSeriesBtn.addEventListener(
    "click",
    () => {
      resetSeriesEdit();

      showPage("series");

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
      button.dataset.deleteSeries;

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
      selectedSeries.id === id
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
      $("seriesType").value;

    const format =
      type === "webcomic"
        ? $("seriesFormat")?.value ||
          null
        : null;

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
      type === "webcomic" &&
      !["manga", "webtoon"].includes(
        format
      )
    ) {
      seriesStatusMsg.className =
        "status error";

      seriesStatusMsg.textContent =
        "❌ Choisis un format : Manga ou Webtoon.";

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
        coverFile.name
          .split(".")
          .pop();

      const slug =
        createSlug(title);

      const filePath =
        `${slug}-${Date.now()}.${extension}`;

      const {
        error: uploadError
      } = await supabase.storage
        .from("Cover series")
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
        data: publicUrlData
      } =
        supabase.storage
          .from("Cover series")
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
          format,
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

      updateSeriesFormatVisibility(
        $("seriesType")?.value ||
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

                  ${
                    selectedSeries.type ===
                      "webcomic"
                      ? `
                        <br>
                        Format :
                        ${escapeHTML(
                          selectedSeries.format ||
                            "—"
                        )}
                      `
                      : ""
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
      editingChapterId = null;
      editingChapterImageUrl =
        null;

      editingWebcomicPageIds = [];

      addChapterForm.reset();

      resetWebcomicPages();

      if (selectedSeries) {
        $("newChapterSeriesTitle")
          .textContent =
          selectedSeries.title;
      }

      chapterSubmitBtn.textContent =
        "Publier le chapitre";

      newChapterBtn.textContent =
        "➕ Nouveau chapitre";

      chapterStatusMsg.className =
        "status";

      chapterStatusMsg.textContent =
        "";

      updateChapterEditorUI();

      if (selectedSeries) {
        await loadSoundOptions();
      }

      showPage("chapters");

      return;
    }

    if (!selectedSeries) {
      alert(
        "Sélectionne d'abord une œuvre."
      );

      return;
    }

    editingChapterId = null;
    editingChapterImageUrl =
      null;

    editingWebcomicPageIds = [];

    addChapterForm.reset();

    resetWebcomicPages();

    chapterSubmitBtn.textContent =
      "Publier le chapitre";

    newChapterBtn.textContent =
      "➕ Nouveau chapitre";

    chapterStatusMsg.className =
      "status";

    chapterStatusMsg.textContent =
      "";

    $("newChapterSeriesTitle")
      .textContent =
      selectedSeries.title;

    updateChapterEditorUI();

    if (
      isWebcomicSeries(
        selectedSeries
      )
    ) {
      addNewWebcomicPage();
    }

    await loadSoundOptions();

    showPage("new-chapter");
  }
);

/* =========================
AJOUT PAGE WEBCOMIC
========================= */

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

      addNewWebcomicPage();
    }
  );
}

/* =========================
SUPPRIMER / RETIRER PAGE
========================= */

document.addEventListener(
  "click",
  (event) => {
    const button =
      event.target.closest(
        ".webcomic-remove-page"
      );

    if (!button) {
      return;
    }

    const item =
      button.closest(
        ".webcomic-page-item"
      );

    if (!item) {
      return;
    }

    item.remove();
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
      button.dataset.editChapter;

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

    resetWebcomicPages();

    await loadSoundOptions();

    $("chapterSound").value =
      chapter.sound_url || "";

    if (
      isWebcomicSeries(
        selectedSeries
      )
    ) {
      chapterImage.required =
        false;

      chapterContent.required =
        false;

      const {
        data: pages,
        error: pagesError
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
          chapter.id
        )
        .order(
          "page_number",
          {
            ascending: true
          }
        );

      if (pagesError) {
        console.error(
          pagesError
        );

        chapterStatusMsg.className =
          "status error";

        chapterStatusMsg.textContent =
          "❌ Impossible de charger les pages : " +
          pagesError.message;

        return;
      }

      editingWebcomicPageIds =
        (pages || []).map(
          (page) => page.id
        );

      (pages || []).forEach(
        (page) => {
          createWebcomicPageItem(
            page
          );
        }
      );

      if (
        !pages ||
        pages.length === 0
      ) {
        addNewWebcomicPage();
      }
    }

    updateChapterEditorUI();

    chapterSubmitBtn.textContent =
      "Enregistrer les modifications";

    newChapterBtn.textContent =
      "↩️ Annuler la modification";

    chapterStatusMsg.className =
      "status info";

    chapterStatusMsg.textContent =
      "✏️ Modification du chapitre.";

    $("newChapterSeriesTitle")
      .textContent =
      selectedSeries.title;

    showPage("new-chapter");
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

    const chapterNumber =
      Number(
        $("chapterNumber").value
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
      $("chapterSound").value;

    const isWebcomic =
      isWebcomicSeries(
        selectedSeries
      );

    /* =========================
    VALIDATION GENERALE
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

    /*
    =========================
    ROMAN
    =========================

    On conserve ici l'ancien
    fonctionnement.
    */
    if (!isWebcomic && !content) {
      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ Le contenu est obligatoire.";

      return;
    }

    if (
      !isWebcomic &&
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
      const imageError =
        validateWebcomicFile(
          imageFile
        );

      if (imageError) {
        chapterStatusMsg.className =
          "status error";

        chapterStatusMsg.textContent =
          "❌ " +
          imageError;

        return;
      }
    }

    /* =========================
    VALIDATION WEBCOMIC
    ========================= */

    const webcomicPages =
      isWebcomic
        ? getWebcomicPageFiles()
        : [];

    if (
      isWebcomic &&
      webcomicPages.length ===
        0
    ) {
      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ Ajoute au moins une page au chapitre.";

      return;
    }

    if (isWebcomic) {
      for (
        const page of webcomicPages
      ) {
        const fileError =
          validateWebcomicFile(
            page.file
          );

        if (fileError) {
          chapterStatusMsg.className =
            "status error";

          chapterStatusMsg.textContent =
            `❌ Page ${page.pageNumber} : ${fileError}`;

          return;
        }

        /*
        Une nouvelle page doit obligatoirement
        avoir une image.
        */
        if (
          !page.pageId &&
          !page.file
        ) {
          chapterStatusMsg.className =
            "status error";

          chapterStatusMsg.textContent =
            `❌ La page ${page.pageNumber} doit avoir une image.`;

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
        ROMAN
        =========================
        */

        if (!isWebcomic) {
          let chapterImageUrl =
            editingChapterImageUrl;

          if (imageFile) {
            const extension =
              imageFile.name
                .split(".")
                .pop();

            const filePath =
              `${selectedSeries.id}/${editingChapterId}-${Date.now()}.${extension}`;

            chapterStatusMsg.textContent =
              "⏳ Envoi de la nouvelle image...";

            chapterImageUrl =
              await uploadChapterImage(
                imageFile,
                filePath
              );
          }

          chapterStatusMsg.textContent =
            "⏳ Mise à jour du chapitre...";

          const {
            data: updatedChapter,
            error: updateError
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
                soundUrl || null
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

          editingChapterId = null;
          editingChapterImageUrl =
            null;

          editingWebcomicPageIds =
            [];

          addChapterForm.reset();

          chapterImage.required =
            true;

          chapterContent.required =
            true;

          chapterSubmitBtn.disabled =
            false;

          chapterSubmitBtn.textContent =
            "Publier le chapitre";

          newChapterBtn.textContent =
            "➕ Nouveau chapitre";

          await loadChapters();
          await loadDashboard();

          showPage("chapters");

          return;
        }

        /*
        =========================
        WEBCOMIC
        =========================
        */

        chapterStatusMsg.textContent =
          "⏳ Mise à jour des informations du chapitre...";

        /*
        Le contenu texte reste vide/null
        pour un WebComic.
        */
        const {
          data: updatedChapter,
          error: updateError
        } = await supabase
          .from("chapters")
          .update({
            chapter_number:
              chapterNumber,

            chapter_label:
              chapterLabel,

            title,

            content: null,

            sound_url:
              soundUrl || null
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

        /*
        IDs encore présents dans l'interface.
        */
        const currentPageIds =
          webcomicPages
            .filter(
              (page) =>
                page.pageId
            )
            .map(
              (page) =>
                page.pageId
            );

        /*
        Pages supprimées dans l'interface.
        */
        const deletedPageIds =
          editingWebcomicPageIds.filter(
            (id) =>
              !currentPageIds.includes(
                id
              )
          );

        if (
          deletedPageIds.length >
          0
        ) {
          chapterStatusMsg.textContent =
            "⏳ Suppression des anciennes pages...";

          const {
            error: deletePagesError
          } = await supabase
            .from("chapter_pages")
            .delete()
            .in(
              "id",
              deletedPageIds
            );

          if (deletePagesError) {
            throw deletePagesError;
          }
        }

        /*
        Traiter chaque page.
        */
        for (
          let index = 0;
          index <
          webcomicPages.length;
          index++
        ) {
          const page =
            webcomicPages[index];

          const pageNumber =
            index + 1;

          /*
          PAGE EXISTANTE
          */
          if (page.pageId) {
            if (page.file) {
              chapterStatusMsg.textContent =
                `⏳ Remplacement de la page ${pageNumber}...`;

              const extension =
                page.file.name
                  .split(".")
                  .pop();

              const filePath =
                `webcomic/${selectedSeries.id}/${editingChapterId}/page-${String(
                  pageNumber
                ).padStart(
                  3,
                  "0"
                )}-${Date.now()}.${extension}`;

              const imageUrl =
                await uploadChapterImage(
                  page.file,
                  filePath
                );

              const {
                error: updatePageError
              } = await supabase
                .from(
                  "chapter_pages"
                )
                .update({
                  page_number:
                    pageNumber,

                  image_url:
                    imageUrl
                })
                .eq(
                  "id",
                  page.pageId
                );

              if (
                updatePageError
              ) {
                throw updatePageError;
              }
            } else {
              /*
              On met quand même à jour
              le numéro de page afin de
              conserver l'ordre.
              */
              const {
                error: updatePageError
              } = await supabase
                .from(
                  "chapter_pages"
                )
                .update({
                  page_number:
                    pageNumber
                })
                .eq(
                  "id",
                  page.pageId
                );

              if (
                updatePageError
              ) {
                throw updatePageError;
              }
            }

            continue;
          }

          /*
          NOUVELLE PAGE
          */
          if (!page.file) {
            throw new Error(
              `La page ${pageNumber} ne contient aucune image.`
            );
          }

          chapterStatusMsg.textContent =
            `⏳ Envoi de la page ${pageNumber}/${webcomicPages.length}...`;

          const extension =
            page.file.name
              .split(".")
              .pop();

          const filePath =
            `webcomic/${selectedSeries.id}/${editingChapterId}/page-${String(
              pageNumber
            ).padStart(
              3,
              "0"
            )}-${Date.now()}.${extension}`;

          const imageUrl =
            await uploadChapterImage(
              page.file,
              filePath
            );

          const {
            error: insertPageError
          } = await supabase
            .from(
              "chapter_pages"
            )
            .insert({
              chapter_id:
                editingChapterId,

              page_number:
                pageNumber,

              image_url:
                imageUrl
            });

          if (insertPageError) {
            throw insertPageError;
          }
        }

        /*
        Récupérer la première page
        pour garder chapter_image_url
        compatible avec les cartes existantes.
        */
        const {
          data: firstPage,
          error: firstPageError
        } = await supabase
          .from(
            "chapter_pages"
          )
          .select(
            "image_url"
          )
          .eq(
            "chapter_id",
            editingChapterId
          )
          .eq(
            "page_number",
            1
          )
          .maybeSingle();

        if (firstPageError) {
          throw firstPageError;
        }

        if (
          firstPage?.image_url
        ) {
          const {
            error: chapterImageUpdateError
          } = await supabase
            .from("chapters")
            .update({
              chapter_image_url:
                firstPage.image_url
            })
            .eq(
              "id",
              editingChapterId
            );

          if (
            chapterImageUpdateError
          ) {
            throw chapterImageUpdateError;
          }
        }

        chapterStatusMsg.className =
          "status success";

        chapterStatusMsg.textContent =
          "✅ Chapitre WebComic modifié avec succès !";

        editingChapterId = null;
        editingChapterImageUrl =
          null;

        editingWebcomicPageIds =
          [];

        addChapterForm.reset();

        resetWebcomicPages();

        chapterSubmitBtn.disabled =
          false;

        chapterSubmitBtn.textContent =
          "Publier le chapitre";

        newChapterBtn.textContent =
          "➕ Nouveau chapitre";

        updateChapterEditorUI();

        await loadChapters();
        await loadDashboard();

        showPage("chapters");

        return;
      }

      /* =========================
      CREATION ROMAN
      ========================= */

      if (!isWebcomic) {
        let chapterImageUrl =
          null;

        if (imageFile) {
          const extension =
            imageFile.name
              .split(".")
              .pop();

          const filePath =
            `${selectedSeries.id}/${Date.now()}-${createSlug(
              title
            )}.${extension}`;

          chapterStatusMsg.textContent =
            "⏳ Envoi de l'image...";

          chapterImageUrl =
            await uploadChapterImage(
              imageFile,
              filePath
            );
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
              soundUrl || null,

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

        editingChapterId = null;
        editingChapterImageUrl =
          null;

        editingWebcomicPageIds =
          [];

        chapterImage.required =
          true;

        chapterContent.required =
          true;

        chapterSubmitBtn.textContent =
          "Publier le chapitre";

        newChapterBtn.textContent =
          "➕ Nouveau chapitre";

        await loadChapters();
        await loadDashboard();

        chapterSubmitBtn.disabled =
          false;

        showPage("chapters");

        return;
      }

      /* =========================
      CREATION WEBCOMIC
      ========================= */

      if (
        webcomicPages.length ===
        0
      ) {
        throw new Error(
          "Ajoute au moins une page au chapitre."
        );
      }

      /*
      1. Création du chapitre.
      */
      chapterStatusMsg.textContent =
        "⏳ Création du chapitre...";

      const {
        data: newChapter,
        error: insertChapterError
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

          /*
          Un WebComic n'utilise pas
          le contenu texte du Roman.
          */
          content: null,

          chapter_image_url:
            null,

          sound_url:
            soundUrl || null,

          published_at:
            new Date().toISOString(),

          views: 0
        })
        .select("id")
        .single();

      if (insertChapterError) {
        throw insertChapterError;
      }

      if (!newChapter?.id) {
        throw new Error(
          "Le chapitre a été créé mais son identifiant est introuvable."
        );
      }

      const newChapterId =
        newChapter.id;

      let firstPageUrl = null;

      /*
      2. Upload des pages.
      */
      for (
        let index = 0;
        index <
        webcomicPages.length;
        index++
      ) {
        const page =
          webcomicPages[index];

        if (!page.file) {
          throw new Error(
            `La page ${
              index + 1
            } ne contient aucune image.`
          );
        }

        chapterStatusMsg.textContent =
          `⏳ Envoi de la page ${
            index + 1
          }/${webcomicPages.length}...`;

        const extension =
          page.file.name
            .split(".")
            .pop();

        const filePath =
          `webcomic/${selectedSeries.id}/${newChapterId}/page-${String(
            index + 1
          ).padStart(
            3,
            "0"
          )}-${Date.now()}.${extension}`;

        const imageUrl =
          await uploadChapterImage(
            page.file,
            filePath
          );

        /*
        Première page = image principale
        du chapitre.
        */
        if (index === 0) {
          firstPageUrl =
            imageUrl;
        }

        /*
        3. Enregistrement dans
        chapter_pages.
        */
        const {
          error: insertPageError
        } = await supabase
          .from(
            "chapter_pages"
          )
          .insert({
            chapter_id:
              newChapterId,

            page_number:
              index + 1,

            image_url:
              imageUrl
          });

        if (insertPageError) {
          throw insertPageError;
        }
      }

      /*
      4. On conserve la première page
      dans chapter_image_url.
      */
      if (firstPageUrl) {
        const {
          error:
            chapterImageUpdateError
        } = await supabase
          .from("chapters")
          .update({
            chapter_image_url:
              firstPageUrl
          })
          .eq(
            "id",
            newChapterId
          );

        if (
          chapterImageUpdateError
        ) {
          throw chapterImageUpdateError;
        }
      }

      chapterStatusMsg.className =
        "status success";

      chapterStatusMsg.textContent =
        `✅ Chapitre ${
          selectedSeries.format ===
          "manga"
            ? "Manga"
            : "Webtoon"
        } publié avec succès !`;

      addChapterForm.reset();

      resetWebcomicPages();

      editingChapterId = null;
      editingChapterImageUrl =
        null;

      editingWebcomicPageIds =
        [];

      updateChapterEditorUI();

      chapterSubmitBtn.textContent =
        "Publier le chapitre";

      newChapterBtn.textContent =
        "➕ Nouveau chapitre";

      await loadChapters();
      await loadDashboard();

      chapterSubmitBtn.disabled =
        false;

      showPage("chapters");
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
      button.dataset.deleteChapter;

    if (
      !confirm(
        "Supprimer définitivement ce chapitre ?"
      )
    ) {
      return;
    }

    const {
      data: deletedChapter,
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

  if (files.length === 0) {
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
          data: publicUrlData
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

  files.forEach((file) => {
    const {
      data: publicUrlData
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
  });

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
        file.name
          .split(".")
          .pop();

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
      button.dataset.deleteSound;

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
    data.length === 0
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
AJOUTER CONTENU CARROUSEL
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
        let imageUrl = null;

        if (imageFile) {
          const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
          ];

          if (
            !allowedTypes.includes(
              imageFile.type
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
            imageFile.name
              .split(".")
              .pop();

          const filePath =
            `carousel/${Date.now()}-${createSlug(
              title
            )}.${extension}`;

          carouselStatusMsg.textContent =
            "⏳ Envoi de l'image...";

          const {
            error: uploadError
          } = await supabase.storage
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
            data: publicUrlData
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
MODIFIER CONTENU CARROUSEL
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
      button.dataset.editCarousel;

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

    $("carouselTitle").value =
      slide.title || "";

    $("carouselDescription")
      .value =
      slide.description || "";

    $("carouselButtonText")
      .value =
      slide.button_text || "";

    $("carouselButtonUrl")
      .value =
      slide.button_url || "";

    $("carouselDuration")
      .value =
      slide.duration || 10;

    $("carouselOrder")
      .value =
      slide.display_order ??
      0;

    $("carouselActive")
      .value =
      slide.active
        ? "true"
        : "false";

    carouselForm.dataset.editingId =
      slide.id;

    carouselForm.dataset.editingImageUrl =
      slide.image_url || "";

    carouselSubmitBtn.textContent =
      "Enregistrer les modifications";

    carouselStatusMsg.className =
      "status info";

    carouselStatusMsg.textContent =
      "✏️ Modification du contenu.";

    showPage("carousel");
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
          const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
          ];

          if (
            !allowedTypes.includes(
              imageFile.type
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
            imageFile.name
              .split(".")
              .pop();

          const filePath =
            `carousel/${Date.now()}-${createSlug(
              title
            )}.${extension}`;

          carouselStatusMsg.textContent =
            "⏳ Envoi de la nouvelle image...";

          const {
            error: uploadError
          } = await supabase.storage
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
            data: publicUrlData
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
          .dataset.editingId;

        delete carouselForm
          .dataset.editingImageUrl;

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
SUPPRIMER CONTENU CARROUSEL
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
      button.dataset.deleteCarousel;

    if (
      !confirm(
        "Supprimer définitivement ce contenu du carrousel ?"
      )
    ) {
      return;
    }

    const {
      data: deletedSlide,
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

updateSeriesFormatVisibility(
  $("seriesType")?.value ||
    "webcomic",
  $("seriesFormat")?.value ||
    ""
);

checkSession();
