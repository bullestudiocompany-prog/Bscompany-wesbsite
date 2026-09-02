window.addEventListener('supabaseReady', () => {
    const supabase = window.supabase;

    const loginSection = document.getElementById('loginSection');
    const adminSection = document.getElementById('adminSection');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');

    // 1. Vérification de la session active
    async function checkUser() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                showAdminPanel();
            } else {
                showLoginForm();
            }
        } catch (e) {
            showLoginForm();
        }
    }

    function showAdminPanel() {
        if (loginSection) loginSection.classList.add('hidden');
        if (adminSection) adminSection.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
    }

    function showLoginForm() {
        if (loginSection) loginSection.classList.remove('hidden');
        if (adminSection) adminSection.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
    }

    // 2. Gestion de la connexion
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginError.style.color = "#3b82f6";
            loginError.innerText = "Connexion en cours...";
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                loginError.style.color = "#ef4444";
                loginError.innerText = "❌ " + error.message;
            } else {
                loginError.innerText = "";
                showAdminPanel();
            }
        });
    }

    // 3. Déconnexion
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            showLoginForm();
        });
    }

    // 4. Formulaire de publication
    const addBookForm = document.getElementById('addBookForm');
    const statusMsg = document.getElementById('statusMsg');
    const submitBtn = document.getElementById('submitBtn');

    if (addBookForm) {
        addBookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.innerText = "Publication en cours...";
            if (statusMsg) statusMsg.innerText = "";

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
                if (!file) throw new Error("Veuillez choisir une couverture.");

                const fileName = `${Date.now()}.${file.name.split('.').pop()}`;

                const { error: uploadError } = await supabase.storage
                    .from('covers')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('covers')
                    .getPublicUrl(fileName);

                const { error: insertError } = await supabase
                    .from('works')
                    .insert([{
                        title, subtitle, author, type, genre, status, description,
                        cover_url: urlData.publicUrl, read_url: '#'
                    }]);

                if (insertError) throw insertError;

                if (statusMsg) {
                    statusMsg.style.color = "#22c55e";
                    statusMsg.innerText = "✅ Livre publié avec succès !";
                }
                addBookForm.reset();

            } catch (err) {
                if (statusMsg) {
                    statusMsg.style.color = "#ef4444";
                    statusMsg.innerText = "❌ Erreur : " + err.message;
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = "🚀 Publier l'œuvre";
            }
        });
    }

    checkUser();
});
function showLoginForm() {
    if (loginSection) loginSection.classList.remove('hidden');
    if (adminSection) adminSection.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
}

// 2. Formulaire de connexion
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.style.color = "#3b82f6";
        loginError.innerText = "Connexion en cours...";
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error("Erreur connexion:", error);
            loginError.style.color = "#ef4444";
            loginError.innerText = "❌ " + error.message;
        } else {
            loginError.innerText = "";
            showAdminPanel();
        }
    });
}

// 3. Déconnexion
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        showLoginForm();
    });
}

// 4. Formulaire d'ajout de livre
const addBookForm = document.getElementById('addBookForm');
const statusMsg = document.getElementById('statusMsg');
const submitBtn = document.getElementById('submitBtn');

if (addBookForm) {
    addBookForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.innerText = "Publication en cours...";
        statusMsg.innerText = "";

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
            if (!file) throw new Error("Sélectionnez une image de couverture.");

            const fileName = `${Date.now()}.${file.name.split('.').pop()}`;

            // Envoi de l'image sur Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('covers')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Récupération de l'URL publique
            const { data: urlData } = supabase.storage
                .from('covers')
                .getPublicUrl(fileName);

            // Enregistrement dans la table works
            const { error: insertError } = await supabase
                .from('works')
                .insert([{
                    title,
                    subtitle,
                    author,
                    type,
                    genre,
                    status,
                    description,
                    cover_url: urlData.publicUrl,
                    read_url: '#'
                }]);

            if (insertError) throw insertError;

            statusMsg.style.color = "#22c55e";
            statusMsg.innerText = "✅ Livre publié avec succès !";
            addBookForm.reset();

        } catch (err) {
            console.error(err);
            statusMsg.style.color = "#ef4444";
            statusMsg.innerText = "❌ Erreur : " + err.message;
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "🚀 Publier l'œuvre";
        }
    });
}

// Lancer le contrôle de session
checkUser();
