/**
 * Product Image Upload Component
 * Handles multiple image uploads with preview and primary image selection
 */

"use client";

import { useState } from "react";
import { X, Upload, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export interface ProductImage {
  id?: string;
  file?: File;
  imageUrl?: string;
  altText?: string;
  isPrimary: boolean;
  displayOrder: number;
  preview?: string;
}

interface ProductImageUploadProps {
  productId?: string;
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function ProductImageUpload({
  productId,
  images,
  onImagesChange,
  maxImages = 10,
  disabled = false,
}: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (images.length + files.length > maxImages) {
      setUploadError(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploadError("");

    const newImages: ProductImage[] = await Promise.all(
      files.map(async (file, index) => {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} exceeds 10MB limit`);
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not an image`);
        }

        // Create preview
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        return {
          file,
          preview,
          altText: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          isPrimary: images.length === 0 && index === 0, // First image is primary
          displayOrder: images.length + index,
        };
      })
    );

    onImagesChange([...images, ...newImages]);

    // Clear input
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);

    // If removed image was primary, set first image as primary
    if (images[index].isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }

    // Reorder remaining images
    newImages.forEach((img, i) => {
      img.displayOrder = i;
    });

    onImagesChange(newImages);
  };

  const handleSetPrimary = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));

    onImagesChange(newImages);
  };

  const handleAltTextChange = (index: number, altText: string) => {
    const newImages = [...images];
    newImages[index].altText = altText;
    onImagesChange(newImages);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Product Images</h3>
          <p className="text-sm text-muted-foreground">
            Upload up to {maxImages} images. First image will be primary.
          </p>
        </div>

        {canAddMore && (
          <Button
            type="button"
            variant="outline"
            disabled={disabled || uploading}
            onClick={() => document.getElementById("image-upload")?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Add Images
              </>
            )}
          </Button>
        )}

        <input
          id="image-upload"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
        />
      </div>

      {uploadError && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-sm">
          {uploadError}
        </div>
      )}

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No images added yet</p>
          <p className="text-sm text-muted-foreground">
            Click "Add Images" to upload product photos
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative border border-border rounded-lg overflow-hidden group"
            >
              {/* Image Preview */}
              <div className="aspect-square relative bg-muted">
                <Image
                  src={image.preview || image.imageUrl || "/placeholder.png"}
                  alt={image.altText || "Product image"}
                  fill
                  className="object-cover"
                />

                {/* Primary Badge */}
                {image.isPrimary && (
                  <div className="absolute top-2 left-2 bg-secondary text-background px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Primary
                  </div>
                )}

                {/* Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!image.isPrimary && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSetPrimary(index)}
                      disabled={disabled}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveImage(index)}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Alt Text */}
              <div className="p-2">
                <input
                  type="text"
                  value={image.altText || ""}
                  onChange={(e) => handleAltTextChange(index, e.target.value)}
                  placeholder="Image description"
                  className="w-full text-xs px-2 py-1 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-secondary"
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {images.length} / {maxImages} images • Max 10MB per image • Supported: JPG, PNG, WebP
      </p>
    </div>
  );
}
