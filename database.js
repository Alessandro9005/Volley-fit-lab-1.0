// database.js - Gestione dello stato e persistenza dei dati in localStorage (Volley Fit Lab)

const STORAGE_KEY = 'volleyfitlab_data';

// Libreria di esercizi suddivisi nei nuovi 11 macro gruppi specificati dal preparatore
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

// Roster delle atlete estratte dal PDF con i loro parametri antropometrici reali o stimati per ruolo/età
const PLAYERS_DATA = [
  { name: 'Anita', ruolo: 'Opposto', peso: 79.4, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 17, sport: 'Under 19', gender: 'Femminile' },
  { name: 'Arianna', ruolo: 'Palleggiatrice', peso: null, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 16, sport: 'Under 17', gender: 'Femminile', anno: 2010 },
  { name: 'Chanel', ruolo: 'Banda', peso: 53.9, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 17, sport: 'Under 19', gender: 'Femminile' },
  { name: 'Elena Sanarico', ruolo: 'Banda', peso: null, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 17, sport: 'Under 19', gender: 'Femminile' },
  { name: 'Elena Bovino', ruolo: 'Centrale', peso: null, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 17, sport: 'Under 19', gender: 'Femminile' },
  { name: 'Fabiola', ruolo: 'Banda', peso: 51.9, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 17, sport: 'Under 19', gender: 'Femminile' },
  { name: 'Giulia D\'Aversa', ruolo: 'Centrale', peso: 60.5, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 17, sport: 'Under 19', gender: 'Femminile' },
  { name: 'Giulia', ruolo: 'Centrale', peso: null, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 17, sport: 'Under 19', gender: 'Femminile' },
  { name: 'Matilda', ruolo: 'Centrale', peso: 66.7, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 17, sport: 'Under 19', gender: 'Femminile' },
  { name: 'Aurora', ruolo: 'Opposto', peso: 84.5, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 17, sport: 'Under 19', gender: 'Femminile' },
  { name: 'Myriam', ruolo: 'Libero', peso: 63.1, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 17, sport: 'Under 19', gender: 'Femminile' },
  { name: 'Rebecca', ruolo: 'Banda', peso: null, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 17, sport: 'Under 19', gender: 'Femminile' },
  { name: 'Sofia Cencioni', ruolo: 'Banda', peso: 68.8, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 17, sport: 'Under 19', gender: 'Femminile' },
  { name: 'Cosmana', ruolo: 'Opposto', peso: null, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 17, sport: 'Under 19', gender: 'Femminile' },
  { name: 'Michela', ruolo: 'Banda', peso: null, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 17, sport: 'Under 19', gender: 'Femminile' },
  { name: 'Lavinia', ruolo: 'Banda', peso: null, altezza: null, reach: null, cmj: null, squat3MAV: null, age: 17, sport: 'Under 19', gender: 'Femminile' },
  { name: 'Marco Rossi', ruolo: 'Centrale', peso: 82.0, altezza: 190, reach: 245, cmj: 42, squat3MAV: 75, age: 19, sport: 'Serie B', gender: 'Maschile' },
  { name: 'Francesca Neri', ruolo: 'Palleggiatrice', peso: 58.0, altezza: 168, reach: 215, cmj: 32, squat3MAV: 45, age: 15, sport: 'Under 16', gender: 'Femminile' },
  { name: 'Lorenzo Bianchi', ruolo: 'Schiacciatore', peso: 88.0, altezza: 195, reach: 252, cmj: 48, squat3MAV: 90, age: 22, sport: 'Serie A2', gender: 'Maschile' }
];

// Storico completo dei primi 5 giorni in sala pesi estratti dalle tabelle del PDF
const DAYS_DATA = [
  {
    date: '2026-06-17',
    name: 'Giorno 1 - Seduta Forza & Esplosività',
    groups: [
      {
        athletes: ['Myriam', 'Chanel', 'Giulia D\'Aversa'],
        exercises: [
          { name: 'Power clean', notation: '(15*3*2)+(25*3*4)' },
          { name: 'Back squat', notation: '(30*10*1)+(35*5*1)+(40*3*3)' },
          { name: 'Pogo hops', notation: '0*20*4' },
          { name: 'Affondi', notation: '20*8*3' },
          { name: 'Push press', notation: '(15*6*1)+(20*6*1)+(25*5*3)' },
          { name: 'Rematore Pendlay', notation: '(15*8*1)+(25*4*4)' },
          { name: 'Med ball slam', notation: '4*3*5' }
        ]
      },
      {
        athletes: ['Sofia Cencioni', 'Lavinia', 'Elena Sanarico'],
        exercises: [
          { name: 'Spanish squat', notation: '0*30*3', type: 'time' },
          { name: 'Stacco da terra', notation: '(15*10*1)+(25*5*1)+(35*4*1)+(45*3*3)' },
          { name: 'Pogo hops', notation: '0*20*4' },
          { name: 'RDL monopodalici', notation: '20*10*3' },
          { name: 'Push press', notation: '(15*6*1)+(20*6*1)+(25*5*3)' },
          { name: 'Rematore Pendlay', notation: '(15*8*1)+(25*4*4)' },
          { name: 'Med ball slam', notation: '4*3*5' }
        ]
      },
      {
        athletes: ['Fabiola', 'Arianna', 'Michela'],
        exercises: [
          { name: 'Push press', notation: '(15*6*1)+(20*6*1)+(25*5*3)' },
          { name: 'Rematore Pendlay', notation: '(15*8*1)+(25*4*4)' },
          { name: 'Pogo hops', notation: '0*20*4' },
          { name: 'Back squat', notation: '(20*10*1)+(30*10*1)+(40*5*1)+(40*3*3)' },
          { name: 'RDL', notation: '35*8*4' },
          { name: 'Affondi', notation: '20*8*3' },
          { name: 'Med ball slam', notation: '4*3*5' }
        ]
      },
      {
        athletes: ['Matilda', 'Rebecca', 'Giulia Delli Santi'],
        exercises: [
          { name: 'Back squat', notation: '(20*10*1)+(30*10*1)+(35*5*4)' },
          { name: 'Pogo hops', notation: '0*10*4' },
          { name: 'RDL', notation: '35*8*3' },
          { name: 'Affondi', notation: '20*8*3' },
          { name: 'Push press', notation: '(15*6*1)+(20*6*1)+(25*3*3)' },
          { name: 'Rematore Pendlay', notation: '(15*8*1)+(25*4*4)' },
          { name: 'Med ball slam', notation: '4*3*5' }
        ]
      },
      {
        athletes: ['Anita', 'Elena Bovino', 'Cosmana', 'Aurora'],
        exercises: [
          { name: 'Affondi loop band', notation: '0*10*3' },
          { name: 'Globet squat', notation: '(10*10*1)+(20*10*3)' },
          { name: 'Stacchi kettlebell', notation: '20*10*3' },
          { name: 'RDL manubri', notation: '20*10*3' },
          { name: 'Pogo hops', notation: '0*10*4' },
          { name: 'Military press', notation: '15*10*4' },
          { name: 'Rematore Pendlay', notation: '(15*8*1)+(25*4*4)' },
          { name: 'Med ball slam', notation: '4*3*5' }
        ]
      }
    ]
  },
  {
    date: '2026-06-19',
    name: 'Giorno 2 - Accumulo ad Alto Volume',
    groups: [
      {
        athletes: ['Myriam', 'Chanel', 'Sofia Cencioni', 'Giulia D\'Aversa', 'Lavinia', 'Elena Sanarico', 'Fabiola', 'Arianna', 'Matilda', 'Michela', 'Rebecca', 'Giulia Delli Santi'],
        exercises: [
          { name: 'High pull', notation: '15*6*4' },
          { name: 'Back squat', notation: '(30*6*6)+(30*5*1)' },
          { name: 'Calf monopodalico', notation: '10*10*3' },
          { name: 'RDL monopodalici', notation: '15*12*3' },
          { name: 'Med ball slam', notation: '4*3*6' },
          { name: 'Push press', notation: '(15*8*1)+(20*6*4)' },
          { name: 'Rematore Pendlay', notation: '(15*8*1)+(25*5*4)' }
        ]
      },
      {
        athletes: ['Anita', 'Elena Bovino', 'Cosmana', 'Aurora'],
        exercises: [
          { name: 'Military press manubri seduti', notation: '14*8*4' },
          { name: 'Med ball slam', notation: '4*3*6' },
          { name: 'Rematore manubrio monolaterale', notation: '14*8*4' },
          { name: 'Affondi loop band', notation: '0*10*3' },
          { name: 'Globet squat 2” pausa in buca', notation: '(10*8*4)+(15*8*3)' },
          { name: 'RDL manubri', notation: '14*12*4' },
          { name: 'Calf monopodalico', notation: '10*10*4' }
        ]
      }
    ]
  },
  {
    date: '2026-06-22',
    name: 'Giorno 3 - Intensità & Trasferimento',
    groups: [
      {
        athletes: ['Myriam', 'Sofia Cencioni'],
        exercises: [
          { name: 'Pogo hops manubri a contrasto con loop band', notation: '10*10*4' },
          { name: 'High pull', notation: '(15*6*1)+(20*4*4)' },
          { name: 'Lateral Med ball slam', notation: '4*4*6' },
          { name: 'Back squat', notation: '(30*5*1)+(35*5*1)+(40*3*1)+(45*3*1)+(50*3*3)' },
          { name: 'Push press', notation: '(15*4*1)+(20*4*1)+(20*3*4)' },
          { name: 'RDL monopodalici', notation: '15*8*3' },
          { name: 'Trazioni orizzontali', notation: '0*6*2' },
          { name: 'Push up ginocchia', notation: '0*6*2' },
          { name: 'Crunch med ball', notation: '2*5*4' }
        ]
      },
      {
        athletes: ['Giulia D\'Aversa', 'Matilda'],
        exercises: [
          { name: 'Pogo hops manubri a contrasto con loop band', notation: '10*10*4' },
          { name: 'High pull', notation: '(15*6*1)+(20*4*4)' },
          { name: 'Lateral Med ball slam', notation: '4*4*6' },
          { name: 'Stacco da terra', notation: '(25*3*1)+(35*3*1)+(40*3*4)' },
          { name: 'Push press', notation: '(15*4*1)+(20*4*1)+(25*4*1)+(30*4*4)' },
          { name: 'Affondi monolaterali con manubri', notation: '16*8*3' },
          { name: 'Trazioni orizzontali', notation: '0*6*2' },
          { name: 'Push up ginocchia', notation: '0*6*2' },
          { name: 'Crunch med ball', notation: '2*5*4' }
        ]
      },
      {
        athletes: ['Fabiola', 'Arianna', 'Chanel'],
        exercises: [
          { name: 'Lateral Med ball slam', notation: '4*4*6' },
          { name: 'Pogo hops manubri a contrasto con loop band', notation: '10*10*4' },
          { name: 'High pull', notation: '(15*6*1)+(20*4*4)' },
          { name: 'Push press', notation: '(15*4*1)+(20*4*1)+(25*4*4)' },
          { name: 'Back squat', notation: '(25*5*1)+(30*3*1)+(35*2*1)+(40*2*4)' },
          { name: 'Hip Thrust', notation: '50*6*4' },
          { name: 'Trazioni orizzontali', notation: '0*6*2' },
          { name: 'Push up ginocchia', notation: '0*6*2' },
          { name: 'Crunch med ball', notation: '2*5*4' }
        ]
      },
      {
        athletes: ['Lavinia', 'Elena Sanarico'],
        exercises: [
          { name: 'Lateral Med ball slam', notation: '4*4*6' },
          { name: 'Pogo hops manubri a contrasto con loop band', notation: '10*10*4' },
          { name: 'High pull', notation: '(15*6*1)+(20*4*4)' },
          { name: 'Push press', notation: '(15*4*1)+(20*4*1)+(25*3*4)' },
          { name: 'Back squat', notation: '(25*5*1)+(30*3*1)+(35*2*1)+(40*2*4)' },
          { name: 'Hip Thrust', notation: '50*6*4' },
          { name: 'Trazioni orizzontali', notation: '0*6*2' },
          { name: 'Push up ginocchia', notation: '0*6*2' },
          { name: 'Crunch med ball', notation: '2*5*4' }
        ]
      },
      {
        athletes: ['Anita', 'Elena Bovino', 'Cosmana', 'Aurora'],
        exercises: [
          { name: 'Pogo hops manubri a contrasto con loop band', notation: '5*10*4' },
          { name: 'Rematore manubrio monolaterale', notation: '8*6*4' },
          { name: 'Med ball slam', notation: '4*3*6' },
          { name: 'Military press manubri seduti', notation: '14*4*5' },
          { name: 'Affondi loop band', notation: '0*10*2' },
          { name: 'Back squat fermo in buca 2”', notation: '15*4*4' },
          { name: 'Stacco sumo kettlebell concentrica 3”', notation: '18*3*4' },
          { name: 'Push up ginocchia', notation: '0*6*2' },
          { name: 'Crunch med ball', notation: '2*5*4' }
        ]
      }
    ]
  },
  {
    date: '2026-06-26',
    name: 'Giorno 4 - Potenza Massima & Pliometria',
    groups: [
      {
        athletes: ['Myriam', 'Chanel'],
        exercises: [
          { name: 'High pull / power clean', notation: '(15*4*2)+(20*4*4)' },
          { name: 'Push press', notation: '(15*5*6)' },
          { name: 'Back squat', notation: '(20*10*2)+(30*6*2)+(35*5*2)+(40*5*4)' },
          { name: 'Affondi monolaterali con manubri', notation: '16*8*4' },
          { name: 'Calf monopodalico', notation: '10*10*5' },
          { name: 'Med ball slam', notation: '4*5*8' },
          { name: 'Trazioni orizzontali', notation: '0*8*3' },
          { name: 'Push up ginocchia con fermo a terra', notation: '0*8*2' },
          { name: 'Crunch med ball', notation: '3*8*6' }
        ]
      },
      {
        athletes: ['Giulia D\'Aversa', 'Matilda'],
        exercises: [
          { name: 'Med ball slam', notation: '4*5*8' },
          { name: 'High pull / power clean', notation: '(15*4*2)+(20*4*4)' },
          { name: 'Stacco da terra', notation: '(25*3*2)+(35*3*2)+(40*3*4)' },
          { name: 'Hip Thrust', notation: '50*6*4' },
          { name: 'Push press', notation: '(15*5*2)+(20*5*2)+(25*4*4)' },
          { name: 'Crunch med ball', notation: '3*8*6' },
          { name: 'Calf monopodalico', notation: '10*10*5' },
          { name: 'Trazioni orizzontali', notation: '0*8*3' },
          { name: 'Push up ginocchia con fermo a terra', notation: '0*8*2' }
        ]
      },
      {
        athletes: ['Fabiola', 'Arianna', 'Lavinia'],
        exercises: [
          { name: 'High pull / power clean', notation: '(15*4*2)+(20*4*4)' },
          { name: 'Back squat', notation: '(20*10*2)+(30*6*2)+(35*4*5)' },
          { name: 'Push press', notation: '(15*4*2)+(20*4*5)' },
          { name: 'Med ball slam', notation: '4*5*8' },
          { name: 'Calf monopodalico', notation: '10*10*5' },
          { name: 'Hip Thrust', notation: '50*6*4' },
          { name: 'Crunch med ball', notation: '3*8*6' },
          { name: 'Push up ginocchia con fermo a terra', notation: '0*8*2' },
          { name: 'Trazioni orizzontali', notation: '0*8*3' }
        ]
      },
      {
        athletes: ['Anita', 'Elena Bovino', 'Cosmana', 'Aurora'],
        exercises: [
          { name: 'Trazioni orizzontali', notation: '0*6*2' },
          { name: 'Med ball slam', notation: '4*5*8' },
          { name: 'Affondi loop band', notation: '0*10*3' },
          { name: 'Back squat fermo in buca 2”', notation: '15*4*6' },
          { name: 'Stacco sumo kettlebell concentrica 3”', notation: '12*4*6' },
          { name: 'Push up ginocchia con fermo a terra', notation: '0*6*2' },
          { name: 'Rematore manubrio monolaterale', notation: '5*8*4' },
          { name: 'Military press manubri seduti', notation: '10*8*4' },
          { name: 'Calf monopodalico', notation: '10*10*4' },
          { name: 'Crunch med ball', notation: '3*8*6' }
        ]
      }
    ]
  },
  {
    date: '2026-06-29',
    name: 'Giorno 5 - Massimi Sforzi & Reattività (Oggi)',
    groups: [
      {
        athletes: ['Myriam', 'Sofia Cencioni'],
        exercises: [
          { name: 'Pogo hops manubri a contrasto con loop band', notation: '10*10*4' },
          { name: 'High pull / power clean', notation: '(15*4*2)+(20*4*2)+(25*3*3)' },
          { name: 'Lateral Med ball slam', notation: '3*4*6' },
          { name: 'Back squat', notation: '(20*10*1)+(30*6*1)+(40*3*1)+(45*3*1)+(50*2*2)+(55*2*4)' },
          { name: 'Push press', notation: '(15*4*1)+(20*4*5)' },
          { name: 'RDL monopodalici', notation: '16*10*3' },
          { name: 'Trazioni orizzontali', notation: '0*6*4' },
          { name: 'Push up ginocchia con fermo a terra', notation: '0*8*3' },
          { name: 'Crunch med ball', notation: '3*10*6' }
        ]
      },
      {
        athletes: ['Giulia D\'Aversa', 'Matilda'],
        exercises: [
          { name: 'Pogo hops manubri a contrasto con loop band', notation: '10*10*4' },
          { name: 'High pull / power clean', notation: '(15*4*2)+(20*4*2)+(25*3*3)', rpe: 8 },
          { name: 'Lateral Med ball slam', notation: '3*4*6' },
          { name: 'Stacco dai blocchi', notation: '(25*3*2)+(35*3*2)+(40*3*2)+(45*2*4)' },
          { name: 'Push press', notation: '(15*5*1)+(20*4*1)+(25*4*1)+(30*3*6)', rpe: 9 },
          { name: 'Affondi monolaterali con kettlebell', notation: '12*10*3' },
          { name: 'Trazioni orizzontali', notation: '0*6*4' },
          { name: 'Push up ginocchia con fermo a terra', notation: '0*8*3' },
          { name: 'Crunch med ball', notation: '3*10*6' }
        ]
      },
      {
        athletes: ['Fabiola', 'Chanel'],
        exercises: [
          { name: 'Lateral Med ball slam', notation: '3*4*6' },
          { name: 'Pogo hops manubri a contrasto con loop band', notation: '10*10*4' },
          { name: 'High pull / power clean', notation: '(15*4*2)+(20*4*2)+(25*3*3)' },
          { name: 'Push press', notation: '(15*4*2)+(20*3*2)+(25*3*4)', rpe: 8 },
          { name: 'Back squat', notation: '(20*10*1)+(30*6*1)+(35*3*2)+(40*3*4)' },
          { name: 'Hip Thrust', notation: '50*6*4' },
          { name: 'Trazioni orizzontali', notation: '0*6*4' },
          { name: 'Push up ginocchia con fermo a terra', notation: '0*8*3' },
          { name: 'Crunch med ball', notation: '3*10*6' }
        ]
      },
      {
        athletes: ['Lavinia', 'Arianna'],
        exercises: [
          { name: 'Lateral Med ball slam', notation: '3*4*6' },
          { name: 'Pogo hops manubri a contrasto con loop band', notation: '10*10*4' },
          { name: 'High pull', notation: '(15*6*1)+(20*4*4)' },
          { name: 'Back squat', notation: '(20*10*1)+(30*6*1)+(35*3*2)+(40*2*4)' },
          { name: 'Hip Thrust', notation: '50*6*4' },
          { name: 'Push press', notation: '(15*4*2)+(20*3*2)+(25*2*4)' },
          { name: 'Trazioni orizzontali', notation: '0*6*3' },
          { name: 'Push up ginocchia con fermo a terra', notation: '0*8*2' },
          { name: 'Crunch med ball', notation: '3*10*6' }
        ]
      },
      {
        athletes: ['Anita', 'Elena Bovino'],
        exercises: [
          { name: 'Pogo hops manubri a contrasto con loop band', notation: '5*10*4' },
          { name: 'Trazioni orizzontali', notation: '0*6*3', rpe: 9 },
          { name: 'Lateral Med ball slam', notation: '3*4*6' },
          { name: 'Military press manubri seduti', notation: '14*5*5' },
          { name: 'Affondi loop band', notation: '0*10*2' },
          { name: 'Back squat fermo in buca 2”', notation: '15*6*4' },
          { name: 'Stacco sumo kettlebell concentrica 3”', notation: '20*3*5' },
          { name: 'Push up ginocchia con fermo a terra', notation: '0*8*2' },
          { name: 'Crunch med ball', notation: '3*10*6' }
        ]
      },
      {
        athletes: ['Aurora', 'Cosmana'],
        exercises: [
          { name: 'Pogo hops manubri a contrasto con loop band', notation: '5*10*4' },
          { name: 'Trazioni orizzontali', notation: '0*6*3' },
          { name: 'Lateral Med ball slam', notation: '3*4*6' },
          { name: 'Military press manubri seduti', notation: '16*5*5' },
          { name: 'Affondi loop band', notation: '0*10*2' },
          { name: 'Back squat fermo in buca 2”', notation: '(15*4*2)+(20*4*4)' },
          { name: 'Stacco sumo kettlebell concentrica 3”', notation: '20*3*5' },
          { name: 'Push up ginocchia con fermo a terra', notation: '0*6*5' },
          { name: 'Crunch med ball', notation: '3*10*6' }
        ]
      }
    ]
  }
];

// Helper per estrarre la variazione dal nome (es. Back squat fermo in buca 2" -> nome: Back squat, variazione: fermo in buca 2")
function extractCleanNameAndVariation(rawExName) {
  if (!rawExName || typeof rawExName !== 'string') {
    return { name: '', variation: '' };
  }
  let name = rawExName;
  let variation = '';
  let lowerName = rawExName.toLowerCase().trim();

  if (lowerName.includes('fermo in buca 2”') || lowerName.includes('fermo in buca 2"')) {
    lowerName = 'back squat';
    variation = 'fermo in buca 2"';
  } else if (lowerName.includes('2” pausa in buca') || lowerName.includes('2" pausa in buca')) {
    lowerName = 'back squat';
    variation = 'fermo in buca 2"';
  } else if (lowerName.includes('concentrica 3”') || lowerName.includes('concentrica 3"')) {
    if (lowerName.includes('sumo')) {
      lowerName = 'stacco sumo kettlebell';
    } else {
      lowerName = 'stacco da terra';
    }
    variation = 'concentrica 3"';
  } else if (lowerName.includes('partenza da terra') || lowerName.includes('con fermo a terra')) {
    lowerName = 'push up ginocchia';
    variation = 'partenza da terra';
  } else if (lowerName.includes('dai blocchi')) {
    lowerName = 'stacco da terra';
    variation = 'partenza dai blocchi';
  }

  // Mappatura nomi generici dei vecchi esercizi a quelli nuovi in EXERCISE_LIBRARY
  if (lowerName === 'back squat') name = 'back squat';
  else if (lowerName === 'globet squat') name = 'back squat';
  else if (lowerName === 'spanish squat') name = 'spanish squat';
  else if (lowerName === 'affondi') name = 'Affondi';
  else if (lowerName === 'affondi loop band') name = 'affondi loop band';
  else if (lowerName === 'affondi monolaterali con manubri' || lowerName === 'affondi monolaterali con kettlebell') name = 'Affondi';
  else if (lowerName === 'rdl') name = 'RDL';
  else if (lowerName === 'rdl monopodalici') name = 'RDL monopodalici';
  else if (lowerName === 'rdl manubri') name = 'RDL';
  else if (lowerName === 'stacco da terra') name = 'stacco da terra';
  else if (lowerName === 'stacco sumo') name = 'stacco da terra';
  else if (lowerName === 'stacchi kettlebell') name = 'stacco sumo kettlebell';
  else if (lowerName === 'hip thrust') name = 'Hip thrust';
  else if (lowerName === 'calf monopodalico') name = 'calf monopodalico';
  
  else if (lowerName === 'push press') name = 'push press';
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
    
    // Inizializza test storici plausibili basati su stime in base a peso e ruolo,
    // dato che i valori del PDF sono inizialmente vuoti per l'atleta da testare
    const baseCmj = player.cmj || (player.peso ? Math.round(55 - player.peso * 0.15) : 38);
    const baseReach = player.reach || (player.peso ? Math.round(player.peso * 2.2 + 80) : 225);
    const baseSquat = player.squat3MAV || (player.peso ? Math.round(player.peso * 0.7) : 40);

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
      { date: '2026-05-10', sprint10m: player.ruolo === 'Libero' ? 1.68 : (player.ruolo === 'Palleggiatrice' ? 1.79 : 1.83) },
      { date: '2026-06-15', sprint10m: player.ruolo === 'Libero' ? 1.62 : (player.ruolo === 'Palleggiatrice' ? 1.75 : 1.79) }
    ];

    const elevationTests = [
      { date: '2026-05-10', cmj: baseCmj - 3, broadJump: Math.round(baseCmj * 4.6), spikeJump: baseReach + baseCmj - 3 + 12 },
      { date: '2026-06-15', cmj: baseCmj, broadJump: Math.round(baseCmj * 4.9), spikeJump: baseReach + baseCmj + 18 }
    ];

    const defaultAltezza = player.ruolo === 'Centrale' ? 183 : (player.ruolo === 'Opposto' ? 180 : 172);

    let situations = '';
    if (player.name === 'Anita') {
      situations = 'Dolore cronico al ginocchio sx (tendinopatia rotulea)';
    } else if (player.name === 'Elena Bovino') {
      situations = 'Lieve scoliosi dorso-lombare';
    } else if (player.name === 'Arianna') {
      situations = 'Recente fastidio spalla dx (extrarotatori)';
    } else if (player.name === 'Marco Rossi') {
      situations = 'Lieve tendinite rotulea ginocchio dx';
    } else if (player.name === 'Lorenzo Bianchi') {
      situations = 'Fastidio spalla sx nel colpo di attacco';
    }

    return {
      id: id,
      name: player.name,
      age: player.age || 17,
      gender: player.gender || 'F',
      ruolo: player.ruolo,
      sport: player.sport || 'U16 Femminile Volley',
      goal: `Sviluppo forza arti inferiori e stabilità/potenza specifica volley.`,
      situations: situations,
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
    // Costruisci le sedute del macrociclo corrente dal PDF
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

    // Per Anita, genera macrocicli passati fittizi (Gennaio-Maggio)
    if (athlete.name === 'Anita') {
      athlete.macrocicli = generateAnitaPastMacrocycles();
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

// Genera macrocicli passati fittizi per Anita (Gennaio-Maggio 2026)
function generateAnitaPastMacrocycles() {
  let exCounter = 0;
  function ex(name, sets, reps, weight) {
    exCounter++;
    const libEx = EXERCISE_LIBRARY.find(le => le.name === name) || { type: 'weight', category: 'Squat', defaultRest: 90 };
    return { id: `ex-past-${Date.now()}-${exCounter}-${Math.floor(Math.random()*1000)}`, name, variation: '', category: libEx.category, type: libEx.type, sets, reps, weight, rest: libEx.defaultRest || 90, notes: '' };
  }

  return [
    {
      id: 'macro-anita-1', name: 'Macrociclo 1',
      sedute: [
        { id: 'sed-a1-1', name: 'Seduta 1', exercises: [
          ex('back squat',3,12,8), ex('RDL',3,10,10), ex('military press bilanciere',3,10,10), ex('rematore pendlay',3,10,15)
        ]},
        { id: 'sed-a1-2', name: 'Seduta 2', exercises: [
          ex('affondi loop band',3,10,0), ex('stacco sumo kettlebell',3,10,12), ex('push up ginocchia',3,8,0), ex('med ball slam',3,5,3)
        ]},
        { id: 'sed-a1-3', name: 'Seduta 3', exercises: [
          ex('back squat',3,10,10), ex('calf monopodalico',3,12,5), ex('rematore manubrio',3,10,8), ex('pogo hops',3,10,0)
        ]}
      ]
    },
    {
      id: 'macro-anita-2', name: 'Macrociclo 2',
      sedute: [
        { id: 'sed-a2-1', name: 'Seduta 1', exercises: [
          ex('back squat',4,8,14), ex('stacco sumo kettlebell',4,8,16), ex('military press bilanciere',4,8,12), ex('pogo hops',4,10,0)
        ]},
        { id: 'sed-a2-2', name: 'Seduta 2', exercises: [
          ex('affondi loop band',3,10,0), ex('RDL',4,8,14), ex('rematore manubrio',4,8,10), ex('med ball slam',4,4,4)
        ]},
        { id: 'sed-a2-3', name: 'Seduta 3', exercises: [
          ex('back squat',4,6,16), ex('calf monopodalico',3,10,8), ex('military press manubri',4,8,10), ex('push up ginocchia',3,8,0)
        ]},
        { id: 'sed-a2-4', name: 'Seduta 4', exercises: [
          ex('stacco sumo kettlebell',4,6,18), ex('affondi loop band',3,10,0), ex('rematore pendlay',4,6,20), ex('pogo hops',4,12,0)
        ]}
      ]
    },
    {
      id: 'macro-anita-3', name: 'Macrociclo 3',
      sedute: [
        { id: 'sed-a3-1', name: 'Seduta 1', exercises: [
          ex('back squat',4,10,15), ex('RDL',4,10,16), ex('military press bilanciere',4,6,14), ex('crunch med ball',3,8,2)
        ]},
        { id: 'sed-a3-2', name: 'Seduta 2', exercises: [
          ex('affondi loop band',4,10,0), ex('stacco sumo kettlebell',4,8,18), ex('rematore manubrio',4,10,12), ex('med ball slam',4,5,4)
        ]},
        { id: 'sed-a3-3', name: 'Seduta 3', exercises: [
          ex('back squat',4,8,18), ex('calf monopodalico',4,10,10), ex('military press manubri',4,8,12), ex('pogo hops',4,10,0)
        ]}
      ]
    },
    {
      id: 'macro-anita-4', name: 'Macrociclo 4',
      sedute: [
        { id: 'sed-a4-1', name: 'Seduta 1', exercises: [
          ex('back squat',5,5,20), ex('stacco sumo kettlebell',4,5,20), ex('military press bilanciere',5,4,15), ex('pogo hops',4,10,0)
        ]},
        { id: 'sed-a4-2', name: 'Seduta 2', exercises: [
          ex('affondi loop band',3,10,0), ex('RDL',4,6,18), ex('rematore pendlay',5,4,22), ex('med ball slam',5,3,4)
        ]},
        { id: 'sed-a4-3', name: 'Seduta 3', exercises: [
          ex('back squat',5,4,22), ex('Hip thrust',4,6,30), ex('military press manubri',4,5,14), ex('crunch med ball',4,8,2)
        ]},
        { id: 'sed-a4-4', name: 'Seduta 4', exercises: [
          ex('stacco sumo kettlebell',5,4,20), ex('calf monopodalico',4,10,10), ex('rematore manubrio',4,6,12), ex('push up ginocchia',3,10,0)
        ]}
      ]
    },
    {
      id: 'macro-anita-5', name: 'Macrociclo 5',
      sedute: [
        { id: 'sed-a5-1', name: 'Seduta 1', exercises: [
          ex('back squat',4,6,20), ex('pogo hops a contrasto',4,10,5), ex('military press bilanciere',4,5,15), ex('med ball slam',4,5,4)
        ]},
        { id: 'sed-a5-2', name: 'Seduta 2', exercises: [
          ex('affondi loop band',3,10,0), ex('stacco sumo kettlebell',4,6,20), ex('rematore manubrio',4,8,10), ex('crunch med ball',4,6,2)
        ]},
        { id: 'sed-a5-3', name: 'Seduta 3', exercises: [
          ex('back squat',4,4,22), ex('RDL',4,8,18), ex('military press manubri',4,5,14), ex('pogo hops',4,12,0)
        ]}
      ]
    }
  ];
}

// Helper per il parsing delle notazioni dei set
// Esempi: (15*3*2)+(25*3*4) o 20*10*4 o 0*30*3
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
      // Controlli per reset in caso di cambiamenti strutturali critici (es. roster incompleto o atleti di mock obsoleti)
      const hasValidAthletes = parsed && Array.isArray(parsed.athletes) && parsed.athletes.length > 0;
      const hasOldMockRoster = hasValidAthletes && parsed.athletes.some(a => a && a.name === 'Elena Bovino' && a.antropometria && a.antropometria.altezza !== null);
      const hasOldFlatMacrociclo = hasValidAthletes && parsed.athletes.some(a => a && a.macrociclo && !a.macrocicli);
      const hasNoSituations = hasValidAthletes && parsed.athletes.some(a => a && a.situations === undefined);
      
      if (!hasValidAthletes || parsed.athletes.some(a => a && a.name === 'Andrea Lucchetta') || hasOldMockRoster || hasOldFlatMacrociclo || hasNoSituations) {
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
