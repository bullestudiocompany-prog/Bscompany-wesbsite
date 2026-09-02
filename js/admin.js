import { supabase } from "./supabaseClient.js";

const $ = id => document.getElementById(id);

const loginSection = $("loginSection"); const adminSection = $("adminSection"); const loginForm = $("loginForm"); const loginError = $("loginError"); const logoutBtn = $("logoutBtn");

const bookForm = $("addBookForm"); const submitBtn = $("submitBtn"); const statusMsg = $("statusMsg");

function showAdmin(user) { loginSection.classList.add("hidden"); adminSection.classList.remove("hidden"); logoutBtn.classList.remove("hidden");

console.log("Connecté :", user.email); 

}

function showLogin() { loginSection.classList.remove("hidden"); adminSection.classList.add("hidden"); logoutBtn.classList.add("hidden"); }

async function checkSession() { const { data, error } = await supabase.auth.getSession();

if (error) { console.error(error); return; } if (data.session) { showAdmin(data.session.user); } else { showLogin(); } 

}

loginForm.addEventListener("submit", async e => { e.preventDefault();

loginError.textContent = "⏳ Connexion..."; loginError.style.color = "#3b82f6"; const email = $("loginEmail").value.trim(); const password = $("loginPassword").value; const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) { loginError.textContent = "❌ " + error.message; loginError.style.color = "#ef4444"; return; } loginError.textContent = "✅ Connexion réussie !"; loginError.style.color = "#22c55e"; showAdmin(data.user); 

});

logoutBtn.addEventListener("click", async () => { await supabase.auth.signOut(); showLogin(); });

bookForm.addEventListener("submit", async e => { e.preventDefault();

submitBtn.disabled = true; submitBtn.textContent = "Publication..."; statusMsg.textContent = ""; try { const file = $("coverFile").files[0]; if (!file) throw new Error("Sélectionne une couverture."); const title = $("title").value.trim(); const subtitle = $("subtitle").value.trim(); const author = $("author").value.trim() || "BSCompany Studio"; const type = $("type").value; const genre = $("genre").value.trim(); const status = $("status").value; const description = $("description").value.trim(); if (!title || !genre || !description) { throw new Error("Remplis tous les champs obligatoires."); } statusMsg.textContent = "⏳ Upload de la couverture..."; const ext = file.name.split(".").pop(); const fileName = `${Date.now()}.${ext}`; const { error: uploadError } = await supabase.storage .from("covers") .upload(fileName, file); if (uploadError) throw uploadError; const { data: urlData } = supabase.storage .from("covers") .getPublicUrl(fileName); const { error: dbError } = await supabase .from("works") .insert({ title, subtitle, author, type, genre, status, description, cover_url: urlData.publicUrl, read_url: "#" }); if (dbError) throw dbError; statusMsg.textContent = "✅ Œuvre publiée !"; statusMsg.style.color = "#22c55e"; bookForm.reset(); } catch (error) { console.error(error); statusMsg.textContent = "❌ " + error.message; statusMsg.style.color = "#ef4444"; } submitBtn.disabled = false; submitBtn.textContent = "Publier le livre"; 

});

supabase.auth.onAuthStateChange((event, session) => { if (session) showAdmin(session.user); else showLogin(); });

checkSession();

