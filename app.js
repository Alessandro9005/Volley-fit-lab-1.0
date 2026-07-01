// app.js - Logica Applicativa di Volley Fit Lab

// Diagnostica globale degli errori per facilitare il debugging in produzione
window.onerror = function(message, source, lineno, colno, error) {
  const cleanSource = source ? source.split('/').pop() : 'sconosciuto';
  alert("Diagnostica Errore Globale:\n" + message + "\nFile: " + cleanSource + "\nRiga: " + lineno + ":" + colno);
  return false;
};
window.onunhandledrejection = function(event) {
  alert("Diagnostica Promessa Fallita:\n" + event.reason);
};

const SUPABASE_URL = 'https://xabynxzwpipqdbxjfudx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYnlueHp3cGlwcWRieGpmdWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MDg4MzksImV4cCI6MjA5ODM4NDgzOX0.Vv1LdoC8a9ykpQ_LrygMv9y38kGTeCRadlRoDbGcf7g';
let supabaseClient = null;
let cloudSyncAvailable = true;
if (window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (err) {
    console.error("Errore inizializzazione Supabase (verificare la chiave API):", err);
  }
}

let db = loadDatabase();
let activeAthleteId = 'athlete-1';
let activeClientAthleteId = 'athlete-1';
let activeTrainerTab = 'tab-profile';
let workoutTimerInterval = null;
let workoutSeconds = 0;

// Riferimenti ai grafici per distruggerli prima di ricrearli
let charts = {};

function safeCreateIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function escapeJsArg(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}

function getAthletes() {
  if (!db || !Array.isArray(db.athletes)) {
    db = loadDatabase();
  }
  return Array.isArray(db.athletes) ? db.athletes : [];
}

function getActiveAthlete() {
  const athletes = getAthletes();
  return athletes.find(a => a.id === activeAthleteId) || athletes[0] || null;
}

function getAthleteAge(athlete) {
  if (!athlete) return '';
  if (athlete.birthdate) {
    const birthDate = new Date(athlete.birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
  return athlete.age || '';
}

function getAthleteBirthdate(athlete) {
  if (!athlete) return '';
  if (athlete.birthdate) return athlete.birthdate;
  if (athlete.age) {
    const currentYear = new Date().getFullYear();
    const estYear = currentYear - athlete.age;
    return `${estYear}-01-01`;
  }
  return '';
}

window.onDatabaseSaveCallback = (data) => {
  if (cloudSyncAvailable) {
    uploadAllToSupabase();
  }
};

// Intercettore di salvataggio per inserire automaticamente i timestamp di modifica
const originalSaveDatabase = saveDatabase;
saveDatabase = function(data, options = {}) {
  if (data && Array.isArray(data.athletes)) {
    if (typeof activeAthleteId !== 'undefined' && activeAthleteId) {
      const activeAthlete = data.athletes.find(a => a.id === activeAthleteId);
      if (activeAthlete) {
        activeAthlete.updatedAt = Date.now();
      }
    }
    if (typeof activeClientAthleteId !== 'undefined' && activeClientAthleteId) {
      const activeClientAthlete = data.athletes.find(a => a.id === activeClientAthleteId);
      if (activeClientAthlete) {
        activeClientAthlete.updatedAt = Date.now();
      }
    }
  }
  originalSaveDatabase(data, options);
};

// Esegui all'avvio
document.addEventListener('DOMContentLoaded', () => {
  try {
    initApp();
  } catch (err) {
    console.error("Errore fatale all'avvio dell'app:", err);
    alert("Errore fatale all'avvio dell'applicazione: " + err.message + "\n\nSei pregato di incollare questo errore al bot per risolverlo.");
  }
});

function initApp() {
  // Inizializza le icone Lucide
  safeCreateIcons();

  // Imposta eventi di navigazione principali (Trainer vs Client)
  document.getElementById('btn-view-trainer').addEventListener('click', () => switchView('trainer'));
  document.getElementById('btn-view-client').addEventListener('click', () => switchView('client'));

  // Imposta eventi tab trainer
  const tabButtons = document.querySelectorAll('.trainer-tabs .tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabId = btn.getAttribute('data-tab');
      switchTrainerTab(tabId);
    });
  });

  // Eventi Modulo Atleta
  document.getElementById('btn-add-athlete').addEventListener('click', () => openModal('modal-athlete'));
  document.getElementById('form-new-athlete').addEventListener('submit', handleAddAthlete);
  
  // Eventi Profilo Atleta
  document.getElementById('form-anthropometrics').addEventListener('submit', handleSaveAnthropometrics);
  document.getElementById('form-edit-profile').addEventListener('submit', handleSaveProfileEdit);
  document.getElementById('btn-add-test-results').addEventListener('click', () => {
    // Imposta la data odierna nel form
    document.getElementById('test-input-date').value = new Date().toISOString().split('T')[0];
    openModal('modal-test');
  });
  document.getElementById('form-new-test').addEventListener('submit', handleSaveTests);
  document.getElementById('form-single-test').addEventListener('submit', handleSaveSingleTest);

  // Eventi Programma (Macrociclo)
  document.getElementById('btn-add-seduta').addEventListener('click', handleAddSeduta);
  document.getElementById('btn-back-to-macrociclo').addEventListener('click', () => switchProgramView('list'));
  document.getElementById('btn-save-seduta-only').addEventListener('click', () => saveActiveSeduta(false));
  document.getElementById('btn-save-and-send-seduta').addEventListener('click', () => saveActiveSeduta(true));
  document.getElementById('btn-add-exercise-to-program').addEventListener('click', addExerciseRowToBuilder);

  // Eventi Portale Atleta (Client)
  document.getElementById('btn-client-submit-workout').addEventListener('click', submitClientWorkout);

  // Carica i dati iniziali
  renderAthleteList();
  selectAthlete(activeAthleteId);
  renderClientSelector();
  renderNotifications();
  
  // Verifica se è stato passato un atleta nell'URL per bloccare l'app sul Portale Atleta
  const urlParams = new URLSearchParams(window.location.search);
  const athParam = urlParams.get('ath') || urlParams.get('athlete');
  if (athParam) {
    const athletes = getAthletes();
    const matched = athletes.find(a => a.id === athParam || a.name.toLowerCase() === athParam.toLowerCase());
    if (matched) {
      activeClientAthleteId = matched.id;
    }
    switchView('client');
    const viewSelector = document.querySelector('.view-selector');
    if (viewSelector) viewSelector.style.display = 'none';
    const logoutBtn = document.getElementById('btn-coach-logout');
    if (logoutBtn) logoutBtn.style.display = 'none';
    const notificationsBtn = document.getElementById('btn-notifications');
    if (notificationsBtn) notificationsBtn.style.display = 'none';
  } else {
    // Vista Coach: controlla se è autenticato
    const isAuth = sessionStorage.getItem('fitfeedback_coach_authenticated') === 'true';
    if (!isAuth) {
      showCoachPasswordPrompt();
    }
  }
  
  // Ricarica la vista client iniziale
  initClientPortal();

  // Avvia sincronizzazione asincrona iniziale con Supabase (Cloud Database) dopo 2 secondi
  // per permettere alla UI locale di renderizzarsi all'istante all'avvio.
  if (supabaseClient) {
    setTimeout(() => {
      syncWithSupabase();
    }, 2000);

    // Imposta polling silenzioso in background ogni 15 secondi per allineamento real-time
    setInterval(() => {
      syncWithSupabaseSilent();
    }, 15000);
  }
}

// Switch delle Viste Principali (Trainer vs Cliente)
function switchView(viewName) {
  const btnTrainer = document.getElementById('btn-view-trainer');
  const btnClient = document.getElementById('btn-view-client');
  const viewTrainer = document.getElementById('view-trainer');
  const viewClient = document.getElementById('view-client');

  if (viewName === 'trainer') {
    btnTrainer.classList.add('active');
    btnClient.classList.remove('active');
    viewTrainer.classList.add('active');
    viewClient.classList.remove('active');
    stopWorkoutTimer();
    
    // Aggiorna i dati della dashboard preparatore se ci sono stati inserimenti lato client
    db = loadDatabase();
    renderAthleteList();
    selectAthlete(activeAthleteId);
    renderNotifications();
  } else {
    btnTrainer.classList.remove('active');
    btnClient.classList.add('active');
    btnClient.classList.add('client-active');
    viewTrainer.classList.remove('active');
    viewClient.classList.add('active');
    
    // Inizializza portale atleta
    initClientPortal();
  }
}

// Switch delle Tab della Dashboard
function switchTrainerTab(tabId) {
  activeTrainerTab = tabId;
  const tabButtons = document.querySelectorAll('.trainer-tabs .tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  tabPanels.forEach(panel => {
    if (panel.id === tabId) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  if (tabId === 'tab-analytics') {
    renderAnalyticsCharts();
  }
}

// Gestione Modali
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// ==========================================================================
// SEZIONE TRAINER - GESTIONE ATLETI & RENDERING
// ==========================================================================

function renderAthleteList() {
  const container = document.getElementById('athlete-list-container');
  container.innerHTML = '';

  getAthletes().forEach(athlete => {
    const card = document.createElement('div');
    card.className = `athlete-card ${athlete.id === activeAthleteId ? 'active' : ''}`;
    card.setAttribute('data-id', athlete.id);
    
    let hasAlert = false;
    if (athlete.history && athlete.history.length > 0) {
      const lastWorkout = athlete.history[0];
      hasAlert = (lastWorkout.exercises || []).some(ex => ex.notes && (ex.notes.toLowerCase().includes('dolore') || ex.notes.toLowerCase().includes('male') || ex.notes.toLowerCase().includes('fastidio')));
    }

    const genderText = athlete.gender === 'M' ? 'M' : 'F';

    card.innerHTML = `
      <div class="athlete-card-name">${escapeHtml(athlete.name)}</div>
      <div class="athlete-card-details">
        <div>Età: <strong>${getAthleteAge(athlete)} anni</strong> | Genere: <strong>${escapeHtml(genderText)}</strong></div>
        <div>Ruolo: <strong>${escapeHtml(athlete.ruolo)}</strong></div>
        <div>Squadra: <strong>${escapeHtml(athlete.sport)}</strong></div>
      </div>
      <span class="athlete-card-badge ${hasAlert ? 'badge-alert' : 'badge-ok'}">
        ${hasAlert ? 'Attenzione Dolore' : 'In Regola'}
      </span>
    `;

    card.addEventListener('click', () => selectAthlete(athlete.id));
    container.appendChild(card);
  });
}
function selectAthlete(athleteId) {
  const athletes = getAthletes();
  const athlete = athletes.find(a => a.id === athleteId) || athletes[0] || null;
  if (!athlete) {
    activeAthleteId = '';
    renderAthleteHeader(null);
    const anthroForm = document.getElementById('form-anthropometrics');
    if (anthroForm) anthroForm.reset();
    const fields = ['test-val-squat', 'test-val-powerclean', 'test-val-pushpress', 'test-val-deadlift', 'test-val-cmj', 'test-val-broadjump', 'test-val-spikejump', 'test-val-sprint10m'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = '--';
    });
    const macroSelector = document.getElementById('macrociclo-selector');
    if (macroSelector) macroSelector.innerHTML = '';
    const macroList = document.getElementById('macrociclo-list');
    if (macroList) macroList.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted);">Nessun atleta selezionato.</div>';
    const historyContainer = document.getElementById('history-container');
    if (historyContainer) historyContainer.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted);">Nessun atleta selezionato.</div>';
    if (activeTrainerTab === 'tab-analytics') {
      renderAnalyticsCharts();
    }
    return;
  }

  activeAthleteId = athlete.id;
  
  const cards = document.querySelectorAll('.athlete-card');
  cards.forEach(card => {
    if (card.getAttribute('data-id') === activeAthleteId) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  renderAthleteHeader(athlete);
  fillAnthropometricsForm(athlete);
  renderTestResults(athlete);
  renderMacrocicloSelector(athlete);
  renderMacrociclo(athlete);
  switchProgramView('list');
  renderHistory(athlete);
  
  if (activeTrainerTab === 'tab-analytics') {
    renderAnalyticsCharts();
  }
}

function renderMacrocicloSelector(athlete) {
  const selector = document.getElementById('macrociclo-selector');
  if (!selector) return;
  
  selector.innerHTML = '';
  
  if (!athlete.macrocicli || athlete.macrocicli.length === 0) {
    athlete.macrocicli = [{
      id: 'macro-current-' + athlete.id,
      name: 'Macrociclo 1',
      sedute: [{ id: 'seduta-1', name: 'Seduta 1', exercises: [] }]
    }];
    athlete.activeMacrocicloId = athlete.macrocicli[0].id;
  }
  
  if (!athlete.activeMacrocicloId) {
    athlete.activeMacrocicloId = athlete.macrocicli[athlete.macrocicli.length - 1].id;
  }
  
  athlete.macrocicli.forEach(macro => {
    const opt = document.createElement('option');
    opt.value = macro.id;
    opt.textContent = macro.name;
    if (macro.id === athlete.activeMacrocicloId) {
      opt.selected = true;
    }
    selector.appendChild(opt);
  });
}

function switchMacrocicloView(macroId) {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;
  
  athlete.activeMacrocicloId = macroId;
  saveDatabase(db);
  renderMacrociclo(athlete);
}

function renderAthleteHeader(athlete) {
  const header = document.getElementById('selected-athlete-header');
  if (!athlete) {
    header.innerHTML = '<div style="padding:20px; color:var(--text-muted);">Nessun atleta selezionato.</div>';
    return;
  }
  
  const tests = athlete.tests || { strength: [], elevation: [] };
  const strengthTests = Array.isArray(tests.strength) ? tests.strength : [];
  const lastStrength = strengthTests.length > 0 ? strengthTests[strengthTests.length - 1] : null;
  
  const antropometria = athlete.antropometria || {};
  const weight = antropometria.peso || 0;
  let squatRel = '--';
  if (weight > 0 && lastStrength && lastStrength.squat1RM) {
    squatRel = (lastStrength.squat1RM / weight).toFixed(2);
  }

  const elevationTests = Array.isArray(tests.elevation) ? tests.elevation : [];
  const lastElevation = elevationTests.length > 0 ? elevationTests[elevationTests.length - 1] : null;
  const maxSpike = lastElevation && lastElevation.spikeJump ? `${lastElevation.spikeJump}cm` : '--';
  const reachDominante = antropometria.reachDominante ? `${antropometria.reachDominante}cm` : '--';

  const situationsHtml = athlete.situations 
    ? ` | <strong style="color:var(--accent-red);"><i data-lucide="shield-alert" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:3px;"></i>Situazioni Particolari:</strong> <span style="color:var(--text-main); font-weight:600;">${escapeHtml(athlete.situations)}</span>` 
    : '';

  header.innerHTML = `
    <div class="athlete-main-info">
      <h2>${escapeHtml(athlete.name)} (${getAthleteAge(athlete)} anni, ${escapeHtml(athlete.gender)})</h2>
      <p><strong>Ruolo:</strong> ${escapeHtml(athlete.ruolo)} | <strong>Categoria:</strong> ${escapeHtml(athlete.sport)} | <strong>Obiettivo:</strong> ${escapeHtml(athlete.goal)}${situationsHtml}</p>
      <div class="athlete-meta-badges">
        <span class="meta-badge"><i data-lucide="volleyball" style="width:14px; color:var(--accent-neon);"></i> Ruolo: ${escapeHtml(athlete.ruolo)}</span>
        <span class="meta-badge" title="Massimale di Back Squat relativo al peso corporeo (1RM/Peso)"><i data-lucide="dumbbell" style="width:14px; color:var(--accent-neon);"></i> Back Squat: ${squatRel} BW</span>
        <span class="meta-badge" title="Massima altezza di tocco con rincorsa"><i data-lucide="zap" style="width:14px; color:var(--accent-orange);"></i> Max Spike Reach: ${escapeHtml(maxSpike)}</span>
        <span class="meta-badge" title="Reach statico ad un braccio (mano dominante)"><i data-lucide="hand" style="width:14px; color:var(--accent-blue);"></i> Reach statico: ${escapeHtml(reachDominante)}</span>
      </div>
    </div>
    <div style="display:flex; gap:10px; align-items: center; flex-wrap: wrap;">
      <button onclick="copyAthleteLink('${escapeJsArg(athlete.id)}')" class="btn-secondary" style="color:var(--accent-neon); border-color:rgba(204,255,0,0.3);">
        <i data-lucide="copy"></i> Copia Link
      </button>
      <button onclick="openEditProfileModal()" class="btn-secondary">
        <i data-lucide="edit"></i> Modifica Profilo
      </button>
      <button onclick="deleteAthlete('${escapeJsArg(athlete.id)}')" class="btn-secondary" style="color:var(--accent-red); border-color:rgba(255,51,102,0.3);">
        <i data-lucide="user-x"></i> Rimuovi
      </button>
    </div>
  `;
  safeCreateIcons();
}

function copyAthleteLink(athleteId) {
  const baseUrl = window.location.origin + window.location.pathname;
  const athleteUrl = `${baseUrl}?ath=${encodeURIComponent(athleteId)}`;
  
  navigator.clipboard.writeText(athleteUrl).then(() => {
    alert("Link personalizzato copiato negli appunti!\nOra puoi inviarlo all'atleta via WhatsApp o SMS.");
  }).catch(err => {
    console.error("Errore copia link:", err);
    prompt("Copia il link qui sotto:", athleteUrl);
  });
}
function fillAnthropometricsForm(athlete) {
  const form = document.getElementById('form-anthropometrics');
  if (!form) return;
  
  if (form.elements['peso']) form.elements['peso'].value = athlete.antropometria.peso;
  if (form.elements['altezza']) form.elements['altezza'].value = athlete.antropometria.altezza;
  if (form.elements['reachDominante']) form.elements['reachDominante'].value = athlete.antropometria.reachDominante || 0;
  if (form.elements['ruolo']) form.elements['ruolo'].value = athlete.ruolo || 'Schiacciatore';
  if (form.elements['birthdate']) form.elements['birthdate'].value = getAthleteBirthdate(athlete);
  if (form.elements['gender']) form.elements['gender'].value = athlete.gender;
}

function renderTestResults(athlete) {
  const strengthTests = athlete.tests.strength;
  const speedTests = athlete.tests.speed;
  const elevationTests = athlete.tests.elevation;

  const lastStrength = strengthTests.length > 0 ? strengthTests[strengthTests.length - 1] : {};
  const lastSpeed = speedTests.length > 0 ? speedTests[speedTests.length - 1] : {};
  const lastElevation = elevationTests.length > 0 ? elevationTests[elevationTests.length - 1] : {};

  document.getElementById('test-val-squat').innerText = lastStrength.squat1RM ? `${lastStrength.squat1RM} kg` : '--';
  document.getElementById('test-val-powerclean').innerText = lastStrength.powerClean1RM ? `${lastStrength.powerClean1RM} kg` : '--';
  document.getElementById('test-val-pushpress').innerText = lastStrength.pushPress1RM ? `${lastStrength.pushPress1RM} kg` : '--';
  document.getElementById('test-val-deadlift').innerText = lastStrength.deadlift1RM ? `${lastStrength.deadlift1RM} kg` : '--';

  document.getElementById('test-val-cmj').innerText = lastElevation.cmj ? `${lastElevation.cmj} cm` : '--';
  document.getElementById('test-val-broadjump').innerText = lastElevation.broadJump ? `${lastElevation.broadJump} cm` : '--';
  document.getElementById('test-val-spikejump').innerText = lastElevation.spikeJump ? `${lastElevation.spikeJump} cm` : '--';
  document.getElementById('test-val-sprint10m').innerText = lastSpeed.sprint10m ? `${lastSpeed.sprint10m} s` : '--';
}

// Aggiunge un nuovo atleta
function handleAddAthlete(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  const name = (formData.get('name') || '').trim();
  if (!name) {
    alert("Il nome dell'atleta è obbligatorio!");
    return;
  }

  const birthdate = formData.get('birthdate') || '2009-05-15';
  const rawPeso = formData.get('peso');
  const rawAltezza = formData.get('altezza');
  const rawReach = formData.get('reachDominante');

  const peso = rawPeso ? parseFloat(rawPeso) : null;
  if (rawPeso && (isNaN(peso) || peso <= 0)) {
    alert("Peso non valido! Inserire un numero positivo.");
    return;
  }

  const altezza = rawAltezza ? parseInt(rawAltezza) : null;
  if (rawAltezza && (isNaN(altezza) || altezza <= 0)) {
    alert("Altezza non valida! Inserire un numero positivo.");
    return;
  }

  const reachDominante = rawReach ? parseInt(rawReach) : null;
  if (rawReach && (isNaN(reachDominante) || reachDominante < 0)) {
    alert("Reach statico non valido!");
    return;
  }

  const gender = formData.get('gender') || 'F';
  const ruolo = formData.get('ruolo') || 'Schiacciatore';
  const sport = formData.get('sport') || 'Under 16';
  const goal = formData.get('goal') || 'Sviluppo atletico generale';

  const lunghezzaFemore = altezza ? Math.round(altezza * 0.29) : null;
  const lunghezzaBusto = altezza ? Math.round(altezza * 0.32) : null;

  const situations = formData.get('situations') || '';

  const newAthlete = {
    id: 'athlete-' + Date.now(),
    name: name,
    birthdate: birthdate,
    gender: gender,
    ruolo: ruolo,
    sport: sport,
    goal: goal,
    situations: situations,
    antropometria: {
      peso: peso,
      altezza: altezza,
      reachDominante: reachDominante,
      lunghezzaFemore: lunghezzaFemore,
      lunghezzaBusto: lunghezzaBusto
    },
    tests: {
      strength: [],
      speed: [],
      elevation: []
    },
    macrocicli: [
      {
        id: 'macro-current-' + Date.now(),
        name: 'Macrociclo 1',
        sedute: [{ id: 'seduta-' + Date.now(), name: 'Seduta 1', exercises: [] }]
      }
    ],
    activeMacrocicloId: null,
    currentWorkout: [],
    history: []
  };

  newAthlete.activeMacrocicloId = newAthlete.macrocicli[0].id;

  db.athletes.push(newAthlete);
  saveDatabase(db);
  closeModal('modal-athlete');
  e.target.reset();
  
  renderAthleteList();
  selectAthlete(newAthlete.id);
  renderClientSelector();
}

function deleteAthlete(athleteId) {
  if (confirm("Sei sicuro di voler rimuovere questo atleta? Tutti i suoi dati andranno persi.")) {
    db.deletedAthleteIds = db.deletedAthleteIds || [];
    if (!db.deletedAthleteIds.includes(athleteId)) {
      db.deletedAthleteIds.push(athleteId);
    }
    
    db.athletes = db.athletes.filter(a => a.id !== athleteId);
    saveDatabase(db);
    
    // Rimuove l'atleta anche dal database cloud Supabase
    if (supabaseClient) {
      supabaseClient.from('athletes').delete().eq('id', athleteId).then(({ error }) => {
        if (error) {
          console.error("Errore cancellazione atleta in cloud:", error);
        } else {
          console.log(`Atleta ${athleteId} rimosso anche dal cloud.`);
        }
      }).catch(err => {
        console.error("Errore di rete cancellazione cloud:", err);
      });
    }
    
    if (db.athletes.length > 0) {
      activeAthleteId = db.athletes[0].id;
    } else {
      activeAthleteId = '';
    }
    
    renderAthleteList();
    selectAthlete(activeAthleteId);
    renderClientSelector();
  }
}

// Salva modifiche antropometria e ruolo
function handleSaveAnthropometrics(e) {
  e.preventDefault();
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;

  const formData = new FormData(e.target);
  const pesoVal = parseFloat(formData.get('peso'));
  const altezzaVal = parseInt(formData.get('altezza'));
  const reachVal = parseInt(formData.get('reachDominante')) || 0;
  const birthdateVal = formData.get('birthdate');

  if (isNaN(pesoVal) || pesoVal <= 0) {
    alert("Peso non valido! Inserire un numero positivo.");
    return;
  }
  if (isNaN(altezzaVal) || altezzaVal <= 0) {
    alert("Altezza non valida! Inserire un numero positivo.");
    return;
  }
  if (isNaN(reachVal) || reachVal < 0) {
    alert("Reach statico non valido!");
    return;
  }
  if (!birthdateVal) {
    alert("Data di nascita non valida!");
    return;
  }

  athlete.antropometria.peso = pesoVal;
  athlete.antropometria.altezza = altezzaVal;
  athlete.antropometria.reachDominante = reachVal;
  athlete.ruolo = formData.get('ruolo');
  athlete.birthdate = birthdateVal;
  athlete.gender = formData.get('gender');

  saveDatabase(db);
  alert("Parametri antropometrici e ruolo salvati!");
  renderAthleteHeader(athlete);
  renderAthleteList();
}

// Apre il modale di modifica del profilo caricando i dati dell'atleta attivo
function openEditProfileModal() {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;

  const nameParts = athlete.name.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  let sportValue = athlete.sport || 'Under 16';
  const lowerSport = sportValue.toLowerCase();
  if (lowerSport.includes('12')) sportValue = 'Under 12';
  else if (lowerSport.includes('13')) sportValue = 'Under 13';
  else if (lowerSport.includes('14')) sportValue = 'Under 14';
  else if (lowerSport.includes('15')) sportValue = 'Under 15';
  else if (lowerSport.includes('16')) sportValue = 'Under 16';
  else if (lowerSport.includes('17')) sportValue = 'Under 17';
  else if (lowerSport.includes('18')) sportValue = 'Under 18';
  else if (lowerSport.includes('19')) sportValue = 'Under 19';
  else if (lowerSport.includes('serie a1')) sportValue = 'Serie A1';
  else if (lowerSport.includes('serie a2')) sportValue = 'Serie A2';
  else if (lowerSport.includes('serie a3')) sportValue = 'Serie A3';
  else if (lowerSport.includes('serie b1')) sportValue = 'Serie B1';
  else if (lowerSport.includes('serie b2')) sportValue = 'Serie B2';
  else if (lowerSport.includes('serie b')) sportValue = 'Serie B';
  else if (lowerSport.includes('serie c')) sportValue = 'Serie C';
  else if (lowerSport.includes('serie d')) sportValue = 'Serie D';
  else if (lowerSport.includes('prima')) sportValue = 'Prima Divisione';
  else if (lowerSport.includes('seconda')) sportValue = 'Seconda Divisione';
  else if (lowerSport.includes('terza')) sportValue = 'Terza Divisione';

  document.getElementById('edit-profile-firstname').value = firstName;
  document.getElementById('edit-profile-lastname').value = lastName;
  document.getElementById('edit-profile-sport').value = sportValue;
  document.getElementById('edit-profile-goal').value = athlete.goal || '';
  document.getElementById('edit-profile-situations').value = athlete.situations || '';

  openModal('modal-edit-profile');
}

// Salva le modifiche apportate nel profilo atleta
function handleSaveProfileEdit(e) {
  e.preventDefault();
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;

  const formData = new FormData(e.target);
  const firstName = formData.get('firstName').trim();
  const lastName = formData.get('lastName').trim();
  
  if (!firstName) {
    alert("Il nome è obbligatorio!");
    return;
  }
  
  athlete.name = `${firstName} ${lastName}`.trim();
  athlete.sport = formData.get('sport').trim();
  athlete.goal = formData.get('goal').trim();
  athlete.situations = formData.get('situations').trim();

  saveDatabase(db);
  closeModal('modal-edit-profile');

  renderAthleteHeader(athlete);
  renderAthleteList();
  renderClientSelector();
  initClientPortal();
}

// Salva risultati test fisici volley
function handleSaveTests(e) {
  e.preventDefault();
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;

  const formData = new FormData(e.target);
  const testDate = formData.get('date');
  if (!testDate) {
    alert("La data del test è obbligatoria!");
    return;
  }

  const squat1RM = parseInt(formData.get('squat1RM')) || 0;
  const powerClean1RM = parseInt(formData.get('powerClean1RM')) || 0;
  const pushPress1RM = parseInt(formData.get('pushPress1RM')) || 0;
  const deadlift1RM = parseInt(formData.get('deadlift1RM')) || 0;
  const sprint10m = parseFloat(formData.get('sprint10m')) || 0;
  const cmj = parseInt(formData.get('cmj')) || 0;
  const broadJump = parseInt(formData.get('broadJump')) || 0;
  const spikeJump = parseInt(formData.get('spikeJump')) || 0;

  if (squat1RM < 0 || powerClean1RM < 0 || pushPress1RM < 0 || deadlift1RM < 0 || sprint10m < 0 || cmj < 0 || broadJump < 0 || spikeJump < 0) {
    alert("I valori dei test non possono essere negativi!");
    return;
  }

  const strengthTest = {
    date: testDate,
    squat1RM: squat1RM,
    powerClean1RM: powerClean1RM,
    pushPress1RM: pushPress1RM,
    deadlift1RM: deadlift1RM
  };

  const speedTest = {
    date: testDate,
    sprint10m: sprint10m
  };

  const elevationTest = {
    date: testDate,
    cmj: cmj,
    broadJump: broadJump,
    spikeJump: spikeJump
  };

  if (strengthTest.squat1RM || strengthTest.powerClean1RM || strengthTest.pushPress1RM || strengthTest.deadlift1RM) {
    athlete.tests.strength.push(strengthTest);
  }
  if (speedTest.sprint10m) {
    athlete.tests.speed.push(speedTest);
  }
  if (elevationTest.cmj || elevationTest.broadJump || elevationTest.spikeJump) {
    athlete.tests.elevation.push(elevationTest);
  }

  saveDatabase(db);
  closeModal('modal-test');
  e.target.reset();
  
  renderTestResults(athlete);
  if (activeTrainerTab === 'tab-analytics') {
    renderAnalyticsCharts();
  }
}

// Apre il modale per registrare un singolo test selezionato al click sulla card
function openSingleTestModal(testField, testCategory, testName, testUnit) {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;

  document.getElementById('single-test-title').innerText = `Registra Test: ${testName}`;
  document.getElementById('single-test-type-id').value = testField;
  document.getElementById('single-test-category-id').value = testCategory;
  document.getElementById('single-test-unit').innerText = testUnit;
  document.getElementById('single-test-input-label').innerText = `Valore (${testUnit})`;
  document.getElementById('single-test-date').value = new Date().toISOString().split('T')[0];

  let lastValue = '--';
  const categoryTests = athlete.tests[testCategory];
  if (categoryTests && categoryTests.length > 0) {
    const sorted = [...categoryTests].sort((a,b) => new Date(a.date) - new Date(b.date));
    const lastRecord = sorted[sorted.length - 1];
    if (lastRecord && lastRecord[testField] !== undefined && lastRecord[testField] !== null) {
      lastValue = `${lastRecord[testField]} ${testUnit}`;
      document.getElementById('single-test-value').value = lastRecord[testField];
    } else {
      document.getElementById('single-test-value').value = '';
    }
  } else {
    document.getElementById('single-test-value').value = '';
  }

  document.getElementById('single-test-prev-value').innerText = lastValue;
  openModal('modal-single-test');
}

// Salva il singolo test inserito
function handleSaveSingleTest(e) {
  e.preventDefault();
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;

  const formData = new FormData(e.target);
  const testField = formData.get('testType');
  const testCategory = formData.get('testCategory');
  const date = formData.get('date');
  const value = parseFloat(formData.get('value'));

  if (!date) {
    alert("La data è obbligatoria!");
    return;
  }

  if (isNaN(value) || value < 0) {
    alert("Inserire un valore positivo valido!");
    return;
  }

  let categoryTests = athlete.tests[testCategory];
  if (!categoryTests) {
    categoryTests = [];
    athlete.tests[testCategory] = categoryTests;
  }

  let existingTest = categoryTests.find(t => t.date === date);

  if (existingTest) {
    existingTest[testField] = value;
  } else {
    const newRecord = { date: date };
    newRecord[testField] = value;
    categoryTests.push(newRecord);
  }

  athlete.tests[testCategory] = categoryTests.sort((a, b) => new Date(a.date) - new Date(b.date));

  saveDatabase(db);
  closeModal('modal-single-test');
  
  renderTestResults(athlete);
  renderAthleteHeader(athlete);
  
  if (activeTrainerTab === 'tab-analytics') {
    renderAnalyticsCharts();
  }
}

// ==========================================================================
// GESTIONE PROGRAMMA ALLENAMENTO (BUILDER / MACROCICLO)
// ==========================================================================

let activeSedutaId = null;

function switchProgramView(view) {
  const listContainer = document.getElementById('macrociclo-overview-container');
  const builderContainer = document.getElementById('workout-builder-detail-container');
  const athlete = getActiveAthlete();

  if (view === 'list') {
    listContainer.style.display = 'block';
    builderContainer.style.display = 'none';
    if (athlete) renderMacrociclo(athlete);
  } else {
    listContainer.style.display = 'none';
    builderContainer.style.display = 'block';
  }
}

function renderMacrociclo(athlete) {
  const container = document.getElementById('macrociclo-list');
  container.innerHTML = '';

  if (!athlete.macrocicli || athlete.macrocicli.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Nessun macrociclo programmato. Clicca su "Nuovo Macrociclo" per iniziare.</div>`;
    return;
  }

  const activeMacro = athlete.macrocicli.find(m => m.id === athlete.activeMacrocicloId) || athlete.macrocicli[athlete.macrocicli.length - 1];
  if (!activeMacro) return;

  // Sincronizza activeMacrocicloId
  athlete.activeMacrocicloId = activeMacro.id;

  if (activeMacro.sedute.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted); width:100%;">Nessuna seduta programmata in questo macrociclo. Clicca su "Nuova Seduta" per iniziare.</div>`;
    return;
  }

  // Se non c'è una seduta attiva per lo smartphone, imposta l'ultima del macrociclo attivo
  if (!athlete.activeSedutaId && activeMacro.sedute.length > 0) {
    athlete.activeSedutaId = activeMacro.sedute[activeMacro.sedute.length - 1].id;
  }

  activeMacro.sedute.forEach((seduta, idx) => {
    const card = document.createElement('div');
    card.className = 'seduta-card';

    const exTags = (seduta.exercises || []).map(ex => {
      const varSuffix = ex.variation ? ` (${escapeHtml(ex.variation)})` : '';
      return `<span class="seduta-ex-tag">${escapeHtml(ex.name)}${varSuffix}</span>`;
    }).join('');

    const isActive = athlete.activeSedutaId === seduta.id;

    card.innerHTML = `
      <div class="seduta-info">
        <div class="seduta-title-row">
          <span class="seduta-num">${idx + 1}</span>
          <span class="seduta-title-text" style="cursor: pointer;" onclick="renameSeduta('${escapeJsArg(seduta.id)}')" title="Clicca per rinominare la seduta">${escapeHtml(seduta.name)}</span>
          ${isActive ? `<span class="seduta-active-badge">Attiva su Telefono</span>` : ''}
        </div>
        <div class="seduta-ex-tags">
          ${exTags || '<span style="font-size:11px; color:var(--text-muted); font-style:italic;">Nessun esercizio inserito</span>'}
        </div>
      </div>
      <div class="seduta-actions">
        <button class="btn-secondary" onclick="renameSeduta('${escapeJsArg(seduta.id)}')" title="Rinomina seduta" style="padding: 8px 12px;">
          <i data-lucide="pencil" style="width:16px; height:16px;"></i>
        </button>
        <button class="btn-secondary" onclick="activateSeduta('${escapeJsArg(seduta.id)}')" title="Attiva sullo smartphone dell'atleta" style="padding: 8px 12px; border-color:${isActive ? 'var(--accent-neon)' : ''};">
          <i data-lucide="smartphone" style="width:16px; height:16px; color:${isActive ? 'var(--accent-neon)' : ''};"></i>
        </button>
        <button class="btn-secondary" onclick="openWorkoutBuilderDetail('${escapeJsArg(seduta.id)}')" title="Modifica esercizi e parametri" style="padding: 8px 12px;">
          <i data-lucide="edit-3" style="width:16px; height:16px;"></i>
        </button>
        <button class="btn-secondary" onclick="copySedutaToClipboard('${escapeJsArg(seduta.id)}')" title="Copia negli appunti" style="padding: 8px 12px;">
          <i data-lucide="clipboard" style="width:16px; height:16px;"></i>
        </button>
        <button class="btn-secondary" onclick="duplicateSeduta('${escapeJsArg(seduta.id)}')" title="Duplica seduta" style="padding: 8px 12px;">
          <i data-lucide="copy" style="width:16px; height:16px;"></i>
        </button>
        <button class="btn-secondary" onclick="deleteSeduta('${escapeJsArg(seduta.id)}')" title="Elimina seduta" style="padding: 8px 12px; border-color: rgba(255, 51, 102, 0.2);">
          <i data-lucide="trash-2" style="width:16px; height:16px; color:var(--accent-red);"></i>
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  updatePasteButtonVisibility();
  safeCreateIcons();
}

function renameMacrociclo() {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;
  
  const activeMacro = athlete.macrocicli.find(m => m.id === athlete.activeMacrocicloId);
  if (!activeMacro) return;
  
  const newName = prompt("Inserisci il nuovo titolo del macrociclo:", activeMacro.name);
  if (!newName || !newName.trim()) return;
  
  activeMacro.name = newName.trim();
  saveDatabase(db);
  renderMacrocicloSelector(athlete);
  renderMacrociclo(athlete);
}

function deleteMacrociclo() {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;
  
  if (athlete.macrocicli.length <= 1) {
    alert("Non puoi eliminare l'unico macrociclo rimasto!");
    return;
  }
  
  const activeMacro = athlete.macrocicli.find(m => m.id === athlete.activeMacrocicloId);
  if (!activeMacro) return;
  
  if (confirm(`Sei sicuro di voler eliminare definitivamente il macrociclo "${activeMacro.name}" e tutte le sue sedute?`)) {
    athlete.macrocicli = athlete.macrocicli.filter(m => m.id !== activeMacro.id);
    athlete.activeMacrocicloId = athlete.macrocicli[athlete.macrocicli.length - 1].id;
    
    saveDatabase(db);
    renderMacrocicloSelector(athlete);
    renderMacrociclo(athlete);
  }
}

function handleAddMacrociclo() {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;
  
  const nextNum = athlete.macrocicli.length + 1;
  const newName = `Macrociclo ${nextNum}`;
  
  const newMacro = {
    id: 'macro-' + Date.now(),
    name: newName,
    sedute: [{ id: 'seduta-' + Date.now(), name: 'Seduta 1', exercises: [] }]
  };
  
  athlete.macrocicli.push(newMacro);
  athlete.activeMacrocicloId = newMacro.id;
  
  saveDatabase(db);
  renderMacrocicloSelector(athlete);
  renderMacrociclo(athlete);
  
  alert(`Nuovo macrociclo "${newName}" creato con successo!`);
}

function renameSeduta(sedutaId) {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;
  
  const activeMacro = athlete.macrocicli.find(m => m.id === athlete.activeMacrocicloId);
  if (!activeMacro) return;
  
  const seduta = activeMacro.sedute.find(s => s.id === sedutaId);
  if (!seduta) return;
  
  const newName = prompt("Inserisci il nuovo titolo della seduta:", seduta.name);
  if (!newName || !newName.trim()) return;
  
  seduta.name = newName.trim();
  saveDatabase(db);
  renderMacrociclo(athlete);
}

function openWorkoutBuilderDetail(sedutaId) {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;

  const activeMacro = athlete.macrocicli.find(m => m.id === athlete.activeMacrocicloId);
  if (!activeMacro) return;

  const seduta = activeMacro.sedute.find(s => s.id === sedutaId);
  if (!seduta) return;

  activeSedutaId = sedutaId;
  document.getElementById('builder-seduta-title').innerHTML = `<i data-lucide="edit" style="color: var(--accent-neon);"></i> ${seduta.name}`;
  
  renderProgramBuilderForSeduta(seduta);
  switchProgramView('detail');
  safeCreateIcons();
}

function renderProgramBuilderForSeduta(seduta) {
  const container = document.getElementById('program-exercises-container');
  container.innerHTML = '';

  if (!seduta.exercises || seduta.exercises.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted); width: 100%;">Nessun esercizio programmato in questa seduta. Aggiungi esercizi per comporla.</div>`;
    return;
  }

  seduta.exercises.forEach((ex, index) => {
    createExerciseBuilderRow(ex, index);
  });
}

function createExerciseBuilderRow(ex, index) {
  const container = document.getElementById('program-exercises-container');
  
  if (container.children.length === 1 && container.firstChild.className === undefined) {
    container.innerHTML = '';
  }

  const row = document.createElement('div');
  row.className = 'exercise-builder-item';
  row.setAttribute('data-index', index);

  // Trova le categorie uniche in EXERCISE_LIBRARY
  const categories = Array.from(new Set(EXERCISE_LIBRARY.map(le => le.category)));
  
  // Categoria corrente dell'esercizio
  let currentCategory = ex.category;
  if (!currentCategory) {
    const matched = EXERCISE_LIBRARY.find(le => le.name === ex.name);
    currentCategory = matched ? matched.category : categories[0];
  }

  // Genera le opzioni per la select Categoria
  let catOptionsHtml = '';
  categories.forEach(cat => {
    const isSelected = cat === currentCategory ? 'selected' : '';
    catOptionsHtml += `<option value="${cat}" ${isSelected}>${cat}</option>`;
  });

  // Genera le opzioni per gli esercizi appartenenti alla categoria corrente
  let exOptionsHtml = '';
  const exercisesInCat = EXERCISE_LIBRARY.filter(le => le.category === currentCategory);
  exercisesInCat.forEach(libEx => {
    const isSelected = libEx.name === ex.name ? 'selected' : '';
    exOptionsHtml += `<option value="${libEx.name}" ${isSelected} data-type="${libEx.type}" data-cat="${libEx.category}">${libEx.name}</option>`;
  });

  // Se l'esercizio corrente Ã¨ personalizzato e non appartiene a questa categoria, lo aggiungiamo come custom
  if (!exercisesInCat.some(le => le.name === ex.name)) {
    exOptionsHtml += `<option value="${ex.name}" selected data-type="${ex.type || 'weight'}" data-cat="${currentCategory}">${ex.name} (Custom)</option>`;
  }

  row.innerHTML = `
    <div class="form-group">
      <label>Categoria</label>
      <select class="form-control ex-category-select" onchange="handleCategoryChange(this)">
        ${catOptionsHtml}
      </select>
    </div>

    <div class="form-group">
      <label>Esercizio</label>
      <select class="form-control ex-select" onchange="updateRowInputs(this)">
        ${exOptionsHtml}
      </select>
    </div>

    <div class="form-group">
      <label>Note Tecniche</label>
      <select class="form-control ex-variation">
        <option value="" ${!ex.variation ? 'selected' : ''}>Nessuna</option>
        <option value="concentrica 3&quot;" ${ex.variation === 'concentrica 3"' ? 'selected' : ''}>concentrica 3"</option>
        <option value="fermo in buca 2&quot;" ${ex.variation === 'fermo in buca 2"' ? 'selected' : ''}>fermo in buca 2"</option>
        <option value="partenza da terra" ${ex.variation === 'partenza da terra' ? 'selected' : ''}>partenza da terra</option>
        <option value="partenza dai blocchi" ${ex.variation === 'partenza dai blocchi' ? 'selected' : ''}>partenza dai blocchi</option>
        <option value="massimo intento" ${ex.variation === 'massimo intento' ? 'selected' : ''}>massimo intento</option>
        <option value="contatto minimo" ${ex.variation === 'contatto minimo' ? 'selected' : ''}>contatto minimo</option>
      </select>
    </div>

    <div class="form-group input-weight" style="${ex.type === 'weight' ? '' : 'opacity:0.3; pointer-events:none;'}">
      <label>Carico (kg)</label>
      <input type="number" class="form-control ex-weight" value="${ex.weight || 0}" min="0" style="width: 72px; text-align: center;">
    </div>

    <div class="form-group input-reps">
      <label class="label-reps">${ex.type === 'time' ? 'Tempo (s)' : 'Reps'}</label>
      <input type="number" class="form-control ex-reps" value="${ex.reps || 5}" min="1" required style="width: 72px; text-align: center;">
    </div>
    
    <div class="form-group input-sets">
      <label>Set</label>
      <input type="number" class="form-control ex-sets" value="${ex.sets || 4}" min="1" required style="width: 72px; text-align: center;">
    </div>

    <div class="form-group">
      <label>Rec</label>
      <select class="form-control ex-rest" style="width: 82px; text-align: center;">
        <option value="30" ${ex.rest === 30 ? 'selected' : ''}>30"</option>
        <option value="60" ${ex.rest === 60 ? 'selected' : ''}>60"</option>
        <option value="90" ${ex.rest === 90 ? 'selected' : ''}>90"</option>
        <option value="120" ${ex.rest === 120 || ex.rest === null || ex.rest === undefined || ex.rest === 0 ? 'selected' : ''}>120"</option>
        <option value="150" ${ex.rest === 150 ? 'selected' : ''}>150"</option>
        <option value="180" ${ex.rest === 180 ? 'selected' : ''}>180"</option>
      </select>
    </div>

    <div>
      <button type="button" class="delete-ex-btn" onclick="removeExerciseRow(this)">
        <i data-lucide="trash-2"></i>
      </button>
    </div>

    <div class="sets-builder-container" style="grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; padding: 12px; margin-top: 8px; background: rgba(255,255,255,0.01); border-radius: var(--radius-sm); border-left: 2px solid var(--accent-neon); align-items: center;">
    </div>
  `;

  container.appendChild(row);
  updateSetsBuilder(row, ex.setsList || null);
  initExerciseBuilderRowListeners(row);
  safeCreateIcons();
}

function updateSetsBuilder(row, setsList = null) {
  const container = row.querySelector('.sets-builder-container');
  if (!container) return;

  const setsInput = row.querySelector('.ex-sets');
  const repsInput = row.querySelector('.ex-reps');
  const weightInput = row.querySelector('.ex-weight');
  const selectEx = row.querySelector('.ex-select');
  
  const setsCount = Math.max(1, parseInt(setsInput.value) || 4);
  const defaultReps = Math.max(1, parseInt(repsInput.value) || 5);
  const defaultWeight = Math.max(0, parseFloat(weightInput.value) || 0);

  const selectedOption = selectEx.options[selectEx.selectedIndex];
  const type = selectedOption ? selectedOption.getAttribute('data-type') : 'weight';

  container.innerHTML = `
    <span style="font-size:11px; font-weight:700; color:var(--text-muted); margin-right:8px; display:flex; align-items:center; gap:4px;">
      <i data-lucide="layers" style="width:14px; color:var(--accent-neon); height:14px;"></i> Dettaglio Serie:
    </span>
  `;

  for (let s = 0; s < setsCount; s++) {
    let currentReps = defaultReps;
    let currentWeight = defaultWeight;

    if (setsList && Array.isArray(setsList) && setsList[s]) {
      currentReps = setsList[s].reps;
      currentWeight = setsList[s].weight !== undefined ? setsList[s].weight : defaultWeight;
    }

    const bubble = document.createElement('div');
    bubble.className = 'set-builder-bubble';
    bubble.style.cssText = 'display:flex; align-items:center; gap:4px; background:var(--bg-surface); border:1px solid var(--border-color); padding:4px 8px; border-radius:6px;';

    let inputsHtml = '';
    if (type === 'weight') {
      inputsHtml = `
        <input type="number" class="set-weight form-control-flat" value="${currentWeight}" min="0" style="width:45px; text-align:center; background:none; border:none; color:var(--text-main); font-weight:700; padding:0; margin:0;">
        <span style="font-size:10px; color:var(--text-muted);">kg</span>
        <span style="font-size:10px; color:var(--text-muted); margin:0 2px;">×</span>
        <input type="number" class="set-reps form-control-flat" value="${currentReps}" min="1" style="width:35px; text-align:center; background:none; border:none; color:var(--text-main); font-weight:700; padding:0; margin:0;">
        <span style="font-size:10px; color:var(--text-muted);">rep</span>
      `;
    } else if (type === 'time') {
      inputsHtml = `
        <input type="number" class="set-reps form-control-flat" value="${currentReps}" min="1" style="width:35px; text-align:center; background:none; border:none; color:var(--text-main); font-weight:700; padding:0; margin:0;">
        <span style="font-size:10px; color:var(--text-muted);">sec</span>
      `;
    } else {
      inputsHtml = `
        <input type="number" class="set-reps form-control-flat" value="${currentReps}" min="1" style="width:35px; text-align:center; background:none; border:none; color:var(--text-main); font-weight:700; padding:0; margin:0;">
        <span style="font-size:10px; color:var(--text-muted);">rep</span>
      `;
    }

    bubble.innerHTML = `
      <span style="font-size:10px; color:var(--text-muted); font-weight:700; margin-right:2px;">S${s+1}:</span>
      ${inputsHtml}
    `;

    container.appendChild(bubble);
  }
  safeCreateIcons();
}

function initExerciseBuilderRowListeners(row) {
  const setsInput = row.querySelector('.ex-sets');
  const repsInput = row.querySelector('.ex-reps');
  const weightInput = row.querySelector('.ex-weight');

  setsInput.addEventListener('input', () => {
    updateSetsBuilder(row);
  });

  repsInput.addEventListener('input', () => {
    const bubbles = row.querySelectorAll('.sets-builder-container .set-reps');
    bubbles.forEach(input => {
      input.value = repsInput.value;
    });
  });

  weightInput.addEventListener('input', () => {
    const bubbles = row.querySelectorAll('.sets-builder-container .set-weight');
    bubbles.forEach(input => {
      input.value = weightInput.value;
    });
  });
}

function handleCategoryChange(categorySelect) {
  const row = categorySelect.closest('.exercise-builder-item');
  const exSelect = row.querySelector('.ex-select');
  const category = categorySelect.value;
  
  const filtered = EXERCISE_LIBRARY.filter(le => le.category === category);
  
  exSelect.innerHTML = '';
  filtered.forEach(libEx => {
    const opt = document.createElement('option');
    opt.value = libEx.name;
    opt.textContent = libEx.name;
    opt.setAttribute('data-type', libEx.type);
    opt.setAttribute('data-cat', libEx.category);
    exSelect.appendChild(opt);
  });
  
  if (exSelect.options.length > 0) {
    exSelect.selectedIndex = 0;
    updateRowInputs(exSelect);
  }
}

function updateRowInputs(selectElement) {
  const row = selectElement.closest('.exercise-builder-item');
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  if (!selectedOption) return;
  const type = selectedOption.getAttribute('data-type');
  
  const repsLabel = row.querySelector('.label-reps');
  const weightGroup = row.querySelector('.input-weight');
  
  if (type === 'time') {
    repsLabel.innerText = 'Tempo (s)';
    weightGroup.style.opacity = '0.3';
    weightGroup.style.pointerEvents = 'none';
    row.querySelector('.ex-weight').value = 0;
  } else if (type === 'bodyweight') {
    repsLabel.innerText = 'Reps';
    weightGroup.style.opacity = '0.3';
    weightGroup.style.pointerEvents = 'none';
    row.querySelector('.ex-weight').value = 0;
  } else {
    repsLabel.innerText = 'Reps';
    weightGroup.style.opacity = '1';
    weightGroup.style.pointerEvents = 'auto';
  }
}

function addExerciseRowToBuilder() {
  const defaultEx = EXERCISE_LIBRARY[0];
  const newWorkoutEx = {
    name: defaultEx.name,
    variation: '',
    category: defaultEx.category,
    type: defaultEx.type,
    sets: 4,
    reps: 5,
    weight: 50,
    rest: defaultEx.defaultRest || 120,
    notes: ''
  };

  const container = document.getElementById('program-exercises-container');
  const index = container.querySelectorAll('.exercise-builder-item').length;
  createExerciseBuilderRow(newWorkoutEx, index);
}

function removeExerciseRow(buttonElement) {
  const row = buttonElement.closest('.exercise-builder-item');
  row.remove();
  
  const container = document.getElementById('program-exercises-container');
  if (container.children.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted); width: 100%;">Nessun esercizio programmato in questa seduta. Aggiungi esercizi per comporla.</div>`;
  }
}

function activateSeduta(sedutaId) {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;

  const activeMacro = athlete.macrocicli.find(m => m.id === athlete.activeMacrocicloId);
  if (!activeMacro) return;

  const seduta = activeMacro.sedute.find(s => s.id === sedutaId);
  if (!seduta) return;

  athlete.currentWorkout = JSON.parse(JSON.stringify(seduta.exercises));
  athlete.activeSedutaId = sedutaId;
  athlete.currentWorkoutCompleted = false;
  
  saveDatabase(db);
  renderMacrociclo(athlete);
  renderClientSelector();
  initClientPortal();

  alert(`Seduta "${seduta.name}" attivata sul telefono di ${athlete.name}!`);
}

function saveActiveSeduta(andActivate = false) {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;

  const activeMacro = athlete.macrocicli.find(m => m.id === athlete.activeMacrocicloId);
  if (!activeMacro) return;

  const seduta = activeMacro.sedute.find(s => s.id === activeSedutaId);
  if (!seduta) return;

  const rows = document.querySelectorAll('#program-exercises-container .exercise-builder-item');
  const newExercises = [];

  rows.forEach((row, i) => {
    const select = row.querySelector('.ex-select');
    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption) return;
    
    const setsVal = Math.max(1, parseInt(row.querySelector('.ex-sets').value) || 4);
    const repsVal = Math.max(1, parseInt(row.querySelector('.ex-reps').value) || 5);
    const weightVal = Math.max(0, parseFloat(row.querySelector('.ex-weight').value) || 0);
    const restVal = Math.max(0, parseInt(row.querySelector('.ex-rest').value) || 120);

    const setsList = [];
    const bubbles = row.querySelectorAll('.sets-builder-container .set-builder-bubble');
    bubbles.forEach(bubble => {
      const wInput = bubble.querySelector('.set-weight');
      const rInput = bubble.querySelector('.set-reps');
      
      const w = wInput ? Math.max(0, parseFloat(wInput.value) || 0) : weightVal;
      const r = rInput ? Math.max(1, parseInt(rInput.value) || 5) : repsVal;
      
      setsList.push({ reps: r, weight: w });
    });

    newExercises.push({
      id: 'ex-' + (i + 1),
      name: select.value,
      variation: row.querySelector('.ex-variation').value || '',
      category: row.querySelector('.ex-category-select').value,
      type: selectedOption.getAttribute('data-type'),
      sets: setsVal,
      reps: repsVal,
      weight: weightVal,
      rest: restVal,
      notes: '',
      setsList: setsList
    });
  });

  seduta.exercises = newExercises;

  if (andActivate) {
    athlete.currentWorkout = JSON.parse(JSON.stringify(newExercises));
    athlete.activeSedutaId = activeSedutaId;
    athlete.currentWorkoutCompleted = false;
  }

  saveDatabase(db);
  
  if (andActivate) {
    alert(`Seduta "${seduta.name}" salvata e attivata sul telefono di ${athlete.name}!`);
  } else {
    alert(`Seduta "${seduta.name}" salvata nel macrociclo!`);
  }

  switchProgramView('list');
  
  if (andActivate) {
    renderClientSelector();
    initClientPortal();
  }
}

function handleAddSeduta() {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;

  const activeMacro = athlete.macrocicli.find(m => m.id === athlete.activeMacrocicloId);
  if (!activeMacro) return;

  const nextNum = activeMacro.sedute.length + 1;
  const defaultName = `Seduta ${nextNum}`;

  const newSedutaId = `seduta-${Date.now()}`;
  const newSeduta = {
    id: newSedutaId,
    name: defaultName,
    exercises: []
  };

  activeMacro.sedute.push(newSeduta);
  saveDatabase(db);
  
  openWorkoutBuilderDetail(newSedutaId);
}

function duplicateSeduta(sedutaId) {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;

  const activeMacro = athlete.macrocicli.find(m => m.id === athlete.activeMacrocicloId);
  if (!activeMacro) return;

  const sourceSeduta = activeMacro.sedute.find(s => s.id === sedutaId);
  if (!sourceSeduta) return;

  const nextNum = activeMacro.sedute.length + 1;
  const defaultNewName = `Seduta ${nextNum}`;
  const newName = prompt("Rinomina la seduta duplicata:", defaultNewName);
  if (!newName) return;

  const duplicated = {
    id: `seduta-${Date.now()}`,
    name: newName,
    exercises: JSON.parse(JSON.stringify(sourceSeduta.exercises))
  };

  activeMacro.sedute.push(duplicated);
  saveDatabase(db);
  renderMacrociclo(athlete);
  
  alert(`Seduta duplicata con successo come "${newName}"!`);
}

function copySedutaToClipboard(sedutaId) {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;

  const activeMacro = athlete.macrocicli.find(m => m.id === athlete.activeMacrocicloId);
  if (!activeMacro) return;

  const seduta = activeMacro.sedute.find(s => s.id === sedutaId);
  if (!seduta) return;

  const clipboardData = {
    name: seduta.name,
    exercises: JSON.parse(JSON.stringify(seduta.exercises))
  };

  localStorage.setItem('volleyfitlab_copied_seduta', JSON.stringify(clipboardData));
  
  updatePasteButtonVisibility();
  
  alert(`Seduta "${seduta.name}" copiata negli appunti! Ora puoi incollarla in qualsiasi macrociclo o su un'altra atleta.`);
}

function updatePasteButtonVisibility() {
  const btnPaste = document.getElementById('btn-paste-seduta');
  if (!btnPaste) return;

  const copiedDataStr = localStorage.getItem('volleyfitlab_copied_seduta');
  if (copiedDataStr) {
    try {
      const data = JSON.parse(copiedDataStr);
      btnPaste.innerHTML = `<i data-lucide="clipboard"></i> Incolla "${data.name}"`;
      btnPaste.style.display = 'inline-flex';
      safeCreateIcons();
    } catch (e) {
      btnPaste.style.display = 'none';
    }
  } else {
    btnPaste.style.display = 'none';
  }
}

function handlePasteSeduta() {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) {
    alert("Seleziona prima un atleta per poter incollare la seduta!");
    return;
  }

  const activeMacro = athlete.macrocicli.find(m => m.id === athlete.activeMacrocicloId);
  if (!activeMacro) {
    alert("Questo atleta non ha alcun macrociclo attivo. Creane uno prima di incollare!");
    return;
  }

  const copiedDataStr = localStorage.getItem('volleyfitlab_copied_seduta');
  if (!copiedDataStr) {
    alert("Nessuna seduta copiata negli appunti!");
    return;
  }

  try {
    const copiedData = JSON.parse(copiedDataStr);
    const newName = prompt(`Come vuoi chiamare la seduta incollata in questo macrociclo?`, `${copiedData.name} (Copia)`);
    if (!newName || !newName.trim()) return;

    const newSedutaId = `seduta-${Date.now()}`;
    const newSeduta = {
      id: newSedutaId,
      name: newName.trim(),
      exercises: JSON.parse(JSON.stringify(copiedData.exercises))
    };

    activeMacro.sedute.push(newSeduta);
    saveDatabase(db);
    renderMacrociclo(athlete);
    
    alert(`Seduta "${newSeduta.name}" incollata con successo nel macrociclo "${activeMacro.name}" di ${athlete.name}!`);
  } catch (e) {
    console.error("Errore durante l'incolla della seduta:", e);
    alert("Impossibile incollare la seduta. I dati negli appunti potrebbero essere corrotti.");
  }
}

function deleteSeduta(sedutaId) {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (!athlete) return;

  const activeMacro = athlete.macrocicli.find(m => m.id === athlete.activeMacrocicloId);
  if (!activeMacro) return;

  const seduta = activeMacro.sedute.find(s => s.id === sedutaId);
  if (!seduta) return;

  if (confirm(`Sei sicuro di voler eliminare la seduta "${seduta.name}" dal macrociclo?`)) {
    activeMacro.sedute = activeMacro.sedute.filter(s => s.id !== sedutaId);
    
    if (athlete.activeSedutaId === sedutaId) {
      if (activeMacro.sedute.length > 0) {
        athlete.activeSedutaId = activeMacro.sedute[0].id;
        athlete.currentWorkout = JSON.parse(JSON.stringify(activeMacro.sedute[0].exercises));
      } else {
        athlete.activeSedutaId = '';
        athlete.currentWorkout = [];
      }
    }

    saveDatabase(db);
    renderMacrociclo(athlete);
    renderClientSelector();
    initClientPortal();
  }
}

// ==========================================================================
// STORICO ALLENAMENTI E FEEDBACK COACH VIEW
// ==========================================================================

function renderHistoryFiltered() {
  const athlete = db.athletes.find(a => a.id === activeAthleteId);
  if (athlete) renderHistory(athlete);
}

function renderHistory(athlete) {
  const container = document.getElementById('history-container');
  container.innerHTML = '';

  const filterSelect = document.getElementById('history-month-filter');
  const previousValue = filterSelect.value;

  // Popola il selettore mesi con i mesi presenti nello storico
  const monthNames = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const monthsAvailable = new Map();

  (athlete.history || []).forEach(w => {
    if (!w.date) return;
    const d = new Date(w.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthsAvailable.has(key)) {
      monthsAvailable.set(key, `${monthNames[d.getMonth()]} ${d.getFullYear()}`);
    }
  });

  // Ordina mesi dal piÃ¹ recente
  const sortedKeys = Array.from(monthsAvailable.keys()).sort().reverse();

  filterSelect.innerHTML = '<option value="all">Tutti i mesi</option>';
  sortedKeys.forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = monthsAvailable.get(key);
    filterSelect.appendChild(opt);
  });

  // Ripristina la selezione precedente se ancora valida
  if (previousValue && (previousValue === 'all' || monthsAvailable.has(previousValue))) {
    filterSelect.value = previousValue;
  }

  const selectedMonth = filterSelect.value;

  if (!athlete.history || athlete.history.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">L'atleta non ha ancora registrato alcun allenamento completato.</div>`;
    return;
  }

  // Filtra per mese selezionato
  const filteredHistory = selectedMonth === 'all'
    ? athlete.history
    : athlete.history.filter(w => {
        if (!w.date) return false;
        const d = new Date(w.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === selectedMonth;
      });

  if (filteredHistory.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Nessun allenamento registrato in questo mese.</div>`;
    return;
  }

  filteredHistory.forEach(workout => {
    const item = document.createElement('div');
    item.className = 'history-item';

    let totalRpe = 0;
    let validExCount = 0;
    let painAlerts = [];

    workout.exercises.forEach(ex => {
      if (ex.fatigue) {
        totalRpe += ex.fatigue;
        validExCount++;
      }
      if (ex.notes && (ex.notes.toLowerCase().includes('dolore') || ex.notes.toLowerCase().includes('male') || ex.notes.toLowerCase().includes('fastidio'))) {
        painAlerts.push({ exercise: ex.name, text: ex.notes });
      }
    });

    const avgRpe = validExCount > 0 ? (totalRpe / validExCount).toFixed(1) : '--';
    
    let exercisesHtml = '';
    workout.exercises.forEach(ex => {
      const isPain = ex.notes && (ex.notes.toLowerCase().includes('dolore') || ex.notes.toLowerCase().includes('male') || ex.notes.toLowerCase().includes('fastidio'));
      
      let setsHtml = '';
      ex.sets.forEach((set, sIdx) => {
        const repsDiff = set.actualReps !== set.targetReps;
        const weightDiff = set.actualWeight !== set.targetWeight;
        const wasMissed = !set.completed || repsDiff || weightDiff;
        
        let labelText = '';
        if (ex.type === 'weight') {
          labelText = `${set.actualWeight}kg x ${set.actualReps}`;
        } else if (ex.type === 'time') {
          labelText = `${set.actualReps}s`;
        } else {
          labelText = `${set.actualReps} rep`;
        }

        setsHtml += `
          <span class="set-bubble ${wasMissed ? 'missed' : ''}" title="Target: ${ex.type === 'weight' ? set.targetWeight + 'kg x' : ''} ${set.targetReps}">
            S${sIdx+1}: ${labelText} ${set.completed ? '\u2713' : '\u2717'}
          </span>
        `;
      });

      exercisesHtml += `
        <div class="history-ex-card">
          <div class="history-ex-header">
            <span>${ex.name} ${ex.variation ? `<span style="color: var(--accent-orange); font-size:11px; margin-left:6px; font-weight:600;">(${ex.variation})</span>` : ''}</span>
            <div style="display:flex; gap:6px; align-items:center;">
              <span class="history-ex-badge quality-${ex.technicalQuality}">${ex.technicalQuality}</span>
              <span style="font-size:12px; color:var(--text-muted);">Fatica: <strong>${ex.fatigue || '--'}/5</strong></span>
            </div>
          </div>
          <div class="history-ex-sets">
            ${setsHtml}
          </div>
          ${ex.notes ? `
            <div class="history-ex-feedback ${isPain ? 'pain' : ''}">
              ${isPain ? `<span class="pain-indicator"><i data-lucide="alert-triangle" style="width:12px;"></i> ALERT DOLORE:</span>` : '<strong>Feedback:</strong>'}
              <span>${ex.notes}</span>
            </div>
          ` : ''}
        </div>
      `;
    });

    item.innerHTML = `
      <div class="history-item-header">
        <div>
          <span class="history-item-date">${formatItalianDate(workout.date)}</span>
          <span style="margin-left: 12px; font-weight:600; font-family:var(--font-title);">${workout.name}</span>
        </div>
        <div class="history-item-meta">
          <span>Durata: <strong>${workout.duration} min</strong></span>
          <span>RPE Medio: <strong>${avgRpe}/5</strong></span>
        </div>
      </div>
      
      ${painAlerts.length > 0 ? `
        <div style="background: rgba(255, 51, 102, 0.08); border: 1px solid var(--accent-red); border-radius: var(--radius-md); padding: 12px; margin-bottom: 12px; font-size:13px;">
          <strong style="color:var(--accent-red); display:flex; align-items:center; gap:6px;">
            <i data-lucide="alert-octagon"></i> Rilevato Dolore in questa seduta:
          </strong>
          <ul style="margin-left: 20px; margin-top: 6px; color:var(--text-main);">
            ${painAlerts.map(pa => `<li><strong>${pa.exercise}</strong>: ${pa.text}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="history-ex-list">
        ${exercisesHtml}
      </div>
    `;

    container.appendChild(item);
  });
  safeCreateIcons();
}

// ==========================================================================
// GRAFICI ANALISI & CHART.JS (Volley Fit Lab)
// ==========================================================================

let activeAnalyticsSubTab = 'tests';

function switchAnalyticsSubTab(subTab) {
  activeAnalyticsSubTab = subTab;
  
  const testsBtn = document.getElementById('subtab-btn-tests');
  const volumeBtn = document.getElementById('subtab-btn-volume');
  const rpeBtn = document.getElementById('subtab-btn-rpe');
  
  const testsContent = document.getElementById('subtab-tests-content');
  const volumeContent = document.getElementById('subtab-volume-content');
  const rpeContent = document.getElementById('subtab-rpe-content');
  
  testsBtn.className = 'btn-secondary sub-tab-btn';
  volumeBtn.className = 'btn-secondary sub-tab-btn';
  rpeBtn.className = 'btn-secondary sub-tab-btn';
  
  testsContent.style.display = 'none';
  volumeContent.style.display = 'none';
  rpeContent.style.display = 'none';
  
  if (subTab === 'tests') {
    testsBtn.className = 'btn-primary sub-tab-btn';
    testsContent.style.display = 'block';
  } else if (subTab === 'volume') {
    volumeBtn.className = 'btn-primary sub-tab-btn';
    volumeContent.style.display = 'block';
  } else if (subTab === 'rpe') {
    rpeBtn.className = 'btn-primary sub-tab-btn';
    rpeContent.style.display = 'block';
  }
  
  renderAnalyticsCharts();
}

function updateVolumeAnalytics() {
  renderAnalyticsCharts();
}

let activeVolumeMetric = 'ton'; // 'ton' o 'reps'

function switchVolumeMetric(metric) {
  activeVolumeMetric = metric;
  
  const tonBtn = document.getElementById('btn-vol-metric-ton');
  const repsBtn = document.getElementById('btn-vol-metric-reps');
  
  if (metric === 'ton') {
    tonBtn.className = 'btn-primary';
    tonBtn.style.background = '';
    tonBtn.style.color = '';
    
    repsBtn.className = 'btn-secondary';
    repsBtn.style.background = 'transparent';
    repsBtn.style.color = 'var(--text-muted)';
  } else {
    repsBtn.className = 'btn-primary';
    repsBtn.style.background = '';
    repsBtn.style.color = '';
    
    tonBtn.className = 'btn-secondary';
    tonBtn.style.background = 'transparent';
    tonBtn.style.color = 'var(--text-muted)';
  }
  
  renderAnalyticsCharts();
}

function renderAnalyticsCharts() {
  const athlete = getActiveAthlete();
  if (!athlete) return;

  if (typeof Chart === 'undefined') {
    document.querySelectorAll('.chart-container').forEach(container => {
      if (!container.querySelector('.chart-unavailable')) {
        const msg = document.createElement('div');
        msg.className = 'chart-unavailable';
        msg.style.cssText = 'padding: 16px; color: var(--text-muted); font-size: 13px; text-align: center;';
        msg.textContent = 'Grafico non disponibile: Chart.js non è stato caricato.';
        container.appendChild(msg);
      }
    });
    return;
  }

  // Distruggi grafici esistenti per evitare glitch grafici in Chart.js
  Object.keys(charts).forEach(key => {
    if (charts[key] && typeof charts[key].destroy === 'function') {
      charts[key].destroy();
      delete charts[key];
    }
  });
  document.querySelectorAll('.chart-unavailable').forEach(el => el.remove());

  if (activeAnalyticsSubTab === 'tests') {
    // --- GRAFICI DEI MASSIMALI DEI TEST ---
    
    // Ottiene date e valori per i bilancieri (Reale dai test)
    function getStrengthChartData(testField) {
      const sortedTests = [...athlete.tests.strength]
        .filter(t => t[testField] !== undefined && t[testField] !== null && t[testField] > 0)
        .sort((a,b) => new Date(a.date) - new Date(b.date));

      return {
        labels: sortedTests.map(t => formatItalianDate(t.date)),
        reale: sortedTests.map(t => t[testField])
      };
    }

    // Ottiene date e valori per i test singoli a linea unica (CMJ, Broad, Spike, Sprint)
    function getSingleTestChartData(category, testField) {
      const sortedTests = [...(athlete.tests[category] || [])]
        .filter(t => t[testField] !== undefined && t[testField] !== null && t[testField] > 0)
        .sort((a,b) => new Date(a.date) - new Date(b.date));

      return {
        labels: sortedTests.map(t => formatItalianDate(t.date)),
        data: sortedTests.map(t => t[testField])
      };
    }

    // --- CREATORE GRAFICI BILANCIERE (SOLO REALE TESTATO) ---
    function createBarbellChart(canvasId, title, labels, reale, colorReale) {
      const canvasEl = document.getElementById(canvasId);
      if (!canvasEl) return null;
      const ctx = canvasEl.getContext('2d');
      return new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Massimale Reale (Test, kg)',
              data: reale,
              borderColor: colorReale,
              backgroundColor: 'transparent',
              tension: 0.1,
              spanGaps: true,
              pointStyle: 'circle',
              pointRadius: 6,
              pointHoverRadius: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
          },
          plugins: {
            legend: { labels: { color: '#fff', font: { family: 'Outfit' } } }
          }
        }
      });
    }

    // --- CREATORE GRAFICI TEST SINGOLI ---
    function createSingleLineChart(canvasId, label, labels, data, color, reverseY = false) {
      const canvasEl = document.getElementById(canvasId);
      if (!canvasEl) return null;
      const ctx = canvasEl.getContext('2d');
      return new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: label,
              data: data,
              borderColor: color,
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              tension: 0.1,
              spanGaps: true,
              pointRadius: 5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { 
              reverse: reverseY,
              grid: { color: 'rgba(255,255,255,0.05)' }, 
              ticks: { color: '#9ca3af' } 
            },
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
          },
          plugins: {
            legend: { labels: { color: '#fff', font: { family: 'Outfit' } } }
          }
        }
      });
    }

    // 1. Back Squat
    const squatData = getStrengthChartData('squat1RM');
    charts.squat = createBarbellChart('chart-squat', 'Back Squat', squatData.labels, squatData.reale, '#ccff00');

    // 2. Power Clean
    const cleanData = getStrengthChartData('powerClean1RM');
    charts.powerclean = createBarbellChart('chart-powerclean', 'Power Clean', cleanData.labels, cleanData.reale, '#00d9ff');

    // 3. Push Press
    const pressData = getStrengthChartData('pushPress1RM');
    charts.pushpress = createBarbellChart('chart-pushpress', 'Push Press', pressData.labels, pressData.reale, '#ff7b00');

    // 4. Stacco Bilanciere
    const deadliftData = getStrengthChartData('deadlift1RM');
    charts.deadlift = createBarbellChart('chart-deadlift', 'Stacco Bilanciere', deadliftData.labels, deadliftData.reale, '#ff3366');

    // 5. CMJ
    const cmjData = getSingleTestChartData('elevation', 'cmj');
    charts.cmj = createSingleLineChart('chart-cmj', 'Elevazione CMJ (cm)', cmjData.labels, cmjData.data, '#ccff00');

    // 6. Broad Jump
    const broadData = getSingleTestChartData('elevation', 'broadJump');
    charts.broadjump = createSingleLineChart('chart-broadjump', 'Salto in lungo da fermo (cm)', broadData.labels, broadData.data, '#00d9ff');

    // 7. Spike Jump
    const spikeData = getSingleTestChartData('elevation', 'spikeJump');
    charts.spikejump = createSingleLineChart('chart-spikejump', 'Reach Salto con Rincorsa (cm)', spikeData.labels, spikeData.data, '#ff7b00');

    // 8. Sprint 10m
    const sprintData = getSingleTestChartData('speed', 'sprint10m');
    charts.sprint10m = createSingleLineChart('chart-sprint10m', 'Tempo Sprint 10m (s)', sprintData.labels, sprintData.data, '#ff3366', true);

    // 9. RPE Medio (Fatica)
    const historySorted = [...(athlete.history || [])].reverse();
    const fatigueLabels = historySorted.map(w => formatItalianDate(w.date));
    const rpeAverages = historySorted.map(w => {
      let sum = 0;
      let count = 0;
      w.exercises.forEach(ex => {
        if (ex.fatigue) {
          sum += ex.fatigue;
          count++;
        }
      });
      return count > 0 ? (sum / count).toFixed(1) : 0;
    });

    const chartRpeEl = document.getElementById('chart-rpe');
    if (chartRpeEl) {
      const ctxRpe = chartRpeEl.getContext('2d');
      charts.rpe = new Chart(ctxRpe, {
        type: 'bar',
        data: {
          labels: fatigueLabels,
          datasets: [{
            label: 'Fatica Media Percepita (RPE 1-5)',
            data: rpeAverages,
            backgroundColor: rpeAverages.map(val => {
              if (val >= 4.0) return 'rgba(255, 51, 102, 0.6)';
              if (val >= 3.0) return 'rgba(255, 123, 0, 0.6)';
              return 'rgba(0, 217, 255, 0.6)';
            }),
            borderColor: rpeAverages.map(val => {
              if (val >= 4.0) return 'var(--accent-red)';
              if (val >= 3.0) return 'var(--accent-orange)';
              return 'var(--accent-blue)';
            }),
            borderWidth: 1.5,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { min: 0, max: 5, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { stepSize: 1, color: '#9ca3af' } },
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }

  } else if (activeAnalyticsSubTab === 'volume') {
    // --- SOTTO-TAB 2: VOLUME & PARAMETRI ALLENAMENTO ---
    const timeframe = document.getElementById('volume-timeframe-filter').value;
    const history = athlete.history || [];
    const now = new Date();

    const filteredWorkouts = history.filter(w => {
      const wDate = new Date(w.date);
      const diffTime = Math.abs(now - wDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (timeframe === 'last') {
        return w === history[0];
      } else if (timeframe === '1w') {
        return diffDays <= 7;
      } else if (timeframe === '1m') {
        return diffDays <= 30;
      } else if (timeframe === '3m') {
        return diffDays <= 90;
      } else if (timeframe === '6m') {
        return diffDays <= 180;
      } else if (timeframe === '12m') {
        return diffDays <= 365;
      }
      return true; // 'all'
    });

    // Aggregazione statistiche di volume
    let totalTonnage = 0;
    let totalReps = 0;
    let lowerTon = 0;
    let lowerReps = 0;
    let upperTon = 0;
    let upperReps = 0;
    let plyoTon = 0;
    let plyoReps = 0;

    let specSquatTon = 0;
    let specSquatReps = 0;
    let specDeadliftTon = 0;
    let specDeadliftReps = 0;
    let specPressTon = 0;
    let specPressReps = 0;
    let specCleanPullTon = 0;
    let specCleanPullReps = 0;

    filteredWorkouts.forEach(workout => {
      workout.exercises.forEach(ex => {
        let exerciseTonnage = 0;
        let exerciseReps = 0;

        ex.sets.forEach(s => {
          if (s.completed) {
            const reps = s.actualReps || 0;
            const weight = s.actualWeight || 0;
            exerciseTonnage += weight * reps;
            exerciseReps += reps;
          }
        });

        totalTonnage += exerciseTonnage;
        totalReps += exerciseReps;

        const catNormalized = (ex.category || '').toLowerCase();
        if (catNormalized.includes('inferiori')) {
          lowerTon += exerciseTonnage;
          lowerReps += exerciseReps;
        } else if (catNormalized.includes('superiori')) {
          upperTon += exerciseTonnage;
          upperReps += exerciseReps;
        } else if (catNormalized.includes('pliom') || catNormalized.includes('balist')) {
          plyoTon += exerciseTonnage;
          plyoReps += exerciseReps;
        }

        // Calcoli per esercizi specifici (compresi varianti)
        const exNameLower = (ex.name || '').toLowerCase();
        if (exNameLower.includes('squat') || exNameLower.includes('affond')) {
          specSquatTon += exerciseTonnage;
          specSquatReps += exerciseReps;
        }
        if (exNameLower.includes('stacco') || exNameLower.includes('rdl')) {
          specDeadliftTon += exerciseTonnage;
          specDeadliftReps += exerciseReps;
        }
        if (exNameLower.includes('press') || exNameLower.includes('military')) {
          specPressTon += exerciseTonnage;
          specPressReps += exerciseReps;
        }
        if (exNameLower.includes('high pull') || exNameLower.includes('clean') || exNameLower.includes('girata')) {
          specCleanPullTon += exerciseTonnage;
          specCleanPullReps += exerciseReps;
        }
      });
    });

    // Aggiornamento DOM
    document.getElementById('vol-summary-tonnage').innerText = `${Math.round(totalTonnage).toLocaleString('it-IT')} kg`;
    document.getElementById('vol-summary-reps').innerText = totalReps.toLocaleString('it-IT');
    document.getElementById('vol-lower-ton').innerText = Math.round(lowerTon).toLocaleString('it-IT');
    document.getElementById('vol-lower-reps').innerText = lowerReps.toLocaleString('it-IT');
    document.getElementById('vol-upper-ton').innerText = Math.round(upperTon).toLocaleString('it-IT');
    document.getElementById('vol-upper-reps').innerText = upperReps.toLocaleString('it-IT');
    document.getElementById('vol-plyo-ton').innerText = Math.round(plyoTon).toLocaleString('it-IT');
    document.getElementById('vol-plyo-reps').innerText = plyoReps.toLocaleString('it-IT');

    // Aggiornamento DOM esercizi specifici
    document.getElementById('vol-spec-squat-ton').innerText = Math.round(specSquatTon).toLocaleString('it-IT');
    document.getElementById('vol-spec-squat-reps').innerText = specSquatReps.toLocaleString('it-IT');
    document.getElementById('vol-spec-deadlift-ton').innerText = Math.round(specDeadliftTon).toLocaleString('it-IT');
    document.getElementById('vol-spec-deadlift-reps').innerText = specDeadliftReps.toLocaleString('it-IT');
    document.getElementById('vol-spec-press-ton').innerText = Math.round(specPressTon).toLocaleString('it-IT');
    document.getElementById('vol-spec-press-reps').innerText = specPressReps.toLocaleString('it-IT');
    document.getElementById('vol-spec-cleanpull-ton').innerText = Math.round(specCleanPullTon).toLocaleString('it-IT');
    document.getElementById('vol-spec-cleanpull-reps').innerText = specCleanPullReps.toLocaleString('it-IT');

    // Funzione per raccogliere l'andamento del volume per un singolo esercizio principale
    function getVolumeTrendData(exerciseKeyword) {
      const sortedWorkouts = [...filteredWorkouts].reverse();
      
      const labels = [];
      const tonnageData = [];
      const repsData = [];

      sortedWorkouts.forEach(workout => {
        let exerciseTonnage = 0;
        let exerciseReps = 0;
        let found = false;

        workout.exercises.forEach(ex => {
          if (ex.name.toLowerCase().includes(exerciseKeyword)) {
            found = true;
            ex.sets.forEach(s => {
              if (s.completed) {
                exerciseTonnage += (s.actualWeight || 0) * (s.actualReps || 0);
                exerciseReps += (s.actualReps || 0);
              }
            });
          }
        });

        if (found) {
          labels.push(formatItalianDate(workout.date));
          tonnageData.push(exerciseTonnage);
          repsData.push(exerciseReps);
        }
      });

      return { labels, tonnageData, repsData };
    }

    // Creatore grafici di volume a singola metrica (Tonnellaggio o Alzate)
    function createVolumeSingleChart(canvasId, label, labels, data, color, yLabel) {
      const canvasEl = document.getElementById(canvasId);
      if (!canvasEl) return null;
      const ctx = canvasEl.getContext('2d');
      return new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: label,
              data: data,
              borderColor: color,
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              tension: 0.15,
              pointRadius: 5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#9ca3af' },
              title: { display: true, text: yLabel, color: '#fff' }
            },
            x: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#9ca3af' }
            }
          },
          plugins: {
            legend: { labels: { color: '#fff', font: { family: 'Outfit' } } }
          }
        }
      });
    }

    const isTon = activeVolumeMetric === 'ton';
    const yLabel = isTon ? 'Tonnellaggio (kg)' : 'Alzate (Ripetizioni)';
    
    // Assegna colori specifici in base alla metrica scelta per rendere i grafici vibranti
    const squatColor = isTon ? '#ccff00' : '#00d9ff';
    const cleanColor = isTon ? '#00d9ff' : '#ff7b00';
    const pressColor = isTon ? '#ff7b00' : '#ccff00';
    const deadliftColor = isTon ? '#ff3366' : '#00d9ff';

    // 1. Squat & Affondi
    const vSquat = getVolumeTrendData('squat');
    // Consideriamo anche gli affondi per il trend
    const vAffondi = getVolumeTrendData('affond');
    
    // Uniamo i dati se l'atleta ha entrambi lo stesso giorno nello storico (somma) o prendiamo squat
    const combinedSquatLabels = Array.from(new Set([...vSquat.labels, ...vAffondi.labels])).sort((a,b) => {
      // Formato data italiana (es. 29 Giu 2026), per ordinamento corretto leggiamo dal filteredWorkouts
      const dA = filteredWorkouts.find(w => formatItalianDate(w.date) === a)?.date || '';
      const dB = filteredWorkouts.find(w => formatItalianDate(w.date) === b)?.date || '';
      return new Date(dA) - new Date(dB);
    });
    
    const combinedSquatData = combinedSquatLabels.map(lbl => {
      const idxSquat = vSquat.labels.indexOf(lbl);
      const idxAffondi = vAffondi.labels.indexOf(lbl);
      const valSquat = idxSquat !== -1 ? (isTon ? vSquat.tonnageData[idxSquat] : vSquat.repsData[idxSquat]) : 0;
      const valAffondi = idxAffondi !== -1 ? (isTon ? vAffondi.tonnageData[idxAffondi] : vAffondi.repsData[idxAffondi]) : 0;
      return valSquat + valAffondi;
    });

    charts.volSquat = createVolumeSingleChart('chart-vol-squat', isTon ? 'Squat & Affondi (Tonnellaggio, kg)' : 'Squat & Affondi (Alzate)', combinedSquatLabels, combinedSquatData, squatColor, yLabel);

    // 2. High Pull & Clean
    const vClean = getVolumeTrendData('clean');
    const vPull = getVolumeTrendData('high pull');
    const vGirata = getVolumeTrendData('girata');
    const combinedCleanLabels = Array.from(new Set([...vClean.labels, ...vPull.labels, ...vGirata.labels])).sort((a,b) => {
      const dA = filteredWorkouts.find(w => formatItalianDate(w.date) === a)?.date || '';
      const dB = filteredWorkouts.find(w => formatItalianDate(w.date) === b)?.date || '';
      return new Date(dA) - new Date(dB);
    });
    const combinedCleanData = combinedCleanLabels.map(lbl => {
      const idxClean = vClean.labels.indexOf(lbl);
      const idxPull = vPull.labels.indexOf(lbl);
      const idxGirata = vGirata.labels.indexOf(lbl);
      const valClean = idxClean !== -1 ? (isTon ? vClean.tonnageData[idxClean] : vClean.repsData[idxClean]) : 0;
      const valPull = idxPull !== -1 ? (isTon ? vPull.tonnageData[idxPull] : vPull.repsData[idxPull]) : 0;
      const valGirata = idxGirata !== -1 ? (isTon ? vGirata.tonnageData[idxGirata] : vGirata.repsData[idxGirata]) : 0;
      return valClean + valPull + valGirata;
    });

    charts.volClean = createVolumeSingleChart('chart-vol-powerclean', isTon ? 'High Pull & Clean (Tonnellaggio, kg)' : 'High Pull & Clean (Alzate)', combinedCleanLabels, combinedCleanData, cleanColor, yLabel);

    // 3. Press Verticali
    const vPress = getVolumeTrendData('press');
    const vMilitary = getVolumeTrendData('military');
    const combinedPressLabels = Array.from(new Set([...vPress.labels, ...vMilitary.labels])).sort((a,b) => {
      const dA = filteredWorkouts.find(w => formatItalianDate(w.date) === a)?.date || '';
      const dB = filteredWorkouts.find(w => formatItalianDate(w.date) === b)?.date || '';
      return new Date(dA) - new Date(dB);
    });
    const combinedPressData = combinedPressLabels.map(lbl => {
      const idxPress = vPress.labels.indexOf(lbl);
      const idxMil = vMilitary.labels.indexOf(lbl);
      const valPress = idxPress !== -1 ? (isTon ? vPress.tonnageData[idxPress] : vPress.repsData[idxPress]) : 0;
      const valMil = idxMil !== -1 ? (isTon ? vMilitary.tonnageData[idxMil] : vMilitary.repsData[idxMil]) : 0;
      return valPress + valMil;
    });

    charts.volPress = createVolumeSingleChart('chart-vol-pushpress', isTon ? 'Press Verticali (Tonnellaggio, kg)' : 'Press Verticali (Alzate)', combinedPressLabels, combinedPressData, pressColor, yLabel);

    // 4. Stacchi & RDL
    const vDeadlift = getVolumeTrendData('stacco');
    const vRdl = getVolumeTrendData('rdl');
    const combinedDeadLabels = Array.from(new Set([...vDeadlift.labels, ...vRdl.labels])).sort((a,b) => {
      const dA = filteredWorkouts.find(w => formatItalianDate(w.date) === a)?.date || '';
      const dB = filteredWorkouts.find(w => formatItalianDate(w.date) === b)?.date || '';
      return new Date(dA) - new Date(dB);
    });
    const combinedDeadData = combinedDeadLabels.map(lbl => {
      const idxDead = vDeadlift.labels.indexOf(lbl);
      const idxRdl = vRdl.labels.indexOf(lbl);
      const valDead = idxDead !== -1 ? (isTon ? vDeadlift.tonnageData[idxDead] : vDeadlift.repsData[idxDead]) : 0;
      const valRdl = idxRdl !== -1 ? (isTon ? vRdl.tonnageData[idxRdl] : vRdl.repsData[idxRdl]) : 0;
      return valDead + valRdl;
    });

    charts.volDeadlift = createVolumeSingleChart('chart-vol-deadlift', isTon ? 'Stacchi & RDL (Tonnellaggio, kg)' : 'Stacchi & RDL (Alzate)', combinedDeadLabels, combinedDeadData, deadliftColor, yLabel);
  } else if (activeAnalyticsSubTab === 'rpe') {
    // --- SOTTO-TAB 3: ANDAMENTO FATICA (RPE) ---
    const timeframe = document.getElementById('rpe-timeframe-filter').value;
    const history = athlete.history || [];
    const now = new Date();

    const filteredWorkouts = history.filter(w => {
      const wDate = new Date(w.date);
      const diffTime = Math.abs(now - wDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (timeframe === 'last') {
        return w === history[0];
      } else if (timeframe === '1w') {
        return diffDays <= 7;
      } else if (timeframe === '1m') {
        return diffDays <= 30;
      } else if (timeframe === '3m') {
        return diffDays <= 90;
      } else if (timeframe === '6m') {
        return diffDays <= 180;
      } else if (timeframe === '12m') {
        return diffDays <= 365;
      }
      return true; // 'all'
    });

    const historySorted = [...filteredWorkouts].reverse();
    const sessionLabels = historySorted.map(w => formatItalianDate(w.date));
    const sessionRpes = historySorted.map(w => {
      let sum = 0;
      let count = 0;
      w.exercises.forEach(ex => {
        if (ex.fatigue) {
          sum += ex.fatigue;
          count++;
        }
      });
      // Arrotondamento per eccesso
      return count > 0 ? Math.ceil(sum / count) : 0;
    });

    // Creatore grafico di linea RPE (asse Y da 1 a 5)
    function createRpeTrendChart(canvasId, label, labels, data, color) {
      const canvasEl = document.getElementById(canvasId);
      if (!canvasEl) return null;
      const ctx = canvasEl.getContext('2d');
      return new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: label,
            data: data,
            borderColor: color,
            backgroundColor: 'rgba(255, 255, 255, 0.01)',
            tension: 0.15,
            pointRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { 
              min: 1, 
              max: 5, 
              grid: { color: 'rgba(255,255,255,0.05)' }, 
              ticks: { stepSize: 1, color: '#9ca3af' },
              title: { display: true, text: 'Valore RPE (1-5)', color: '#fff' }
            },
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
          },
          plugins: {
            legend: { labels: { color: '#fff', font: { family: 'Outfit' } } }
          }
        }
      });
    }

    // 1. RPE Sessione Complessiva
    if (document.getElementById('chart-rpe-session-trend')) {
      charts.rpeSession = createRpeTrendChart('chart-rpe-session-trend', 'RPE Sessione (Media per Eccesso)', sessionLabels, sessionRpes, '#ff3366');
    }

    // Funzione per raccogliere l'RPE di un gruppo di esercizi
    function getExerciseRpeTrendData(keywords) {
      const labels = [];
      const data = [];

      historySorted.forEach(workout => {
        let sum = 0;
        let count = 0;
        workout.exercises.forEach(ex => {
          const exNameLower = (ex.name || '').toLowerCase();
          const matches = keywords.some(k => exNameLower.includes(k));
          if (matches && ex.fatigue) {
            sum += ex.fatigue;
            count++;
          }
        });

        if (count > 0) {
          labels.push(formatItalianDate(workout.date));
          data.push((sum / count).toFixed(1));
        }
      });

      return { labels, data };
    }

    // 2. RPE Squat & Affondi
    const rSquat = getExerciseRpeTrendData(['squat', 'affond']);
    charts.rpeSquat = createRpeTrendChart('chart-rpe-squat-trend', 'RPE Squat & Affondi', rSquat.labels, rSquat.data, '#ccff00');

    // 3. RPE Clean & Pull
    const rClean = getExerciseRpeTrendData(['clean', 'high pull', 'girata']);
    charts.rpeClean = createRpeTrendChart('chart-rpe-clean-trend', 'RPE High Pull & Clean', rClean.labels, rClean.data, '#00d9ff');

    // 4. RPE Press Verticali
    const rPress = getExerciseRpeTrendData(['press', 'military']);
    charts.rpePress = createRpeTrendChart('chart-rpe-press-trend', 'RPE Press Verticali', rPress.labels, rPress.data, '#ff7b00');

    // 5. RPE Stacchi & RDL
    const rDeadlift = getExerciseRpeTrendData(['stacco', 'rdl']);
    charts.rpeDeadlift = createRpeTrendChart('chart-rpe-deadlift-trend', 'RPE Stacchi & RDL', rDeadlift.labels, rDeadlift.data, '#ff3366');
  }
}

// ==========================================================================
// VIEW CLIENTE - PORTALE ATLETA (SMARTPHONE VIEW)
// ==========================================================================

function renderClientSelector() {
  const container = document.getElementById('client-selector-buttons');
  container.innerHTML = '';

  getAthletes().forEach(athlete => {
    const btn = document.createElement('button');
    btn.className = `btn-secondary ${athlete.id === activeClientAthleteId ? 'btn-primary' : ''}`;
    btn.style.padding = '8px 12px';
    btn.innerText = athlete.name;
    btn.addEventListener('click', () => {
      activeClientAthleteId = athlete.id;
      renderClientSelector();
      initClientPortal();
    });
    container.appendChild(btn);
  });
}

function initClientPortal() {
  const athletes = getAthletes();
  
  // Controlla se c'è un parametro ath nell'URL per bloccare l'atleta specifico
  const urlParams = new URLSearchParams(window.location.search);
  const athParam = urlParams.get('ath') || urlParams.get('athlete');
  
  let athlete = null;
  if (athParam) {
    athlete = athletes.find(a => a.id === athParam || a.name.toLowerCase() === athParam.toLowerCase());
    if (athlete) {
      activeClientAthleteId = athlete.id;
      // Nascondi selettore atleti per simulazione
      const selectorEl = document.getElementById('client-athlete-selector');
      if (selectorEl) selectorEl.style.display = 'none';
    }
  }
  
  if (!athlete) {
    athlete = athletes.find(a => a.id === activeClientAthleteId) || athletes[0] || null;
  }
  
  if (!athlete) return;
  activeClientAthleteId = athlete.id;

  document.getElementById('client-ui-name').innerText = athlete.name;
  document.getElementById('client-ui-sport').innerText = `${athlete.ruolo} | ${athlete.sport}`;
  
  const initials = String(athlete.name || '').split(' ').map(n => n[0]).join('').slice(0, 3);
  document.getElementById('client-ui-avatar').innerText = initials;

  document.getElementById('client-workout-date').innerText = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });

  renderClientWorkoutList(athlete);
  
  const timerBox = document.getElementById('client-workout-timer');
  if (athlete.currentWorkoutCompleted) {
    if (timerBox) timerBox.style.display = 'none';
    stopWorkoutTimer();
  } else {
    if (timerBox) timerBox.style.display = 'flex';
    startWorkoutTimer();
  }
}

function renderClientWorkoutList(athlete) {
  const container = document.getElementById('client-exercises-container');
  container.innerHTML = '';

  if (athlete.currentWorkoutCompleted) {
    container.innerHTML = `
      <div style="text-align:center; padding: 60px 20px; color:var(--text-main);">
        <div style="font-size: 60px; margin-bottom: 20px;">🏆</div>
        <h3 style="font-family: var(--font-title); margin-bottom: 12px; font-size: 20px;">Seduta Completata!</h3>
        <p style="color:var(--text-muted); font-size: 14px; line-height: 1.5; max-width: 320px; margin: 0 auto;">Hai completato e inviato il tuo allenamento. Il coach sta analizzando i tuoi risultati per preparare la prossima scheda.</p>
      </div>
    `;
    document.getElementById('btn-client-submit-workout').style.display = 'none';
    return;
  }

  if (!athlete.currentWorkout || athlete.currentWorkout.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 40px 10px; color:var(--text-muted);">Nessun allenamento programmato per oggi dal coach.</div>`;
    document.getElementById('btn-client-submit-workout').style.display = 'none';
    return;
  }

  document.getElementById('btn-client-submit-workout').style.display = 'flex';

  athlete.currentWorkout.forEach((ex, exIdx) => {
    if (!ex.id) {
      ex.id = 'ex-' + (exIdx + 1) + '-' + Date.now();
    }
    const card = document.createElement('div');
    card.className = 'client-ex-card';
    card.setAttribute('data-ex-id', ex.id);
    card.setAttribute('data-ex-name', ex.name || '');
    card.setAttribute('data-ex-category', ex.category || '');
    card.setAttribute('data-ex-type', ex.type || 'weight');

    let setsRowsHtml = '';
    const numSets = Array.isArray(ex.setsList) ? ex.setsList.length : ex.sets;

    for (let s = 0; s < numSets; s++) {
      let targetText = '';
      let targetReps = ex.reps;
      let targetWeight = ex.weight || 0;

      if (Array.isArray(ex.setsList) && ex.setsList[s]) {
        targetReps = ex.setsList[s].reps;
        targetWeight = ex.setsList[s].weight !== undefined ? ex.setsList[s].weight : (ex.weight || 0);
      }

      if (ex.type === 'weight') {
        targetText = `${targetWeight}kg x ${targetReps}`;
      } else if (ex.type === 'time') {
        targetText = `${targetReps} sec`;
      } else {
        targetText = `${targetReps} rep`;
      }

      let inputWrapperHtml = '';
      if (ex.type === 'weight') {
        inputWrapperHtml = `
          <input type="number" class="client-input-weight form-control" value="${targetWeight}" min="0">
          <span style="font-size:10px; color:var(--text-muted);">kg</span>
          <span style="font-size:10px; color:var(--text-muted); margin: 0 2px;">x</span>
          <input type="number" class="client-input-rep form-control" value="${targetReps}" min="0">
          <span style="font-size:10px; color:var(--text-muted);">rep</span>
        `;
      } else {
        inputWrapperHtml = `
          <input type="number" class="client-input-rep form-control" value="${targetReps}" min="0">
          <span style="font-size:10px; color:var(--text-muted);">${ex.type === 'time' ? 's' : 'rep'}</span>
        `;
      }

      setsRowsHtml += `
        <div class="client-set-row" data-set-idx="${s}">
          <span class="client-set-num">SET ${s+1}</span>
          <span class="client-set-target">${escapeHtml(targetText)}</span>
          <div class="client-input-wrapper">
            ${inputWrapperHtml}
          </div>
          <div>
            <button type="button" class="client-delete-set-btn" onclick="deleteClientSetRow(this)" style="background:none; border:none; color:var(--accent-red); cursor:pointer; display:flex; align-items:center; justify-content:center; padding: 4px;" title="Elimina questa serie">
              <i data-lucide="minus-circle" style="width:18px; height:18px;"></i>
            </button>
          </div>
        </div>
      `;
    }

    const svgIcon = getExerciseSvg(ex.name, ex.category);

    card.innerHTML = `
      <div class="client-ex-header" style="display: flex; gap: 16px; align-items: center; justify-content: space-between; width: 100%;">
        <div style="flex-grow: 1;">
          <div class="client-ex-name" style="font-size: 17px; font-weight: 700;">${escapeHtml(ex.name)} ${ex.variation ? `<span style="color: var(--accent-orange); font-size:12px; font-weight:600; margin-left:6px;">(${escapeHtml(ex.variation)})</span>` : ''}</div>
          <div style="display:flex; gap: 6px; margin-top: 4px; align-items: center; flex-wrap: wrap;">
            <span class="client-ex-category">${escapeHtml(ex.category)}</span>
            <span style="font-size:11px; color:var(--text-muted);">${escapeHtml(ex.sets)} set x ${ex.type === 'time' ? escapeHtml(ex.reps) + 's' : escapeHtml(ex.reps) + ' rep'} ${ex.type === 'weight' ? '@ ' + escapeHtml(ex.weight) + 'kg' : ''}</span>
          </div>
          <div style="font-size: 11px; color: var(--accent-blue); margin-top: 3px; font-weight: 500;">
            recupero: ${escapeHtml(ex.rest || 120)} sec
          </div>
        </div>
        <div class="client-ex-icon-wrapper" style="flex-shrink: 0; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; padding: 2px;">
          ${svgIcon}
        </div>
      </div>

      <div class="client-sets-table">
        <div class="client-set-header-row">
          <span>Set</span>
          <span>Target</span>
          <span>Effettive</span>
          <span></span>
        </div>
        <div class="client-sets-rows-container">
          ${setsRowsHtml}
        </div>
        <div style="display:flex; justify-content: flex-start; margin-top: 6px;">
          <button type="button" class="btn-secondary add-client-set-btn" onclick="addClientSetRow(this)" style="padding: 4px 8px; font-size: 11px; color: var(--accent-neon); border-color: rgba(204,255,0,0.2); display: flex; align-items: center; gap: 4px; background: transparent;">
            <i data-lucide="plus" style="width:14px; height:14px;"></i> Aggiungi Serie
          </button>
        </div>
      </div>

      <div class="client-ex-feedback-form">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="client-feedback-title">Fatica / Velocità:</span>
          <span class="fatigue-selected-label">--</span>
        </div>
        <div class="fatigue-rating">
          <button type="button" class="fatigue-btn" data-val="1" onclick="selectFatigue(this, 1)">1</button>
          <button type="button" class="fatigue-btn" data-val="2" onclick="selectFatigue(this, 2)">2</button>
          <button type="button" class="fatigue-btn" data-val="3" onclick="selectFatigue(this, 3)">3</button>
          <button type="button" class="fatigue-btn" data-val="4" onclick="selectFatigue(this, 4)">4</button>
          <button type="button" class="fatigue-btn" data-val="5" onclick="selectFatigue(this, 5)">5</button>
        </div>

        <input type="text" class="client-note-textarea form-control client-ex-note" placeholder="Note (dolore, stanchezza, fastidi e dove)...">
      </div>
    `;

    container.appendChild(card);
  });
  safeCreateIcons();
}

function deleteClientSetRow(button) {
  const row = button.closest('.client-set-row');
  const container = row.closest('.client-sets-rows-container');
  row.remove();
  reindexClientSets(container);
}

function reindexClientSets(container) {
  const rows = container.querySelectorAll('.client-set-row');
  rows.forEach((row, sIdx) => {
    row.setAttribute('data-set-idx', sIdx);
    const numSpan = row.querySelector('.client-set-num');
    if (numSpan) {
      numSpan.innerText = `SET ${sIdx + 1}`;
    }
  });
}

function addClientSetRow(button) {
  const card = button.closest('.client-ex-card');
  const rowsContainer = card.querySelector('.client-sets-rows-container');
  const type = card.getAttribute('data-ex-type');
  
  let lastReps = 5;
  let lastWeight = 0;
  
  const rows = rowsContainer.querySelectorAll('.client-set-row');
  if (rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    const repInput = lastRow.querySelector('.client-input-rep');
    const weightInput = lastRow.querySelector('.client-input-weight');
    
    if (repInput) lastReps = parseInt(repInput.value) || 5;
    if (weightInput) lastWeight = parseFloat(weightInput.value) || 0;
  }

  const newIdx = rows.length;
  const targetText = type === 'weight' ? `${lastWeight}kg Ã— ${lastReps}` : (type === 'time' ? `${lastReps} sec` : `${lastReps} rep`);

  let inputWrapperHtml = '';
  if (type === 'weight') {
    inputWrapperHtml = `
      <input type="number" class="client-input-weight form-control" value="${lastWeight}" min="0">
      <span style="font-size:10px; color:var(--text-muted);">kg</span>
      <span style="font-size:10px; color:var(--text-muted); margin: 0 2px;">Ã—</span>
      <input type="number" class="client-input-rep form-control" value="${lastReps}" min="0">
      <span style="font-size:10px; color:var(--text-muted);">rep</span>
    `;
  } else {
    inputWrapperHtml = `
      <input type="number" class="client-input-rep form-control" value="${lastReps}" min="0">
      <span style="font-size:10px; color:var(--text-muted);">${type === 'time' ? 's' : 'rep'}</span>
    `;
  }

  const newRow = document.createElement('div');
  newRow.className = 'client-set-row';
  newRow.setAttribute('data-set-idx', newIdx);
  newRow.innerHTML = `
    <span class="client-set-num">SET ${newIdx + 1}</span>
    <span class="client-set-target">${targetText}</span>
    <div class="client-input-wrapper">
      ${inputWrapperHtml}
    </div>
    <div>
      <button type="button" class="client-delete-set-btn" onclick="deleteClientSetRow(this)" style="background:none; border:none; color:var(--accent-red); cursor:pointer; display:flex; align-items:center; justify-content:center; padding: 4px;" title="Elimina questa serie">
        <i data-lucide="minus-circle" style="width:18px; height:18px;"></i>
      </button>
    </div>
  `;

  rowsContainer.appendChild(newRow);
  safeCreateIcons();
}

function selectFatigue(button, value) {
  const container = button.closest('.fatigue-rating');
  const label = button.closest('.client-ex-feedback-form').querySelector('.fatigue-selected-label');
  const buttons = container.querySelectorAll('.fatigue-btn');
  
  buttons.forEach(btn => {
    btn.className = 'fatigue-btn';
  });

  const descriptions = {
    1: 'Facilissima',
    2: 'Esplosiva',
    3: 'Fluida',
    4: 'Rallentata',
    5: 'Grindata'
  };

  button.classList.add(`active-${value}`);
  label.innerText = descriptions[value];
  label.className = `fatigue-selected-label val-${value}`;
  container.setAttribute('data-value', value);
}

// Timer di sessione
function startWorkoutTimer() {
  stopWorkoutTimer();
  workoutSeconds = 0;
  document.getElementById('timer-val').innerText = "00:00";

  workoutTimerInterval = setInterval(() => {
    workoutSeconds++;
    const mins = Math.floor(workoutSeconds / 60).toString().padStart(2, '0');
    const secs = (workoutSeconds % 60).toString().padStart(2, '0');
    document.getElementById('timer-val').innerText = `${mins}:${secs}`;
  }, 1000);
}

function stopWorkoutTimer() {
  if (workoutTimerInterval) {
    clearInterval(workoutTimerInterval);
    workoutTimerInterval = null;
  }
}

// Invio dell'allenamento completato
function submitClientWorkout() {
  const athlete = db.athletes.find(a => a.id === activeClientAthleteId);
  if (!athlete) return;

  const exCards = document.querySelectorAll('#client-exercises-container .client-ex-card');
  const completedExercises = [];
  let atLeastOneCompleted = false;

  exCards.forEach(card => {
    const exId = card.getAttribute('data-ex-id');
    const exName = card.getAttribute('data-ex-name');
    const exCategory = card.getAttribute('data-ex-category');
    const exType = card.getAttribute('data-ex-type');

    let targetEx = athlete.currentWorkout.find(x => x.id === exId);
    if (!targetEx) {
      targetEx = athlete.currentWorkout.find(x => x.name.toLowerCase() === exName.toLowerCase());
    }
    if (!targetEx) return;

    const fatigueRatingContainer = card.querySelector('.fatigue-rating');
    const fatigueVal = parseInt(fatigueRatingContainer.getAttribute('data-value'));
    
    // Se non ha dato il voto di fatica, significa che non ha svolto l'esercizio
    if (isNaN(fatigueVal)) return;

    atLeastOneCompleted = true;

    const setRows = card.querySelectorAll('.client-set-row');
    const setsData = [];

    setRows.forEach((row, sIdx) => {
      const actualRepsInput = row.querySelector('.client-input-rep');
      const actualReps = Math.max(0, parseInt(actualRepsInput.value) || 0);
      
      const actualWeightInput = row.querySelector('.client-input-weight');
      const actualWeight = actualWeightInput ? Math.max(0, parseFloat(actualWeightInput.value) || 0) : 0;

      let setTargetReps = targetEx.reps;
      let setTargetWeight = targetEx.weight || 0;
      if (Array.isArray(targetEx.setsList) && targetEx.setsList[sIdx]) {
        setTargetReps = targetEx.setsList[sIdx].reps;
        setTargetWeight = targetEx.setsList[sIdx].weight !== undefined ? targetEx.setsList[sIdx].weight : setTargetWeight;
      }

      setsData.push({
        targetReps: setTargetReps,
        actualReps: actualReps,
        targetWeight: setTargetWeight,
        actualWeight: actualWeight,
        completed: true
      });
    });

    const noteText = card.querySelector('.client-ex-note').value;

    let technicalQuality = 'fluida';
    if (fatigueVal === 1) technicalQuality = 'facilissima';
    else if (fatigueVal === 2) technicalQuality = 'esplosiva';
    else if (fatigueVal === 3) technicalQuality = 'fluida';
    else if (fatigueVal === 4) technicalQuality = 'rallentata';
    else if (fatigueVal === 5) technicalQuality = 'grindata';

    completedExercises.push({
      name: exName,
      variation: targetEx.variation || '',
      category: exCategory,
      type: exType,
      sets: setsData,
      fatigue: fatigueVal,
      technicalQuality: technicalQuality,
      notes: noteText
    });
  });

  if (!atLeastOneCompleted) {
    alert("Devi valutare la fatica/velocità (da 1 a 5) di almeno un esercizio svolto per poter salvare la seduta!");
    return;
  }

  const durationMinutes = Math.round(workoutSeconds / 60) || 1;
  const completedWorkout = {
    id: `workout-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    date: new Date().toISOString().split('T')[0],
    createdAt: Date.now(),
    name: 'Seduta di Pallavolo (Log Telefono)',
    duration: durationMinutes,
    exercises: completedExercises
  };

  if (!athlete.history) athlete.history = [];
  athlete.history.unshift(completedWorkout);
  
  athlete.currentWorkoutCompleted = true;

  saveDatabase(db);
  if (supabaseClient) {
    uploadSingleAthleteToSupabase(athlete);
  }
  
  stopWorkoutTimer();

  activeAthleteId = activeClientAthleteId;

  // Calcola l'RPE medio della seduta
  let sumRpe = 0;
  let countRpe = 0;
  completedExercises.forEach(ex => {
    if (ex.fatigue) {
      sumRpe += ex.fatigue;
      countRpe++;
    }
  });
  const avgRpe = countRpe > 0 ? (sumRpe / countRpe) : 0;
  
  showClientSuccessModal(avgRpe);
}

// ==========================================================================
// FUNZIONI DI UTILITÃ€
// ==========================================================================

function formatItalianDate(dateString) {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  return `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`;
}

// Ritorna un'icona SVG stilizzata personalizzata in base all'esercizio o categoria
function getExerciseSvg(exerciseName, category) {
  const nameLower = (exerciseName || '').toLowerCase();

  // --- ESERCIZI PRINCIPALI (STILE SILHOUETTE SOLIDO) ---

  // 1. BACK SQUAT
  if (nameLower.includes('back squat') || (nameLower.includes('squat') && !nameLower.includes('front'))) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--accent-neon)" style="width: 50px; height: 50px;">
        <circle cx="50" cy="35" r="22" />
        <circle cx="50" cy="35" r="3" fill="#0f111a" />
        <path d="M 68 25 C 72 25, 75 28, 75 32 C 75 36, 72 38, 68 38 Z" />
        <path d="M 45 48 C 38 48, 30 52, 30 62 C 30 70, 38 72, 45 70 C 50 68, 55 60, 58 58 L 50 48 Z" />
        <path d="M 45 70 C 52 70, 64 60, 64 56 C 64 52, 60 52, 54 54 C 50 56, 45 60, 42 66 Z" />
        <path d="M 64 56 C 64 65, 54 85, 54 90 C 54 92, 58 92, 65 92 C 68 92, 70 88, 68 85 C 66 80, 64 70, 64 56 Z" />
      </svg>
    `;
  }

  // 2. FRONT SQUAT
  if (nameLower.includes('front squat')) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--accent-neon)" style="width: 50px; height: 50px;">
        <circle cx="62" cy="35" r="22" />
        <circle cx="62" cy="35" r="3" fill="#0f111a" />
        <path d="M 44 25 C 40 25, 37 28, 37 32 C 37 36, 40 38, 44 38 Z" />
        <path d="M 45 48 C 38 48, 30 52, 30 62 C 30 70, 38 72, 45 70 C 50 68, 55 60, 58 58 L 50 48 Z" />
        <path d="M 45 70 C 52 70, 64 60, 64 56 C 64 52, 60 52, 54 54 C 50 56, 45 60, 42 66 Z" />
        <path d="M 64 56 C 64 65, 54 85, 54 90 C 54 92, 58 92, 65 92 C 68 92, 70 88, 68 85 C 66 80, 64 70, 64 56 Z" />
      </svg>
    `;
  }

  // 3. STACCO / DEADLIFT
  if (nameLower.includes('stacco da terra') || nameLower.includes('stacco trap bar') || nameLower.includes('stacco sumo') || nameLower.includes('deadlift') || (nameLower.includes('stacco') && !nameLower.includes('rumen') && !nameLower.includes('rdl'))) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--accent-orange)" style="width: 50px; height: 50px;">
        <circle cx="65" cy="75" r="18" />
        <circle cx="65" cy="75" r="2.5" fill="#0f111a" />
        <circle cx="35" cy="22" r="7" />
        <path d="M 35 25 L 55 50 L 45 53 L 30 30 Z" />
        <path d="M 55 50 C 55 50, 40 70, 40 75 C 40 85, 45 90, 55 90 L 50 92 L 35 92 C 35 85, 45 70, 45 65 Z" />
        <path d="M 38 28 L 65 75 L 61 77 L 34 30 Z" />
      </svg>
    `;
  }

  // 4. POWER CLEAN / GIRATA
  if (nameLower.includes('power clean') || nameLower.includes('clean') || nameLower.includes('girata')) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--accent-blue)" style="width: 50px; height: 50px;">
        <circle cx="60" cy="40" r="20" />
        <circle cx="60" cy="40" r="3" fill="#0f111a" />
        <polygon points="60 40, 75 35, 62 48" />
        <circle cx="43" cy="30" r="7" />
        <path d="M 43 37 L 46 60 L 36 75 L 42 85 C 45 88, 50 90, 55 90 L 48 92 C 40 92, 30 80, 30 72 L 38 58 L 36 37 Z" />
      </svg>
    `;
  }

  // 5. PUSH PRESS / MILITARY PRESS
  if (nameLower.includes('push press') || nameLower.includes('press verticale') || nameLower.includes('military') || nameLower.includes('shoulder press')) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--accent-neon)" style="width: 50px; height: 50px;">
        <circle cx="50" cy="22" r="18" />
        <circle cx="50" cy="22" r="2.5" fill="#0f111a" />
        <path d="M 42 45 L 48 22 L 52 22 L 58 45 L 53 45 L 50 28 L 47 45 Z" />
        <circle cx="50" cy="38" r="6" />
        <path d="M 45 45 H 55 L 53 75 L 56 92 H 44 L 47 75 Z" />
      </svg>
    `;
  }

  // 6. TRAZIONI VERTICALI
  if (nameLower.includes('trazioni verticali') || nameLower.includes('pull up') || nameLower.includes('lat machine') || nameLower.includes('pull-up')) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--accent-blue)" style="width: 50px; height: 50px;">
        <rect x="10" y="10" width="80" height="5" rx="2" />
        <circle cx="50" cy="18" r="6" />
        <path d="M 44 24 H 56 L 54 55 H 46 Z" />
        <path d="M 44 24 L 35 15 L 40 10 H 45 L 48 20 Z" />
        <path d="M 56 24 L 65 15 L 60 10 H 55 L 52 20 Z" />
        <path d="M 46 55 L 42 75 L 48 85 L 52 75 L 48 55 Z" />
      </svg>
    `;
  }

  // 7. TRAZIONI ORIZZONTALI / REMATORE
  if (nameLower.includes('trazioni orizzontali') || nameLower.includes('row') || nameLower.includes('rematore') || nameLower.includes('pulley')) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--accent-blue)" style="width: 50px; height: 50px;">
        <circle cx="52" cy="48" r="14" />
        <circle cx="52" cy="48" r="2" fill="#0f111a" />
        <circle cx="36" cy="25" r="7" />
        <path d="M 36 32 C 36 32, 50 40, 54 52 C 54 58, 48 64, 42 64 C 36 60, 30 50, 30 40 Z" />
        <path d="M 42 64 L 46 88 H 38 L 34 68 Z" />
        <path d="M 42 34 L 52 48 L 48 50 L 38 36 Z" />
      </svg>
    `;
  }

  // 8. CALF
  if (nameLower.includes('calf') || nameLower.includes('polpacci')) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--accent-orange)" style="width: 50px; height: 50px;">
        <rect x="10" y="85" width="80" height="4" rx="2" />
        <path d="M 42 20 C 45 20, 48 35, 48 50 C 48 65, 42 75, 34 78 L 38 83 L 58 84 L 62 82 C 60 76, 52 70, 52 50 C 52 35, 46 20, 42 20 Z" />
        <path d="M 28 75 L 28 60 L 24 64 M 28 60 L 32 64" stroke="var(--accent-neon)" stroke-width="3" fill="none" stroke-linecap="round" />
      </svg>
    `;
  }

  // 9. RDL (STACCO RUMENO)
  if (nameLower.includes('rdl') || nameLower.includes('rumen')) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--accent-orange)" style="width: 50px; height: 50px;">
        <circle cx="58" cy="62" r="18" />
        <circle cx="58" cy="62" r="2.5" fill="#0f111a" />
        <circle cx="28" cy="35" r="7" />
        <path d="M 33 35 H 60 L 58 45 H 33 Z" />
        <path d="M 58 45 L 56 88 H 48 L 50 45 Z" />
        <path d="M 44 38 L 58 62 H 54 L 40 38 Z" />
      </svg>
    `;
  }

  // 10. BOX JUMP
  if (nameLower.includes('box jump') || nameLower.includes('jump box')) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--accent-neon)" style="width: 50px; height: 50px;">
        <rect x="55" y="55" width="35" height="35" rx="4" />
        <circle cx="45" cy="25" r="7" />
        <path d="M 42 32 C 45 32, 50 35, 52 42 L 58 44 L 52 48 L 48 40 L 40 40 Z" />
        <path d="M 42 42 L 32 50 L 38 58 L 46 50 Z" />
        <path d="M 25 75 A 25 25 0 0 1 50 35" stroke="var(--accent-neon)" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="4 4" />
      </svg>
    `;
  }

  // 11. DROP JUMP
  if (nameLower.includes('drop jump')) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--accent-red)" style="width: 50px; height: 50px;">
        <rect x="10" y="45" width="22" height="45" rx="3" />
        <rect x="10" y="90" width="80" height="3" />
        <circle cx="45" cy="38" r="6" />
        <path d="M 45 44 L 48 65 L 44 78 H 49 L 53 65 L 50 44 Z" />
        <path d="M 38 48 L 38 68 M 38 68 L 35 64 M 38 68 L 41 64" stroke="var(--accent-red)" stroke-width="3" fill="none" stroke-linecap="round" />
        <path d="M 64 80 L 64 55 M 64 55 L 60 59 M 64 55 L 68 59" stroke="var(--accent-neon)" stroke-width="3" fill="none" stroke-linecap="round" />
      </svg>
    `;
  }

  // 12. PUSH UP
  if (nameLower.includes('push up') || nameLower.includes('piegamenti') || nameLower.includes('push-up')) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--accent-neon)" style="width: 50px; height: 50px;">
        <rect x="10" y="80" width="80" height="4" rx="2" />
        <circle cx="75" cy="45" r="7" />
        <path d="M 70 47 L 22 72 L 24 78 L 72 53 Z" />
        <path d="M 62 52 L 62 68 L 70 80 H 62 L 56 68 Z" />
      </svg>
    `;
  }

  // --- ICONE DEGLI ATTREZZI PER TUTTI GLI ALTRI ESERCIZI ---

  // A. KETTLEBELL
  if (nameLower.includes('kettlebell') || nameLower.includes('kb') || nameLower.includes('swing')) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--text-muted)" style="width: 50px; height: 50px;">
        <circle cx="50" cy="62" r="28" />
        <path d="M 32 40 C 32 20, 68 20, 68 40 L 60 40 C 60 28, 40 28, 40 40 Z" />
        <circle cx="50" cy="62" r="4" fill="#0f111a" />
      </svg>
    `;
  }

  // B. MANUBRI / DUMBBELL / AFFONDI
  if (nameLower.includes('manubr') || nameLower.includes('db') || nameLower.includes('dumbbell') || nameLower.includes('affond')) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--text-muted)" style="width: 50px; height: 50px;">
        <rect x="44" y="20" width="12" height="60" rx="2" transform="rotate(45 50 50)" />
        <rect x="20" y="20" width="24" height="24" rx="4" transform="rotate(45 32 32)" />
        <rect x="56" y="56" width="24" height="24" rx="4" transform="rotate(45 68 68)" />
      </svg>
    `;
  }

  // C. MED BALL / SLAM / PALLA MEDICA
  if (nameLower.includes('med ball') || nameLower.includes('palla medica') || nameLower.includes('medball') || nameLower.includes('lancio') || nameLower.includes('ball')) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--text-muted)" style="width: 50px; height: 50px;">
        <circle cx="50" cy="50" r="35" />
        <path d="M 30 30 C 45 40, 55 40, 70 30" stroke="#0f111a" stroke-width="4" fill="none" />
        <path d="M 30 70 C 45 60, 55 60, 70 70" stroke="#0f111a" stroke-width="4" fill="none" />
        <line x1="50" y1="15" x2="50" y2="85" stroke="#0f111a" stroke-width="3" />
      </svg>
    `;
  }

  // D. BOX / STEP / JUMP (attrezzo box generico)
  if (nameLower.includes('box') || nameLower.includes('step') || nameLower.includes('salita')) {
    return `
      <svg viewBox="0 0 100 100" fill="var(--text-muted)" style="width: 50px; height: 50px;">
        <polygon points="50 15, 85 32, 50 50, 15 32" />
        <polygon points="15 32, 50 50, 50 85, 15 67" style="opacity: 0.85;" />
        <polygon points="50 50, 85 32, 85 67, 50 85" style="opacity: 0.7;" />
      </svg>
    `;
  }

  // E. DEFAULT: BILANCIERE (BARBELL)
  return `
    <svg viewBox="0 0 100 100" fill="var(--text-muted)" style="width: 50px; height: 50px;">
      <rect x="10" y="47" width="80" height="6" rx="2" />
      <rect x="22" y="32" width="8" height="36" rx="2" />
      <rect x="70" y="32" width="8" height="36" rx="2" />
      <circle cx="18" cy="50" r="10" />
      <circle cx="82" cy="50" r="10" />
    </svg>
  `;
}

// ==========================================================================
// CENTRO NOTIFICHE COMPLETAMENTO SEDUTE COACH VIEW
// ==========================================================================

function renderNotifications() {
  const container = document.getElementById('notifications-list-container');
  const badge = document.getElementById('notifications-badge');
  if (!container) return;

  container.innerHTML = '';
  
  // Raccoglie tutti gli allenamenti inviati di tutte le atlete
  const allNotifications = [];
  const lastReadTime = parseInt(localStorage.getItem('fitfeedback_last_read_notifications') || '0');

  db.athletes.forEach(athlete => {
    if (athlete.history) {
      athlete.history.forEach(w => {
        let sumRpe = 0;
        let countRpe = 0;
        let hasPainAlert = false;
        const notesText = [];

        w.exercises.forEach(ex => {
          if (ex.fatigue) {
            sumRpe += ex.fatigue;
            countRpe++;
          }
          if (ex.notes) {
            notesText.push(`${ex.name}: "${ex.notes}"`);
            const notesLower = ex.notes.toLowerCase();
            if (notesLower.includes('dolore') || notesLower.includes('male') || notesLower.includes('fastidio') || notesLower.includes('infortunio')) {
              hasPainAlert = true;
            }
          }
        });

        const avgRpe = countRpe > 0 ? (sumRpe / countRpe).toFixed(1) : 0;

        allNotifications.push({
          athleteId: athlete.id,
          athleteName: athlete.name,
          date: w.date,
          workoutName: w.name,
          avgRpe: parseFloat(avgRpe),
          hasPainAlert: hasPainAlert,
          notes: notesText.join(' | '),
          createdAt: w.createdAt || new Date(w.date).getTime()
        });
      });
    }
  });

  // Ordina per data decrescente (le piÃ¹ recenti in alto)
  allNotifications.sort((a, b) => b.createdAt - a.createdAt);

  let unreadCount = 0;
  
  if (allNotifications.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 40px 10px; color:var(--text-muted); font-size:14px;">Nessuna notifica di completamento ricevuta.</div>`;
    badge.style.display = 'none';
    return;
  }

  allNotifications.forEach(notif => {
    const isHeavy = notif.avgRpe >= 4.0;
    const isUnread = notif.createdAt > lastReadTime;
    
    if (isUnread) {
      unreadCount++;
    }

    const item = document.createElement('div');
    
    let cardBorderColor = 'var(--border-color)';
    let cardBg = 'var(--bg-surface-glass)';
    let statusBadgeHtml = '';

    if (notif.hasPainAlert) {
      cardBorderColor = 'rgba(255, 51, 102, 0.4)';
      cardBg = 'rgba(255, 51, 102, 0.04)';
      statusBadgeHtml = `<span class="athlete-card-badge badge-alert" style="font-size:10px;"><i data-lucide="alert-triangle" style="width:10px; height:10px; display:inline-block; vertical-align:middle; margin-right:2px;"></i> ALERT DOLORE</span>`;
    } else if (isHeavy) {
      cardBorderColor = 'rgba(255, 123, 0, 0.4)';
      cardBg = 'rgba(255, 123, 0, 0.04)';
      statusBadgeHtml = `<span class="athlete-card-badge" style="font-size:10px; background:rgba(255, 123, 0, 0.1); color:var(--accent-orange); border:1px solid rgba(255, 123, 0, 0.2);">SEDUTA MOLTO PESANTE</span>`;
    } else {
      statusBadgeHtml = `<span class="athlete-card-badge badge-ok" style="font-size:10px;">Seduta OK</span>`;
    }

    item.className = 'history-ex-card';
    item.style.borderColor = cardBorderColor;
    item.style.background = cardBg;
    item.style.cursor = 'pointer';
    item.style.padding = '14px 16px';
    item.style.position = 'relative';
    item.style.borderRadius = '10px';
    item.style.borderWidth = '1px';
    item.style.borderStyle = 'solid';
    item.style.transition = 'all var(--transition-fast)';
    
    // Pallino blu per notifiche non lette
    const unreadDotHtml = isUnread 
      ? `<span style="position:absolute; top: 14px; left: 8px; width: 6px; height: 6px; border-radius:50%; background:var(--accent-blue);"></span>`
      : '';

    item.innerHTML = `
      ${unreadDotHtml}
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-left: ${isUnread ? '8px' : '0'};">
        <span style="font-family:var(--font-title); font-size:15px; font-weight:700; color:var(--text-main);">${notif.athleteName}</span>
        <span style="font-size:11px; color:var(--text-muted);">${formatItalianDate(notif.date)}</span>
      </div>
      <div style="font-size:13px; color:var(--text-main); margin-bottom:6px; padding-left: ${isUnread ? '8px' : '0'};">
        Ha completato la seduta con RPE medio di <strong style="color:${isHeavy ? 'var(--accent-orange)' : 'var(--accent-neon)'};">${notif.avgRpe > 0 ? notif.avgRpe + ' / 5' : '--'}</strong>
      </div>
      ${notif.notes ? `
        <div style="font-size:12px; color:var(--text-muted); background:rgba(0,0,0,0.2); padding:8px 10px; border-radius:6px; border-left:2px solid ${notif.hasPainAlert ? 'var(--accent-red)' : 'var(--accent-blue)'}; margin-top:8px; font-style:italic;">
          Note rilevate: ${notif.notes}
        </div>
      ` : ''}
      <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center; padding-left: ${isUnread ? '8px' : '0'};">
        ${statusBadgeHtml}
        <span style="font-size:10px; color:var(--accent-blue); text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Vedi scheda atleti &rarr;</span>
      </div>
    `;

    item.addEventListener('click', () => {
      closeModal('modal-notifications');
      selectAthlete(notif.athleteId);
    });

    container.appendChild(item);
  });

  safeCreateIcons();
  
  if (unreadCount > 0) {
    badge.innerText = unreadCount;
    badge.style.display = 'flex';
  } else {
    badge.innerText = '0';
    badge.style.display = 'none';
  }
}

function clearNotifications() {
  localStorage.setItem('fitfeedback_last_read_notifications', Date.now().toString());
  renderNotifications();
  alert("Tutte le notifiche sono state segnate come lette.");
}

// ==========================================================================
// INTEGRAZIONE SUPABASE REALTIME SYNC (CLOUD DATABASE SHARING)
// ==========================================================================

function mergeLocalAndCloudAthletes(localAthletes, cloudAthletes) {
  const merged = [];
  const localMap = new Map((localAthletes || []).map(a => [a.id, a]));
  const cloudMap = new Map((cloudAthletes || []).map(a => [a.id, a]));

  const allIds = new Set([...localMap.keys(), ...cloudMap.keys()]);

  let localChanged = false;
  let cloudChanged = false;
  const uploadList = [];

  for (const id of allIds) {
    const local = localMap.get(id);
    const cloud = cloudMap.get(id);

    if (local && cloud) {
      const localTime = local.updatedAt || 0;
      const cloudTime = cloud.updatedAt || 0;

      if (localTime >= cloudTime) {
        merged.push(local);
        if (localTime > cloudTime) {
          cloudChanged = true;
          uploadList.push(local);
        }
      } else {
        merged.push(cloud);
        localChanged = true;
      }
    } else if (local) {
      merged.push(local);
      cloudChanged = true;
      uploadList.push(local);
    } else if (cloud) {
      merged.push(cloud);
      localChanged = true;
    }
  }

  return { merged, localChanged, cloudChanged, uploadList };
}

async function syncWithSupabase() {
  if (!supabaseClient || !cloudSyncAvailable) return;
  try {
    const { data, error } = await supabaseClient.from('athletes').select('*');
    if (error) throw error;

    const cloudAthletesList = (data || []).map(row => row.data).filter(d => d && d.id && d.name);
    
    db.deletedAthleteIds = db.deletedAthleteIds || [];

    if (db.deletedAthleteIds.length > 0) {
      const promises = db.deletedAthleteIds.map(id => {
        return supabaseClient.from('athletes').delete().eq('id', id).then(({ error }) => {
          if (!error) {
            db.deletedAthleteIds = db.deletedAthleteIds.filter(x => x !== id);
          }
        });
      });
      await Promise.all(promises);
      saveDatabase(db, { skipCloudSync: true });
    }

    const activeCloud = cloudAthletesList.filter(a => !db.deletedAthleteIds.includes(a.id));

    const { merged, localChanged, cloudChanged, uploadList } = mergeLocalAndCloudAthletes(db.athletes, activeCloud);

    db.athletes = merged;
    localStorage.setItem('volleyfitlab_data', JSON.stringify(db));

    if (localChanged) {
      renderAthleteList();
      const activeExists = db.athletes.some(a => a.id === activeAthleteId);
      if (!activeExists && db.athletes.length > 0) {
        activeAthleteId = db.athletes[0].id;
      }
      selectAthlete(activeAthleteId);
      renderClientSelector();
      renderNotifications();
    }

    if (cloudChanged && uploadList.length > 0) {
      const uploadPromises = uploadList.map(athlete => {
        return supabaseClient.from('athletes').upsert({
          id: athlete.id,
          name: athlete.name,
          data: athlete
        });
      });
      await Promise.all(uploadPromises);
      console.log("Sync completato: atleti locali aggiornati su cloud.");
    }
    
    console.log("Database sincronizzato. Atleti totali:", db.athletes.length);
  } catch (err) {
    const isNetworkError = !navigator.onLine || err.message?.toLowerCase().includes('fetch') || err.message?.toLowerCase().includes('network');
    if (!isNetworkError) {
      cloudSyncAvailable = false;
      console.warn("Disabilitazione permanente cloud sync per errore strutturale:", err);
    } else {
      console.warn("Sincronizzazione Supabase temporaneamente fallita (problema di rete):", err);
    }
  }
}

async function syncWithSupabaseSilent() {
  if (!supabaseClient || !cloudSyncAvailable) return;
  try {
    const { data, error } = await supabaseClient.from('athletes').select('*');
    if (error) throw error;

    const cloudAthletesList = (data || []).map(row => row.data).filter(d => d && d.id && d.name);
    
    db.deletedAthleteIds = db.deletedAthleteIds || [];
    const activeCloud = cloudAthletesList.filter(a => !db.deletedAthleteIds.includes(a.id));

    const { merged, localChanged, cloudChanged, uploadList } = mergeLocalAndCloudAthletes(db.athletes, activeCloud);

    if (localChanged || cloudChanged) {
      db.athletes = merged;
      localStorage.setItem('volleyfitlab_data', JSON.stringify(db));

      renderAthleteList();
      if (activeTrainerTab !== 'tab-program-builder') {
        const activeAthlete = db.athletes.find(a => a.id === activeAthleteId);
        if (activeAthlete) {
          renderAthleteHeader(activeAthlete);
          renderTestResults(activeAthlete);
          renderHistory(activeAthlete);
          renderMacrociclo(activeAthlete);
        }
      }
      renderNotifications();
      renderClientSelector();
    }

    if (cloudChanged && uploadList.length > 0) {
      const uploadPromises = uploadList.map(athlete => {
        return supabaseClient.from('athletes').upsert({
          id: athlete.id,
          name: athlete.name,
          data: athlete
        });
      });
      await Promise.all(uploadPromises);
    }
  } catch (err) {
    const isNetworkError = !navigator.onLine || err.message?.toLowerCase().includes('fetch') || err.message?.toLowerCase().includes('network');
    if (!isNetworkError) {
      cloudSyncAvailable = false;
    }
    console.warn("Errore sync silenziosa:", err);
  }
}

async function uploadAllToSupabase() {
  if (!supabaseClient || !cloudSyncAvailable) return;
  try {
    const promises = db.athletes.map(athlete => {
      return supabaseClient.from('athletes').upsert({
        id: athlete.id,
        name: athlete.name,
        data: athlete
      });
    });
    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      const isNetworkError = !navigator.onLine || errors.some(e => e.error?.message?.toLowerCase().includes('fetch') || e.error?.message?.toLowerCase().includes('network'));
      if (!isNetworkError) {
        cloudSyncAvailable = false;
      }
      console.warn("Cloud sync sospesa: Supabase ha rifiutato il salvataggio. I dati locali restano salvati nel browser.", errors[0]?.error || errors);
    } else {
      console.log("Tutti i profili atleti sono stati salvati su Supabase.");
    }
  } catch (err) {
    const isNetworkError = !navigator.onLine || err.message?.toLowerCase().includes('fetch') || err.message?.toLowerCase().includes('network');
    if (!isNetworkError) {
      cloudSyncAvailable = false;
    }
    console.error("Errore upload massivo su Supabase:", err);
  }
}

async function uploadSingleAthleteToSupabase(athlete) {
  if (!supabaseClient || !cloudSyncAvailable) return;
  try {
    const { error } = await supabaseClient.from('athletes').upsert({
      id: athlete.id,
      name: athlete.name,
      data: athlete
    });
    if (error) throw error;
    console.log(`Profilo di ${athlete.name} salvato in cloud.`);
  } catch (err) {
    const isNetworkError = !navigator.onLine || err.message?.toLowerCase().includes('fetch') || err.message?.toLowerCase().includes('network');
    if (!isNetworkError) {
      cloudSyncAvailable = false;
    }
    console.error(`Errore salvataggio cloud per ${athlete.name}:`, err);
  }
}

function showCoachPasswordPrompt() {
  const overlay = document.getElementById('coach-password-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
  }
  
  const form = document.getElementById('form-coach-login');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const pwdInput = document.getElementById('coach-password-input');
      const errorMsg = document.getElementById('login-error-msg');
      
      // Password coach impostata su Nala
      if (pwdInput.value === 'Nala') {
        sessionStorage.setItem('fitfeedback_coach_authenticated', 'true');
        if (overlay) overlay.style.display = 'none';
        pwdInput.value = '';
        if (errorMsg) errorMsg.style.display = 'none';
        // Ricarica per inizializzare le icone all'interno della dashboard sbloccata
        location.reload();
      } else {
        if (errorMsg) errorMsg.style.display = 'block';
        pwdInput.value = '';
      }
    });
  }
}

function logoutCoach() {
  sessionStorage.removeItem('fitfeedback_coach_authenticated');
  localStorage.removeItem('fitfeedback_coach_authenticated'); // Rimuove eventuali residui storici
  location.reload();
}

function showClientSuccessModal(avgRpe) {
  const overlay = document.getElementById('modal-client-success');
  const rpeValSpan = document.getElementById('client-success-rpe-val');
  const msgEl = document.getElementById('client-success-message');
  
  if (rpeValSpan) rpeValSpan.innerText = avgRpe.toFixed(1);
  
  let joke = "";
  if (avgRpe === 0) {
    joke = "Allenamento completato! Aspettiamo che tu inserisca i dati per valutare la fatica.";
  } else if (avgRpe <= 2.0) {
    joke = "Praticamente una passeggiata di salute! Sicura di aver fatto pesi o eri a fare una chiacchierata in palestra? 😜";
  } else if (avgRpe <= 3.4) {
    joke = "Ottimo lavoro! Un bel mattoncino solido verso la tua forma migliore. Avanti così! 🚀";
  } else if (avgRpe <= 4.4) {
    joke = "Intensità super! Stasera le gambe bruceranno un po', ma domani sarai più forte di prima! 💪";
  } else {
    joke = "SOPRAVVISSUTA! 💀 Il coach ha tentato di farti fuori ma hai resistito! Divano e meritato riposo adesso, te lo sei guadagnato! 🏆";
  }
  
  if (msgEl) msgEl.innerText = joke;
  if (overlay) {
    overlay.style.display = 'flex';
    safeCreateIcons();
  }
}

function closeClientSuccessModal() {
  const overlay = document.getElementById('modal-client-success');
  if (overlay) overlay.style.display = 'none';
  
  const urlParams = new URLSearchParams(window.location.search);
  const athParam = urlParams.get('ath') || urlParams.get('athlete');
  if (athParam) {
    initClientPortal();
  } else {
    switchView('trainer');
  }
}
