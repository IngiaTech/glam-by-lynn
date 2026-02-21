/**
 * New Booking Page - Tab-based Multi-step Wizard
 * 4-step booking flow: Choose Service → Date & Time → Your Details → Review & Confirm
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ServicePackage, TransportLocation } from "@/types";
import { getActiveServicePackages, formatPrice, getPricingDescription } from "@/lib/services";
import {
  getTransportLocations,
  createBooking,
  calculateBookingPrice,
  formatCurrency,
  formatDate,
  formatTime,
} from "@/lib/bookings";
import { calculateTransportCost } from "@/lib/transport-pricing";
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
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Choose Service", icon: Sparkles },
  { id: 2, label: "Date & Time", icon: Calendar },
  { id: 3, label: "Your Details", icon: Users },
  { id: 4, label: "Review & Confirm", icon: ClipboardCheck },
] as const;

const TIME_SLOTS = Array.from({ length: 10 }, (_, i) => {
  const hour = 8 + i;
  const timeStr = `${hour.toString().padStart(2, "0")}:00:00`;
  const displayTime = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
  return { value: timeStr, label: displayTime };
});

function BookingFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, session } = useAuth();

  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Data state
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [locations, setLocations] = useState<TransportLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [locationType, setLocationType] = useState<"predefined" | "custom">("predefined");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [customLocation, setCustomLocation] = useState<{
    address: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
  } | null>(null);
  const [bookingDate, setBookingDate] = useState<string>("");
  const [bookingTime, setBookingTime] = useState<string>("");
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
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [packagesData, locationsData] = await Promise.all([
          getActiveServicePackages(),
          getTransportLocations(),
        ]);
        setPackages(packagesData);
        setLocations(locationsData);

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

  // Calculate price
  const pricing =
    selectedPackage && (selectedLocation || customLocation)
      ? (() => {
          const transportCost =
            locationType === "predefined" && selectedLocation
              ? parseFloat(selectedLocation.transport_cost)
              : customLocation
                ? calculateTransportCost(customLocation.distanceKm).totalCost
                : 0;

          return calculateBookingPrice(
            parseFloat(selectedPackage.base_bride_price || "0"),
            parseFloat(selectedPackage.base_maid_price || "0"),
            parseFloat(selectedPackage.base_mother_price || "0"),
            parseFloat(selectedPackage.base_other_price || "0"),
            numBrides,
            numMaids,
            numMothers,
            numOthers,
            transportCost
          );
        })()
      : null;

  // Validation per step
  const hasValidLocation =
    locationType === "predefined" ? !!selectedLocationId : !!customLocation;

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!selectedPackageId;
      case 2:
        return !!bookingDate && !!bookingTime && hasValidLocation;
      case 3:
        return user ? true : !!(guestName && guestEmail && guestPhone);
      case 4:
        return true;
      default:
        return false;
    }
  };

  const canSubmit =
    selectedPackageId &&
    hasValidLocation &&
    bookingDate &&
    bookingTime &&
    (user || (guestName && guestEmail && guestPhone)) &&
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
    if (canProceedFromStep(currentStep) && currentStep < 4) {
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

      const bookingData = {
        package_id: selectedPackageId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        ...(locationType === "predefined"
          ? { location_id: selectedLocationId }
          : {
              custom_location_address: customLocation!.address,
              custom_location_latitude: customLocation!.latitude,
              custom_location_longitude: customLocation!.longitude,
              custom_location_distance_km: customLocation!.distanceKm,
            }),
        num_brides: numBrides,
        num_maids: numMaids,
        num_mothers: numMothers,
        num_others: numOthers,
        wedding_theme: weddingTheme || undefined,
        special_requests: specialRequests || undefined,
        ...(!user && {
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
        }),
      };

      const token = (session as any)?.accessToken;
      const booking = await createBooking(bookingData, token);

      sessionStorage.setItem(`booking_${booking.id}`, JSON.stringify(booking));
      router.push(`/bookings/${booking.id}/confirmation`);
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
                            {Math.floor(pkg.duration_minutes / 60)}h
                            {pkg.duration_minutes % 60 > 0 &&
                              ` ${pkg.duration_minutes % 60}m`}
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
                Continue to Date & Time
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Date & Time */}
        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="mb-2 text-2xl font-semibold">Select Date & Time</h2>
            <p className="mb-6 text-muted-foreground">
              Choose when and where you&apos;d like your appointment
            </p>

            {/* Date Selection */}
            <div className="mb-6">
              <Label htmlFor="date" className="mb-2 block text-base font-medium">
                Preferred Date *
              </Label>
              <Input
                id="date"
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="max-w-xs"
                required
              />
            </div>

            {/* Time Slot Selection */}
            <div className="mb-6">
              <Label className="mb-3 block text-base font-medium">
                Preferred Time *
              </Label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {TIME_SLOTS.map((slot) => {
                  const isSelected = bookingTime === slot.value;
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => setBookingTime(slot.value)}
                      className={`rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                        isSelected
                          ? "border-secondary bg-secondary text-secondary-foreground"
                          : "border-border bg-background hover:border-secondary/50 hover:bg-muted"
                      }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location Selection */}
            <div className="mb-6">
              <Label className="mb-3 block text-base font-medium">
                Location *
              </Label>

              <RadioGroup
                value={locationType}
                onValueChange={(value) =>
                  setLocationType(value as "predefined" | "custom")
                }
                className="mb-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="predefined" id="predefined" />
                  <Label htmlFor="predefined" className="cursor-pointer font-normal">
                    Choose from predefined locations (Nairobi/Kitui)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="cursor-pointer font-normal">
                    Search for my location
                  </Label>
                </div>
              </RadioGroup>

              {locationType === "predefined" ? (
                <div className="max-w-md">
                  <Select
                    value={selectedLocationId}
                    onValueChange={setSelectedLocationId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.location_name}
                          {parseFloat(loc.transport_cost) > 0 &&
                            ` (+${formatCurrency(parseFloat(loc.transport_cost))})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="max-w-md space-y-2">
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
                    <div className="rounded-md border border-border bg-muted/50 p-3">
                      <p className="text-sm font-medium">{customLocation.address}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Distance from Nairobi: {customLocation.distanceKm.toFixed(1)}{" "}
                        km {" · "} Transport cost:{" "}
                        {formatCurrency(
                          calculateTransportCost(customLocation.distanceKm).totalCost
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
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
                Continue to Details
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Your Details */}
        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="mb-2 text-2xl font-semibold">Your Details</h2>
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
                        </Label>
                        <Input
                          id="maids"
                          type="number"
                          min="0"
                          value={numMaids || ""}
                          onChange={(e) =>
                            setNumMaids(parseInt(e.target.value) || 0)
                          }
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

            {/* Guest Information (if not logged in) */}
            {!user && (
              <div className="mb-6">
                <h3 className="mb-3 text-lg font-medium">
                  Contact Information
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  We&apos;ll use this to confirm your booking
                </p>
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
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guestPhone">Phone Number *</Label>
                      <Input
                        id="guestPhone"
                        type="tel"
                        placeholder="+254 7XX XXX XXX"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        required
                      />
                    </div>
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
                disabled={!canProceedFromStep(3)}
                size="lg"
              >
                Review Booking
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {currentStep === 4 && (
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
                      Date, Time & Location
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
                      <span>{formatTime(bookingTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {locationType === "predefined"
                          ? selectedLocation?.location_name || "—"
                          : customLocation?.address || "—"}
                      </span>
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
                        onClick={() => goToStep(3)}
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
                        <span>{formatCurrency(pricing.transport)}</span>
                      </div>
                      <div className="border-t border-border pt-3">
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Total:</span>
                          <span>{formatCurrency(pricing.total)}</span>
                        </div>
                        <div className="mt-2 flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Deposit Required (50%):
                          </span>
                          <span className="font-semibold text-secondary">
                            {formatCurrency(pricing.deposit)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Remaining {formatCurrency(pricing.total - pricing.deposit)} due after service delivery
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={prevStep} size="lg">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || attendeeErrors.length > 0 || submitting}
                size="lg"
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
