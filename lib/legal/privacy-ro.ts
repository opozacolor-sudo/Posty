import type { LegalDocumentContent } from "./types";
import { getLegalContactEmail, getLegalSiteUrl } from "./contact";

export function getPrivacyPolicyRo(): LegalDocumentContent {
  const siteUrl = getLegalSiteUrl();
  const contactEmail = getLegalContactEmail();

  return {
    title: "Politica de confidențialitate",
    lastUpdated: "28 iunie 2026",
    intro:
      "Această Politică de confidențialitate explică modul în care Posty („noi”) colectează, utilizează și protejează informațiile când folosești serviciul nostru de programare social media cu AI, disponibil la " +
      siteUrl +
      " („Serviciul”).",
    sections: [
      {
        title: "1. Cine suntem",
        paragraphs: [
          "Posty este o aplicație web care te ajută să creezi, programezi și publici conținut pe rețele sociale prin chat. Pentru întrebări sau solicitări privind datele personale: " +
            contactEmail +
            ".",
        ],
      },
      {
        title: "2. Ce informații colectăm",
        paragraphs: ["Colectăm următoarele categorii de informații:"],
        list: [
          "Date de cont: adresă de email, parolă (stocată criptat de furnizorul de autentificare), nume afișat și setări de profil.",
          "Profil de brand: preferințe opționale (nișă, ton, audiență, hashtag-uri) din setările contului.",
          "Conturi conectate: platformă, nume de cont/pagină, token-uri OAuth (access/refresh) și metadate necesare publicării în numele tău.",
          "Conținut furnizat de tine: mesaje chat, caption-uri, postări programate și fișiere media (poze/video) încărcate.",
          "Date tehnice: jurnale de utilizare (IP, browser, timestamps, erori) generate la folosirea Serviciului.",
        ],
      },
      {
        title: "3. Cum folosim informațiile",
        paragraphs: ["Folosim datele pentru:"],
        list: [
          "Crearea și administrarea contului tău.",
          "Conectarea conturilor sociale și publicarea/programarea postărilor la cererea ta.",
          "Generarea de răspunsuri, caption-uri și sugestii de programare în chat cu AI.",
          "Stocarea postărilor programate și rularea joburilor la orele alese de tine.",
          "Îmbunătățirea securității, fiabilității și suportului.",
          "Respectarea obligațiilor legale.",
        ],
      },
      {
        title: "4. Procesare AI",
        paragraphs: [
          "Când folosești chat-ul, mesajele și contextul relevant (conturi conectate, profil de brand, referințe media) pot fi trimise către furnizori AI terți. Nu trimite date personale sensibile pe care nu dorești să fie procesate în acest scop.",
        ],
      },
      {
        title: "5. Servicii terțe",
        paragraphs: [
          "Folosim furnizori pentru hosting, autentificare, bază de date, stocare și inferență AI. Rețelele sociale (Meta/Instagram, Google/YouTube, TikTok, LinkedIn, Pinterest etc.) primesc conținut și token-uri doar când conectezi un cont și soliciți publicarea.",
          "Fiecare terț are propria politică de confidențialitate. Utilizarea platformelor conectate rămâne supusă termenilor lor.",
        ],
      },
      {
        title: "6. Stocare și securitate",
        paragraphs: [
          "Datele de cont și programările sunt stocate în Supabase. Media încărcată este păstrată în stocare cloud asociată contului tău. Token-urile OAuth sunt stocate server-side și nu sunt expuse altor utilizatori.",
          "Aplicăm măsuri tehnice și organizatorice rezonabile, însă niciun serviciu online nu poate garanta securitate absolută.",
        ],
      },
      {
        title: "7. Păstrarea datelor",
        paragraphs: [
          "Păstrăm datele cât timp contul este activ și cât este necesar pentru Serviciu. La ștergerea contului, ștergem sau anonimizăm datele personale într-un termen rezonabil, exceptând cazurile impuse de lege (ex. jurnale de securitate).",
        ],
      },
      {
        title: "8. Drepturile tale",
        paragraphs: [
          "În funcție de locație (inclusiv SEE și România), poți avea dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție. Poți depune plângere la autoritatea locală de protecție a datelor.",
          "Pentru exercitarea drepturilor, scrie la " +
            contactEmail +
            " de pe emailul asociat contului Posty.",
        ],
      },
      {
        title: "9. Copii",
        paragraphs: [
          "Serviciul nu este destinat copiilor sub 16 ani. Nu colectăm în mod conștient date de la copii.",
        ],
      },
      {
        title: "10. Transferuri internaționale",
        paragraphs: [
          "Datele pot fi procesate în alte țări decât a ta, acolo unde operează furnizorii noștri. Luăm măsuri pentru garanții adecvate acolo unde legea o cere.",
        ],
      },
      {
        title: "11. Modificări",
        paragraphs: [
          "Putem actualiza această politică. Publicăm versiunea revizuită pe această pagină și actualizăm data „Ultima actualizare”. Continuarea utilizării după modificări înseamnă acceptarea politicii actualizate.",
        ],
      },
      {
        title: "12. Contact",
        paragraphs: [
          "Întrebări despre confidențialitate: " + contactEmail + ".",
        ],
      },
    ],
  };
}
