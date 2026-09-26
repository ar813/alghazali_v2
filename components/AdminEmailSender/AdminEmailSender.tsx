"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
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
  Copy
} from "lucide-react";
import { PRESET_EMAIL_TEMPLATES, EmailTemplateConfig, generateFullEmailHtml } from "@/lib/email-templates";

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

export default function AdminEmailSender() {
  const { user } = useAuth();

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

  // System & API States
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [confirmSendModal, setConfirmSendModal] = useState(false);

  // Active theme colors palette
  const themeColors = [
    { label: "Teal (Brand)", value: "#0d9488" },
    { label: "Blue (Academic)", value: "#2563eb" },
    { label: "Rose (Alert)", value: "#e11d48" },
    { label: "Amber (Notice)", value: "#d97706" },
    { label: "Purple (Events)", value: "#7c3aed" },
    { label: "Slate (Formal)", value: "#334155" },
  ];

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
        // Auto pick configured provider if resend is not configured
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

    // Check multiple emails separated by comma or semicolon
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
    toast.info(`Loaded "${template.name}" template.`);
  };

  // Markdown Toolbar actions
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
    headerBadge: headerBadge || "OFFICIAL NOTICE",
    themeColor: themeColor || "#0d9488",
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Super Admin Top Banner & Status */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-neutral-800 relative overflow-hidden">
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
              Dispatch high-impact system notifications, circulars, and announcements with Markdown precision. Switch effortlessly between Resend API and Nodemailer.
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
                  {providerStatus?.resend.configured ? "Configured" : "Add RESEND_API_KEY"}
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
            
            {/* THE SLEEK PROVIDER TOGGLE SWITCH */}
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

            {/* PRE-BUILT TEMPLATES DROPDOWN */}
            <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-2.5 flex items-center justify-between">
                  <span>Pre-built Professional Templates</span>
                  <span className="text-[10px] font-semibold text-rose-500">{PRESET_EMAIL_TEMPLATES.length} Presets</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
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
              </div>
              <div className="text-[11px] text-neutral-400 mt-2">
                Clicking a preset automatically loads responsive styling, sample copy, tables, and CTA button.
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

          {/* EMAIL METADATA (Subject, Preheader, From Name, Theme Accent) */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Subject */}
            <div className="md:col-span-8">
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">
                Email Subject Line *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Official Announcement: Annual Examination Datesheet 2026"
                className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-semibold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-neutral-900 dark:text-white"
              />
            </div>

            {/* Sender Name */}
            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">
                Sender Display Name
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Al-Ghazali High School"
                className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-neutral-900 dark:text-white"
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
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="Teaser text displayed below the subject line in Gmail / Apple Mail..."
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
                onChange={(e) => setHeaderBadge(e.target.value)}
                placeholder="OFFICIAL NOTIFICATION"
                className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold uppercase tracking-wider outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-neutral-900 dark:text-white"
              />
            </div>

            {/* Theme Accent Color */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">
                Theme Accent Color
              </label>
              <div className="flex items-center gap-2">
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

          {/* VIEW SWITCHER & TOOLBAR */}
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

            {/* Device preview toggle */}
            {(viewMode === "split" || viewMode === "preview") && (
              <div className="inline-flex p-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl self-start sm:self-auto">
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
                  <Monitor size={13} /> Desktop (600px)
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

                  {/* Special Email Custom Syntax */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => insertMarkdown('\n:::button url="https://alghazali.vercel.app" text="Click Here to Open" :::\n')}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-100 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 transition-colors shadow-xs"
                      title="Add Action Button CTA"
                    >
                      + Button CTA
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown('\n:::callout-info\n**Notice Title**\nDetails about this notification.\n:::\n')}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-colors"
                      title="Add Info Callout"
                    >
                      + Info Box
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown('\n| Column 1 | Column 2 | Column 3 |\n|---|---|---|\n| Data A | Data B | Data C |\n')}
                      className="px-2 py-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-300"
                      title="Add Table"
                    >
                      Table
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown('\n---\n')}
                      className="px-2 py-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-300"
                      title="Divider"
                    >
                      Divider
                    </button>
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  id="email-markdown-textarea"
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  placeholder="Compose your email using Markdown..."
                  rows={20}
                  className="w-full p-4 font-mono text-xs sm:text-sm bg-transparent outline-none resize-y leading-relaxed text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 min-h-[500px]"
                />

                <div className="p-2.5 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 flex items-center justify-between">
                  <span>Markdown formatting active with email-safe inline styles.</span>
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
                    {devicePreview === "desktop" ? "Desktop (600px Max)" : "Mobile (375px)"}
                  </span>
                </div>

                <div className="w-full overflow-x-auto flex justify-center py-1">
                  <div
                    className={cn(
                      "w-full transition-all duration-300 overflow-hidden rounded-2xl border border-neutral-300 dark:border-neutral-800 shadow-xl bg-white",
                      devicePreview === "mobile" ? "max-w-[375px]" : "max-w-[620px]"
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

      {/* ─────────────────── TAB 2: SENT HISTORY / LOGS ─────────────────── */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Clock size={18} className="text-teal-600 dark:text-teal-400" />
                Email Dispatch Audit Logs
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Full chronological record of system-generated and broadcast emails saved in Firestore.
              </p>
            </div>
            <button
              onClick={fetchStatusAndLogs}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={cn(loadingData && "animate-spin")} /> Refresh Logs
            </button>
          </div>

          {emailLogs.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-400">
              No email logs found yet. Send your first communication above!
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

      {/* ─────────────────── CONFIRMATION MODAL ─────────────────── */}
      <AnimatePresence>
        {confirmSendModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-5"
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
    </div>
  );
}
