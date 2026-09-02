import { supabase } from './supabaseClient.js';

const loginSection = document.getElementById('loginSection');
const adminSection = document.getElementById('adminSection');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// 1. Vérifier au chargement si l'utilisateur est déjà connecté
async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        showAdminPanel();
    } else {
        showLoginForm();
    }
}

function showAdminPanel() {
    loginSection.classList.add('hidden');
    adminSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
}

function showLoginForm() {
    loginSection.classList.remove('hidden');
    adminSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
}

// 2. Gestion de la connexion
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.innerText = "";
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        loginError.innerText = "❌ Identifiants incorrects.";
    } else {
        showAdminPanel();
    }
});

// 3. Déconnexion
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    showLoginForm();
});

// 4. Gestion de l'envoi de livre (Code de publication)
const addBookForm = document.getElementById('addBookForm');
const statusMsg = document.getElementById('statusMsg');
const submitBtn = document.getElementById('submitBtn');

addBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerText = "Publication en cours...";

    try {
        const title = document.getElementById('title').value;
        const subtitle = document.getElementById('subtitle').value;
        const author = document.getElementById('author').value || 'BSCompany Studio';
        const type = document.getElementById('type').value;
        const genre = document.getElementById('genre').value;
        const status = document.getElementById('status').value;
        const description = document.getElementById('description').value;
        const fileInput = document.getElementById('coverFile');

        const file = fileInput.files[0];
        const fileName = `${Date.now()}.${file.name.split('.').pop()}`;

        // Upload de la couverture
        const { error: uploadError } = await supabase.storage.from('covers').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('covers').getPublicUrl(fileName);

        // Insertion dans la BDD
        const { error: insertError } = await supabase.from('works').insert([{
            title, subtitle, author, type, genre, status, description,
            cover_url: urlData.publicUrl, read_url: '#'
        }]);

        if (insertError) throw insertError;

        statusMsg.style.color = "#4ade80";
        statusMsg.innerText = "✅ Livre publié avec succès !";
        addBookForm.reset();

    } catch (err) {
        statusMsg.style.color = "#f87171";
        statusMsg.innerText = "❌ Erreur : " + err.message;
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "🚀 Publier l'œuvre";
    }
});

checkUser();

