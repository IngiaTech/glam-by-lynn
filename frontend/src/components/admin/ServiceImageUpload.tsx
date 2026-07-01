"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { resolveImageUrl } from "@/lib/utils";
import { extractErrorMessage } from "@/lib/error-utils";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

interface ServiceImageUploadProps {
  packageId: string;
  imageUrl?: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

/**
 * Single showcase-image uploader for a service package. Uploads immediately to
 * the admin service image endpoint (the package already exists on the edit
 * page) and reports the resulting URL back to the parent.
 */
export function ServiceImageUpload({
  packageId,
  imageUrl,
  onChange,
  disabled,
}: ServiceImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const getToken = async (): Promise<string | null> => {
    const session = await fetch("/api/auth/session").then((res) => res.json());
    return session?.accessToken ?? null;
  };

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file later.
    e.target.value = "";
    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Image must be 10MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = await getToken();
      if (!token) {
        setError("Authentication required.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(
        `${apiUrl}/api/admin/services/${packageId}/image`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      onChange(res.data?.image_url ?? null);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to upload image"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setError("");
    setUploading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = await getToken();
      if (!token) {
        setError("Authentication required.");
        return;
      }
      await axios.delete(`${apiUrl}/api/admin/services/${packageId}/image`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onChange(null);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to remove image"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label>Showcase Image</Label>
      <p className="text-sm text-muted-foreground">
        A strong photo of this service. Shown on the services page and detail
        page. JPG/PNG/WebP, up to 10MB.
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border bg-muted sm:w-64">
          {imageUrl ? (
            <Image
              src={resolveImageUrl(imageUrl)}
              alt="Service showcase"
              fill
              sizes="256px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImagePlus className="h-8 w-8" />
              <span className="text-xs">No image yet</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSelect}
            disabled={disabled || uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            {imageUrl ? "Replace image" : "Upload image"}
          </Button>
          {imageUrl && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
