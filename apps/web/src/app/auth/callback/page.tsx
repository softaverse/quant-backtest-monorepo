"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      // Refresh auth status after OAuth callback
      await refreshAuth();
      // Redirect to home page
      router.push("/");
    };

    handleCallback();
  }, [refreshAuth, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
