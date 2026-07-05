# Google / YouTube — OAuth Verification

Portal: https://console.cloud.google.com → proiectul tău (GOOGLE_CLIENT_ID)

## Scopes folosite (din `lib/google-oauth.ts`)

| Scope | Folosire | Clasificare Google |
|---|---|---|
| `youtube.upload` | încarcă video pe canalul userului | **Sensitive** |
| `youtube.readonly` | citește statistici canal/video | **Sensitive** |

Ambele sunt „sensitive" (nu „restricted") — verificarea e mai simplă: **nu** e nevoie de security assessment CASA, doar de review-ul standard de brand + demo.

## De ce să trimiți primul această verificare

- Coada Google e cea mai lungă (2–6 săptămâni)
- Până la aprobare, aplicația în modul **Testing** merge doar cu userii adăugați manual ca „Test users" (max 100) și refresh token-urile expiră la 7 zile → exact problema de reconectare pe care ai avut-o
- După publicare (Production + verified), token-urile nu mai expiră la 7 zile

## Setări în Google Cloud Console

- [ ] **OAuth consent screen:**
  - App name: `Posty`, logo 120×120
  - User type: External
  - App domain: `https://__DOMAIN__`
  - Privacy Policy: `https://__DOMAIN__/en/privacy`
  - Terms: `https://__DOMAIN__/en/terms`
  - **Authorized domains**: `__DOMAIN__`
- [ ] **Credentials → OAuth Client:**
  - Authorized redirect URIs: `https://__DOMAIN__/api/auth/youtube/callback`
- [ ] **Domain verification** în Search Console (cerut pentru authorized domains) — fă-o din prima zi
- [ ] Publishing status: **In production** → butonul „Prepare for verification"

## Texte formular (EN)

### How will the scopes be used?

> Posty is a social media scheduling tool. Users connect their own YouTube channel via Google OAuth.
>
> youtube.upload: the user creates a video post in Posty (video file + title/description) and publishes it to their own channel, immediately or at a scheduled time they choose. A background job performs the upload at the scheduled time using the user's stored OAuth token.
>
> youtube.readonly: Posty shows the user basic statistics (views, likes, comments) of their own channel's videos in a dashboard card.
>
> Posty does not access other users' data, does not download or re-upload third-party content, and never uploads without an explicit user instruction or a schedule the user created.

### Demo video

Google cere un video pe YouTube (poate fi unlisted) care arată:
1. Ecranul de consimțământ OAuth **cu URL-ul vizibil în browser** și scopes afișate
2. Fluxul complet în aplicație: conectare → creare post → upload
3. Videoclipul apărut pe canalul YouTube

## Capcane cunoscute

- **Quota**: implicit 10.000 unități/zi; un upload = ~1.600 unități → ~6 upload-uri/zi. Pentru mai mult, cerere separată de quota increase (formular, 1–2 săptămâni). Pentru început e suficient
- Numele aplicației din consent screen trebuie să se potrivească cu site-ul — nu-l lăsa pe cel autogenerat
- Homepage-ul (`https://__DOMAIN__`) trebuie să explice clar ce face aplicația și să aibă link vizibil către privacy policy — verifică landing page-ul înainte de submit
- Dacă folosești și alte scopes Google în viitor (ex. Drive), verificarea se reia
