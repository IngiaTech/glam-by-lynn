/**
 * New Booking Page - Tab-based Multi-step Wizard
 * 5-step booking flow: Choose Service → Date & Location → Event Details → Contact Information → Review & Confirm
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ServicePackage } from "@/types";
import { getActiveServicePackages, formatPrice, getPricingDescription } from "@/lib/services";
import {
  createBooking,
  calculateBookingPrice,
  formatCurrency,
  formatDate,
} from "@/lib/bookings";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2,
  Calendar,
  MapPin,
  Users,
  Clock,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ClipboardCheck,
  ContactRound,
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Choose Service", icon: Sparkles },
  { id: 2, label: "Date & Location", icon: Calendar },
  { id: 3, label: "Event Details", icon: Users },
  { id: 4, label: "Contact Information", icon: ContactRound },
  { id: 5, label: "Review & Confirm", icon: ClipboardCheck },
] as const;

function BookingFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, session } = useAuth();

  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Data state
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Contact validation -------------------------------------------------
  // Loose enough to accept anything that's recognisably an email — a
  // single @ with a TLD-looking right-hand side. We're after "is this
  // address typo-free enough to reach the user", not RFC compliance.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  // Kenyan mobile: +254 7XX/1XX XXX XXX, or 07XX/01XX XXX XXX. Strip
  // spaces/dashes before checking.
  const PHONE_RE = /^(?:\+?254|0)(?:7|1)\d{8}$/;
  const normalizePhone = (s: string) => s.replace(/[\s-]/g, "");
  const isValidEmail = (s: string) => EMAIL_RE.test(s.trim());
  const isValidPhone = (s: string) => PHONE_RE.test(normalizePhone(s));

  // Form state
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [customLocation, setCustomLocation] = useState<{
    address: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
  } | null>(null);
  const [locationDescription, setLocationDescription] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>("");
  const [numBrides, setNumBrides] = useState<number>(1);
  const [numMaids, setNumMaids] = useState<number>(0);
  const [numMothers, setNumMothers] = useState<number>(0);
  const [numOthers, setNumOthers] = useState<number>(0);
  const [weddingTheme, setWeddingTheme] = useState<string>("");
  const [specialRequests, setSpecialRequests] = useState<string>("");

  // Guest info (if not authenticated)
  const [guestName, setGuestName] = useState<string>("");
  const [guestEmail, setGuestEmail] = useState<string>("");
  const [guestPhone, setGuestPhone] = useState<string>("");

  // Derived state
  const selectedPackage = packages.find((p) => p.id === selectedPackageId);

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const packagesData = await getActiveServicePackages();
        setPackages(packagesData);

        // Pre-select package from URL param
        const packageId = searchParams?.get("packageId");
        if (packageId && packagesData.find((p) => p.id === packageId)) {
          setSelectedPackageId(packageId);
        }
      } catch (err) {
        console.error("Failed to load booking data:", err);
        setError("Failed to load booking form. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [searchParams]);

  // When the selected package changes, snap numMaids into the package's
  // [min_maids, max_maids] range so the form starts at a valid state.
  useEffect(() => {
    if (!selectedPackage) return;
    const min = selectedPackage.min_maids ?? 0;
    const max = selectedPackage.max_maids ?? Infinity;
    setNumMaids((current) => Math.min(Math.max(current, min), max));
  }, [selectedPackage]);

  // Calculate price (transport cost is determined manually after booking)
  const pricing =
    selectedPackage && customLocation
      ? calculateBookingPrice(
          parseFloat(selectedPackage.base_bride_price || "0"),
          parseFloat(selectedPackage.base_maid_price || "0"),
          parseFloat(selectedPackage.base_mother_price || "0"),
          parseFloat(selectedPackage.base_other_price || "0"),
          numBrides,
          numMaids,
          numMothers,
          numOthers,
          0,
        )
      : null;

  // Validation per step
  const hasValidLocation = !!customLocation;

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!selectedPackageId;
      case 2:
        return !!bookingDate && hasValidLocation;
      case 3:
        return attendeeErrors.length === 0;
      case 4:
        return user
          ? true
          : !!guestName.trim() &&
              isValidEmail(guestEmail) &&
              isValidPhone(guestPhone);
      case 5:
        return true;
      default:
        return false;
    }
  };

  const canSubmit =
    selectedPackageId &&
    hasValidLocation &&
    bookingDate &&
    (user ||
      (guestName.trim() &&
        isValidEmail(guestEmail) &&
        isValidPhone(guestPhone))) &&
    pricing &&
    pricing.total > 0;

  // Package validation
  const attendeeErrors: string[] = [];
  if (selectedPackage) {
    if (selectedPackage.min_maids && numMaids < selectedPackage.min_maids) {
      attendeeErrors.push(
        `Minimum ${selectedPackage.min_maids} maid(s) required for this package`
      );
    }
    if (selectedPackage.max_maids && numMaids > selectedPackage.max_maids) {
      attendeeErrors.push(
        `Maximum ${selectedPackage.max_maids} maid(s) allowed for this package`
      );
    }
  }

  // Navigation
  const goToStep = (step: number) => {
    if (step < currentStep || canProceedFromStep(currentStep)) {
      setCurrentStep(step);
      setError(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const nextStep = () => {
    if (canProceedFromStep(currentStep) && currentStep < 5) {
      setCurrentStep(currentStep + 1);
      setError(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!canSubmit) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // The picker now collects a date only; the exact appointment time is
      // confirmed with the customer after booking. Send a neutral placeholder
      // for the time the backend still requires.
      const bookingData = {
        package_id: selectedPackageId,
        booking_date: bookingDate,
        booking_time: "09:00:00",
        custom_location_address: customLocation!.address,
        custom_location_latitude: customLocation!.latitude,
        custom_location_longitude: customLocation!.longitude,
        location_description: locationDescription || undefined,
        num_brides: numBrides,
        num_maids: numMaids,
        num_mothers: numMothers,
        num_others: numOthers,
        wedding_theme: weddingTheme || undefined,
        special_requests: specialRequests || undefined,
        ...(!user && {
          guest_name: guestName.trim(),
          guest_email: guestEmail.trim(),
          guest_phone: normalizePhone(guestPhone),
        }),
      };

      const token = (session as any)?.accessToken;
      const booking = await createBooking(bookingData, token);

      // Keep the cached payload as a fast-path; the signed token in the
      // URL is the durable way to re-open the page on refresh / new tab.
      sessionStorage.setItem(`booking_${booking.id}`, JSON.stringify(booking));
      router.push(
        `/bookings/${booking.id}/confirmation?token=${encodeURIComponent(booking.confirmationToken)}`,
      );
    } catch (err: any) {
      console.error("Failed to create booking:", err);
      setError(err.message || "Failed to create booking. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-b from-background to-muted/20 px-4 py-10">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
            Book Your Service
          </h1>
          <p className="text-muted-foreground">
            Complete the steps below to reserve your makeup appointment
          </p>
        </div>
      </section>

      {/* Step Indicator */}
      <div className="border-b border-border bg-background">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const isClickable = step.id < currentStep || canProceedFromStep(currentStep);

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => isClickable && goToStep(step.id)}
                    disabled={!isClickable}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all sm:px-4 sm:py-2.5 ${
                      isActive
                        ? "bg-secondary text-secondary-foreground shadow-sm"
                        : isCompleted
                          ? "bg-secondary/20 text-foreground hover:bg-secondary/30"
                          : "bg-muted text-muted-foreground"
                    } ${isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isActive
                          ? "bg-background text-foreground"
                          : isCompleted
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.id}
                    </span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground/50 sm:mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto max-w-4xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* Step 1: Choose Service */}
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="mb-2 text-2xl font-semibold">Select Your Service</h2>
            <p className="mb-6 text-muted-foreground">
              Choose the makeup service package that best fits your needs
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {packages.map((pkg) => {
                const isSelected = selectedPackageId === pkg.id;
                return (
                  <Card
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected
                        ? "border-secondary bg-secondary/5 shadow-md ring-2 ring-secondary"
                        : "hover:border-secondary/50"
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="mb-3 flex items-start justify-between">
                        <h3 className="text-lg font-semibold">{pkg.name}</h3>
                        {isSelected && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary">
                            <Check className="h-4 w-4 text-secondary-foreground" />
                          </div>
                        )}
                      </div>

                      {pkg.base_bride_price && (
                        <p className="mb-2 text-xl font-bold text-secondary">
                          {formatPrice(pkg.base_bride_price)}
                          <span className="text-sm font-normal text-muted-foreground">
                            {" "}/ bride
                          </span>
                        </p>
                      )}

                      {pkg.description && (
                        <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                          {pkg.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {pkg.duration_minutes && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="mr-1 h-3 w-3" />
                            {pkg.duration_minutes >= 1440
                              ? `${Math.floor(pkg.duration_minutes / 1440)}d${Math.floor((pkg.duration_minutes % 1440) / 60) > 0 ? ` ${Math.floor((pkg.duration_minutes % 1440) / 60)}h` : ""}`
                              : `${Math.floor(pkg.duration_minutes / 60)}h${pkg.duration_minutes % 60 > 0 ? ` ${pkg.duration_minutes % 60}m` : ""}`
                            }
                          </Badge>
                        )}
                        {pkg.includes_facial && (
                          <Badge variant="outline" className="text-xs">
                            Facial included
                          </Badge>
                        )}
                        {pkg.package_type.includes("bridal") && (
                          <Badge variant="secondary" className="text-xs">
                            Bridal
                          </Badge>
                        )}
                      </div>

                      {/* Show full pricing for packages with multiple roles */}
                      {(pkg.base_maid_price || pkg.base_mother_price || pkg.base_other_price) && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          {getPricingDescription(pkg)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {packages.length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  No service packages available at the moment. Please try again later.
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex justify-end">
              <Button
                onClick={nextStep}
                disabled={!canProceedFromStep(1)}
                size="lg"
              >
                Continue to Date & Location
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Date & Time */}
        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="mb-2 text-2xl font-semibold">Select Date & Location</h2>
            <p className="mb-6 text-muted-foreground">
              Choose when and where you&apos;d like your appointment
            </p>

            {/* Date & Time Selection */}
            <div className="mb-6">
              <Label htmlFor="date" className="mb-2 block text-base font-medium">
                Preferred Date *
              </Label>
              <Input
                id="date"
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={(() => {
                  const now = new Date();
                  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                  return now.toISOString().slice(0, 10);
                })()}
                className="max-w-xs"
                required
              />
              <p className="mt-2 text-sm text-muted-foreground">
                We&apos;ll confirm the exact appointment time with you after your
                booking.
              </p>
            </div>

            {/* Location Selection */}
            <div className="mb-6 space-y-4">
              <div>
                <Label className="mb-2 block text-base font-medium">
                  Location *
                </Label>
                <div className="max-w-md">
                  <LocationAutocomplete
                    onLocationSelect={(location) => {
                      setCustomLocation({
                        address: location.address,
                        latitude: location.latitude,
                        longitude: location.longitude,
                        distanceKm: location.distanceFromNairobi || 0,
                      });
                    }}
                    placeholder="Search for your location in Kenya..."
                  />
                  {customLocation && (
                    <div className="mt-2 rounded-md border border-border bg-muted/50 p-3">
                      <p className="text-sm font-medium">{customLocation.address}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="max-w-md">
                <Label
                  htmlFor="location-description"
                  className="mb-2 block text-base font-medium"
                >
                  Location details
                </Label>
                <Textarea
                  id="location-description"
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  placeholder="Apartment, floor, landmarks, gate code, or directions to help us find the exact spot"
                  rows={3}
                />
                <p className="mt-2 text-sm font-semibold text-secondary">
                  Some areas within Kitui town and Nairobi town are free.
                  Transport cost will be confirmed by our team after we verify
                  availability and location.
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={prevStep} size="lg">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={!canProceedFromStep(2)}
                size="lg"
              >
                Continue to Event Details
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Event Details */}
        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="mb-2 text-2xl font-semibold">Event Details</h2>
            <p className="mb-6 text-muted-foreground">
              Tell us about your event and how many people need makeup
            </p>

            {/* Number of People */}
            {selectedPackage && (
              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">Number of People</h3>

                {attendeeErrors.length > 0 && (
                  <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-3">
                    {attendeeErrors.map((err, i) => (
                      <p key={i} className="text-sm text-destructive">
                        {err}
                      </p>
                    ))}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedPackage.base_bride_price &&
                    parseFloat(selectedPackage.base_bride_price) > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="brides">
                          Brides ({formatCurrency(parseFloat(selectedPackage.base_bride_price))} each)
                        </Label>
                        <Input
                          id="brides"
                          type="number"
                          min="0"
                          value={numBrides || ""}
                          onChange={(e) =>
                            setNumBrides(parseInt(e.target.value) || 0)
                          }
                        />
                      </div>
                    )}

                  {selectedPackage.base_maid_price &&
                    parseFloat(selectedPackage.base_maid_price) > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="maids">
                          Maids/Bridesmaids ({formatCurrency(parseFloat(selectedPackage.base_maid_price))} each)
                          {selectedPackage.min_maids ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              · minimum {selectedPackage.min_maids}
                            </span>
                          ) : null}
                        </Label>
                        <Input
                          id="maids"
                          type="number"
                          min={selectedPackage.min_maids ?? 0}
                          max={selectedPackage.max_maids ?? undefined}
                          value={numMaids}
                          onChange={(e) => {
                            const raw = parseInt(e.target.value);
                            const min = selectedPackage.min_maids ?? 0;
                            const max = selectedPackage.max_maids ?? Infinity;
                            const next = Number.isNaN(raw) ? min : raw;
                            setNumMaids(Math.min(Math.max(next, min), max));
                          }}
                        />
                      </div>
                    )}

                  {selectedPackage.base_mother_price &&
                    parseFloat(selectedPackage.base_mother_price) > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="mothers">
                          Mothers ({formatCurrency(parseFloat(selectedPackage.base_mother_price))} each)
                        </Label>
                        <Input
                          id="mothers"
                          type="number"
                          min="0"
                          value={numMothers || ""}
                          onChange={(e) =>
                            setNumMothers(parseInt(e.target.value) || 0)
                          }
                        />
                      </div>
                    )}

                  {selectedPackage.base_other_price &&
                    parseFloat(selectedPackage.base_other_price) > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="others">
                          Others - Aunties, Cousins, Friends ({formatCurrency(parseFloat(selectedPackage.base_other_price))} each)
                        </Label>
                        <Input
                          id="others"
                          type="number"
                          min="0"
                          value={numOthers || ""}
                          onChange={(e) =>
                            setNumOthers(parseInt(e.target.value) || 0)
                          }
                        />
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Additional Details */}
            <div className="mb-6">
              <h3 className="mb-3 text-lg font-medium">Additional Details</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Wedding/Event Theme</Label>
                  <Input
                    id="theme"
                    type="text"
                    placeholder="e.g., Rustic Garden, Modern Glam, Traditional"
                    value={weddingTheme}
                    onChange={(e) => setWeddingTheme(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requests">Special Requests</Label>
                  <Textarea
                    id="requests"
                    placeholder="Any special requirements or preferences?"
                    value={specialRequests}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setSpecialRequests(e.target.value)
                    }
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={prevStep} size="lg">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={!canProceedFromStep(3)}
                size="lg"
              >
                Continue to Contact Info
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Contact Information */}
        {currentStep === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="mb-2 text-2xl font-semibold">Contact Information</h2>
            <p className="mb-6 text-muted-foreground">
              We&apos;ll use this to confirm your booking and share any
              additional details about your appointment.
            </p>

            {user ? (
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Signed in as</p>
                  <p className="font-medium">{user.email}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="guestName">Full Name *</Label>
                  <Input
                    id="guestName"
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="guestEmail">Email Address *</Label>
                    <Input
                      id="guestEmail"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      aria-invalid={
                        guestEmail.length > 0 && !isValidEmail(guestEmail)
                      }
                      required
                    />
                    {guestEmail.length > 0 && !isValidEmail(guestEmail) && (
                      <p className="text-xs text-destructive">
                        Enter a valid email address (e.g. you@example.com).
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guestPhone">Phone Number *</Label>
                    <Input
                      id="guestPhone"
                      type="tel"
                      placeholder="+254 7XX XXX XXX"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      aria-invalid={
                        guestPhone.length > 0 && !isValidPhone(guestPhone)
                      }
                      required
                    />
                    {guestPhone.length > 0 && !isValidPhone(guestPhone) ? (
                      <p className="text-xs text-destructive">
                        Enter a Kenyan mobile number, e.g. +254 712 345 678 or
                        0712 345 678.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Kenyan mobile: +254 7XX XXX XXX or 07XX XXX XXX.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={prevStep} size="lg">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={!canProceedFromStep(4)}
                size="lg"
              >
                Review Booking
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Review & Confirm */}
        {currentStep === 5 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="mb-2 text-2xl font-semibold">Review & Confirm</h2>
            <p className="mb-6 text-muted-foreground">
              Please review your booking details before confirming
            </p>

            <div className="space-y-4">
              {/* Service Summary */}
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-muted-foreground">
                      Service
                    </h3>
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="text-sm text-secondary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-lg font-medium">
                    {selectedPackage?.name}
                  </p>
                  {selectedPackage?.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedPackage.description}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Date & Location Summary */}
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-muted-foreground">
                      Date & Location
                    </h3>
                    <button
                      type="button"
                      onClick={() => goToStep(2)}
                      className="text-sm text-secondary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(bookingDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Time to be confirmed
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div>
                        <p>{customLocation?.address || "—"}</p>
                        {locationDescription && (
                          <p className="text-xs text-muted-foreground whitespace-pre-line">
                            {locationDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendees Summary */}
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-muted-foreground">
                      Attendees & Details
                    </h3>
                    <button
                      type="button"
                      onClick={() => goToStep(3)}
                      className="text-sm text-secondary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-1 text-sm">
                    {numBrides > 0 && (
                      <p>
                        Brides: <span className="font-medium">{numBrides}</span>
                      </p>
                    )}
                    {numMaids > 0 && (
                      <p>
                        Maids/Bridesmaids:{" "}
                        <span className="font-medium">{numMaids}</span>
                      </p>
                    )}
                    {numMothers > 0 && (
                      <p>
                        Mothers:{" "}
                        <span className="font-medium">{numMothers}</span>
                      </p>
                    )}
                    {numOthers > 0 && (
                      <p>
                        Others:{" "}
                        <span className="font-medium">{numOthers}</span>
                      </p>
                    )}
                    {weddingTheme && (
                      <p>
                        Theme:{" "}
                        <span className="font-medium">{weddingTheme}</span>
                      </p>
                    )}
                    {specialRequests && (
                      <p>
                        Special Requests:{" "}
                        <span className="font-medium">{specialRequests}</span>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info (guest) */}
              {!user && guestName && (
                <Card>
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-muted-foreground">
                        Contact Information
                      </h3>
                      <button
                        type="button"
                        onClick={() => goToStep(4)}
                        className="text-sm text-secondary hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p>
                        Name: <span className="font-medium">{guestName}</span>
                      </p>
                      <p>
                        Email: <span className="font-medium">{guestEmail}</span>
                      </p>
                      <p>
                        Phone: <span className="font-medium">{guestPhone}</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Price Summary */}
              {pricing && (
                <Card className="border-secondary">
                  <CardContent className="p-5">
                    <h3 className="mb-4 text-lg font-semibold">
                      Price Summary
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Service subtotal:
                        </span>
                        <span>{formatCurrency(pricing.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Transport:
                        </span>
                        <span className="italic text-muted-foreground">
                          To be confirmed
                        </span>
                      </div>
                      <div className="border-t border-border pt-3">
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Service Total:</span>
                          <span>{formatCurrency(pricing.total)}</span>
                        </div>
                        <div className="mt-2 flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Deposit (50% of service total):
                          </span>
                          <span className="font-semibold text-secondary">
                            {formatCurrency(pricing.deposit)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 rounded-md border border-secondary/40 bg-secondary/10 p-3 text-sm text-secondary">
                        <p className="font-semibold">How payment works</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-secondary/90">
                          <li>
                            Transport cost will be communicated after we
                            verify availability and your location.
                          </li>
                          <li>
                            The 50% deposit is paid once that transport
                            quote is confirmed with you.
                          </li>
                          <li>
                            The remaining 50% is paid on the service
                            delivery day, before the service is provided.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={prevStep} size="lg">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || attendeeErrors.length > 0 || submitting}
                size="lg"
                className="w-full sm:w-auto sm:min-w-[200px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming Booking...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Persistent WhatsApp escape hatch — always visible across every step so
          users who'd rather not finish the form can hand off to our team
          instead of abandoning the booking. Carries the service + date they've
          chosen so far. */}
      <div className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto max-w-4xl px-4 py-3">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <p className="text-center text-sm text-muted-foreground sm:text-left">
              Prefer to book over chat? Our team can complete it with you on
              WhatsApp.
            </p>
            <WhatsAppButton
              variant="outline"
              size="default"
              label="Book on WhatsApp"
              className="w-full sm:w-auto sm:min-w-[200px]"
              context={
                selectedPackage
                  ? {
                      type: "service",
                      service_id: selectedPackage.id,
                      preferred_date: bookingDate || undefined,
                    }
                  : { type: "general" }
              }
            />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      }
    >
      <BookingFormContent />
    </Suspense>
  );
}
