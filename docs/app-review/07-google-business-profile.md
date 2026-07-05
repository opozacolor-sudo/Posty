# Google Business Profile — API Access & OAuth

Portal: https://console.cloud.google.com (același proiect ca YouTube — `GOOGLE_CLIENT_ID`)

## Difer față de YouTube

| | YouTube | Google Business Profile |
|---|---|---|
| Scope | `youtube.upload`, `youtube.readonly` | `business.manage` |
| OAuth redirect | `/api/auth/youtube/callback` | `/api/auth/google-business/callback` |
| Ce publică | Video pe canal | **Local Post** (text + poză) pe locația business |
| Aprobare Google | OAuth verification (2–6 săpt.) | **GBP API contact form** (obligatoriu, separat) |
| Video | Da | **Nu** (doar poze în Local Posts) |

## Cerințe Google pentru API access (obligatorii)

1. **Profil Google Business verificat și activ 60+ zile** (al tău sau al unui client)
2. **Site web** al business-ului listat pe profil
3. **Email** de pe formular = owner/manager al GBP
4. Formular: [GBP API contact form](https://support.google.com/business/contact/api_default) → „Application for Basic API Access”
5. După aprobare: quota 300 QPM; înainte quota = 0 → toate apelurile eșuează

## Enable APIs în Cloud Console

După aprobare, activează în proiect:

- Google My Business API
- My Business Account Management API
- My Business Business Information API

## Setări OAuth (Posty)

- [ ] Același `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` ca YouTube
- [ ] Env: `GOOGLE_BUSINESS_REDIRECT_URI=https://__DOMAIN__/api/auth/google-business/callback`
- [ ] OAuth consent screen → adaugă scope `https://www.googleapis.com/auth/business.manage`
- [ ] Authorized redirect URI: `https://__DOMAIN__/api/auth/google-business/callback`

## Ce face Posty (din cod)

1. User conectează contul Google Business (OAuth `business.manage`)
2. Posty listează conturile și **prima locație** găsită (MVP — o locație per conectare)
3. User postează din chat: text + poză → Local Post `topicType: STANDARD`
4. Programarea funcționează prin același cron ca celelalte platforme

Comenzi chat:

- RO: `postează pe google business cu textul: ...` (+ poză 📎)
- EN: `post to google business: ...`

## Text cerere API access (EN)

> Posty is an AI-assisted social media scheduler. Users connect their own Google Business Profile via OAuth (scope business.manage). They create posts (photo + caption) in Posty's chat and publish them as Local Posts on their verified business location, immediately or at a scheduled time. Posty only publishes content explicitly created and approved by the user. We use the Account Management and Business Information APIs to list the user's locations, and the Local Posts API to create posts.

## Text OAuth verification — business.manage (EN)

> We use https://www.googleapis.com/auth/business.manage so users can connect their own Google Business Profile and publish Local Posts (photo + text) to their verified location at their direction. Posty lists the user's business accounts and locations during connect, then creates posts only when the user requests publish or schedules a post.

## Screencast

1. Login Posty → Accounts → Connect Google Business
2. Arată consimțământul OAuth cu scope `business.manage`
3. Chat: atașează poză + „postează pe google business: …"
4. Deschide profilul pe Google Maps / Search → arată Local Post-ul

## Limitări MVP

- **O singură locație** per conectare (prima din listă). Multi-location = feature viitor.
- **Doar poze**, nu video (limitare API Local Posts).
- Publicarea necesită **API access aprobat** — fără asta connect-ul merge dar publish dă 403.

## Env Vercel

```
GOOGLE_BUSINESS_REDIRECT_URI=https://__DOMAIN__/api/auth/google-business/callback
```

(Reutilizează `GOOGLE_CLIENT_ID` și `GOOGLE_CLIENT_SECRET` existente.)
