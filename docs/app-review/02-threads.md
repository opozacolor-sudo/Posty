# Meta App Review — Threads API

Portal: aceeași consolă Meta (developers.facebook.com), aplicația cu produsul **Threads API** (THREADS_APP_ID / META_THREADS_APP_ID).

## Permisiuni folosite (din `lib/threads-oauth.ts`)

| Permisiune | Folosire | Review? |
|---|---|---|
| `threads_basic` | ID + username-ul contului Threads conectat | Da |
| `threads_content_publish` | publică text/poze/video pe Threads | Da |
| `threads_manage_insights` | doar dacă `THREADS_INCLUDE_INSIGHTS_SCOPES=true` — statistici | Doar dacă o ceri |

> Dacă nu folosești insights pe Threads în producție, NU cere `threads_manage_insights` — o permisiune în plus = un motiv de respingere în plus.

## Setări în portal

- [ ] Produs **Threads API** adăugat în app
- [ ] Redirect Callback URL: `https://__DOMAIN__/api/auth/threads/callback`
- [ ] **Deauthorize Callback URL**: `https://__DOMAIN__/api/auth/threads/deauthorize`
- [ ] **Data Deletion Request URL**: `https://__DOMAIN__/api/auth/threads/data-deletion`
- [ ] Privacy Policy URL: `https://__DOMAIN__/en/privacy`

> Endpoint-urile de deauthorize și data-deletion există deja în cod (`app/api/auth/threads/…`). Data-deletion returnează automat URL-ul corect pe baza domeniului.

## Texte formular (EN)

**threads_basic**
> We use threads_basic to fetch the connected account's ID and username so the user can verify which Threads account is linked to Posty.

**threads_content_publish**
> Core feature: the user writes a post in Posty's chat interface (optionally attaching a photo or video) and publishes it to their own Threads account, immediately or at a scheduled time they set. All content is user-created; Posty never posts autonomously.

## Screencast — script

1. Login Posty → Accounts → Connect Threads → arată ecranul de consimțământ
2. Chat: „postează pe threads: <text>" cu media atașată
3. Arată succes în chat → deschide profilul Threads → arată postarea
4. (Dacă ceri insights) arată cardul de statistici cu date din Threads

## Note

- Threads API e mai nou și review-ul e de obicei mai rapid decât Instagram/Facebook
- Contul de test trebuie să aibă un profil Threads activ (creat din Instagram)
- Threads acceptă video prin URL — Posty folosește proxy-ul semnat `/api/media/publish`; asigură-te că funcționează pe noul domeniu înainte de screencast
