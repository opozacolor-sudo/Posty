export type HowItWorksStatus = "live" | "review" | "soon" | "none";

export type HowItWorksFormat = {
  name: string;
  media: string;
  status: HowItWorksStatus;
  howTo: string;
};

export type HowItWorksPlatform = {
  name: string;
  status: HowItWorksStatus;
  summary: string;
  formats: HowItWorksFormat[];
};

export type HowItWorksSection = {
  title: string;
  paragraphs?: string[];
  list?: string[];
  platforms?: HowItWorksPlatform[];
};

export type HowItWorksContent = {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: HowItWorksSection[];
};
