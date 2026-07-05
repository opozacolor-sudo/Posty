# Posty — Master Checklist pentru App Review

> Placeholder folosit peste tot: `__DOMAIN__` (ex. `posty.ro`).
> După ce cumperi domeniul, rulează din rădăcina proiectului:
>
> ```bash
> grep -rl '__DOMAIN__' docs/app-review | xargs sed -i '' 's/__DOMAIN__/domeniul-tau.ro/g'
> ```

## Ziua 1 — după cumpărarea domeniului

### 1. Vercel

- [ ] Adaugă domeniul: Project → Settings → Domains → `__DOMAIN__` (+ `www.__DOMAIN__` cu redirect)
- [ ] Setează/actualizează env-urile în **Production** și fă **Redeploy**:

| Variabilă | Valoare nouă |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://__DOMAIN__` |
| `META_REDIRECT_URI` | `https://__DOMAIN__/api/auth/instagram/callback` |
| `META_FACEBOOK_REDIRECT_URI` | `https://__DOMAIN__/api/auth/facebook/callback` |
| `INSTAGRAM_REDIRECT_URI` | `https://__DOMAIN__/api/auth/instagram/callback` |
| `THREADS_REDIRECT_URI` | `https://__DOMAIN__/api/auth/threads/callback` |
| `TIKTOK_REDIRECT_URI` | `https://__DOMAIN__/api/auth/tiktok/callback` |
| `GOOGLE_REDIRECT_URI` | `https://__DOMAIN__/api/auth/youtube/callback` |
| `GOOGLE_BUSINESS_REDIRECT_URI` | `https://__DOMAIN__/api/auth/google-business/callback` |
| `LINKEDIN_REDIRECT_URI` | `https://__DOMAIN__/api/auth/linkedin/callback` |
| `PINTEREST_REDIRECT_URI` | `https://__DOMAIN__/api/auth/pinterest/callback` |

- [ ] Opțional dar recomandat: `NEXT_PUBLIC_LEGAL_CONTACT_EMAIL` cu o adresă pe domeniu (ex. `contact@__DOMAIN__`) — arată mai profesionist la review decât un Gmail.

### 2. Verifică paginile obligatorii (deja există în aplicație)

| Pagină | URL | Cerută de |
|---|---|---|
| Privacy Policy | `https://__DOMAIN__/en/privacy` | toate platformele |
| Terms of Service | `https://__DOMAIN__/en/terms` | Meta, TikTok, Pinterest |
| Data Deletion (callback Threads) | `https://__DOMAIN__/api/auth/threads/data-deletion` | Meta/Threads |
| Deauthorize (callback Threads) | `https://__DOMAIN__/api/auth/threads/deauthorize` | Meta/Threads |

> La formulare folosește versiunea `/en/` — recenzorii nu citesc română.

### 3. Actualizează redirect URIs în fiecare portal de developer

Vezi dosarul fiecărei platforme. Pe scurt:

- [ ] **Meta** (developers.facebook.com) — Valid OAuth Redirect URIs pentru Instagram + Facebook Login
- [ ] **Threads** (aceeași consolă Meta, produs Threads API) — Redirect Callback URL + Deauthorize + Data Deletion
- [ ] **TikTok** (developers.tiktok.com) — Redirect URI + Web/Desktop URL
- [ ] **Google Cloud Console** — Authorized redirect URIs în OAuth Client (YouTube + Google Business)
- [ ] **LinkedIn** (developer.linkedin.com) — Authorized redirect URLs
- [ ] **Pinterest** (developers.pinterest.com) — Redirect URIs

### 4. Test rapid după schimbare

- [ ] Deconectează + reconectează fiecare platformă din pagina Accounts pe noul domeniu
- [ ] Publică un post de test („postează acum") pe fiecare
- [ ] Verifică cron-ul: cron-job.org rămâne pe URL-ul vechi `posty-ashen.vercel.app` sau schimbă-l pe noul domeniu (ambele merg, dar consecvent e mai bine)

## Ordinea recomandată pentru review-uri

1. **YouTube (Google)** — cel mai lung la coadă (verificare OAuth ~2–6 săptămâni), trimite primul
2. **Meta (Instagram + Facebook + Threads)** — 1–3 săptămâni, poate cere Business Verification
3. **TikTok** — audit 1–4 săptămâni; până atunci postările prin API rămân private
4. **Pinterest** — trial → standard access, de obicei zile
5. **LinkedIn** — „Share on LinkedIn" e self-serve, aproape instant

## Materiale comune de pregătit o singură dată

- [ ] **Screencast-uri** — câte unul per platformă (script în fiecare dosar). Reguli: fără date personale ale altora, arată login-ul în Posty, conectarea contului (ecranul OAuth cu permisiunile vizibile), publicarea, și postarea apărută pe platformă. 1080p, 1–3 minute, fără muzică.
- [ ] **Descriere aplicație (EN)** — folosită peste tot:

> Posty is an AI-powered social media scheduling tool. Users connect their own social accounts via OAuth, then create, schedule, and publish posts (text, images, videos) through a chat interface. Posty only publishes content that the user explicitly creates and approves. It does not read other users' data, does not scrape, and does not post without a direct user action or a schedule the user set.

- [ ] **Cont de test** pentru recenzori (email + parolă) — creează un user Posty dedicat, notează credențialele; Meta și TikTok le cer în formular.

## Greșeli care duc garantat la respingere

1. Privacy policy inaccesibilă / 404 / doar în română
2. Redirect URI din portal diferit de cel din aplicație (chiar și `www.` vs fără)
3. Screencast în care nu se vede clar ecranul de consimțământ OAuth
4. Ceri permisiuni pe care nu le demonstrezi în screencast (cere DOAR ce folosești)
5. Cont de test care nu funcționează când încearcă recenzorul
6. App icon / display name lipsă sau generice în portal
