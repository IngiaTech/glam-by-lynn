"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Droplets,
  Truck,
  CheckCircle2,
  Users,
  MapPin,
  Heart,
  Star,
  Clock,
  Award,
} from "lucide-react";

export default function VisionPage() {
  const services = [
    {
      icon: Sparkles,
      title: "Full Beauty Services",
      description: "A complete range of makeup and beauty treatments under one roof",
      features: [
        "Makeup",
        "Makeup training",
        "Facials",
        "Lash extensions",
        "Microblading",
        "Deep tissue massages",
        "Waxing",
      ],
      image: "/placeholder-beauty.jpg",
    },
    {
      icon: Droplets,
      title: "Wellness Spa",
      description: "Rejuvenating treatments for complete mind and body wellness",
      features: [
        "Facials and skincare treatments",
        "Body massages and therapies",
        "Manicures and pedicures",
        "Waxing and threading services",
        "Trusted authentic makeup products",
      ],
      image: "/placeholder-spa.jpg",
    },
    {
      icon: Truck,
      title: "Mobile Beauty",
      description: "Bringing premium beauty services directly to you",
      features: [
        "On-location makeup services",
        "Beauty products delivery",
        "Event and wedding services",
        "Corporate wellness programs",
        "Serving Kitui and Nairobi regions",
      ],
      image: "/placeholder-mobile.jpg",
    },
  ];

  const benefits = [
    {
      icon: Award,
      title: "Expert Team",
      description: "Certified professionals with years of experience in beauty and wellness",
    },
    {
      icon: Star,
      title: "Premium Products",
      description: "Only the finest, professional-grade products for exceptional results",
    },
    {
      icon: Clock,
      title: "Flexible Hours",
      description: "Extended hours and weekend availability to fit your schedule",
    },
    {
      icon: MapPin,
      title: "Multiple Locations",
      description: "Conveniently located in Kitui and Nairobi, with mobile services",
    },
    {
      icon: Users,
      title: "Personalized Service",
      description: "Tailored treatments and consultations for your unique needs",
    },
    {
      icon: Heart,
      title: "Client-Focused",
      description: "Your satisfaction and comfort are our top priorities",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section - Dark gradient matching brand */}
      <section className="relative overflow-hidden bg-hero-gradient text-white py-20 md:py-32">
        {/* Animated pink glow effect */}
        <div className="absolute -right-1/2 -top-1/2 h-[200%] w-[200%] bg-pink-subtle animate-hero-pulse" />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-6 text-base bg-vision-gradient text-white border-0 shadow-lg shadow-pink-500/30">
              Coming Soon
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl drop-shadow-lg">
              Our <span className="text-[#FFB6C1]">Vision</span> for Tomorrow
            </h1>
            <p className="mb-8 text-lg text-white/80 md:text-xl">
              Building on our foundation of excellence in makeup artistry and beauty products,
              we're expanding into a complete beauty and wellness destination. From full beauty
              services to rejuvenating spa treatments and trusted authentic makeup products, we're
              bringing world-class experiences to Kitui and Nairobi.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="bg-pink-gradient hover:opacity-90 text-white border-0 shadow-lg shadow-pink-500/30">
                <a href="#interest-form">
                  Register Your Interest
                  <Sparkles className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-[#FFB6C1] text-white hover:bg-[#FFB6C1]/20 hover:text-white">
                <a href="#services">Explore Services</a>
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -left-4 top-1/4 h-72 w-72 rounded-full bg-[#FFB6C1]/10 blur-3xl" />
        <div className="absolute -right-4 bottom-1/4 h-96 w-96 rounded-full bg-[#FF69B4]/10 blur-3xl" />
      </section>

      {/* Vision Statement */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <Card className="border-secondary/20 bg-gradient-to-br from-background to-secondary/5">
            <CardContent className="p-8 md:p-12">
              <div className="mx-auto max-w-3xl text-center">
                <Sparkles className="mx-auto mb-6 h-12 w-12 text-secondary" />
                <h2 className="mb-6 text-3xl font-bold md:text-4xl">
                  A Complete Beauty Ecosystem
                </h2>
                <p className="mb-6 text-lg text-muted-foreground">
                  Glam by Lynn is set to become East Africa's premier destination for comprehensive
                  beauty and wellness services. We're creating spaces where artistry meets technology,
                  tradition meets innovation, and every client experiences transformation.
                </p>
                <p className="text-lg font-medium text-secondary">
                  "Where every visit is an experience, and every experience is unforgettable."
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Our <span className="text-secondary">Service</span> Offerings
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Distinct service categories designed to meet all your beauty and wellness needs
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <Card key={index} className="overflow-hidden transition-shadow hover:shadow-lg">
                  <div className="relative h-48 bg-muted">
                    {/* Placeholder for service images */}
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-secondary/20 to-secondary/5">
                      <Icon className="h-20 w-20 text-secondary/40" />
                    </div>
                  </div>
                  <CardHeader>
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className="h-6 w-6 text-secondary" />
                      <CardTitle>{service.title}</CardTitle>
                    </div>
                    <CardDescription className="text-base">
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits & Differentiators */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Why Choose <span className="text-secondary">Glam by Lynn</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Our commitment to excellence sets us apart in the beauty and wellness industry
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="border-secondary/10">
                  <CardContent className="pt-6">
                    <Icon className="mb-4 h-10 w-10 text-secondary" />
                    <h3 className="mb-2 text-xl font-semibold">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Target Market Messaging */}
      <section className="bg-secondary/5 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                Designed for <span className="text-secondary">You</span>
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Busy Professionals</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Flexible scheduling, express services, and mobile options that fit your lifestyle.
                    Look your best without compromising your schedule.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Brides & Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Comprehensive packages for your special day. From trials to the big day,
                    we ensure you look absolutely stunning.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Wellness Seekers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Holistic treatments that nurture body and mind. Experience true relaxation
                    and rejuvenation in our spa facilities.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Interest Registration Form */}
      <section id="interest-form" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                Be the First to Know
              </h2>
              <p className="text-lg text-muted-foreground">
                Message us on WhatsApp to register your interest, and we&apos;ll keep
                you posted on the launch — including early bird offers.
              </p>
            </div>

            <Card className="border-secondary/50">
              <CardContent className="space-y-6 p-8 text-center">
                <p className="text-muted-foreground">
                  Tell us which of the new services you&apos;d like to hear about —
                  salon, barbershop, spa or the mobile beauty van — and we&apos;ll
                  add you to the list.
                </p>

                <WhatsAppButton
                  context={{ type: "general" }}
                  label="Register your interest on WhatsApp"
                  className="w-full"
                  size="lg"
                />

                <p className="text-sm text-muted-foreground">
                  Prefer email? Reach us from the{" "}
                  <Link href="/contact" className="text-secondary underline">
                    contact page
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
