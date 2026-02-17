"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { useRequireAdmin } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MakeupClass } from "@/types";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { extractErrorMessage } from "@/lib/error-utils";
import { Plus, X, Loader2 } from "lucide-react";

const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
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

export default function EditClassPage() {
  const { isAdmin, loading: authLoading } = useRequireAdmin();
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    skillLevel: "beginner",
    topic: "bridal",
    durationDays: 1,
    priceFrom: "",
    priceTo: "",
    whatYouLearn: [""],
    requirements: [""],
    imageUrl: "",
    isActive: true,
    isFeatured: false,
    displayOrder: 0,
  });

  const [loadingClass, setLoadingClass] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClass = async () => {
      if (!isAdmin || !classId) return;

      try {
        const session = await fetch("/api/auth/session").then((res) => res.json());
        const token = session?.accessToken;

        if (!token) {
          setError("Authentication required");
          return;
        }

        const response = await axios.get<MakeupClass>(
          `${API_BASE_URL}${API_ENDPOINTS.ADMIN_CLASSES.DETAIL(classId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const cls = response.data;

        setFormData({
          title: cls.title,
          description: cls.description || "",
          skillLevel: cls.skillLevel,
          topic: cls.topic,
          durationDays: cls.durationDays,
          priceFrom: cls.priceFrom?.toString() || "",
          priceTo: cls.priceTo?.toString() || "",
          whatYouLearn: cls.whatYouLearn?.length ? cls.whatYouLearn : [""],
          requirements: cls.requirements?.length ? cls.requirements : [""],
          imageUrl: cls.imageUrl || "",
          isActive: cls.isActive,
          isFeatured: cls.isFeatured,
          displayOrder: cls.displayOrder,
        });
      } catch (err: unknown) {
        console.error("Error fetching class:", err);
        setError(extractErrorMessage(err, "Failed to load class"));
      } finally {
        setLoadingClass(false);
      }
    };

    if (isAdmin) {
      fetchClass();
    }
  }, [isAdmin, classId]);

  const handleAddListItem = (field: "whatYouLearn" | "requirements") => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const handleRemoveListItem = (field: "whatYouLearn" | "requirements", index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleListItemChange = (
    field: "whatYouLearn" | "requirements",
    index: number,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const session = await fetch("/api/auth/session").then((res) => res.json());
      const token = session?.accessToken;

      if (!token) {
        setError("Authentication required");
        return;
      }

      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description || null,
        skillLevel: formData.skillLevel,
        topic: formData.topic,
        durationDays: formData.durationDays,
        priceFrom: formData.priceFrom ? parseFloat(formData.priceFrom) : null,
        priceTo: formData.priceTo ? parseFloat(formData.priceTo) : null,
        imageUrl: formData.imageUrl || null,
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
        displayOrder: formData.displayOrder,
      };

      // Filter out empty items
      const whatYouLearn = formData.whatYouLearn.filter((item) => item.trim());
      payload.whatYouLearn = whatYouLearn.length > 0 ? whatYouLearn : null;

      const requirements = formData.requirements.filter((item) => item.trim());
      payload.requirements = requirements.length > 0 ? requirements : null;

      await axios.put(
        `${API_BASE_URL}${API_ENDPOINTS.ADMIN_CLASSES.UPDATE(classId)}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      router.push("/admin/classes");
    } catch (err: unknown) {
      console.error("Error updating class:", err);
      setError(extractErrorMessage(err, "Failed to update class"));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loadingClass) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          <span className="ml-2 text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Makeup Class</h1>
        <p className="text-muted-foreground">Update class details</p>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g., Bridal Makeup Masterclass"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe what this class covers..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="skillLevel">
                  Skill Level <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.skillLevel}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, skillLevel: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select skill level" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="topic">
                  Topic <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.topic}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, topic: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOPICS.map((topic) => (
                      <SelectItem key={topic.value} value={topic.value}>
                        {topic.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="durationDays">
                  Duration (days) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="durationDays"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.durationDays}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      durationDays: parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="priceFrom">Price From (KSh)</Label>
                <Input
                  id="priceFrom"
                  type="number"
                  min="0"
                  value={formData.priceFrom}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, priceFrom: e.target.value }))
                  }
                  placeholder="e.g., 5000"
                />
              </div>

              <div>
                <Label htmlFor="priceTo">Price To (KSh)</Label>
                <Input
                  id="priceTo"
                  type="number"
                  min="0"
                  value={formData.priceTo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, priceTo: e.target.value }))
                  }
                  placeholder="e.g., 15000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))
                }
                placeholder="https://example.com/class-image.jpg"
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Optional: URL to an image representing this class
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What You'll Learn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.whatYouLearn.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) =>
                    handleListItemChange("whatYouLearn", index, e.target.value)
                  }
                  placeholder="e.g., Professional bridal makeup techniques"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemoveListItem("whatYouLearn", index)}
                  disabled={formData.whatYouLearn.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddListItem("whatYouLearn")}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Learning Point
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.requirements.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) =>
                    handleListItemChange("requirements", index, e.target.value)
                  }
                  placeholder="e.g., Basic makeup knowledge recommended"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemoveListItem("requirements", index)}
                  disabled={formData.requirements.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddListItem("requirements")}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Requirement
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive">Active</Label>
                <p className="text-sm text-muted-foreground">
                  Show this class on the website
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked: boolean) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isFeatured">Featured</Label>
                <p className="text-sm text-muted-foreground">
                  Highlight this class prominently
                </p>
              </div>
              <Switch
                id="isFeatured"
                checked={formData.isFeatured}
                onCheckedChange={(checked: boolean) =>
                  setFormData((prev) => ({ ...prev, isFeatured: checked }))
                }
              />
            </div>

            <div>
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                min="0"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    displayOrder: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Lower numbers appear first (0 = highest priority)
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/classes")}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
