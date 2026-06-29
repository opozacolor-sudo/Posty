import type { LegalDocumentContent } from "./types";
import { getLegalContactEmail, getLegalSiteUrl } from "./contact";

export function getTermsOfServiceRo(): LegalDocumentContent {
  const siteUrl = getLegalSiteUrl();
  const contactEmail = getLegalContactEmail();

  return {
    title: "Termeni și condiții",
    lastUpdated: "28 iunie 2026",
    intro:
      "Acești Termeni și condiții („Termeni”) reglementează accesul și utilizarea Posty la " +
      siteUrl +
      ". Prin crearea unui cont sau folosirea Serviciului, accepți acești Termeni.",
    sections: [
      {
        title: "1. Serviciul",
        paragraphs: [
          "Posty îți permite să conectezi conturi sociale, să creezi conținut cu asistență AI, să programezi postări și să publici pe platformele suportate din chat. Funcțiile pot evolua, iar unele platforme necesită aprobare separată de la rețea înainte ca publicarea publică să fie disponibilă tuturor utilizatorilor.",
        ],
      },
      {
        title: "2. Eligibilitate și cont",
        paragraphs: [
          "Trebuie să ai cel puțin 16 ani și capacitatea de a încheia un contract. Ești responsabil pentru securitatea credențialelor și pentru activitatea din cont. Furnizează informații corecte și anunță-ne prompt dacă observi acces neautorizat.",
        ],
      },
      {
        title: "3. Platforme conectate",
        paragraphs: [
          "Când conectezi un cont terț, autorizezi Posty să acceseze și să folosească acel cont pentru programare și publicare la cererea ta. Rămâi responsabil să respecți termenii fiecărei platforme. Nu suntem afiliați Meta, Google, TikTok, LinkedIn, Pinterest sau altor rețele, decât dacă se precizează explicit.",
        ],
      },
      {
        title: "4. Conținutul tău",
        paragraphs: [
          "Păstrezi proprietatea asupra conținutului pe care îl încarci sau creezi. Acordi Posty o licență limitată de a găzdui, procesa, transmite și afișa conținutul doar pentru operarea Serviciului.",
          "Declari că ai drepturile necesare asupra conținutului și că acesta nu încalcă legea sau drepturile terților.",
        ],
      },
      {
        title: "5. Utilizare acceptabilă",
        paragraphs: ["Te obligi să nu:"],
        list: [
          "Folosești Serviciul pentru spam, fraudă, hărțuire sau activități ilegale.",
          "Ocolești limitele platformelor, extragi date neautorizat sau perturbi Serviciul.",
          "Încarci malware sau conținut care încalcă drepturi de autor, marcă sau confidențialitate.",
          "Partajezi accesul la cont sau revânzi Serviciul fără permisiune.",
        ],
      },
      {
        title: "6. Output generat de AI",
        paragraphs: [
          "Sugestiile AI pot fi inexacte. Ești responsabil să verifici caption-urile, hashtag-urile și orele programate înainte de publicare. Posty nu garantează reach, engagement sau aprobarea de către rețelele sociale.",
        ],
      },
      {
        title: "7. Tarife",
        paragraphs: [
          "Posty poate oferi planuri gratuite și plătite în viitor. Dacă apar funcții plătite, prețurile și condițiile de facturare vor fi prezentate înainte de taxare.",
        ],
      },
      {
        title: "8. Excluderea garanțiilor",
        paragraphs: [
          "SERVICIUL ESTE FURNIZAT „CA ATARE” ȘI „DISPONIBIL”, FĂRĂ GARANȚII DE NICIUN FEL, EXPRES SAU IMPLICIT, INCLUSIV COMERCIABILITATE, ADECVARE LA UN SCOP ANUME SAU NEÎNCĂLCARE. NU GARANTĂM FUNCȚIONARE NEÎNTRERUPTĂ SAU FĂRĂ ERORI.",
        ],
      },
      {
        title: "9. Limitarea răspunderii",
        paragraphs: [
          "ÎN MĂSURA MAXIMĂ PERMISĂ DE LEGE, POSTY ȘI OPERATORII SĂI NU SUNT RĂSPUNZĂTORI PENTRU DAUNE INDIRECTE, INCIDENTALE, SPECIALE, CONSECINȚIALE SAU PUNITIVE, SAU PENTRU PIERDERI DE PROFIT, DATE SAU REPUTAȚIE. RĂSPUNDEREA TOTALĂ PENTRU ORICE CERERE LEGATĂ DE SERVICIU ESTE LIMITATĂ LA MAXIMUL DINTRE (A) SUMELE PLĂTITE NOUĂ ÎN ULTIMELE 12 LUNI SAU (B) 100 EUR.",
          "Unele jurisdicții nu permit anumite limitări; în acele cazuri, răspunderea este limitată în măsura permisă de lege.",
        ],
      },
      {
        title: "10. Încetare",
        paragraphs: [
          "Poți înceta utilizarea oricând și șterge contul din setările de profil. Putem suspenda sau închide accesul dacă încalcă Termenii, dacă legea o impune sau dacă întrerupem Serviciul. Clauzele care prin natură trebuie să supraviețuiască vor rămâne în vigoare.",
        ],
      },
      {
        title: "11. Modificări",
        paragraphs: [
          "Putem modifica Termenii. Publicăm versiunea actualizată pe această pagină. Utilizarea continuă după modificări constituie acceptare.",
        ],
      },
      {
        title: "12. Lege aplicabilă",
        paragraphs: [
          "Termenii sunt guvernați de legile României. Instanțele din România au jurisdicție exclusivă, exceptând cazurile în care legile obligatorii de protecție a consumatorului din țara ta impun altfel.",
        ],
      },
      {
        title: "13. Contact",
        paragraphs: ["Întrebări despre Termeni: " + contactEmail + "."],
      },
    ],
  };
}
