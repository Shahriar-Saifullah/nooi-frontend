"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout, type AuthUser } from "@/lib/api/auth";
import { listProjects, type Project } from "@/lib/api/projects";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Clock, FolderOpen, Crown, ChevronRight,
  ArrowUpRight, Loader2, LogOut, User, Settings, Languages, ImageIcon
} from "lucide-react";
import Image from "next/image";
import CreateProjectModal from "@/components/CreateProjectModal";
import { useLanguage } from "@/lib/i18n/useTranslations";

export default function DashboardPage() {
  const router = useRouter();
  const { language, toggleLanguage } = useLanguage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showFreePlanBanner, setShowFreePlanBanner] = useState(true);
  const [activeRecentTab, setActiveRecentTab] = useState('All');
  const [activeExploreTab, setActiveExploreTab] = useState('All');
  const [activeView, setActiveView] = useState<'home' | 'history' | 'collection'>('home');

  useEffect(() => {
    getCurrentUser().then((res) => {
      if (res.success) {
        setUser(res.data.user);
        // fetch user's projects for recent creations and history
        listProjects().then(setProjects).catch(() => {}).finally(() => setProjectsLoading(false));
      } else {
        router.replace("/authpage/signin");
      }
      setLoading(false);
    });

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view");
      if (view === "history" || view === "collection" || view === "home") {
        setActiveView(view as 'home' | 'history' | 'collection');
      }
    }
  }, [router]);

  // Close dropdown when clicking outside
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafafa]">
        <Loader2 className="w-8 h-8 text-[#004643] animate-spin" />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] font-inter text-[#0a0a0a] tracking-[-0.36px] leading-[1.5]">
      {/* Navbar */}
      <header className="bg-white px-6 lg:px-8 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center">
          <div className="flex items-center w-[120px] shrink-0">
            <Image width={100} height={100} src="/Logo/Logo.svg" alt="Nooi" className="h-6 w-auto" />
          </div>

          <div className="hidden md:flex bg-[#f5f5f5] h-10 items-center p-1 rounded-full">
            <div
              onClick={() => setActiveView('home')}
              className={`flex items-center gap-2 h-full px-4 rounded-full cursor-pointer transition-colors ${
                activeView === 'home' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="text-xs font-medium">Home</span>
            </div>
            <div
              onClick={() => setActiveView('history')}
              className={`flex items-center gap-2 h-full px-4 rounded-full cursor-pointer transition-colors ${
                activeView === 'history' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">History</span>
            </div>
            <div
              onClick={() => setActiveView('collection')}
              className={`flex items-center gap-2 h-full px-4 rounded-full cursor-pointer transition-colors ${
                activeView === 'collection' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
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

          {/* User Avatar — dropdown trigger */}
          <div className="relative" ref={dropdownRef}>
            <div
              className="bg-[#f5f5f5] flex items-center gap-3 py-1 pl-1 pr-3 rounded-full shadow-sm cursor-pointer hover:bg-[#efefef] transition-colors select-none"
              onClick={() => setDropdownOpen(prev => !prev)}
            >
              {user?.avatar_url ? (
                <Image width={100} height={100} src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <Image width={100} height={100} src="/assets/imgAvatar.png" alt={user?.full_name || "User"} className="w-8 h-8 rounded-full object-cover" />
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
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-[#f5f5f5]">
                    <p className="text-[13px] font-semibold text-[#0a0a0a] truncate">{user?.full_name || "User"}</p>
                    <p className="text-[11px] text-[#737373] truncate">{user?.email || ""}</p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1.5">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors"
                      onClick={() => {
                        setDropdownOpen(false);
                        router.push('/dashboard/profile');
                      }}
                    >
                      <User className="w-4 h-4 text-[#737373]" />
                      Profile
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors"
                      onClick={() => {
                        setDropdownOpen(false);
                        router.push('/dashboard/profile');
                      }}
                    >
                      <Settings className="w-4 h-4 text-[#737373]" />
                      Settings
                    </button>
                    {/* Switch language — toggles the site between English and
                        Arabic. Currently only the Home page has translated
                        content; the dashboard UI itself stays English for now. */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors"
                      onClick={toggleLanguage}
                    >
                      <Languages className="w-4 h-4 text-[#737373]" />
                      {language === "en" ? "العربية" : "English"}
                    </button>
                  </div>

                  {/* Logout */}
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

      {/* Main Content Layout */}
      <main className="w-full px-6 lg:px-8 py-6 flex flex-col xl:flex-row gap-6">

        {/* History View */}
        <AnimatePresence mode="wait">
        {activeView === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="flex-1 bg-white rounded-3xl shadow-[0_0_32px_rgba(149,157,165,0.04)] p-4 sm:p-6 flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#004643]" />
                </div>
                <div>
                  <h1 className="text-xl font-[600]">History</h1>
                  <p className="text-sm text-[#525252]">Your previous creations and project history.</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="bg-[#004643] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#003633] transition-colors shadow-sm"
              >
                + New Project
              </button>
            </div>

            {projectsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="border border-[#f0f0f0] rounded-[20px] p-2 animate-pulse">
                    <div className="rounded-xl h-[120px] sm:h-[140px] mb-3 bg-gray-100" />
                    <div className="px-2 pb-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="border border-dashed border-[#e5e5e5] rounded-[20px] p-16 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#a3a3a3]" />
                </div>
                <p className="text-[13px] font-medium text-[#737373]">No history yet</p>
                <p className="text-[12px] text-[#a3a3a3]">Your generation history will appear here once you start creating.</p>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="mt-2 text-[12px] font-semibold text-[#004643] bg-[#f5f5f5] px-4 py-2 rounded-full hover:bg-gray-200 transition-colors"
                >
                  Start Creating →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {projects.map((project) => {
                  const imgSrc = project.thumbnail_url || project.floor_plan_url;
                  const createdAt = new Date(project.created_at);
                  const now = new Date();
                  const diffMs = now.getTime() - createdAt.getTime();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  const timeAgo = diffDays === 0
                    ? 'Today'
                    : diffDays === 1
                    ? 'Yesterday'
                    : diffDays < 7
                    ? `${diffDays} days ago`
                    : diffDays < 30
                    ? `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
                    : `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;

                  return (
                    <div
                      key={project.id}
                      onClick={() => router.push(`/canvas?projectId=${project.id}`)}
                      className="border border-[#f0f0f0] rounded-[20px] p-2.5 flex flex-col group cursor-pointer hover:shadow-md transition-all bg-white"
                    >
                      <div className="rounded-xl h-[120px] sm:h-[140px] mb-2 sm:mb-3 relative overflow-hidden bg-gray-100">
                        {imgSrc ? (
                          <Image
                            fill
                            src={imgSrc}
                            alt={project.name}
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-[#d4d4d4]" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors duration-300" />
                        {project.status === 'draft' && (
                          <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">Draft</span>
                        )}
                      </div>
                      <div className="px-1 sm:px-2 pb-1 flex flex-col self-stretch">
                        <h4 className="text-[13px] font-[700] leading-[1.5] tracking-[-0.36px] text-[#0a0a0a] mb-0.5 truncate">{project.name}</h4>
                        <p className="text-[12px] font-normal leading-[1.5] tracking-[-0.36px] text-[#737373]">{timeAgo}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Collection View */}
        {activeView === 'collection' && (
          <motion.div
            key="collection"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="flex-1 bg-white rounded-3xl shadow-[0_0_32px_rgba(149,157,165,0.04)] p-6 flex flex-col gap-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-[#004643]" />
              </div>
              <div>
                <h1 className="text-xl font-[600]">Collection</h1>
                <p className="text-sm text-[#525252]">Designs and renders you've saved.</p>
              </div>
            </div>
            <div className="border border-dashed border-[#e5e5e5] rounded-[20px] p-16 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-[#a3a3a3]" />
              </div>
              <p className="text-[13px] font-medium text-[#737373]">No saved items yet</p>
              <p className="text-[12px] text-[#a3a3a3]">Save your favourite designs here to build your collection.</p>
              <button
                onClick={() => setActiveView('home')}
                className="mt-2 text-[12px] font-semibold text-[#004643] bg-[#f5f5f5] px-4 py-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                Explore Designs →
              </button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Home View */}
        <AnimatePresence mode="wait">
        {activeView === 'home' && (<>

        {/* Left Column */}
        <motion.div
          className="flex-1 bg-white rounded-3xl shadow-[0_0_32px_rgba(149,157,165,0.04)] p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 min-w-0"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Welcome Header */}
          <motion.div variants={itemVariants}>
            <h1 className="text-xl sm:text-2xl font-[600] mb-1">Welcome, {user?.full_name?.split(' ')[0] || 'User'}</h1>
            <p className="text-sm text-[#525252]">Your journey to smarter interior design begins now.</p>
          </motion.div>

          {/* Quick Actions Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {[
              { title: "AI Floor Plan", desc: "Instant realistic output", bg: "bg-[#f4f7eb]", icon: "/assets/imgRatingContainer1.svg", overlay: "/assets/imgIllustration.svg" },
              { title: "3D Design Studio", desc: "Change with ease", bg: "bg-[#f4f7eb]", icon: "/assets/imgButtonContainer.svg" },
              { title: "AI Home Design", desc: "Fresh new tones", bg: "bg-[#edf4ed]", icon: "/assets/imgButton.svg" },
              { title: "Room Staging", desc: "Arrange with style", bg: "bg-[#edf4ed]", icon: "/assets/imgVector7.svg" }
            ].map((action, i) => (
              <div key={i} onClick={() => setCreateModalOpen(true)} className="relative flex items-center gap-3 p-3 pr-8 border border-[#f0f0f0] rounded-2xl hover:shadow-sm transition-shadow cursor-pointer">
                <div className={`${action.bg} w-12 h-12 rounded-xl shrink-0 flex items-center justify-center relative`}>
                  {action.overlay ? (
                    <div className="relative w-8 h-8 flex items-center justify-center">
                      <Image fill src={action.overlay} className="absolute inset-0 object-contain" alt="base" />
                      <Image width={800} height={800} src={action.icon} className="relative w-3.5 h-3.5 object-contain z-10" alt="overlay" />
                    </div>
                  ) : (
                    <Image width={100} height={100} src={action.icon} className="w-8 h-8 object-contain" alt={action.title} />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col self-stretch justify-center">
                  <h3 className="text-[14px] font-[700] leading-[1.5] tracking-[-0.42px] text-[#0a0a0a] truncate">{action.title}</h3>
                  <p className="text-[12px] font-normal leading-[1.5] tracking-[-0.36px] text-[#525252] truncate">{action.desc}</p>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 absolute top-3 right-3" />
              </div>
            ))}
          </motion.div>

          {/* Free Plan Banner */}
          <AnimatePresence>
            {showFreePlanBanner && (
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, height: 0, marginTop: 0, overflow: 'hidden' }}
                transition={{ duration: 0.25 }}
                className="bg-[#fcfdf8] border border-[#f0f4e3] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
              >
                <div className="bg-[#d2e88a] w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative">
                  <Image fill src="/assets/imgVerticalContainer1.svg" className="absolute inset-0 object-contain" alt="bg" />
                  <Image width={100} height={100} src="/assets/imgIllustration1.svg" className="relative w-6 h-6 object-contain z-10" alt="diamond" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-[700] mb-0.5">You're currently on the Free Plan</h3>
                  <p className="text-xs text-[#737373]">You have 100 points to get started. Upgrade to access advanced tools and exclusive benefits</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => router.push('/pricing')}
                    className="bg-[#004643] text-white text-[12px] font-medium px-4 py-2 rounded-full hover:bg-[#003633] transition-colors whitespace-nowrap"
                  >
                    Get Started
                  </button>
                  <button
                    onClick={() => setShowFreePlanBanner(false)}
                    className="text-[#004643] text-[12px] font-medium px-4 py-2 rounded-full hover:bg-gray-100 transition-colors whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Creations */}
          <motion.div variants={itemVariants} className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <h2 className="text-base sm:text-lg font-medium">Recent Creations</h2>
              <button
                onClick={() => setActiveView('history')}
                className="text-[#004643] text-[12px] font-medium leading-[150%] tracking-[-0.36px] flex items-center gap-1 bg-[#f5f5f5] h-8 px-3 rounded-full hover:bg-gray-200 shrink-0 transition-colors cursor-pointer"
              >
                My Creations <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {projectsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="border border-[#f0f0f0] rounded-[20px] p-2 animate-pulse">
                    <div className="rounded-xl h-[100px] sm:h-[120px] mb-3 bg-gray-100" />
                    <div className="px-1 sm:px-2 pb-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="border border-dashed border-[#e5e5e5] rounded-[20px] p-10 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-[#a3a3a3]" />
                </div>
                <p className="text-[13px] font-medium text-[#737373]">No projects yet</p>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="text-[12px] font-semibold text-[#004643] hover:underline"
                >
                  Create your first project →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {projects.slice(0, 4).map((project) => {
                  const imgSrc = project.thumbnail_url || project.floor_plan_url;
                  const createdAt = new Date(project.created_at);
                  const now = new Date();
                  const diffMs = now.getTime() - createdAt.getTime();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  const timeAgo = diffDays === 0
                    ? 'Today'
                    : diffDays === 1
                    ? 'Yesterday'
                    : diffDays < 7
                    ? `${diffDays} days ago`
                    : diffDays < 30
                    ? `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
                    : `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;

                  return (
                    <div
                      key={project.id}
                      onClick={() => router.push(`/canvas?projectId=${project.id}`)}
                      className="border border-[#f0f0f0] rounded-[20px] p-2 flex flex-col group cursor-pointer hover:shadow-md transition-all"
                    >
                      <div className="rounded-xl h-[100px] sm:h-[120px] mb-2 sm:mb-3 relative overflow-hidden bg-gray-100">
                        {imgSrc ? (
                          <Image
                            fill
                            src={imgSrc}
                            alt={project.name}
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-[#d4d4d4]" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors duration-300" />
                        {project.status === 'draft' && (
                          <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">Draft</span>
                        )}
                      </div>
                      <div className="px-1 sm:px-2 pb-1 flex flex-col self-stretch">
                        <h4 className="text-[12px] font-[700] leading-[1.5] tracking-[-0.36px] text-[#0a0a0a] mb-0.5 truncate">{project.name}</h4>
                        <p className="text-[12px] font-normal leading-[1.5] tracking-[-0.36px] text-[#737373]">{timeAgo}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Explore AI Tools */}
          <motion.div variants={itemVariants} className="flex flex-col gap-3 sm:gap-4">
            <h2 className="text-base sm:text-lg font-medium">Explore AI Tools</h2>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="bg-[#f5f5f5] h-10 inline-flex items-center p-1 rounded-full overflow-x-auto hide-scrollbar w-full sm:w-auto">
                {['All', 'Create', 'Edit', 'Enhance'].map((tab) => (
                  <div
                    key={tab}
                    onClick={() => setActiveExploreTab(tab)}
                    className={`${
                      activeExploreTab === tab
                        ? 'bg-white shadow-sm'
                        : 'hover:bg-gray-200 transition-colors cursor-pointer'
                    } px-4 py-1.5 rounded-full whitespace-nowrap cursor-pointer`}
                  >
                    <span className="text-xs font-medium">{tab}</span>
                  </div>
                ))}
              </div>
              <button className="text-[#004643] text-[12px] font-medium leading-[150%] tracking-[-0.36px] flex items-center gap-1 bg-[#f5f5f5] h-8 px-3 rounded-full hover:bg-gray-200 shrink-0 transition-colors self-start sm:self-auto">
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <AnimatePresence mode="popLayout">
              {([
                {
                  title: 'Smart Render', category: 'Create', desc: 'Turn sketches or photos into stunning 3D visuals effortlessly.',
                  splitPos: '50.2%',
                  imageContent: (
                    <div className="relative w-full h-full overflow-hidden">
                      <Image fill src="/assets/imgImage8.png" className="absolute inset-0 object-cover" alt="Render" />
                      <div className="absolute inset-y-0 left-0 w-[50.2%] border-r-2 border-white overflow-hidden">
                        <Image width={800} height={800} src="/assets/imgImage9.png" className="absolute inset-y-0 left-0 w-[199%] h-full max-w-none object-cover" alt="Sketch" />
                      </div>
                    </div>
                  )
                },
                {
                  title: 'Prompt Render', category: 'Create', desc: 'Write what you imagine, and come into beautiful interior visuals.', badge: 'Make modern bathroom',
                  splitPos: '27.6%',
                  imageContent: (
                    <div className="relative w-full h-full overflow-hidden">
                      <Image fill src="/assets/imgImage10.png" className="absolute inset-0 object-cover" alt="Render" />
                      <div className="absolute inset-y-0 left-0 w-[27.6%] border-r-2 border-white overflow-hidden">
                        <Image width={800} height={800} src="/assets/imgImage11.png" className="absolute inset-y-0 left-0 w-[362%] h-full max-w-none object-cover" alt="Room" />
                      </div>
                    </div>
                  )
                },
                {
                  title: 'Expand View', category: 'Edit', desc: 'Experience your design view detail with an expanded layout.',
                  splitPos: '48%',
                  imageContent: (
                    <div className="relative w-full h-full overflow-hidden">
                      <Image fill src="/assets/imgImage12.png" className="absolute inset-0 object-cover" alt="Room" />
                      <div className="absolute inset-y-0 left-0 w-[48%] border-r-2 border-white overflow-hidden">
                        <Image width={800} height={800} src="/assets/imgImage11.png" className="absolute inset-y-0 left-0 w-[208%] h-full max-w-none object-cover" alt="Room split" />
                      </div>
                      <Image width={1200} height={1200} src="/assets/imgImage13.png" className="absolute inset-0 m-auto w-[65%] h-[65%] object-cover rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] border-2 border-white" alt="Expanded" />
                    </div>
                  )
                },
                {
                  title: 'HD Boost', category: 'Enhance', desc: 'Enhance your render with sharper details and vibrant clarity in HD.',
                  splitPos: '50.6%',
                  imageContent: (
                    <div className="relative w-full h-full overflow-hidden">
                      <Image fill src="/assets/imgImage14.png" className="absolute inset-0 object-cover" alt="Render" />
                      <div className="absolute inset-y-0 left-0 w-[50.6%] border-r-2 border-white overflow-hidden">
                        <Image width={800} height={800} src="/assets/imgImage15.png" className="absolute inset-y-0 left-0 w-[197%] h-full max-w-none object-cover" alt="Low Res" />
                      </div>
                    </div>
                  )
                }
              ] as Array<{ title: string; category: string; desc: string; splitPos: string; badge?: string; imageContent: React.ReactNode }>)
                .filter(item => activeExploreTab === 'All' || item.category === activeExploreTab)
                .map((item) => (
                <motion.div
                  key={item.title}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="border border-[#f0f0f0] rounded-[20px] p-2 flex flex-col group cursor-pointer hover:shadow-md transition-shadow h-full"
                >
                  <div className="rounded-xl h-[100px] sm:h-[120px] mb-2 sm:mb-3 relative overflow-hidden bg-gray-100">
                    <div className="absolute inset-0 opacity-90 group-hover:opacity-100 transition-opacity">
                      {item.imageContent}
                    </div>
                    <div
                      className="absolute w-5 h-5 bg-white shadow-[0_2px_8px_rgba(99,99,99,0.12)] rounded-full flex items-center justify-center z-10 p-1 top-1/2 -translate-y-1/2 -translate-x-1/2"
                      style={{ left: item.splitPos || '50%' }}
                    >
                      <Image fill src="/assets/imgRating.svg" className="" alt="slider" />
                    </div>
                    {item.badge && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[rgba(255,255,255,0.8)] backdrop-blur-md px-2 sm:px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-[var(--secondary\/300,#c7de7d)] z-10">
                        <Image width={100} height={100} src="/assets/imgRating1.svg" className="w-3 h-3 shrink-0" alt="sparkle" />
                        <span className="text-[9px] font-medium text-[#0a0a0a] whitespace-nowrap tracking-[-0.3px] hidden sm:block">{item.badge}</span>
                      </div>
                    )}
                  </div>
                  <div className="px-1 flex-1 flex flex-col self-stretch">
                    <h4 className="text-[13px] sm:text-[16px] font-medium leading-[1.5] tracking-[-0.48px] text-[#0a0a0a] mb-1">{item.title}</h4>
                    <p className="text-[12px] sm:text-[14px] font-normal leading-[1.5] tracking-[-0.42px] text-[#404040] leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Column (Sidebar) */}
        <motion.aside
          className="xl:w-[380px] shrink-0 bg-white rounded-3xl shadow-[0_0_32px_rgba(149,157,165,0.04)] flex flex-col min-w-0"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-[600] tracking-[-0.6px] text-[#0a0a0a]">Tutorials For You</h2>
              <button className="bg-[#f5f5f5] h-9 px-4 rounded-full flex items-center gap-2 hover:bg-gray-200 transition-colors">
                <Image width={100} height={100} src="/assets/imgGroup1.svg" className="w-4 h-4" alt="help" />
                <span className="text-[14px] font-medium text-[#0a0a0a] tracking-[-0.42px]">Help</span>
              </button>
            </div>
            <div className="bg-[#f5f5f5] rounded-[12px] h-11 px-4 flex items-center gap-3">
              <Image width={100} height={100} src="/assets/imgVerticalContainer.svg" className="w-5 h-5 opacity-60" alt="search" />
              <input type="text" placeholder="Search" className="bg-transparent text-[14px] w-full outline-none placeholder:text-[#a1a1a1] tracking-[-0.42px]" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-8 hide-scrollbar">

            {/* Tutorial 1 */}
            <motion.div variants={itemVariants} className="flex flex-col gap-3 group cursor-pointer">
              <div className="aspect-[1.5] relative bg-[#f5f5f5] rounded-[32px] overflow-hidden">
                <div className="absolute left-[7.5%] bottom-[11.3%] w-[60.2%] h-[58.8%] rounded-[16px] overflow-hidden border border-white shadow-sm">
                  <Image fill src="/assets/imgImage16.png" alt="Before" className="object-cover" style={{ objectPosition: '-8.595px 0px' }} />
                </div>
                <div className="absolute right-[7.5%] top-[4.5%] w-[48.2%] h-[54.3%] rounded-[16px] overflow-hidden border border-white shadow-[0_2px_8px_rgba(99,99,99,0.12)] z-10">
                  <Image fill src="/assets/imgImage17.png" alt="After" className="object-cover" style={{ objectPosition: '-17.954px 0px' }} />
                </div>
                <div className="absolute left-[37.7%] top-[27.1%] w-[15%] z-20" style={{ transform: 'rotate(8.345deg)' }}>
                  <Image width={100} height={100} src="/assets/imgArrow3.svg" className="w-full aspect-[1.1] object-contain" alt="arrow" />
                </div>
                <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full flex items-center justify-center gap-2 border-[1.5px] border-[#d2e88a] shadow-[0_4px_12px_rgba(0,0,0,0.08)] z-30 whitespace-nowrap opacity-88 max-w-[90%]">
                  <Image width={100} height={100} src="/assets/imgRating2.svg" className="w-4 h-4 shrink-0" alt="sparkle" />
                  <span className="text-[clamp(10px,2.5cqi,14px)] font-[500] tracking-[-0.42px] text-[#0a0a0a] truncate">Add picture in the wall | <span className="text-gray-400 ml-1"></span></span>
                </div>
              </div>
              <p className="text-[16px] font-[600] text-[#0a0a0a] tracking-[-0.48px] leading-[1.4] mt-1">Transform your empty wall into a stylish focal point in just one click.</p>
            </motion.div>

            {/* Tutorial 2 */}
            <motion.div variants={itemVariants} className="flex flex-col gap-3 group cursor-pointer">
              <div className="aspect-[16/9] relative bg-[#f5f5f5] rounded-[24px] flex items-center justify-center p-3 overflow-hidden">
                <div className="relative w-full h-full flex items-start gap-2">
                  <div className="flex-1 h-[80%] rounded-[12px] overflow-hidden shadow-md border-2 border-white relative">
                    <Image fill src="/assets/imgImage9.png" alt="Sketch" className="absolute inset-0 object-cover" />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/95 px-3 py-1 rounded-xl text-[11px] font-medium shadow-sm whitespace-nowrap z-10">Sketch</div>
                  </div>
                  <div className="flex-[1.3] h-full rounded-[12px] overflow-hidden shadow-md border-2 border-white relative">
                    <Image fill src="/assets/imgImage8.png" alt="Render" className="absolute inset-0 object-cover" />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/95 px-3 py-1 rounded-xl text-[11px] font-medium shadow-sm whitespace-nowrap z-10">Render result</div>
                  </div>
                  <div className="absolute left-[36%] bottom-[3%] w-6 h-6 z-20 pointer-events-none transform -rotate-12 scale-y-[-1]">
                    <Image fill src="/assets/imgArrow4.svg" className="object-contain" alt="curved arrow" />
                  </div>
                </div>
              </div>
              <p className="text-[14px] font-[500] text-[#0a0a0a] tracking-[-0.42px] leading-[1.5]">Transform your rough design into a stunning, lifelike visualization in seconds.</p>
            </motion.div>

            {/* Tutorial 3 */}
            <motion.div variants={itemVariants} className="flex flex-col gap-3 group cursor-pointer">
              <div className="aspect-[1.5] relative bg-[#f5f5f5] rounded-[32px] overflow-hidden">
                <div className="absolute left-[6%] top-[18.1%] w-[42.8%] h-[48%] rounded-[16px] overflow-hidden border border-white shadow-[0_2px_8px_rgba(99,99,99,0.12)] z-20">
                  <Image fill src="/assets/imgImage18.png" className="object-cover" alt="Before" />
                  <div className="absolute left-[52.8%] top-[75.5%] w-[56.3%] h-[75.5%] z-40">
                    <div className="absolute left-[-25%] top-[-31.25%] w-[37.5%] h-[37.5%] z-30">
                      <Image fill src="/assets/imgVerticalContainer1.svg" className="object-contain" alt="ring" />
                    </div>
                    <div className="absolute left-[-2.5%] top-[-1.25%] w-[18.75%] h-[18.75%] z-40">
                      <Image fill src="/assets/imgVerticalContainer2.svg" className="object-contain" alt="cursor" />
                    </div>
                  </div>
                </div>
                <div className="absolute left-[46.1%] top-[27.1%] w-[9.6%] h-[12.7%] z-30" style={{ transform: 'rotate(69.63deg)' }}>
                  <Image fill src="/assets/imgArrow5.svg" className="object-contain" alt="arrow" />
                </div>
                <div className="absolute left-[52.7%] top-[29.4%] w-[42.8%] h-[47%] rounded-[16px] overflow-hidden border border-white shadow-[0_2px_8px_rgba(99,99,99,0.12)] z-0">
                  <Image fill src="/assets/imgImage19.png" className="object-cover" alt="After" />
                </div>
                <div className="absolute left-[28.6%] top-[65.6%] w-[19.6%] h-[20.8%] flex items-center justify-center z-50">
                  <Image fill src="/assets/imgTextInput11.svg" className="absolute inset-0" alt="bubble" />
                  <span className="relative flex items-center justify-center text-[10px] font-bold text-[#c7de7d] tracking-[-0.3px]">Brush..</span>
                </div>
              </div>
              <p className="text-[16px] font-[600] text-[#0a0a0a] tracking-[-0.48px] leading-[1.4] mt-1">Easily switch colors and tones to explore new design moods.</p>
            </motion.div>

          </div>
        </motion.aside>
      </>)}
      </AnimatePresence>
      </main>

      <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} />

      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}