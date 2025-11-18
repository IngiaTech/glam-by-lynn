"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchTestimonials } from "@/lib/testimonials";
import { Testimonial } from "@/types";
import { handleApiError } from "@/lib/api-error-handler";
import { Star, MapPin, Quote, Sparkles } from "lucide-react";
import Image from "next/image";

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchTestimonials();
      setTestimonials(response.items);
    } catch (err) {
      console.error("Failed to load testimonials:", err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-secondary/10 to-background py-16">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-secondary/10 p-4">
                  <Quote className="h-12 w-12 text-secondary" />
                </div>
              </div>
              <h1 className="text-4xl font-bold md:text-5xl">
                What Our <span className="text-secondary">Clients</span> Say
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Read testimonials from our satisfied clients and see why they trust us for their beauty needs
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-32 bg-muted rounded" />
                          <div className="h-3 w-24 bg-muted rounded" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-full bg-muted rounded" />
                        <div className="h-3 w-full bg-muted rounded" />
                        <div className="h-3 w-2/3 bg-muted rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={loadTestimonials}>Try Again</Button>
              </div>
            ) : testimonials.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-muted p-6">
                    <Quote className="h-12 w-12 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">No Testimonials Yet</h3>
                <p className="text-muted-foreground">
                  Be the first to share your experience with us!
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {testimonials.map((testimonial) => (
                  <Card
                    key={testimonial.id}
                    className={`transition-shadow hover:shadow-lg ${
                      testimonial.isFeatured ? "ring-2 ring-secondary" : ""
                    }`}
                  >
                    <CardContent className="p-6 space-y-4">
                      {/* Featured Badge */}
                      {testimonial.isFeatured && (
                        <div className="flex justify-end">
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                            <Sparkles className="h-3 w-3" />
                            Featured
                          </span>
                        </div>
                      )}

                      {/* Customer Info */}
                      <div className="flex items-start gap-4">
                        {testimonial.customerPhotoUrl ? (
                          <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
                            <Image
                              src={testimonial.customerPhotoUrl}
                              alt={testimonial.customerName}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/40 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl font-bold text-secondary">
                              {testimonial.customerName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">
                            {testimonial.customerName}
                          </h3>
                          {testimonial.location && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" />
                              <span>{testimonial.location}</span>
                            </div>
                          )}
                          <div className="mt-2">
                            {renderStars(testimonial.rating)}
                          </div>
                        </div>
                      </div>

                      {/* Testimonial Text */}
                      <div className="relative">
                        <Quote className="absolute -top-2 -left-2 h-8 w-8 text-secondary/10" />
                        <p className="text-sm text-muted-foreground italic pl-6">
                          {testimonial.testimonialText}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        {!loading && !error && testimonials.length > 0 && (
          <section className="bg-muted/50 py-16">
            <div className="container mx-auto px-4">
              <Card className="border-secondary/50 bg-gradient-to-br from-background to-secondary/5">
                <CardContent className="p-8 md:p-12 text-center space-y-6">
                  <h2 className="text-3xl font-bold md:text-4xl">
                    Ready to Experience Our Service?
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Join hundreds of satisfied clients who trust us for their beauty needs
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button size="lg" asChild>
                      <a href="/services">Book a Service</a>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <a href="/contact">Contact Us</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
