import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Layers,
  Globe,
  Settings,
  BookOpen,
  Terminal,
  Activity,
  Copy,
  Check,
  Download,
  ExternalLink,
  RefreshCw,
  Twitter,
  Linkedin,
  Facebook,
  ArrowRight,
  Plus,
  Play,
  Zap,
  Cpu,
  FileText,
  Trash2,
  Lock,
  Code,
  Calendar,
  TrendingUp,
  Link as LinkIcon,
  Clock,
  Briefcase
} from "lucide-react";
import {
  ConnectionConfig,
  AffiliateCampaign,
  LandingPageCampaign,
  SavedAffiliateLink,
  ScheduledPost,
  McpServer,
  CustomPlugin
} from "./types";
import { TaskDependencyTree } from "./components/TaskDependencyTree";

// Setup some creative template mocks for instant testing
const AFFILIATE_TEMPLATES = [
  {
    productName: "Aura Smart Ring 2",
    productDescription: "An ultra-lightweight smart ring that monitors sleep depth, cardiovascular stress, daily recovery scores, and blood oxygen levels natively with a 7-day battery life.",
    affiliateLink: "https://shop.auraring.com/partner-deal?ref=gemmaAI",
    price: "$299 (Get $50 off with ref link)",
    keywords: "sleep fitness tracker, biohacking, wearable device, health tech",
    platform: "X / Twitter",
    tone: "Engaging",
    style: "Thread Format"
  },
  {
    productName: "CopyCraft AI Suite",
    productDescription: "The ultimate marketing automation tool for content creators that drafts newsletter copy, generates ad hooks, and crafts viral social media threads using localized models.",
    affiliateLink: "https://copycraft.ai/signup?aff=creatorflow",
    price: "Free 14-day trial, then $19/mo",
    keywords: "AI copywriter, marketing automation, indie hacker, solopreneur tools",
    platform: "LinkedIn",
    tone: "Professional",
    style: "Hook & Bullet Points"
  },
  {
    productName: "HyperHydrator Electrolytes",
    productDescription: "Sugar-free keto electrolyte powders containing raw Himilayan salt, active magnesium, and organic lemon peel oil. Designed for endurance athletes and focus workers.",
    affiliateLink: "https://hyperhydrator.co/discount/athlete?code=GEMMA20",
    price: "20% off all bundles",
    keywords: "keto electrolyte, keto diet, athletic biohacking, clean hydration",
    platform: "Facebook",
    tone: "FOMO/Urgent",
    style: "Comparison Style"
  }
];

const LANDING_TEMPLATES = [
  {
    offerName: "Gemma Affiliate Automation Protocol",
    valueProp: "Connect your local Gemma model to instantly curate, schedule, and auto-publish content that brings in commission on autopilot.",
    ctaText: "Launch Local Automations Free",
    features: "Zero Cloud API fees, Full pipeline ownership, Advanced viral copywriting frameworks, 1-Click platform syndication",
    audience: "Affiliate marketers, solopreneurs, indie hackers, and local-model tinkerers",
    styleTheme: "Slate SaaS"
  },
  {
    offerName: "Apex Coffee Subscription Club",
    valueProp: "Experience hyper-fresh organic micro-lot coffee beans ethically sourced and flame-roasted on-demand in micro-batches.",
    ctaText: "Sip Fresh Now - Get 10% Off",
    features: "Ethical single-origin beans, Nitrogen sealed for laboratory freshness, Free carbon-neutral express shipping, Fully customizable interval delivery",
    audience: "Coffee aficionados, focus workers, and organic biohackers",
    styleTheme: "Amber Creative"
  },
  {
    offerName: "Vortex Dev Workspace",
    valueProp: "A lightning-fast sandboxed cloud container workspace designed for rapid UI iteration, seamless deployment, and team alignment.",
    ctaText: "Provison Workspace in 5s",
    features: "100% cloud isolation, Pre-loaded build dependencies, Automated hot-module refreshes, Visual Git sync and review panels",
    audience: "Junior developers, product engineers, and remote design houses",
    styleTheme: "Midnight Premium"
  }
];

export default function App() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"posting" | "landing" | "connection" | "blueprint">("posting");

  // Local Gemma & Cloud Gemini Connection State
  const [connection, setConnection] = useState<ConnectionConfig>(() => {
    const saved = localStorage.getItem("gemma_connection");
    return saved
      ? JSON.parse(saved)
      : {
          provider: "cloud",
          localEndpoint: "http://localhost:11434/api/generate",
          localModelName: "gemma2",
          isConnected: null,
        };
  });

  // State: Affiliate Post Form
  const [affiliateForm, setAffiliateForm] = useState({
    productName: "",
    productDescription: "",
    affiliateLink: "",
    price: "",
    keywords: "",
    platform: "X / Twitter",
    tone: "Engaging",
    style: "Standard Post"
  });

  const [generatedPost, setGeneratedPost] = useState<string>("");
  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const [copiedPost, setCopiedPost] = useState(false);

  // State: Landing Page Form
  const [landingForm, setLandingForm] = useState({
    offerName: "",
    valueProp: "",
    ctaText: "",
    features: "",
    audience: "",
    styleTheme: "Slate SaaS"
  });

  const [generatedHtml, setGeneratedHtml] = useState<string>("");
  const [isGeneratingLanding, setIsGeneratingLanding] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"preview" | "code">("preview");

  // Interactive Live HTML editing reference
  const [landingHtmlEditor, setLandingHtmlEditor] = useState<string>("");

  // History & Logs
  const [campaignHistory, setCampaignHistory] = useState<AffiliateCampaign[]>(() => {
    const data = localStorage.getItem("gemma_campaign_history");
    return data ? JSON.parse(data) : [];
  });

  const [landingHistory, setLandingHistory] = useState<LandingPageCampaign[]>(() => {
    const data = localStorage.getItem("gemma_landing_history");
    return data ? JSON.parse(data) : [];
  });

  // State: Saved Affiliate Links
  const [savedLinks, setSavedLinks] = useState<SavedAffiliateLink[]>(() => {
    const saved = localStorage.getItem("gemma_saved_links");
    return saved ? JSON.parse(saved) : [
      { id: "link-1", label: "Aura Ring 2 Partner Deal", url: "https://shop.auraring.com/partner-deal?ref=gemmaAI", category: "Wearables", description: "Get $50 off smart ring orders." },
      { id: "link-2", label: "CopyCraft AI Suite Signup", url: "https://copycraft.ai/signup?aff=creatorflow", category: "SaaS Tools", description: "Provides 14-day free trial." },
      { id: "link-3", label: "HyperHydrator Keto Discount", url: "https://hyperhydrator.co/discount/athlete?code=GEMMA20", category: "Nutrition", description: "20% off bundles discount code." }
    ];
  });

  // State: Scheduled Posts
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>(() => {
    const saved = localStorage.getItem("gemma_scheduled_posts");
    return saved ? JSON.parse(saved) : [
      { id: "sch-1", productName: "Aura Smart Ring 2", platform: "X / Twitter", scheduledTime: "2026-05-22 09:30", postContent: "🚀 Upgrade your sleep hygiene with Aura Smart Ring 2. Real-time HRV diagnostics, 7-day backup, zero latency. Get $50 off with this partner code: https://shop.auraring.com/partner-deal?ref=gemmaAI #biohacking", status: "Pending" },
      { id: "sch-2", productName: "CopyCraft AI Suite", platform: "LinkedIn", scheduledTime: "2026-05-23 14:00", postContent: "How much time do you spend drafting AI ad copy? ✍️\n\nCopyCraft AI auto-generates newsletter hooks using safe, local Gemma 2 instances.\n\nTry it 14 days free: https://copycraft.ai/signup?aff=creatorflow\n\n#marketing #productivity", status: "Pending" }
    ];
  });

  // State: MCP Server Registry
  const [mcpServers, setMcpServers] = useState<McpServer[]>(() => {
    const saved = localStorage.getItem("gemma_mcp_servers");
    return saved ? JSON.parse(saved) : [
      { id: "mcp-1", name: "sqlite-database-mcp", commandOrUrl: "npx @modelcontextprotocol/server-sqlite", args: "--db local-campaigns.db", status: "connected", type: "stdio" },
      { id: "mcp-2", name: "filesystem-local-mcp", commandOrUrl: "npx @modelcontextprotocol/server-filesystem", args: "C:/Users/Gemma/Documents", status: "disconnected", type: "stdio" }
    ];
  });

  // State: Custom Plugins config
  const [customPlugins, setCustomPlugins] = useState<CustomPlugin[]>(() => {
    const saved = localStorage.getItem("gemma_custom_plugins");
    return saved ? JSON.parse(saved) : [
      { id: "pl-1", name: "System Scheduler Dispatcher", version: "1.1.0", endpoint: "/api/dispatch-cron", status: "active", description: "Polls pending posts queue and dispatches to APIs." },
      { id: "pl-2", name: "Gems SEO Optimizer Hook", version: "0.9.5", endpoint: "http://localhost:8085/hook/seo", status: "inactive", description: "Intercepts copy drafts to check reading ease score and density." }
    ];
  });

  // New forms states
  const [newLink, setNewLink] = useState({ label: "", url: "", category: "SaaS Only", description: "" });
  const [newMcp, setNewMcp] = useState({ name: "", commandOrUrl: "", args: "", type: "stdio" as "stdio" | "sse" });
  const [newPlugin, setNewPlugin] = useState({ name: "", version: "1.0.0", endpoint: "", description: "" });
  const [selectedScheduleDateTime, setSelectedScheduleDateTime] = useState({ date: "2026-05-22", time: "09:00" });

  // Connection testing spinner
  const [isTestingLocal, setIsTestingLocal] = useState(false);

  // Google Analytics & General Tracking Configuration State
  const [trackingConfig, setTrackingConfig] = useState(() => {
    const saved = localStorage.getItem("gemma_tracking_config");
    return saved ? JSON.parse(saved) : {
      gaId: "G-G3MMA4REF",
      fbPixelId: "FB-884820129",
      customHeadTags: `<!-- SEO Meta Tags Injected -->\n<meta name="robots" content="index, follow">\n<meta name="author" content="Gemma Affiliate Campaign">`,
      pageTitle: "",
      pageDescription: "",
      ogImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200",
      injectToLanding: true
    };
  });

  // Custom UTM Campaign Link Builder State
  const [linkBuilder, setLinkBuilder] = useState({
    baseUrl: "https://shop.auraring.com/partner-deal?ref=gemmaAI",
    source: "twitter",
    medium: "social",
    campaign: "gemma_promotions",
    content: "thread_post_1",
    subId: "gemma_ref"
  });

  // Captured Leads Database State
  const [capturedLeads, setCapturedLeads] = useState(() => {
    const saved = localStorage.getItem("gemma_captured_leads");
    return saved ? JSON.parse(saved) : [
      { id: "lead-1", email: "alice.growth@recom.io", name: "Alice Jenkins", capturedAt: "10:24 AM", offerName: "Gemma Affiliate Automation Protocol" },
      { id: "lead-2", email: "tinker.indie@devnet.dev", name: "Indie Maker", capturedAt: "02:15 PM", offerName: "Apex Coffee Subscription Club" }
    ];
  });

  // ================= EXECUTIVE AGENTS PLATFORM INTEGRATION STATES =================
  const [executiveViewMode, setExecutiveViewMode] = useState<"dashboard" | "specs">("dashboard");
  const [executiveGoals, setExecutiveGoals] = useState<any[]>([]);
  const [selectedExecutiveGoalId, setSelectedExecutiveGoalId] = useState<string | null>(null);
  const [activeExecutivePlan, setActiveExecutivePlan] = useState<any | null>(null);
  const [executiveAgents, setExecutiveAgents] = useState<any[]>([]);
  const [executiveApprovals, setExecutiveApprovals] = useState<any[]>([]);
  const [executiveStats, setExecutiveStats] = useState<any>({
    total_goals: 0,
    active_goals: 0,
    completed_goals: 0,
    failed_goals: 0,
    total_tasks: 0,
    completed_tasks: 0,
    executing_tasks: 0,
    active_agents: 4
  });
  const [executiveLogs, setExecutiveLogs] = useState<any[]>([]);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    description: "Launch autonomous research for wellness trends & generate campaign page",
    objectives: "1. Scrape top biohacking products from wellness hubs\n2. Perform copy positioning evaluation\n3. Build landing layout template on port 3000"
  });
  const [taskExecutionResults, setTaskExecutionResults] = useState<Record<string, any>>({});
  const [isExecutingTask, setIsExecutingTask] = useState<Record<string, boolean>>({});

  // Sync / refresh operational telemetry and data queues from FastAPI backend
  const refreshExecutiveTelemetry = async () => {
    try {
      // 1. Fetch system monitoring stats and logs
      const statsRes = await fetch("/api/v1/monitoring/");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.system_stats) setExecutiveStats(statsData.system_stats);
        if (statsData.logs) setExecutiveLogs(statsData.logs);
      }

      // 2. Fetch goals
      const goalsRes = await fetch("/api/v1/goals/");
      if (goalsRes.ok) {
        const goalsData = await goalsRes.json();
        setExecutiveGoals(goalsData);
        
        // Auto-select first goal if none selected
        if (goalsData.length > 0 && !selectedExecutiveGoalId) {
          setSelectedExecutiveGoalId(goalsData[0].id);
        }
      }

      // 3. Fetch specific execution plan if goal is loaded
      if (selectedExecutiveGoalId) {
        const planRes = await fetch(`/api/v1/goals/${selectedExecutiveGoalId}`);
        if (planRes.ok) {
          const detail = await planRes.json();
          setActiveExecutivePlan(detail.plan);
        }
      }

      // 4. Fetch registered agent structures
      const agentsRes = await fetch("/api/v1/agents/");
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setExecutiveAgents(agentsData);
      }

      // 5. Fetch open system approvals requiring checks
      const approvalsRes = await fetch("/api/v1/approvals/");
      if (approvalsRes.ok) {
        const approvalsData = await approvalsRes.json();
        setExecutiveApprovals(approvalsData);
      }
    } catch (err: any) {
      console.warn("FastAPI backend connection warning (still booting or offline):", err.message);
    }
  };

  // Trigger telemetry refresh periodically when in the blueprint/agent view
  useEffect(() => {
    refreshExecutiveTelemetry();
    const interval = setInterval(() => {
      if (activeTab === "blueprint") {
        refreshExecutiveTelemetry();
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [activeTab, selectedExecutiveGoalId]);

  // Handle Dispatch of a brand new Goal from user input
  const handleDispatchGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.description.trim()) return;
    setIsCreatingGoal(true);

    try {
      const objectivesList = goalForm.objectives
        .split("\n")
        .map(obj => obj.trim())
        .filter(obj => obj.length > 0);

      const res = await fetch("/api/v1/goals/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: goalForm.description,
          objectives: objectivesList,
          constraints: { local_only: true }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedExecutiveGoalId(data.goal_id);
        setGoalForm({
          description: "Analyze competitor pricing sheets and auto-draft promotional posts",
          objectives: "1. Download prices from index links\n2. Rewrite pricing drafts using Gemma tone analyzer\n3. Append to schedule queue"
        });
        await refreshExecutiveTelemetry();
        alert("🎯 Strategic Goal Dispatched successfully! Multi-phase Execution Plan formulated by your local Planner!");
      } else {
        alert("Failed to create goal. Check if the backend is initializing.");
      }
    } catch (err: any) {
      alert(`Error submitting goal: ${err.message}`);
    } finally {
      setIsCreatingGoal(false);
    }
  };

  // Manually trigger execution on an individual plan task using Python worker agents
  const handleExecuteTask = async (taskId: string) => {
    setIsExecutingTask(prev => ({ ...prev, [taskId]: true }));
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}/execute`, {
        method: "POST"
      });
      if (res.ok) {
        const resultData = await res.json();
        setTaskExecutionResults(prev => ({ ...prev, [taskId]: resultData }));
        await refreshExecutiveTelemetry();
      } else {
        alert("Task execution call failed. Endpoint returned an error status.");
      }
    } catch (err: any) {
      alert(`Task execution failed: ${err.message}`);
    } finally {
      setIsExecutingTask(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // Perform operational administrative approval action
  const handleActionApproval = async (approvalId: string, action: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/v1/approvals/${approvalId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        await refreshExecutiveTelemetry();
        alert(`Approval request successfully ${action}ed!`);
      } else {
        alert("Approval submission returned an error.");
      }
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleToggleAgent = async (agentId: string) => {
    try {
      const res = await fetch(`/api/v1/agents/${agentId}/toggle`, {
        method: "POST"
      });
      if (res.ok) {
        await refreshExecutiveTelemetry();
      }
    } catch (err: any) {
      console.error("Failed to toggle agent active capability:", err.message);
    }
  };


  // Synchronize configuration to localStorage
  useEffect(() => {
    localStorage.setItem("gemma_connection", JSON.stringify(connection));
  }, [connection]);

  // Synchronize dynamic campaign databases and tracking configs
  useEffect(() => {
    localStorage.setItem("gemma_tracking_config", JSON.stringify(trackingConfig));
  }, [trackingConfig]);

  useEffect(() => {
    localStorage.setItem("gemma_captured_leads", JSON.stringify(capturedLeads));
  }, [capturedLeads]);

  // Listen for iframe lead submissions to populate the Leads database ledger
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "lead_submission") {
        const leadEmail = event.data.email;
        const leadName = event.data.name || "Subscriber";
        const captureTime = new Date().toLocaleTimeString();
        const newLead = {
          id: "lead-" + Math.random().toString(36).substring(7),
          email: leadEmail,
          name: leadName,
          capturedAt: captureTime,
          offerName: landingForm.offerName || "Active Landing Campaign"
        };
        setCapturedLeads((prev: any) => [newLead, ...prev]);
        alert(`🎉 Lead Conversion Captured via Iframe Simulator!\nEmail: ${leadEmail}\nName: ${leadName}`);
      }
    };
    window.addEventListener("message", handleIframeMessage);
    return () => window.removeEventListener("message", handleIframeMessage);
  }, [landingForm.offerName]);

  // Helper method to inject metadata and custom trackers at runtime
  const injectMetaAndAnalytics = (html: string) => {
    let output = html;

    // 1. Build tracking scripts
    let trackingScripts = "";
    if (trackingConfig.injectToLanding) {
      if (trackingConfig.gaId) {
        trackingScripts += `
  <!-- Google Analytics Injected via Gemma Builder -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${trackingConfig.gaId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${trackingConfig.gaId}', {
      'custom_tracker': 'gemma_aff_builder2',
      'campaign_origin': 'gemma_local'
    });
  </script>
`;
      }
      if (trackingConfig.fbPixelId) {
        trackingScripts += `
  <!-- Facebook Pixel Injected via Gemma Builder -->
  <script>
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${trackingConfig.fbPixelId}');
    fbq('track', 'PageView');
  </script>
`;
      }
      if (trackingConfig.customHeadTags) {
        trackingScripts += `\n${trackingConfig.customHeadTags}\n`;
      }
    }

    // 2. Build form submission interceptor script
    const formInterceptorScript = `
  <!-- Form lead collection hook -->
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const emailInput = form.querySelector('input[type="email"]') || form.querySelector('input[name*="email"]') || form.querySelector('input');
          const nameInput = form.querySelector('input[type="text"]') || form.querySelector('input[name*="name"]');
          
          if(emailInput && emailInput.value) {
            window.parent.postMessage({
              type: 'lead_submission',
              email: emailInput.value,
              name: nameInput ? nameInput.value : 'Subscriber'
            }, '*');
            
            // Show tactile feedback in the preview
            const submitBtn = form.querySelector('button') || form.querySelector('input[type="submit"]');
            if(submitBtn) {
              const originalText = submitBtn.textContent;
              submitBtn.textContent = '✓ JOINED SUCCESSFUL!';
              submitBtn.style.backgroundColor = '#10B981';
              setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.style.backgroundColor = '';
              }, 3000);
            }
            emailInput.value = '';
            if(nameInput) nameInput.value = '';
          }
        });
      });
    });
  </script>
`;

    // 3. SEO Meta Tags construction
    const pageTitle = trackingConfig.pageTitle || landingForm.offerName || "Gemma Campaign Landing Page";
    const pageDesc = trackingConfig.pageDescription || landingForm.valueProp || "Generated by local intelligence.";
    const ogImage = trackingConfig.ogImage || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200";

    const seoMetaTags = `
  <title>${pageTitle}</title>
  <meta name="description" content="${pageDesc}">
  <!-- Open Graph / Meta Protocol Core -->
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${pageDesc}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${pageTitle}">
  <meta name="twitter:description" content="${pageDesc}">
  <meta name="twitter:image" content="${ogImage}">
`;

    // Inject scripts & meta inside <head> or at the beginning of HTML docs
    const allInjectedStuff = `${seoMetaTags}\n${trackingScripts}\n${formInterceptorScript}`;

    if (output.includes("<head>")) {
      output = output.replace("<head>", `<head>\n${allInjectedStuff}`);
    } else if (output.includes("<html>")) {
      output = output.replace("<html>", `<html>\n<head>\n${allInjectedStuff}\n</head>`);
    } else {
      output = `<head>\n${allInjectedStuff}\n</head>\n${output}`;
    }

    return output;
  };

  const exportCapturedLeadsCsv = () => {
    if (capturedLeads.length === 0) {
      alert("No leads mapped, database ledger is currently empty.");
      return;
    }
    const headers = "Lead ID,Email Address,Subscriber Name,Campaign Reference,Capture Timestamp\n";
    const rows = capturedLeads.map((lead: any) => 
      `"${lead.id}","${lead.email}","${lead.name.replace(/"/g, '""')}","${lead.offerName.replace(/"/g, '""')}","${lead.capturedAt}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gemma-captured-leads-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Synchronize logs & datasets
  useEffect(() => {
    localStorage.setItem("gemma_campaign_history", JSON.stringify(campaignHistory));
  }, [campaignHistory]);

  useEffect(() => {
    localStorage.setItem("gemma_landing_history", JSON.stringify(landingHistory));
  }, [landingHistory]);

  useEffect(() => {
    localStorage.setItem("gemma_saved_links", JSON.stringify(savedLinks));
  }, [savedLinks]);

  useEffect(() => {
    localStorage.setItem("gemma_scheduled_posts", JSON.stringify(scheduledPosts));
  }, [scheduledPosts]);

  useEffect(() => {
    localStorage.setItem("gemma_mcp_servers", JSON.stringify(mcpServers));
  }, [mcpServers]);

  useEffect(() => {
    localStorage.setItem("gemma_custom_plugins", JSON.stringify(customPlugins));
  }, [customPlugins]);

  const testLocalOllamaConnection = async () => {
    setIsTestingLocal(true);
    try {
      // Direct CORS test to check if Ollama responds to headers
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Testing basic status of the endpoint, or checking model list
      const baseEndpoint = connection.localEndpoint.replace("/api/generate", "");
      const res = await fetch(`${baseEndpoint}/api/tags`, {
        method: "GET",
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setConnection(prev => ({ ...prev, isConnected: true }));
      } else {
        setConnection(prev => ({ ...prev, isConnected: false }));
      }
    } catch (err) {
      console.warn("Local Ollama connection failed. Likely offline or CORS is not enabled yet.", err);
      setConnection(prev => ({ ...prev, isConnected: false }));
    } finally {
      setIsTestingLocal(false);
    }
  };

  // Pre-fill templates for quick usability testing
  const applyAffiliateTemplate = (index: number) => {
    const template = AFFILIATE_TEMPLATES[index];
    setAffiliateForm({ ...template });
  };

  const applyLandingTemplate = (index: number) => {
    const template = LANDING_TEMPLATES[index];
    setLandingForm({ ...template });
  };

  // Helper: Add custom affiliate links
  const handleAddSavedLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.label || !newLink.url) {
      alert("Label and URL are required to catalog an affiliate link.");
      return;
    }
    const newlyCreated: SavedAffiliateLink = {
      id: "link-" + Math.random().toString(36).substring(7),
      label: newLink.label,
      url: newLink.url,
      category: newLink.category || "General",
      description: newLink.description || ""
    };
    setSavedLinks(prev => [newlyCreated, ...prev]);
    setNewLink({ label: "", url: "", category: "SaaS Only", description: "" });
  };

  const handleDeleteSavedLink = (id: string) => {
    setSavedLinks(prev => prev.filter(item => item.id !== id));
  };

  // Helper: Schedule active computed copy post
  const handleSchedulePost = (contentString: string, prodName: string, mediaAlt: string) => {
    if (!contentString) {
      alert("There is no generated text to schedule. Please draft write-ups first!");
      return;
    }
    const releaseDateTimeString = `${selectedScheduleDateTime.date} ${selectedScheduleDateTime.time}`;
    const newScheduled: ScheduledPost = {
      id: "sch-" + Math.random().toString(36).substring(7),
      productName: prodName || "Custom Affiliate Pitch",
      platform: mediaAlt || "X / Twitter",
      scheduledTime: releaseDateTimeString,
      postContent: contentString,
      status: "Pending"
    };
    setScheduledPosts(prev => [newScheduled, ...prev]);
    alert(`Successfully registered! Post scheduled for dispatch at ${releaseDateTimeString}.`);
  };

  const handleDeleteScheduledPost = (id: string) => {
    setScheduledPosts(prev => prev.filter(item => item.id !== id));
  };

  const triggerPostPublicationNow = (id: string) => {
    setScheduledPosts(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: "Published" as const };
      }
      return item;
    }));
    alert("Post broadcasted successfully! Live metrics simulation initiated.");
  };

  // Helper: Custom MCP registration
  const handleAddMcpServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMcp.name || !newMcp.commandOrUrl) {
      alert("Valid server name and URI are required.");
      return;
    }
    const addedMcp: McpServer = {
      id: "mcp-" + Math.random().toString(36).substring(7),
      name: newMcp.name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-"),
      commandOrUrl: newMcp.commandOrUrl,
      args: newMcp.args || "",
      status: "disconnected",
      type: newMcp.type
    };
    setMcpServers(prev => [...prev, addedMcp]);
    setNewMcp({ name: "", commandOrUrl: "", args: "", type: "stdio" });
  };

  const handleDeleteMcpServer = (id: string) => {
    setMcpServers(prev => prev.filter(item => item.id !== id));
  };

  const toggleMcpServerConnection = (id: string) => {
    setMcpServers(prev => prev.map(item => {
      if (item.id === id) {
        const nextStatus = item.status === "connected" ? "disconnected" : "connected";
        return { ...item, status: nextStatus as any };
      }
      return item;
    }));
  };

  // Helper: Custom Plugin registrations
  const handleAddCustomPlugin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlugin.name || !newPlugin.endpoint) {
      alert("Plugin name and target endpoint are required.");
      return;
    }
    const addedPlugin: CustomPlugin = {
      id: "pl-" + Math.random().toString(36).substring(7),
      name: newPlugin.name,
      version: newPlugin.version || "1.0.0",
      endpoint: newPlugin.endpoint,
      status: "inactive",
      description: newPlugin.description || ""
    };
    setCustomPlugins(prev => [...prev, addedPlugin]);
    setNewPlugin({ name: "", version: "1.0.0", endpoint: "", description: "" });
  };

  const handleDeleteCustomPlugin = (id: string) => {
    setCustomPlugins(prev => prev.filter(item => item.id !== id));
  };

  const toggleCustomPluginActivity = (id: string) => {
    setCustomPlugins(prev => prev.map(item => {
      if (item.id === id) {
        const nextStatus = item.status === "active" ? "inactive" : "active";
        return { ...item, status: nextStatus as any };
      }
      return item;
    }));
  };

  // Generation Orchestrator
  const generateAffiliatePost = async () => {
    if (!affiliateForm.productName || !affiliateForm.productDescription) {
      alert("Please fill in the Product Name and Description first.");
      return;
    }

    setIsGeneratingPost(true);
    setGeneratedPost("");

    try {
      if (connection.provider === "local") {
        // QUERY THE LOCAL GEMMA INSTANCE (Direct client-side fetch, requires user to run with CORS: OLLAMA_ORIGINS="*")
        const fullPrompt = `You are a world-class affiliate copywriter. Generate a high converting social media marketing poster copy for the platform: ${affiliateForm.platform}.
Product Name: ${affiliateForm.productName}
Details: ${affiliateForm.productDescription}
Link: ${affiliateForm.affiliateLink || "[YOUR_LINK_HERE]"}
Price: ${affiliateForm.price || "N/A"}
Tone: ${affiliateForm.tone}
Format/Style: ${affiliateForm.style}
Keywords: ${affiliateForm.keywords}

Write optimized post. Make it persuasive, readable, with spacing, neat hashtags, and dynamic calls to action. Do not explain anything, just output the ready-to-use post.`;

        const res = await fetch(connection.localEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: connection.localModelName,
            prompt: fullPrompt,
            stream: false
          })
        });

        if (!res.ok) {
          throw new Error(`Failed to contact local model. Server responded with ${res.status}`);
        }

        const data = await res.json();
        // Ollama response is typically in data.response
        const outText = data.response || data.text || JSON.stringify(data);
        setGeneratedPost(outText);

        // Save to log
        const campaignItem: AffiliateCampaign = {
          id: Math.random().toString(36).substring(7),
          ...affiliateForm,
          generatedPost: outText,
          createdAt: new Date().toLocaleTimeString()
        } as any;
        setCampaignHistory(prev => [campaignItem, ...prev]);

      } else {
        // QUERY SECURE CLOUD ENDPOINT (Pipes safely via server.ts -> Gemini 3.5 Flash)
        const res = await fetch("/api/generate-affiliate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(affiliateForm)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to communicate with proxy generator.");
        }

        const data = await res.json();
        setGeneratedPost(data.text);

        // Save to log
        const campaignItem: AffiliateCampaign = {
          id: Math.random().toString(36).substring(7),
          ...affiliateForm,
          generatedPost: data.text,
          createdAt: new Date().toLocaleTimeString()
        } as any;
        setCampaignHistory(prev => [campaignItem, ...prev]);
      }
    } catch (err: any) {
      console.error(err);
      // Give contextual instruction
      setGeneratedPost(`❌ COULD NOT GENERATE AUTOMATION COPY\n\nReason: ${err.message}\n\n${
        connection.provider === "local" 
        ? "👉 Check if your Local Ollama service is active. Ensure you started it with CORS enabled. Check the 'Connection Panel' tab to see terminal startup instructions." 
        : "👉 Check server terminal status. Is Gemini server running correctly?"
      }`);
    } finally {
      setIsGeneratingPost(false);
    }
  };

  const generateLandingPage = async () => {
    if (!landingForm.offerName || !landingForm.valueProp) {
      alert("Please fill in the Offer Name and Main Value Proposition first.");
      return;
    }

    setIsGeneratingLanding(true);
    setGeneratedHtml("");
    setLandingHtmlEditor("");

    try {
      if (connection.provider === "local") {
        // Query Local Gemma endpoint for HTML page directly
        const fullPrompt = `You are a talented Landing Page designer. Write a fully responsive, gorgeous single page landing HTML based strictly on:
Offer: ${landingForm.offerName}
Value Prop: ${landingForm.valueProp}
CTA Text: ${landingForm.ctaText || "Get Started"}
Features: ${landingForm.features}
Target Audience: ${landingForm.audience}
Color Theme Schema: ${landingForm.styleTheme}

Use Tailwind CSS via CDN. Output absolute raw standalone HTML only inside <html> tags. Do not explain, do not add introductory markdown, start directly with <!DOCTYPE html>.`;

        const res = await fetch(connection.localEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: connection.localModelName,
            prompt: fullPrompt,
            stream: false
          })
        });

        if (!res.ok) {
          throw new Error(`Failed to contact local model. Status ${res.status}`);
        }

        const data = await res.json();
        let outHtml = data.response || data.text || "";
        
        // Clean markdown blocks if local gemma returned markdown wrapping
        if (outHtml.includes("```html")) {
          outHtml = outHtml.substring(outHtml.indexOf("```html") + 7);
          outHtml = outHtml.substring(0, outHtml.lastIndexOf("```"));
        } else if (outHtml.includes("```")) {
          outHtml = outHtml.substring(outHtml.indexOf("```") + 3);
          outHtml = outHtml.substring(0, outHtml.lastIndexOf("```"));
        }

        const processedHtml = injectMetaAndAnalytics(outHtml.trim());
        setGeneratedHtml(processedHtml);
        setLandingHtmlEditor(processedHtml);

        const landingItem: LandingPageCampaign = {
          id: Math.random().toString(36).substring(7),
          ...landingForm,
          generatedHtml: processedHtml,
          createdAt: new Date().toLocaleTimeString()
        } as any;
        setLandingHistory(prev => [landingItem, ...prev]);

      } else {
        // Query Cloud Gemini via Express proxy
        const res = await fetch("/api/generate-landing", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(landingForm)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to communicate with proxy generator.");
        }

        const data = await res.json();
        const processedHtml = injectMetaAndAnalytics(data.html);
        setGeneratedHtml(processedHtml);
        setLandingHtmlEditor(processedHtml);

        const landingItem: LandingPageCampaign = {
          id: Math.random().toString(36).substring(7),
          ...landingForm,
          generatedHtml: processedHtml,
          createdAt: new Date().toLocaleTimeString()
        } as any;
        setLandingHistory(prev => [landingItem, ...prev]);
      }
    } catch (err: any) {
      console.error(err);
      const fallbackHtml = `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-6 font-sans">
  <div class="max-w-md w-full bg-slate-800 rounded-2xl border border-rose-500/30 p-8 text-center shadow-2xl">
    <div class="inline-flex p-3 bg-rose-500/10 text-rose-400 rounded-full mb-4">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
    </div>
    <h3 class="text-xl font-bold tracking-tight text-white mb-2">Generation Fault</h3>
    <p class="text-sm text-slate-300 mb-6 leading-relaxed">
      ${err.message || "Failed to compile the template HTML from your model."}
    </p>
    <div class="bg-slate-950 p-4 rounded-lg text-left text-xs font-mono text-slate-400 mb-6 max-h-32 overflow-y-auto">
      ${connection.provider === "local" 
        ? "CORS error or Ollama Offline. Ensure client is connected on port 11434 and OLLAMA_ORIGINS is active." 
        : "Please verify Google Cloud system logs or Gemini connection keys."}
    </div>
  </div>
</body>
</html>`;
      setGeneratedHtml(fallbackHtml);
      setLandingHtmlEditor(fallbackHtml);
    } finally {
      setIsGeneratingLanding(false);
    }
  };

  // Copy Helpers
  const copyPostText = () => {
    navigator.clipboard.writeText(generatedPost);
    setCopiedPost(true);
    setTimeout(() => setCopiedPost(false), 2000);
  };

  const copyHtmlText = () => {
    navigator.clipboard.writeText(landingHtmlEditor || generatedHtml);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const downloadHtmlFile = () => {
    const blob = new Blob([landingHtmlEditor || generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${landingForm.offerName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "landing"}-gemma.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] flex flex-col font-sans selection:bg-[#141414] selection:text-[#E4E3E0]" id="main_dashboard">
      
      {/* Upper Technical Title Banner - Brutalist Swiss High Density */}
      <header className="border-b-2 border-[#141414] bg-[#D6D5D1] sticky top-0 z-50 px-4 py-2.5 flex flex-col lg:flex-row items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#F27D26] rounded-full animate-pulse"></span>
            <span className="font-serif italic font-bold tracking-tight text-lg text-[#141414]">GEMMA-OS / V2.1.9</span>
          </div>
          <div className="hidden sm:block h-5 w-[1px] bg-[#141414] opacity-20"></div>
          <div className="hidden md:flex gap-4 text-[10px] uppercase font-mono font-bold tracking-tight text-[#141414] opacity-75">
            <span>GPU: NVIDIA 4090 [42.1% LOAD]</span>
            <span>MEM: 18.4GB / 24GB</span>
            <span>TEMP: 64°C</span>
          </div>
        </div>

        {/* Global LLM Provider Toggle Bar */}
        <div className="bg-[#E4E3E0] border-2 border-[#141414] p-0.5 rounded-none flex items-center gap-1.5 brutalist-shadow-sm">
          <button
            onClick={() => {
              setConnection(prev => ({ ...prev, provider: "local" }));
              setConnection(prev => ({ ...prev, isConnected: null }));
            }}
            className={`px-3 py-1 font-mono text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 rounded-none ${
              connection.provider === "local"
                ? "bg-[#141414] text-[#E4E3E0]"
                : "text-[#141414] hover:bg-[#141414]/15"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Local Gemma (Ollama)
          </button>
          <button
            onClick={() => setConnection(prev => ({ ...prev, provider: "cloud" }))}
            className={`px-3 py-1 font-mono text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 rounded-none ${
              connection.provider === "cloud"
                ? "bg-emerald-700 text-[#E4E3E0]"
                : "text-[#141414] hover:bg-[#141414]/15"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Gemini Cloud
          </button>
        </div>

        {/* Quick Connection Status Indicators */}
        <div className="flex items-center gap-3 font-mono text-[11px] font-bold">
          {connection.provider === "local" ? (
            <button 
              onClick={testLocalOllamaConnection}
              className={`flex items-center gap-2 px-3 py-1.5 bg-[#F5F4F0] border-2 border-[#141414] text-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all brutalist-shadow-sm uppercase ${isTestingLocal ? "opacity-70" : ""}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingLocal ? "animate-spin" : ""}`} />
              Ollama: {connection.isConnected === true ? (
                <span className="text-[#F27D26] font-extrabold animate-pulse">● Active</span>
              ) : connection.isConnected === false ? (
                <span className="text-red-700 font-extrabold">● Setup Req</span>
              ) : (
                <span className="text-[#141414]/60">● Check Status</span>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 border-2 border-emerald-950 text-emerald-950">
              <Zap className="w-3.5 h-3.5 fill-emerald-800" />
              <span className="uppercase text-[10px]">Gemini Proxy Ready</span>
            </div>
          )}
        </div>
      </header>
      
      {/* Main Core View Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Side System Navigation */}
        <nav className="w-full md:w-64 border-b-2 md:border-b-0 md:border-r-2 border-[#141414] bg-[#D6D5D1] p-4 flex md:flex-col gap-2.5 overflow-x-auto md:overflow-x-visible">
          <button
            onClick={() => setActiveTab("posting")}
            className={`w-full text-left px-3.5 py-2.5 rounded-none flex items-center gap-3 font-medium text-sm transition-all shrink-0 ${
              activeTab === "posting"
                ? "bg-[#141414] text-[#E4E3E0] border border-[#141414] brutalist-shadow-sm"
                : "text-[#141414] hover:bg-[#141414]/10 hover:text-[#141414] border border-transparent"
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <div>
              <p className="font-mono font-bold text-xs tracking-tight uppercase">AFFILIATE AUTO-POST</p>
              <p className="text-[9px] uppercase font-mono opacity-60 mt-0.5">Automizer & Feeds</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("landing")}
            className={`w-full text-left px-3.5 py-2.5 rounded-none flex items-center gap-3 font-medium text-sm transition-all shrink-0 ${
              activeTab === "landing"
                ? "bg-[#141414] text-[#E4E3E0] border border-[#141414] brutalist-shadow-sm"
                : "text-[#141414] hover:bg-[#141414]/10 hover:text-[#141414] border border-transparent"
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <div>
              <p className="font-mono font-bold text-xs tracking-tight uppercase">LANDING PAGE BUILDER</p>
              <p className="text-[9px] uppercase font-mono opacity-60 mt-0.5">HTML & CSS Generator</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("connection")}
            className={`w-full text-left px-3.5 py-2.5 rounded-none flex items-center gap-3 font-medium text-sm transition-all shrink-0 ${
              activeTab === "connection"
                ? "bg-[#141414] text-[#E4E3E0] border border-[#141414] brutalist-shadow-sm"
                : "text-[#141414] hover:bg-[#141414]/10 hover:text-[#141414] border border-transparent"
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <div>
              <p className="font-mono font-bold text-xs tracking-tight uppercase">PORT & CORS ASSISTANT</p>
              <p className="text-[9px] uppercase font-mono opacity-60 mt-0.5">Ollama CLI Setup</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("blueprint")}
            className={`w-full text-left px-3.5 py-2.5 rounded-none flex items-center gap-3 font-medium text-sm transition-all shrink-0 ${
              activeTab === "blueprint"
                ? "bg-[#141414] text-[#E4E3E0] border border-[#141414] brutalist-shadow-sm"
                : "text-[#141414] hover:bg-[#141414]/10 hover:text-[#141414] border border-transparent"
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <div>
              <p className="font-mono font-bold text-xs tracking-tight uppercase">IMPROVEMENT BLUEPRINT</p>
              <p className="text-[9px] uppercase font-mono opacity-60 mt-0.5">Local Automation Plan</p>
            </div>
          </button>

          <div className="hidden md:block mt-auto pt-4 border-t border-[#141414]/15">
            <div className="bg-[#E4E3E0] p-3 border border-[#141414] rounded-none text-center brutalist-shadow-sm">
              <span className="text-[9px] uppercase font-mono opacity-60">Running local time</span>
              <p className="text-xs font-mono font-bold text-[#141414] mt-0.5">
                2026-05-21
              </p>
            </div>
          </div>
        </nav>

        {/* Dynamic Panel Renderer */}
        <main className="flex-1 bg-[#E4E3E0] p-4 lg:p-6 overflow-y-auto">
          
          {/* TAB 1: AFFILIATE DEPLOYMENT ENGINE */}
          {activeTab === "posting" && (
            <div className="flex flex-col gap-6">
              
              {/* Brutalist High-Density Stats Dashboard */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-[#F5F4F0] border-2 border-[#141414] p-3 rounded-none brutalist-shadow-sm">
                  <span className="text-[9px] uppercase font-mono font-bold text-[#141414]/60 block mb-1">Active Ledger Hooks</span>
                  <div className="flex items-baseline justify-between select-none">
                    <span className="font-serif italic font-extrabold text-2xl text-[#141414]">{campaignHistory.length + 3}</span>
                    <span className="text-[9px] font-mono font-bold text-emerald-700">+12%</span>
                  </div>
                </div>
                <div className="bg-[#F5F4F0] border-2 border-[#141414] p-3 rounded-none brutalist-shadow-sm">
                  <span className="text-[9px] uppercase font-mono font-bold text-[#141414]/60 block mb-1">Scheduled Posts</span>
                  <div className="flex items-baseline justify-between select-none">
                    <span className="font-serif italic font-extrabold text-2xl text-[#111]">{scheduledPosts.length}</span>
                    <span className="text-[9px] font-mono font-bold text-[#F27D26] uppercase">In Queue</span>
                  </div>
                </div>
                <div className="bg-[#F5F4F0] border-2 border-[#141414] p-3 rounded-none brutalist-shadow-sm">
                  <span className="text-[9px] uppercase font-mono font-bold text-[#141414]/60 block mb-1">Total Impressions</span>
                  <div className="flex items-baseline justify-between select-none">
                    <span className="font-serif italic font-extrabold text-2xl text-[#141414]">{((campaignHistory.length * 1532) + 1205)}</span>
                    <span className="text-[9px] font-mono font-bold text-emerald-700">▲ Live</span>
                  </div>
                </div>
                <div className="bg-[#F5F4F0] border-2 border-[#141414] p-3 rounded-none brutalist-shadow-sm">
                  <span className="text-[9px] uppercase font-mono font-bold text-[#141414]/60 block mb-1">Click Throughs (CTR)</span>
                  <div className="flex items-baseline justify-between select-none">
                    <span className="font-serif italic font-extrabold text-2xl text-[#141414]">{((campaignHistory.length * 94) + 215)}</span>
                    <span className="text-[9px] font-mono font-bold text-[#141414]">Rate: 6.2%</span>
                  </div>
                </div>
                <div className="bg-[#F5F4F0] border-2 border-[#141414] p-3 rounded-none brutalist-shadow-sm">
                  <span className="text-[9px] uppercase font-mono font-bold text-[#141414]/60 block mb-1">Conversions Logged</span>
                  <div className="flex items-baseline justify-between select-none">
                    <span className="font-serif italic font-extrabold text-2xl text-[#141414]">{((campaignHistory.length * 12) + 24)}</span>
                    <span className="text-[9px] font-mono font-bold text-emerald-700">CR: 11.2%</span>
                  </div>
                </div>
                <div className="bg-[#F5F4F0] border-2 border-[#141414] p-3 rounded-none brutalist-shadow-sm">
                  <span className="text-[9px] uppercase font-mono font-bold text-[#141414]/60 block mb-1">Est. Accrued Commission</span>
                  <div className="flex items-baseline justify-between select-none">
                    <span className="font-serif italic font-extrabold text-2xl text-[#F27D26]">${((campaignHistory.length * 34.50) + 125.80).toFixed(2)}</span>
                    <span className="text-[9px] font-mono font-bold text-[#141414]/60">USD Offline</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              
              {/* Form Input Block - High Density Workstation Form */}
              <div className="xl:col-span-5 flex flex-col gap-6">
                
                {/* Template Fast Match Section */}
                <div className="bg-[#D6D5D1] border-2 border-[#141414] p-4 rounded-none brutalist-shadow-sm select-none">
                  <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold flex items-center gap-1.5 pb-2 border-b border-[#141414]/15">
                    <Layers className="w-3.5 h-3.5 text-[#F27D26]" /> Key Catalogs / Fast Templates
                  </span>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {AFFILIATE_TEMPLATES.map((item, id) => (
                      <button
                        key={id}
                        onClick={() => applyAffiliateTemplate(id)}
                        className="text-left p-2 rounded-none bg-[#F5F4F0] border-2 border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all brutalist-shadow-sm group cursor-pointer"
                      >
                        <p className="text-[10px] uppercase font-bold text-[#141414] group-hover:text-inherit truncate">{item.productName}</p>
                        <p className="text-[9px] font-mono uppercase opacity-65 group-hover:text-inherit mt-0.5 truncate">{item.platform}</p>
                      </button>
                    ))}
                  </div>
                </div>


                {/* Local Affiliate Link Vault */}
                <div className="bg-[#F5F4F0] border-2 border-[#141414] p-4 rounded-none brutalist-shadow-sm select-none">
                  <div className="flex items-center justify-between pb-2 border-b border-[#141414]/15">
                    <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-[#F27D26]" /> Local Affiliate Link Vault
                    </span>
                    <span className="bg-[#F27D26] text-[#141414] px-1.5 py-0.5 text-[9px] font-extrabold uppercase">{savedLinks.length} Stored</span>
                  </div>

                  {/* Add link form */}
                  <form onSubmit={handleAddSavedLink} className="mt-3 bg-[#D6D5D1]/40 p-3 border border-[#141414]/25 flex flex-col gap-2.5">
                    <span className="text-[9px] font-mono uppercase font-bold text-[#141414]/80">Register New Affiliate URL</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Link Label (e.g. Aura Ring)"
                        value={newLink.label}
                        onChange={e => setNewLink({ ...newLink, label: e.target.value })}
                        className="text-[10px] p-2 bg-white border border-[#141414] focus:outline-none focus:bg-[#E4E3E0] font-sans rounded-none font-semibold text-[#141414]"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Category (e.g. Health)"
                        value={newLink.category}
                        onChange={e => setNewLink({ ...newLink, category: e.target.value })}
                        className="text-[10px] p-2 bg-white border border-[#141414] focus:outline-none focus:bg-[#E4E3E0] font-sans rounded-none font-semibold text-[#141414]"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Affiliate URL (https://...)"
                      value={newLink.url}
                      onChange={e => setNewLink({ ...newLink, url: e.target.value })}
                      className="text-[10px] p-2 bg-white border border-[#141414] focus:outline-none focus:bg-[#E4E3E0] font-mono rounded-none text-[#141414]"
                      required
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Brief notes (optional)"
                        value={newLink.description}
                        onChange={e => setNewLink({ ...newLink, description: e.target.value })}
                        className="text-[10px] p-2 bg-white border border-[#141414] focus:outline-none focus:bg-[#E4E3E0] flex-1 font-sans rounded-none text-[#141414]"
                      />
                      <button
                        type="submit"
                        className="bg-[#141414] text-white px-3 py-1 text-[10px] uppercase font-mono font-bold hover:bg-[#F27D26] hover:text-[#141414] border border-[#141414] transition-all cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </form>

                  {/* Links registry directory */}
                  {savedLinks.length === 0 ? (
                    <p className="text-center py-4 text-[10px] text-[#141414]/50 font-mono">No custom partner URLs saved yet.</p>
                  ) : (
                    <div className="mt-3 flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                      {savedLinks.map(link => (
                        <div key={link.id} className="bg-white border border-[#141414] p-2.5 flex flex-col justify-between gap-1">
                          <div className="flex justify-between items-start gap-1">
                            <div>
                              <span className="text-[11px] font-extrabold text-[#141414]">{link.label}</span>
                              <span className="ml-2 inline-block px-1 py-0.2 text-[8px] font-mono uppercase bg-[#D6D5D1] text-[#141414] font-bold border border-[#141414]/30">{link.category}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedLink(link.id)}
                              className="text-[#141414]/40 hover:text-red-700 p-0.5 cursor-pointer"
                              title="Delete link"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {link.description && <p className="text-[9px] text-[#141414]/70 font-sans italic">{link.description}</p>}
                          <div className="text-[9px] font-mono text-[#141414]/60 truncate select-all">{link.url}</div>
                          <div className="flex gap-2.5 mt-1 border-t border-[#141414]/10 pt-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(link.url);
                                alert("Copied partner link: " + link.url);
                              }}
                              className="text-[9px] font-mono text-[#141414] underline font-bold hover:text-[#F27D26] flex items-center gap-0.5 cursor-pointer"
                            >
                              <Copy className="w-2.5 h-2.5" /> Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAffiliateForm(prev => ({ ...prev, affiliateLink: link.url }));
                                alert(`Inserted URL into Affiliate Campaign form link field: ${link.url}`);
                              }}
                              className="text-[9px] font-mono text-[#F27D26] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Select Link
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Interactive Dynamic Campaign Link UTM Builder */}
                <div className="bg-[#E4E3E0] border-2 border-[#141414] p-4 rounded-none brutalist-shadow-sm select-none">
                  <div className="flex items-center justify-between pb-2 border-b border-[#141414]/15">
                    <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#F27D26]" /> Campaign UTM Parameter Link Builder
                    </span>
                    <span className="bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5 text-[8.5px] font-mono font-bold uppercase">Dynamic Tracker</span>
                  </div>

                  <p className="text-[9.5px] text-[#141414]/70 mt-2 font-sans leading-relaxed">
                    Convert any standard partner URL into a hyper-targeted UTM campaign link. Easily identify which platform, post, or banner produces your affiliate sales in Google Analytics.
                  </p>

                  <div className="mt-3 flex flex-col gap-2.5 bg-[#F5F4F0] p-3 border border-[#141414]/20">
                    <div>
                      <label className="block text-[8.5px] font-mono uppercase font-bold text-[#141414]/80 mb-1">Base Affiliate URL</label>
                      <input
                        type="text"
                        placeholder="https://shop.auraring.com/partner-deal?ref=gemmaAI"
                        value={linkBuilder.baseUrl}
                        onChange={e => setLinkBuilder({ ...linkBuilder, baseUrl: e.target.value })}
                        className="w-full text-[10px] p-2 bg-white border border-[#141414] focus:outline-none focus:bg-[#E4E3E0] font-mono rounded-none text-[#141414]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8.5px] font-mono uppercase font-bold text-[#141414]/80 mb-1">Campaign Source (utm_source)</label>
                        <select
                          value={linkBuilder.source}
                          onChange={e => setLinkBuilder({ ...linkBuilder, source: e.target.value })}
                          className="w-full text-[10px] p-2 bg-white border border-[#141414] focus:outline-none focus:bg-[#E4E3E0] font-mono rounded-none font-bold text-[#141414]"
                        >
                          <option value="twitter">X / Twitter</option>
                          <option value="linkedin">LinkedIn</option>
                          <option value="facebook">Facebook</option>
                          <option value="gemma_landing">Gemma Landing Page</option>
                          <option value="newsletter">Email Newsletter</option>
                          <option value="other">Other/Custom Tag</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8.5px] font-mono uppercase font-bold text-[#141414]/80 mb-1">Campaign Medium (utm_medium)</label>
                        <input
                          type="text"
                          placeholder="social"
                          value={linkBuilder.medium}
                          onChange={e => setLinkBuilder({ ...linkBuilder, medium: e.target.value })}
                          className="w-full text-[10px] p-2 bg-white border border-[#141414] focus:outline-none focus:bg-[#E4E3E0] font-mono rounded-none text-[#141414]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="col-span-1">
                        <label className="block text-[8.5px] font-mono uppercase font-bold text-[#141414]/80 mb-1">Campaign Name (utm_campaign)</label>
                        <input
                          type="text"
                          placeholder="gemma_promotions"
                          value={linkBuilder.campaign}
                          onChange={e => setLinkBuilder({ ...linkBuilder, campaign: e.target.value })}
                          className="w-full text-[9.5px] p-1.5 bg-white border border-[#141414] focus:outline-none focus:bg-[#E4E3E0] font-mono rounded-none text-[#141414]"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="block text-[8.5px] font-mono uppercase font-bold text-[#141414]/80 mb-1">Ad Content (utm_content)</label>
                        <input
                          type="text"
                          placeholder="thread_post_1"
                          value={linkBuilder.content}
                          onChange={e => setLinkBuilder({ ...linkBuilder, content: e.target.value })}
                          className="w-full text-[9.5px] p-1.5 bg-white border border-[#141414] focus:outline-none focus:bg-[#E4E3E0] font-mono rounded-none text-[#141414]"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="block text-[8.5px] font-mono uppercase font-bold text-[#141414]/80 mb-1">Affiliate SubID (aff_sub)</label>
                        <input
                          type="text"
                          placeholder="gemma_ref"
                          value={linkBuilder.subId}
                          onChange={e => setLinkBuilder({ ...linkBuilder, subId: e.target.value })}
                          className="w-full text-[9.5px] p-1.5 bg-white border border-[#141414] focus:outline-none focus:bg-[#E4E3E0] font-mono rounded-none text-[#141414]"
                        />
                      </div>
                    </div>

                    <div className="mt-2 border-t border-[#141414]/15 pt-2">
                      <label className="block text-[8.5px] font-mono uppercase font-extrabold text-[#141414]/90 mb-1">Live Formulated Tracking Link Preview</label>
                      <div className="bg-white p-2 border border-[#141414] font-mono text-[9.5px] text-emerald-800 break-all select-all font-bold min-h-[36px]">
                        {(() => {
                          if (!linkBuilder.baseUrl) return "Please enter a base URL above...";
                          try {
                            const urlObj = new URL(linkBuilder.baseUrl);
                            if (linkBuilder.source) urlObj.searchParams.set("utm_source", linkBuilder.source);
                            if (linkBuilder.medium) urlObj.searchParams.set("utm_medium", linkBuilder.medium);
                            if (linkBuilder.campaign) urlObj.searchParams.set("utm_campaign", linkBuilder.campaign);
                            if (linkBuilder.content) urlObj.searchParams.set("utm_content", linkBuilder.content);
                            if (linkBuilder.subId) urlObj.searchParams.set("aff_sub", linkBuilder.subId);
                            return urlObj.toString();
                          } catch (e) {
                            let base = linkBuilder.baseUrl;
                            const params = [];
                            if (linkBuilder.source) params.push(`utm_source=${encodeURIComponent(linkBuilder.source)}`);
                            if (linkBuilder.medium) params.push(`utm_medium=${encodeURIComponent(linkBuilder.medium)}`);
                            if (linkBuilder.campaign) params.push(`utm_campaign=${encodeURIComponent(linkBuilder.campaign)}`);
                            if (linkBuilder.content) params.push(`utm_content=${encodeURIComponent(linkBuilder.content)}`);
                            if (linkBuilder.subId) params.push(`aff_sub=${encodeURIComponent(linkBuilder.subId)}`);
                            if (params.length === 0) return base;
                            const junction = base.includes("?") ? "&" : "?";
                            return base + junction + params.join("&");
                          }
                        })()}
                      </div>
                    </div>

                    <div className="flex gap-2.5 mt-1 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const url = (() => {
                            if (!linkBuilder.baseUrl) return "";
                            try {
                              const urlObj = new URL(linkBuilder.baseUrl);
                              if (linkBuilder.source) urlObj.searchParams.set("utm_source", linkBuilder.source);
                              if (linkBuilder.medium) urlObj.searchParams.set("utm_medium", linkBuilder.medium);
                              if (linkBuilder.campaign) urlObj.searchParams.set("utm_campaign", linkBuilder.campaign);
                              if (linkBuilder.content) urlObj.searchParams.set("utm_content", linkBuilder.content);
                              if (linkBuilder.subId) urlObj.searchParams.set("aff_sub", linkBuilder.subId);
                              return urlObj.toString();
                            } catch (e) {
                              let base = linkBuilder.baseUrl;
                              const params = [];
                              if (linkBuilder.source) params.push(`utm_source=${encodeURIComponent(linkBuilder.source)}`);
                              if (linkBuilder.medium) params.push(`utm_medium=${encodeURIComponent(linkBuilder.medium)}`);
                              if (linkBuilder.campaign) params.push(`utm_campaign=${encodeURIComponent(linkBuilder.campaign)}`);
                              if (linkBuilder.content) params.push(`utm_content=${encodeURIComponent(linkBuilder.content)}`);
                              if (linkBuilder.subId) params.push(`aff_sub=${encodeURIComponent(linkBuilder.subId)}`);
                              if (params.length === 0) return base;
                              const junction = base.includes("?") ? "&" : "?";
                              return base + junction + params.join("&");
                            }
                          })();
                          if (!url) {
                            alert("Please formulate a valid URL first.");
                            return;
                          }
                          navigator.clipboard.writeText(url);
                          alert("📋 Copied custom UTM tracking URL successfully!");
                        }}
                        className="bg-white text-[#141414] hover:bg-[#141414] hover:text-white px-3 py-1.5 text-[9.5px] uppercase font-mono font-bold border border-[#141414] transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Copy className="w-2.5 h-2.5" /> Copy Campaign Link
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const url = (() => {
                            if (!linkBuilder.baseUrl) return "";
                            try {
                              const urlObj = new URL(linkBuilder.baseUrl);
                              if (linkBuilder.source) urlObj.searchParams.set("utm_source", linkBuilder.source);
                              if (linkBuilder.medium) urlObj.searchParams.set("utm_medium", linkBuilder.medium);
                              if (linkBuilder.campaign) urlObj.searchParams.set("utm_campaign", linkBuilder.campaign);
                              if (linkBuilder.content) urlObj.searchParams.set("utm_content", linkBuilder.content);
                              if (linkBuilder.subId) urlObj.searchParams.set("aff_sub", linkBuilder.subId);
                              return urlObj.toString();
                            } catch (e) {
                              let base = linkBuilder.baseUrl;
                              const params = [];
                              if (linkBuilder.source) params.push(`utm_source=${encodeURIComponent(linkBuilder.source)}`);
                              if (linkBuilder.medium) params.push(`utm_medium=${encodeURIComponent(linkBuilder.medium)}`);
                              if (linkBuilder.campaign) params.push(`utm_campaign=${encodeURIComponent(linkBuilder.campaign)}`);
                              if (linkBuilder.content) params.push(`utm_content=${encodeURIComponent(linkBuilder.content)}`);
                              if (linkBuilder.subId) params.push(`aff_sub=${encodeURIComponent(linkBuilder.subId)}`);
                              if (params.length === 0) return base;
                              const junction = base.includes("?") ? "&" : "?";
                              return base + junction + params.join("&");
                            }
                          })();
                          if (!url) {
                            alert("Please formulate a valid URL first.");
                            return;
                          }
                          setAffiliateForm(prev => ({ ...prev, affiliateLink: url }));
                          alert("🎯 Applied tracking link to Affiliate Post generation form field successfully!");
                        }}
                        className="bg-[#F27D26] text-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] px-3 py-1.5 text-[9.5px] uppercase font-mono font-bold border border-[#141414] transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Select for Copy
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-[#F5F4F0] border-2 border-[#141414] p-5 rounded-none brutalist-shadow block">
                  <h3 className="font-serif italic font-extrabold text-[#141414] text-base tracking-tight mb-4 flex items-center justify-between">
                    <span>Affiliate Campaign Generator</span>
                    <span className="text-[9px] bg-[#141414] text-[#E4E3E0] px-1.5 font-mono font-bold uppercase">PROD-OS</span>
                  </h3>

                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase">Product / Service Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Fitbit Tracker or Apex Cloud Services"
                        value={affiliateForm.productName}
                        onChange={e => setAffiliateForm({ ...affiliateForm, productName: e.target.value })}
                        className="w-full text-xs py-2.5 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] placeholder-[#141414]/40 focus:outline-none focus:bg-[#E4E3E0]/20 font-sans font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase">Description & Key Selling Points</label>
                      <textarea
                        rows={4}
                        placeholder="Write down core features, user benefits, specs, or promo details..."
                        value={affiliateForm.productDescription}
                        onChange={e => setAffiliateForm({ ...affiliateForm, productDescription: e.target.value })}
                        className="w-full text-xs py-2 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] placeholder-[#141414]/40 focus:outline-none focus:bg-[#E4E3E0]/20 font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase">Affiliate Link</label>
                        <input
                          type="text"
                          placeholder="e.g. https://brand.pxf.io/..."
                          value={affiliateForm.affiliateLink}
                          onChange={e => setAffiliateForm({ ...affiliateForm, affiliateLink: e.target.value })}
                          className="w-full text-[11px] py-2 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] placeholder-[#141414]/40 focus:outline-none focus:bg-[#E4E3E0]/20 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase">Price/Deals</label>
                        <input
                          type="text"
                          placeholder="e.g. $49 (20% off)"
                          value={affiliateForm.price}
                          onChange={e => setAffiliateForm({ ...affiliateForm, price: e.target.value })}
                          className="w-full text-xs py-2 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] placeholder-[#141414]/40 focus:outline-none focus:bg-[#E4E3E0]/20 font-sans"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase">Target Keywords (Comma Separated)</label>
                      <input
                        type="text"
                        placeholder="Fitbit, smart ring, health track, fitness discount"
                        value={affiliateForm.keywords}
                        onChange={e => setAffiliateForm({ ...affiliateForm, keywords: e.target.value })}
                        className="w-full text-[11px] py-2 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] placeholder-[#141414]/40 focus:outline-none focus:bg-[#E4E3E0]/20 font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase">Platform Layout</label>
                        <select
                          value={affiliateForm.platform}
                          onChange={e => setAffiliateForm({ ...affiliateForm, platform: e.target.value as any })}
                          className="w-full text-[11px] py-2 px-2.5 bg-white border-2 border-[#141414] rounded-none text-[#141414] font-bold focus:outline-none"
                        >
                          <option value="X / Twitter">X / Twitter</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="Facebook">Facebook</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase">Conversion Tone</label>
                        <select
                          value={affiliateForm.tone}
                          onChange={e => setAffiliateForm({ ...affiliateForm, tone: e.target.value as any })}
                          className="w-full text-[11px] py-2 px-2.5 bg-white border-2 border-[#141414] rounded-none text-[#141414] font-bold focus:outline-none"
                        >
                          <option value="Engaging">Engaging Hooks</option>
                          <option value="Professional">Professional Review</option>
                          <option value="FOMO/Urgent">FOMO / High Alert</option>
                          <option value="Casual/Storytelling">Storytelling</option>
                          <option value="Feature Focus">Feature Deep Dive</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase">Structure Style</label>
                      <select
                        value={affiliateForm.style}
                        onChange={e => setAffiliateForm({ ...affiliateForm, style: e.target.value as any })}
                        className="w-full text-[11px] py-2 px-2.5 bg-white border-2 border-[#141414] rounded-none text-[#141414] font-bold focus:outline-none"
                      >
                        <option value="Standard Post">Standard Post (with high CTR hook)</option>
                        <option value="Thread Format">Indie Hacker Thread Structure</option>
                        <option value="Hook & Bullet Points">Hook & Pro/Con Bullet Points</option>
                        <option value="Comparison Style">Comparison Challenge Format</option>
                      </select>
                    </div>

                    <button
                      onClick={generateAffiliatePost}
                      disabled={isGeneratingPost}
                      className="w-full py-3 px-4 bg-[#141414] text-[#E4E3E0] hover:bg-[#F27D26] hover:text-[#141414] disabled:opacity-50 rounded-none font-mono font-bold text-xs uppercase shadow-none tracking-wider border-2 border-[#141414] transition-all cursor-pointer select-none flex items-center justify-center gap-2 brutalist-shadow-sm"
                    >
                      {isGeneratingPost ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating from Model...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Draft Affiliate Post with {connection.provider === "local" ? "Local Gemma" : "Gemini Cloud"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Output Preview Block */}
              <div className="xl:col-span-7 flex flex-col gap-6">
                
                {/* Visual Social Frame Mockups */}
                <div className="bg-[#F5F4F0] border-2 border-[#141414] p-5 rounded-none brutalist-shadow flex-1 flex flex-col min-h-[460px]">
                  <div className="flex items-center justify-between border-b-2 border-[#141414] pb-3 mb-4 select-none">
                    <span className="text-xs font-mono text-[#141414] uppercase tracking-wider font-extrabold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-[#F27D26] rounded-full animate-ping"></span> Live Social Rendering Engine
                    </span>

                    <div className="flex gap-2">
                      {generatedPost && (
                        <button
                          onClick={copyPostText}
                          className="bg-[#141414] border-2 border-[#141414] hover:bg-[#F5F4F0] hover:text-[#141414] p-2 text-[#E4E3E0] transition-all flex items-center gap-1.5 text-xs font-mono font-bold uppercase rounded-none"
                        >
                          {copiedPost ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedPost ? "Copied" : "Copy Post"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isGeneratingPost ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                      <Cpu className="w-12 h-12 text-[#141414] animate-spin mb-4" />
                      <p className="font-serif italic font-extrabold text-[#141414] text-base">Synthesizing Copywriting Weights</p>
                      <p className="text-xs text-[#141414]/70 mt-1.5 font-mono max-w-sm">
                        Request has been dispatched to {connection.provider === "local" ? `local model '${connection.localModelName}'` : "server Gemini cloud engine."}
                      </p>
                    </div>
                  ) : generatedPost ? (
                    <div className="flex-1 flex flex-col gap-4">
                      
                      {/* Social Frame Layout Selection */}
                      <div className="p-2 border border-[#141414] bg-[#D6D5D1] text-[11px] font-mono text-[#141414] font-bold flex items-center justify-between rounded-none">
                        <span>FORMAT: CHARACTER-RICH MARKDOWN / COPY</span>
                        <span className="bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5 rounded-none text-[9px] uppercase font-bold">
                          {affiliateForm.platform}
                        </span>
                      </div>

                      {/* Mockup Renderer based on platform */}
                      <div className="flex-1 overflow-y-auto max-h-[400px] border-2 border-[#141414] bg-[#E4E3E0] p-5 rounded-none relative">
                        {affiliateForm.platform === "X / Twitter" && (
                          <div className="flex gap-3 bg-white border-2 border-[#141414] p-4 rounded-none">
                            <div className="w-10 h-10 rounded-none bg-[#141414] text-[#E4E3E0] flex items-center justify-center font-bold shrink-0 text-sm border-2 border-[#141414] uppercase">
                              G
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-[#141414] text-xs">Gemma Affiliate Assistant</span>
                                <span className="text-[#F27D26] text-xs font-mono">✔️</span>
                                <span className="text-[#141414]/60 text-xs font-mono">@gemma_post</span>
                                <span className="text-[#141414]/40 text-xs font-mono">• Just now</span>
                              </div>
                              <div className="text-[#141414] text-xs mt-2 leading-relaxed whitespace-pre-wrap select-text font-sans font-medium">
                                {generatedPost}
                              </div>
                              <div className="flex items-center justify-between text-[#141414]/60 text-xs mt-4 pt-3 border-t border-[#141414]/15 max-w-md font-mono font-bold">
                                <span className="hover:text-[#F27D26] transition-all cursor-pointer">💬 24</span>
                                <span className="hover:text-[#F27D26] transition-all cursor-pointer">🔁 68</span>
                                <span className="hover:text-[#F27D26] transition-all cursor-pointer">❤️ 1.2K</span>
                                <span className="hover:text-[#F27D26] transition-all cursor-pointer">📊 14.8K</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {affiliateForm.platform === "LinkedIn" && (
                          <div className="bg-white border-2 border-[#141414] p-4 rounded-none">
                            <div className="flex gap-3 items-center">
                              <div className="w-10 h-10 rounded-none bg-[#141414] text-[#E4E3E0] flex items-center justify-center font-bold shrink-0 text-xs border-2 border-[#141414] uppercase">
                                LM
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-[#141414] text-xs">Local Model Expert</span>
                                  <span className="bg-[#D6D5D1] text-[9px] text-[#141414] px-1 font-mono font-bold rounded-none">2nd</span>
                                </div>
                                <p className="text-[10px] text-[#141414]/70 font-mono">Marketing Automations and Affiliate Architect @ GemmaHQ</p>
                                <p className="text-[9px] text-[#141414]/50 font-mono">2m • Edited • 🌐</p>
                              </div>
                            </div>
                            <div className="text-[#141414] text-xs mt-4 leading-relaxed whitespace-pre-wrap select-text font-sans p-1">
                              {generatedPost}
                            </div>
                            <div className="flex items-center justify-between text-[#141414]/60 text-[10px] mt-6 pt-3 border-t border-[#141414]/10 font-mono font-bold">
                              <div className="flex gap-2">
                                <span>👍 150 Likes</span>
                                <span>•</span>
                                <span>💬 12 comments</span>
                              </div>
                              <span className="text-[#F27D26] font-bold">🔄 AUTOSYNDICATED</span>
                            </div>
                          </div>
                        )}

                        {affiliateForm.platform === "Facebook" && (
                          <div className="bg-white border-2 border-[#141414] p-4 rounded-none">
                            <div className="flex gap-3 items-center">
                              <div className="w-10 h-10 rounded-none bg-[#141414] text-[#E4E3E0] flex items-center justify-center font-bold shrink-0 text-xs border-2 border-[#141414] uppercase">
                                FB
                              </div>
                              <div>
                                <span className="font-bold text-[#141414] text-xs block">Premium Affiliate Automation</span>
                                <span className="text-[9px] text-[#141414]/60 font-mono font-bold">Sponsored • Paid Commissions • 👥</span>
                              </div>
                            </div>
                            <div className="text-[#141414] text-xs mt-4 leading-relaxed whitespace-pre-wrap select-text font-sans p-1">
                              {generatedPost}
                            </div>
                            <div className="flex items-center justify-between text-[#141414]/50 text-xs mt-6 pt-3 border-t border-[#141414]/10 font-mono font-bold">
                              <div className="flex gap-4">
                                <span className="hover:text-[#F27D26] cursor-pointer">👍 Like</span>
                                <span className="hover:text-[#F27D26] cursor-pointer">💬 Comment</span>
                                <span className="hover:text-[#F27D26] cursor-pointer">🔗 Share</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-[#141414]/30 rounded-none bg-[#D6D5D1]/10">
                      <FileText className="w-12 h-12 text-[#141414]/40 mb-3" />
                      <p className="font-serif italic font-extrabold text-[#141414] text-sm">No Post Formulated Yet</p>
                      <p className="text-xs text-[#141414]/70 max-w-sm mt-1 font-mono">
                        Select a fast template catalog or fill out the product inputs and hit the generation dispatch button above!
                      </p>
                    </div>
                  )}
                </div>

                {/* Affiliate Publication Scheduler widget */}
                {generatedPost && (
                  <div className="bg-[#D6D5D1] border-2 border-[#141414] p-4 rounded-none brutalist-shadow-sm select-none flex flex-col gap-2">
                    <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold flex items-center gap-1.5 pb-2 border-b border-[#141414]/15">
                      <Calendar className="w-4 h-4 text-[#F27D26]" /> Scheduler Release Dispatcher
                    </span>
                    <div className="flex flex-col sm:flex-row items-end gap-3 mt-1">
                      <div className="flex-1 w-full">
                        <label className="block text-[9px] font-mono font-bold text-[#141414] mb-1 uppercase">Date Release</label>
                        <input
                          type="date"
                          value={selectedScheduleDateTime.date}
                          onChange={e => setSelectedScheduleDateTime({ ...selectedScheduleDateTime, date: e.target.value })}
                          className="w-full text-xs p-2.5 bg-white border border-[#141414] font-mono rounded-none"
                        />
                      </div>
                      <div className="flex-1 w-full">
                        <label className="block text-[9px] font-mono font-bold text-[#141414] mb-1 uppercase">Time Release</label>
                        <input
                          type="time"
                          value={selectedScheduleDateTime.time}
                          onChange={e => setSelectedScheduleDateTime({ ...selectedScheduleDateTime, time: e.target.value })}
                          className="w-full text-xs p-2.5 bg-white border border-[#141414] font-mono rounded-none"
                        />
                      </div>
                      <button
                        onClick={() => handleSchedulePost(generatedPost, affiliateForm.productName, affiliateForm.platform)}
                        className="w-full sm:w-auto bg-[#141414] text-[#E4E3E0] hover:bg-[#F27D26] hover:text-[#141414] py-2.5 px-4 text-[10px] uppercase font-mono font-extrabold border-2 border-[#141414] transition-all cursor-pointer rounded-none select-none"
                      >
                        Queue Post
                      </button>
                    </div>
                  </div>
                )}

                {/* Scheduled Publications Registry Queue Status */}
                <div className="bg-[#F5F4F0] border-2 border-[#141414] p-4 rounded-none brutalist-shadow select-none">
                  <div className="flex items-center justify-between mb-3 border-b border-[#141414]/15 pb-2">
                    <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#F27D26]" /> Publications Queue Block ({scheduledPosts.length})
                    </span>
                  </div>

                  {scheduledPosts.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#141414]/50 font-mono">
                      No pending publications in the dispatch queue. Queue a post above!
                    </div>
                  ) : (
                    <div className="flex flex-col border border-[#141414] divide-y divide-[#141414]">
                      <div className="grid grid-cols-12 text-[9px] bg-[#141414] text-[#E4E3E0] px-3 py-2 font-mono uppercase font-bold">
                        <span className="col-span-3">Product Name</span>
                        <span className="col-span-2">Platform</span>
                        <span className="col-span-3">Release Time</span>
                        <span className="col-span-2">Queue Status</span>
                        <span className="col-span-2 text-right">Actions</span>
                      </div>
                      <div className="flex flex-col bg-white divide-y divide-[#141414]/10 max-h-56 overflow-y-auto">
                        {scheduledPosts.map(post => (
                          <div key={post.id} className="grid grid-cols-12 text-[10px] px-3 py-2.5 items-center font-mono hover:bg-[#D6D5D1]/30">
                            <span className="col-span-3 font-bold uppercase truncate pr-2 text-[#141414]">{post.productName}</span>
                            <span className="col-span-2">
                              <span className="inline-block px-1 bg-[#D6D5D1] text-[#141414] border border-[#141414]/30 text-[8px] uppercase font-extrabold">{post.platform}</span>
                            </span>
                            <span className="col-span-3 text-[#141414]/70">{post.scheduledTime}</span>
                            <span className="col-span-2">
                              {post.status === "Pending" ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-500/40 text-[9px] font-extrabold animate-pulse rounded-none">
                                  PENDING
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-500/40 text-[9px] font-extrabold rounded-none">
                                  ✓ POSTED
                                </span>
                              )}
                            </span>
                            <div className="col-span-2 text-right flex gap-1 justify-end">
                              {post.status === "Pending" && (
                                <button
                                  onClick={() => triggerPostPublicationNow(post.id)}
                                  className="text-[9px] font-bold uppercase bg-[#F27D26] text-[#141414] hover:bg-[#141414] hover:text-white px-1.5 py-0.5 border border-[#141414]/40 cursor-pointer"
                                  title="Force publish to social feed"
                                >
                                  Publish
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteScheduledPost(post.id)}
                                className="text-red-700 hover:text-red-900 p-0.5 cursor-pointer"
                                title="Cancel publication"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Local History log - High Density Technical Ledger */}
                {campaignHistory.length > 0 && (
                  <div className="bg-[#D6D5D1] border-2 border-[#141414] p-4 rounded-none brutalist-shadow select-none">
                    <div className="flex items-center justify-between mb-3 border-b border-[#141414]/15 pb-2">
                      <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-[#F27D26]" /> Local Ledger Pipeline ({campaignHistory.length})
                      </span>
                      <button
                        onClick={() => {
                          setCampaignHistory([]);
                          localStorage.removeItem("gemma_campaign_history");
                        }}
                        className="text-[#141414]/60 hover:text-red-700 text-[10px] uppercase font-mono font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear Ledger
                      </button>
                    </div>

                    <div className="flex flex-col border border-[#141414]">
                      <div className="grid grid-cols-12 text-[9px] uppercase font-mono font-extrabold tracking-tight bg-[#141414] text-[#E4E3E0] px-3 py-1.5">
                        <span className="col-span-4">PRODUCT / NICHE</span>
                        <span className="col-span-3">PLATFORM</span>
                        <span className="col-span-3 text-center">TONE</span>
                        <span className="col-span-2 text-right">ACTION</span>
                      </div>
                      <div className="flex flex-col max-h-48 overflow-y-auto bg-white font-mono text-[11px] divide-y divide-[#141414]/10">
                        {campaignHistory.map((camp) => (
                          <div
                            key={camp.id}
                            className="grid grid-cols-12 px-3 py-2.5 items-center hover:bg-[#141414] hover:text-[#E4E3E0] transition-all cursor-pointer group"
                            onClick={() => {
                              setGeneratedPost(camp.generatedPost || "");
                              setAffiliateForm({
                                productName: camp.productName,
                                productDescription: camp.productDescription,
                                affiliateLink: camp.affiliateLink,
                                price: camp.price,
                                keywords: camp.keywords,
                                platform: camp.platform as any,
                                tone: camp.tone as any,
                                style: camp.style as any
                              });
                            }}
                          >
                            <span className="col-span-4 font-bold truncate pr-3 uppercase text-[#141414] group-hover:text-inherit">{camp.productName}</span>
                            <span className="col-span-3 text-[10px] uppercase opacity-75 truncate text-[#141414] group-hover:text-inherit">{camp.platform}</span>
                            <span className="col-span-3 text-center text-[10px] uppercase text-[#F27D26] group-hover:text-[#F27D26] font-bold truncate">{camp.tone}</span>
                            <span className="col-span-2 text-right">
                              <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase bg-[#141414] text-[#E4E3E0] border border-[#141414] group-hover:bg-[#E4E3E0] group-hover:text-[#141414]">
                                LOAD
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

          {/* TAB 2: LANDING PAGE GENERATION SUITE */}
          {activeTab === "landing" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              
              {/* Form Input block */}
              <div className="xl:col-span-4 flex flex-col gap-6">
                
                {/* Template picker */}
                <div className="bg-[#D6D5D1] border-2 border-[#141414] p-4 rounded-none brutalist-shadow-sm select-none">
                  <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold flex items-center gap-1.5 pb-2 border-b border-[#141414]/15">
                    <Globe className="w-3.5 h-3.5 text-[#F27D26]" /> Quick Page Templates
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 mt-2">
                    {LANDING_TEMPLATES.map((item, id) => (
                      <button
                        key={id}
                        onClick={() => applyLandingTemplate(id)}
                        className="text-left p-2.5 rounded-none bg-[#F5F4F0] border-2 border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <p className="text-[10px] font-bold uppercase text-[#141414] group-hover:text-inherit truncate">{item.offerName}</p>
                          <p className="text-[9px] font-mono uppercase opacity-65 group-hover:text-inherit mt-0.5">{item.styleTheme}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#141414] shrink-0 group-hover:text-inherit" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Google Analytics & Campaign Tracking Integrator Panel */}
                <div className="bg-[#F5F4F0] border-2 border-[#141414] p-4 rounded-none brutalist-shadow-sm select-none">
                  <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold flex items-center gap-1.5 pb-2 border-b border-[#141414]/15">
                    <Settings className="w-3.5 h-3.5 text-[#F27D26]" /> Campaign Tracking & Analytics Injector
                  </span>
                  
                  <div className="flex flex-col gap-3 mt-3">
                    <div className="flex items-center gap-2 pb-1 bg-[#D6D5D1]/20 p-2 border border-[#141414]/20">
                      <input
                        id="injectToLandingToggle"
                        type="checkbox"
                        checked={trackingConfig.injectToLanding}
                        onChange={e => setTrackingConfig({ ...trackingConfig, injectToLanding: e.target.checked })}
                        className="w-3.5 h-3.5 accent-[#F27D26] border border-[#141414]"
                      />
                      <label htmlFor="injectToLandingToggle" className="text-[9px] uppercase font-mono font-extrabold text-[#141414] cursor-pointer">
                        Automate script tagging on compile
                      </label>
                    </div>

                    <div>
                      <label className="block text-[8.5px] font-mono uppercase font-bold text-[#141414]/80 mb-1">Google Analytics ID (GA4 ID)</label>
                      <input
                        type="text"
                        placeholder="e.g. G-G3MMA4REF"
                        value={trackingConfig.gaId}
                        onChange={e => setTrackingConfig({ ...trackingConfig, gaId: e.target.value })}
                        className="w-full text-[10px] p-2 bg-white border border-[#141414] rounded-none font-mono font-semibold text-emerald-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[8.5px] font-mono uppercase font-bold text-[#141414]/80 mb-1 border-opacity-35">Facebook Pixel ID</label>
                      <input
                        type="text"
                        placeholder="e.g. FB-884820129"
                        value={trackingConfig.fbPixelId}
                        onChange={e => setTrackingConfig({ ...trackingConfig, fbPixelId: e.target.value })}
                        className="w-full text-[10px] p-2 bg-white border border-[#141414] rounded-none font-mono text-[#141414]/75 focus:outline-none"
                      />
                    </div>

                    <div className="border-t border-[#141414]/15 pt-2">
                      <span className="text-[8.5px] font-mono uppercase font-extrabold text-[#141414]/90 block mb-1">Campaign Meta overrides (SEO)</span>
                      
                      <div className="flex flex-col gap-2 bg-[#D6D5D1]/30 p-2 border border-[#141414]/15">
                        <div>
                          <label className="block text-[8px] font-mono uppercase font-bold text-[#141414]/70 mb-0.5">Page Title Tag Override</label>
                          <input
                            type="text"
                            placeholder="Defaults to Offer Name"
                            value={trackingConfig.pageTitle}
                            onChange={e => setTrackingConfig({ ...trackingConfig, pageTitle: e.target.value })}
                            className="w-full text-[9px] p-1.5 bg-white border border-[#141414] rounded-none font-semibold text-[#141414]"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] font-mono uppercase font-bold text-[#141414]/70 mb-0.5">Page Meta Description Tag</label>
                          <input
                            type="text"
                            placeholder="Defaults to Value Prop"
                            value={trackingConfig.pageDescription}
                            onChange={e => setTrackingConfig({ ...trackingConfig, pageDescription: e.target.value })}
                            className="w-full text-[9px] p-1.5 bg-white border border-[#141414] rounded-none text-[#141414]"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] font-mono uppercase font-bold text-[#141414]/70 mb-0.5">Open Graph Preview Image URL</label>
                          <input
                            type="text"
                            placeholder="https://...image.jpg"
                            value={trackingConfig.ogImage}
                            onChange={e => setTrackingConfig({ ...trackingConfig, ogImage: e.target.value })}
                            className="w-full text-[8.5px] p-1.5 bg-white border border-[#141414] rounded-none font-mono text-[#141414]"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] font-mono uppercase font-bold text-[#141414]/70 mb-0.5">Custom Raw tags inside &lt;head&gt;</label>
                          <textarea
                            rows={2}
                            placeholder="<!-- e.g. custom meta fields -->"
                            value={trackingConfig.customHeadTags}
                            onChange={e => setTrackingConfig({ ...trackingConfig, customHeadTags: e.target.value })}
                            className="w-full text-[8.5px] p-1.5 bg-white border border-[#141414] rounded-none font-mono text-[#141414]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Landing Parameters */}
                <div className="bg-[#F5F4F0] border-2 border-[#141414] p-5 rounded-none brutalist-shadow">
                  <h3 className="font-serif italic font-extrabold text-[#141414] text-base tracking-tight mb-4 flex items-center justify-between">
                    <span>Landing Page Parameters</span>
                    <span className="text-[9px] bg-[#141414] text-[#E4E3E0] px-1.5 font-mono font-bold uppercase">PAGE-OS</span>
                  </h3>

                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold">Offer / Startup Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Fitbit Pro or HabitTracker Premium"
                        value={landingForm.offerName}
                        onChange={e => setLandingForm({ ...landingForm, offerName: e.target.value })}
                        className="w-full text-xs py-2.5 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] placeholder-[#141414]/40 focus:outline-none focus:bg-[#E4E3E0]/20 font-sans font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold">Core Value Proposition</label>
                      <textarea
                        rows={3}
                        placeholder="e.g. The definitive smart ring integration for local system analysts needing 24/7 biometric reports..."
                        value={landingForm.valueProp}
                        onChange={e => setLandingForm({ ...landingForm, valueProp: e.target.value })}
                        className="w-full text-xs py-2 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] placeholder-[#141414]/40 focus:outline-none focus:bg-[#E4E3E0]/20 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold">Primary Call-to-Action Text</label>
                      <input
                        type="text"
                        placeholder="e.g. Get Started Instantly"
                        value={landingForm.ctaText}
                        onChange={e => setLandingForm({ ...landingForm, ctaText: e.target.value })}
                        className="w-full text-xs py-2.5 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] placeholder-[#141414]/40 focus:outline-none focus:bg-[#E4E3E0]/20 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold">Major Features (Comma separated)</label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Real-time biometrics feed, Offline sqlite storage, Zero cloud fees, Low memory footprint"
                        value={landingForm.features}
                        onChange={e => setLandingForm({ ...landingForm, features: e.target.value })}
                        className="w-full text-xs py-2 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] placeholder-[#141414]/40 focus:outline-none focus:bg-[#E4E3E0]/20 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold">Target Audience</label>
                      <input
                        type="text"
                        placeholder="e.g. health conscious software developers, biohackers"
                        value={landingForm.audience}
                        onChange={e => setLandingForm({ ...landingForm, audience: e.target.value })}
                        className="w-full text-xs py-2.5 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] placeholder-[#141414]/40 focus:outline-none focus:bg-[#E4E3E0]/20 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold font-bold">Visual Design Theme</label>
                      <select
                        value={landingForm.styleTheme}
                        onChange={e => setLandingForm({ ...landingForm, styleTheme: e.target.value as any })}
                        className="w-full text-[11px] py-2 px-2.5 bg-white border-2 border-[#141414] rounded-none text-[#141414] font-bold focus:outline-none"
                      >
                        <option value="Slate SaaS">Slate SaaS (Clean dark slate + indigo buttons)</option>
                        <option value="Emerald E-Commerce">Emerald Product (Luxury dark gray + emerald green)</option>
                        <option value="Amber Creative">Amber Creative (Warmer slate + amber details)</option>
                        <option value="Midnight Premium">Midnight Cyberpunk (Deep dark + bright neon highlights)</option>
                      </select>
                    </div>

                    <button
                      onClick={generateLandingPage}
                      disabled={isGeneratingLanding}
                      className="w-full py-3 px-4 bg-[#141414] text-[#E4E3E0] hover:bg-[#F27D26] hover:text-[#141414] disabled:opacity-50 rounded-none font-mono font-bold text-xs uppercase shadow-none tracking-wider border-2 border-[#141414] transition-all cursor-pointer select-none flex items-center justify-center gap-2 brutalist-shadow-sm"
                    >
                      {isGeneratingLanding ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Weaving Landing Layout...</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-4 h-4 text-inherit" />
                          <span>Generate HTML Template</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Preview / Code Codeblock - High Density Creative Sandbox */}
              <div className="xl:col-span-8 flex flex-col gap-6">
                
                {/* Right Tab Toggle Frame */}
                <div className="bg-[#F5F4F0] border-2 border-[#141414] p-5 rounded-none brutalist-shadow flex-1 flex flex-col min-h-[550px]">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b-2 border-[#141414] pb-4 mb-4 select-none">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#141414] uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-[#F27D26]" /> Page Designer Workspace
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-[#D6D5D1] p-1 border-2 border-[#141414] rounded-none shrink-0">
                      <button
                        onClick={() => setActivePreviewTab("preview")}
                        className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold transition-all cursor-pointer ${
                          activePreviewTab === "preview" 
                            ? "bg-[#141414] text-[#E4E3E0]" 
                            : "text-[#141414] hover:bg-[#141414]/10"
                        }`}
                      >
                        Live Preview (Interactive)
                      </button>
                      <button
                        onClick={() => setActivePreviewTab("code")}
                        className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold transition-all cursor-pointer ${
                          activePreviewTab === "code" 
                            ? "bg-[#141414] text-[#E4E3E0]" 
                            : "text-[#141414] hover:bg-[#141414]/10"
                        }`}
                      >
                        Edit Source Code
                      </button>
                    </div>

                    {generatedHtml && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={copyHtmlText}
                          className="bg-[#141414] border-2 border-[#141414] hover:bg-[#F5F4F0] hover:text-[#141414] p-2 text-[#E4E3E0] transition-all flex items-center gap-1.1 text-xs font-mono font-bold uppercase rounded-none"
                        >
                          {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedHtml ? "Copied" : "Copy HTML"}</span>
                        </button>
                        <button
                          onClick={downloadHtmlFile}
                          className="bg-white border-2 border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] p-2 text-[#141414] transition-all flex items-center gap-1 text-xs font-mono font-bold uppercase rounded-none"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>index.html</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Rendering Content */}
                  {isGeneratingLanding ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
                      <RefreshCw className="w-12 h-12 text-[#141414] animate-spin mb-4" />
                      <p className="font-serif italic font-extrabold text-[#141414] text-base">Weaving Digital Real Estate</p>
                      <p className="text-xs text-[#141414]/70 mt-1.5 font-mono max-w-sm">
                        Assembling page structure, writing inline responsive frameworks, and adding custom call-to-action handlers.
                      </p>
                    </div>
                  ) : generatedHtml ? (
                    <div className="flex-1 flex flex-col gap-4">
                      
                      {activePreviewTab === "preview" ? (
                        <div className="flex-1 border-2 border-[#141414] rounded-none bg-white overflow-hidden min-h-[420px] relative">
                          <iframe
                            className="w-full h-full min-h-[420px] bg-slate-950"
                            srcDoc={landingHtmlEditor || generatedHtml}
                            title="Landing Page Live Render"
                            sandbox="allow-scripts"
                          />
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col gap-2">
                           <div className="p-2 border-2 border-[#141414] bg-[#D6D5D1] text-[10px] font-mono text-[#141414] font-bold rounded-none">
                            ⚠️ MANUAL SOURCE COMPILER INDESTRUCTIBLES: You can make styling updates and CTA modifications directly below. Changes apply to the simulation in real-time.
                          </div>
                          <textarea
                            rows={15}
                            value={landingHtmlEditor}
                            onChange={(e) => setLandingHtmlEditor(e.target.value)}
                            className="w-full h-full min-h-[380px] p-4 bg-white border-2 border-[#141414] rounded-none font-mono text-xs text-[#141414] focus:outline-none focus:bg-[#E4E3E0]/10 leading-relaxed font-bold overflow-y-auto"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-[#141414]/30 rounded-none bg-[#D6D5D1]/10 select-none">
                      <Globe className="w-12 h-12 text-[#141414]/40 mb-3" />
                      <p className="font-serif italic font-extrabold text-[#141414] text-sm">No Landing Page Synthesized</p>
                      <p className="text-xs text-[#141414]/70 max-w-sm mt-1 font-mono">
                        Select a recommended page preset or type in your value proposition parameters and click generate!
                      </p>
                    </div>
                  )}
                </div>

                {/* Local Landing History logs - High Density Ledger */}
                {landingHistory.length > 0 && (
                  <div className="bg-[#D6D5D1] border-2 border-[#141414] p-4 rounded-none brutalist-shadow select-none">
                    <div className="flex items-center justify-between mb-3 border-b border-[#141414]/15 pb-2">
                      <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-[#F27D26]" /> Page Design Repositories ({landingHistory.length})
                      </span>
                      <button
                        onClick={() => {
                          setLandingHistory([]);
                          localStorage.removeItem("gemma_landing_history");
                        }}
                        className="text-[#141414]/60 hover:text-red-700 text-[10px] uppercase font-mono font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear Repos
                      </button>
                    </div>

                    <div className="flex flex-col border border-[#141414]">
                      <div className="grid grid-cols-12 text-[9px] uppercase font-mono font-extrabold tracking-tight bg-[#141414] text-[#E4E3E0] px-3 py-1.5">
                        <span className="col-span-5">CAMPAIGN OFFER</span>
                        <span className="col-span-5">DESIGN VISUAL THEME</span>
                        <span className="col-span-2 text-right">ACTION</span>
                      </div>
                      <div className="flex flex-col max-h-48 overflow-y-auto bg-white font-mono text-[11px] divide-y divide-[#141414]/10">
                        {landingHistory.map((ltem) => (
                          <div
                            key={ltem.id}
                            className="grid grid-cols-12 px-3 py-2.5 items-center hover:bg-[#141414] hover:text-[#E4E3E0] transition-all cursor-pointer group"
                            onClick={() => {
                              setGeneratedHtml(ltem.generatedHtml || "");
                              setLandingHtmlEditor(ltem.generatedHtml || "");
                              setLandingForm({
                                offerName: ltem.offerName,
                                valueProp: ltem.valueProp,
                                ctaText: ltem.ctaText,
                                features: ltem.features,
                                audience: ltem.audience,
                                styleTheme: ltem.styleTheme as any
                              });
                            }}
                          >
                            <span className="col-span-5 font-bold uppercase truncate pr-3 text-[#141414] group-hover:text-inherit">{ltem.offerName}</span>
                            <span className="col-span-5 text-[10px] uppercase text-[#F27D26] group-hover:text-[#F27D26] font-bold truncate">{ltem.styleTheme}</span>
                            <span className="col-span-2 text-right">
                              <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase bg-[#141414] text-[#E4E3E0] border border-[#141414] group-hover:bg-[#E4E3E0] group-hover:text-[#141414]">
                                RESTORE
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Simulated Conversion Subscriber Leads Database */}
                <div className="bg-[#F5F4F0] border-2 border-[#141414] p-4 rounded-none brutalist-shadow select-none mt-6">
                  <div className="flex items-center justify-between mb-3 border-b border-[#141414]/15 pb-2">
                    <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-[#F27D26]" /> Subscriber Leads database (Conversion Ledger)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={exportCapturedLeadsCsv}
                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold px-2 py-0.5 text-[9px] uppercase border border-emerald-950 flex items-center gap-1 cursor-pointer"
                        title="Download Leads Spreadsheet"
                      >
                        <Download className="w-2.5 h-2.5" /> CSV Export
                      </button>
                      <span className="bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase">{capturedLeads.length} Subscriber Conversions</span>
                    </div>
                  </div>

                  <p className="text-[9.5px] text-[#141414]/70 mb-3 font-sans leading-relaxed">
                    Captured from forms in the Iframe Simulator preview in real-time. Feel free to fill out the email signup box inside your live-compiled template and submit! Leads are instantly cataloged below.
                  </p>

                  <div className="flex flex-col border border-[#141414]">
                    <div className="grid grid-cols-12 text-[9px] uppercase font-mono font-extrabold bg-[#141414] text-[#E4E3E0] px-3 py-1.5">
                      <span className="col-span-4">Email Address</span>
                      <span className="col-span-3">Subscriber Name</span>
                      <span className="col-span-3">Offer Source Origin</span>
                      <span className="col-span-2 text-right">Delete</span>
                    </div>

                    <div className="flex flex-col max-h-48 overflow-y-auto bg-white font-mono text-[11px] divide-y divide-[#141414]/10">
                      {capturedLeads.length === 0 ? (
                        <p className="text-center py-6 text-[10px] text-[#141414]/40 italic">No subscriber signups recorded yet. Try submitting the signup form in the active preview iframe!</p>
                      ) : (
                        capturedLeads.map((lead) => (
                          <div key={lead.id} className="grid grid-cols-12 px-3 py-2 items-center hover:bg-[#D6D5D1]/30 transition-all text-[#141414]">
                            <span className="col-span-4 font-bold select-all truncate pr-2 text-emerald-800">{lead.email}</span>
                            <span className="col-span-3 text-[10px] font-sans font-medium text-[#141414]/90 truncate">{lead.name}</span>
                            <span className="col-span-3 text-[9px] text-[#141414]/65 truncate">{lead.offerName}</span>
                            <span className="col-span-2 text-right">
                              <button
                                onClick={() => {
                                  setCapturedLeads(prev => prev.filter(l => l.id !== lead.id));
                                }}
                                className="text-[#141414]/40 hover:text-red-700 p-1 cursor-pointer inline-block"
                                title="Remove subscriber"
                              >
                                <Trash2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: OLLAMA setup assistant */}
          {activeTab === "connection" && (
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
              
              {/* Main setup helper */}
              <div className="bg-[#F5F4F0] border-2 border-[#141414] p-6 rounded-none brutalist-shadow select-none">
                <div className="flex items-center gap-3 border-b-2 border-[#141414] pb-4 mb-6">
                  <Terminal className="w-6 h-6 text-[#F27D26]" />
                  <div>
                    <h2 className="font-serif italic font-extrabold text-lg text-[#141414]">Local Gemma Connection & CORS Configuration</h2>
                    <p className="text-[10px] uppercase text-[#141414]/60 font-mono font-bold">Ollama Port mapping and runtime environmental settings</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Left Side settings change */}
                  <div className="flex flex-col gap-5 bg-[#D6D5D1] p-5 rounded-none border-2 border-[#141414]">
                    <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold">
                      Connection Parameters
                    </span>

                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold">API Endpoint Address</label>
                      <input
                        type="text"
                        value={connection.localEndpoint}
                        onChange={(e) => setConnection({ ...connection, localEndpoint: e.target.value })}
                        className="w-full text-xs py-2.5 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] font-mono focus:outline-none focus:bg-[#E4E3E0]/25 font-bold"
                        placeholder="http://localhost:11434/api/generate"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold">Local Model Reference Name</label>
                      <input
                        type="text"
                        value={connection.localModelName}
                        onChange={(e) => setConnection({ ...connection, localModelName: e.target.value })}
                        className="w-full text-xs py-2.5 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] font-mono focus:outline-none focus:bg-[#E4E3E0]/25 font-bold"
                        placeholder="gemma2.5 or gemma:2b"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={testLocalOllamaConnection}
                        disabled={isTestingLocal}
                        className="w-full py-2.5 px-4 bg-[#141414] text-[#E4E3E0] hover:bg-[#F27D26] hover:text-[#141414] font-bold text-xs rounded-none transition-all flex items-center justify-center gap-2 border-2 border-[#141414] font-mono uppercase cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingLocal ? "animate-spin" : ""}`} />
                        <span>{isTestingLocal ? "Pinging Endpoint..." : "Test Local Host Response"}</span>
                      </button>
                    </div>

                    {connection.isConnected === true && (
                      <div className="p-3 bg-emerald-100 border-2 border-emerald-600 text-emerald-800 text-xs font-mono font-bold rounded-none">
                        ✅ Success: Connected to local model endpoint!
                      </div>
                    )}

                    {connection.isConnected === false && (
                      <div className="p-3 bg-red-100 border-2 border-red-600 text-red-800 text-xs font-mono font-bold rounded-none flex flex-col gap-1">
                        <span className="font-extrabold uppercase">❌ Connection Blocked</span>
                        <span>This port could not be verified directly. Ensure Ollama service is active & CORS is set up correctly.</span>
                      </div>
                    )}
                  </div>

                  {/* Right Side guide instructions */}
                  <div className="flex flex-col gap-4 font-mono text-xs">
                    <span className="text-[10px] text-[#141414] uppercase tracking-wider font-extrabold">
                      CORS & Security Settings Guide
                    </span>

                    <p className="text-[#141414] leading-relaxed font-sans text-xs">
                      Because this suite is run securely over HTTPS, your browser's strict <b>CORS policies</b> will block any request to <code>http://localhost:11434</code> unless Ollama is explicitly told to permit connections.
                    </p>

                    <p className="text-[#141414]/80 leading-relaxed font-bold uppercase text-[10px] tracking-tight">
                      To make your local model accessible to this interface, run Ollama with the appropriate environment variable based on your platform:
                    </p>

                    {/* Windows Command Instructions */}
                    <div className="bg-[#D6D5D1] p-4 rounded-none border-2 border-[#141414]">
                      <span className="text-[10px] bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5 rounded-none font-mono font-extrabold">
                        WINDOWS (PowerShell)
                      </span>
                      <p className="text-[9px] font-sans text-[#141414]/85 mt-1.5">Run these as two separate commands, or separate them with a semicolon:</p>
                      <pre className="text-[11px] text-[#141414] font-mono mt-1.5 break-all whitespace-pre-wrap leading-tight bg-white border border-[#141414] p-3 rounded-none font-bold">
                        {`$env:OLLAMA_ORIGINS="*"\nollama serve`}
                      </pre>
                      <p className="text-[9px] font-sans text-[#141414]/85 mt-2">Single-line PowerShell command:</p>
                      <pre className="text-[11px] text-[#141414] font-mono mt-1 break-all whitespace-pre-wrap leading-tight bg-white border border-[#141414] p-2 rounded-none font-bold">
                        {`$env:OLLAMA_ORIGINS="*"; ollama serve`}
                      </pre>
                      <p className="text-[9px] text-[#141414]/65 font-mono mt-1">Make sure to shut down other instances of Ollama running in the background/system tray first!</p>
                    </div>

                    {/* MacOS Terminal Instructions */}
                    <div className="bg-[#D6D5D1] p-4 rounded-none border-2 border-[#141414]">
                      <span className="text-[10px] bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5 rounded-none font-mono font-extrabold">
                        MACOS (Terminal)
                      </span>
                      <pre className="text-[11px] text-[#141414] font-mono mt-2 break-all whitespace-pre-wrap leading-tight bg-white border border-[#141414] p-3 rounded-none font-bold">
                        {`OLLAMA_ORIGINS="*" ollama serve`}
                      </pre>
                      <p className="text-[9px] text-[#141414]/65 font-mono mt-1">Kill any current Ollama process, then execute in Terminal.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom MCP Servers Workspace */}
              <div className="bg-[#F5F4F0] border-2 border-[#141414] p-6 rounded-none brutalist-shadow select-none">
                <div className="flex items-center gap-3 border-b-2 border-[#141414] pb-4 mb-6">
                  <Cpu className="w-6 h-6 text-[#F27D26]" />
                  <div>
                    <h2 className="font-serif italic font-extrabold text-lg text-[#141414]">Custom Model Context Protocol (MCP) Servers</h2>
                    <p className="text-[10px] uppercase text-[#141414]/60 font-mono font-bold">Register stdio/sse local file search or service integrations</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Left Column: Register MCP */}
                  <form onSubmit={handleAddMcpServer} className="flex flex-col gap-5 bg-[#D6D5D1] p-5 rounded-none border-2 border-[#141414]">
                    <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold">
                      Add MCP Configuration
                    </span>

                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold">Server Name ID</label>
                      <input
                        type="text"
                        placeholder="e.g. gemma-filesystem-tool"
                        value={newMcp.name}
                        onChange={e => setNewMcp({ ...newMcp, name: e.target.value })}
                        className="w-full text-xs py-2.5 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] font-mono focus:outline-none focus:bg-[#E4E3E0]/25 font-bold"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold">Transport Type</label>
                        <select
                          value={newMcp.type}
                          onChange={e => setNewMcp({ ...newMcp, type: e.target.value as any })}
                          className="w-full text-xs py-2.5 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] font-mono focus:outline-none font-bold"
                        >
                          <option value="stdio">Stdio Command</option>
                          <option value="sse">SSE Endpoint URL</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold">Arguments (optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. --path /desktop"
                          value={newMcp.args}
                          onChange={e => setNewMcp({ ...newMcp, args: e.target.value })}
                          className="w-full text-xs py-2.5 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] font-mono focus:outline-none focus:bg-[#E4E3E0]/25 font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold">Exec Command or SSE Gateway Endpoint</label>
                      <input
                        type="text"
                        placeholder="e.g. npx @modelcontextprotocol/server-filesystem"
                        value={newMcp.commandOrUrl}
                        onChange={e => setNewMcp({ ...newMcp, commandOrUrl: e.target.value })}
                        className="w-full text-xs py-2.5 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] font-mono focus:outline-none focus:bg-[#E4E3E0]/25 font-bold"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-[#141414] text-[#E4E3E0] hover:bg-[#F27D26] hover:text-[#141414] font-bold text-xs rounded-none transition-all flex items-center justify-center gap-2 border-2 border-[#141414] font-mono uppercase cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Register MCP Server
                    </button>
                  </form>

                  {/* Right Column: Registered MCP Server Cards */}
                  <div className="flex flex-col gap-4">
                    <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold">
                      Active Registry Directory ({mcpServers.length})
                    </span>

                    {mcpServers.length === 0 ? (
                      <div className="p-8 border-2 border-dashed border-[#141414]/30 text-center text-xs text-[#141414]/50 font-mono">
                        No custom MCP contexts mounted. Put in parameters on the left to add search directories or database connectors!
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                        {mcpServers.map(server => (
                          <div key={server.id} className="bg-white border-2 border-[#141414] p-4 flex flex-col justify-between gap-3 brutalist-shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-mono font-bold text-xs uppercase text-[#141414]">{server.name}</h4>
                                <span className={`inline-block px-1.5 py-0.2 text-[8px] font-mono font-extrabold uppercase mt-1 border ${
                                  server.status === "connected"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-500"
                                    : "bg-amber-100 text-amber-800 border-amber-500"
                                }`}>
                                  Status: {server.status}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteMcpServer(server.id)}
                                className="text-[#141414]/40 hover:text-red-700 cursor-pointer"
                                title="Remove MCP registry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="font-mono text-[10px] text-[#141414]/70 bg-[#D6D5D1]/30 p-2 border border-[#141414]/10 rounded-none break-all whitespace-pre-wrap leading-normal">
                              <div><span className="font-bold">Command/SSE:</span> {server.commandOrUrl}</div>
                              {server.args && <div><span className="font-bold">Args:</span> {server.args}</div>}
                            </div>

                            <div className="flex justify-between items-center border-t border-[#141414]/15 pt-2.5">
                              <span className="text-[8px] font-mono opacity-50 uppercase">Type: {server.type} protocol</span>
                              <button
                                type="button"
                                onClick={() => toggleMcpServerConnection(server.id)}
                                className={`text-[10px] font-mono font-bold uppercase py-1 px-3 border border-[#141414] transition-all cursor-pointer ${
                                  server.status === "connected"
                                    ? "bg-[#141414] text-white hover:bg-red-700 hover:text-white"
                                    : "bg-[#F27D26] text-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0]"
                                }`}
                              >
                                {server.status === "connected" ? "Disconnect" : "Connect"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Custom Plugins Desk */}
              <div className="bg-[#F5F4F0] border-2 border-[#141414] p-6 rounded-none brutalist-shadow select-none">
                <div className="flex items-center gap-3 border-b-2 border-[#141414] pb-4 mb-6">
                  <Briefcase className="w-6 h-6 text-[#F27D26]" />
                  <div>
                    <h2 className="font-serif italic font-extrabold text-lg text-[#141414]">Registered Extension Plugins & API Middleware</h2>
                    <p className="text-[10px] uppercase text-[#141414]/60 font-mono font-bold">Extend landing page publishing routines with third-party automation webhooks</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Left Column: Register Plugin */}
                  <form onSubmit={handleAddCustomPlugin} className="flex flex-col gap-5 bg-[#D6D5D1] p-5 rounded-none border-2 border-[#141414]">
                    <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold">
                      Register Plugin Extension
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold">Extension Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Shopify Exporter"
                          value={newPlugin.name}
                          onChange={e => setNewPlugin({ ...newPlugin, name: e.target.value })}
                          className="w-full text-xs py-2.5 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] font-mono focus:outline-none focus:bg-[#E4E3E0]/25 font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold">Version</label>
                        <input
                          type="text"
                          placeholder="1.0.0"
                          value={newPlugin.version}
                          onChange={e => setNewPlugin({ ...newPlugin, version: e.target.value })}
                          className="w-full text-xs py-2.5 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] font-mono focus:outline-none focus:bg-[#E4E3E0]/25 font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold">Webhook URI Endpoint</label>
                      <input
                        type="text"
                        placeholder="e.g. https://api.brand.com/publish-extension"
                        value={newPlugin.endpoint}
                        onChange={e => setNewPlugin({ ...newPlugin, endpoint: e.target.value })}
                        className="w-full text-xs py-2.5 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] font-mono focus:outline-none focus:bg-[#E4E3E0]/25 font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-extrabold text-[#141414]/90 mb-1.5 uppercase font-bold">Description context notes</label>
                      <input
                        type="text"
                        placeholder="Auto export landing pages directly to Shopify store"
                        value={newPlugin.description}
                        onChange={e => setNewPlugin({ ...newPlugin, description: e.target.value })}
                        className="w-full text-xs py-2.5 px-3 bg-white border-2 border-[#141414] rounded-none text-[#141414] font-sans focus:outline-none focus:bg-[#E4E3E0]/25 font-semibold"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-[#141414] text-[#E4E3E0] hover:bg-[#F27D26] hover:text-[#141414] font-bold text-xs rounded-none transition-all flex items-center justify-center gap-2 border-2 border-[#141414] font-mono uppercase cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Initialize Plugin
                    </button>
                  </form>

                  {/* Right Column: Registered Plugin Extension lists */}
                  <div className="flex flex-col gap-4">
                    <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold">
                      Active Plugin Extensions ({customPlugins.length})
                    </span>

                    {customPlugins.length === 0 ? (
                      <div className="p-8 border-2 border-dashed border-[#141414]/30 text-center text-xs text-[#141414]/50 font-mono">
                        No custom extension hooks mounted yet. Configure on the left to activate third-party CMS exporters or media publishers!
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                        {customPlugins.map(plugin => (
                          <div key={plugin.id} className="bg-white border-2 border-[#141414] p-4 flex flex-col justify-between gap-3 brutalist-shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-mono font-bold text-xs uppercase text-[#141414]">{plugin.name} <span className="text-[9px] text-[#141414]/60 font-normal font-sans">v{plugin.version}</span></h4>
                                <span className={`inline-block px-1.5 py-0.2 text-[8px] font-mono font-extrabold uppercase mt-1 border ${
                                  plugin.status === "active"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-500"
                                    : "bg-[#D6D5D1] text-[#141414] border-gray-400"
                                }`}>
                                  Status: {plugin.status}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomPlugin(plugin.id)}
                                className="text-[#141414]/40 hover:text-red-700 cursor-pointer"
                                title="Delete extension plugin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {plugin.description && (
                              <p className="text-[10px] text-[#141414]/75 font-sans italic">{plugin.description}</p>
                            )}
                            <div className="font-mono text-[9px] text-[#141414]/60 truncate bg-[#D6D5D1]/35 p-2 border border-[#141414]/10 select-all">
                              {plugin.endpoint}
                            </div>

                            <div className="flex justify-end items-center border-t border-[#141414]/15 pt-2.5">
                              <button
                                type="button"
                                onClick={() => toggleCustomPluginActivity(plugin.id)}
                                className={`text-[10px] font-mono font-bold uppercase py-1 px-3 border border-[#141414] transition-all cursor-pointer ${
                                  plugin.status === "active"
                                    ? "bg-[#141414] text-white hover:bg-gray-700"
                                    : "bg-emerald-700 text-[#E4E3E0] hover:bg-[#141414] hover:text-[#E4E3E0]"
                                }`}
                              >
                                {plugin.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
           {/* TAB 4: THE IMPROVEMENT BLUEPRINT & AUTOMATED CO-PILOT OPERATIVE HUB */}
          {activeTab === "blueprint" && (
            <div className="max-w-6xl mx-auto flex flex-col gap-6 w-full px-2">
              
              {/* Operator Tab Piles */}
              <div className="flex gap-2.5 border-b-2 border-[#141414] pb-4">
                <button
                  onClick={() => setExecutiveViewMode("dashboard")}
                  className={`px-5 py-3 font-mono font-extrabold text-xs uppercase tracking-wide border-2 border-[#141414] transition-all cursor-pointer flex items-center gap-2 ${
                    executiveViewMode === "dashboard"
                      ? "bg-[#141414] text-[#E4E3E0] brutalist-shadow-sm"
                      : "bg-[#F5F4F0] text-[#141414] hover:bg-[#141414]/5"
                  }`}
                >
                  <Cpu className="w-4 h-4 text-[#F27D26]" />
                  Operational Hub (Live Control)
                </button>
                <button
                  onClick={() => setExecutiveViewMode("specs")}
                  className={`px-5 py-3 font-mono font-extrabold text-xs uppercase tracking-wide border-2 border-[#141414] transition-all cursor-pointer flex items-center gap-2 ${
                    executiveViewMode === "specs"
                      ? "bg-[#141414] text-[#E4E3E0] brutalist-shadow-sm"
                      : "bg-[#F5F4F0] text-[#141414] hover:bg-[#141414]/5"
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-[#F27D26]" />
                  Architecture Specs
                </button>
              </div>

              {/* VIEW 1: OPERATOR HUB (LIVE SYSTEM CONTROLLER) */}
              {executiveViewMode === "dashboard" && (
                <div className="flex flex-col gap-6">
                  
                  {/* System Overview Widgets */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border-2 border-[#141414] p-4 brutalist-shadow-xs relative">
                      <span className="text-[9px] font-mono text-[#141414]/55 uppercase font-bold block mb-1">Missions Dispatched</span>
                      <span className="text-2xl font-mono font-black text-[#141414] tracking-tight">{executiveStats?.total_goals ?? executiveGoals.length ?? 0}</span>
                      <span className="absolute right-3.5 bottom-3 text-[#141414]/20"><Plus className="w-6 h-6" /></span>
                    </div>
                    <div className="bg-[#FFFCE8] border-2 border-[#141414] p-4 brutalist-shadow-xs relative">
                      <span className="text-[9px] font-mono text-amber-950 uppercase font-bold block mb-1">Active Pipeline Jobs</span>
                      <span className="text-2xl font-mono font-black text-amber-950 tracking-tight">{executiveStats?.executing_tasks || 0}</span>
                      <span className="absolute right-3.5 bottom-3 text-[#141414]/20"><Activity className="w-6 h-6 text-[#F27D26]" /></span>
                    </div>
                    <div className="bg-[#EBFDF5] border-2 border-[#141414] p-4 brutalist-shadow-xs relative">
                      <span className="text-[9px] font-mono text-emerald-950 uppercase font-bold block mb-1">Worker Jobs Met</span>
                      <span className="text-2xl font-mono font-black text-emerald-800 tracking-tight">{executiveStats?.completed_tasks || 0}</span>
                      <span className="absolute right-3.5 bottom-3 text-[#141414]/20"><Check className="w-6 h-6" /></span>
                    </div>
                    <div className="bg-[#EBEFFF] border-2 border-[#141414] p-4 brutalist-shadow-xs relative text-[#141414]">
                      <span className="text-[9px] font-mono text-[#141414]/65 uppercase font-bold block mb-1">Active AI Operators</span>
                      <span className="text-2xl font-mono font-black text-[#141414] tracking-tight">{executiveStats?.active_agents || (executiveAgents.length || 4)}</span>
                      <span className="absolute right-3.5 bottom-3 text-[#141414]/20"><Cpu className="w-6 h-6" /></span>
                    </div>
                  </div>

                  {/* Active Warnings & Approvals */}
                  {executiveApprovals.length > 0 && (
                    <div className="bg-[#FFEFE3] border-2 border-[#141414] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex gap-3">
                        <span className="p-1.5 bg-[#F27D26] text-white border border-[#141414] font-mono font-bold text-xs select-none">!</span>
                        <div>
                          <p className="text-xs font-mono font-extrabold text-[#141414] uppercase tracking-wide">Administrative Action Needed ({executiveApprovals.length})</p>
                          <p className="text-[11px] text-[#141414]/80 mt-0.5">The autonomous worker loop is paused waiting for strategic content and permission approvals.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5 shrink-0 w-full sm:w-auto">
                        {executiveApprovals.map(req => (
                          <div key={req.id} className="flex gap-2 w-full">
                            <button
                              onClick={() => handleActionApproval(req.id, "approve")}
                              className="w-full sm:w-auto px-4 py-2 bg-emerald-700 text-white font-mono font-extrabold text-[10px] uppercase tracking-wide border border-[#141414] hover:bg-emerald-800 cursor-pointer"
                            >
                              Approve Dispatch
                            </button>
                            <button
                              onClick={() => handleActionApproval(req.id, "reject")}
                              className="w-full sm:w-auto px-4 py-2 bg-red-700 text-white font-mono font-extrabold text-[10px] uppercase tracking-wide border border-[#141414] hover:bg-red-800 cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Operational Layout Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Panel: Dispatch Mission Form */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                      
                      {/* Active AI Core Agents Grid */}
                      <div className="bg-[#D6D5D1]/45 border-2 border-[#141414] p-4">
                        <span className="text-[10px] font-mono text-[#141414] uppercase tracking-wider font-extrabold block mb-3">
                          AI Worker Registry ({executiveAgents.length || 4})
                        </span>
                        
                        <div className="flex flex-col gap-2">
                          {(executiveAgents.length > 0 ? executiveAgents : [
                            { id: "planner", name: "Strategic Planner", role: "Planning & Strategy", active: true },
                            { id: "researcher", name: "Research Analyst", role: "Competitor Scraping", active: true },
                            { id: "marketer", name: "Content Marketer", role: "Tailwind & Copy Design", active: true },
                            { id: "evaluator", name: "SEO Evaluator", role: "Analytics", active: true }
                          ]).map(agent => (
                            <div key={agent.id} className="bg-white border-2 border-[#141414] p-3 flex justify-between items-center bg-white">
                              <div>
                                <h4 className="font-mono font-extrabold text-xs uppercase flex items-center gap-1.5 text-[#141414]">
                                  {agent.name}
                                  <span className={`w-1.5 h-1.5 rounded-full ${agent.active ? "bg-emerald-600 animate-pulse" : "bg-gray-400"}`} />
                                </h4>
                                <span className="text-[9px] font-mono text-[#141414]/65 uppercase tracking-tight block">{agent.role}</span>
                              </div>
                              <button
                                onClick={() => handleToggleAgent(agent.id)}
                                className={`px-2 py-0.5 text-[9px] font-mono font-black border border-[#141414] transition-all cursor-pointer ${
                                  agent.active 
                                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                              >
                                {agent.active ? "Enabled" : "Disabled"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dispatch Goal Card */}
                      <div className="bg-white border-2 border-[#141414] p-5 brutalist-shadow">
                        <div className="mb-4 pb-2 border-b border-[#141414]/15">
                          <h3 className="font-mono font-extrabold text-xs uppercase tracking-wide text-[#141414] flex items-center gap-2">
                            <Zap className="w-4 h-4 text-[#F27D26]" /> Define Operational Goal
                          </h3>
                        </div>

                        <form onSubmit={handleDispatchGoal} className="flex flex-col gap-4">
                          <div>
                            <label className="block text-[9px] font-mono font-extrabold text-[#141414] uppercase tracking-wider mb-1.5 font-bold">Describe Strategic Mission</label>
                            <textarea
                              rows={2}
                              value={goalForm.description}
                              onChange={e => setGoalForm({ ...goalForm, description: e.target.value })}
                              className="w-full text-xs py-2 px-3 bg-[#F5F4F0] border-2 border-[#141414] rounded-none text-[#141414] font-sans focus:outline-none focus:bg-white font-medium"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono font-extrabold text-[#141414] uppercase tracking-wider mb-1.5 font-bold">Pipeline Targets (One per line)</label>
                            <textarea
                              rows={3}
                              value={goalForm.objectives}
                              onChange={e => setGoalForm({ ...goalForm, objectives: e.target.value })}
                              className="w-full text-xs py-2 px-3 bg-[#F5F4F0] border-2 border-[#141414] rounded-none text-[#141414] font-mono font-bold focus:outline-none focus:bg-white"
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isCreatingGoal}
                            className="w-full py-2.5 px-4 bg-[#F27D26] hover:bg-[#141414] text-[#141414] hover:text-white font-mono font-extrabold text-xs tracking-wider uppercase border-2 border-[#141414] transition-all brutalist-shadow-xs cursor-pointer flex items-center justify-center gap-2"
                          >
                            {isCreatingGoal ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Planning Pipeline...
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-[#141414] hover:fill-white" />
                                Dispatch Mission
                              </>
                            )}
                          </button>
                        </form>
                      </div>

                    </div>

                    {/* Right Panel: Plan Pipeline Actions */}
                    <div className="lg:col-span-8 flex flex-col gap-4">
                      
                      <div className="bg-[#141414] text-[#E4E3E0] p-4 border-2 border-[#141414] flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-mono text-[#F27D26] uppercase font-extrabold block font-bold">System Status: ONLINE</span>
                          <h3 className="font-serif italic font-extrabold text-white text-sm">Autonomous Task Orchestration Pipeline</h3>
                        </div>
                        <button
                          onClick={refreshExecutiveTelemetry}
                          className="p-2 bg-white/10 hover:bg-white/20 text-white border border-white/25 rounded-none cursor-pointer transition-all"
                          title="Refresh server stats"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Goal selector tab */}
                      {executiveGoals.length > 0 && (
                        <div className="flex gap-1 overflow-x-auto bg-[#F5F4F0] border-2 border-[#141414] p-1.5">
                          {executiveGoals.map(goal => (
                            <button
                              key={goal.id}
                              onClick={() => setSelectedExecutiveGoalId(goal.id)}
                              className={`px-3 py-1.5 font-mono text-[10px] uppercase font-bold text-[#141414] border shrink-0 cursor-pointer ${
                                selectedExecutiveGoalId === goal.id
                                  ? "bg-white border-[#141414] brutalist-shadow-xs"
                                  : "bg-transparent border-transparent hover:bg-white/40"
                              }`}
                            >
                              Goal {goal.id.replace("goal-", "").substring(0, 4)}: {goal.status}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Active execution plan tree */}
                      <div className="bg-white border-2 border-[#141414] p-5">
                        
                        {!selectedExecutiveGoalId ? (
                          <div className="p-12 text-center text-xs font-mono text-[#141414]/50 border-2 border-dashed border-[#141414]/25">
                            No goal dispatched yet. Set up a strategic automation goal on the left to review its corresponding agent execution sequence!
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4">
                            
                            {/* Current selected goal outline */}
                            {executiveGoals.find(g => g.id === selectedExecutiveGoalId) && (
                              <div className="bg-[#D6D5D1]/25 border-l-4 border-[#F27D26] p-3">
                                <span className="text-[9px] font-mono text-[#141414]/65 uppercase font-black block">Active Goal Context ({selectedExecutiveGoalId})</span>
                                <p className="text-xs font-serif italic font-extrabold text-[#141414] mt-1 capitalize leading-relaxed">
                                  "{executiveGoals.find(g => g.id === selectedExecutiveGoalId)?.description}"
                                </p>
                              </div>
                            )}

                            {/* D3 Dependency tree visualizer */}
                            {activeExecutivePlan && activeExecutivePlan.tasks && activeExecutivePlan.tasks.length > 0 && (
                              <TaskDependencyTree
                                tasks={activeExecutivePlan.tasks}
                                onExecuteTask={handleExecuteTask}
                                isExecutingTask={isExecutingTask}
                              />
                            )}

                            {/* Plan tasks breakdown list */}
                            <div className="flex flex-col gap-3">
                              <span className="text-[10px] font-mono uppercase font-black text-[#141414] block">Execution Blueprint Plan Tasks:</span>
                              
                              {(!activeExecutivePlan || !activeExecutivePlan.tasks || activeExecutivePlan.tasks.length === 0) ? (
                                <div className="p-6 bg-[#F5F4F0] border-2 border-dashed border-[#141414]/15 rounded-none text-center text-xs font-mono text-[#141414]/55">
                                  No planner execution steps returned. Run the goal daemon to formulate tasks.
                                </div>
                              ) : (
                                <div className="flex flex-col gap-3">
                                  {activeExecutivePlan.tasks.map((task: any, idx: number) => {
                                    const running = isExecutingTask[task.id];
                                    const hasResult = taskExecutionResults[task.id];
                                    
                                    return (
                                      <div key={task.id} className="border-2 border-[#141414] bg-[#F5F4F0] p-4 flex flex-col gap-3 brutalist-shadow-xs">
                                        
                                        <div className="flex justify-between items-start gap-3">
                                          <div>
                                            <span className="text-[9px] font-mono text-[#141414]/60 uppercase font-bold">Step {idx + 1} — {task.type}</span>
                                            <h4 className="font-mono font-extrabold text-xs uppercase text-[#141414] mt-0.5">{task.description}</h4>
                                          </div>
                                          
                                          <span className={`inline-block px-2 py-0.5 text-[8px] font-mono font-extrabold border uppercase ${
                                            task.status === "completed"
                                              ? "bg-emerald-100 text-emerald-800 border-emerald-500"
                                              : task.status === "failed"
                                              ? "bg-red-100 text-red-800 border-red-500"
                                              : task.status === "executing"
                                              ? "bg-amber-100 text-amber-800 border-amber-500 animate-pulse"
                                              : "bg-white text-[#141414]/80 border-gray-400"
                                          }`}>
                                            {task.status}
                                          </span>
                                        </div>

                                        {/* Task parameters */}
                                        {task.parameters && Object.keys(task.parameters).length > 0 && (
                                          <div className="bg-white border p-2 text-[9px] font-mono text-[#141414]/75 select-all overflow-x-auto max-w-full">
                                            Params: {JSON.stringify(task.parameters, null, 1)}
                                          </div>
                                        )}

                                        {/* Trigger control */}
                                        <div className="flex justify-between items-center border-t border-[#141414]/10 pt-3 mt-1.5/10">
                                          <span className="text-[9px] font-mono text-[#141414]/55">Assigned Agent: <b className="uppercase text-[#141414]">{task.assigned_agent || "strategic-planner"}</b></span>
                                          
                                          <button
                                            onClick={() => handleExecuteTask(task.id)}
                                            disabled={running || task.status === "completed"}
                                            className={`px-3 py-1 font-mono text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
                                              task.status === "completed"
                                                ? "bg-emerald-100 border-emerald-500 text-emerald-950 opacity-70"
                                                : running
                                                ? "bg-[#141414] text-white border-[#141414]"
                                                : "bg-[#141414] text-white hover:bg-[#F27D26] hover:text-[#141414] border-[#141414]"
                                            }`}
                                          >
                                            {running ? (
                                              <>
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                                Running Job...
                                              </>
                                            ) : task.status === "completed" ? (
                                              <>
                                                <Check className="w-3 h-3 text-emerald-700 font-extrabold" />
                                                Completed Run
                                              </>
                                            ) : (
                                              <>
                                                <Zap className="w-3 h-3 text-[#F27D26]" />
                                                Trigger Job Run
                                              </>
                                            )}
                                          </button>
                                        </div>

                                        {/* Display result */}
                                        {hasResult && (
                                          <div className="bg-white border-2 border-[#141414] p-3 text-[10px] font-mono leading-relaxed mt-2 text-[#141414]">
                                            <span className="text-[9px] text-[#F27D26] uppercase font-bold block border-b pb-1 mb-2">📥 Worker Response Output Payload</span>
                                            <pre className="overflow-x-auto max-h-48 break-words select-all whitespace-pre-wrap">
                                              {JSON.stringify(hasResult.result, null, 2)}
                                            </pre>
                                          </div>
                                        )}

                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                            </div>

                          </div>
                        )}

                      </div>

                      {/* Stream Live Logs */}
                      <div className="bg-white border-2 border-[#141414] p-5">
                        <span className="text-[10px] font-mono uppercase font-black text-[#141414] block mb-3">Live Log Stream (Telemetry logs):</span>
                        
                        <div className="bg-[#141414] text-[#E4E3E0] p-4 text-[10px] font-mono h-60 overflow-y-auto flex flex-col gap-2 rounded-none border-2 border-[#141414]">
                          {executiveLogs.map((log, idx) => (
                            <div key={idx} className="flex gap-2.5 items-start leading-relaxed font-bold border-b border-white/5 pb-1">
                              <span className="text-[#F27D26] shrink-0 font-normal">[{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "00:00:00"}]</span>
                              <span className={`px-1 text-[8px] border shrink-0 ${
                                log.level === "WARNING" || log.level === "ERROR"
                                  ? "bg-red-900 border-red-500 text-red-200"
                                  : "bg-emerald-950 border-emerald-500 text-emerald-200"
                              }`}>{log.level}</span>
                              <span className="text-white shrink-0">[{log.component}]</span>
                              <span className="text-white/80 shrink-1">{log.message || log.logs}</span>
                            </div>
                          ))}
                          <div className="text-white/30 text-[9px] mt-1 italic text-center">--- End of real-time server stream queue ---</div>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* VIEW 2: ORIGINAL ARCHITECTURE SPECS MANUAL */}
              {executiveViewMode === "specs" && (
                <div className="bg-[#F5F4F0] border-2 border-[#141414] p-6 rounded-none brutalist-shadow relative overflow-hidden select-none">
                  
                  <div className="flex items-center gap-3 border-b-2 border-[#141414] pb-4 mb-6">
                    <BookOpen className="w-6 h-6 text-[#F27D26]" />
                    <div>
                      <h2 className="font-serif italic font-extrabold text-lg text-[#141414]">Interface Improvement & Local Automation Blueprint</h2>
                      <p className="text-[10px] uppercase text-[#141414]/60 font-mono font-bold">Modernizing static assets into a high-concurrency automated publishing machine</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 text-[#141414] text-xs leading-relaxed font-sans font-semibold">
                    
                    {/* Proposal Summary */}
                    <div className="bg-[#D6D5D1] p-5 rounded-none border-2 border-[#141414]">
                      <h3 className="font-mono font-extrabold text-sm text-[#141414] mb-2 flex items-center gap-2 uppercase tracking-wide font-bold">
                        <Zap className="w-4 h-4 text-[#F27D26]" />
                        Executive Objective: From Client Static to Automated System
                      </h3>
                      <p className="text-xs text-[#141414]/90 leading-relaxed font-sans font-medium">
                        Your current local file <code className="bg-white px-1 py-0.5 border border-[#141414] font-bold">file:///C:/Windows/System32/GEMMA_INTERFACE.html</code> operates as a static client presentation layer. To automate affiliate posting and build landing pages seamlessly on your device, we propose creating custom <b>node-cron workflows</b> and <b>local static file-system hooks</b> that invoke your local Gemma backend fully offline.
                      </p>
                    </div>

                    {/* Architecture Plan */}
                    <div className="font-mono">
                      <h3 className="font-serif italic font-extrabold text-[#141414] text-base mb-3 leading-tight font-bold">
                        Phase 1: Automated Affiliate Dispatch Pipeline
                      </h3>
                      <p className="text-xs text-[#141414]/80 mb-3 font-sans">
                        Instead of copy-pasting, execute a background scheduler that reads a local inventory ledger, queries your local Gemma model for optimized post variations, and appends them to automated publishing brokers.
                      </p>

                      <div className="bg-white p-4 rounded-none border-2 border-[#141414]">
                        <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#141414]/10">
                          <span className="text-[9px] font-mono text-[#F27D26] uppercase font-extrabold block font-bold">
                            POST_AUTOMATOR.JS (Local Daemon Process)
                          </span>
                        </div>
                        <pre className="text-[11px] text-[#141414] font-mono overflow-x-auto leading-relaxed max-h-72 bg-[#F5F4F0] p-3 rounded-none font-bold">
{`const fetch = require('node-fetch');
const cron = require('node-cron');
const fs = require('fs');

// Your local product spreadsheet or JSON database
const products = [
  { name: "Aura Smart Ring 2", desc: "Monitors HRV & cardio trends.", link: "https://shop.auraring.com" },
  { name: "Apex Coffee Club", desc: "Fresh flame roast coffee.", link: "https://apexcoffee.co" }
];

async function generateWithLocalGemma(product) {
  const prompt = \`Write an engaging, high conversion Twitter affiliate post promoting \${product.name}. Description: \${product.desc}. Affiliate Link: \${product.link}. Include hashtags and direct action CTAs.\`;
  
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma2',
        prompt: prompt,
        stream: false
      })
    });
    const data = await res.json();
    return data.response;
  } catch (err) {
    console.error("Local Gemma offline!", err);
  }
}

// Automatically execute a post formulation every morning at 08:30 AM
cron.schedule('30 8 * * *', async () => {
  const activeProduct = products[Math.floor(Math.random() * products.length)];
  console.log(\`Formulating automation for \${activeProduct.name}...\keys\`);
  
  const optimizedCopy = await generateWithLocalGemma(activeProduct);
  
  fs.appendFileSync('conversions_log.txt', \`\\n[POST AD - \${new Date().toISOString()}]\\n\${optimizedCopy}\\n\`);
  console.log("Post formulating written into localized catalog safely!");
});`}
                        </pre>
                      </div>
                    </div>

                    {/* Landing Pages Roadmap */}
                    <div>
                      <h3 className="font-serif italic font-extrabold text-[#141414] text-base mb-3 leading-tight font-bold">
                        Phase 2: Local Static Auto-Generated Page Distribution
                      </h3>
                      <p className="text-xs text-[#141414]/80 mb-3 leading-relaxed">
                        To deploy Gemma-built landing assets instantaneously, run a delivery listener on your machine that maps custom path directories directly to your localized template compilation suite.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[11px] text-[#141414]/90 select-none font-bold">
                        <div className="p-3 bg-white border-2 border-[#141414] rounded-none">
                          <span className="text-[#F27D26] font-extrabold block mb-1 uppercase text-[10px]">1. Generate Path</span>
                          Sub-folders like <code>/dist/aura-ring</code> are written directly by your file generators dynamically.
                        </div>
                        <div className="p-3 bg-white border-2 border-[#141414] rounded-none">
                          <span className="text-[#F27D26] font-extrabold block mb-1 uppercase text-[10px]">2. Listen Host</span>
                          A light delivery daemon shares files over port <code>8080</code> for local cross-device test views instantly.
                        </div>
                        <div className="p-3 bg-white border-2 border-[#141414] rounded-none">
                          <span className="text-[#F27D26] font-extrabold block mb-1 uppercase text-[10px]">3. Deploy Publish</span>
                          A simple sync hook dispatches generated code updates straight to standard deployment pipelines on commit.
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}                  </div>

                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Main Status Footer bar */}
      <footer className="bg-[#141414] text-[#E4E3E0] py-4 px-6 border-t-2 border-[#141414] font-mono text-[10px] flex flex-col sm:flex-row items-center justify-between gap-2 uppercase tracking-wide select-none">
        <div className="flex items-center gap-2">
          <span>© Gemma Workstation Suite — High Density Swiss OS v1.2</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Active Provider: <b className="text-[#F27D26] uppercase">{connection.provider === "local" ? "Local Ollama Gemma" : "Cloud Gemini Safe Mode"}</b></span>
        </div>
      </footer>

    </div>
  );
}
