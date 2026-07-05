# Meta App Review — Instagram + Facebook

Portal: https://developers.facebook.com → aplicația ta (META_APP_ID)

## Permisiunile pe care le cere Posty (exact ce e în cod)

Din `lib/meta-oauth.ts`:

| Permisiune | La ce o folosește Posty | Trebuie App Review? |
|---|---|---|
| `instagram_basic` | citește ID-ul și username-ul contului IG business legat de pagină | Da |
| `instagram_content_publish` | publică poze/video/reels/stories pe Instagram | Da |
| `instagram_manage_insights` | statistici (views/likes/comments) în cardul Statistici | Da |
| `pages_show_list` | listează paginile FB ca userul să aleagă pagina | Da |
| `pages_read_engagement` | citește engagement pentru statistici | Da |
| `pages_manage_posts` | publică postări/video/stories pe pagina de Facebook | Da |

> Nu cere alte permisiuni. Fiecare permisiune cerută = un use case de demonstrat în screencast.

## Setări în portal (înainte de submit)

- [ ] **App Settings → Basic:**
  - App icon (1024×1024), Display name: `Posty`
  - Privacy Policy URL: `https://__DOMAIN__/en/privacy`
  - Terms of Service URL: `https://__DOMAIN__/en/terms`
  - User data deletion: `https://__DOMAIN__/en/privacy` (instrucțiuni) — sau callback
  - App domains: `__DOMAIN__`
  - Category: `Business and pages`
- [ ] **Facebook Login → Settings:**
  - Valid OAuth Redirect URIs:
    - `https://__DOMAIN__/api/auth/instagram/callback`
    - `https://__DOMAIN__/api/auth/facebook/callback`
- [ ] **Business Verification** — dacă o cere (probabil da pentru `pages_manage_posts`): îți trebuie firmă (SRL/PFA) cu acte. Fără firmă, aplicația rămâne utilizabilă doar pentru conturile cu rol în app (dev/tester) — cum e acum.

## Textele pentru formular (copy-paste, EN)

### App description

> Posty is an AI-assisted social media scheduler. Users connect their own Instagram Business/Creator account and Facebook Page via OAuth. Through a chat interface, they create captions, attach photos or videos, and either publish immediately or schedule posts for later. A background job publishes scheduled posts at the chosen time. Posty never posts without an explicit user instruction or a schedule the user created.

### Per-permission justification

**instagram_basic**
> We use instagram_basic to retrieve the connected Instagram Business account's ID and username, so the user can confirm which account is connected and so we can address the correct account when publishing.

**instagram_content_publish**
> Core feature: the user composes a post in Posty (caption + photo/video) and chooses "publish now" or a scheduled time. We use instagram_content_publish to create the media container and publish it to the user's own Instagram Business account. Content is always user-created and user-approved.

**instagram_manage_insights**
> Posty shows the user a statistics card (views, likes, comments) for their own published posts. We use instagram_manage_insights to read these metrics for the connected account only.

**pages_show_list**
> After Facebook login we list the user's own Pages so they can select which Page (and its linked Instagram account) to connect to Posty.

**pages_read_engagement**
> Used to read engagement metrics of the user's own Page posts for the statistics card in the dashboard.

**pages_manage_posts**
> Core feature: publishing user-created posts (text, photos, videos, stories, reels) to the user's own Facebook Page, either immediately or at a scheduled time set by the user.

## Screencast — script (un singur video acoperă tot)

1. Login în Posty (`https://__DOMAIN__`) cu contul de test
2. Accounts → Connect Facebook → **arată ecranul OAuth cu toate permisiunile** → alege pagina → succes
3. Accounts → Connect Instagram → la fel
4. În chat: scrie o comandă de publicare cu poză atașată → „postează acum pe instagram și facebook"
5. Arată răspunsul de succes în chat
6. Deschide Instagram și pagina de Facebook în browser → **arată postarea publicată**
7. Deschide dashboard-ul → arată cardul de statistici (justifică insights)
8. Programează o postare pentru mai târziu → arată-o în „Postări următoare" (justifică scheduling)

## Cont de test pentru recenzor

- User Posty dedicat (email+parolă în formular)
- Contul trebuie să aibă deja FB Page + IG Business conectate, ca recenzorul să poată doar posta
- Instrucțiuni pas-cu-pas în câmpul „Testing instructions" — scrie exact fluxul din screencast

## Capcane cunoscute

- IG-ul trebuie să fie **Business/Creator legat de o pagină FB** — menționează asta în instrucțiuni
- Recenzorii Meta încearcă efectiv fluxul; dacă ceva pică (ex. lipsă SUPABASE env pe producție), respinge automat
- După aprobare, comută aplicația din **Development** în **Live** mode — altfel tot doar testerii pot folosi
- `advanced access` vs `standard access`: cere Advanced pentru toate cele 6 permisiuni
