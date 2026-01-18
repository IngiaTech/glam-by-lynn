"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireAdmin } from "@/hooks/useAuth";
import { GraduationCap, Users } from "lucide-react";
import { ClassesList } from "./classes-list";
import { EnrollmentsList } from "./enrollments-list";

function ClassesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, isAdmin } = useRequireAdmin();

  const currentTab = searchParams.get("tab") || "classes";

  const handleTabChange = (tab: string) => {
    if (tab === "classes") {
      router.push("/admin/classes");
    } else {
      router.push(`/admin/classes?tab=${tab}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Classes Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage your makeup training classes and student enrollments
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-4" aria-label="Tabs">
          <button
            onClick={() => handleTabChange("classes")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              currentTab === "classes"
                ? "border-secondary text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Classes
          </button>
          <button
            onClick={() => handleTabChange("enrollments")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              currentTab === "enrollments"
                ? "border-secondary text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            }`}
          >
            <Users className="h-4 w-4" />
            Enrollments
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {currentTab === "classes" && <ClassesList />}
        {currentTab === "enrollments" && <EnrollmentsList />}
      </div>
    </div>
  );
}

export default function ClassesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="text-lg">Loading...</div>
        </div>
      }
    >
      <ClassesPageContent />
    </Suspense>
  );
}
