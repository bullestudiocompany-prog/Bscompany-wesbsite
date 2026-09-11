import { supabase } from "./supabaseClient.js";

const $ = (selector) => document.querySelector(selector);

const loginSection = $("loginSection");
const adminSection = $("adminSection");
const loginForm = $("loginForm");
const loginError = $("loginError");
const logoutBtn = $("logoutBtn");

const seriesList = $("seriesList");
const addSeriesForm = $("addSeriesForm");
const seriesSubmitBtn = $("seriesSubmitBtn");
const seriesStatusMsg = $("seriesStatusMsg");

const chaptersList = $("chaptersList");
const selectedSeriesTitle = $("selectedSeriesTitle");
const chapterSeriesDescription = $("chapterSeriesDescription");
const newChapterBtn = $("newChapterBtn");

const addChapterForm = $("addChapterForm");
const chapterSubmitBtn = $("chapterSubmitBtn");
const chapterStatusMsg = $("chapterStatusMsg");
const chapterSound = $("chapterSound");
const chapterImage = $("chapterImage");
const chapterImageInfo = $("chapterImageInfo");

const chapterFormTitle = $("chapterFormTitle");
const chapterFormDescription = $("chapterFormDescription");
const cancelChapterEditBtn = $("cancelChapterEditBtn");
const chapterFormBox = $("chapterFormBox");

const soundForm = $("soundForm");
const soundSubmitBtn = $("soundSubmitBtn");
const soundStatusMsg = $("soundStatusMsg");
const soundsList = $("soundsList");

const seriesCount = $("seriesCount");
const chaptersCount = $("chaptersCount");
const soundsCount = $("soundsCount");

let currentUser = null;
let selectedSeries = null;
let editingChapterId = null;
let editingChapterImageUrl = null;


function showPage(pageName) {
  document
    .querySelectorAll(".page")
    .forEach((page) => {
      page.classList.remove("active");
    });

  const page = $(`#page-${pageName}`);

  if (page) {
    page.classList.add("active");
  }

  document
    .querySelectorAll(".nav button")
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


function showLogin() {
  loginSection.classList.remove("hidden");
  adminSection.classList.add("hidden");
}


function showAdmin() {
  loginSection.classList.add("hidden");
  adminSection.classList.remove("hidden");

  loadDashboard();
  loadSeries();
}


function setStatus(element, message, type = "") {
  element.textContent = message;
  element.className = `status ${type}`;
}


function escapeHTML(value) {
  return String(value ?? "")
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


function formatChapterLabel(label, fallbackNumber = "") {
  const value = String(label ?? "").trim();

  if (!value) {
    return fallbackNumber
      ? `Chapitre ${fallbackNumber}`
      : "Chapitre";
  }

  if (
    value.toLowerCase() === "prologue"
  ) {
    return "Prologue";
  }

  if (
    value.toLowerCase().startsWith("chapitre")
  ) {
    return value;
  }

  return `Chapitre ${value}`;
}


document.addEventListener(
  "click",
  (event) => {
    const button =
      event.target.closest("[data-page]");

    if (!button) {
      return;
    }

    showPage(button.dataset.page);
  }
);


loginForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    loginError.textContent = "";

    const email =
      $("#loginEmail").value.trim();

    const password =
      $("#loginPassword").value;

    const {
      data,
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      loginError.textContent =
        error.message;

      return;
    }

    currentUser = data.user;

    showAdmin();
  }
);


logoutBtn.addEventListener(
  "click",
  async () => {
    await supabase.auth.signOut();

    currentUser = null;
    selectedSeries = null;
    editingChapterId = null;

    showLogin();
  }
);


async function checkSession() {
  const {
    data,
    error
  } = await supabase.auth.getSession();

  if (error) {
    showLogin();
    return;
  }

  if (data.session) {
    currentUser = data.session.user;
    showAdmin();
  } else {
    showLogin();
  }
}


supabase.auth.onAuthStateChange(
  (event, session) => {
    if (session) {
      currentUser = session.user;
      showAdmin();
    } else {
      currentUser = null;
      showLogin();
    }
  }
);


async function loadDashboard() {
  const {
    count: seriesTotal
  } = await supabase
    .from("series")
    .select("*", {
      count: "exact",
      head: true
    });

  const {
    count: chaptersTotal
  } = await supabase
    .from("chapters")
    .select("*", {
      count: "exact",
      head: true
    });

  const {
    data: soundFiles
  } = await supabase.storage
    .from("sounds")
    .list();

  seriesCount.textContent =
    seriesTotal || 0;

  chaptersCount.textContent =
    chaptersTotal || 0;

  soundsCount.textContent =
    soundFiles?.length || 0;
}


async function loadSeries() {
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
    seriesList.innerHTML = `
      <div class="item">
        <p class="error">
          Erreur : ${escapeHTML(error.message)}
        </p>
      </div>
    `;

    return;
  }

  if (!data?.length) {
    seriesList.innerHTML = `
      <div class="item">
        Aucune œuvre.
      </div>
    `;

    return;
  }

  seriesList.innerHTML =
    data.map((series) => `
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
              ${escapeHTML(series.title)}
            </div>

            <div class="item-meta">
              Type :
              ${escapeHTML(series.type || "—")}
              <br>

              Statut :
              ${escapeHTML(series.status || "—")}
            </div>

          </div>

        </div>


        <div class="item-actions">

          <button
            data-open-series="${escapeAttribute(
              series.id
            )}"
          >
            📖 Chapitres
          </button>

          <button
            class="danger"
            data-delete-series="${escapeAttribute(
              series.id
            )}"
          >
            🗑 Supprimer
          </button>

        </div>

      </div>
    `).join("");
}


document.addEventListener(
  "click",
  async (event) => {

    const openButton =
      event.target.closest(
        "[data-open-series]"
      );

    if (openButton) {
      await openSeries(
        openButton.dataset.openSeries
      );

      return;
    }

    const deleteButton =
      event.target.closest(
        "[data-delete-series]"
      );

    if (deleteButton) {
      await deleteSeries(
        deleteButton.dataset.deleteSeries
      );
    }
  }
);


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
    alert(
      "Erreur : " +
      error.message
    );

    return;
  }

  selectedSeries = data;

  selectedSeriesTitle.textContent =
    data.title || "—";

  chapterSeriesDescription.textContent =
    data.description || "Gestion des chapitres.";

  await loadChapters();

  showPage("chapters");
}


async function deleteSeries(seriesId) {
  const confirmed =
    confirm(
      "Supprimer définitivement cette œuvre et ses chapitres ?"
    );

  if (!confirmed) {
    return;
  }

  const {
    error
  } = await supabase
    .from("series")
    .delete()
    .eq("id", seriesId);

  if (error) {
    alert(
      "Erreur : " +
      error.message
    );

    return;
  }

  if (
    selectedSeries &&
    selectedSeries.id === seriesId
  ) {
    selectedSeries = null;
  }

  await loadSeries();
  await loadDashboard();
}


addSeriesForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!currentUser) {
      setStatus(
        seriesStatusMsg,
        "Session invalide.",
        "error"
      );

      return;
    }

    seriesSubmitBtn.disabled = true;

    setStatus(
      seriesStatusMsg,
      "Création de l'œuvre...",
      "info"
    );

    try {
      const title =
        $("#seriesTitle")
          .value
          .trim();

      const type =
        $("#seriesType").value;

      const genre =
        $("#seriesGenre")
          .value
          .trim();

      const status =
        $("#seriesStatus").value;

      const description =
        $("#seriesDescription")
          .value
          .trim();

      const coverFile =
        $("#seriesCover").files[0];

      if (!title || !description) {
        throw new Error(
          "Le titre et la description sont obligatoires."
        );
      }

      if (!coverFile) {
        throw new Error(
          "La couverture est obligatoire."
        );
      }

      const slug =
        createSlug(title);

      const extension =
        coverFile.name
          .split(".")
          .pop()
          .toLowerCase();

      const fileName =
        `${crypto.randomUUID()}.${extension}`;

      const filePath =
        `${slug}/${fileName}`;

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
        data: publicData
      } = supabase.storage
        .from("Cover series")
        .getPublicUrl(filePath);

      const coverUrl =
        publicData.publicUrl;

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
          author_id: currentUser.id,
          genre: genre || null
        });

      if (insertError) {
        throw insertError;
      }

      addSeriesForm.reset();

      setStatus(
        seriesStatusMsg,
        "Œuvre publiée avec succès.",
        "success"
      );

      await loadSeries();
      await loadDashboard();

    } catch (error) {
      setStatus(
        seriesStatusMsg,
        "Erreur : " +
          error.message,
        "error"
      );
    } finally {
      seriesSubmitBtn.disabled = false;
    }
  }
);


async function loadChapters() {
  if (!selectedSeries) {
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
    chaptersList.innerHTML = `
      <div class="item">
        <p class="error">
          Erreur :
          ${escapeHTML(error.message)}
        </p>
      </div>
    `;

    return;
  }

  if (!data?.length) {
    chaptersList.innerHTML = `
      <div class="item">
        Aucun chapitre pour cette œuvre.
      </div>
    `;

    return;
  }

  chaptersList.innerHTML =
    data.map((chapter) => {

      const displayLabel =
        formatChapterLabel(
          chapter.chapter_label,
          chapter.chapter_number
        );

      const published =
        chapter.published_at
          ? new Date(
              chapter.published_at
            ).toLocaleString("fr-FR")
          : "Non publié";

      return `
        <div class="item">

          <div class="item-info">

            <div class="item-title">
              ${escapeHTML(displayLabel)}
              ${
                chapter.title
                  ? ` — ${escapeHTML(
                      chapter.title
                    )}`
                  : ""
              }
            </div>

            <div class="item-meta">

              ${escapeHTML(published)}

              <br>

              👁️ Vues :
              ${Number(
                chapter.views || 0
              )}

              <br>

              ${
                chapter.sound_url
                  ? "🎵 Son associé"
                  : "🔇 Aucun son"
              }

              <br>

              ${
                chapter.chapter_image_url
                  ? "🖼️ Image du chapitre disponible"
                  : "⚠️ Aucune image"
              }

            </div>

          </div>


          <div class="item-actions">

            <button
              data-edit-chapter="${escapeAttribute(
                chapter.id
              )}"
            >
              ✏️ Modifier
            </button>

            <button
              class="danger"
              data-delete-chapter="${escapeAttribute(
                chapter.id
              )}"
            >
              🗑 Supprimer
            </button>

          </div>

        </div>
      `;
    }).join("");
}


newChapterBtn.addEventListener(
  "click",
  async () => {
    if (!selectedSeries) {
      alert(
        "Sélectionne d'abord une œuvre."
      );

      return;
    }

    resetChapterForm();

    $("#newChapterSeriesTitle")
      .textContent =
      selectedSeries.title;

    await loadSoundOptions();

    showPage("new-chapter");
  }
);


document.addEventListener(
  "click",
  async (event) => {

    const editButton =
      event.target.closest(
        "[data-edit-chapter]"
      );

    if (editButton) {
      await editChapter(
        editButton.dataset.editChapter
      );

      return;
    }

    const deleteButton =
      event.target.closest(
        "[data-delete-chapter]"
      );

    if (deleteButton) {
      await deleteChapter(
        deleteButton.dataset.deleteChapter
      );
    }
  }
);


async function editChapter(chapterId) {
  if (!selectedSeries) {
    return;
  }

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
      published_at,
      views,
      sound_url
    `)
    .eq("id", chapterId)
    .single();

  if (error) {
    alert(
      "Erreur : " +
      error.message
    );

    return;
  }

  editingChapterId =
    chapter.id;

  editingChapterImageUrl =
    chapter.chapter_image_url || null;

  $("#chapterNumber").value =
    chapter.chapter_number ?? "";

  $("#chapterLabel").value =
    chapter.chapter_label ?? "";

  $("#chapterTitle").value =
    chapter.title ?? "";

  $("#chapterContent").value =
    chapter.content ?? "";

  chapterImage.value = "";

  chapterImageInfo.textContent =
    editingChapterImageUrl
      ? "🖼️ Une image existe déjà. Laisse le champ vide pour la conserver."
      : "Aucune image existante.";

  chapterSubmitBtn.textContent =
    "💾 Enregistrer les modifications";

  cancelChapterEditBtn.classList.remove(
    "hidden"
  );

  chapterFormTitle.textContent =
    "Modifier le chapitre";

  chapterFormDescription.textContent =
    "Modifie les informations du chapitre.";

  chapterFormBox.classList.add(
    "edit-mode"
  );

  $("#newChapterSeriesTitle")
    .textContent =
    selectedSeries.title;

  await loadSoundOptions(
    chapter.sound_url || ""
  );

  showPage("new-chapter");
}


function resetChapterForm() {
  editingChapterId = null;
  editingChapterImageUrl = null;

  addChapterForm.reset();

  chapterImageInfo.textContent = "";

  chapterSubmitBtn.textContent =
    "Publier le chapitre";

  cancelChapterEditBtn.classList.add(
    "hidden"
  );

  chapterFormTitle.textContent =
    "Nouveau chapitre";

  chapterFormDescription.textContent =
    "Ajoute un chapitre à l'œuvre sélectionnée.";

  chapterFormBox.classList.remove(
    "edit-mode"
  );

  chapterStatusMsg.textContent = "";
  chapterStatusMsg.className =
    "status";
}


cancelChapterEditBtn.addEventListener(
  "click",
  () => {
    resetChapterForm();

    if (selectedSeries) {
      showPage("chapters");
    }
  }
);


async function loadSoundOptions(
  selectedSoundUrl = ""
) {
  chapterSound.innerHTML = `
    <option value="">
      Aucun son
    </option>
  `;

  const {
    data,
    error
  } = await supabase.storage
    .from("sounds")
    .list();

  if (error) {
    console.error(
      "Erreur sons :",
      error
    );

    return;
  }

  if (!data?.length) {
    return;
  }

  data
    .filter(
      (file) =>
        file.name &&
        !file.name.endsWith("/")
    )
    .forEach((file) => {

      const {
        data: publicData
      } = supabase.storage
        .from("sounds")
        .getPublicUrl(file.name);

      const option =
        document.createElement(
          "option"
        );

      option.value =
        publicData.publicUrl;

      option.textContent =
        file.name;

      if (
        selectedSoundUrl &&
        selectedSoundUrl ===
          publicData.publicUrl
      ) {
        option.selected = true;
      }

      chapterSound.appendChild(
        option
      );
    });
}


addChapterForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!selectedSeries) {
      setStatus(
        chapterStatusMsg,
        "Aucune œuvre sélectionnée.",
        "error"
      );

      return;
    }

    chapterSubmitBtn.disabled = true;

    setStatus(
      chapterStatusMsg,
      editingChapterId
        ? "Enregistrement des modifications..."
        : "Publication du chapitre...",
      "info"
    );

    try {
      const chapterNumber =
        Number(
          $("#chapterNumber").value
        );

      const chapterLabel =
        $("#chapterLabel")
          .value
          .trim();

      const title =
        $("#chapterTitle")
          .value
          .trim();

      const content =
        $("#chapterContent")
          .value
          .trim();

      const soundUrl =
        chapterSound.value || null;

      const imageFile =
        chapterImage.files[0];

      if (
        !Number.isFinite(
          chapterNumber
        ) ||
        chapterNumber < 1
      ) {
        throw new Error(
          "Le numéro interne doit être supérieur ou égal à 1."
        );
      }

      if (!chapterLabel) {
        throw new Error(
          "Le numéro ou libellé affiché est obligatoire."
        );
      }

      if (!title) {
        throw new Error(
          "Le titre du chapitre est obligatoire."
        );
      }

      if (!content) {
        throw new Error(
          "Le contenu du chapitre est obligatoire."
        );
      }

      if (imageFile) {
        if (
          !imageFile.type.startsWith(
            "image/"
          )
        ) {
          throw new Error(
            "Le fichier sélectionné doit être une image."
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
      }

      let chapterImageUrl =
        editingChapterImageUrl;

      if (imageFile) {
        const extension =
          imageFile.name
            .split(".")
            .pop()
            .toLowerCase();

        const fileName =
          `${crypto.randomUUID()}.${extension}`;

        const filePath =
          `${selectedSeries.id}/${fileName}`;

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
          data: publicData
        } = supabase.storage
          .from("chapter-images")
          .getPublicUrl(
            filePath
          );

        chapterImageUrl =
          publicData.publicUrl;
      }

      if (editingChapterId) {

        const updateData = {
          chapter_number:
            chapterNumber,

          chapter_label:
            chapterLabel,

          title,

          content,

          sound_url:
            soundUrl,

          chapter_image_url:
            chapterImageUrl
        };

        const {
          error: updateError
        } = await supabase
          .from("chapters")
          .update(updateData)
          .eq(
            "id",
            editingChapterId
          );

        if (updateError) {
          throw updateError;
        }

        setStatus(
          chapterStatusMsg,
          "Chapitre modifié avec succès.",
          "success"
        );

      } else {

        if (!imageFile) {
          throw new Error(
            "L'image du chapitre est obligatoire pour un nouveau chapitre."
          );
        }

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
              soundUrl,

            published_at:
              new Date().toISOString(),

            views: 0
          });

        if (insertError) {
          throw insertError;
        }

        setStatus(
          chapterStatusMsg,
          "Chapitre publié avec succès.",
          "success"
        );
      }

      await loadChapters();
      await loadDashboard();

      if (editingChapterId) {
        resetChapterForm();
        showPage("chapters");
      } else {
        addChapterForm.reset();
        chapterImageInfo.textContent = "";
      }

    } catch (error) {
      setStatus(
        chapterStatusMsg,
        "Erreur : " +
          error.message,
        "error"
      );
    } finally {
      chapterSubmitBtn.disabled = false;
    }
  }
);


async function deleteChapter(
  chapterId
) {
  const confirmed =
    confirm(
      "Supprimer définitivement ce chapitre ?\n\nCette action est irréversible."
    );

  if (!confirmed) {
    return;
  }

  const {
    error
  } = await supabase
    .from("chapters")
    .delete()
    .eq(
      "id",
      chapterId
    );

  if (error) {
    alert(
      "Erreur : " +
      error.message
    );

    return;
  }

  if (
    editingChapterId ===
    chapterId
  ) {
    resetChapterForm();
  }

  await loadChapters();
  await loadDashboard();
}


soundForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const file =
      $("#soundFile").files[0];

    if (!file) {
      setStatus(
        soundStatusMsg,
        "Sélectionne un fichier audio.",
        "error"
      );

      return;
    }

    soundSubmitBtn.disabled = true;

    setStatus(
      soundStatusMsg,
      "Ajout du son...",
      "info"
    );

    try {
      const safeName =
        file.name
          .toLowerCase()
          .replace(
            /[^a-z0-9._-]/g,
            "_"
          );

      const fileName =
        `${Date.now()}_${crypto.randomUUID()}_${safeName}`;

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

      soundForm.reset();

      setStatus(
        soundStatusMsg,
        "Son ajouté avec succès.",
        "success"
      );

      await loadSounds();
      await loadDashboard();
      await loadSoundOptions();

    } catch (error) {
      setStatus(
        soundStatusMsg,
        "Erreur : " +
          error.message,
        "error"
      );
    } finally {
      soundSubmitBtn.disabled = false;
    }
  }
);


async function loadSounds() {
  soundsList.innerHTML =
    "Chargement...";

  const {
    data,
    error
  } = await supabase.storage
    .from("sounds")
    .list();

  if (error) {
    soundsList.innerHTML = `
      <div class="item">
        <p class="error">
          Erreur :
          ${escapeHTML(error.message)}
        </p>
      </div>
    `;

    return;
  }

  const files =
    (data || []).filter(
      (file) =>
        file.name &&
        !file.name.endsWith("/")
    );

  if (!files.length) {
    soundsList.innerHTML = `
      <div class="item">
        Aucun son.
      </div>
    `;

    return;
  }

  soundsList.innerHTML =
    files.map((file) => {

      const {
        data: publicData
      } = supabase.storage
        .from("sounds")
        .getPublicUrl(
          file.name
        );

      return `
        <div class="item">

          <div class="sound-row">

            <div class="sound-name">
              ${escapeHTML(
                file.name
              )}
            </div>

            <audio
              controls
              src="${escapeAttribute(
                publicData.publicUrl
              )}"
            ></audio>

            <button
              class="danger"
              data-delete-sound="${escapeAttribute(
                file.name
              )}"
            >
              🗑 Supprimer
            </button>

          </div>

        </div>
      `;
    }).join("");
}


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

    const confirmed =
      confirm(
        `Supprimer le son "${fileName}" ?`
      );

    if (!confirmed) {
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
      alert(
        "Erreur : " +
          error.message
      );

      return;
    }

    await loadSounds();
    await loadDashboard();
    await loadSoundOptions();
  }
);


async function start() {
  await checkSession();
}


start();
