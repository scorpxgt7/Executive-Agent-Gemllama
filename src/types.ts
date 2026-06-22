export type ModelProvider = "local" | "cloud";

export interface ConnectionConfig {
  provider: ModelProvider;
  localEndpoint: string;
  localModelName: string;
  isConnected: boolean | null;
}

export interface AffiliateCampaign {
  id: string;
  productName: string;
  productDescription: string;
  affiliateLink: string;
  price: string;
  keywords: string;
  platform: "X / Twitter" | "Facebook" | "LinkedIn" | "Instagram" | "Pinterest";
  tone: "Engaging" | "Professional" | "FOMO/Urgent" | "Casual/Storytelling" | "Feature Focus";
  style: "Standard Post" | "Thread Format" | "Hook & Bullet Points" | "Comparison Style";
  generatedPost?: string;
  createdAt: string;
}

export interface LandingPageCampaign {
  id: string;
  offerName: string;
  valueProp: string;
  ctaText: string;
  features: string;
  audience: string;
  styleTheme: "Slate SaaS" | "Emerald E-Commerce" | "Amber Creative" | "Midnight Premium";
  affiliateLink?: string;
  enableLeadCapture?: boolean;
  generatedHtml?: string;
  createdAt: string;
}

export interface SavedAffiliateLink {
  id: string;
  label: string;
  url: string;
  category: string;
  description?: string;
}

export interface ScheduledPost {
  id: string;
  productName: string;
  platform: string;
  scheduledTime: string;
  postContent: string;
  status: "Pending" | "Published";
}

export interface McpServer {
  id: string;
  name: string;
  commandOrUrl: string;
  args: string;
  status: "disconnected" | "connected";
  type: "stdio" | "sse";
}

export interface CustomPlugin {
  id: string;
  name: string;
  version: string;
  endpoint: string;
  status: "active" | "inactive";
  description?: string;
}
