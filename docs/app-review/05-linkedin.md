# LinkedIn — Products & Access

Portal: https://developer.linkedin.com → aplicația ta (LINKEDIN_CLIENT_ID)

## Scopes folosite (din `lib/linkedin-env.ts`)

| Scope | Folosire | Produs necesar |
|---|---|---|
| `openid`, `profile`, `email` | identificarea contului conectat | **Sign In with LinkedIn using OpenID Connect** |
| `w_member_social` | publică postări (text/imagine/video) pe profilul userului | **Share on LinkedIn** |

## Vestea bună

Ambele produse sunt **self-serve**: le adaugi din tab-ul „Products" al aplicației și se aprobă automat (instant sau în câteva minute). **Nu există App Review clasic** pentru fluxul Posty.

## Setări în portal

- [ ] **Products**: adaugă `Sign In with LinkedIn using OpenID Connect` + `Share on LinkedIn`
- [ ] **Auth → Authorized redirect URLs**: `https://__DOMAIN__/api/auth/linkedin/callback`
- [ ] **Settings**: Privacy policy URL `https://__DOMAIN__/en/privacy`, App logo
- [ ] Aplicația trebuie asociată cu o **LinkedIn Page** (poți crea o pagină de companie „Posty" gratuit — durează 2 minute și e obligatoriu)

## Limitări de știut

- `w_member_social` postează **doar pe profilul membrului**, nu pe pagini de companie. Pentru pagini îți trebuie Community Management API (program de parteneri, greu de obținut) — nu e cazul acum
- Token-urile expiră la ~60 de zile și **nu există refresh token** pe self-serve → userul trebuie să reconecteze LinkedIn periodic. E normal, nu e bug
- Rate limit: suficient pentru scheduling personal

## Nu e nevoie de screencast sau justificări — doar configurare corectă.
