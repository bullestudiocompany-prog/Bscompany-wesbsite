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

/*
Etat de modification d'une œuvre.

null = aucune modification
id = œuvre actuellement modifiée
*/
let editingSeriesId = null;

/*
Couverture actuellement utilisée par l'œuvre.

Si aucune nouvelle couverture n'est choisie
pendant la modification, celle-ci est conservée.
*/
let editingSeriesCoverUrl = null;

/*
Etat de modification d'un chapitre.

null = création normale
id = modification d'un chapitre existant
*/
let editingChapterId = null;

/*
Image actuellement utilisée par le chapitre.

Si aucune nouvelle image n'est sélectionnée
pendant la modification, elle sera conservée.
*/
let editingChapterImageUrl = null;

/* =========================
NAVIGATION
========================= */

function showPage(pageName) {
  document
    .querySelectorAll(".page")
    .forEach((page) => {
      page.classList.remove("active");
    });

  const target = $(`page-${pageName}`);

  if (target) {
    target.classList.add("active");
  }

  document
    .querySelectorAll("[data-page]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.page === pageName
      );
    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/*
Réinitialise complètement le formulaire
de création d'une œuvre.
*/
function resetSeriesCreateForm() {
  editingSeriesId = null;
  editingSeriesCoverUrl = null;

  if (addSeriesForm) {
    addSeriesForm.reset();
  }

  const coverInput = $("seriesCover");

  if (coverInput) {
    coverInput.required = true;
  }

  if (seriesSubmitBtn) {
    seriesSubmitBtn.textContent = "Publier l'œuvre";
    seriesSubmitBtn.disabled = false;
  }

  if (seriesStatusMsg) {
    seriesStatusMsg.className = "status";
    seriesStatusMsg.textContent = "";
  }
}

/*
Réinitialise le formulaire de modification
d'une œuvre.
*/
function resetSeriesEdit() {
  editingSeriesId = null;
  editingSeriesCoverUrl = null;

  if (editSeriesForm) {
    editSeriesForm.reset();
  }

  if (editSeriesSubmitBtn) {
    editSeriesSubmitBtn.textContent =
      "Enregistrer les modifications";

    editSeriesSubmitBtn.disabled = false;
  }

  if (editSeriesStatusMsg) {
    editSeriesStatusMsg.className = "status";
    editSeriesStatusMsg.textContent = "";
  }
}

/*
Navigation générale.
*/
document.addEventListener(
  "click",
  async (event) => {
    const button = event.target.closest("[data-page]");

    if (!button) {
      return;
    }

    const page = button.dataset.page;

    /*
    Si on revient vers Nouvelle œuvre,
    on quitte complètement le mode modification.
    */
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
AUTH
========================= */

function showAdmin(user) {
  currentUser = user;

  loginSection.classList.add("hidden");
  adminSection.classList.remove("hidden");

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

  loginSection.classList.remove("hidden");
  adminSection.classList.add("hidden");
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
    showAdmin(data.session.user);
  } else {
    showLogin();
  }
}

loginForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    loginError.className = "info";
    loginError.textContent =
      "⏳ Connexion...";

    const email =
      $("loginEmail").value.trim();

    const password =
      $("loginPassword").value;

    if (!email || !password) {
      loginError.className = "error";
      loginError.textContent =
        "❌ Remplis tous les champs.";

      return;
    }

    const {
      data,
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error(error);

      loginError.className = "error";
      loginError.textContent =
        "❌ " + error.message;

      return;
    }

    loginError.className = "success";
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
        soundsCount.textContent = "0";
      } else {
        soundsCount.textContent =
          soundsResult.data?.length ?? 0;
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
          Erreur : ${escapeHTML(error.message)}
        </p>
      </div>
    `;

    return;
  }

  if (!data || data.length === 0) {
    seriesList.innerHTML = `
      <div class="item">
        Aucune œuvre pour le moment.
      </div>
    `;

    return;
  }

  seriesList.innerHTML = data
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
                  series.type || "—"
                )}
                <br>

                Genre :
                ${escapeHTML(
                  series.genre || "—"
                )}
                <br>

                Statut :
                ${escapeHTML(
                  series.status || "—"
                )}
                <br>

                Slug :
                ${escapeHTML(
                  series.slug || "—"
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
    .eq("id", seriesId)
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
        genre,
        description,
        cover_url,
        status,
        author_id
      `)
      .eq("id", seriesId)
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

    /*
    IMPORTANT :

    On conserve l'ID de l'œuvre.
    On ne touche pas aux chapitres.
    */
    editingSeriesId = series.id;

    editingSeriesCoverUrl =
      series.cover_url || null;

    editSeriesTitle.value =
      series.title || "";

    editSeriesType.value =
      series.type || "webcomic";

    editSeriesGenre.value =
      series.genre || "";

    editSeriesStatus.value =
      series.status || "ongoing";

    editSeriesDescription.value =
      series.description || "";

    /*
    Le champ fichier reste vide.
    L'ancienne couverture sera conservée
    si aucune nouvelle image n'est choisie.
    */
    editSeriesCover.value = "";

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

      const genre =
        editSeriesGenre.value.trim();

      const status =
        editSeriesStatus.value;

      const description =
        editSeriesDescription.value.trim();

      const coverFile =
        editSeriesCover.files[0];

      /* =========================
      VALIDATION
      ========================= */

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
        /*
        On garde la couverture actuelle
        par défaut.
        */
        let coverUrl =
          editingSeriesCoverUrl;

        /*
        Si une nouvelle couverture
        est sélectionnée, on l'upload.
        */
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
          } = supabase.storage
            .from("Cover series")
            .getPublicUrl(
              filePath
            );

          coverUrl =
            publicUrlData.publicUrl;
        }

        /*
        Nouveau slug basé sur le titre.
        */
        const slug =
          createSlug(title);

        editSeriesStatusMsg.textContent =
          "⏳ Mise à jour de l'œuvre...";

        /*
        IMPORTANT :

        On modifie UNIQUEMENT la ligne
        de l'œuvre.

        On ne modifie PAS :
        - id
        - author_id
        - chapters
        - chapters.series_id

        Les chapitres restent donc
        attachés à cette œuvre.
        */
        const {
          data: updatedSeries,
          error: updateError
        } = await supabase
          .from("series")
          .update({
            title,
            slug,
            type,
            genre,
            description,
            cover_url: coverUrl,
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
          updatedSeries.length === 0
        ) {
          throw new Error(
            "L'œuvre n'a pas été modifiée. Supabase n'a modifié aucune ligne."
          );
        }

        /*
        Si l'œuvre actuellement sélectionnée
        est celle qu'on vient de modifier,
        on recharge ses informations.
        */
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
            genre,
            description,
            cover_url: coverUrl,
            status
          };

          if (selectedSeriesTitle) {
            selectedSeriesTitle.textContent =
              title;
          }

          const descriptionElement =
            $("chapterSeriesDescription");

          if (descriptionElement) {
            descriptionElement.textContent =
              description;
          }

          const newChapterSeriesTitle =
            $("newChapterSeriesTitle");

          if (newChapterSeriesTitle) {
            newChapterSeriesTitle.textContent =
              title;
          }
        }

        editSeriesStatusMsg.className =
          "status success";

        editSeriesStatusMsg.textContent =
          "✅ Œuvre modifiée avec succès !";

        /*
        On réinitialise l'état
        de modification.
        */
        editingSeriesId = null;
        editingSeriesCoverUrl = null;

        editSeriesForm.reset();

        editSeriesSubmitBtn.textContent =
          "Enregistrer les modifications";

        await loadSeries();
        await loadDashboard();

        /*
        Retour à la liste des œuvres.
        */
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
      .eq("id", id);

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
      $("seriesTitle").value.trim();

    const type =
      $("seriesType").value;

    const genre =
      $("seriesGenre").value.trim();

    const status =
      $("seriesStatus").value;

    const description =
      $("seriesDescription")
        .value
        .trim();

    const coverFile =
      $("seriesCover").files[0];

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
      } = supabase.storage
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
          description,
          cover_url: coverUrl,
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

  chaptersList.innerHTML = data
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
                  chapter.views ?? 0
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
    /*
    Si une modification est en cours,
    le bouton sert à annuler.
    */
    if (editingChapterId) {
      editingChapterId = null;
      editingChapterImageUrl = null;

      addChapterForm.reset();

      $("chapterImage").required =
        true;

      chapterSubmitBtn.textContent =
        "Publier le chapitre";

      newChapterBtn.textContent =
        "➕ Nouveau chapitre";

      chapterStatusMsg.className =
        "status";

      chapterStatusMsg.textContent =
        "";

      if (selectedSeries) {
        $("newChapterSeriesTitle")
          .textContent =
          selectedSeries.title;
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
    editingChapterImageUrl = null;

    addChapterForm.reset();

    $("chapterImage").required =
      true;

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

    await loadSoundOptions();

    showPage("new-chapter");
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
      .eq("id", chapterId)
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
      chapter.sound_url || "";

    $("chapterImage").required =
      false;

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

    /* =========================
    VALIDATION
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

    if (!content) {
      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ Le contenu est obligatoire.";

      return;
    }

    /*
    En création :
    image obligatoire.

    En modification :
    image facultative.
    */
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

          const {
            error: uploadError
          } = await supabase.storage
            .from("chapter-images")
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
          } = supabase.storage
            .from("chapter-images")
            .getPublicUrl(
              filePath
            );

          chapterImageUrl =
            publicUrlData.publicUrl;
        }

        chapterStatusMsg.textContent =
          "⏳ Mise à jour du chapitre...";

        /*
        published_at n'est PAS modifié.
        views n'est PAS modifié.
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
          updatedChapter.length === 0
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
        editingChapterImageUrl = null;

        addChapterForm.reset();

        $("chapterImage").required =
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
      CREATION
      ========================= */

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

        const {
          error: uploadError
        } = await supabase.storage
          .from("chapter-images")
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
        } = supabase.storage
          .from("chapter-images")
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
      editingChapterImageUrl = null;

      $("chapterImage").required =
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
      .eq("id", id)
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
      deletedChapter.length === 0
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

  soundsList.innerHTML = files
    .map((file) => {
      const {
        data: publicUrlData
      } = supabase.storage
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
    } = supabase.storage
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

  carouselList.innerHTML = data
    .map((slide) => {
      const typeLabel =
        slide.type === "evenement"
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
      /*
      Si une modification est en cours,
      le listener de modification
      prendra le relais.
      */
      if (
        carouselForm.dataset
          .editingId
      ) {
        return;
      }

      event.preventDefault();

      const type =
        $("carouselType").value;

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
          .value === "true";

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
            .from("chapter-images")
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
          } = supabase.storage
            .from("chapter-images")
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
          .from("carousel_slides")
          .insert({
            type,
            title,
            description:
              description || null,
            image_url:
              imageUrl,
            button_text:
              buttonText || null,
            button_url:
              buttonUrl || null,
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
      button.dataset.editCarousel;

    const {
      data: slide,
      error
    } = await supabase
      .from("carousel_slides")
      .select("*")
      .eq("id", id)
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
      slide.display_order ?? 0;

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
        $("carouselType").value;

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
          .value === "true";

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
            .from("chapter-images")
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
          } = supabase.storage
            .from("chapter-images")
            .getPublicUrl(
              filePath
            );

          imageUrl =
            publicUrlData.publicUrl;
        }

        const {
          error
        } = await supabase
          .from("carousel_slides")
          .update({
            type,
            title,
            description:
              description || null,
            image_url:
              imageUrl,
            button_text:
              buttonText || null,
            button_url:
              buttonUrl || null,
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
      .from("carousel_slides")
      .delete()
      .eq("id", id)
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
      deletedSlide.length === 0
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
