import React, { useEffect, useState } from "react";
import { 
  googleSignIn, 
  logout, 
  getAccessToken 
} from "../lib/firebase";
import { User } from "firebase/auth";
import { 
  Cloud, 
  RefreshCw, 
  Trash2, 
  FileText, 
  Globe, 
  Folder, 
  FolderPlus, 
  Plus, 
  ExternalLink, 
  Check, 
  LogOut,
  FolderOpen,
  ArrowRight,
  Sparkles,
  Search,
  Upload,
  Info
} from "lucide-react";

interface GoogleDriveExplorerProps {
  currentPost?: string;
  currentPostName?: string;
  currentHtml?: string;
  currentHtmlName?: string;
  onImportHtml?: (html: string) => void;
  onImportPost?: (post: string) => void;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink?: string;
}

export function GoogleDriveExplorer({
  currentPost = "",
  currentPostName = "",
  currentHtml = "",
  currentHtmlName = "",
  onImportHtml,
  onImportPost
}: GoogleDriveExplorerProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(true);
  
  // Drive interaction states
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileFilter, setFileFilter] = useState<"all" | "text" | "html" | "folder">("all");
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [isReadingContent, setIsReadingContent] = useState(false);

  // New item creation states
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [customFileTitle, setCustomFileTitle] = useState("");
  const [customFileContent, setCustomFileContent] = useState("");
  const [customFileType, setCustomFileType] = useState<"text/plain" | "text/html">("text/plain");
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: string; success: boolean | null; msg: string }>({
    type: "",
    success: null,
    msg: ""
  });

  // Track Auth state
  useEffect(() => {
    // Check if user is already signed in on component mount
    const checkAuthStatus = async () => {
      const accessToken = await getAccessToken();
      if (accessToken) {
        setToken(accessToken);
        setNeedsAuth(false);
        // Try listing files immediately
        fetchDriveFiles(accessToken);
      }
    };
    checkAuthStatus();
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setNeedsAuth(false);
        fetchDriveFiles(res.accessToken);
      }
    } catch (err: any) {
      console.error("Sign-in failed:", err);
      alert(`Google Sign-In failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to sign out from Google Drive?");
    if (!confirmLogout) return;

    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setFiles([]);
      setSelectedFile(null);
      setFileContent("");
    } catch (err: any) {
      console.error("Logout failed:", err);
    }
  };

  // Fetch Google Drive Files
  const fetchDriveFiles = async (accessToken: string | null = token) => {
    const activeToken = accessToken || token;
    if (!activeToken) return;

    setIsFetchingFiles(true);
    try {
      // Fetch up to 50 files from Google Drive
      // mimeType formats: 'application/vnd.google-apps.folder', 'text/plain', 'text/html'
      const response = await fetch(
        "https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&q=trashed=false",
        {
          headers: {
            Authorization: `Bearer ${activeToken}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired
          setNeedsAuth(true);
          setToken(null);
          return;
        }
        throw new Error(`Drive fetch returned status ${response.status}`);
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err: any) {
      console.error("Error fetching drive files:", err);
    } finally {
      setIsFetchingFiles(false);
    }
  };

  // View details/read file contents
  const handleReadFileContent = async (file: DriveFile) => {
    setSelectedFile(file);
    setFileContent("");

    if (file.mimeType === "application/vnd.google-apps.folder") {
      setFileContent("[Directory / Folder Container]");
      return;
    }

    if (!token) return;
    setIsReadingContent(true);

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const text = await response.text();
        setFileContent(text);
      } else {
        setFileContent(`[Unable to load direct file text. Status: ${response.status}]`);
      }
    } catch (err: any) {
      setFileContent(`Error loading data: ${err.message}`);
    } finally {
      setIsReadingContent(false);
    }
  };

  // Delete a Drive File (MANDATORY User Confirmation)
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    const userConfirmed = window.confirm(
      `⚠️ WARNING: Are you sure you want to delete "${fileName}" from Google Drive?\n\nThis action cannot be undone and will delete the file permanently!`
    );
    if (!userConfirmed) return;

    if (!token) return;

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        alert(`Successfully deleted "${fileName}"!`);
        if (selectedFile?.id === fileId) {
          setSelectedFile(null);
          setFileContent("");
        }
        fetchDriveFiles();
      } else {
        throw new Error(`Failed to delete file. Server returned ${response.status}`);
      }
    } catch (err: any) {
      alert(`Delete Error: ${err.message}`);
    }
  };

  // Create folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !token) return;

    setIsCreatingFolder(true);
    try {
      const response = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          mimeType: "application/vnd.google-apps.folder"
        })
      });

      if (response.ok) {
        alert(`Folder "${newFolderName}" created successfully!`);
        setNewFolderName("");
        fetchDriveFiles();
      } else {
        throw new Error(`Folder creation failed.`);
      }
    } catch (err: any) {
      alert(`Error creating folder: ${err.message}`);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Save current active generated elements to Google Drive
  const handleSaveActiveToDrive = async (type: "post" | "html") => {
    const filename = type === "post" ? currentPostName || "Gemma_Affiliate_Post.txt" : currentHtmlName || "Gemma_Landing_Page.html";
    const content = type === "post" ? currentPost : currentHtml;
    const mimeType = type === "post" ? "text/plain" : "text/html";

    if (!content) {
      alert("No generated content exists to save! Please generate some work first.");
      return;
    }

    const userConfirm = window.confirm(
      `Do you want to save "${filename}" directly to your Google Drive?`
    );
    if (!userConfirm) return;

    if (!token) {
      alert("Authentication token expired. Please re-authenticate.");
      setNeedsAuth(true);
      return;
    }

    setSaveStatus({ type, success: null, msg: "Saving file..." });

    try {
      // We do a simple multipart upload or classic upload
      const metadata = {
        name: filename,
        mimeType: mimeType
      };

      const form = new FormData();
      form.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
      );
      form.append("file", new Blob([content], { type: mimeType }));

      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: form
        }
      );

      if (response.ok) {
        setSaveStatus({
          type,
          success: true,
          msg: `Successfully saved "${filename}" !`
        });
        fetchDriveFiles();
        setTimeout(() => setSaveStatus({ type: "", success: null, msg: "" }), 5000);
      } else {
        throw new Error(`Google Drive API returned status ${response.status}`);
      }
    } catch (err: any) {
      setSaveStatus({
        type,
        success: false,
        msg: `Failed to save: ${err.message}`
      });
    }
  };

  // Submit custom quick file creation
  const handleCreateCustomFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFileTitle.trim() || !customFileContent.trim() || !token) {
      alert("Both Title and Content are required.");
      return;
    }

    setIsCreatingFile(true);
    try {
      const metadata = {
        name: customFileTitle.trim() + (customFileType === "text/html" ? ".html" : ".txt"),
        mimeType: customFileType
      };

      const form = new FormData();
      form.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
      );
      form.append("file", new Blob([customFileContent], { type: customFileType }));

      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: form
        }
      );

      if (response.ok) {
        alert("File custom saved to Drive!");
        setCustomFileTitle("");
        setCustomFileContent("");
        fetchDriveFiles();
      } else {
        throw new Error("API call failed.");
      }
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsCreatingFile(false);
    }
  };

  // Filter and search
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (fileFilter === "all") return true;
    if (fileFilter === "folder") return file.mimeType === "application/vnd.google-apps-folder";
    if (fileFilter === "text") return file.mimeType === "text/plain";
    if (fileFilter === "html") return file.mimeType === "text/html";
    return true;
  });

  const getFormatSize = (sizeStr?: string) => {
    if (!sizeStr) return "N/A";
    const bytes = parseInt(sizeStr, 10);
    if (isNaN(bytes)) return sizeStr;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/vnd.google-apps-folder") {
      return <Folder className="w-5 h-5 text-amber-500" />;
    }
    if (mimeType === "text/html") {
      return <Globe className="w-5 h-5 text-indigo-500" />;
    }
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  // Google sign in button
  const renderSignInButton = () => (
    <div className="flex flex-col items-center justify-center p-12 bg-white border-4 border-[#141414] brutalist-shadow-lg max-w-lg mx-auto my-8">
      <div className="w-16 h-16 bg-[#F27D26]/20 rounded-full flex items-center justify-center mb-4 border-2 border-[#141414]">
        <Cloud className="w-8 h-8 text-[#F27D26]" />
      </div>
      <h2 className="text-xl font-mono font-black uppercase text-center mb-2 tracking-tight">
        Connect Google Drive Storage
      </h2>
      <p className="text-sm text-[#141414]/70 font-sans text-center mb-6 leading-relaxed">
        Sync your campaign documents, list existing files, save generated posts, and publish custom landing pages to Google Drive directly with absolute control and permission.
      </p>

      {/* Button styled to match Google Material specifications directly as requested in skill */}
      <button 
        onClick={handleLogin} 
        disabled={isLoading}
        className="gsi-material-button brutalist-shadow-xs border-2 border-[#141414] cursor-pointer hover:bg-gray-50 flex items-center justify-center w-full max-w-xs"
        style={{
          backgroundColor: "white",
          borderRadius: "0px",
          color: "#1f1f1f",
          fontFamily: "'Roboto', arial, sans-serif",
          fontSize: "14px",
          fontWeight: "500",
          height: "44px",
          letterSpacing: "0.25px",
          padding: "0 12px",
          position: "relative",
          textAlign: "center",
          transition: "background-color .218s, border-color .218s, box-shadow .218s"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
          <div style={{ marginRight: "12px", display: "flex", alignItems: "center" }}>
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: "18px", height: "18px" }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          </div>
          <span style={{ fontWeight: "700" }}>
            {isLoading ? "Connecting to Google..." : "Sign in with Google"}
          </span>
        </div>
      </button>
    </div>
  );

  if (needsAuth) {
    return renderSignInButton();
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      
      {/* LEFT BLOCK: CLOUD STORAGE MANAGEMENT CONTROL PANEL (cols 4) */}
      <div className="xl:col-span-4 flex flex-col gap-6">
        
        {/* Profile Card */}
        <div className="bg-white border-2 border-[#141414] p-5 brutalist-shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-[#F27D26] border-2 border-[#141414] font-mono font-bold text-white flex items-center justify-center text-lg shadow-sm">
              G
            </div>
            <div>
              <p className="font-mono font-black text-xs uppercase text-[#141414] tracking-tight">Active Connection</p>
              <p className="text-[10px] font-mono text-[#141414]/70">Drive Scope Active</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 hover:bg-rose-550 border-2 border-[#141414] text-[#141414] font-mono font-bold uppercase text-[9px] brutalist-shadow-xs transition-all cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            Disconnect
          </button>
        </div>

        {/* Sync Local Work Area */}
        <div className="bg-white border-2 border-[#141414] p-5 brutalist-shadow-xs flex flex-col gap-4">
          <h3 className="font-mono font-black uppercase text-xs text-[#141414] border-b pb-2 border-[#141414]/10 flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-[#F27D26]" />
            Local Work Export
          </h3>
          <p className="text-[11px] font-sans text-[#141414]/75">
            Export the campaign copy and HTML websites built by Gemma directly to your cloud.
          </p>

          <div className="flex flex-col gap-3">
            {/* Export Post */}
            <div className="border border-[#141414]/15 bg-[#F9F8F6] p-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-extrabold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 border border-amber-300">
                    Active Copy Draft
                  </span>
                  <p className="text-xs font-mono font-bold mt-1 text-ellipsis overflow-hidden whitespace-nowrap max-w-[200px]">
                    {currentPostName || "Gemma_Affiliate_Post.txt"}
                  </p>
                </div>
                {currentPost && (
                  <button
                    onClick={() => handleSaveActiveToDrive("post")}
                    disabled={saveStatus.type === "post" && saveStatus.success === null}
                    className="flex items-center gap-1 bg-[#F27D26] text-white border-2 border-[#141414] px-2.5 py-1 font-mono text-[9px] font-black uppercase brutalist-shadow-xs hover:translate-x-[1px] hover:translate-y-[1px] hover:brutalist-shadow-none transition-all cursor-pointer"
                  >
                    Save
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              {!currentPost && (
                <p className="text-[10px] font-mono text-gray-400 italic">No post has been generated yet</p>
              )}
              {saveStatus.type === "post" && (
                <div className={`text-[10px] font-mono mt-1 ${saveStatus.success ? "text-emerald-700 font-bold" : "text-rose-600"}`}>
                  {saveStatus.msg}
                </div>
              )}
            </div>

            {/* Export HTML page */}
            <div className="border border-[#141414]/15 bg-[#F9F8F6] p-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-extrabold uppercase bg-blue-100 text-blue-800 px-1.5 py-0.5 border border-blue-300">
                    Active Landing Page
                  </span>
                  <p className="text-xs font-mono font-bold mt-1 text-ellipsis overflow-hidden whitespace-nowrap max-w-[200px]">
                    {currentHtmlName || "Gemma_Landing_Page.html"}
                  </p>
                </div>
                {currentHtml && (
                  <button
                    onClick={() => handleSaveActiveToDrive("html")}
                    disabled={saveStatus.type === "html" && saveStatus.success === null}
                    className="flex items-center gap-1 bg-[#F27D26] text-white border-2 border-[#141414] px-2.5 py-1 font-mono text-[9px] font-black uppercase brutalist-shadow-xs hover:translate-x-[1px] hover:translate-y-[1px] hover:brutalist-shadow-none transition-all cursor-pointer"
                  >
                    Save
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              {!currentHtml && (
                <p className="text-[10px] font-mono text-gray-400 italic">No landing page has been generated yet</p>
              )}
              {saveStatus.type === "html" && (
                <div className={`text-[10px] font-mono mt-1 ${saveStatus.success ? "text-emerald-700 font-bold" : "text-rose-600"}`}>
                  {saveStatus.msg}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Directory Creator */}
        <form onSubmit={handleCreateFolder} className="bg-white border-2 border-[#141414] p-5 brutalist-shadow-xs flex flex-col gap-3">
          <h3 className="font-mono font-black uppercase text-xs text-[#141414] border-b pb-2 border-[#141414]/10 flex items-center gap-1.5">
            <FolderPlus className="w-4 h-4 text-[#F27D26]" />
            New Folder Directory
          </h3>
          <div>
            <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Folder Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Wellness Campaigns"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full bg-white border-2 border-[#141414] px-3 py-1.5 font-mono text-xs focus:bg-[#FFF] outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isCreatingFolder}
            className="w-full bg-white hover:bg-[#141414] hover:text-[#E4E3E0] transition-all border-2 border-[#141414] py-2 font-mono text-xs font-black uppercase brutalist-shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {isCreatingFolder ? "Creating..." : "Create Directory"}
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {/* Custom Quick File Uploader */}
        <form onSubmit={handleCreateCustomFile} className="bg-white border-2 border-[#141414] p-5 brutalist-shadow-xs flex flex-col gap-3">
          <h3 className="font-mono font-black uppercase text-xs text-[#141414] border-b pb-2 border-[#141414]/10 flex items-center gap-1.5">
            <FolderOpen className="w-4 h-4 text-[#F27D26]" />
            Create Notepad File
          </h3>
          <div>
            <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">File Title</label>
            <input
              type="text"
              required
              placeholder="e.g. competitor_product_notes"
              value={customFileTitle}
              onChange={(e) => setCustomFileTitle(e.target.value)}
              className="w-full bg-white border-2 border-[#141414] px-3 py-1.5 font-mono text-xs outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">File Format</label>
            <select
              value={customFileType}
              onChange={(e) => setCustomFileType(e.target.value as any)}
              className="w-full bg-white border-2 border-[#141414] px-3 py-1.5 font-mono text-xs outline-none"
            >
              <option value="text/plain">Plain Text (.txt)</option>
              <option value="text/html">HTML Webpage (.html)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Contents</label>
            <textarea
              required
              rows={3}
              placeholder="Write or copy-paste plain text codes..."
              value={customFileContent}
              onChange={(e) => setCustomFileContent(e.target.value)}
              className="w-full bg-white border-2 border-[#141414] p-2.5 font-mono text-xs outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isCreatingFile}
            className="w-full bg-[#141414] text-[#E4E3E0] hover:bg-[#F27D26] hover:text-[#141414] transition-all border-2 border-[#141414] py-2 font-mono text-xs font-black uppercase brutalist-shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {isCreatingFile ? "Uploading File..." : "Deposit File to Cloud"}
          </button>
        </form>

      </div>

      {/* RIGHT BLOCK: INTERACTIVE STORAGE FILE CONSOLE (cols 8) */}
      <div className="xl:col-span-8 flex flex-col gap-6">
        
        {/* Sync Controls & List Filter Header */}
        <div className="bg-white border-2 border-[#141414] p-4 brutalist-shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex bg-[#E4E3E0] border-2 border-[#141414] p-0.5 w-full md:w-auto">
            <button
              onClick={() => setFileFilter("all")}
              className={`px-3 py-1 font-mono text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                fileFilter === "all" ? "bg-[#141414] text-[#E4E3E0]" : "text-[#141414] hover:bg-[#141414]/10"
              }`}
            >
              All Files
            </button>
            <button
              onClick={() => setFileFilter("text")}
              className={`px-3 py-1 font-mono text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                fileFilter === "text" ? "bg-[#141414] text-[#E4E3E0]" : "text-[#141414] hover:bg-[#141414]/10"
              }`}
            >
              <FileText className="w-3 h-3" />
              Texts
            </button>
            <button
              onClick={() => setFileFilter("html")}
              className={`px-3 py-1 font-mono text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                fileFilter === "html" ? "bg-[#141414] text-[#E4E3E0]" : "text-[#141414] hover:bg-[#141414]/10"
              }`}
            >
              <Globe className="w-3 h-3" />
              HTML
            </button>
            <button
              onClick={() => setFileFilter("folder")}
              className={`px-3 py-1 font-mono text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                fileFilter === "folder" ? "bg-[#141414] text-[#E4E3E0]" : "text-[#141414] hover:bg-[#141414]/10"
              }`}
            >
              <Folder className="w-3 h-3" />
              Folders
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <Search className="w-3.5 h-3.5 text-[#141414]/50 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search drive names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F5F4F0] border-2 border-[#141414] pl-8 pr-3 py-1 text-xs font-mono outline-none"
              />
            </div>

            <button
              onClick={() => fetchDriveFiles()}
              disabled={isFetchingFiles}
              className="bg-white hover:bg-[#F27D26] hover:text-[#141414] transition-all border-2 border-[#141414] px-3 py-1 font-mono text-[10px] font-black uppercase brutalist-shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingFiles ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Files Browser Panel */}
        <div className="bg-white border-2 border-[#141414] p-5 brutalist-shadow-xs min-h-[300px] flex flex-col">
          <h2 className="font-mono font-black uppercase text-sm tracking-tight border-b-2 border-[#141414] pb-2.5 mb-4 flex items-center justify-between">
            <span>Root Cloud Workspace ({filteredFiles.length} listed)</span>
            <span className="text-xs font-normal opacity-50 font-mono">auth: gdrive</span>
          </h2>

          {isFetchingFiles && files.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#141414] border-t-transparent mb-3" />
              <p className="font-mono text-xs text-gray-500 uppercase tracking-wider animate-pulse">
                Fetching cloud database...
              </p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <Cloud className="w-12 h-12 text-gray-300 mb-2.5" />
              <p className="font-mono font-bold text-xs uppercase text-gray-500">
                No matching cloud elements discovered
              </p>
              <p className="text-[11px] text-gray-400 mt-1 max-w-sm">
                Ensure you have documents in your Google Drive or deposit your local copy files to populate drive.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {filteredFiles.map((file) => (
                <div 
                  key={file.id}
                  onClick={() => handleReadFileContent(file)}
                  className={`border-2 p-3.5 cursor-pointer flex flex-col justify-between transition-all group ${
                    selectedFile?.id === file.id 
                    ? "bg-[#F27D26]/10 border-[#F27D26] brutalist-shadow-none translate-x-[2px] translate-y-[2px]" 
                    : "bg-white border-[#141414] hover:bg-[#F27D26]/5 brutalist-shadow-xs"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-[#E4E3E0] border border-[#141414]/30">
                      {getFileIcon(file.mimeType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-black text-xs text-[#141414] leading-tight break-all truncate group-hover:text-[#F27D26]">
                        {file.name}
                      </p>
                      <p className="text-[9px] font-mono text-[#141414]/60 uppercase mt-1">
                        {file.mimeType === "application/vnd.google-apps-folder" ? "Directory" : file.mimeType}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[#141414]/10 mt-3 pt-2.5 flex items-center justify-between text-[9px] font-mono">
                    <span className="text-[#141414]/50">
                      {new Date(file.modifiedTime).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="bg-[#E4E3E0] px-1 border border-[#141414]/20">
                        {getFormatSize(file.size)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file.id, file.name);
                        }}
                        className="p-1 hover:bg-rose-100 border border-transparent hover:border-[#141414] text-rose-600 transition-all cursor-pointer"
                        title="Delete source file from Google Drive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Selected File Details / Code viewer and Importer Panel */}
        {selectedFile && (
          <div className="bg-white border-2 border-[#141414] p-5 brutalist-shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-[#141414] pb-3 gap-3">
              <div className="flex items-center gap-2.5">
                <Info className="w-5 h-5 text-[#F27D26]" />
                <div>
                  <h3 className="font-mono font-black uppercase text-xs">
                    Cloud Inspector
                  </h3>
                  <p className="text-[10px] font-mono font-bold text-gray-500 break-all">
                    ID: {selectedFile.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 z-10 w-full sm:w-auto justify-end">
                {selectedFile.webViewLink && (
                  <a
                    href={selectedFile.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-amber-100 border-2 border-[#141414] text-[#141414] font-mono font-bold uppercase text-[9px] brutalist-shadow-xs transition-all cursor-pointer"
                  >
                    Open Link
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                {/* Import Buttons */}
                {selectedFile.mimeType === "text/html" && onImportHtml && fileContent && (
                  <button
                    onClick={() => {
                      onImportHtml(fileContent);
                      alert("Successfully imported template code straight into Landing Form editor!");
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 border-2 border-[#141414] text-[#141414] font-mono font-bold uppercase text-[9px] brutalist-shadow-xs transition-all cursor-pointer"
                  >
                    Import Landing HTML
                    <Check className="w-3 h-3" />
                  </button>
                )}

                {selectedFile.mimeType === "text/plain" && onImportPost && fileContent && (
                  <button
                    onClick={() => {
                      onImportPost(fileContent);
                      alert("Successfully loaded copy text right into your main writing boards!");
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 border-2 border-[#141414] text-[#141414] font-mono font-bold uppercase text-[9px] brutalist-shadow-xs transition-all cursor-pointer"
                  >
                    Import Post Copy
                    <Check className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Display selected file metadata and text inside simple logger console */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-[#141414]/60 uppercase">
                <span>File Content Inspector</span>
                <span>Type: {selectedFile.mimeType}</span>
              </div>

              {isReadingContent ? (
                <div className="bg-gray-100 border border-[#141414]/15 p-8 text-center rounded-none font-mono text-xs animate-pulse">
                  Streaming file data from Google...
                </div>
              ) : (
                <div className="relative">
                  <pre className="bg-[#141414] text-[#C4C3C0] p-4 text-xs font-mono rounded-none max-h-56 overflow-y-auto whitespace-pre-wrap border-2 border-[#141414] scrollbar-thin">
                    {fileContent || "[Binary file format or empty document payload]"}
                  </pre>
                  {fileContent && (
                    <div className="absolute right-3.5 bottom-3 text-[9px] font-mono uppercase bg-zinc-800 text-zinc-100 px-1.5 py-0.5 border border-zinc-700">
                      Loaded payload size: {fileContent.length} chars
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
