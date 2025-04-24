// app.js - Script Frontend per Il Papessone

// Configurazione API (sostituisci con l'URL della tua Web App)
const API_URL = 'https://script.google.com/macros/s/SOSTITUISCI_CON_IL_TUO_ID_DEPLOYMENT/exec';

// Token di autenticazione memorizzato localmente
let token = localStorage.getItem('token');
let currentUser = null;
let isAdmin = false;
let currentPrevisione = null;
let impostazioni = null;

// Funzione per fare richieste all'API
async function fetchAPI(endpoint, action, data = null) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint,
        action,
        token,
        data
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Errore API:', error);
    throw error;
  }
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', async () => {
    // Gestione sezioni
    setupEventListeners();
    
    // Verifica login utente
    if (token) {
        await checkAuthStatus();
    }
    
    // Carica previsioni recenti
    loadLatestPredictions();
    
    // Carica classifica se disponibile
    loadClassifica();
    
    // Popola il form delle previsioni con i cardinali
    populateCardinalSelect();
});

// FUNZIONI DI AUTENTICAZIONE

// Verifica lo stato di autenticazione
async function checkAuthStatus() {
    try {
        const data = await fetchAPI('auth', 'me');
        
        if (data.success) {
            currentUser = data.user;
            isAdmin = data.user.isAdmin;
            
            updateUIForLoggedInUser();
            
            // Se l'utente è nella sezione account, carica i dati dell'utente
            if (document.getElementById('account').classList.contains('active')) {
                loadUserData();
            }
            
            // Carica la previsione dell'utente se esiste
            loadUserPrediction();
        } else {
            // Token non valido o scaduto
            logout();
        }
    } catch (error) {
        console.error('Errore nella verifica dell\'autenticazione:', error);
        logout();
    }
}

// Login utente
async function login(email, password) {
    try {
        const data = await fetchAPI('auth', 'login', { email, password });
        
        if (data.success) {
            token = data.token;
            currentUser = data.user;
            isAdmin = data.user.isAdmin;
            
            localStorage.setItem('token', token);
            
            updateUIForLoggedInUser();
            showSection('account');
            
            showAlert('Login effettuato con successo!', 'success');
            return true;
        } else {
            showAlert(data.message || 'Errore durante il login', 'error');
            return false;
        }
    } catch (error) {
        console.error('Errore durante il login:', error);
        showAlert('Errore di connessione al server', 'error');
        return false;
    }
}

// Registrazione utente
async function register(nome, email, password) {
    try {
        const data = await fetchAPI('auth', 'register', { nome, email, password });
        
        if (data.success) {
            token = data.token;
            currentUser = data.user;
            isAdmin = data.user.isAdmin;
            
            localStorage.setItem('token', token);
            
            updateUIForLoggedInUser();
            showSection('account');
            
            showAlert('Registrazione effettuata con successo!', 'success');
            return true;
        } else {
            showAlert(data.message || 'Errore durante la registrazione', 'error');
            return false;
        }
    } catch (error) {
        console.error('Errore durante la registrazione:', error);
        showAlert('Errore di connessione al server', 'error');
        return false;
    }
}

// Login amministratore
async function adminLogin(password) {
    try {
        const data = await fetchAPI('auth', 'adminLogin', { password });
        
        if (data.success) {
            if (data.token) {
                token = data.token;
                currentUser = data.user;
                isAdmin = true;
                localStorage.setItem('token', token);
            } else {
                isAdmin = data.isAdmin;
            }
            
            document.getElementById('adminLoginForm').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            
            // Carica le impostazioni esistenti
            loadAdminSettings();
            
            showAlert('Login admin effettuato con successo!', 'success');
            return true;
        } else {
            showAlert(data.message || 'Password non valida', 'error');
            return false;
        }
    } catch (error) {
        console.error('Errore durante il login admin:', error);
        showAlert('Errore di connessione al server', 'error');
        return false;
    }
}

// Logout utente
function logout() {
    token = null;
    currentUser = null;
    isAdmin = false;
    currentPrevisione = null;
    
    localStorage.removeItem('token');
    
    // Aggiorna UI
    document.getElementById('loginBtn').textContent = 'Accedi';
    document.getElementById('notLoggedInMessage').style.display = 'block';
    document.getElementById('accountInfo').style.display = 'none';
    document.getElementById('myScommessaSection').style.display = 'none';
    
    // Torna alla home
    showSection('home');
    showAlert('Logout effettuato con successo!', 'success');
}

// FUNZIONI PER LE PREVISIONI

// Carica le previsioni recenti
async function loadLatestPredictions() {
    try {
        const data = await fetchAPI('previsioni', 'getAll');
        
        if (data.success) {
            const predictionsContainer = document.getElementById('predictionsList');
            
            if (data.previsioni && data.previsioni.length > 0) {
                predictionsContainer.innerHTML = '';
                
                // Mostra solo le ultime 5 previsioni
                const recentPredictions = data.previsioni.slice(0, 5);
                
                recentPredictions.forEach(prediction => {
                    const predictionCard = document.createElement('div');
                    predictionCard.className = 'prediction-card';
                    
                    const date = new Date(prediction.data_creazione);
                    const formattedDate = date.toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    predictionCard.innerHTML = `
                        <div class="prediction-header">
                            <h3>${prediction.nome_utente}</h3>
                            <div class="prediction-date">${formattedDate}</div>
                        </div>
                        <div class="prediction-content">
                            <h4>Cardinali</h4>
                            <div class="prediction-item">1. ${prediction.cardinale1} (5 punti)</div>
                            <div class="prediction-item">2. ${prediction.cardinale2} (3 punti)</div>
                            <div class="prediction-item">3. ${prediction.cardinale3} (1 punto)</div>
                            
                            <h4>Nomi Papali</h4>
                            <div class="prediction-item">1. ${prediction.nome1} (5 punti)</div>
                            <div class="prediction-item">2. ${prediction.nome2} (3 punti)</div>
                            <div class="prediction-item">3. ${prediction.nome3} (1 punto)</div>
                            
                            <h4>Fumata Bianca</h4>
                            <div class="prediction-item">Opzione ${prediction.fumata}</div>
                        </div>
                    `;
                    
                    predictionsContainer.appendChild(predictionCard);
                });
            } else {
                predictionsContainer.innerHTML = '<p>Nessuna previsione disponibile al momento. Sii il primo a partecipare!</p>';
            }
        }
    } catch (error) {
        console.error('Errore nel caricamento delle previsioni:', error);
    }
}

// Carica la previsione dell'utente
async function loadUserPrediction() {
    if (!token || !currentUser) return;
    
    try {
        const data = await fetchAPI('previsioni', 'getMine');
        
        if (data.success) {
            if (data.previsione) {
                currentPrevisione = data.previsione;
                
                // Aggiorna UI
                document.getElementById('noScommessaMessage').style.display = 'none';
                document.getElementById('scommessaForm').style.display = 'none';
                document.getElementById('existingScommessa').style.display = 'block';
                
                // Popola i campi
                document.getElementById('showCardinale1').textContent = currentPrevisione.cardinale1;
                document.getElementById('showCardinale2').textContent = currentPrevisione.cardinale2;
                document.getElementById('showCardinale3').textContent = currentPrevisione.cardinale3;
                document.getElementById('showNome1').textContent = currentPrevisione.nome1;
                document.getElementById('showNome2').textContent = currentPrevisione.nome2;
                document.getElementById('showNome3').textContent = currentPrevisione.nome3;
                document.getElementById('showFumata').textContent = currentPrevisione.fumata;
                
                // Controlla se siamo oltre la deadline
                checkDeadline();
            } else {
                document.getElementById('noScommessaMessage').style.display = 'block';
                document.getElementById('scommessaForm').style.display = 'none';
                document.getElementById('existingScommessa').style.display = 'none';
            }
            
            // Mostra la sezione
            document.getElementById('myScommessaSection').style.display = 'block';
        }
    } catch (error) {
        console.error('Errore nel caricamento della previsione dell\'utente:', error);
    }
}

// Salva la previsione dell'utente
async function savePrediction(formData) {
    if (!token || !currentUser) {
        showAlert('Devi effettuare l\'accesso per salvare una previsione', 'error');
        return false;
    }
    
    try {
        const action = currentPrevisione ? 'update' : 'create';
        const data = await fetchAPI('previsioni', action, formData);
        
        if (data.success) {
            // Ricarica la previsione dell'utente
            await loadUserPrediction();
            
            // Ricarica le previsioni recenti
            await loadLatestPredictions();
            
            showAlert(currentPrevisione ? 'Previsione aggiornata con successo!' : 'Previsione creata con successo!', 'success');
            return true;
        } else {
            if (data.message.includes('Termine per le modifiche scaduto')) {
                showAlert('Il termine per le modifiche è scaduto!', 'error');
            } else {
                showAlert(data.message || 'Errore durante il salvataggio della previsione', 'error');
            }
            return false;
        }
    } catch (error) {
        console.error('Errore durante il salvataggio della previsione:', error);
        showAlert('Errore di connessione al server', 'error');
        return false;
    }
}

// FUNZIONI PER LA CLASSIFICA

// Carica la classifica
async function loadClassifica() {
    try {
        const data = await fetchAPI('classifica', 'get');
        
        if (data.success) {
            // Mostra i risultati ufficiali
            document.getElementById('risultatiElezione').style.display = 'block';
            document.getElementById('risultatoCardinale').textContent = data.risultati.cardinale_eletto;
            document.getElementById('risultatoNome').textContent = data.risultati.nome_scelto;
            
            let fumataText = '';
            switch (data.risultati.fumata) {
                case 'a': fumataText = 'a) 1° giorno di conclave'; break;
                case 'b': fumataText = 'b) 2° o 3° giorno di conclave'; break;
                case 'c': fumataText = 'c) 4° o 5° giorno di conclave'; break;
                case 'd': fumataText = 'd) oltre il 5° giorno'; break;
            }
            document.getElementById('risultatoFumata').textContent = fumataText;
            
            // Popola la tabella della classifica
            const tableBody = document.getElementById('classificaBody');
            tableBody.innerHTML = '';
            
            data.classifica.forEach((item, index) => {
                const row = document.createElement('tr');
                
                const date = new Date(item.data_calcolo);
                const formattedDate = date.toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${item.nome_utente}</td>
                    <td>${item.totale} (C: ${item.punti_cardinale}, N: ${item.punti_nome}, F: ${item.punti_fumata}, B: ${item.bonus})</td>
                    <td>${formattedDate}</td>
                `;
                
                tableBody.appendChild(row);
            });
            
            document.getElementById('classificaTable').style.display = 'table';
            document.getElementById('classificaInfo').style.display = 'none';
        } else {
            document.getElementById('classificaInfo').style.display = 'block';
            document.getElementById('risultatiElezione').style.display = 'none';
            document.getElementById('classificaTable').style.display = 'none';
        }
    } catch (error) {
        console.error('Errore nel caricamento della classifica:', error);
        document.getElementById('classificaInfo').style.display = 'block';
        document.getElementById('risultatiElezione').style.display = 'none';
        document.getElementById('classificaTable').style.display = 'none';
    }
}

// FUNZIONI DI AMMINISTRAZIONE

// Carica le impostazioni per l'admin
async function loadAdminSettings() {
    if (!isAdmin) return;
    
    try {
        const data = await fetchAPI('admin', 'getSettings');
        
        if (data.success && data.impostazioni) {
            impostazioni = data.impostazioni;
            document.getElementById('deadlineDate').value = new Date(impostazioni.deadline_date).toISOString().split('T')[0];
        }
    } catch (error) {
        console.error('Errore nel caricamento delle impostazioni:', error);
    }
}

// Salva le impostazioni dell'admin
async function saveAdminSettings(deadlineDate) {
    if (!isAdmin) return false;
    
    try {
        const data = await fetchAPI('admin', 'saveSettings', { deadline_date: deadlineDate });
        
        if (data.success) {
            showAlert('Impostazioni salvate con successo!', 'success');
            return true;
        } else {
            showAlert(data.message || 'Errore durante il salvataggio delle impostazioni', 'error');
            return false;
        }
    } catch (error) {
        console.error('Errore durante il salvataggio delle impostazioni:', error);
        showAlert('Errore di connessione al server', 'error');
        return false;
    }
}

// Salva i risultati dell'elezione
async function saveRisultati(formData) {
    if (!isAdmin) return false;
    
    try {
        const data = await fetchAPI('admin', 'saveRisultati', formData);
        
        if (data.success) {
            showAlert('Risultati salvati con successo!', 'success');
            return true;
        } else {
            showAlert(data.message || 'Errore durante il salvataggio dei risultati', 'error');
            return false;
        }
    } catch (error) {
        console.error('Errore durante il salvataggio dei risultati:', error);
        showAlert('Errore di connessione al server', 'error');
        return false;
    }
}

// Calcola la classifica
async function calcolaClassifica() {
    if (!isAdmin) return false;
    
    try {
        const data = await fetchAPI('admin', 'calcolaClassifica');
        
        if (data.success) {
            showAlert('Classifica calcolata con successo!', 'success');
            return true;
        } else {
            showAlert(data.message || 'Errore durante il calcolo della classifica', 'error');
            return false;
        }
    } catch (error) {
        console.error('Errore durante il calcolo della classifica:', error);
        showAlert('Errore di connessione al server', 'error');
        return false;
    }
}

// FUNZIONI UTILITÀ

// Mostra una sezione
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });
    
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.style.display = 'block';
        selectedSection.classList.add('active');
        
        // Se è la sezione account e l'utente è loggato, carica i dati utente
        if (sectionId === 'account' && currentUser) {
            loadUserData();
            loadUserPrediction();
        }
        
        // Se è la sezione classifica, carica la classifica
        if (sectionId === 'classifica') {
            loadClassifica();
        }
    }
    
    // Chiudi sezione login e admin quando si cambia sezione
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('adminSection').style.display = 'none';
}

// Carica i dati dell'utente nella sezione account
function loadUserData() {
    if (currentUser) {
        document.getElementById('accountName').textContent = currentUser.nome;
        document.getElementById('accountEmail').textContent = currentUser.email;
        
        const regDate = new Date(currentUser.data_registrazione || Date.now());
        document.getElementById('accountRegDate').textContent = regDate.toLocaleDateString('it-IT');
        
        document.getElementById('notLoggedInMessage').style.display = 'none';
        document.getElementById('accountInfo').style.display = 'block';
        document.getElementById('myScommessaSection').style.display = 'block';
    } else {
        document.getElementById('notLoggedInMessage').style.display = 'block';
        document.getElementById('accountInfo').style.display = 'none';
        document.getElementById('myScommessaSection').style.display = 'none';
    }
}

// Aggiorna l'interfaccia per un utente loggato
function updateUIForLoggedInUser() {
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.textContent = 'Account';
    loginBtn.onclick = () => showSection('account');
}

// Popola il select dei cardinali
function populateCardinalSelect() {
    const cardinaleSelects = [
        document.getElementById('cardinale1'),
        document.getElementById('cardinale2'),
        document.getElementById('cardinale3')
    ];
    
    // Popola i select con i cardinali dalle costanti
    cardinaleSelects.forEach(select => {
        if (select) {
            CARDINALI.forEach(cardinale => {
                const option = document.createElement('option');
                option.value = cardinale;
                option.textContent = cardinale;
                select.appendChild(option);
            });
        }
    });
    
    // Gestione opzione "Altri"
    document.getElementById('cardinale1')?.addEventListener('change', function() {
        document.getElementById('altro1Container').style.display = this.value === 'Altri' ? 'block' : 'none';
    });
    
    document.getElementById('cardinale2')?.addEventListener('change', function() {
        document.getElementById('altro2Container').style.display = this.value === 'Altri' ? 'block' : 'none';
    });
    
    document.getElementById('cardinale3')?.addEventListener('change', function() {
        document.getElementById('altro3Container').style.display = this.value === 'Altri' ? 'block' : 'none';
    });
    
    // Popola le opzioni per la fumata bianca
    const fumataSelect = document.getElementById('fumata');
    if (fumataSelect) {
        OPZIONI_FUMATA.forEach(opzione => {
            const option = document.createElement('option');
            option.value = opzione.value;
            option.textContent = opzione.label;
            fumataSelect.appendChild(option);
        });
    }
}

// Mostra un messaggio di alert
function showAlert(message, type) {
    // Rimuovi alert esistenti
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Crea nuovo alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    // Inserisci dopo il primo elemento del main
    document.querySelector('main').insertBefore(alert, document.querySelector('main').firstChild);
    
    // Rimuovi dopo 5 secondi
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Verifica se siamo oltre la deadline
async function checkDeadline() {
    try {
        // Se siamo già nella cache, usiamo quello
        if (impostazioni) {
            const deadline = new Date(impostazioni.deadline_date);
            const now = new Date();
            
            if (now > deadline) {
                const editBtn = document.getElementById('editScommessaBtn');
                if (editBtn) {
                    editBtn.style.display = 'none';
                }
                showAlert('Il termine per le modifiche è scaduto!', 'error');
            }
            return;
        }
        
        // Altrimenti facciamo una chiamata API
        const data = await fetchAPI('admin', 'getSettings');
        
        if (data.success && data.impostazioni) {
            impostazioni = data.impostazioni;
            const deadline = new Date(impostazioni.deadline_date);
            const now = new Date();
            
            if (now > deadline) {
                const editBtn = document.getElementById('editScommessaBtn');
                if (editBtn) {
                    editBtn.style.display = 'none';
                }
                showAlert('Il termine per le modifiche è scaduto!', 'error');
            }
        }
    } catch (error) {
        console.error('Errore nella verifica della deadline:', error);
    }
}

// SETUP EVENT LISTENERS

function setupEventListeners() {
    // Gestione navigazione
    document.querySelectorAll('a[onclick^="showSection"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            showSection(sectionId);
        });
    });
    
    // Hamburger menu
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            document.querySelector('nav').classList.toggle('show');
        });
    }
    
    // Gestione tab login/registrati
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            document.getElementById(this.getAttribute('data-tab')).classList.add('active');
        });
    });
    
    // Click su pulsante login
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            if (currentUser) {
                showSection('account');
            } else {
                document.getElementById('authSection').style.display = 'block';
                document.getElementById('login').classList.add('active');
                document.getElementById('register').classList.remove('active');
                document.querySelector('.tab[data-tab="login"]').classList.add('active');
                document.querySelector('.tab[data-tab="register"]').classList.remove('active');
            }
        });
    }
    
    // Click su login dall'account
    const loginFromAccountBtn = document.getElementById('loginFromAccountBtn');
    if (loginFromAccountBtn) {
        loginFromAccountBtn.addEventListener('click', function() {
            document.getElementById('authSection').style.display = 'block';
        });
    }
    
    // Click su logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Click su partecipaNow
    const partecipaNowBtn = document.getElementById('partecipaNowBtn');
    if (partecipaNowBtn) {
        partecipaNowBtn.addEventListener('click', function() {
            if (currentUser) {
                showSection('account');
            } else {
                document.getElementById('authSection').style.display = 'block';
            }
        });
    }
    
    // Click su admin
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', function() {
            document.getElementById('adminSection').style.display = 'block';
            document.getElementById('adminLoginForm').style.display = 'block';
            document.getElementById('adminPanel').style.display = 'none';
        });
    }
    
    // Login form submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            if (await login(email, password)) {
                document.getElementById('authSection').style.display = 'none';
                loginForm.reset();
            }
        });
    }
    
    // Register form submit
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const nome = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                showAlert('Le password non coincidono!', 'error');
                return;
            }
            
            if (await register(nome, email, password)) {
                document.getElementById('authSection').style.display = 'none';
                registerForm.reset();
            }
        });
    }
    
    // Admin login submit
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', async function() {
            const password = document.getElementById('adminPassword').value;
            
            if (await adminLogin(password)) {
                document.getElementById('adminPassword').value = '';
            }
        });
    }
    
    // Click su createScommessa
    const createScommessaBtn = document.getElementById('createScommessaBtn');
    if (createScommessaBtn) {
        createScommessaBtn.addEventListener('click', function() {
            document.getElementById('noScommessaMessage').style.display = 'none';
            document.getElementById('scommessaForm').style.display = 'block';
            
            // Reset form
            const predictionForm = document.getElementById('predictionForm');
            if (predictionForm) {
                predictionForm.reset();
            }
        });
    }
    
    // Click su editScommessa
    const editScommessaBtn = document.getElementById('editScommessaBtn');
    if (editScommessaBtn) {
        editScommessaBtn.addEventListener('click', function() {
            document.getElementById('existingScommessa').style.display = 'none';
            document.getElementById('scommessaForm').style.display = 'block';
            
            // Popola il form con i dati esistenti
            if (currentPrevisione) {
                const cardinale1Select = document.getElementById('cardinale1');
                const cardinale2Select = document.getElementById('cardinale2');
                const cardinale3Select = document.getElementById('cardinale3');
                
                if (cardinale1Select) {
                    // Se il cardinale è nella lista, selezionalo, altrimenti seleziona "Altri"
                    if (CARDINALI.includes(currentPrevisione.cardinale1)) {
                        cardinale1Select.value = currentPrevisione.cardinale1;
                    } else {
                        cardinale1Select.value = 'Altri';
                        document.getElementById('altro1Container').style.display = 'block';
                        document.getElementById('altroCardinale1').value = currentPrevisione.cardinale1;
                    }
                }
                
                if (cardinale2Select) {
                    if (CARDINALI.includes(currentPrevisione.cardinale2)) {
                        cardinale2Select.value = currentPrevisione.cardinale2;
                    } else {
                        cardinale2Select.value = 'Altri';
                        document.getElementById('altro2Container').style.display = 'block';
                        document.getElementById('altroCardinale2').value = currentPrevisione.cardinale2;
                    }
                }
                
                if (cardinale3Select) {
                    if (CARDINALI.includes(currentPrevisione.cardinale3)) {
                        cardinale3Select.value = currentPrevisione.cardinale3;
                    } else {
                        cardinale3Select.value = 'Altri';
                        document.getElementById('altro3Container').style.display = 'block';
                        document.getElementById('altroCardinale3').value = currentPrevisione.cardinale3;
                    }
                }
                
                const nome1Input = document.getElementById('nome1');
                const nome2Input = document.getElementById('nome2');
                const nome3Input = document.getElementById('nome3');
                const fumataSelect = document.getElementById('fumata');
                
                if (nome1Input) nome1Input.value = currentPrevisione.nome1;
                if (nome2Input) nome2Input.value = currentPrevisione.nome2;
                if (nome3Input) nome3Input.value = currentPrevisione.nome3;
                if (fumataSelect) fumataSelect.value = currentPrevisione.fumata;
            }
        });
    }
    
    // Form previsione submit
    const predictionForm = document.getElementById('predictionForm');
    if (predictionForm) {
        predictionForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Raccogli dati
            let cardinale1 = document.getElementById('cardinale1').value;
            let cardinale2 = document.getElementById('cardinale2').value;
            let cardinale3 = document.getElementById('cardinale3').value;
            
            // Gestione campo "Altri"
            if (cardinale1 === 'Altri') {
                cardinale1 = document.getElementById('altroCardinale1').value;
                if (!cardinale1.trim()) {
                    showAlert('Specificare il primo cardinale', 'error');
                    return;
                }
            }
            
            if (cardinale2 === 'Altri') {
                cardinale2 = document.getElementById('altroCardinale2').value;
                if (!cardinale2.trim()) {
                    showAlert('Specificare il secondo cardinale', 'error');
                    return;
                }
            }
            
            if (cardinale3 === 'Altri') {
                cardinale3 = document.getElementById('altroCardinale3').value;
                if (!cardinale3.trim()) {
                    showAlert('Specificare il terzo cardinale', 'error');
                    return;
                }
            }
            
            const nome1 = document.getElementById('nome1').value.trim();
            const nome2 = document.getElementById('nome2').value.trim();
            const nome3 = document.getElementById('nome3').value.trim();
            const fumata = document.getElementById('fumata').value;
            
            // Validazione
            if (!nome1 || !nome2 || !nome3) {
                showAlert('Tutti i nomi papali sono obbligatori', 'error');
                return;
            }
            
            if (!fumata) {
                showAlert('Selezionare un\'opzione per la fumata bianca', 'error');
                return;
            }
            
            const formData = {
                cardinale1,
                cardinale2,
                cardinale3,
                nome1,
                nome2,
                nome3,
                fumata
            };
            
            if (await savePrediction(formData)) {
                document.getElementById('scommessaForm').style.display = 'none';
            }
        });
    }
    
    // Form risultati submit
    const risultatiForm = document.getElementById('risultatiForm');
    if (risultatiForm) {
        risultatiForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const cardinale_eletto = document.getElementById('cardinaleElettoAdmin').value.trim();
            const nome_scelto = document.getElementById('nomeSceltoPapaAdmin').value.trim();
            const fumata = document.getElementById('fumataAdmin').value;
            
            if (!cardinale_eletto || !nome_scelto || !fumata) {
                showAlert('Tutti i campi sono obbligatori', 'error');
                return;
            }
            
            const formData = {
                cardinale_eletto,
                nome_scelto,
                fumata
            };
            
            if (await saveRisultati(formData)) {
                // Ricarica classifica
                loadClassifica();
            }
        });
    }
    
    // Click su calcolaClassifica
    const calcolaClassificaBtn = document.getElementById('calcolaClassificaBtn');
    if (calcolaClassificaBtn) {
        calcolaClassificaBtn.addEventListener('click', async function() {
            if (await calcolaClassifica()) {
                // Ricarica classifica
                loadClassifica();
            }
        });
    }
    
    // Click su saveSettings
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', async function() {
            const deadlineDate = document.getElementById('deadlineDate').value;
            
            if (!deadlineDate) {
                showAlert('Selezionare una data limite', 'error');
                return;
            }
            
            if (await saveAdminSettings(deadlineDate)) {
                loadAdminSettings();
            }
        });
    }
}
