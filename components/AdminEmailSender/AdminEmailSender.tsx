"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/use-auth";
import { auth, db, storage } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Mail,
  Zap,
  Server,
  Eye,
  Edit3,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Users,
  Plus,
  X,
  Shield,
  Layers,
  FileText,
  Clock,
  ExternalLink,
  ChevronDown,
  Info,
  Check,
  AlertCircle,
  HelpCircle,
  Copy,
  Image as ImageIcon,
  Bookmark,
  Trash2,
  ArrowRight,
  Table as TableIcon,
  Layout,
  Sliders,
  CheckSquare,
  Upload,
  Globe,
  Languages,
  BookOpen
} from "lucide-react";
import {
  PRESET_EMAIL_TEMPLATES,
  EmailTemplateConfig,
  generateFullEmailHtml,
} from "@/lib/email-templates";

interface ProviderStatus {
  resend: {
    configured: boolean;
    fromEmail: string;
    hasKey: boolean;
  };
  nodemailer: {
    configured: boolean;
    user: string;
    service: string;
  };
}

interface EmailLog {
  id: string;
  provider: "resend" | "nodemailer";
  subject: string;
  recipients: string[];
  recipientCount: number;
  success: boolean;
  messageId?: string;
  error?: string;
  fromName?: string;
  sentBy?: {
    email?: string;
    displayName?: string;
  };
  createdAt: string;
}

interface SystemUser {
  uid: string;
  email: string;
  displayName?: string;
  role?: string;
}

interface SavedTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  defaultSubject: string;
  defaultPreheader?: string;
  headerBadge?: string;
  themeColor: string;
  markdownContent: string;
  includeBanner?: boolean;
  bannerUrl?: string;
  isUrdu?: boolean;
  createdAt: string;
  createdBy?: {
    email?: string;
    displayName?: string;
  };
}

export default function AdminEmailSender() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"compose" | "history" | "config">("compose");

  // Email Config State
  const [provider, setProvider] = useState<"resend" | "nodemailer">("resend");
  const [subject, setSubject] = useState(PRESET_EMAIL_TEMPLATES[0].defaultSubject);
  const [preheader, setPreheader] = useState(PRESET_EMAIL_TEMPLATES[0].defaultPreheader);
  const [headerBadge, setHeaderBadge] = useState(PRESET_EMAIL_TEMPLATES[0].headerBadge);
  const [themeColor, setThemeColor] = useState(PRESET_EMAIL_TEMPLATES[0].themeColor);
  const [fromName, setFromName] = useState("Al-Ghazali High School");
  const [markdownContent, setMarkdownContent] = useState(PRESET_EMAIL_TEMPLATES[0].markdownContent);

  // Urdu Language & Typography Mode
  const [isUrduMode, setIsUrduMode] = useState(false);

  // Banner State (Device Storage, URL, Default)
  const [includeBanner, setIncludeBanner] = useState(false);
  const [bannerUrl, setBannerUrl] = useState("https://alghazali.vercel.app/email_data_format/333.jpg");
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Recipients State
  const [recipientMode, setRecipientMode] = useState<"manual" | "users">("manual");
  const [manualEmails, setManualEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [selectedUserEmails, setSelectedUserEmails] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Preview States
  const [viewMode, setViewMode] = useState<"split" | "editor" | "preview">("split");
  const [devicePreview, setDevicePreview] = useState<"desktop" | "mobile">("desktop");

  // Custom Saved Templates from DB
  const [customTemplates, setCustomTemplates] = useState<SavedTemplate[]>([]);
  const [templateSourceTab, setTemplateSourceTab] = useState<"presets" | "custom">("presets");
  const [saveTemplateModal, setSaveTemplateModal] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [templateCategoryInput, setTemplateCategoryInput] = useState("general");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Non-Technical Visual Design Modals
  const [btnModalOpen, setBtnModalOpen] = useState(false);
  const [btnLabel, setBtnLabel] = useState("Visit Parent Portal");
  const [btnUrl, setBtnUrl] = useState("https://alghazali.vercel.app/portal");

  const [calloutModalOpen, setCalloutModalOpen] = useState(false);
  const [calloutType, setCalloutType] = useState<"info" | "warning" | "success" | "note">("info");
  const [calloutTitle, setCalloutTitle] = useState("Important Notice");
  const [calloutBody, setCalloutBody] = useState("Please ensure timely arrival and follow all school protocols.");

  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableCols, setTableCols] = useState(["Event / Item", "Location", "Timings"]);
  const [tableRows, setTableRows] = useState([
    ["Morning Assembly", "Main Courtyard", "7:45 AM"],
    ["Orientation Session", "Auditorium Wing", "10:00 AM"],
  ]);

  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [customBannerInput, setCustomBannerInput] = useState(bannerUrl);
  const [bannerLinkInput, setBannerLinkInput] = useState("https://alghazali.vercel.app");

  // Logs & Deletion Confirmation State
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [confirmSendModal, setConfirmSendModal] = useState(false);

  // Delete Log Modal
  const [deleteLogModalOpen, setDeleteLogModalOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<EmailLog | null>(null);
  const [isClearAllLogs, setIsClearAllLogs] = useState(false);
  const [isDeletingLog, setIsDeletingLog] = useState(false);

  // Active theme colors palette
  const themeColors = [
    { label: "Teal (Brand)", value: "#0d9488" },
    { label: "Blue (Academic)", value: "#2563eb" },
    { label: "Rose (Alert)", value: "#e11d48" },
    { label: "Amber (Notice)", value: "#d97706" },
    { label: "Purple (Events)", value: "#7c3aed" },
    { label: "Slate (Formal)", value: "#334155" },
  ];

  // Auto-detect Urdu text in content
  useEffect(() => {
    if (/[\u0600-\u06FF]/.test(markdownContent) && !isUrduMode) {
      setIsUrduMode(true);
    }
  }, [markdownContent]);

  // Fetch initial info from API
  const fetchStatusAndLogs = async () => {
    try {
      setLoadingData(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/emails", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.ok) {
        setProviderStatus(data.providerStatus);
        setEmailLogs(data.logs || []);
        setCustomTemplates(data.customTemplates || []);
        if (!data.providerStatus.resend.configured && data.providerStatus.nodemailer.configured) {
          setProvider("nodemailer");
        }
      }
    } catch (err) {
      console.error("Failed to load email sender data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch registered system users from Firestore
  const fetchSystemUsers = async () => {
    if (systemUsers.length > 0) return;
    try {
      setLoadingUsers(true);
      const snap = await getDocs(collection(db, "users"));
      const users: SystemUser[] = snap.docs.map((d) => ({
        uid: d.id,
        email: d.data().email || "",
        displayName: d.data().displayName || "User",
        role: d.data().role || "user",
      })).filter(u => Boolean(u.email));
      setSystemUsers(users);
    } catch (err) {
      console.error("Failed to load users:", err);
      toast.error("Could not fetch user directory from Firestore.");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchStatusAndLogs();
  }, []);

  // Add Manual Email
  const handleAddEmail = () => {
    const trimmed = emailInput.trim();
    if (!trimmed) return;

    const items = trimmed.split(/[,;\s]+/).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const newValid: string[] = [];

    items.forEach((item) => {
      if (emailRegex.test(item)) {
        if (!manualEmails.includes(item)) {
          newValid.push(item);
        }
      } else {
        toast.error(`Invalid email format: ${item}`);
      }
    });

    if (newValid.length > 0) {
      setManualEmails([...manualEmails, ...newValid]);
      setEmailInput("");
    }
  };

  const handleRemoveEmail = (target: string) => {
    setManualEmails(manualEmails.filter((e) => e !== target));
  };

  // Toggle user selection
  const toggleUserSelection = (email: string) => {
    if (selectedUserEmails.includes(email)) {
      setSelectedUserEmails(selectedUserEmails.filter((e) => e !== email));
    } else {
      setSelectedUserEmails([...selectedUserEmails, email]);
    }
  };

  const selectAllAdmins = () => {
    const adminEmails = systemUsers
      .filter((u) => u.role === "admin" || u.role === "super_admin")
      .map((u) => u.email);
    setSelectedUserEmails(Array.from(new Set([...selectedUserEmails, ...adminEmails])));
    toast.success(`Selected ${adminEmails.length} administrators.`);
  };

  // Effective recipient list
  const activeRecipients = recipientMode === "manual" ? manualEmails : selectedUserEmails;

  // Load a preset template
  const handleSelectTemplate = (template: EmailTemplateConfig) => {
    setSubject(template.defaultSubject);
    setPreheader(template.defaultPreheader);
    setHeaderBadge(template.headerBadge);
    setThemeColor(template.themeColor);
    setMarkdownContent(template.markdownContent);
    const hasUrdu = /[\u0600-\u06FF]/.test(template.markdownContent);
    setIsUrduMode(hasUrdu);
    toast.info(`Loaded "${template.name}" template.`);
  };

  // Load a custom template from DB
  const handleSelectCustomTemplate = (template: SavedTemplate) => {
    setSubject(template.defaultSubject);
    setPreheader(template.defaultPreheader || "");
    setHeaderBadge(template.headerBadge || "OFFICIAL NOTIFICATION");
    setThemeColor(template.themeColor || "#0d9488");
    setMarkdownContent(template.markdownContent);
    if (typeof template.includeBanner === "boolean") {
      setIncludeBanner(template.includeBanner);
    }
    if (template.bannerUrl) {
      setBannerUrl(template.bannerUrl);
      setCustomBannerInput(template.bannerUrl);
    }
    if (typeof template.isUrdu === "boolean") {
      setIsUrduMode(template.isUrdu);
    }
    toast.success(`Loaded custom template "${template.name}".`);
  };

  // Save current email as a template in Firestore DB
  const handleSaveCurrentAsTemplate = async () => {
    if (!templateNameInput.trim()) {
      toast.error("Please enter a name for the template.");
      return;
    }
    if (!markdownContent.trim()) {
      toast.error("Template content cannot be empty.");
      return;
    }

    try {
      setIsSavingTemplate(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error("Authentication expired. Please log in again.");
        return;
      }

      const res = await fetch("/api/admin/emails/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: templateNameInput.trim(),
          category: templateCategoryInput,
          defaultSubject: subject,
          defaultPreheader: preheader,
          headerBadge,
          themeColor,
          markdownContent,
          includeBanner,
          bannerUrl,
          isUrdu: isUrduMode,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || "Template saved to database successfully!");
        setCustomTemplates([data.template, ...customTemplates]);
        setSaveTemplateModal(false);
        setTemplateNameInput("");
      } else {
        toast.error(data.error || "Failed to save template.");
      }
    } catch (err: any) {
      console.error("Save template error:", err);
      toast.error(err.message || "Network error while saving template.");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Delete a custom template
  const handleDeleteCustomTemplate = async (templateId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete template "${name}"?`)) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch(`/api/admin/emails/templates?id=${templateId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.ok) {
        toast.success(`Template "${name}" deleted.`);
        setCustomTemplates(customTemplates.filter((t) => t.id !== templateId));
      } else {
        toast.error(data.error || "Failed to delete template.");
      }
    } catch (err: any) {
      console.error("Delete template error:", err);
      toast.error("Error deleting template.");
    }
  };

  // Upload custom banner from device storage
  const handleDeviceBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const inputEl = e.target;

    // Check size limit (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size should be less than 10MB.");
      if (inputEl) inputEl.value = "";
      return;
    }

    setIsUploadingBanner(true);
    toast.loading("Reading banner from device...", { id: "banner-upload" });

    // Step 1: Read as data URL immediately (works instantly, no network needed)
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result as string;

      // Immediately attach the local data URL — user sees it right away
      setBannerUrl(dataUrl);
      setCustomBannerInput(dataUrl);
      setIncludeBanner(true);
      setIsUploadingBanner(false);
      if (inputEl) inputEl.value = "";
      toast.success("Banner attached from device!", { id: "banner-upload" });

      // Step 2: Try Firebase Storage upload silently in background (upgrade to permanent URL)
      // We don't block on this — if it fails, local data URL still works for preview
      (async () => {
        try {
          const storageRef = ref(
            storage,
            `email_banners/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
          );
          const snapshot = await uploadBytes(storageRef, file);
          const downloadUrl = await getDownloadURL(snapshot.ref);
          setBannerUrl(downloadUrl);
          setCustomBannerInput(downloadUrl);
          toast.success("Banner also saved to cloud for emails!", { id: "banner-cloud" });
        } catch {
          // Silent fail — local data URL is already attached, that's fine for preview
        }
      })();
    };

    reader.onerror = () => {
      toast.error("Failed to read image file. Please try again.", { id: "banner-upload" });
      setIsUploadingBanner(false);
      if (inputEl) inputEl.value = "";
    };

    reader.readAsDataURL(file);
  };

  // Helper to insert text at textarea cursor position
  const insertAtCursor = (textToInsert: string) => {
    const textarea = document.getElementById("email-markdown-textarea") as HTMLTextAreaElement | null;
    if (!textarea) {
      setMarkdownContent(prev => prev + "\n" + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    const updated = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
    setMarkdownContent(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 50);
  };

  // Basic markdown insertions
  const insertMarkdown = (prefix: string, suffix: string = "", placeholder: string = "") => {
    const textarea = document.getElementById("email-markdown-textarea") as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selectedText = currentVal.substring(start, end) || placeholder;

    const updated = currentVal.substring(0, start) + prefix + selectedText + suffix + currentVal.substring(end);
    setMarkdownContent(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 50);
  };

  // Insert designed visual button
  const handleInsertButton = () => {
    const label = btnLabel.trim() || (isUrduMode ? "پورٹل ملاحظہ کریں" : "Click Here");
    const url = btnUrl.trim() || "https://alghazali.vercel.app";
    insertAtCursor(`\n:::button url="${url}" text="${label}" :::\n`);
    setBtnModalOpen(false);
    toast.success(`Inserted button "${label}"!`);
  };

  // Insert designed info box / callout
  const handleInsertCallout = () => {
    const title = calloutTitle.trim() || (isUrduMode ? "ضروری اطلاع" : "Important Notice");
    const body = calloutBody.trim() || (isUrduMode ? "تمام والدین اور طلبہ اس پر عمل کریں۔" : "Details here...");
    insertAtCursor(`\n:::callout-${calloutType}\n**${title}**\n${body}\n:::\n`);
    setCalloutModalOpen(false);
    toast.success(`Inserted ${calloutType.toUpperCase()} box!`);
  };

  // Insert designed table
  const handleInsertTable = () => {
    const headerLine = `| ${tableCols.join(" | ")} |`;
    const separatorLine = `|${tableCols.map(() => "---").join("|")}|`;
    const rowsText = tableRows.map(row => `| ${row.join(" | ")} |`).join("\n");
    insertAtCursor(`\n${headerLine}\n${separatorLine}\n${rowsText}\n`);
    setTableModalOpen(false);
    toast.success("Inserted data table!");
  };

  // Insert official banner
  const handleInsertBanner = () => {
    const url = customBannerInput.trim() || bannerUrl || "https://alghazali.vercel.app/email_data_format/333.jpg";
    const link = bannerLinkInput.trim() || "https://alghazali.vercel.app";
    insertAtCursor(`\n:::banner url="${url}" link="${link}" :::\n`);
    setBannerModalOpen(false);
    toast.success("Inserted rounded school banner!");
  };

  // Delete Email Log
  const handleDeleteLogConfirmed = async () => {
    try {
      setIsDeletingLog(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const query = isClearAllLogs ? "clearAll=true" : `logId=${logToDelete?.id}`;
      const res = await fetch(`/api/admin/emails?${query}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.ok) {
        toast.success(isClearAllLogs ? "All email dispatch logs cleared!" : "Email log deleted.");
        if (isClearAllLogs) {
          setEmailLogs([]);
        } else if (logToDelete) {
          setEmailLogs(emailLogs.filter((l) => l.id !== logToDelete.id));
        }
        setDeleteLogModalOpen(false);
        setLogToDelete(null);
      } else {
        toast.error(data.error || "Failed to delete log.");
      }
    } catch (err: any) {
      console.error("Delete log error:", err);
      toast.error("Error deleting log.");
    } finally {
      setIsDeletingLog(false);
    }
  };

  // Send Email Action
  const handleSendEmail = async (isTest: boolean = false) => {
    const targetRecipients = isTest
      ? [user?.email || "admin@alghazali.edu.pk"]
      : activeRecipients;

    if (targetRecipients.length === 0) {
      toast.error("Please specify at least one recipient email address.");
      return;
    }

    if (!subject.trim()) {
      toast.error("Please enter an email subject.");
      return;
    }

    if (!markdownContent.trim()) {
      toast.error("Email content cannot be empty.");
      return;
    }

    try {
      if (isTest) setIsSendingTest(true);
      else setIsSending(true);

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error("Authentication expired. Please log in again.");
        return;
      }

      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider,
          to: targetRecipients,
          subject,
          preheader,
          markdownContent,
          headerBadge,
          themeColor,
          fromName,
          includeBanner,
          bannerUrl,
          isUrdu: isUrduMode,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        toast.success(
          isTest
            ? `Test email sent to ${targetRecipients[0]} via ${provider.toUpperCase()}!`
            : `Success! Email broadcasted to ${targetRecipients.length} recipient(s) via ${provider.toUpperCase()}.`
        );
        setConfirmSendModal(false);
        fetchStatusAndLogs();
      } else {
        toast.error(data.error || "Failed to send email. Check credentials.");
      }
    } catch (err: any) {
      console.error("Send error:", err);
      toast.error(err.message || "An unexpected network error occurred.");
    } finally {
      setIsSending(false);
      setIsSendingTest(false);
    }
  };

  // Generate live preview HTML
  const previewHtml = generateFullEmailHtml({
    title: subject || "Email Preview",
    preheader: preheader || subject,
    markdownContent: markdownContent || "_No content entered yet._",
    headerBadge: headerBadge || "OFFICIAL NOTIFICATION",
    themeColor: themeColor || "#0d9488",
    includeBanner,
    bannerUrl: bannerUrl || "https://alghazali.vercel.app/email_data_format/333.jpg",
    isUrdu: isUrduMode,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Hidden file input for uploading banner from device */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDeviceBannerUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Super Admin Top Banner & Status */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-3">
              <Shield size={14} className="text-teal-400" />
              SUPER ADMIN RESTRICTED
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Official Email Command Hub
              <Sparkles size={22} className="text-amber-400" />
            </h1>
            <p className="text-sm text-neutral-400 mt-1.5 max-w-2xl leading-relaxed">
              Design and dispatch executive notifications, announcements, and circulars with Urdu Nastaleeq support, custom banner uploads, and live email preview.
            </p>
          </div>

          {/* Provider Status Badges */}
          <div className="flex flex-wrap items-center gap-3 bg-neutral-900/80 p-3.5 rounded-2xl border border-neutral-800">
            {/* Resend status */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
              <div className="text-left">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <Zap size={11} className="text-teal-400" /> Resend
                </div>
                <div className="text-xs font-semibold text-neutral-200">
                  {providerStatus?.resend.configured ? "Configured" : "Add Key"}
                </div>
              </div>
            </div>

            {/* Nodemailer status */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <div className={cn(
                "w-2.5 h-2.5 rounded-full",
                providerStatus?.nodemailer.configured ? "bg-blue-400 animate-pulse" : "bg-amber-400"
              )} />
              <div className="text-left">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <Server size={11} className="text-blue-400" /> Nodemailer
                </div>
                <div className="text-xs font-semibold text-neutral-200">
                  {providerStatus?.nodemailer.configured ? "SMTP Active" : "Config Missing"}
                </div>
              </div>
            </div>

            <button
              onClick={fetchStatusAndLogs}
              disabled={loadingData}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              title="Refresh provider status"
            >
              <RefreshCw size={14} className={cn(loadingData && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-neutral-800/80">
          <button
            onClick={() => setActiveTab("compose")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2",
              activeTab === "compose"
                ? "bg-white text-neutral-950 shadow-md"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
            )}
          >
            <Edit3 size={15} /> Compose Email
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2",
              activeTab === "history"
                ? "bg-white text-neutral-950 shadow-md"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
            )}
          >
            <Clock size={15} /> Sent History ({emailLogs.length})
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2",
              activeTab === "config"
                ? "bg-white text-neutral-950 shadow-md"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
            )}
          >
            <HelpCircle size={15} /> Provider Setup Guide
          </button>
        </div>
      </div>

      {/* ─────────────────── TAB 1: COMPOSE EMAIL ─────────────────── */}
      {activeTab === "compose" && (
        <div className="space-y-6">
          {/* PROVIDER SELECTOR & TEMPLATE PICKER BAR */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* PROVIDER TOGGLE */}
            <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-2.5 flex items-center justify-between">
                <span>Select Dispatch Engine</span>
                <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                  Active: {provider === "resend" ? "Resend Cloud API" : "Nodemailer SMTP"}
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-neutral-100 dark:bg-neutral-950 p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                {/* Resend API Option */}
                <button
                  type="button"
                  onClick={() => setProvider("resend")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-xs transition-all duration-200",
                    provider === "resend"
                      ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/20"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-neutral-900/50"
                  )}
                >
                  <Zap size={15} className={cn(provider === "resend" ? "text-white" : "text-teal-500")} />
                  <span>Resend API</span>
                  {provider === "resend" && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/20 text-white font-medium">Fast</span>
                  )}
                </button>

                {/* Nodemailer SMTP Option */}
                <button
                  type="button"
                  onClick={() => setProvider("nodemailer")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-xs transition-all duration-200",
                    provider === "nodemailer"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-neutral-900/50"
                  )}
                >
                  <Server size={15} className={cn(provider === "nodemailer" ? "text-white" : "text-blue-500")} />
                  <span>Nodemailer (SMTP)</span>
                  {provider === "nodemailer" && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/20 text-white font-medium">Direct</span>
                  )}
                </button>
              </div>

              <div className="mt-2.5 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Info size={13} className="shrink-0 text-neutral-400" />
                {provider === "resend" ? (
                  <span>Resend handles high deliverability transactional &amp; broadcast mail via cloud API.</span>
                ) : (
                  <span>Nodemailer sends through your school's official Gmail/SMTP transport credentials.</span>
                )}
              </div>
            </div>

            {/* TEMPLATES SELECTOR (PRESETS & DB SAVED) */}
            <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTemplateSourceTab("presets")}
                      className={cn(
                        "text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all",
                        templateSourceTab === "presets"
                          ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                          : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                      )}
                    >
                      Official Presets ({PRESET_EMAIL_TEMPLATES.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateSourceTab("custom")}
                      className={cn(
                        "text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5",
                        templateSourceTab === "custom"
                          ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                          : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                      )}
                    >
                      <Bookmark size={11} /> Saved in DB ({customTemplates.length})
                    </button>
                  </div>

                  {/* Save current email as template button */}
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateNameInput(subject.replace(/^[^\w\s]+/, "").trim().slice(0, 40) || "Custom Email Template");
                      setSaveTemplateModal(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Bookmark size={12} /> Save to DB
                  </button>
                </div>

                {/* Templates list */}
                {templateSourceTab === "presets" ? (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                    {PRESET_EMAIL_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleSelectTemplate(tmpl)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5",
                          subject === tmpl.defaultSubject
                            ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-sm"
                            : "bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                        )}
                      >
                        <span>{tmpl.name.split("/")[0].trim()}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                    {customTemplates.length === 0 ? (
                      <p className="text-xs text-neutral-400 italic py-2">
                        No custom templates saved in DB yet. Click "Save to DB" above to save your email layout for future use.
                      </p>
                    ) : (
                      customTemplates.map((ct) => (
                        <div
                          key={ct.id}
                          className="inline-flex items-center rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectCustomTemplate(ct)}
                            className="px-2.5 py-1 font-semibold text-neutral-700 dark:text-neutral-300 hover:text-teal-600 transition-colors"
                          >
                            {ct.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomTemplate(ct.id, ct.name)}
                            className="p-1 hover:text-red-500 text-neutral-400 border-l border-neutral-200 dark:border-neutral-800 transition-colors"
                            title="Delete template from DB"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="text-[11px] text-neutral-400 mt-2">
                Click any preset or saved template to load ready-made copy, styling, and structure.
              </div>
            </div>

          </div>

          {/* RECIPIENTS SECTION */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Users size={16} className="text-teal-600 dark:text-teal-400" />
                  Target Recipients ({activeRecipients.length} selected)
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Enter single/multiple email addresses or select directly from registered administrators.
                </p>
              </div>

              {/* Mode switch */}
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-950 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setRecipientMode("manual")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                    recipientMode === "manual"
                      ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  )}
                >
                  Manual Input
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecipientMode("users");
                    fetchSystemUsers();
                  }}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                    recipientMode === "users"
                      ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  )}
                >
                  System Directory
                </button>
              </div>
            </div>

            {/* Manual input mode */}
            {recipientMode === "manual" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          handleAddEmail();
                        }
                      }}
                      placeholder="Type email (e.g. parent@example.com) and press Enter or comma..."
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-neutral-900 dark:text-white placeholder:text-neutral-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEmail}
                    className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={15} /> Add
                  </button>
                </div>

                {/* Email Chips */}
                {manualEmails.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {manualEmails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 text-xs font-medium"
                      >
                        <Mail size={12} className="text-teal-600 dark:text-teal-400" />
                        {email}
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(email)}
                          className="hover:text-red-500 ml-1 rounded-full p-0.5 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setManualEmails([])}
                      className="text-xs text-red-500 hover:underline px-2 py-1"
                    >
                      Clear All
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 italic">
                    No recipients added yet. Enter emails above.
                  </p>
                )}
              </div>
            )}

            {/* System Directory mode */}
            {recipientMode === "users" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={selectAllAdmins}
                    className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    + Select All School Administrators
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUserEmails([])}
                    className="text-xs text-neutral-400 hover:text-red-500"
                  >
                    Deselect All
                  </button>
                </div>

                {loadingUsers ? (
                  <div className="py-6 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-teal-500" /> Loading users from database...
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 border border-neutral-100 dark:border-neutral-800 rounded-xl custom-scrollbar">
                    {systemUsers.map((u) => {
                      const isSelected = selectedUserEmails.includes(u.email);
                      return (
                        <div
                          key={u.uid}
                          onClick={() => toggleUserSelection(u.email)}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-all border",
                            isSelected
                              ? "bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800/80 text-teal-900 dark:text-teal-200"
                              : "hover:bg-neutral-50 dark:hover:bg-neutral-950 border-transparent text-neutral-700 dark:text-neutral-300"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                              isSelected
                                ? "bg-teal-600 border-teal-600 text-white"
                                : "border-neutral-300 dark:border-neutral-700"
                            )}>
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span className="font-semibold truncate">{u.displayName || "User"}</span>
                            <span className="text-neutral-400 truncate text-[11px]">&lt;{u.email}&gt;</span>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            u.role === "super_admin"
                              ? "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                          )}>
                            {u.role || "user"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* EMAIL METADATA (Subject, Preheader, From Name, Theme Accent & Banner Toggle) */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Subject */}
              <div className="md:col-span-8">
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Email Subject Line *</span>
                  {isUrduMode && (
                    <span className="text-teal-600 font-semibold text-[11px]">اردو موڈ ایکٹیو</span>
                  )}
                </label>
                <input
                  type="text"
                  value={subject}
                  dir={isUrduMode ? "rtl" : "ltr"}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={isUrduMode ? "عنوان مثلاً: اجلاس برائے والدین و اساتذہ" : "e.g. Invitation to Parent-Teacher Meeting (PTM)"}
                  className={cn(
                    "w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-semibold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-neutral-900 dark:text-white",
                    isUrduMode && "font-serif text-right"
                  )}
                />
              </div>

              {/* From Name */}
              <div className="md:col-span-4">
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Al-Ghazali High School"
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-neutral-900 dark:text-white"
                />
              </div>

              {/* Preheader snippet */}
              <div className="md:col-span-6">
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">
                  Inbox Preheader Snippet
                </label>
                <input
                  type="text"
                  value={preheader}
                  dir={isUrduMode ? "rtl" : "ltr"}
                  onChange={(e) => setPreheader(e.target.value)}
                  placeholder={isUrduMode ? "ان باکس پریویو کا مختصر خلاصہ..." : "Teaser text displayed below the subject line in Gmail / Apple Mail..."}
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-neutral-900 dark:text-white"
                />
              </div>

              {/* Header Badge */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">
                  Header Badge Text
                </label>
                <input
                  type="text"
                  value={headerBadge}
                  dir={isUrduMode ? "rtl" : "ltr"}
                  onChange={(e) => setHeaderBadge(e.target.value)}
                  placeholder={isUrduMode ? "سرکاری نوٹیفکیشن" : "OFFICIAL NOTIFICATION"}
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold uppercase tracking-wider outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-neutral-900 dark:text-white"
                />
              </div>

              {/* Theme Accent Color */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">
                  Theme Accent Color
                </label>
                <div className="flex items-center gap-2 pt-0.5">
                  {themeColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setThemeColor(color.value)}
                      style={{ backgroundColor: color.value }}
                      className={cn(
                        "w-7 h-7 rounded-full transition-transform",
                        themeColor === color.value ? "ring-2 ring-offset-2 ring-neutral-900 dark:ring-white scale-110" : "hover:scale-105"
                      )}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* DYNAMIC BANNER MANAGEMENT CARD */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-11 rounded-lg overflow-hidden border border-neutral-300 dark:border-neutral-700 shrink-0 bg-white shadow-xs">
                    <img
                      src={bannerUrl || "/email_data_format/333.jpg"}
                      alt="Current Banner Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/email_data_format/333.jpg";
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-teal-600 dark:text-teal-400" />
                      Email Banner Image Management
                    </div>
                    <div className="text-[11px] text-neutral-500 max-w-md truncate">
                      {bannerUrl.includes("333.jpg")
                        ? "Default: Al-Ghazali High School Banner (333.jpg)"
                        : `Custom: ${bannerUrl}`}
                    </div>
                  </div>
                </div>

                {/* Banner Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* Upload from device button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingBanner}
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1.5 shadow-xs"
                    title="Upload banner image from PC or phone"
                  >
                    <Upload size={13} className={cn(isUploadingBanner && "animate-spin")} />
                    Upload from Device
                  </button>

                  {/* Custom URL modal button */}
                  <button
                    type="button"
                    onClick={() => setBannerModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1.5 shadow-xs"
                    title="Configure banner URL and link"
                  >
                    <Globe size={13} /> Via Link / Settings
                  </button>

                  {/* Toggle Header Banner */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !includeBanner;
                      setIncludeBanner(next);
                      toast.info(next ? "Banner enabled at top of email!" : "Banner removed from top.");
                    }}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm",
                      includeBanner
                        ? "bg-teal-600 text-white"
                        : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                    )}
                  >
                    <CheckSquare size={13} />
                    {includeBanner ? "Header Banner: Active" : "Enable Header Banner"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* VIEW SWITCHER, URDU TOGGLE & TOOLBAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* View Mode */}
            <div className="inline-flex p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  viewMode === "split"
                    ? "bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                )}
              >
                <Layers size={14} /> Split View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("editor")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  viewMode === "editor"
                    ? "bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                )}
              >
                <Edit3 size={14} /> Editor Only
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  viewMode === "preview"
                    ? "bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                )}
              >
                <Eye size={14} /> Live Email Preview
              </button>
            </div>

            {/* Urdu Mode & Device Preview */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Urdu Typography Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !isUrduMode;
                  setIsUrduMode(next);
                  toast.success(next ? "اردو نستعلیق موڈ ایکٹیو ہو گیا" : "English / Standard Mode activated");
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs border",
                  isUrduMode
                    ? "bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200"
                )}
                title="Toggle Urdu Nastaleeq typography and RTL direction"
              >
                <Languages size={14} className="text-teal-600 dark:text-teal-400" />
                <span>{isUrduMode ? "اردو نستعلیق (RTL)" : "Urdu Mode (اردو)"}</span>
              </button>

              {/* Device preview toggle */}
              {(viewMode === "split" || viewMode === "preview") && (
                <div className="inline-flex p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDevicePreview("desktop")}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1",
                      devicePreview === "desktop"
                        ? "bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white shadow-sm"
                        : "text-neutral-600 dark:text-neutral-400"
                    )}
                  >
                    <Monitor size={13} /> Desktop (650px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevicePreview("mobile")}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1",
                      devicePreview === "mobile"
                        ? "bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white shadow-sm"
                        : "text-neutral-600 dark:text-neutral-400"
                    )}
                  >
                    <Smartphone size={13} /> Mobile (375px)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* MAIN EDITOR & LIVE PREVIEW WORKSPACE */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* MARKDOWN EDITOR COLUMN */}
            {(viewMode === "split" || viewMode === "editor") && (
              <div className={cn(
                "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm flex flex-col w-full",
                viewMode === "split" ? "xl:col-span-6 col-span-12" : "col-span-12"
              )}>
                {/* Formatting Toolbar */}
                <div className="p-2.5 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => insertMarkdown("**", "**", "Bold Text")}
                      className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown("*", "*", "Italic Text")}
                      className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs italic font-serif text-neutral-700 dark:text-neutral-300"
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown("== ", " ==", "Highlighted Text")}
                      className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs text-amber-600 font-medium"
                      title="Highlight"
                    >
                      Mark
                    </button>
                  </div>

                  <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-700 mx-1 hidden sm:block" />

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => insertMarkdown("# ", "", "Main Heading")}
                      className="px-2 py-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300"
                      title="Heading 1"
                    >
                      H1
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown("## ", "", "Subheading")}
                      className="px-2 py-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300"
                      title="Heading 2"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown("### ", "", "Section Title")}
                      className="px-2 py-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300"
                      title="Heading 3"
                    >
                      H3
                    </button>
                  </div>

                  <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-700 mx-1 hidden sm:block" />

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => insertMarkdown("* ", "", "List item")}
                      className="px-2 py-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300"
                      title="Bullet List"
                    >
                      • List
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown("1. ", "", "Ordered item")}
                      className="px-2 py-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300"
                      title="Numbered List"
                    >
                      1. List
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown("> ", "", "Important quoted note")}
                      className="px-2 py-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300"
                      title="Blockquote"
                    >
                      &ldquo; Quote
                    </button>
                  </div>

                  <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-700 mx-1 hidden sm:block" />

                  {/* VISUAL DESIGN TOOLS (NO RAW CODE BLOCKS) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setBtnModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-100 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 transition-colors shadow-xs flex items-center gap-1"
                      title="Design Action Button"
                    >
                      <Plus size={12} /> Button CTA
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalloutModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1"
                      title="Design Info / Alert Box"
                    >
                      <Plus size={12} /> Info Box
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 transition-colors flex items-center gap-1"
                      title="Design Data Table"
                    >
                      <TableIcon size={12} /> Table
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 border border-amber-200 dark:border-amber-800 transition-colors flex items-center gap-1"
                      title="Insert Official School Banner"
                    >
                      <ImageIcon size={12} /> Banner
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown("\n---\n")}
                      className="px-2 py-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-300"
                      title="Divider line"
                    >
                      Divider
                    </button>
                  </div>
                </div>

                {/* Textarea with Urdu Font Support */}
                <textarea
                  id="email-markdown-textarea"
                  value={markdownContent}
                  dir={isUrduMode ? "rtl" : "ltr"}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  placeholder={isUrduMode ? "یہاں اردو زبان میں اپنا پیغام یا اعلامیہ تحریر کریں..." : "Compose your email using Markdown or click the visual tools above..."}
                  rows={20}
                  style={isUrduMode ? {
                    fontFamily: "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Urdu Typesetting', Tahoma, sans-serif",
                    lineHeight: "2.3",
                    fontSize: "16px",
                  } : undefined}
                  className={cn(
                    "w-full p-4 text-xs sm:text-sm bg-transparent outline-none resize-y leading-relaxed text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 min-h-[500px]",
                    isUrduMode ? "text-right" : "font-mono"
                  )}
                />

                <div className="p-2.5 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 flex items-center justify-between">
                  <span>
                    {isUrduMode ? "اردو نستعلیق فعال ہے • دائیں سے بائیں (RTL)" : "Visual design mode active • Responsive email HTML"}
                  </span>
                  <span>{markdownContent.length} characters</span>
                </div>
              </div>
            )}

            {/* LIVE PREVIEW COLUMN */}
            {(viewMode === "split" || viewMode === "preview") && (
              <div className={cn(
                "bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-inner flex flex-col items-center w-full overflow-hidden",
                viewMode === "split" ? "xl:col-span-6 col-span-12" : "col-span-12"
              )}>
                <div className="w-full flex items-center justify-between text-xs text-neutral-500 mb-3 px-1">
                  <span className="font-bold flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                    <Eye size={14} className="text-teal-500" />
                    Live Rendered HTML Email Frame
                  </span>
                  <span className="text-[11px] font-medium text-neutral-400">
                    {devicePreview === "desktop" ? "Desktop (650px Max)" : "Mobile (375px)"}
                  </span>
                </div>

                <div className="w-full overflow-x-auto flex justify-center py-1">
                  <div
                    className={cn(
                      "w-full transition-all duration-300 overflow-hidden rounded-2xl border border-neutral-300 dark:border-neutral-800 shadow-xl bg-white",
                      devicePreview === "mobile" ? "max-w-[375px]" : "max-w-[660px]"
                    )}
                  >
                    <iframe
                      title="Live Email Preview"
                      srcDoc={previewHtml}
                      className="w-full h-[650px] border-0 block"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* DISPATCH ACTION BAR */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-30">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Send size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white">
                  Ready to Dispatch Email
                </div>
                <div className="text-xs text-neutral-500">
                  Target: <strong className="text-neutral-800 dark:text-neutral-200">{activeRecipients.length} Recipient(s)</strong> via{" "}
                  <span className="uppercase font-bold text-teal-600 dark:text-teal-400">{provider}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {/* Send Test Email to Super Admin */}
              <button
                type="button"
                onClick={() => handleSendEmail(true)}
                disabled={isSendingTest || isSending}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 transition-colors flex items-center gap-2"
                title={`Sends a single test email directly to ${user?.email}`}
              >
                {isSendingTest ? (
                  <RefreshCw size={14} className="animate-spin text-teal-500" />
                ) : (
                  <Sparkles size={14} className="text-amber-500" />
                )}
                Send Test to Me
              </button>

              {/* Main Send Button */}
              <button
                type="button"
                onClick={() => setConfirmSendModal(true)}
                disabled={isSending || activeRecipients.length === 0}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all flex items-center gap-2 shadow-lg",
                  activeRecipients.length === 0
                    ? "bg-neutral-400 cursor-not-allowed"
                    : provider === "resend"
                    ? "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 shadow-teal-500/25 active:scale-95"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25 active:scale-95"
                )}
              >
                {isSending ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Dispatch via {provider === "resend" ? "Resend" : "Nodemailer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 2: SENT HISTORY / AUDIT LOGS ─────────────────── */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Clock size={18} className="text-teal-600 dark:text-teal-400" />
                Email Dispatch Audit Logs
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Full chronological record of system-generated and broadcast emails saved in Firestore.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {emailLogs.length > 0 && (
                <button
                  onClick={() => {
                    setIsClearAllLogs(true);
                    setLogToDelete(null);
                    setDeleteLogModalOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={13} /> Clear All Logs
                </button>
              )}
              <button
                onClick={fetchStatusAndLogs}
                className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw size={13} className={cn(loadingData && "animate-spin")} /> Refresh Logs
              </button>
            </div>
          </div>

          {emailLogs.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-400">
              No email logs found. All dispatches have either been cleared or not sent yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Subject</th>
                    <th className="py-3 px-3">Provider</th>
                    <th className="py-3 px-3">Recipients</th>
                    <th className="py-3 px-3">Dispatched By</th>
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {emailLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-950/50 transition-colors">
                      <td className="py-3 px-3">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                            <CheckCircle2 size={11} /> Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold text-[10px]" title={log.error}>
                            <AlertCircle size={11} /> Failed
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-neutral-900 dark:text-neutral-100 max-w-xs truncate">
                        {log.subject}
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                          log.provider === "resend"
                            ? "bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300"
                            : "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                        )}>
                          {log.provider}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-neutral-600 dark:text-neutral-300">
                        {log.recipientCount} recipient{log.recipientCount > 1 ? "s" : ""}
                      </td>
                      <td className="py-3 px-3 text-neutral-500">
                        {log.sentBy?.displayName || log.sentBy?.email || "Super Admin"}
                      </td>
                      <td className="py-3 px-3 text-neutral-400 whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "Just now"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setLogToDelete(log);
                            setIsClearAllLogs(false);
                            setDeleteLogModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete this dispatch log entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────── TAB 3: CONFIGURATION GUIDE ─────────────────── */}
      {activeTab === "config" && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Zap size={18} className="text-teal-500" />
              Environment Configuration Guide for Resend &amp; Nodemailer
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Add the following environment keys to your <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-neutral-800 dark:text-neutral-200">.env.local</code> or Vercel Environment Variables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Resend Setup Box */}
            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                  <Zap size={16} className="text-teal-500" /> 1. Resend API Setup
                </span>
                <a
                  href="https://resend.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1 hover:underline"
                >
                  Get API Key <ExternalLink size={12} />
                </a>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Resend offers 3,000 free emails/month. Obtain your API key from your Resend dashboard and place it in your environment:
              </p>
              <div className="bg-neutral-900 text-neutral-200 p-3 rounded-xl font-mono text-xs overflow-x-auto space-y-1">
                <div>RESEND_API_KEY=re_123456789_abcdef</div>
                <div className="text-neutral-500"># Optional verified custom domain:</div>
                <div>RESEND_FROM_EMAIL=Al-Ghazali High School &lt;onboarding@resend.dev&gt;</div>
              </div>
            </div>

            {/* Nodemailer Setup Box */}
            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                  <Server size={16} className="text-blue-500" /> 2. Nodemailer (SMTP/Gmail) Setup
                </span>
                <span className="text-xs text-neutral-400">Standard SMTP</span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Connect your school's Gmail or private SMTP server. For Gmail, generate a 16-character <strong>App Password</strong> in Google Account Security:
              </p>
              <div className="bg-neutral-900 text-neutral-200 p-3 rounded-xl font-mono text-xs overflow-x-auto space-y-1">
                <div>EMAIL_USER=your_school_email@gmail.com</div>
                <div>EMAIL_PASSWORD=your_16_digit_app_password</div>
                <div>EMAIL_SERVICE=gmail</div>
                <div className="text-neutral-500"># Or custom SMTP host &amp; port:</div>
                <div className="text-neutral-500"># EMAIL_HOST=smtp.yourdomain.com</div>
                <div className="text-neutral-500"># EMAIL_PORT=587</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── BULLETPROOF REACT PORTAL MODALS ─────────────────── */}
      {/* Portaling directly to document.body fixes the top clipping issue completely! */}
      {mounted && createPortal(
        <>
          {/* 1. VISUAL MODAL: BUTTON CTA DESIGNER */}
          <AnimatePresence>
            {btnModalOpen && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-5 my-auto"
                >
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-neutral-900 dark:text-white">Insert Action Button</h3>
                        <p className="text-xs text-neutral-500">Design a responsive, clickable button for your email.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBtnModalOpen(false)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                        Button Label / Text
                      </label>
                      <input
                        type="text"
                        value={btnLabel}
                        dir={isUrduMode ? "rtl" : "ltr"}
                        onChange={(e) => setBtnLabel(e.target.value)}
                        placeholder={isUrduMode ? "پورٹل ملاحظہ کریں" : "e.g. Access Parent Portal"}
                        className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-sm font-semibold outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                        Target Web Link / URL
                      </label>
                      <input
                        type="text"
                        value={btnUrl}
                        onChange={(e) => setBtnUrl(e.target.value)}
                        placeholder="https://alghazali.vercel.app/portal"
                        className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-sm outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-2">
                        Live Button Preview
                      </label>
                      <div className="p-6 rounded-2xl bg-neutral-100 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
                        <div
                          style={{ backgroundColor: themeColor }}
                          className="px-6 py-3 rounded-xl text-white font-bold text-sm shadow-md flex items-center gap-2 cursor-default"
                        >
                          <span>{btnLabel || "Button Text"}</span>
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setBtnModalOpen(false)}
                      className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertButton}
                      className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-500/25 flex items-center justify-center gap-1.5"
                    >
                      <Plus size={15} /> Insert Button
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* 2. VISUAL MODAL: INFO / CALLOUT BOX DESIGNER */}
          <AnimatePresence>
            {calloutModalOpen && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-5 my-auto"
                >
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                        <Info size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-neutral-900 dark:text-white">Insert Styled Alert / Info Box</h3>
                        <p className="text-xs text-neutral-500">Highlight important announcements with a bordered card.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCalloutModalOpen(false)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1.5">
                        Box Type / Tone
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { key: "info", label: "📌 Info" },
                          { key: "warning", label: "⚠️ Alert" },
                          { key: "success", label: "✅ Success" },
                          { key: "note", label: "📝 Note" },
                        ].map((t) => (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => setCalloutType(t.key as any)}
                            className={cn(
                              "py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center",
                              calloutType === t.key
                                ? "border-teal-600 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 ring-2 ring-teal-500/20"
                                : "border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:bg-neutral-50"
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                        Card Title
                      </label>
                      <input
                        type="text"
                        value={calloutTitle}
                        dir={isUrduMode ? "rtl" : "ltr"}
                        onChange={(e) => setCalloutTitle(e.target.value)}
                        placeholder={isUrduMode ? "ضروری اطلاع" : "e.g. Schedule Update"}
                        className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-sm font-semibold outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                        Card Message Details
                      </label>
                      <textarea
                        rows={3}
                        value={calloutBody}
                        dir={isUrduMode ? "rtl" : "ltr"}
                        onChange={(e) => setCalloutBody(e.target.value)}
                        placeholder={isUrduMode ? "تفصیلات یہاں لکھیں..." : "Provide details about this alert or guideline..."}
                        className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs outline-none focus:border-teal-500"
                      />
                    </div>

                    {/* Live Box Preview */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1.5">
                        Live Component Preview
                      </label>
                      <div className={cn(
                        "p-4 rounded-xl border-l-4 text-xs space-y-1",
                        calloutType === "warning" ? "border-l-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 border border-neutral-200" :
                        calloutType === "success" ? "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 border border-neutral-200" :
                        calloutType === "info" ? "border-l-sky-500 bg-sky-50 dark:bg-sky-950/20 text-sky-900 dark:text-sky-200 border border-neutral-200" :
                        "border-l-teal-500 bg-teal-50 dark:bg-teal-950/20 text-teal-900 dark:text-teal-200 border border-neutral-200",
                        isUrduMode && "text-right"
                      )}>
                        <div className="font-bold flex items-center gap-1.5">
                          {calloutType === "warning" ? "⚠️" : calloutType === "success" ? "✅" : calloutType === "info" ? "📌" : "📝"}
                          <span>{calloutTitle || "Notice"}</span>
                        </div>
                        <div className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                          {calloutBody || "Message body..."}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCalloutModalOpen(false)}
                      className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertCallout}
                      className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-500/25 flex items-center justify-center gap-1.5"
                    >
                      <Plus size={15} /> Insert Box
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* 3. VISUAL MODAL: TABLE GENERATOR */}
          <AnimatePresence>
            {tableModalOpen && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-5 my-auto"
                >
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200">
                        <TableIcon size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-neutral-900 dark:text-white">Insert Formatted Table</h3>
                        <p className="text-xs text-neutral-500">Configure columns and rows without typing markdown pipes.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTableModalOpen(false)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1.5">
                        Table Column Headers
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {tableCols.map((col, idx) => (
                          <input
                            key={idx}
                            type="text"
                            value={col}
                            dir={isUrduMode ? "rtl" : "ltr"}
                            onChange={(e) => {
                              const updated = [...tableCols];
                              updated[idx] = e.target.value;
                              setTableCols(updated);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs font-semibold outline-none focus:border-teal-500"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Table Live Preview */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1.5">
                        Table Grid Preview
                      </label>
                      <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-xl">
                        <table className="w-full text-xs text-left" dir={isUrduMode ? "rtl" : "ltr"}>
                          <thead className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
                            <tr>
                              {tableCols.map((col, idx) => (
                                <th key={idx} className="p-2 font-bold text-neutral-800 dark:text-neutral-200 border-r border-neutral-200 dark:border-neutral-800 last:border-r-0">
                                  {col || `Col ${idx + 1}`}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {tableRows.map((row, rIdx) => (
                              <tr key={rIdx}>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-2 text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 last:border-r-0">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setTableModalOpen(false)}
                      className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertTable}
                      className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-500/25 flex items-center justify-center gap-1.5"
                    >
                      <Plus size={15} /> Insert Table
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* 4. VISUAL MODAL: OFFICIAL BANNER INSERTER & SETTINGS */}
          <AnimatePresence>
            {bannerModalOpen && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-5 my-auto"
                >
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                        <ImageIcon size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-neutral-900 dark:text-white">Email Banner Configuration</h3>
                        <p className="text-xs text-neutral-500">Attach banner via device file, URL, or default school asset.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBannerModalOpen(false)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Image Preview with Round Borders */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                          Live Banner Preview
                        </label>
                        <span className="text-[11px] text-teal-600 font-semibold">Rounded 12px corners</span>
                      </div>
                      <div className="rounded-2xl overflow-hidden border border-neutral-300 dark:border-neutral-700 shadow-md bg-neutral-100">
                        <img
                          src={customBannerInput || "/email_data_format/333.jpg"}
                          alt="Al-Ghazali Banner"
                          className="w-full h-40 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/email_data_format/333.jpg";
                          }}
                        />
                      </div>
                    </div>

                    {/* Quick Sources: Default or Device */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const def = "https://alghazali.vercel.app/email_data_format/333.jpg";
                          setCustomBannerInput(def);
                          setBannerUrl(def);
                          toast.info("Selected default official banner.");
                        }}
                        className="flex-1 py-2 px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ImageIcon size={13} /> Reset Default
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-2 px-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-xs font-bold text-teal-700 dark:text-teal-300 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Upload size={13} /> Upload File
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                        Or Paste Custom Image URL / Link
                      </label>
                      <input
                        type="text"
                        value={customBannerInput}
                        onChange={(e) => {
                          setCustomBannerInput(e.target.value);
                          setBannerUrl(e.target.value);
                        }}
                        placeholder="https://example.com/banner.jpg"
                        className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                        Optional Click Destination URL
                      </label>
                      <input
                        type="text"
                        value={bannerLinkInput}
                        onChange={(e) => setBannerLinkInput(e.target.value)}
                        placeholder="https://alghazali.vercel.app"
                        className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIncludeBanner(true);
                        setBannerModalOpen(false);
                        toast.success("Set as Top Header Banner!");
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
                    >
                      Set as Header Banner
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertBanner}
                      className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-500/25 flex items-center justify-center gap-1.5"
                    >
                      <Plus size={15} /> Insert at Cursor
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* 5. MODAL: SAVE TEMPLATE TO DB */}
          <AnimatePresence>
            {saveTemplateModal && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-5 my-auto"
                >
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                        <Bookmark size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-neutral-900 dark:text-white">Save Email to Database</h3>
                        <p className="text-xs text-neutral-500">Save layout for future one-click re-use.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSaveTemplateModal(false)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                        Template Display Name *
                      </label>
                      <input
                        type="text"
                        value={templateNameInput}
                        dir={isUrduMode ? "rtl" : "ltr"}
                        onChange={(e) => setTemplateNameInput(e.target.value)}
                        placeholder="e.g. Annual PTM Invitation 2026"
                        className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-sm font-semibold outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                        Category Tag
                      </label>
                      <select
                        value={templateCategoryInput}
                        onChange={(e) => setTemplateCategoryInput(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs font-semibold outline-none focus:border-teal-500"
                      >
                        <option value="announcement">Announcement / Circular</option>
                        <option value="meeting">PTM / Meeting</option>
                        <option value="fee">Tuition &amp; Accounts</option>
                        <option value="exam">Examinations &amp; Results</option>
                        <option value="admission">Admissions</option>
                        <option value="urgent">Emergency / Urgent</option>
                        <option value="custom">General Custom</option>
                      </select>
                    </div>

                    <div className="p-3 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                      <div><strong>Subject:</strong> {subject}</div>
                      <div><strong>Urdu Mode:</strong> {isUrduMode ? "Yes (RTL)" : "No"}</div>
                      <div><strong>Top Banner:</strong> {includeBanner ? "Included" : "None"}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSaveTemplateModal(false)}
                      className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCurrentAsTemplate}
                      disabled={isSavingTemplate}
                      className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-500/25 flex items-center justify-center gap-1.5"
                    >
                      {isSavingTemplate ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Bookmark size={14} />
                      )}
                      Save to Database
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* 6. MODAL: CONFIRM DELETE EMAIL LOG */}
          <AnimatePresence>
            {deleteLogModalOpen && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-5 my-auto"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                    <Trash2 size={24} />
                  </div>

                  <div className="text-center">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      {isClearAllLogs ? "Clear All Dispatch Logs?" : "Delete Email Log Entry?"}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      {isClearAllLogs
                        ? "This action will permanently delete all records of sent and failed email dispatches from Firestore."
                        : `This will permanently delete the log record for "${logToDelete?.subject}".`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeleteLogModalOpen(false)}
                      className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteLogConfirmed}
                      disabled={isDeletingLog}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/25 flex items-center justify-center gap-1.5"
                    >
                      {isDeletingLog ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Yes, Delete
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* 7. CONFIRM SEND MODAL */}
          <AnimatePresence>
            {confirmSendModal && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-5 my-auto"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                    <Send size={24} />
                  </div>

                  <div className="text-center">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      Confirm Email Dispatch
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      You are about to transmit this communication to live email accounts.
                    </p>
                  </div>

                  <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-neutral-500 font-semibold">Provider:</span>
                      <span className="font-bold uppercase text-teal-600 dark:text-teal-400">{provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500 font-semibold">Total Recipients:</span>
                      <span className="font-bold text-neutral-900 dark:text-white">{activeRecipients.length} address(es)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500 font-semibold">Subject:</span>
                      <span className="font-bold text-neutral-900 dark:text-white truncate max-w-[200px]">{subject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500 font-semibold">Urdu Typography:</span>
                      <span className="font-bold text-neutral-900 dark:text-white">{isUrduMode ? "Enabled (نستعلیق)" : "Standard"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500 font-semibold">Top Banner:</span>
                      <span className="font-bold text-neutral-900 dark:text-white">{includeBanner ? "Enabled" : "Disabled"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmSendModal(false)}
                      className="flex-1 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendEmail(false)}
                      disabled={isSending}
                      className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2"
                    >
                      {isSending ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : (
                        <Send size={15} />
                      )}
                      Yes, Send Now
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
}
