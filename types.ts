
export type EpisodeLength = "short" | "medium" | "long";
export type EpisodeTone = "educational" | "conversational" | "storytelling" | "motivational" | "branded" | "heated-debate" | "deep-dive" | "news-style";
export type VoiceStyle = "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr" | "Chiron" | "Cria" | "Siren";
export type MusicMood = "calm" | "corporate" | "tech" | "uplifting" | "cinematic";
export type PlanType = "free" | "pro" | "business";

export interface GenerationOptions {
  topic: string;
  length: EpisodeLength;
  tone: EpisodeTone;
  voiceStyle: VoiceStyle;
  secondaryVoiceStyle?: VoiceStyle;
  musicMood: MusicMood;
  isTwoHost: boolean;
}

export interface Episode {
  id: string;
  userId: string;
  title: string;
  script: string; // The full script as a string
  audioURL: string; // Base64 encoded audio
  coverArtURL: string; // Base64 encoded image
  voiceStyle: VoiceStyle;
  lengthInMinutes: number;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  credits: number;
  plan: PlanType;
}

export interface Subscription {
  id:string;
  userId: string;
  stripeId: string;
  planType: PlanType;
  renewalDate: number;
  status: "active" | "canceled";
}

export interface ShowNotes {
    summary: string;
    takeaways: string[];
    socialPost: string;
}
