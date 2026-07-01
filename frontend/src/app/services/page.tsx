/**
 * Services Page
 * Display makeup service packages with booking options
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ServicePackage } from "@/types";
import {
  getActiveServicePackages,
  getPackageTypeName,
  getPricingDescription,
  getPackageFeatures,
} from "@/lib/services";
import { resolveImageUrl } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";

export default function ServicesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPackages() {
      try {
        setLoading(true);
        const data = await getActiveServicePackages();
        setPackages(data);
      } catch (err) {
        console.error("Failed to fetch service packages:", err);
        setError("Failed to load service packages. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchPackages();
  }, []);

  const handleBookNow = (packageId: string) => {
    router.push(`/bookings/new?packageId=${packageId}`);
  };

  const handleViewDetails = (packageId: string) => {
    router.push(`/services/${packageId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section - Dark gradient matching brand */}
      <section className="relative overflow-hidden bg-hero-gradient text-white px-4 py-16 md:py-24">
        {/* Animated pink glow effect */}
        <div className="absolute -right-1/2 -top-1/2 h-[200%] w-[200%] bg-pink-subtle animate-hero-pulse" />
        <div className="container relative mx-auto">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-vision-gradient text-white border-0 shadow-lg shadow-pink-500/30">
              Professional Services
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl drop-shadow-lg">
              <span className="text-white">Makeup</span>{" "}
              <span className="text-[#FFB6C1]">Services</span>
            </h1>
            <p className="text-lg text-white/80">
              From bridal beauty to special events, we offer professional makeup artistry tailored to your unique style and occasion
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <main className="container mx-auto px-4 py-16">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        ) : error ? (
          <div className="mx-auto max-w-md rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="mx-auto max-w-md rounded-lg border border-border bg-muted/50 p-6 text-center">
            <p className="text-muted-foreground">
              No service packages available at the moment. Please check back later.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-8 md:grid-cols-2">
              {packages.map((pkg) => {
                const features = getPackageFeatures(pkg);
                const pricingDescription = getPricingDescription(pkg);
                const isPopular = pkg.package_type === "bridal_large" || pkg.package_type === "bride_only";

                return (
                  <div
                    key={pkg.id}
                    id={pkg.id}
                    data-testid="service-card"
                    onClick={() => handleViewDetails(pkg.id)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleViewDetails(pkg.id);
                      }
                    }}
                    className={`service-card package-card group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[2rem] border bg-white transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-pink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${isPopular ? "border-secondary" : "border-pink-50"}`}
                  >
                    {/* Showcase image */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-secondary/20 to-muted">
                      {pkg.image_url ? (
                        <Image
                          src={resolveImageUrl(pkg.image_url)}
                          alt={pkg.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Sparkles className="h-14 w-14 text-secondary/30" />
                        </div>
                      )}
                      {/* Legibility gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                      {/* Badges */}
                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-pink-600 shadow-sm backdrop-blur-sm">
                          {getPackageTypeName(pkg.package_type)}
                        </span>
                        {isPopular && (
                          <span className="inline-flex items-center rounded-full bg-pink-600 px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-white shadow-lg">
                            Popular
                          </span>
                        )}
                      </div>
                      {/* Name overlaid on image */}
                      <h3 className="absolute inset-x-0 bottom-0 p-5 text-2xl font-bold text-white drop-shadow-md">
                        {pkg.name}
                      </h3>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col space-y-6 p-6">
                      {pkg.description && (
                        <p className="text-sm text-muted-foreground">{pkg.description}</p>
                      )}

                      {/* Features */}
                      <div className="flex-1">
                        <h4 className="mb-3 font-semibold">What&apos;s Included:</h4>
                        <ul className="space-y-2">
                          {features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="mt-1 text-secondary">✓</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Price and CTA */}
                      <div className="mt-auto flex flex-col gap-4 border-t border-border pt-6">
                        <div>
                          <p className="text-sm text-muted-foreground">Pricing</p>
                          <p className="text-sm font-semibold">{pricingDescription}</p>
                        </div>
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => handleBookNow(pkg.id)}
                              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70 active:text-secondary-foreground"
                            >
                              Book Now
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleViewDetails(pkg.id)}
                              className="border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary"
                            >
                              View Details
                            </Button>
                          </div>
                          <WhatsAppButton
                            variant="outline"
                            label="Book on WhatsApp"
                            className="w-full"
                            context={{ type: "service", service_id: pkg.id }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Call to Action */}
            <div className="mt-16">
              <Card className="border-secondary/50 bg-muted/50">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Ready to Book?</CardTitle>
                  <CardDescription>
                    Choose a service package above to get started or contact us for personalized recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => router.push("/contact")}>
                    Contact Us
                  </Button>
                  <Button onClick={() => router.push("/bookings/availability")}>
                    Check Availability
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
