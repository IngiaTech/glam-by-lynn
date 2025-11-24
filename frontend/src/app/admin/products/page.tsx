"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireAdmin } from "@/hooks/useAuth";
import { Package, Layers, Bookmark } from "lucide-react";
import { ProductsList } from "./products-list";
import { CategoriesList } from "./categories-list";
import { BrandsList } from "./brands-list";

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, isAdmin } = useRequireAdmin();

  const currentTab = searchParams.get("tab") || "products";

  const handleTabChange = (tab: string) => {
    if (tab === "products") {
      router.push("/admin/products");
    } else {
      router.push(`/admin/products?tab=${tab}`);
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
        <h1 className="text-3xl font-bold tracking-tight">Products Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage your products, categories, and brands
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-4" aria-label="Tabs">
          <button
            onClick={() => handleTabChange("products")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              currentTab === "products"
                ? "border-secondary text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            }`}
          >
            <Package className="h-4 w-4" />
            Products
          </button>
          <button
            onClick={() => handleTabChange("categories")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              currentTab === "categories"
                ? "border-secondary text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            }`}
          >
            <Layers className="h-4 w-4" />
            Categories
          </button>
          <button
            onClick={() => handleTabChange("brands")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              currentTab === "brands"
                ? "border-secondary text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            }`}
          >
            <Bookmark className="h-4 w-4" />
            Brands
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {currentTab === "products" && <ProductsList />}
        {currentTab === "categories" && <CategoriesList />}
        {currentTab === "brands" && <BrandsList />}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}
