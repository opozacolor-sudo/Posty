# Pinterest — Trial → Standard Access

Portal: https://developers.pinterest.com → aplicația ta (PINTEREST_APP_ID)

## Scopes folosite (din `lib/pinterest-env.ts`)

| Scope | Folosire |
|---|---|
| `boards:read` | listează board-urile ca să aleagă unde salvează pin-ul |
| `boards:write` | creează board dacă userul nu are |
| `pins:read` | citește pin-urile pentru statistici |
| `pins:write` | creează pin-uri (publicarea propriu-zisă) |
| `user_accounts:read` | numele/avatarul contului conectat |

## Cum funcționează accesul

1. **Trial access** — imediat după crearea aplicației. Limitat (rate limits mici, doar conturi de test), dar suficient pentru development
2. **Standard access** — cerere din portal cu descrierea aplicației + demo. De obicei se aprobă în **câteva zile**, mult mai blând decât Meta/TikTok

## Setări în portal

- [ ] Redirect URI: `https://__DOMAIN__/api/auth/pinterest/callback`
- [ ] App name `Posty`, logo, descriere
- [ ] Privacy Policy: `https://__DOMAIN__/en/privacy`
- [ ] Contul de developer trebuie să fie **Pinterest Business** (gratuit, conversie din setări)

## Text cerere Standard Access (EN)

> Posty is an AI-assisted social media scheduler. Users connect their own Pinterest Business account via OAuth and publish Pins (image + title + description + destination link) to their own boards, immediately or at a scheduled time. We use boards:read/write to let the user pick or create a destination board, pins:write to create the Pin at the user's request, and pins:read plus user_accounts:read to show the user their own account name and basic Pin statistics. Posty never creates content without an explicit user instruction.

## Note

- Pinterest acceptă doar **imagini** ca media principal în fluxul actual Posty (video pins au cerințe separate) — nu promite video în cerere
- La demo, un screencast scurt (conectare + creare pin + pin-ul apărut pe board) e suficient
