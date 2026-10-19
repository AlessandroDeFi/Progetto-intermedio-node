# Guida per il team: autenticazione con JWT

Questa guida spiega come funziona il login del progetto e come **usarlo nelle vostre parti** (liste, TMDb, commenti...) senza dover capire tutto il codice.

Relativa all'issue **#1 - Registrarsi e autenticarsi tramite Bearer Token (JWT)**.

---

## 1. Avviare il backend (prima volta)

Serve Node.js e un database MongoDB (consigliato: MongoDB Atlas gratuito).

```bash
cd backend
npm install
cp .env.example .env      # su Windows: copy .env.example .env
```

Apri `backend/.env` e compila:

| Variabile | Cosa metterci |
|-----------|---------------|
| `PORT` | `3000` |
| `MONGO_URI` | La stringa di connessione al database (Atlas: Connect > Drivers). Ognuno usa il **proprio** database o quello condiviso dal team. |
| `JWT_SECRET` | Una stringa lunga e casuale inventata da voi. Se il team usa un database condiviso, tutti devono usare lo **stesso** valore, altrimenti i token degli altri non funzionano. |
| `JWT_EXPIRES_IN` | `1h` |

Poi:

```bash
npm run dev
```

Se vedi `MongoDB connesso` e `Server su http://localhost:3000`, funziona.

> **Mai caricare il file `.env` su GitHub** (e' gia' nel `.gitignore`). Contiene password.
> Se vi serve condividere i valori, passateveli in privato, non in chat pubbliche o nelle issue.

Se la password del database contiene caratteri speciali (`! @ # / :`) vanno codificati nell'URL (`!` diventa `%21`). Piu' semplice: usare una password solo con lettere e numeri.

---

## 2. Gli endpoint

Base: `http://localhost:3000/api/auth`

| Metodo | URL | Serve il token? | Cosa fa |
|--------|-----|-----------------|---------|
| POST | `/register` | no | Crea un utente. Body: `{ "email", "username", "password" }` |
| POST | `/login` | no | Restituisce `{ token, user }`. Body: `{ "email", "password" }` |
| GET | `/me` | **si'** | Restituisce l'utente collegato |
| POST | `/logout` | **si'** | Conferma il logout (il token si cancella lato frontend) |

Codici di risposta: `200` ok, `201` creato, `400` dati mancanti o non validi, `401` non autenticato, `409` utente gia' esistente, `500` errore del server.

---

## 3. Provarlo in 1 minuto (PowerShell)

```powershell
# registrazione
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/register -ContentType "application/json" -Body '{"email":"prova@test.it","username":"prova","password":"secret123"}'

# login (salva il token in $r)
$r = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login -ContentType "application/json" -Body '{"email":"prova@test.it","password":"secret123"}'

# rotta protetta
Invoke-RestMethod -Uri http://localhost:3000/api/auth/me -Headers @{ Authorization = "Bearer $($r.token)" }
```

Con Postman/Insomnia: dopo il login copia il `token`, poi in una richiesta protetta vai su **Authorization > Bearer Token** e incollalo.

---

## 4. Come proteggere una vostra rotta (la cosa piu' importante)

Nel progetto c'e' un middleware pronto: `backend/middleware/auth.js`.
Basta metterlo **davanti** alla rotta. Dentro la rotta, `req.user` contiene l'utente collegato.

```js
const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// Solo utenti loggati. Ognuno vede SOLO le proprie liste.
router.get('/liste', auth, async (req, res) => {
  const liste = await Lista.find({ owner: req.user._id });
  res.json(liste);
});

// Creazione: l'utente viene preso dal token, MAI dal body
router.post('/liste', auth, async (req, res) => {
  const lista = await Lista.create({ nome: req.body.nome, owner: req.user._id });
  res.status(201).json(lista);
});

module.exports = router;
```

Poi registrate il router in `backend/app.js`, **sotto** la riga delle rotte di auth:

```js
app.use('/api/auth', require('./routes/auth'));
app.use('/api/liste', require('./routes/liste'));   // <- la vostra
```

### Regole d'oro

1. **Ogni documento salvato dall'utente (lista, commento, voto...) deve avere un campo `owner`** con `req.user._id`.
2. **Filtrare sempre per `owner`** quando si leggono, modificano o cancellano dati: altrimenti un utente puo' toccare i dati di un altro cambiando l'id nell'URL.
3. L'id dell'utente **non si prende mai dal body** della richiesta: si usa `req.user._id`.
4. La password non va mai restituita nelle risposte (gia' gestito: `req.user` non la contiene).

---

## 5. Usarlo dal frontend

Dopo il login, il frontend salva il token e lo invia in ogni richiesta protetta:

```js
// login
const res = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const { token } = await res.json();
localStorage.setItem('token', token);

// richiesta protetta
const lista = await fetch('http://localhost:3000/api/liste', {
  headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
});

// logout: basta cancellare il token
localStorage.removeItem('token');
```

Se il frontend gira su un'altra porta (es. 5173) il browser bloccherà le richieste per il CORS.
Soluzione: nel backend `npm install cors` e in `app.js`, **prima delle rotte**:

```js
const cors = require('cors');
app.use(cors({ origin: 'http://localhost:5173' }));
```

Se ricevete `401`, il token manca, e' scaduto (dura 1 ora) o e' sbagliato: rifare il login.

---

## 6. Dove sta cosa

```
backend/
├── app.js                 <- avvia il server, collega database e rotte
├── .env.example           <- modello del .env (senza segreti)
├── config/passport.js     <- come si controlla il token
├── middleware/auth.js     <- il "portiere" da usare davanti alle rotte
├── models/User.js         <- com'e' fatto un utente (password con hash)
└── routes/auth.js         <- register, login, /me, logout
```

Per aggiungere una funzione nuova (es. liste): un file in `models/` per i dati, un file in `routes/` per le rotte, una riga in `app.js` per collegarle.

---

## 7. Problemi comuni

| Errore | Causa e rimedio |
|--------|-----------------|
| `EADDRINUSE` | La porta 3000 e' occupata da un altro server gia' acceso: fermatelo (Ctrl+C) o cambiate `PORT` nel `.env`. |
| `bad auth : authentication failed` | Utente o password del database errati in `MONGO_URI`. Riavviare dopo aver cambiato `.env`. |
| `401 Unauthorized` su una rotta protetta | Header mancante, token scaduto o `JWT_SECRET` diverso da quello con cui e' stato creato il token. |
| `409` in registrazione | Esiste gia' un utente con quell'email o username. |
| `req.body` e' `undefined` | La rotta e' registrata prima di `app.use(express.json())`. |
| Il `.env` cambiato non ha effetto | Serve fermare e riavviare il server (`Ctrl+C`, poi `npm run dev`). |

---

## 8. Come lavorare con Git senza pestarsi i piedi

1. Prima di iniziare: `git checkout main && git pull`.
2. Create un ramo per la vostra issue: `git checkout -b feature/nome-funzione`.
3. Fate commit piccoli e frequenti.
4. `git push -u origin feature/nome-funzione` e aprite una **Pull Request** che chiuda la vostra issue scrivendo `Closes #<numero>` nella descrizione.
5. Qualcun altro del team la rivede prima del merge.

Non fate commit di `node_modules/` e `.env`.
