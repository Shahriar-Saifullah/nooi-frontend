"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Clock,
  FolderOpen,
  Crown,
  ChevronRight,
  User,
  Settings,
  Languages,
  LogOut,
  Lock,
  Shield,
  Bell,
  CreditCard,
  Sliders,
  Camera,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Key,
  LogIn,
  Download,
  Trash2,
  Activity,
  Search,
  BarChart2,
  Megaphone,
  Share2,
  Globe
} from "lucide-react";
import { getCurrentUser, logout, updateProfile, updatePassword, type AuthUser } from "@/lib/api/auth";
import { useLanguage } from "@/lib/i18n/useTranslations";
import { createClient } from "@/utils/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const { language, toggleLanguage } = useLanguage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state feedback
  const [activeSection, setActiveSection] = useState("profile");
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });
  const [saving, setSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Privacy toggles
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [activityTracking, setActivityTracking] = useState(true);
  const [searchEngineVisibility, setSearchEngineVisibility] = useState(false);
  const [analyticsPerformance, setAnalyticsPerformance] = useState(true);
  const [personalization, setPersonalization] = useState(true);
  const [marketingComms, setMarketingComms] = useState(false);
  const [thirdPartyServices, setThirdPartyServices] = useState(false);
  const [downloadingData, setDownloadingData] = useState(false);

  // Delete account states
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteShowPassword, setDeleteShowPassword] = useState(false);
  const [deleteCheckbox1, setDeleteCheckbox1] = useState(false);
  const [deleteCheckbox2, setDeleteCheckbox2] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Notification toggles — Email
  const [notifProjectUpdates, setNotifProjectUpdates] = useState(true);
  const [notifWeeklyDigest, setNotifWeeklyDigest] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);
  const [notifAccountSecurity, setNotifAccountSecurity] = useState(true);
  // Notification toggles — Push
  const [notifRenderComplete, setNotifRenderComplete] = useState(true);
  const [notifNewFeatures, setNotifNewFeatures] = useState(true);
  const [notifTipsTutorials, setNotifTipsTutorials] = useState(false);
  // Notification toggles — In-App
  const [notifActivityUpdates, setNotifActivityUpdates] = useState(true);
  const [notifPointsRewards, setNotifPointsRewards] = useState(true);
  const [notifCollaborations, setNotifCollaborations] = useState(true);
  const [notifSystemUpdates, setNotifSystemUpdates] = useState(false);

  // Preferences toggles
  const [prefDarkMode, setPrefDarkMode] = useState(false);
  const [prefCompactMode, setPrefCompactMode] = useState(false);
  const [prefAnimations, setPrefAnimations] = useState(true);
  const [prefAutoSave, setPrefAutoSave] = useState(true);
  const [prefSpellCheck, setPrefSpellCheck] = useState(true);
  const [prefAiSuggestions, setPrefAiSuggestions] = useState(true);
  const [prefReduceMotion, setPrefReduceMotion] = useState(false);
  const [prefHighContrast, setPrefHighContrast] = useState(false);
  const [prefLanguage, setPrefLanguage] = useState("English");
  const [prefTimezone, setPrefTimezone] = useState("UTC+6 — Dhaka");
  const [prefCurrency, setPrefCurrency] = useState("USD $");

  useEffect(() => {
    getCurrentUser().then((res) => {
      if (res.success && res.data?.user) {
        const u = res.data.user;
        setUser(u);
        
        // Split name into First and Last
        const nameParts = (u.full_name || "").split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
        
        setEmail(u.email || "");
        // Metadata fields
        const meta = (u as any).raw_user_meta_data || {};
        setUsername(meta.username || u.email?.split("@")[0] || "");
        setBio(meta.bio || "");
        setPhone(meta.phone || "");
        setLocation(meta.location || "");
        setAvatarUrl(u.avatar_url || null);
      } else {
        router.replace("/authpage/signin");
      }
      setLoading(false);
    });
  }, [router]);

  // Handle outside click for avatar dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    const res = await logout();
    if (res.success) {
      router.replace("/authpage/signin");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local instant preview
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      setAvatarUrl(base64Data);

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user?.id || "avatar"}-${Date.now()}.${fileExt}`;
        const supabase = createClient();
        
        // Upload image to Supabase Storage bucket
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        // Update profile with the new public URL
        const res = await updateProfile({ avatarUrl: publicUrl });
        if (res.success) {
          setAvatarUrl(publicUrl);
          setUser(res.data.user);
        }
      } catch (err) {
        console.warn("Storage upload failed, fallback to base64 in metadata:", err);
        // Fallback to storing Base64 directly in Supabase User metadata if bucket is not configured
        const res = await updateProfile({ avatarUrl: base64Data });
        if (res.success) {
          setUser(res.data.user);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setAvatarUrl(null);
    const res = await updateProfile({ avatarUrl: null });
    if (res.success) {
      setUser(res.data.user);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus({ type: null, message: "" });

    const fullName = `${firstName} ${lastName}`.trim();
    const res = await updateProfile({
      fullName,
      username,
      bio,
      phone,
      location,
      avatarUrl
    });

    setSaving(false);
    if (res.success) {
      setUser(res.data.user);
      setSaveStatus({
        type: "success",
        message: "Your profile has been updated successfully!"
      });
      // Clear alert status after 4 seconds
      setTimeout(() => {
        setSaveStatus({ type: null, message: "" });
      }, 4000);
    } else {
      setSaveStatus({
        type: "error",
        message: typeof res.error === "string" ? res.error : "Failed to update profile settings."
      });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus({ type: null, message: "" });

    if (!newPassword || !confirmPassword) {
      setPasswordStatus({ type: "error", message: "Please fill in all password fields." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "New passwords do not match." });
      return;
    }

    // Requirements check
    if (!isLengthValid || !hasUpperLower || !hasNumber || !hasSpecial) {
      setPasswordStatus({ type: "error", message: "Password does not meet the complexity requirements." });
      return;
    }

    setPasswordUpdating(true);
    const res = await updatePassword(newPassword);
    setPasswordUpdating(false);

    if (res.success) {
      setPasswordStatus({ type: "success", message: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setPasswordStatus({ type: null, message: "" });
      }, 4000);
    } else {
      setPasswordStatus({
        type: "error",
        message: typeof res.error === "string" ? res.error : "Failed to update password."
      });
    }
  };

  // Password requirement validation helpers
  const isLengthValid = newPassword.length >= 8;
  const hasUpperLower = /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  let strengthScore = 0;
  if (newPassword.length > 0) {
    if (isLengthValid) strengthScore++;
    if (hasUpperLower) strengthScore++;
    if (hasNumber) strengthScore++;
    if (hasSpecial) strengthScore++;
  }

  const getStrengthLabel = () => {
    if (strengthScore === 0) return "";
    if (strengthScore <= 2) return "Weak";
    if (strengthScore === 3) return "Medium";
    return "Strong";
  };

  const getStrengthColor = () => {
    if (strengthScore <= 2) return "bg-red-500";
    if (strengthScore === 3) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const getStrengthWidth = () => {
    if (strengthScore === 0) return "w-0";
    if (strengthScore === 1) return "w-1/4";
    if (strengthScore === 2) return "w-1/2";
    if (strengthScore === 3) return "w-3/4";
    return "w-full";
  };

  const renderRequirementIcon = (satisfied: boolean) => {
    if (satisfied) {
      return (
        <div className="w-4 h-4 rounded-full bg-[#1b5e5e] flex items-center justify-center text-white shrink-0">
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 stroke-[3] stroke-current fill-none">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      );
    }
    return (
      <div className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-gray-300 shrink-0">
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 stroke-[3] stroke-current fill-none">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  };

  const sidebarItems = [
    { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
    { id: "privacy", label: "Privacy", icon: <Shield className="w-4 h-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { id: "billing", label: "Billing", icon: <CreditCard className="w-4 h-4" /> },
    { id: "preferences", label: "Preferences", icon: <Sliders className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] font-inter text-[#0a0a0a] tracking-[-0.36px] leading-[1.5]">
      {/* Navbar */}
      <header className="bg-white px-6 lg:px-8 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center">
          <div className="flex items-center w-[120px] shrink-0 cursor-pointer" onClick={() => router.push("/dashboard")}>
            <Image width={100} height={100} src="/Logo/Logo.svg" alt="Nooi" className="h-6 w-auto" />
          </div>

          <div className="hidden md:flex bg-[#f5f5f5] h-10 items-center p-1 rounded-full">
            <div
              onClick={() => router.push("/dashboard?view=home")}
              className="flex items-center gap-2 h-full px-4 rounded-full cursor-pointer transition-colors hover:bg-gray-200"
            >
              <Home className="w-4 h-4" />
              <span className="text-xs font-medium">Home</span>
            </div>
            <div
              onClick={() => router.push("/dashboard?view=history")}
              className="flex items-center gap-2 h-full px-4 rounded-full cursor-pointer transition-colors hover:bg-gray-200"
            >
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">History</span>
            </div>
            <div
              onClick={() => router.push("/dashboard?view=collection")}
              className="flex items-center gap-2 h-full px-4 rounded-full cursor-pointer transition-colors hover:bg-gray-200"
            >
              <FolderOpen className="w-4 h-4" />
              <span className="text-xs font-medium">Collection</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="hidden sm:flex items-center gap-2 px-6 h-10 rounded-full hover:bg-gray-50 transition-colors">
            <Crown className="w-4 h-4 text-[#004643]" />
            <span className="text-xs font-medium text-[#004643]">Upgrade Plan</span>
          </button>

          {/* User Avatar */}
          <div className="relative" ref={dropdownRef}>
            <div
              className="bg-[#f5f5f5] flex items-center gap-3 py-1 pl-1 pr-3 rounded-full shadow-sm cursor-pointer hover:bg-[#efefef] transition-colors select-none"
              onClick={() => setDropdownOpen(prev => !prev)}
            >
              {avatarUrl ? (
                <Image width={100} height={100} src={avatarUrl} alt={user?.full_name || "Avatar"} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <Image width={100} height={100} src="/assets/imgAvatar.png" alt="User" className="w-8 h-8 rounded-full object-cover" />
              )}
              <span className="text-xs font-medium hidden sm:block">{user?.full_name || "User"}</span>
              <ChevronRight
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${dropdownOpen ? "rotate-90" : ""}`}
              />
            </div>

            {/* Dropdown */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-[calc(100%+8px)] w-[220px] bg-white border border-[#f0f0f0] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.10)] overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-[#f5f5f5]">
                    <p className="text-[13px] font-semibold text-[#0a0a0a] truncate">{user?.full_name || "User"}</p>
                    <p className="text-[11px] text-[#737373] truncate">{user?.email || ""}</p>
                  </div>

                  <div className="py-1.5">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors"
                      onClick={() => {
                        setDropdownOpen(false);
                        setActiveSection("profile");
                      }}
                    >
                      <Settings className="w-4 h-4 text-[#737373]" />
                      Settings
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors"
                      onClick={toggleLanguage}
                    >
                      <Languages className="w-4 h-4 text-[#737373]" />
                      {language === "en" ? "العربية" : "English"}
                    </button>
                  </div>

                  <div className="border-t border-[#f5f5f5] py-1.5">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#f0f0f0] sticky top-24 flex flex-col justify-between min-h-[460px]">
            <div>
              <h2 className="text-lg font-[600] px-3 pt-2 pb-4 text-[#0a0a0a]">Settings</h2>
              <nav className="space-y-1">
                {sidebarItems.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-xs font-semibold tracking-[-0.3px] transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#004643] text-white shadow-sm"
                          : "text-[#525252] hover:bg-[#f5f5f5] hover:text-[#0a0a0a]"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#f5f5f5] space-y-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-xs font-semibold text-[#525252] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </div>
        </aside>

        {/* Content Panel */}
        <section className="flex-1 max-w-4xl">
          
          {/* Profile Section View */}
          {activeSection === "profile" && (
            <div id="profile" className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#f0f0f0]">
              <div className="mb-6">
                <h1 className="text-xl font-[600] text-[#0a0a0a]">Profile Settings</h1>
                <p className="text-xs text-[#737373] mt-1">Manage your personal information and profile details</p>
              </div>

              {/* Save Profile Status Toast */}
              {saveStatus.type && (
                <div className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-6 border transition-all ${
                  saveStatus.type === "success" 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                    : "bg-rose-50 border-rose-100 text-rose-800"
                }`}>
                  {saveStatus.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                  <span className="text-xs font-medium leading-[1.4]">{saveStatus.message}</span>
                </div>
              )}

              {/* Profile Photo Card */}
              <div className="bg-[#fcfdf8] border border-[#f4f7eb] rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
                    {avatarUrl ? (
                      <Image width={200} height={200} src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Image width={200} height={200} src="/assets/imgAvatar.png" alt="Default Avatar" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#004643] text-white flex items-center justify-center hover:bg-[#003633] transition-colors shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-[13px] font-[700] text-[#0a0a0a]">Profile Photo</h3>
                  <p className="text-[11px] text-[#737373] mt-1">Update your profile picture. Recommended size: 400x400px</p>
                  <div className="flex items-center justify-center sm:justify-start gap-3 mt-3.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-[#004643] hover:bg-[#003633] text-white text-[11px] font-semibold px-4 py-2 rounded-full transition-colors cursor-pointer"
                    >
                      Upload Photo
                    </button>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="text-[#737373] hover:text-[#0a0a0a] text-[11px] font-semibold px-3 py-2 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Profile Fields Form */}
              <form onSubmit={handleSaveChanges} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-[600] text-[#525252] mb-2">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter first name"
                      className="w-full bg-[#f9f9f9] text-xs px-4 py-3.5 rounded-[12px] border border-transparent focus:border-gray-200 focus:bg-white focus:outline-none focus:ring-0 text-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-[600] text-[#525252] mb-2">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter last name"
                      className="w-full bg-[#f9f9f9] text-xs px-4 py-3.5 rounded-[12px] border border-transparent focus:border-gray-200 focus:bg-white focus:outline-none focus:ring-0 text-black transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-[600] text-[#525252] mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full bg-[#f9f9f9] text-xs px-4 py-3.5 rounded-[12px] border border-transparent focus:border-gray-200 focus:bg-white focus:outline-none focus:ring-0 text-black transition-all opacity-70 cursor-not-allowed"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-xs font-[600] text-[#525252] mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full bg-[#f9f9f9] text-xs px-4 py-3.5 rounded-[12px] border border-transparent focus:border-gray-200 focus:bg-white focus:outline-none focus:ring-0 text-black transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-[600] text-[#525252] mb-2">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Write something about yourself..."
                    rows={4}
                    className="w-full bg-[#f9f9f9] text-xs px-4 py-3.5 rounded-[12px] border border-transparent focus:border-gray-200 focus:bg-white focus:outline-none focus:ring-0 text-black transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-[600] text-[#525252] mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="w-full bg-[#f9f9f9] text-xs px-4 py-3.5 rounded-[12px] border border-transparent focus:border-gray-200 focus:bg-white focus:outline-none focus:ring-0 text-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-[600] text-[#525252] mb-2">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter location"
                      className="w-full bg-[#f9f9f9] text-xs px-4 py-3.5 rounded-[12px] border border-transparent focus:border-gray-200 focus:bg-white focus:outline-none focus:ring-0 text-black transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#f5f5f5]">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="text-xs font-semibold px-5 py-2.5 text-[#737373] hover:text-[#0a0a0a] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#004643] hover:bg-[#003633] text-white text-xs font-semibold px-6 py-2.5 rounded-full transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security Section View */}
          {activeSection === "security" && (
            <div className="flex flex-col gap-6">
              
              {/* Main Change Password Form Panel */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#f0f0f0]">
                {/* Back button and title */}
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={() => setActiveSection("profile")}
                    className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-[#f5f5f5] transition-colors cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-[600] text-[#0a0a0a] tracking-tight">Change Password</h1>
                    <p className="text-xs text-[#737373] mt-0.5">Update your password to keep your account secure</p>
                  </div>
                </div>

                {/* Password status messages */}
                {passwordStatus.type && (
                  <div className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-6 border transition-all ${
                    passwordStatus.type === "success" 
                      ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                      : "bg-rose-50 border-rose-100 text-rose-800"
                  }`}>
                    {passwordStatus.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                    <span className="text-xs font-medium leading-[1.4]">{passwordStatus.message}</span>
                  </div>
                )}

                {/* Password Requirements Info Block */}
                <div className="bg-[#f0f4f5] border border-[#e2eaf0] rounded-2xl p-5 mb-8">
                  <h3 className="text-xs font-[700] text-[#0a0a0a] mb-3">Password Requirements</h3>
                  <ul className="space-y-2.5">
                    <li className="flex items-center gap-2.5 text-xs text-[#525252]">
                      {renderRequirementIcon(isLengthValid)}
                      <span className={isLengthValid ? "text-gray-900 font-medium" : "text-gray-500"}>At least 8 characters long</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-[#525252]">
                      {renderRequirementIcon(hasUpperLower)}
                      <span className={hasUpperLower ? "text-gray-900 font-medium" : "text-gray-500"}>Contains uppercase and lowercase letters</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-[#525252]">
                      {renderRequirementIcon(hasNumber)}
                      <span className={hasNumber ? "text-gray-900 font-medium" : "text-gray-500"}>Includes at least one number</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-[#525252]">
                      {renderRequirementIcon(hasSpecial)}
                      <span className={hasSpecial ? "text-gray-900 font-medium" : "text-gray-500"}>Contains at least one special character</span>
                    </li>
                  </ul>
                </div>

                {/* Inputs Form */}
                <form onSubmit={handleUpdatePassword} className="space-y-5">
                  {/* Current Password Field */}
                  <div>
                    <label className="block text-xs font-[600] text-[#525252] mb-2">Current Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full bg-[#f5f5f5] text-xs px-4 py-3.5 pr-12 rounded-[12px] border border-transparent focus:border-gray-200 focus:bg-white focus:outline-none text-black transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="mt-2">
                      <a href="#" className="text-[11px] text-[#004643] hover:underline font-semibold">Forgot your password?</a>
                    </div>
                  </div>

                  {/* New Password Field */}
                  <div>
                    <label className="block text-xs font-[600] text-[#525252] mb-2">New Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full bg-[#f5f5f5] text-xs px-4 py-3.5 pr-12 rounded-[12px] border border-transparent focus:border-gray-200 focus:bg-white focus:outline-none text-black transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Dynamic Strength Bar */}
                    {newPassword && (
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-300 ${getStrengthWidth()} ${getStrengthColor()}`} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">{getStrengthLabel() || "Weak"}</span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label className="block text-xs font-[600] text-[#525252] mb-2">Confirm New Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full bg-[#f5f5f5] text-xs px-4 py-3.5 pr-12 rounded-[12px] border border-transparent focus:border-gray-200 focus:bg-white focus:outline-none text-black transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Cancel and Update Buttons */}
                  <div className="flex items-center gap-3 pt-6 border-t border-[#f5f5f5] justify-start">
                    <button
                      type="button"
                      onClick={() => setActiveSection("profile")}
                      className="text-xs font-semibold px-5 py-2.5 text-[#737373] hover:text-[#0a0a0a] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={passwordUpdating}
                      className="bg-[#004643] hover:bg-[#003633] text-white text-xs font-semibold px-6 py-2.5 rounded-full transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      {passwordUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Update Password
                    </button>
                  </div>
                </form>
              </div>

              {/* Recent Security Activity Panel */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#f0f0f0]">
                <h3 className="text-sm font-[700] text-[#0a0a0a]">Recent Security Activity</h3>
                
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-4 bg-[#f9f9f9] p-4 rounded-[16px]">
                    <div className="w-10 h-10 rounded-full bg-[#f0f4f5] flex items-center justify-center text-[#004643] shrink-0">
                      <Key className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0a0a0a]">Password Changed</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-medium">3 months ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-[#f9f9f9] p-4 rounded-[16px]">
                    <div className="w-10 h-10 rounded-full bg-[#f0f4f5] flex items-center justify-center text-[#004643] shrink-0">
                      <LogIn className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0a0a0a]">Login from new device</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Chrome on Windows - 2 days ago</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Privacy Section View */}
          {activeSection === "privacy" && (
            <div id="privacy" className="flex flex-col gap-0 bg-white rounded-3xl shadow-sm border border-[#f0f0f0] overflow-hidden">

              {/* Header */}
              <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-6">
                <h1 className="text-xl font-[600] text-[#0a0a0a]">Privacy &amp; Data</h1>
                <p className="text-xs text-[#737373] mt-1">Control your privacy settings and manage how your data is shared</p>
              </div>

              {/* Privacy Toggles */}
              <div className="px-6 sm:px-8">
                {/* Profile Visibility */}
                <div className="flex items-start justify-between py-5 border-t border-[#f0f0f0]">
                  <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                    <div className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0 mt-0.5">
                      <Eye className="w-4 h-4 text-[#004643]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-[600] text-[#0a0a0a]">Profile Visibility</h3>
                      <p className="text-xs text-[#737373] mt-0.5">Control who can view your profile and design creations</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileVisibility(v => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      profileVisibility ? "bg-[#004643]" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={profileVisibility}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        profileVisibility ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Activity Tracking */}
                <div className="flex items-start justify-between py-5 border-t border-[#f0f0f0]">
                  <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                    <div className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-4 h-4 text-[#004643]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-[600] text-[#0a0a0a]">Activity Tracking</h3>
                      <p className="text-xs text-[#737373] mt-0.5">Allow us to track your activity to improve your experience</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivityTracking(v => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      activityTracking ? "bg-[#004643]" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={activityTracking}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        activityTracking ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Search Engine Visibility */}
                <div className="flex items-start justify-between py-5 border-t border-[#f0f0f0]">
                  <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                    <div className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0 mt-0.5">
                      <Search className="w-4 h-4 text-[#004643]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-[600] text-[#0a0a0a]">Search Engine Visibility</h3>
                      <p className="text-xs text-[#737373] mt-0.5">Allow search engines to index your public profile</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchEngineVisibility(v => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      searchEngineVisibility ? "bg-[#004643]" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={searchEngineVisibility}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        searchEngineVisibility ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Data Sharing Section */}
              <div className="px-6 sm:px-8 pt-6 pb-2 mt-2 border-t border-[#f0f0f0]">
                <h2 className="text-xl font-[600] text-[#0a0a0a]">Data Sharing</h2>
                <p className="text-xs text-[#737373] mt-1">Manage how your data is shared with third parties</p>
              </div>

              <div className="px-6 sm:px-8 pb-4">
                {/* Analytics & Performance */}
                <div className="flex items-start justify-between py-5 border-t border-[#f0f0f0]">
                  <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                    <div className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0 mt-0.5">
                      <BarChart2 className="w-4 h-4 text-[#004643]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-[600] text-[#0a0a0a]">Analytics &amp; Performance</h3>
                      <p className="text-xs text-[#737373] mt-0.5">Share usage data to help us improve our services</p>
                      <p className="text-[10px] text-[#a3a3a3] mt-1.5 flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-full bg-[#e5e5e5] text-[#737373] text-[8px] font-bold flex items-center justify-center leading-none">i</span>
                        This helps us understand how you use Nooi Design
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnalyticsPerformance(v => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      analyticsPerformance ? "bg-[#004643]" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={analyticsPerformance}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        analyticsPerformance ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Personalization */}
                <div className="flex items-start justify-between py-5 border-t border-[#f0f0f0]">
                  <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                    <div className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0 mt-0.5">
                      <Sliders className="w-4 h-4 text-[#004643]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-[600] text-[#0a0a0a]">Personalization</h3>
                      <p className="text-xs text-[#737373] mt-0.5">Allow us to personalize your experience based on your preferences</p>
                      <p className="text-[10px] text-[#a3a3a3] mt-1.5 flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-full bg-[#e5e5e5] text-[#737373] text-[8px] font-bold flex items-center justify-center leading-none">i</span>
                        Get design recommendations tailored to your style
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPersonalization(v => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      personalization ? "bg-[#004643]" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={personalization}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        personalization ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Marketing Communications */}
                <div className="flex items-start justify-between py-5 border-t border-[#f0f0f0]">
                  <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                    <div className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0 mt-0.5">
                      <Megaphone className="w-4 h-4 text-[#004643]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-[600] text-[#0a0a0a]">Marketing Communications</h3>
                      <p className="text-xs text-[#737373] mt-0.5">Receive promotional content and special offers</p>
                      <p className="text-[10px] text-[#a3a3a3] mt-1.5 flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-full bg-[#e5e5e5] text-[#737373] text-[8px] font-bold flex items-center justify-center leading-none">i</span>
                        Stay updated with new features and exclusive deals
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMarketingComms(v => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      marketingComms ? "bg-[#004643]" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={marketingComms}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        marketingComms ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Third-Party Services */}
                <div className="flex items-start justify-between py-5 border-t border-[#f0f0f0]">
                  <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                    <div className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0 mt-0.5">
                      <Share2 className="w-4 h-4 text-[#004643]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-[600] text-[#0a0a0a]">Third-Party Services</h3>
                      <p className="text-xs text-[#737373] mt-0.5">Share data with partner services for enhanced features</p>
                      <p className="text-[10px] text-[#a3a3a3] mt-1.5 flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-full bg-[#e5e5e5] text-[#737373] text-[8px] font-bold flex items-center justify-center leading-none">i</span>
                        Enable integrations with design tools and platforms
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setThirdPartyServices(v => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      thirdPartyServices ? "bg-[#004643]" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={thirdPartyServices}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        thirdPartyServices ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Data Management Section */}
              <div className="px-6 sm:px-8 pt-6 pb-2 border-t border-[#f0f0f0]">
                <h2 className="text-xl font-[600] text-[#0a0a0a]">Data Management</h2>
                <p className="text-xs text-[#737373] mt-1">Download or delete your personal data</p>
              </div>

              <div className="px-6 sm:px-8 pb-8 space-y-3 mt-4">
                {/* Download Your Data */}
                <div className="flex items-center gap-4 p-5 border border-[#f0f0f0] rounded-2xl hover:border-[#e0e0e0] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#f5f5f5] flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 text-[#004643]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-[600] text-[#0a0a0a]">Download Your Data</h3>
                    <p className="text-xs text-[#737373] mt-0.5">Get a copy of all your personal data and design history</p>
                  </div>
                  <button
                    type="button"
                    disabled={downloadingData}
                    onClick={async () => {
                      setDownloadingData(true);
                      await new Promise(r => setTimeout(r, 1500));
                      setDownloadingData(false);
                    }}
                    className="shrink-0 flex items-center gap-2 bg-[#004643] hover:bg-[#003633] disabled:opacity-60 text-white text-xs font-semibold px-4 py-2.5 rounded-full transition-colors cursor-pointer"
                  >
                    {downloadingData ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    {downloadingData ? "Preparing..." : "Download"}
                  </button>
                </div>

                {/* Delete Account */}
                <div className="flex items-center gap-4 p-5 border border-red-100 rounded-2xl bg-red-50/40 hover:border-red-200 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-[600] text-red-600">Delete Account</h3>
                    <p className="text-xs text-red-400 mt-0.5">Permanently delete your account and all associated data</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection("delete-account")}
                    className="shrink-0 flex items-center gap-2 border border-red-200 text-red-500 hover:bg-red-100 text-xs font-semibold px-4 py-2.5 rounded-full transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Delete Account Section */}
          {activeSection === "delete-account" && (
            <div id="delete-account" className="flex flex-col gap-5">

              {/* Header */}
              <div className="bg-white rounded-3xl px-6 sm:px-8 py-6 sm:py-8 shadow-sm border border-[#f0f0f0]">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-[600] text-[#0a0a0a] tracking-tight">Delete Account</h1>
                    <p className="text-sm text-[#737373] mt-1">Permanently remove your account and all associated data</p>
                  </div>
                </div>

                {/* Warning Card */}
                <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <h2 className="text-sm font-[700] text-red-600">Warning: This action cannot be undone</h2>
                  </div>
                  <p className="text-xs text-red-500 mb-4 leading-relaxed">
                    Deleting your account will permanently remove all your data and cannot be reversed. Please read the following carefully before proceeding:
                  </p>
                  <ul className="space-y-2.5">
                    {[
                      "All your designs, projects, and creative work will be permanently deleted",
                      "Your subscription will be canceled and you will lose access to premium features",
                      "All points and rewards accumulated will be forfeited",
                      "Your username will become available for others to use",
                      "All shared collections and collaborations will be removed"
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-sm bg-red-200 flex items-center justify-center shrink-0 mt-0.5">
                          <svg viewBox="0 0 14 14" className="w-2.5 h-2.5 stroke-red-600 fill-none stroke-[2.5]">
                            <line x1="2" y1="2" x2="12" y2="12" />
                            <line x1="12" y1="2" x2="2" y2="12" />
                          </svg>
                        </div>
                        <span className="text-xs text-red-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* What happens to your data */}
              <div className="bg-white rounded-3xl px-6 sm:px-8 py-6 sm:py-7 shadow-sm border border-[#f0f0f0]">
                <h2 className="text-base font-[600] text-[#0a0a0a] mb-5">What happens to your data</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-4 bg-[#f9f9f9] rounded-2xl">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#f0f0f0] flex items-center justify-center shrink-0">
                      <FolderOpen className="w-4 h-4 text-[#004643]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-[700] text-[#0a0a0a]">Designs &amp; Projects</h3>
                      <p className="text-[11px] text-[#737373] mt-0.5">Permanently deleted within 24 hours</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-[#f9f9f9] rounded-2xl">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#f0f0f0] flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#004643]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-[700] text-[#0a0a0a]">Profile Information</h3>
                      <p className="text-[11px] text-[#737373] mt-0.5">Removed from all public listings</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-[#f9f9f9] rounded-2xl">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#f0f0f0] flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-[#004643]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-[700] text-[#0a0a0a]">Billing Information</h3>
                      <p className="text-[11px] text-[#737373] mt-0.5">Stored for 90 days per regulations</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-[#f9f9f9] rounded-2xl">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#f0f0f0] flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-[#004643]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-[700] text-[#0a0a0a]">Activity History</h3>
                      <p className="text-[11px] text-[#737373] mt-0.5">Anonymized for analytics purposes</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consider these alternatives */}
              <div className="bg-[#1a2e2e] rounded-3xl px-6 sm:px-8 py-6 sm:py-7 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-full bg-[#ffffff15] flex items-center justify-center shrink-0">
                    <span className="text-lg">💡</span>
                  </div>
                  <h2 className="text-base font-[600] text-white">Consider these alternatives</h2>
                </div>
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#ffffff15] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-sm">⏸</span>
                    </div>
                    <div>
                      <h3 className="text-xs font-[700] text-white">Deactivate temporarily</h3>
                      <p className="text-[11px] text-[#9ab3b3] mt-0.5">Take a break without losing your data</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#ffffff15] flex items-center justify-center shrink-0 mt-0.5">
                      <Download className="w-3.5 h-3.5 text-[#9ab3b3]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-[700] text-white">Export your data</h3>
                      <p className="text-[11px] text-[#9ab3b3] mt-0.5">Download all your designs before deleting</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#ffffff15] flex items-center justify-center shrink-0 mt-0.5">
                      <ChevronRight className="w-3.5 h-3.5 text-[#9ab3b3] -rotate-90" />
                    </div>
                    <div>
                      <h3 className="text-xs font-[700] text-white">Downgrade plan</h3>
                      <p className="text-[11px] text-[#9ab3b3] mt-0.5">Switch to free plan instead of deleting</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      setDownloadingData(true);
                      await new Promise(r => setTimeout(r, 1500));
                      setDownloadingData(false);
                    }}
                    disabled={downloadingData}
                    className="flex items-center gap-2 bg-[#004643] hover:bg-[#003633] disabled:opacity-60 text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-colors cursor-pointer"
                  >
                    {downloadingData ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Export My Data
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 border border-[#ffffff30] text-white hover:bg-[#ffffff10] text-xs font-semibold px-5 py-2.5 rounded-full transition-colors cursor-pointer"
                  >
                    Deactivate Instead
                  </button>
                </div>
              </div>

              {/* Confirm Account Deletion */}
              <div className="bg-white rounded-3xl px-6 sm:px-8 py-6 sm:py-7 shadow-sm border border-[#f0f0f0]">
                <h2 className="text-base font-[600] text-[#0a0a0a]">Confirm Account Deletion</h2>
                <p className="text-xs text-[#737373] mt-1 mb-6">To proceed with account deletion, please complete the following steps:</p>

                <div className="space-y-5">
                  {/* Type DELETE */}
                  <div>
                    <label className="block text-xs font-[600] text-[#525252] mb-2">Type &quot;DELETE&quot; to confirm</label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE here"
                      className="w-full bg-[#f9f9f9] text-xs px-4 py-3.5 rounded-[12px] border border-transparent focus:border-red-300 focus:bg-white focus:outline-none text-black transition-all"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-[600] text-[#525252] mb-2">Enter your password</label>
                    <div className="relative">
                      <input
                        type={deleteShowPassword ? "text" : "password"}
                        value={deletePassword}
                        onChange={e => setDeletePassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full bg-[#f9f9f9] text-xs px-4 py-3.5 pr-12 rounded-[12px] border border-transparent focus:border-red-300 focus:bg-white focus:outline-none text-black transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setDeleteShowPassword(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                      >
                        {deleteShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div
                        onClick={() => setDeleteCheckbox1(v => !v)}
                        className={`w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors cursor-pointer ${
                          deleteCheckbox1
                            ? "bg-red-500 border-red-500"
                            : "border-gray-300 bg-white group-hover:border-red-300"
                        }`}
                      >
                        {deleteCheckbox1 && (
                          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 stroke-white fill-none stroke-[2.5]">
                            <polyline points="1.5 6 4.5 9 10.5 3" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-[#525252] leading-relaxed">
                        I understand that this action is permanent and cannot be undone. All my data will be permanently deleted.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div
                        onClick={() => setDeleteCheckbox2(v => !v)}
                        className={`w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors cursor-pointer ${
                          deleteCheckbox2
                            ? "bg-red-500 border-red-500"
                            : "border-gray-300 bg-white group-hover:border-red-300"
                        }`}
                      >
                        {deleteCheckbox2 && (
                          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 stroke-white fill-none stroke-[2.5]">
                            <polyline points="1.5 6 4.5 9 10.5 3" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-[#525252] leading-relaxed">
                        I confirm that I want to delete my account and I understand I will lose all my designs, projects, and premium access.
                      </span>
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#f5f5f5]">
                    <button
                      type="button"
                      onClick={() => setActiveSection("privacy")}
                      className="text-xs font-semibold px-5 py-2.5 text-[#737373] hover:text-[#0a0a0a] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={
                        deleteConfirmText !== "DELETE" ||
                        !deletePassword ||
                        !deleteCheckbox1 ||
                        !deleteCheckbox2 ||
                        deletingAccount
                      }
                      onClick={async () => {
                        setDeletingAccount(true);
                        await new Promise(r => setTimeout(r, 2000));
                        setDeletingAccount(false);
                      }}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-6 py-2.5 rounded-full transition-colors cursor-pointer"
                    >
                      {deletingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {deletingAccount ? "Deleting..." : "Delete My Account"}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <div id="notifications" className="bg-white rounded-3xl shadow-sm border border-[#f0f0f0] overflow-hidden">

              {/* Page Header */}
              <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-6">
                <h1 className="text-2xl sm:text-3xl font-[600] text-[#0a0a0a] tracking-tight">Notification Settings</h1>
                <p className="text-sm text-[#737373] mt-1">Choose which notifications you want to receive and how</p>
              </div>

              {/* ── Email Notifications ── */}
              <div className="border-t border-[#f0f0f0] px-6 sm:px-8 pt-6 pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-full bg-[#f0f4f3] flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#004643] stroke-[1.8]">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <polyline points="2,4 12,13 22,4"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-[700] text-[#0a0a0a]">Email Notifications</h2>
                    <p className="text-xs text-[#737373]">Manage email communication preferences</p>
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-8">
                {([
                  { label: "Project Updates", desc: "Get notified when your projects are ready or updated", value: notifProjectUpdates, set: setNotifProjectUpdates },
                  { label: "Weekly Digest", desc: "Receive a weekly summary of your activity and insights", value: notifWeeklyDigest, set: setNotifWeeklyDigest },
                  { label: "Marketing & Promotions", desc: "Stay updated on new features, tips, and special offers", value: notifMarketing, set: setNotifMarketing },
                  { label: "Account Security", desc: "Important alerts about your account security and changes", value: notifAccountSecurity, set: setNotifAccountSecurity },
                ] as { label: string; desc: string; value: boolean; set: (v: boolean) => void }[]).map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-4 border-t border-[#f5f5f5]">
                    <div className="pr-6">
                      <h3 className="text-sm font-[600] text-[#0a0a0a]">{item.label}</h3>
                      <p className="text-xs text-[#737373] mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => item.set(!item.value)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        item.value ? "bg-[#004643]" : "bg-gray-200"
                      }`}
                      role="switch"
                      aria-checked={item.value}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        item.value ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

              {/* ── Push Notifications ── */}
              <div className="border-t border-[#f0f0f0] px-6 sm:px-8 pt-6 pb-2 mt-2">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-full bg-[#f0f4f3] flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#004643] stroke-[1.8]">
                      <rect x="7" y="2" width="10" height="18" rx="2"/>
                      <line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round" strokeWidth="2.5"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-[700] text-[#0a0a0a]">Push Notifications</h2>
                    <p className="text-xs text-[#737373]">Receive instant alerts on your device</p>
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-8">
                {([
                  { label: "Render Complete", desc: "Get notified when your renders are ready to view", value: notifRenderComplete, set: setNotifRenderComplete },
                  { label: "New Features", desc: "Learn about new tools and features as they launch", value: notifNewFeatures, set: setNotifNewFeatures },
                  { label: "Tips & Tutorials", desc: "Get helpful tips to improve your design workflow", value: notifTipsTutorials, set: setNotifTipsTutorials },
                ] as { label: string; desc: string; value: boolean; set: (v: boolean) => void }[]).map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-4 border-t border-[#f5f5f5]">
                    <div className="pr-6">
                      <h3 className="text-sm font-[600] text-[#0a0a0a]">{item.label}</h3>
                      <p className="text-xs text-[#737373] mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => item.set(!item.value)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        item.value ? "bg-[#004643]" : "bg-gray-200"
                      }`}
                      role="switch"
                      aria-checked={item.value}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        item.value ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

              {/* ── In-App Notifications ── */}
              <div className="border-t border-[#f0f0f0] px-6 sm:px-8 pt-6 pb-2 mt-2">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-full bg-[#f0f4f3] flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-[#004643]" />
                  </div>
                  <div>
                    <h2 className="text-base font-[700] text-[#0a0a0a]">In-App Notifications</h2>
                    <p className="text-xs text-[#737373]">Control notifications you see while using the app</p>
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-8 pb-8">
                {([
                  { label: "Activity Updates", desc: "See updates about your projects and creations", value: notifActivityUpdates, set: setNotifActivityUpdates },
                  { label: "Points & Rewards", desc: "Get notified when you earn points or unlock rewards", value: notifPointsRewards, set: setNotifPointsRewards },
                  { label: "Collaborations", desc: "Get notified about comments, shares, and team activity", value: notifCollaborations, set: setNotifCollaborations },
                  { label: "System Updates", desc: "Announcements about maintenance and platform changes", value: notifSystemUpdates, set: setNotifSystemUpdates },
                ] as { label: string; desc: string; value: boolean; set: (v: boolean) => void }[]).map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-4 border-t border-[#f5f5f5]">
                    <div className="pr-6">
                      <h3 className="text-sm font-[600] text-[#0a0a0a]">{item.label}</h3>
                      <p className="text-xs text-[#737373] mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => item.set(!item.value)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        item.value ? "bg-[#004643]" : "bg-gray-200"
                      }`}
                      role="switch"
                      aria-checked={item.value}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        item.value ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ──────────── Billing Section ──────────── */}
          {activeSection === "billing" && (
            <div id="billing" className="flex flex-col gap-5">

              {/* Current Plan */}
              <div className="bg-white rounded-3xl px-6 sm:px-8 py-6 sm:py-7 shadow-sm border border-[#f0f0f0]">
                <h1 className="text-2xl sm:text-3xl font-[600] text-[#0a0a0a] tracking-tight">Billing &amp; Plan</h1>
                <p className="text-sm text-[#737373] mt-1 mb-6">Manage your subscription and payment details</p>

                {/* Plan Card */}
                <div className="bg-gradient-to-br from-[#004643] to-[#007a74] rounded-2xl p-5 sm:p-6 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-4 h-4 text-yellow-300" />
                        <span className="text-xs font-[700] text-yellow-300 uppercase tracking-wider">Pro Plan</span>
                      </div>
                      <h2 className="text-xl font-[700] text-white mt-1">$19 <span className="text-sm font-normal text-white/70">/ month</span></h2>
                      <p className="text-xs text-white/70 mt-1">Next billing date: August 12, 2026</p>
                    </div>
                    <span className="shrink-0 bg-white/20 text-white text-[10px] font-[700] px-3 py-1.5 rounded-full uppercase tracking-wide">Active</span>
                  </div>
                  <div className="mt-5 pt-4 border-t border-white/20 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-white/60 uppercase tracking-wider">Projects</p>
                      <p className="text-sm font-[700] text-white mt-0.5">Unlimited</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/60 uppercase tracking-wider">Storage</p>
                      <p className="text-sm font-[700] text-white mt-0.5">100 GB</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/60 uppercase tracking-wider">AI Credits</p>
                      <p className="text-sm font-[700] text-white mt-0.5">500 / mo</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  <button className="flex items-center gap-2 bg-[#004643] hover:bg-[#003633] text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-colors cursor-pointer">
                    <Crown className="w-3.5 h-3.5" />
                    Upgrade Plan
                  </button>
                  <button className="flex items-center gap-2 border border-[#e5e5e5] text-[#737373] hover:border-gray-300 hover:text-[#0a0a0a] text-xs font-semibold px-5 py-2.5 rounded-full transition-colors cursor-pointer">
                    Cancel Subscription
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-3xl px-6 sm:px-8 py-6 sm:py-7 shadow-sm border border-[#f0f0f0]">
                <h2 className="text-base font-[700] text-[#0a0a0a] mb-5">Payment Method</h2>

                {/* Card Row */}
                <div className="flex items-center justify-between gap-4 p-4 border border-[#f0f0f0] rounded-2xl bg-[#f9f9f9]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 rounded-lg bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-[900] text-white tracking-tight">VISA</span>
                    </div>
                    <div>
                      <p className="text-xs font-[700] text-[#0a0a0a]">Visa ending in 4242</p>
                      <p className="text-[11px] text-[#737373] mt-0.5">Expires 09 / 2027</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-[700] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">Default</span>
                    <button className="text-[11px] font-semibold text-[#004643] hover:underline cursor-pointer">Edit</button>
                  </div>
                </div>

                <button className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#004643] hover:text-[#003633] transition-colors cursor-pointer">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[2]">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add payment method
                </button>
              </div>

              {/* Invoice History */}
              <div className="bg-white rounded-3xl px-6 sm:px-8 py-6 sm:py-7 shadow-sm border border-[#f0f0f0]">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-[700] text-[#0a0a0a]">Invoice History</h2>
                  <button className="text-[11px] font-semibold text-[#004643] hover:underline cursor-pointer">Download All</button>
                </div>

                <div className="space-y-2">
                  {[
                    { date: "Jul 12, 2026", desc: "Pro Plan — Monthly", amount: "$19.00", status: "Paid" },
                    { date: "Jun 12, 2026", desc: "Pro Plan — Monthly", amount: "$19.00", status: "Paid" },
                    { date: "May 12, 2026", desc: "Pro Plan — Monthly", amount: "$19.00", status: "Paid" },
                    { date: "Apr 12, 2026", desc: "Pro Plan — Monthly", amount: "$19.00", status: "Paid" },
                  ].map((inv) => (
                    <div key={inv.date} className="flex items-center justify-between gap-4 p-4 bg-[#f9f9f9] rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-[#f0f0f0] flex items-center justify-center shrink-0">
                          <CreditCard className="w-3.5 h-3.5 text-[#004643]" />
                        </div>
                        <div>
                          <p className="text-xs font-[700] text-[#0a0a0a]">{inv.desc}</p>
                          <p className="text-[11px] text-[#737373] mt-0.5">{inv.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-[700] text-[#0a0a0a]">{inv.amount}</span>
                        <span className="text-[10px] font-[700] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{inv.status}</span>
                        <button className="text-[#737373] hover:text-[#004643] transition-colors cursor-pointer">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing Address */}
              <div className="bg-white rounded-3xl px-6 sm:px-8 py-6 sm:py-7 shadow-sm border border-[#f0f0f0]">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-[700] text-[#0a0a0a]">Billing Address</h2>
                  <button className="text-[11px] font-semibold text-[#004643] hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="space-y-1 text-xs text-[#525252] leading-relaxed">
                  <p className="font-[600] text-[#0a0a0a]">{user?.full_name || "User"}</p>
                  <p>123 Design Street, Suite 4</p>
                  <p>Dhaka, Bangladesh 1212</p>
                  <p>Bangladesh</p>
                  <p className="text-[#737373] mt-1">{user?.email || "user@example.com"}</p>
                </div>
              </div>

            </div>
          )}

          {/* ──────────── Preferences Section ──────────── */}
          {activeSection === "preferences" && (
            <div id="preferences" className="bg-white rounded-3xl shadow-sm border border-[#f0f0f0] overflow-hidden">

              {/* Header */}
              <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-6">
                <h1 className="text-2xl sm:text-3xl font-[600] text-[#0a0a0a] tracking-tight">Preferences</h1>
                <p className="text-sm text-[#737373] mt-1">Customize your experience and workspace settings</p>
              </div>

              {/* ── Appearance ── */}
              <div className="border-t border-[#f0f0f0] px-6 sm:px-8 pt-6 pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-full bg-[#f0f4f3] flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#004643] stroke-[1.8]">
                      <circle cx="12" cy="12" r="4"/>
                      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-[700] text-[#0a0a0a]">Appearance</h2>
                    <p className="text-xs text-[#737373]">Customize how Nooi looks for you</p>
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-8">
                {([
                  { label: "Dark Mode", desc: "Switch the interface to a dark color scheme", value: prefDarkMode, set: setPrefDarkMode },
                  { label: "Compact Mode", desc: "Reduce spacing for a denser layout", value: prefCompactMode, set: setPrefCompactMode },
                  { label: "Animations", desc: "Enable smooth transitions and micro-animations", value: prefAnimations, set: setPrefAnimations },
                ] as { label: string; desc: string; value: boolean; set: (v: boolean) => void }[]).map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-4 border-t border-[#f5f5f5]">
                    <div className="pr-6">
                      <h3 className="text-sm font-[600] text-[#0a0a0a]">{item.label}</h3>
                      <p className="text-xs text-[#737373] mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => item.set(!item.value)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        item.value ? "bg-[#004643]" : "bg-gray-200"
                      }`}
                      role="switch" aria-checked={item.value}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        item.value ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

              {/* ── Language & Region ── */}
              <div className="border-t border-[#f0f0f0] px-6 sm:px-8 pt-6 pb-2 mt-2">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-full bg-[#f0f4f3] flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4 text-[#004643]" />
                  </div>
                  <div>
                    <h2 className="text-base font-[700] text-[#0a0a0a]">Language &amp; Region</h2>
                    <p className="text-xs text-[#737373]">Set your preferred language, timezone, and currency</p>
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-8">
                {([
                  { label: "Language", value: prefLanguage, options: ["English", "العربية", "Français", "Español", "Deutsch"], set: setPrefLanguage },
                  { label: "Timezone", value: prefTimezone, options: ["UTC+6 — Dhaka", "UTC+0 — London", "UTC-5 — New York", "UTC+1 — Paris", "UTC+8 — Singapore"], set: setPrefTimezone },
                  { label: "Currency", value: prefCurrency, options: ["USD $", "EUR €", "GBP £", "BDT ৳", "SAR ﷼"], set: setPrefCurrency },
                ] as { label: string; value: string; options: string[]; set: (v: string) => void }[]).map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 py-4 border-t border-[#f5f5f5]">
                    <div>
                      <h3 className="text-sm font-[600] text-[#0a0a0a]">{item.label}</h3>
                    </div>
                    <select
                      value={item.value}
                      onChange={e => item.set(e.target.value)}
                      className="text-xs font-semibold text-[#0a0a0a] bg-[#f5f5f5] border border-transparent hover:border-gray-200 focus:border-gray-200 focus:bg-white focus:outline-none rounded-xl px-3 py-2 cursor-pointer transition-all appearance-none pr-6"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '14px' }}
                    >
                      {item.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* ── Editor ── */}
              <div className="border-t border-[#f0f0f0] px-6 sm:px-8 pt-6 pb-2 mt-2">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-full bg-[#f0f4f3] flex items-center justify-center shrink-0">
                    <Sliders className="w-4 h-4 text-[#004643]" />
                  </div>
                  <div>
                    <h2 className="text-base font-[700] text-[#0a0a0a]">Editor</h2>
                    <p className="text-xs text-[#737373]">Configure your design workspace behavior</p>
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-8">
                {([
                  { label: "Auto Save", desc: "Automatically save your work every few minutes", value: prefAutoSave, set: setPrefAutoSave },
                  { label: "Spell Check", desc: "Highlight spelling errors in text layers", value: prefSpellCheck, set: setPrefSpellCheck },
                ] as { label: string; desc: string; value: boolean; set: (v: boolean) => void }[]).map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-4 border-t border-[#f5f5f5]">
                    <div className="pr-6">
                      <h3 className="text-sm font-[600] text-[#0a0a0a]">{item.label}</h3>
                      <p className="text-xs text-[#737373] mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => item.set(!item.value)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        item.value ? "bg-[#004643]" : "bg-gray-200"
                      }`}
                      role="switch" aria-checked={item.value}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        item.value ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

              {/* ── Accessibility ── */}
              <div className="border-t border-[#f0f0f0] px-6 sm:px-8 pt-6 pb-2 mt-2">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-full bg-[#f0f4f3] flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#004643] stroke-[1.8]">
                      <circle cx="12" cy="5" r="1.5"/>
                      <path d="M9 12h6M12 9v10M7 12l-2 4M17 12l2 4"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-[700] text-[#0a0a0a]">Accessibility</h2>
                    <p className="text-xs text-[#737373]">Improve readability and usability for all users</p>
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-8">
                {([
                  { label: "Reduce Motion", desc: "Minimize animations for users sensitive to motion", value: prefReduceMotion, set: setPrefReduceMotion },
                  { label: "High Contrast", desc: "Increase contrast for better visibility", value: prefHighContrast, set: setPrefHighContrast },
                ] as { label: string; desc: string; value: boolean; set: (v: boolean) => void }[]).map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-4 border-t border-[#f5f5f5]">
                    <div className="pr-6">
                      <h3 className="text-sm font-[600] text-[#0a0a0a]">{item.label}</h3>
                      <p className="text-xs text-[#737373] mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => item.set(!item.value)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        item.value ? "bg-[#004643]" : "bg-gray-200"
                      }`}
                      role="switch" aria-checked={item.value}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        item.value ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

              {/* ── AI Assistant ── */}
              <div className="border-t border-[#f0f0f0] px-6 sm:px-8 pt-6 pb-2 mt-2">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-full bg-[#f0f4f3] flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#004643] stroke-[1.8]">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-[700] text-[#0a0a0a]">AI Assistant</h2>
                    <p className="text-xs text-[#737373]">Control how AI features behave in your workspace</p>
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-8 pb-8">
                {([
                  { label: "AI Suggestions", desc: "Let the AI suggest design improvements as you work", value: prefAiSuggestions, set: setPrefAiSuggestions },
                ] as { label: string; desc: string; value: boolean; set: (v: boolean) => void }[]).map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-4 border-t border-[#f5f5f5]">
                    <div className="pr-6">
                      <h3 className="text-sm font-[600] text-[#0a0a0a]">{item.label}</h3>
                      <p className="text-xs text-[#737373] mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => item.set(!item.value)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        item.value ? "bg-[#004643]" : "bg-gray-200"
                      }`}
                      role="switch" aria-checked={item.value}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        item.value ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* Fallback View for other tabs */}
          {!["profile", "security", "privacy", "notifications", "billing", "preferences", "delete-account"].includes(activeSection) && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#f0f0f0]">
              <h1 className="text-xl font-[600] text-[#0a0a0a] capitalize">{activeSection} Settings</h1>
              <p className="text-xs text-[#737373] mt-1">Manage your {activeSection} preferences here</p>
              
              <div className="border border-dashed border-[#e5e5e5] rounded-[20px] p-16 mt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-3">
                  <Sliders className="w-5 h-5 text-[#a3a3a3]" />
                </div>
                <p className="text-[13px] font-medium text-[#737373] capitalize">{activeSection} Panel Coming Soon</p>
                <p className="text-[12px] text-[#a3a3a3] mt-1">We are actively building the {activeSection} settings tab.</p>
              </div>
            </div>
          )}

        </section>
      </main>
    </div>
  );
}
