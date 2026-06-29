import type { LegalDocumentContent } from "./types";
import { getLegalContactEmail, getLegalSiteUrl } from "./contact";

export function getPrivacyPolicyEn(): LegalDocumentContent {
  const siteUrl = getLegalSiteUrl();
  const contactEmail = getLegalContactEmail();

  return {
    title: "Privacy Policy",
    lastUpdated: "June 28, 2026",
    intro:
      "This Privacy Policy explains how Posty (“we”, “us”, “our”) collects, uses, and protects information when you use our AI-powered social media scheduling service at " +
      siteUrl +
      " (the “Service”).",
    sections: [
      {
        title: "1. Who we are",
        paragraphs: [
          "Posty is a web application that helps you create, schedule, and publish social media content through chat. For privacy questions or requests, contact us at " +
            contactEmail +
            ".",
        ],
      },
      {
        title: "2. Information we collect",
        paragraphs: ["We collect the following categories of information:"],
        list: [
          "Account data: email address, password (stored hashed by our auth provider), display name, and profile settings you provide.",
          "Brand profile: optional preferences such as niche, tone, audience, and hashtags stored in your account settings.",
          "Connected accounts: platform name, account username or page name, OAuth access tokens, refresh tokens, and related metadata needed to publish on your behalf.",
          "Content you provide: chat messages, captions, scheduled posts, and media files (photos/videos) you upload.",
          "Usage data: basic technical logs (IP address, browser type, timestamps, error logs) generated when you use the Service.",
        ],
      },
      {
        title: "3. How we use information",
        paragraphs: ["We use your information to:"],
        list: [
          "Create and maintain your account.",
          "Connect your social media accounts and publish or schedule posts at your direction.",
          "Generate AI-assisted replies, captions, and scheduling suggestions in chat.",
          "Store scheduled posts and run background jobs at the times you choose.",
          "Improve reliability, security, and support for the Service.",
          "Comply with legal obligations and respond to lawful requests.",
        ],
      },
      {
        title: "4. AI processing",
        paragraphs: [
          "When you use chat, your messages and relevant context (including connected account names, brand profile, and media references) may be sent to third-party AI providers to generate responses. Do not submit sensitive personal data you do not want processed for this purpose.",
        ],
      },
      {
        title: "5. Third-party services",
        paragraphs: [
          "We rely on service providers that process data on our behalf, including hosting, authentication, database, storage, and AI inference. Social networks (such as Meta/Instagram, Google/YouTube, TikTok, LinkedIn, Pinterest, and others) receive content and tokens only when you connect an account and request publishing.",
          "Each third party has its own privacy policy. Your use of connected platforms remains subject to their terms.",
        ],
      },
      {
        title: "6. Storage and security",
        paragraphs: [
          "Account and scheduling data are stored in Supabase. Media you upload is stored in secure cloud storage associated with your account. OAuth tokens are stored server-side and are not exposed to other users.",
          "We apply reasonable technical and organizational measures, but no online service can guarantee absolute security.",
        ],
      },
      {
        title: "7. Retention",
        paragraphs: [
          "We retain your data while your account is active and as needed to provide the Service. If you delete your account, we delete or anonymize associated personal data within a reasonable period, except where retention is required by law or legitimate business needs (such as security logs).",
        ],
      },
      {
        title: "8. Your rights",
        paragraphs: [
          "Depending on your location (including the European Economic Area and Romania), you may have the right to access, correct, delete, restrict, or port your personal data, and to object to certain processing. You may also lodge a complaint with your local data protection authority.",
          "To exercise these rights, email " +
            contactEmail +
            " from the address linked to your Posty account.",
        ],
      },
      {
        title: "9. Children",
        paragraphs: [
          "The Service is not directed to children under 16. We do not knowingly collect personal data from children.",
        ],
      },
      {
        title: "10. International transfers",
        paragraphs: [
          "Your data may be processed in countries other than your own where our providers operate. We take steps to ensure appropriate safeguards where required by law.",
        ],
      },
      {
        title: "11. Changes",
        paragraphs: [
          "We may update this Privacy Policy from time to time. We will post the revised version on this page and update the “Last updated” date. Continued use of the Service after changes means you accept the updated policy.",
        ],
      },
      {
        title: "12. Contact",
        paragraphs: ["Questions about this Privacy Policy: " + contactEmail + "."],
      },
    ],
  };
}
