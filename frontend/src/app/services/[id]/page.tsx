/**
 * Service Detail Page
 *
 * Public detail view for a single service package. This is the URL we
 * share on socials (replaces the previous deep-link to /bookings/new),
 * so the OG layout + this page must stay in sync.
 */

"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, CalendarCheck, Sparkles } from "lucide-react";

import {
  getServicePackageById,
  getPackageTypeName,
  getPricingDescription,
  getPackageFeatures,
  formatPrice,
} from "@/lib/services";
import { resolveImageUrl } from "@/lib/utils";
import type { ServicePackage } from "@/types";

interface ServiceDetailPageProps {
  params: Promise<{ id: string }>;
}

function startingPrice(pkg: ServicePackage): string | null {
  const candidates = [
    pkg.base_bride_price,
    pkg.base_maid_price,
    pkg.base_mother_price,
    pkg.base_other_price,
  ]
    .map((p) => (p ? Number.parseFloat(p) : NaN))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!candidates.length) return null;
  return formatPrice(Math.min(...candidates));
}

export default function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [pkg, setPkg] = useState<ServicePackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getServicePackageById(id)
      .then((data) => {
        if (!cancelled) setPkg(data);
      })
      .catch((err) => {
        console.error("service fetch failed", err);
        if (!cancelled) setError("Failed to load service details. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="mb-4 h-10 w-32" />
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <Skeleton className="h-72 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-lg font-medium">
                {error || "Service not found"}
              </p>
              <Button onClick={() => router.push("/services")}>
                Browse All Services
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const features = getPackageFeatures(pkg);
  const pricing = getPricingDescription(pkg);
  const startsAt = startingPrice(pkg);
  const isPopular =
    pkg.package_type === "bridal_large" || pkg.package_type === "bride_only";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.push("/services")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Services
        </Button>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-8 lg:col-span-2">
            {pkg.image_url && (
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-pink-50 bg-gradient-to-br from-secondary/20 to-muted shadow-lg">
                <Image
                  src={resolveImageUrl(pkg.image_url)}
                  alt={pkg.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {getPackageTypeName(pkg.package_type)}
                </Badge>
                {isPopular && (
                  <Badge>
                    <Sparkles className="mr-1 h-3 w-3" /> Popular
                  </Badge>
                )}
                {pkg.includes_facial && (
                  <Badge variant="outline">Facial included</Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold tracking-tight">{pkg.name}</h1>
              {startsAt && (
                <p className="mt-3 text-2xl font-semibold text-secondary">
                  From {startsAt}
                </p>
              )}
            </div>

            {pkg.description && (
              <div>
                <h2 className="mb-2 text-lg font-semibold">About this service</h2>
                <p className="text-muted-foreground whitespace-pre-line">
                  {pkg.description}
                </p>
              </div>
            )}

            <div>
              <h2 className="mb-3 text-lg font-semibold">What&apos;s included</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1 text-secondary">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold">Pricing</h2>
              <p className="text-sm text-muted-foreground">{pricing}</p>
            </div>
          </div>

          {/* Booking sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="border-secondary/40 shadow-lg">
              <CardHeader>
                <CardTitle>Ready to book?</CardTitle>
                <CardDescription>
                  Reserve this package or start the conversation on WhatsApp.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => router.push(`/bookings/new?packageId=${pkg.id}`)}
                >
                  <CalendarCheck className="mr-2 h-5 w-5" />
                  Book Now
                </Button>
                <WhatsAppButton
                  variant="outline"
                  size="lg"
                  label="Book on WhatsApp"
                  className="w-full"
                  context={{ type: "service", service_id: pkg.id }}
                />
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
