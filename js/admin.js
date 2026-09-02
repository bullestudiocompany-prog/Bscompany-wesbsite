const URL = "https://bvehhmbowizwsqrbdnwu.supabase.co"; const KEY = "sb_publishable_B4I-hDnB8ic_IRa7ZRIRMQ_zGrteY2Q";

const db = supabase.createClient(URL, KEY);

const $ = id => document.getElementById(id);

const loginSection = $("loginSection"); const adminSection = $("adminSection"); const loginForm = $("loginForm"); const loginError = $("loginError"); const logoutBtn = $("logoutBtn");

const bookForm = $("addBookForm"); const submitBtn = $("submitBtn"); const statusMsg = $("statusMsg");

function showAdmin(user) { loginSection.classList.add("hidden"); adminSection.classList.remove("hidden"); logoutBtn.classList.remove("hidden");

console.log("Connecté :", user.email); 

}

function showLogin() { loginSection.classList.remove("hidden"); adminSection.classList.add("hidden"); logoutBtn.classList.add("hidden"); }

async function checkSession() { const { data, error } = await db.auth.getSession();

if (error) { console.error(error); return; } if (data.session) { showAdmin(data.session.user); } else { showLogin(); } 

}

/* CONNEXION */

loginForm.addEventListener("submit", async e => { e.preventDefault();

const email = $("loginEmail").value.trim(); const password = $("loginPassword").value; loginError.style.color = "#3b82f6"; loginError.textContent = "⏳ Connexion..."; const { data, error } = await db.auth.signInWithPassword({ email, password }); if (error) { console.error(error); loginError.style.color = "#ef4444"; loginError.textContent = "❌ " + error.message; return; } loginError.style.color = "#22c55e"; loginError.textContent = "✅ Connexion réussie !"; showAdmin(data.user); 

});

/* DÉCONNEXION */

logoutBtn.addEventListener("click", async () => { await db.auth.signOut(); showLogin(); });

/* PUBLICATION */

bookForm.addEventListener("submit", async e => { e.preventDefault();

submitBtn.disabled = true; submitBtn.textContent = "Publication..."; statusMsg.textContent = ""; try { const file = $("coverFile").files[0]; if (!file) { throw new Error("Sélectionne une couverture."); } const title = $("title").value.trim(); const subtitle = $("subtitle").value.trim(); const author = $("author").value.trim() || "BSCompany Studio"; const type = $("type").value; const genre = $("genre").value.trim(); const status = $("status").value; const description = $("description").value.trim(); if (!title || !genre || !description) { throw new Error("Remplis tous les champs obligatoires."); } /* UPLOAD */ statusMsg.textContent = "⏳ Upload de la couverture..."; const ext = file.name.split(".").pop(); const fileName = `${Date.now()}.${ext}`; const { error: uploadError } = await db.storage .from("covers") .upload(fileName, file); if (uploadError) throw uploadError; /* URL IMAGE */ const { data: urlData } = db.storage .from("covers") .getPublicUrl(fileName); /* BASE DE DONNÉES */ statusMsg.textContent = "⏳ Ajout dans le catalogue..."; const { error: dbError } = await db .from("works") .insert({ title, subtitle, author, type, genre, status, description, cover_url: urlData.publicUrl, read_url: "#" }); if (dbError) throw dbError; /* SUCCÈS */ statusMsg.style.color = "#22c55e"; statusMsg.textContent = "✅ Œuvre publiée avec succès !"; bookForm.reset(); } catch (error) { console.error(error); statusMsg.style.color = "#ef4444"; statusMsg.textContent = "❌ " + error.message; } finally { submitBtn.disabled = false; submitBtn.textContent = "Publier le livre"; } 

});

/* SESSION */

db.auth.onAuthStateChange((event, session) => { if (session) { showAdmin(session.user); } else { showLogin(); } });

checkSession();

