/**
 * Booking Confirmation Page
 * Displays booking confirmation details and next steps
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Booking } from "@/types";
import {
  getBookingById,
  getBookingConfirmation,
  formatCurrency,
  formatDate,
} from "@/lib/bookings";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2,
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  Users,
  CreditCard,
  Mail,
  Phone,
  AlertCircle,
} from "lucide-react";

export default function BookingConfirmationPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const bookingId = params?.id as string;
  const confirmationToken = searchParams?.get("token") ?? null;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBooking() {
      if (!bookingId) {
        setError("No booking ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Preferred: signed token in the URL. Lets guests refresh,
        // bookmark, or share the page without losing access.
        if (confirmationToken) {
          const data = await getBookingConfirmation(bookingId, confirmationToken);
          setBooking(data);
          setLoading(false);
          return;
        }

        // Legacy: payload cached in sessionStorage by the creation page
        // for users on the just-created tab.
        const cachedBooking = sessionStorage.getItem(`booking_${bookingId}`);
        if (cachedBooking) {
          setBooking(JSON.parse(cachedBooking));
          setLoading(false);
          return;
        }

        // Last resort: authenticated owner fetching their own booking.
        const token = session?.accessToken;
        if (!token) {
          setError(
            "Booking confirmation not found. Please open the link from your confirmation email.",
          );
          setLoading(false);
          return;
        }

        const data = await getBookingById(bookingId, token);
        setBooking(data);
      } catch (err: any) {
        console.error("Failed to load booking:", err);
        setError(err.message || "Failed to load booking details");
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [bookingId, confirmationToken, session]);

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

  if (error || !booking) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="container mx-auto flex flex-1 items-center justify-center px-4">
          <Card className="w-full max-w-md border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Error Loading Booking
              </CardTitle>
              <CardDescription>{error || "Booking not found"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/services")} className="w-full">
                Back to Services
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const totalAttendees =
    booking.numBrides + booking.numMaids + booking.numMothers + booking.numOthers;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Success Banner */}
      <section className="border-b border-border bg-gradient-to-b from-secondary/10 to-background px-4 py-12">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-secondary/20 p-4">
              <CheckCircle className="h-12 w-12 text-secondary" />
            </div>
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Booking Confirmed!
          </h1>
          <p className="mb-2 text-lg text-muted-foreground">
            Your booking has been successfully created
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Booking Number:</span>
            <Badge variant="secondary" className="text-base font-mono">
              {booking.bookingNumber}
            </Badge>
          </div>

          {/* What happens next — surfaced immediately so the customer
              knows exactly what to expect without having to scroll. */}
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border-2 border-secondary bg-secondary/10 p-5 text-left">
            <p className="text-sm font-bold uppercase tracking-wider text-secondary">
              What happens next
            </p>
            <p className="mt-2 text-base font-medium">
              We&apos;ll review your booking details and reach out by call or
              WhatsApp to confirm your appointment and location, verify
              availability, share the final cost (including any transport
              charge), and walk you through how to pay the 50% deposit.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The remaining 50% is paid on the service delivery day, before
              the service is provided.
            </p>
            <div className="mt-4">
              <WhatsAppButton
                size="lg"
                label="Reach us on WhatsApp"
                context={{ type: "booking", booking_number: booking.bookingNumber }}
              />
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="space-y-6">
          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Booking Details
              </CardTitle>
              <CardDescription>Your appointment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(booking.bookingDate)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="flex items-center gap-2 font-medium text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    To be confirmed
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4" />
                    {booking.customLocationAddress || booking.location?.location_name || "Location not specified"}
                  </p>
                  {booking.customLocationDistanceKm && (
                    <p className="text-xs text-muted-foreground">
                      {booking.customLocationDistanceKm.toFixed(1)} km from Nairobi
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={booking.status === "pending" ? "secondary" : "default"}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {booking.package && (
                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-sm text-muted-foreground">Package</p>
                  <p className="text-lg font-semibold">{booking.package.name}</p>
                  {booking.package.description && (
                    <p className="text-sm text-muted-foreground">{booking.package.description}</p>
                  )}
                </div>
              )}

              <div className="border-t border-border pt-4">
                <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Attendees ({totalAttendees} total)
                </p>
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  {booking.numBrides > 0 && (
                    <div className="flex justify-between">
                      <span>Brides:</span>
                      <span className="font-medium">{booking.numBrides}</span>
                    </div>
                  )}
                  {booking.numMaids > 0 && (
                    <div className="flex justify-between">
                      <span>Maids/Bridesmaids:</span>
                      <span className="font-medium">{booking.numMaids}</span>
                    </div>
                  )}
                  {booking.numMothers > 0 && (
                    <div className="flex justify-between">
                      <span>Mothers:</span>
                      <span className="font-medium">{booking.numMothers}</span>
                    </div>
                  )}
                  {booking.numOthers > 0 && (
                    <div className="flex justify-between">
                      <span>Others:</span>
                      <span className="font-medium">{booking.numOthers}</span>
                    </div>
                  )}
                </div>
              </div>

              {booking.weddingTheme && (
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">Wedding/Event Theme</p>
                  <p className="font-medium">{booking.weddingTheme}</p>
                </div>
              )}

              {booking.specialRequests && (
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">Special Requests</p>
                  <p className="text-sm">{booking.specialRequests}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price Summary */}
          <Card className="border-secondary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Price Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Service subtotal:
                  </span>
                  <span>{formatCurrency(booking.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transport:</span>
                  {booking.transportCost && booking.transportCost > 0 ? (
                    <span>{formatCurrency(booking.transportCost)}</span>
                  ) : (
                    <span className="italic text-muted-foreground">
                      To be confirmed
                    </span>
                  )}
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Service Total:</span>
                    <span>{formatCurrency(booking.totalAmount)}</span>
                  </div>
                  {booking.depositAmount && (
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Deposit (50% of service total):
                      </span>
                      <span className="font-semibold text-secondary">
                        {formatCurrency(booking.depositAmount)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4 rounded-md border border-secondary/40 bg-secondary/10 p-3 text-sm text-secondary">
                  <p className="font-semibold">How payment works</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-secondary/90">
                    <li>
                      Transport cost will be communicated after we verify
                      availability and your location.
                    </li>
                    <li>
                      The 50% deposit is paid once that transport quote is
                      confirmed with you.
                    </li>
                    <li>
                      The remaining 50% is paid on the service delivery day,
                      before the service is provided.
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>What Happens Next?</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    1
                  </span>
                  <div>
                    <p className="font-medium">We review your booking</p>
                    <p className="text-sm text-muted-foreground">
                      Our team verifies the package, attendees, date, and location you submitted.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    2
                  </span>
                  <div>
                    <p className="font-medium">We contact you to confirm</p>
                    <p className="text-sm text-muted-foreground">
                      We&apos;ll call or message you on WhatsApp to confirm availability, lock in the exact location, share the final cost (including any transport charge), and send instructions for the 50% deposit.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    3
                  </span>
                  <div>
                    <p className="font-medium">Pay the 50% deposit</p>
                    <p className="text-sm text-muted-foreground">
                      Pay via M-Pesa or bank transfer using the details we share. The deposit secures your booking.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    4
                  </span>
                  <div>
                    <p className="font-medium">Service delivery</p>
                    <p className="text-sm text-muted-foreground">
                      On your appointment day, our team arrives at the confirmed location ready to make you look stunning.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    5
                  </span>
                  <div>
                    <p className="font-medium">Pay the remaining 50%</p>
                    <p className="text-sm text-muted-foreground">
                      The balance is paid on the service delivery day, before the service is provided.
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>Get in touch with us</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone / WhatsApp</p>
                  <a href="tel:+254700000000" className="font-medium hover:text-secondary">
                    +254 700 000 000
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a
                    href="mailto:info@glambylynn.com"
                    className="font-medium hover:text-secondary"
                  >
                    info@glambylynn.com
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => router.push("/services")} variant="outline" className="flex-1">
              Book Another Service
            </Button>
            <Button onClick={() => router.push("/")} className="flex-1">
              Back to Home
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
