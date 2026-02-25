/**
 * Contact Page
 * Contact form and information
 */

"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { usePublicSettings } from "@/hooks/usePublicSettings";

export default function ContactPage() {
  const { settings: publicSettings } = usePublicSettings();

  const hasSocialLinks = publicSettings.social_facebook || publicSettings.social_instagram || publicSettings.social_twitter || publicSettings.social_tiktok || publicSettings.social_youtube;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-b from-background to-muted/20 px-4 py-16 md:py-24">
        <div className="container mx-auto">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              Get In Touch
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
              Contact Us
            </h1>
            <p className="text-lg text-muted-foreground">
              Have questions about our services or ready to book? We'd love to hear from you
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as possible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your name" disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your.email@example.com" disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="How can we help?" disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    rows={6}
                    placeholder="Tell us about your event or ask any questions..."
                    disabled
                  />
                </div>
                <Button className="w-full" disabled>
                  Send Message (Coming Soon)
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  Reach out through any of these channels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📧</div>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      info@glambylynn.com
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📱</div>
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">
                      (555) 123-4567
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📍</div>
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      Serving the Greater Metropolitan Area
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🕒</div>
                  <div>
                    <p className="font-medium">Business Hours</p>
                    <p className="text-sm text-muted-foreground">
                      Monday - Saturday: 9am - 7pm<br />
                      Sunday: By appointment only
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-secondary/50">
              <CardHeader>
                <CardTitle>Booking Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  📅 We recommend booking bridal services at least 3-6 months in advance
                </p>
                <p>
                  💰 Deposits are required to secure your appointment
                </p>
                <p>
                  🎨 Trial sessions are available for all bridal packages
                </p>
                <p>
                  🚗 On-location services available within 50 miles
                </p>
              </CardContent>
            </Card>

            {hasSocialLinks && (
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <h3 className="mb-2 font-semibold">Follow Us</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Stay updated with our latest work and beauty tips
                </p>
                <div className="flex gap-3">
                  {publicSettings.social_instagram && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={publicSettings.social_instagram} target="_blank" rel="noopener noreferrer">
                        <Instagram className="mr-1.5 h-4 w-4" />
                        Instagram
                      </Link>
                    </Button>
                  )}
                  {publicSettings.social_facebook && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={publicSettings.social_facebook} target="_blank" rel="noopener noreferrer">
                        <Facebook className="mr-1.5 h-4 w-4" />
                        Facebook
                      </Link>
                    </Button>
                  )}
                  {publicSettings.social_twitter && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={publicSettings.social_twitter} target="_blank" rel="noopener noreferrer">
                        <Twitter className="mr-1.5 h-4 w-4" />
                        Twitter
                      </Link>
                    </Button>
                  )}
                  {publicSettings.social_tiktok && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={publicSettings.social_tiktok} target="_blank" rel="noopener noreferrer">
                        TikTok
                      </Link>
                    </Button>
                  )}
                  {publicSettings.social_youtube && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={publicSettings.social_youtube} target="_blank" rel="noopener noreferrer">
                        <Youtube className="mr-1.5 h-4 w-4" />
                        YouTube
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
