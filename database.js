// database.js - Gestione dello stato e persistenza dei dati in localStorage (Volley Fit Lab)

const STORAGE_KEY = 'volleyfitlab_data';

// Libreria di esercizi suddivisi nei macro gruppi specificati dal preparatore
const EXERCISE_LIBRARY = [
  // --- Squat ---
  { name: 'back squat', category: 'Squat', type: 'weight', defaultRest: 180 },
  { name: 'front squat', category: 'Squat', type: 'weight', defaultRest: 180 },
  { name: 'overhead squat', category: 'Squat', type: 'weight', defaultRest: 180 },
  { name: 'Affondi', category: 'Squat', type: 'weight', defaultRest: 90 },
  { name: 'split squat', category: 'Squat', type: 'weight', defaultRest: 90 },

  // --- Stacco ---
  { name: 'stacco da terra', category: 'Stacco', type: 'weight', defaultRest: 180 },
  { name: 'stacco trap bar', category: 'Stacco', type: 'weight', defaultRest: 180 },
  { name: 'RDL', category: 'Stacco', type: 'weight', defaultRest: 120 },
  { name: 'RDL monopodalici', category: 'Stacco', type: 'weight', defaultRest: 90 },
  { name: 'stacco sumo kettlebell', category: 'Stacco', type: 'weight', defaultRest: 90 },
  { name: 'Hip thrust', category: 'Stacco', type: 'weight', defaultRest: 120 },

  // --- Power ---
  { name: 'clean', category: 'Power', type: 'weight', defaultRest: 120 },
  { name: 'power clean', category: 'Power', type: 'weight', defaultRest: 120 },
  { name: 'high pull', category: 'Power', type: 'weight', defaultRest: 120 },
  { name: 'snatch', category: 'Power', type: 'weight', defaultRest: 120 },
  { name: 'power snatch', category: 'Power', type: 'weight', defaultRest: 120 },

  // --- Spinte ---
  { name: 'push press', category: 'Spinte', type: 'weight', defaultRest: 120 },
  { name: 'military press bilanciere', category: 'Spinte', type: 'weight', defaultRest: 120 },
  { name: 'military press manubri', category: 'Spinte', type: 'weight', defaultRest: 120 },
  { name: 'push up ginocchia', category: 'Spinte', type: 'bodyweight', defaultRest: 60 },
  { name: 'push up', category: 'Spinte', type: 'bodyweight', defaultRest: 60 },

  // --- Tirate ---
  { name: 'trazioni orizzontali', category: 'Tirate', type: 'bodyweight', defaultRest: 90 },
  { name: 'trazioni verticali', category: 'Tirate', type: 'bodyweight', defaultRest: 90 },
  { name: 'rematore bilanciere', category: 'Tirate', type: 'weight', defaultRest: 120 },
  { name: 'rematore pendlay', category: 'Tirate', type: 'weight', defaultRest: 120 },
  { name: 'rematore manubrio', category: 'Tirate', type: 'weight', defaultRest: 90 },

  // --- Core ---
  { name: 'plank', category: 'Core', type: 'time', defaultRest: 60 },
  { name: 'side plank', category: 'Core', type: 'time', defaultRest: 60 },
  { name: 'crunch med ball', category: 'Core', type: 'weight', defaultRest: 60 },
  { name: 'crunch', category: 'Core', type: 'bodyweight', defaultRest: 45 },
  { name: 'reverse crunch', category: 'Core', type: 'bodyweight', defaultRest: 45 },
  { name: 'side wall ball', category: 'Core', type: 'weight', defaultRest: 60 },

  // --- Pliometrici ---
  { name: 'Box jump', category: 'Pliometrici', type: 'bodyweight', defaultRest: 90 },
  { name: 'drop jump', category: 'Pliometrici', type: 'bodyweight', defaultRest: 90 },
  { name: 'depth jump', category: 'Pliometrici', type: 'bodyweight', defaultRest: 90 },
  { name: 'broad jump', category: 'Pliometrici', type: 'bodyweight', defaultRest: 90 },
  { name: 'CMJ', category: 'Pliometrici', type: 'bodyweight', defaultRest: 90 },
  { name: 'CMJ kneeling', category: 'Pliometrici', type: 'bodyweight', defaultRest: 90 },
  { name: 'squat jump', category: 'Pliometrici', type: 'bodyweight', defaultRest: 90 },
  { name: 'spike jump', category: 'Pliometrici', type: 'bodyweight', defaultRest: 90 },
  { name: 'spike box jump', category: 'Pliometrici', type: 'bodyweight', defaultRest: 90 },

  // --- Stiffness ---
  { name: 'pogo hops', category: 'Stiffness', type: 'bodyweight', defaultRest: 90 },
  { name: 'pogo hops a contrasto', category: 'Stiffness', type: 'weight', defaultRest: 90 },
  { name: 'pogo hops monopodalici', category: 'Stiffness', type: 'bodyweight', defaultRest: 90 },
  { name: 'calf', category: 'Stiffness', type: 'weight', defaultRest: 60 },
  { name: 'calf monopodalico', category: 'Stiffness', type: 'weight', defaultRest: 60 },

  // --- Balistici ---
  { name: 'med ball slam', category: 'Balistici', type: 'weight', defaultRest: 90 },
  { name: 'med ball side slam', category: 'Balistici', type: 'weight', defaultRest: 90 },
  { name: 'wall ball', category: 'Balistici', type: 'weight', defaultRest: 90 },
  { name: 'Medball Chest Pass', category: 'Balistici', type: 'weight', defaultRest: 90 },
  { name: 'clean & jerk med ball', category: 'Balistici', type: 'weight', defaultRest: 90 },
  { name: 'Backward Overhead Throw', category: 'Balistici', type: 'weight', defaultRest: 90 },

  // --- Rapidità ---
  { name: 'agility ladder', category: 'Rapidità', type: 'time', defaultRest: 60 },
  { name: 'navetta', category: 'Rapidità', type: 'time', defaultRest: 60 },

  // --- Rieducativi ---
  { name: 'spanish squat', category: 'Rieducativi', type: 'time', defaultRest: 60 },
  { name: 'affondi loop band', category: 'Rieducativi', type: 'bodyweight', defaultRest: 60 },
  { name: 'squat loop band', category: 'Rieducativi', type: 'bodyweight', defaultRest: 60 },
  { name: 'mobilità', category: 'Rieducativi', type: 'time', defaultRest: 45 },
  { name: 'stretching', category: 'Rieducativi', type: 'time', defaultRest: 45 },
  { name: 'condizionamento articolare', category: 'Rieducativi', type: 'time', defaultRest: 60 }
];

// Roster delle atlete - Denise come unica atleta di test
const PLAYERS_DATA = [
  { name: 'Denise', ruolo: 'Schiacciatrice', peso: 62.0, altezza: 175, reach: 228, cmj: 38, squat3MAV: 55, birthdate: '2009-05-15', sport: 'Under 19', gender: 'Femminile' }
];

// Storico iniziale di test per Denise
const DAYS_DATA = [
  {
    date: '2026-06-25',
    name: 'Giorno 1 - Seduta Forza & Esplosività',
    groups: [
      {
        athletes: ['Denise'],
        exercises: [
          { name: 'Power clean', notation: '(20*3*2)+(30*3*3)' },
          { name: 'Back squat', notation: '(25*10*1)+(35*5*1)+(45*3*3)' },
          { name: 'Pogo hops', notation: '0*20*4' },
          { name: 'Rematore Pendlay', notation: '(15*8*1)+(25*4*4)' },
          { name: 'Plank', notation: '0*60*3', type: 'time' }
        ]
      }
    ]
  }
];

// Helper per estrarre nome pulito e variazione degli esercizi
function extractCleanNameAndVariation(rawExName) {
  if (!rawExName || typeof rawExName !== 'string') return { name: '', variation: '' };
  
  let name = rawExName.trim();
  let variation = '';

  const bracketIndex = name.indexOf('(');
  if (bracketIndex !== -1) {
    variation = name.substring(bracketIndex + 1, name.length - 1).trim();
    name = name.substring(0, bracketIndex).trim();
  }

  const lowerName = name.toLowerCase();
  if (lowerName === 'leg press' || lowerName === 'press') name = 'spanish squat';
  else if (lowerName === 'military press') name = 'military press bilanciere';
  else if (lowerName === 'military press manubri seduti') name = 'military press manubri';
  else if (lowerName === 'rematore pendlay') name = 'rematore pendlay';
  else if (lowerName === 'rematore manubrio monolaterale' || lowerName === 'rematore manubri') name = 'rematore manubrio';
  else if (lowerName === 'trazioni orizzontali') name = 'trazioni orizzontali';
  else if (lowerName === 'push up ginocchia') name = 'push up ginocchia';
  else if (lowerName === 'trazioni assistite con elastico (prevenzione cuffia)') name = 'trazioni verticali';
  
  else if (lowerName === 'power clean' || lowerName === 'clean') name = 'power clean';
  else if (lowerName === 'high pull') name = 'high pull';
  else if (lowerName === 'high pull / power clean') name = 'power clean';
  else if (lowerName === 'pogo hops') name = 'pogo hops';
  else if (lowerName === 'pogo hops manubri a contrasto con loop band') name = 'pogo hops a contrasto';
  else if (lowerName === 'salto su box (box jump)') name = 'Box jump';
  else if (lowerName === 'depth jump da box (shock method - verkhoshansky)') name = 'depth jump';
  else if (lowerName === 'salti consecutivi su ostacoli (hurdle jumps)') name = 'spike jump';
  else if (lowerName === 'ostacoli bassi a ritmo rapido (lavoro piedi)') name = 'agility ladder';
  else if (lowerName === 'med ball slam') name = 'med ball slam';
  else if (lowerName === 'lateral med ball slam') name = 'med ball side slam';
  else if (lowerName === 'lancio palla medica a due mani (schiacciata)') name = 'med ball slam';
  else if (lowerName === 'lancio palla medica indietro (overhead)') name = 'Backward Overhead Throw';
  else if (lowerName === 'crunch med ball') name = 'crunch med ball';
  else if (lowerName === 'rotazioni del core con elastico (volley block core)') name = 'side wall ball';
  else {
    const match = EXERCISE_LIBRARY.find(le => le.name.toLowerCase() === lowerName);
    name = match ? match.name : rawExName;
  }

  return { name, variation };
}

// Helper per generare l'intero database in base alle atlete ed allo storico reale
function generateVolleyballDatabase() {
  const athletes = PLAYERS_DATA.map((player, idx) => {
    const id = `athlete-${idx + 1}`;
    
    const baseCmj = player.cmj || 38;
    const baseReach = player.reach || 225;
    const baseSquat = player.squat3MAV || 40;

    const strengthTests = [
      { 
        date: '2026-05-10', 
        squat1RM: Math.round(baseSquat * 1.15), 
        powerClean1RM: Math.round(baseSquat * 0.7), 
        pushPress1RM: Math.round(baseSquat * 0.6),
        deadlift1RM: Math.round(baseSquat * 1.3)
      },
      { 
        date: '2026-06-15', 
        squat1RM: Math.round(baseSquat * 1.25), 
        powerClean1RM: Math.round(baseSquat * 0.78), 
        pushPress1RM: Math.round(baseSquat * 0.68),
        deadlift1RM: Math.round(baseSquat * 1.4)
      }
    ];

    const speedTests = [
      { date: '2026-05-10', sprint10m: 1.80 },
      { date: '2026-06-15', sprint10m: 1.76 }
    ];

    const elevationTests = [
      { date: '2026-05-10', cmj: baseCmj - 3, broadJump: Math.round(baseCmj * 4.6), spikeJump: baseReach + baseCmj - 3 + 12 },
      { date: '2026-06-15', cmj: baseCmj, broadJump: Math.round(baseCmj * 4.9), spikeJump: baseReach + baseCmj + 18 }
    ];

    return {
      id: id,
      name: player.name,
      birthdate: player.birthdate || '2009-05-15',
      gender: player.gender || 'Femminile',
      ruolo: player.ruolo,
      sport: player.sport || 'U19 Femminile Volley',
      goal: `Sviluppo forza arti inferiori e stabilità/potenza specifica volley.`,
      situations: 'Dolore spalla dx in fase di attacco (in gestione)',
      antropometria: {
        peso: player.peso || null,
        altezza: player.altezza || null,
        reachDominante: player.reach || null,
        lunghezzaFemore: player.altezza ? Math.round(player.altezza * 0.29) : null,
        lunghezzaBusto: player.altezza ? Math.round(player.altezza * 0.32) : null
      },
      tests: {
        strength: strengthTests,
        speed: speedTests,
        elevation: elevationTests
      },
      currentWorkout: [],
      history: []
    };
  });

  // Inizializza macrocicli vuoti per ciascuna atleta
  athletes.forEach(athlete => {
    athlete.macrocicli = [];
  });

  // Genera ed popola la history degli allenamenti per ciascuna atleta
  DAYS_DATA.forEach(day => {
    day.groups.forEach(group => {
      group.athletes.forEach(athName => {
        const athlete = athletes.find(a => a.name.toLowerCase() === athName.toLowerCase());
        if (!athlete) return;

        const completedExercises = group.exercises.map((ex, idx) => {
          const parsed = extractCleanNameAndVariation(ex.name);
          const libEx = EXERCISE_LIBRARY.find(le => le.name.toLowerCase() === parsed.name.toLowerCase()) || { type: 'weight', category: 'Arti Inferiori' };
          const sets = parseNotationToSets(ex.notation, libEx.type);
          const fatigue = ex.rpe || (idx % 2 === 0 ? 4 : 3);

          return {
            name: parsed.name,
            variation: parsed.variation,
            category: libEx.category,
            type: libEx.type,
            sets: sets,
            fatigue: fatigue,
            technicalQuality: fatigue >= 4 ? 'rallentata' : 'esplosiva',
            notes: fatigue >= 4 ? 'Seduta pesante, velocità leggermente calata.' : ''
          };
        });

        const completedWorkout = {
          date: day.date,
          name: day.name,
          duration: 65,
          exercises: completedExercises
        };

        athlete.history.unshift(completedWorkout);
      });
    });
  });

  // Costruisci i macrocicli per ciascuna atleta
  athletes.forEach(athlete => {
    const currentSedute = [];
    let sedutaCounter = 0;
    DAYS_DATA.forEach((day, idx) => {
      const group = day.groups.find(g => g.athletes.some(name => name.toLowerCase() === athlete.name.toLowerCase()));
      if (group) {
        sedutaCounter++;
        const exercises = group.exercises.map((ex, exIdx) => {
          const parsed = extractCleanNameAndVariation(ex.name);
          const libEx = EXERCISE_LIBRARY.find(le => le.name.toLowerCase() === parsed.name.toLowerCase()) || { type: 'weight', category: 'Arti Inferiori' };
          const parsedSets = parseNotationToSets(ex.notation, libEx.type);
          const setsCount = parsedSets.length;
          const lastSet = parsedSets[setsCount - 1];

          return {
            id: `ex-${idx + 1}-${exIdx + 1}`,
            name: parsed.name,
            variation: parsed.variation,
            category: libEx.category,
            type: libEx.type,
            sets: setsCount,
            reps: lastSet ? lastSet.targetReps : 5,
            weight: lastSet ? lastSet.targetWeight : 0,
            rest: libEx.defaultRest || 120,
            notes: 'Massimo controllo tecnico, focus spinta.'
          };
        });

        currentSedute.push({
          id: `seduta-${idx + 1}`,
          name: `Seduta ${sedutaCounter}`,
          exercises: exercises
        });
      }
    });

    if (currentSedute.length === 0) {
      currentSedute.push({ id: 'seduta-1', name: 'Seduta 1', exercises: [] });
    }

    // Aggiungi il macrociclo corrente come ultimo
    const macroNum = athlete.macrocicli.length + 1;
    const currentMacro = {
      id: 'macro-current-' + athlete.id,
      name: 'Macrociclo ' + macroNum,
      sedute: currentSedute
    };
    athlete.macrocicli.push(currentMacro);
    athlete.activeMacrocicloId = currentMacro.id;

    // Imposta la scheda corrente per lo smartphone come l'ultima seduta del macrociclo corrente
    const latestSeduta = currentSedute[currentSedute.length - 1];
    athlete.currentWorkout = JSON.parse(JSON.stringify(latestSeduta.exercises));
  });

  return { athletes };
}

// Helper per il parsing delle notazioni dei set
function parseNotationToSets(notation, type) {
  const sets = [];
  if (!notation || typeof notation !== 'string') {
    return sets;
  }
  const cleanNotation = notation.replace(/\s/g, '').split('/')[0];
  const blocks = cleanNotation.split('+');

  blocks.forEach(block => {
    const match = block.match(/\(?(\d+)\*(\d+)\*(\d+)\)?/);
    if (match) {
      const weight = parseInt(match[1]);
      const reps = parseInt(match[2]);
      const setRepetitions = parseInt(match[3]);
      
      for (let s = 0; s < setRepetitions; s++) {
        sets.push({
          targetReps: reps,
          actualReps: reps,
          targetWeight: weight,
          actualWeight: weight,
          completed: true
        });
      }
    } else {
      const parts = block.split('*');
      if (parts.length === 3) {
        const weight = parseInt(parts[0]);
        const reps = parseInt(parts[1]);
        const setRepetitions = parseInt(parts[2]);
        
        for (let s = 0; s < setRepetitions; s++) {
          sets.push({
            targetReps: reps,
            actualReps: reps,
            targetWeight: weight,
            actualWeight: weight,
            completed: true
          });
        }
      } else if (parts.length === 2) {
        const reps = parseInt(parts[0]);
        const setRepetitions = parseInt(parts[1]);
        
        for (let s = 0; s < setRepetitions; s++) {
          sets.push({
            targetReps: reps,
            actualReps: reps,
            targetWeight: 0,
            actualWeight: 0,
            completed: true
          });
        }
      }
    }
  });
  
  return sets;
}

function loadDatabase() {
  let data = null;
  try {
    data = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    console.warn('LocalStorage non disponibile, uso database temporaneo in memoria:', e);
  }

  if (data) {
    try {
      const parsed = JSON.parse(data);
      const hasValidAthletes = parsed && Array.isArray(parsed.athletes) && parsed.athletes.length > 0;
      const hasAnita = hasValidAthletes && parsed.athletes.some(a => a && a.name === 'Anita');
      const hasDenise = hasValidAthletes && parsed.athletes.some(a => a && a.name === 'Denise');
      
      // Se c'è Anita o manca Denise, ripuliamo il database locale per ri-generarlo da zero con Denise
      if (!hasValidAthletes || hasAnita || !hasDenise) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
          console.warn('Impossibile ripulire LocalStorage:', e);
        }
        data = null;
      } else {
        // Esegue migrazione silenziosa degli ID esercizi e sedute se mancano
        let dbUpdated = false;
        parsed.athletes.forEach(athlete => {
          if (athlete) {
            if (athlete.macrocicli) {
              athlete.macrocicli.forEach(m => {
                if (m && m.sedute) {
                  m.sedute.forEach((s, sIdx) => {
                    if (s) {
                      if (!s.id) {
                        s.id = `seduta-migrated-${Date.now()}-${sIdx}-${Math.floor(Math.random()*1000)}`;
                        dbUpdated = true;
                      }
                      if (s.exercises) {
                        s.exercises.forEach((e, eIdx) => {
                          if (e && !e.id) {
                            e.id = `ex-migrated-${Date.now()}-${eIdx}-${Math.floor(Math.random()*1000)}`;
                            dbUpdated = true;
                          }
                        });
                      }
                    }
                  });
                }
              });
            }
            if (athlete.currentWorkout) {
              athlete.currentWorkout.forEach((e, eIdx) => {
                if (e && !e.id) {
                  e.id = `ex-curr-migrated-${Date.now()}-${eIdx}-${Math.floor(Math.random()*1000)}`;
                  dbUpdated = true;
                }
              });
            }
          }
        });
        if (dbUpdated) {
          saveDatabase(parsed, { skipCloudSync: true });
          data = JSON.stringify(parsed);
        }
      }
    } catch(e) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (storageError) {
        console.warn('Impossibile rimuovere dati corrotti da LocalStorage:', storageError);
      }
      data = null;
    }
  }
  
  if (!data) {
    const dbData = generateVolleyballDatabase();
    saveDatabase(dbData);
    return dbData;
  }
  return JSON.parse(data);
}

function saveDatabase(data, options = {}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Salvataggio locale non riuscito. I dati restano validi solo fino al refresh della pagina:', e);
  }

  if (!options.skipCloudSync && window.onDatabaseSaveCallback) {
    window.onDatabaseSaveCallback(data);
  }
}
