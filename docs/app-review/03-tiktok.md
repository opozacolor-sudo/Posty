# TikTok — Content Posting API Audit

Portal: https://developers.tiktok.com → aplicația ta (TIKTOK_CLIENT_KEY)

## Scopes folosite (din `lib/tiktok-oauth.ts`)

| Scope | Folosire | Necesită |
|---|---|---|
| `user.info.basic` | numele/avatarul contului conectat | aprobat implicit |
| `video.publish` | publică video prin Content Posting API (Direct Post) | **audit obligatoriu** |
| `user.info.stats` + `video.list` | statistici (views/likes/comments) | aprobare produs Display API |

## Cel mai important lucru de știut

**Până nu treci auditul de Direct Post, orice video publicat prin API rămâne PRIVAT (vizibil doar pentru cont).** Nu e un bug — e politica TikTok pentru aplicații neauditate. Deci:

1. Trimite cererea de audit cât mai devreme
2. În screencast e OK ca videoclipul să apară ca privat — menționează în text că aplicația e în așteptarea auditului

## Setări în portal

- [ ] App icon, nume `Posty`, descriere
- [ ] Category: Productivity / Business
- [ ] **Web/Desktop URL**: `https://__DOMAIN__`
- [ ] Redirect URI: `https://__DOMAIN__/api/auth/tiktok/callback`
- [ ] Privacy Policy: `https://__DOMAIN__/en/privacy`
- [ ] Terms of Service: `https://__DOMAIN__/en/terms`
- [ ] Produse: **Login Kit** + **Content Posting API** (cere Direct Post, nu doar Upload)
- [ ] **URL verification** — TikTok cere verificarea domeniului printr-un fișier sau DNS TXT; fă-o imediat după cumpărarea domeniului

## Texte formular (EN)

### App description

> Posty is a social media scheduling tool. Users connect their own TikTok account via Login Kit, then create video posts in Posty's chat interface and publish them to their own account using the Content Posting API — either immediately or at a scheduled time the user sets. Posty publishes only content explicitly created and approved by the user.

### video.publish justification

> Core feature: the user attaches a video and a caption in Posty and requests publishing to their own TikTok account. We call the Content Posting API (Direct Post) with the user's access token. Scheduling is handled on our side: a background job publishes the post at the user-chosen time. No content is generated or posted without direct user action.

### De ce Direct Post și nu Upload

> We request Direct Post because our users schedule posts to go live at a specific time without needing to open the TikTok app to confirm. The entire flow (create → schedule → publish) happens in Posty at the user's direction.

## Screencast — script

1. Login Posty → Accounts → Connect TikTok → **ecranul de consimțământ cu scopes vizibile**
2. Chat: atașează un video + „postează pe tiktok cu textul: …"
3. Arată succesul în chat
4. Deschide TikTok (profil) → arată videoclipul (ca privat dacă auditul nu a trecut încă — spune asta în instrucțiuni)
5. Programează un video pentru mai târziu → arată-l în „Postări următoare"

## Capcane cunoscute

- **Domeniul din Redirect URI trebuie verificat** în portal înainte să meargă OAuth pe noul domeniu
- Auditul respinge des la prima încercare pentru „insufficient demo" — screencast-ul trebuie să arate TOT fluxul, inclusiv consimțământul OAuth
- Rate limits pe Direct Post sunt mici la început (câteva postări/zi per user) — suficient pentru Posty
- Contul TikTok de test trebuie să fie public, nu privat, altfel Direct Post are restricții suplimentare
