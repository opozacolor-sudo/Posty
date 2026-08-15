import type { HowItWorksContent } from "./types";

export function getHowItWorksEn(): HowItWorksContent {
  return {
    title: "How Posty works",
    lastUpdated: "August 15, 2026",
    intro:
      "Posty is an AI social media scheduler. Connect your accounts, chat naturally, and Posty writes captions, publishes, or schedules posts for you.",
    sections: [
      {
        title: "1. Connect your accounts",
        paragraphs: [
          "Go to Accounts in the dashboard and tap Connect next to a platform. You authorize via OAuth — Posty never asks for your Instagram or TikTok password.",
          "You can connect multiple platforms. Posty only uses tokens when you ask it to publish or schedule.",
        ],
      },
      {
        title: "2. Chat with Posty",
        paragraphs: [
          "Open the dashboard and use the chat at the bottom. Type or use the microphone 🎤.",
          "Attach 📎 a photo or video before publishing. Posty can auto-generate captions — normal or Gen-Z style — without asking questions.",
        ],
        list: [
          "\"post on instagram\" — publish now with auto caption",
          "\"write a gen z caption and post on ig\" — short caption + publish",
          "\"schedule tomorrow at 6pm on youtube\" — save to calendar",
          "\"post story on facebook\" — Facebook Page story",
          "\"post reel on instagram\" — reel (requires video 📎)",
        ],
      },
      {
        title: "3. Publish now or schedule",
        paragraphs: [
          "Publishing is immediate: Posty sends content to the chosen platform and shows per-platform results.",
          "Scheduling saves to your calendar (Upcoming posts). At the set time, an automatic job publishes — you don't need to be online.",
        ],
      },
      {
        title: "4. What you can post on each platform",
        paragraphs: [
          "Below: supported content types, required media, and example chat commands.",
          "Legend: Live = works now · App Review = connect OK, public publishing may need platform approval · Coming soon = not available yet.",
        ],
        platforms: [
          {
            name: "Instagram",
            status: "live",
            summary: "Feed, Story, and Reel from chat.",
            formats: [
              {
                name: "Feed post",
                media: "Photo or video",
                status: "live",
                howTo: "📎 photo + \"post on instagram\"",
              },
              {
                name: "Story",
                media: "Photo or video",
                status: "live",
                howTo: "📎 media + \"post story on instagram\"",
              },
              {
                name: "Reel",
                media: "Video (mp4/mov)",
                status: "live",
                howTo: "📎 video + \"post reel on instagram\"",
              },
            ],
          },
          {
            name: "Facebook",
            status: "live",
            summary: "Page post, Story, and Reel.",
            formats: [
              {
                name: "Feed post",
                media: "Photo or video",
                status: "live",
                howTo: "📎 media + \"post on facebook\"",
              },
              {
                name: "Story",
                media: "Photo or video",
                status: "live",
                howTo: "\"post story on facebook\"",
              },
              {
                name: "Reel",
                media: "Video",
                status: "live",
                howTo: "📎 video + \"post reel on facebook\"",
              },
            ],
          },
          {
            name: "Threads",
            status: "live",
            summary: "Text, photo, or video post.",
            formats: [
              {
                name: "Post",
                media: "Text, photo, or video",
                status: "live",
                howTo: "\"post on threads\" (+ 📎 optional)",
              },
            ],
          },
          {
            name: "LinkedIn",
            status: "live",
            summary: "Profile post.",
            formats: [
              {
                name: "Post",
                media: "Photo or video",
                status: "live",
                howTo: "📎 media + \"post on linkedin\"",
              },
            ],
          },
          {
            name: "YouTube",
            status: "live",
            summary: "Video upload to channel.",
            formats: [
              {
                name: "Video",
                media: "Video (mp4/mov)",
                status: "live",
                howTo: "📎 video + \"post on youtube\" (processing ~1 min)",
              },
            ],
          },
          {
            name: "TikTok",
            status: "live",
            summary: "Video or photo (Photo Mode as short video).",
            formats: [
              {
                name: "Video",
                media: "Video",
                status: "live",
                howTo: "📎 video + \"post on tiktok\"",
              },
              {
                name: "Photo / Photo Mode",
                media: "Photo",
                status: "live",
                howTo: "📎 photo + \"post on tiktok\"",
              },
              {
                name: "Story",
                media: "—",
                status: "none",
                howTo: "Not supported via TikTok API",
              },
            ],
          },
          {
            name: "Pinterest",
            status: "review",
            summary: "Image pin.",
            formats: [
              {
                name: "Pin",
                media: "Photo",
                status: "review",
                howTo: "📎 photo + \"post on pinterest\" (may need API approval)",
              },
            ],
          },
          {
            name: "Google Business",
            status: "live",
            summary: "Local post on Business Profile.",
            formats: [
              {
                name: "Local post",
                media: "Photo",
                status: "live",
                howTo: "📎 photo + \"post on google business\"",
              },
            ],
          },
          {
            name: "X (Twitter)",
            status: "soon",
            summary: "In development.",
            formats: [
              {
                name: "Post",
                media: "—",
                status: "soon",
                howTo: "Not available yet",
              },
            ],
          },
          {
            name: "Bluesky",
            status: "soon",
            summary: "Planned.",
            formats: [
              {
                name: "Post",
                media: "—",
                status: "soon",
                howTo: "Not available yet",
              },
            ],
          },
        ],
      },
      {
        title: "5. AI features",
        list: [
          "Auto caption from photos — short, on-brand, normal or Gen-Z",
          "Image generation (when Higgsfield is enabled on server)",
          "Voice input — speak, Posty transcribes and acts",
          "Brand profile — tone, niche, favorite hashtags in Profile settings",
        ],
      },
      {
        title: "6. Important limits",
        list: [
          "Instagram feed needs a photo; YouTube and Reels need video",
          "Publish everywhere: \"post to all platforms\"",
          "Some platforms (e.g. public Facebook, Pinterest) may require App Review before broad public use",
          "Posty does not guarantee reach or content approval by networks",
        ],
      },
    ],
  };
}
