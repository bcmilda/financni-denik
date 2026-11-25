// Finanční deník · cloud.js · v0.6.0
// Firebase (Auth + Realtime Database). Načítá se jen když je vyplněný js/config.js.

const V = '10.12.2';
const SDK = n => `https://www.gstatic.com/firebasejs/${V}/firebase-${n}.js`;

const CHYBY = {
  'auth/invalid-email': 'Tenhle e-mail nevypadá správně.',
  'auth/missing-password': 'Doplň heslo.',
  'auth/weak-password': 'Heslo musí mít aspoň 6 znaků.',
  'auth/email-already-in-use': 'Účet s tímto e-mailem už existuje. Přihlas se.',
  'auth/invalid-credential': 'E-mail nebo heslo nesedí.',
  'auth/wrong-password': 'E-mail nebo heslo nesedí.',
  'auth/user-not-found': 'Účet s tímto e-mailem neexistuje.',
  'auth/too-many-requests': 'Moc pokusů. Zkus to za chvíli.',
  'auth/popup-closed-by-user': 'Přihlašovací okno se zavřelo.',
  'auth/network-request-failed': 'Nejde se připojit k internetu.',
};
export const chyba = e => CHYBY[e && e.code] || 'Něco se nepovedlo (' + ((e && e.code) || 'neznámá chyba') + ').';

export async function startCloud(config, onUser) {
  const [{ initializeApp }, A, D] = await Promise.all([import(SDK('app')), import(SDK('auth')), import(SDK('database'))]);
  const app = initializeApp(config);
  const auth = A.getAuth(app);
  auth.languageCode = 'cs';
  const db = D.getDatabase(app);
  let unsub = null;
  const api = {
    google: () => A.signInWithPopup(auth, new A.GoogleAuthProvider()),
    login: (email, heslo) => A.signInWithEmailAndPassword(auth, email, heslo),
    registrace: (email, heslo) => A.createUserWithEmailAndPassword(auth, email, heslo),
    reset: email => A.sendPasswordResetEmail(auth, email),
    odhlasit: () => { if (unsub) unsub(); unsub = null; return A.signOut(auth); },
    // Odběr celého deníku uživatele (první načtení + změny z jiných zařízení)
    odebirej: (uid, cb) => { if (unsub) unsub(); unsub = D.onValue(D.ref(db, 'users/' + uid), s => cb(s.val())); },
    // Přihlašovací token pro vlastní worker (AI vysvětlení)
    token: () => auth.currentUser ? auth.currentUser.getIdToken() : Promise.reject(new Error('neprihlasen')),
    writer: uid => ({ write: (path, val) => D.set(D.ref(db, 'users/' + uid + '/' + path.join('/')), val).catch(e => console.error('Zápis selhal', path.join('/'), e)) }),
  };
  A.onAuthStateChanged(auth, u => onUser(u, api));
  return api;
}
