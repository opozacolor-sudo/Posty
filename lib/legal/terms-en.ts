import type { LegalDocumentContent } from "./types";
import { getLegalContactEmail, getLegalSiteUrl } from "./contact";

export function getTermsOfServiceEn(): LegalDocumentContent {
  const siteUrl = getLegalSiteUrl();
  const contactEmail = getLegalContactEmail();

  return {
    title: "Terms of Service",
    lastUpdated: "June 28, 2026",
    intro:
      "These Terms of Service (“Terms”) govern your access to and use of Posty at " +
      siteUrl +
      ". By creating an account or using the Service, you agree to these Terms.",
    sections: [
      {
        title: "1. The Service",
        paragraphs: [
          "Posty lets you connect your social media accounts, create content with AI assistance, schedule posts, and publish to supported platforms from chat. Features may change, and some platforms require separate approval from the network provider before public publishing is available to all users.",
        ],
      },
      {
        title: "2. Eligibility and account",
        paragraphs: [
          "You must be at least 16 years old and able to form a binding contract. You are responsible for keeping your login credentials secure and for all activity under your account. Provide accurate account information and notify us promptly of unauthorized access.",
        ],
      },
      {
        title: "3. Connected platforms",
        paragraphs: [
          "When you connect a third-party account, you authorize Posty to access and use that account as needed to provide scheduling and publishing you request. You remain responsible for complying with each platform’s terms, policies, and API rules. We are not affiliated with Meta, Google, TikTok, LinkedIn, Pinterest, or other networks unless explicitly stated.",
        ],
      },
      {
        title: "4. Your content",
        paragraphs: [
          "You retain ownership of content you upload or create. You grant Posty a limited license to host, process, transmit, and display your content solely to operate the Service (including storing media, sending captions to APIs, and showing previews in your dashboard).",
          "You represent that you have the rights to post your content and that it does not violate law or third-party rights.",
        ],
      },
      {
        title: "5. Acceptable use",
        paragraphs: ["You agree not to:"],
        list: [
          "Use the Service for spam, fraud, harassment, or illegal activity.",
          "Attempt to bypass platform limits, scrape data you are not authorized to access, or interfere with the Service.",
          "Upload malware or content that infringes copyright, trademark, or privacy rights.",
          "Share account access or resell the Service without permission.",
        ],
      },
      {
        title: "6. AI-generated output",
        paragraphs: [
          "AI suggestions may be inaccurate or incomplete. You are responsible for reviewing captions, hashtags, and scheduled times before publishing. Posty does not guarantee reach, engagement, or approval by any social network.",
        ],
      },
      {
        title: "7. Fees",
        paragraphs: [
          "Posty may offer free and paid plans in the future. If paid features are introduced, pricing and billing terms will be presented before you are charged.",
        ],
      },
      {
        title: "8. Disclaimer",
        paragraphs: [
          "THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT UNINTERRUPTED OR ERROR-FREE OPERATION.",
        ],
      },
      {
        title: "9. Limitation of liability",
        paragraphs: [
          "TO THE MAXIMUM EXTENT PERMITTED BY LAW, POSTY AND ITS OPERATORS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, DATA, OR GOODWILL. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS LIMITED TO THE GREATER OF (A) AMOUNTS YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM OR (B) EUR 100.",
          "Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the fullest extent permitted by law.",
        ],
      },
      {
        title: "10. Termination",
        paragraphs: [
          "You may stop using the Service at any time and delete your account from profile settings. We may suspend or terminate access if you violate these Terms, if required by law, or if we discontinue the Service. Provisions that by nature should survive termination will survive.",
        ],
      },
      {
        title: "11. Changes",
        paragraphs: [
          "We may modify these Terms. We will post the updated version on this page and update the “Last updated” date. Material changes may also be communicated in the app. Continued use after changes constitutes acceptance.",
        ],
      },
      {
        title: "12. Governing law",
        paragraphs: [
          "These Terms are governed by the laws of Romania, without regard to conflict-of-law rules. Courts in Romania shall have exclusive jurisdiction, unless mandatory consumer protection laws in your country require otherwise.",
        ],
      },
      {
        title: "13. Contact",
        paragraphs: ["Questions about these Terms: " + contactEmail + "."],
      },
    ],
  };
}
