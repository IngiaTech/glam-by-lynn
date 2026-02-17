/**
 * Makeup Classes Page
 * Display available makeup training classes with enrollment options
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MakeupClass, ClassEnrollmentCreate, PaginatedResponse } from "@/types";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { Loader2, Clock, DollarSign, CheckCircle2, GraduationCap, X } from "lucide-react";

const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner", color: "bg-green-500" },
  { value: "intermediate", label: "Intermediate", color: "bg-yellow-500" },
  { value: "advanced", label: "Advanced", color: "bg-red-500" },
];

const TOPICS = [
  { value: "bridal", label: "Bridal" },
  { value: "everyday", label: "Everyday" },
  { value: "special_effects", label: "Special Effects" },
  { value: "editorial", label: "Editorial" },
  { value: "corrective", label: "Corrective" },
  { value: "stage_theater", label: "Stage/Theater" },
  { value: "airbrush", label: "Airbrush" },
  { value: "contouring", label: "Contouring" },
  { value: "eye_makeup", label: "Eye Makeup" },
  { value: "other", label: "Other" },
];

export default function ClassesPage() {
  const [classes, setClasses] = useState<MakeupClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Enrollment modal state
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<MakeupClass | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState<string | null>(null);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClassEnrollmentCreate>({
    classId: "",
    fullName: "",
    email: "",
    phone: "",
    preferredDates: [],
    message: "",
  });

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedLevel) params.append("skillLevel", selectedLevel);
      if (selectedTopic) params.append("topic", selectedTopic);

      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.CLASSES.LIST}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch classes");
      }

      const data: PaginatedResponse<MakeupClass> = await response.json();
      setClasses(data.items);
    } catch (err) {
      console.error("Failed to fetch classes:", err);
      setError("Failed to load classes. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [selectedLevel, selectedTopic]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleEnrollClick = (cls: MakeupClass) => {
    setSelectedClass(cls);
    setFormData({
      classId: cls.id,
      fullName: "",
      email: "",
      phone: "",
      preferredDates: [],
      message: "",
    });
    setEnrollmentSuccess(null);
    setEnrollmentError(null);
    setEnrollModalOpen(true);
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrolling(true);
    setEnrollmentError(null);

    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CLASSES.ENROLL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to submit enrollment");
      }

      const result = await response.json();
      setEnrollmentSuccess(result.enrollmentNumber);
    } catch (err) {
      console.error("Enrollment failed:", err);
      setEnrollmentError(err instanceof Error ? err.message : "Failed to submit enrollment");
    } finally {
      setEnrolling(false);
    }
  };

  const getSkillLevelBadge = (level: string) => {
    const skill = SKILL_LEVELS.find((s) => s.value === level);
    return skill ? (
      <Badge className={`${skill.color} text-white border-0`}>{skill.label}</Badge>
    ) : (
      <Badge>{level}</Badge>
    );
  };

  const getTopicLabel = (topic: string) => {
    const t = TOPICS.find((t) => t.value === topic);
    return t?.label || topic;
  };

  const formatPrice = (priceFrom?: number, priceTo?: number) => {
    if (!priceFrom && !priceTo) return "Contact for pricing";
    if (priceFrom && !priceTo) return `From KSh ${priceFrom.toLocaleString()}`;
    if (!priceFrom && priceTo) return `Up to KSh ${priceTo.toLocaleString()}`;
    if (priceFrom === priceTo) return `KSh ${priceFrom?.toLocaleString()}`;
    return `KSh ${priceFrom?.toLocaleString()} - ${priceTo?.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-hero-gradient text-white px-4 py-16 md:py-24">
        <div className="absolute -right-1/2 -top-1/2 h-[200%] w-[200%] bg-pink-subtle animate-hero-pulse" />
        <div className="container relative mx-auto">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-vision-gradient text-white border-0 shadow-lg shadow-pink-500/30">
              <GraduationCap className="mr-1 h-3 w-3" />
              Training Programs
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl drop-shadow-lg">
              <span className="text-white">Makeup</span>{" "}
              <span className="text-[#FFB6C1]">Classes</span>
            </h1>
            <p className="text-lg text-white/80">
              Learn professional makeup artistry from industry experts.
              Choose from beginner to advanced courses across various specializations.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-border bg-muted/30 px-4 py-6">
        <div className="container mx-auto">
          {/* Skill Level Filter */}
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Skill Level</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedLevel === null ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSelectedLevel(null)}
              >
                All Levels
              </Button>
              {SKILL_LEVELS.map((level) => (
                <Button
                  key={level.value}
                  variant={selectedLevel === level.value ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setSelectedLevel(level.value)}
                >
                  {level.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Topic Filter */}
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Topic</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedTopic === null ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSelectedTopic(null)}
              >
                All Topics
              </Button>
              {TOPICS.map((topic) => (
                <Button
                  key={topic.value}
                  variant={selectedTopic === topic.value ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTopic(topic.value)}
                >
                  {topic.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Classes Grid */}
      <main className="container mx-auto px-4 py-16">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        ) : error ? (
          <div className="mx-auto max-w-md rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="mx-auto max-w-md rounded-lg border border-border bg-muted/50 p-6 text-center">
            <GraduationCap className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              No classes found matching your criteria. Try adjusting your filters or check back later.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <Card
                key={cls.id}
                className={cls.isFeatured ? "border-secondary shadow-lg" : ""}
              >
                {cls.imageUrl && (
                  <div className="relative h-48 overflow-hidden rounded-t-lg">
                    <img
                      src={cls.imageUrl}
                      alt={cls.title}
                      className="h-full w-full object-cover"
                    />
                    {cls.isFeatured && (
                      <Badge className="absolute right-2 top-2 bg-pink-gradient text-white border-0">
                        Featured
                      </Badge>
                    )}
                  </div>
                )}
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {getSkillLevelBadge(cls.skillLevel)}
                    <Badge variant="outline">{getTopicLabel(cls.topic)}</Badge>
                  </div>
                  <CardTitle className="text-xl">{cls.title}</CardTitle>
                  {cls.description && (
                    <CardDescription className="line-clamp-2">
                      {cls.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Class Info */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{cls.durationDays} {cls.durationDays === 1 ? "day" : "days"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatPrice(cls.priceFrom, cls.priceTo)}</span>
                    </div>
                  </div>

                  {/* What You'll Learn Preview */}
                  {cls.whatYouLearn && cls.whatYouLearn.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">What You'll Learn:</p>
                      <ul className="space-y-1">
                        {cls.whatYouLearn.slice(0, 3).map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-secondary" />
                            <span className="line-clamp-1">{item}</span>
                          </li>
                        ))}
                        {cls.whatYouLearn.length > 3 && (
                          <li className="text-sm text-muted-foreground">
                            +{cls.whatYouLearn.length - 3} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* CTA */}
                  <Button
                    className="w-full"
                    onClick={() => handleEnrollClick(cls)}
                  >
                    Register Interest
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-16">
          <Card className="border-secondary/50 bg-muted/50">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">How It Works</CardTitle>
              <CardDescription>
                Our classes are offered on-demand to fit your schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-8 md:grid-cols-3">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20 text-secondary">
                    <span className="text-xl font-bold">1</span>
                  </div>
                  <h3 className="mb-2 font-semibold">Register Interest</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a class and submit your preferred dates and contact information
                  </p>
                </div>
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20 text-secondary">
                    <span className="text-xl font-bold">2</span>
                  </div>
                  <h3 className="mb-2 font-semibold">Get Contacted</h3>
                  <p className="text-sm text-muted-foreground">
                    We'll reach out to confirm dates, discuss details, and answer questions
                  </p>
                </div>
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20 text-secondary">
                    <span className="text-xl font-bold">3</span>
                  </div>
                  <h3 className="mb-2 font-semibold">Start Learning</h3>
                  <p className="text-sm text-muted-foreground">
                    Attend your personalized makeup training session
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Enrollment Modal */}
      <Dialog open={enrollModalOpen} onOpenChange={setEnrollModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {enrollmentSuccess
                ? "Registration Successful!"
                : `Register for ${selectedClass?.title}`}
            </DialogTitle>
            <DialogDescription>
              {enrollmentSuccess
                ? "We'll contact you shortly to confirm your class details."
                : "Fill out your details and we'll get in touch to schedule your class."}
            </DialogDescription>
          </DialogHeader>

          {enrollmentSuccess ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
              <p className="mb-2 font-semibold">
                Your enrollment number is:
              </p>
              <p className="rounded-lg bg-muted px-4 py-2 font-mono text-lg">
                {enrollmentSuccess}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Please save this number to track your enrollment status.
              </p>
              <Button
                className="mt-6"
                onClick={() => setEnrollModalOpen(false)}
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleEnrollSubmit} className="space-y-4">
              {enrollmentError && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                  {enrollmentError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  required
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  placeholder="your@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  required
                  placeholder="+254 700 000 000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredDates">Preferred Dates</Label>
                <Input
                  id="preferredDates"
                  value={formData.preferredDates?.join(", ")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferredDates: e.target.value
                        .split(",")
                        .map((d) => d.trim())
                        .filter((d) => d),
                    })
                  }
                  placeholder="e.g., January 15, January 20"
                />
                <p className="text-xs text-muted-foreground">
                  Enter dates separated by commas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Additional Message</Label>
                <Textarea
                  id="message"
                  value={formData.message || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Any questions or special requirements?"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEnrollModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={enrolling} className="flex-1">
                  {enrolling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
