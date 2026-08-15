import type { HowItWorksContent } from "./types";

export function getHowItWorksRo(): HowItWorksContent {
  return {
    title: "Cum funcționează Posty",
    lastUpdated: "15 august 2026",
    intro:
      "Posty este un planificator social media cu AI. Conectezi conturile, vorbești în chat ca și cum ai scrie unui prieten, iar Posty scrie caption-ul, publică sau programează postarea pentru tine.",
    sections: [
      {
        title: "1. Conectează conturile",
        paragraphs: [
          "Mergi la Conturi din dashboard și apasă Conectează lângă platforma dorită. Autorizezi prin OAuth — Posty nu îți cere parola de la Instagram, TikTok etc.",
          "Poți conecta mai multe platforme. Fiecare cont rămâne al tău; Posty folosește token-ul doar când îi ceri să publice sau să programeze.",
        ],
      },
      {
        title: "2. Vorbește în chat",
        paragraphs: [
          "Deschide dashboard-ul și folosește chat-ul de jos. Poți scrie sau folosi microfonul 🎤.",
          "Atașează 📎 o poză sau un video înainte de publicare. Posty poate genera caption automat — normal sau stil Gen-Z — fără să te întrebe nimic.",
        ],
        list: [
          "„postează pe instagram” — publică acum cu caption generat",
          "„fa o descriere gen z si postează pe ig” — caption scurt + publicare",
          "„programează mâine la 18 pe youtube” — salvează în calendar",
          "„postează story pe facebook” — story pe Pagina Facebook",
          "„postează reel pe instagram” — reel (necesită video 📎)",
        ],
      },
      {
        title: "3. Publică acum sau programează",
        paragraphs: [
          "Publicarea este imediată: Posty trimite conținutul pe platforma aleasă și îți arată rezultatul pe fiecare rețea.",
          "Programarea salvează postarea în calendar (Postări următoare). La ora setată, un job automat publică conținutul — nu trebuie să fii online.",
        ],
      },
      {
        title: "4. Ce poți face pe fiecare platformă",
        paragraphs: [
          "Mai jos găsești tipurile de conținut suportate, ce media trebuie atașată și cum le ceri în chat.",
          "Legenda: Live = funcționează acum · App Review = conectare OK, publicare publică poate necesita aprobare platformă · În curând = nu e disponibil încă.",
        ],
        platforms: [
          {
            name: "Instagram",
            status: "live",
            summary: "Feed, Story și Reel din chat.",
            formats: [
              {
                name: "Post (Feed)",
                media: "Poză sau video",
                status: "live",
                howTo: "📎 poză + „postează pe instagram”",
              },
              {
                name: "Story",
                media: "Poză sau video",
                status: "live",
                howTo: "📎 media + „postează story pe instagram”",
              },
              {
                name: "Reel",
                media: "Video (mp4/mov)",
                status: "live",
                howTo: "📎 video + „postează reel pe instagram”",
              },
            ],
          },
          {
            name: "Facebook",
            status: "live",
            summary: "Post pe Pagină, Story și Reel.",
            formats: [
              {
                name: "Post (Feed)",
                media: "Poză sau video",
                status: "live",
                howTo: "📎 media + „postează pe facebook”",
              },
              {
                name: "Story",
                media: "Poză sau video",
                status: "live",
                howTo: "„postează story pe facebook”",
              },
              {
                name: "Reel",
                media: "Video",
                status: "live",
                howTo: "📎 video + „postează reel pe facebook”",
              },
            ],
          },
          {
            name: "Threads",
            status: "live",
            summary: "Post text, poză sau video.",
            formats: [
              {
                name: "Post",
                media: "Text, poză sau video",
                status: "live",
                howTo: "„postează pe threads” (+ 📎 opțional)",
              },
            ],
          },
          {
            name: "LinkedIn",
            status: "live",
            summary: "Post pe profilul personal.",
            formats: [
              {
                name: "Post",
                media: "Poză sau video",
                status: "live",
                howTo: "📎 media + „postează pe linkedin”",
              },
            ],
          },
          {
            name: "YouTube",
            status: "live",
            summary: "Upload video pe canal.",
            formats: [
              {
                name: "Video",
                media: "Video (mp4/mov)",
                status: "live",
                howTo: "📎 video + „postează pe youtube” (procesarea poate dura ~1 min)",
              },
            ],
          },
          {
            name: "TikTok",
            status: "live",
            summary: "Video sau poză (Photo Mode ca video scurt).",
            formats: [
              {
                name: "Video",
                media: "Video",
                status: "live",
                howTo: "📎 video + „postează pe tiktok”",
              },
              {
                name: "Photo / Photo Mode",
                media: "Poză",
                status: "live",
                howTo: "📎 poză + „postează pe tiktok”",
              },
              {
                name: "Story",
                media: "—",
                status: "none",
                howTo: "Nu e suportat prin API TikTok",
              },
            ],
          },
          {
            name: "Pinterest",
            status: "review",
            summary: "Pin cu imagine.",
            formats: [
              {
                name: "Pin",
                media: "Poză",
                status: "review",
                howTo: "📎 poză + „postează pe pinterest” (poate necesita aprobare API)",
              },
            ],
          },
          {
            name: "Google Business",
            status: "live",
            summary: "Post local pe profilul Google Business.",
            formats: [
              {
                name: "Post local",
                media: "Poză",
                status: "live",
                howTo: "📎 poză + „postează pe google business”",
              },
            ],
          },
          {
            name: "X (Twitter)",
            status: "soon",
            summary: "În dezvoltare.",
            formats: [
              {
                name: "Post",
                media: "—",
                status: "soon",
                howTo: "Indisponibil momentan",
              },
            ],
          },
          {
            name: "Bluesky",
            status: "soon",
            summary: "Planificat.",
            formats: [
              {
                name: "Post",
                media: "—",
                status: "soon",
                howTo: "Indisponibil momentan",
              },
            ],
          },
        ],
      },
      {
        title: "5. AI în Posty",
        list: [
          "Caption automat din poză — scurt, on-brand, normal sau Gen-Z",
          "Generare imagini (dacă e activat Higgsfield pe server)",
          "Voce în chat — vorbești, Posty transcrie și acționează",
          "Profil de brand — ton, nișă, hashtag-uri favorite din Profil",
        ],
      },
      {
        title: "6. Limitări importante",
        list: [
          "Instagram necesită poză pentru post feed; YouTube și Reel necesită video",
          "Publicarea pe toate platformele dintr-o dată: „postează pe toate”",
          "Unele platforme (ex. Facebook public, Pinterest) pot necesita App Review Meta/Pinterest înainte de lansare la public larg",
          "Posty nu garantează reach sau aprobarea conținutului de către rețele",
        ],
      },
    ],
  };
}
