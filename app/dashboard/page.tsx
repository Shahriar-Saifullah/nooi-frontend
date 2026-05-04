"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout, type AuthUser } from "@/lib/api/auth";
import Button from "@/components/Button";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then((res) => {
      if (res.success) {
        setUser(res.data.user);
      } else {
        router.replace("/authpage/signin");
      }
      setLoading(false);
    });
  }, [router]);

  const handleLogout = async () => {
    const res = await logout();
    if (res.success) {
      router.replace("/authpage/signin");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/Logo/Logo.svg" alt="Nooi" className="h-8 w-auto" />
            <span className="text-xl font-bold text-gray-900 ml-2">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="h-8 w-8 rounded-full border border-gray-200" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0)}
              </div>
            )}
            <Button variant="social" className="text-sm px-3 py-1.5" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.full_name ? user.full_name.split(' ')[0] : 'User'}!</h1>
          <p className="text-gray-500">Here&apos;s what&apos;s happening with your design projects.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Summary Cards */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Active Projects</h3>
            <p className="text-3xl font-bold text-gray-900">0</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Items in Cart</h3>
            <p className="text-3xl font-bold text-gray-900">0</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Saved Designs</h3>
            <p className="text-3xl font-bold text-gray-900">0</p>
          </div>
        </div>

        {/* Placeholder for projects */}
        <div className="mt-10 bg-white border border-dashed border-gray-300 rounded-2xl p-20 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">Start your first interior design project with our AI-powered tools.</p>
          <Button className="px-6 py-3 text-base">Create New Project</Button>
        </div>
      </main>
    </div>
  );
}
