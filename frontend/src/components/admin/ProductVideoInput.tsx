/**
 * Product Video Input Component
 * Handles video URL inputs (YouTube, Vimeo, etc.) with preview
 */

"use client";

import { useState } from "react";
import { X, Plus, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ProductVideo {
  id?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  displayOrder: number;
}

interface ProductVideoInputProps {
  videos: ProductVideo[];
  onVideosChange: (videos: ProductVideo[]) => void;
  maxVideos?: number;
  disabled?: boolean;
}

export function ProductVideoInput({
  videos,
  onVideosChange,
  maxVideos = 3,
  disabled = false,
}: ProductVideoInputProps) {
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [error, setError] = useState("");

  const validateVideoUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Check for supported video platforms
      const supportedPlatforms = [
        "youtube.com",
        "youtu.be",
        "vimeo.com",
        "www.youtube.com",
        "www.vimeo.com",
      ];

      return supportedPlatforms.some((platform) => hostname.includes(platform));
    } catch {
      return false;
    }
  };

  const extractThumbnail = (url: string): string | undefined => {
    try {
      const urlObj = new URL(url);

      // YouTube
      if (urlObj.hostname.includes("youtube.com") || urlObj.hostname.includes("youtu.be")) {
        let videoId = "";

        if (urlObj.hostname.includes("youtu.be")) {
          videoId = urlObj.pathname.slice(1);
        } else if (urlObj.searchParams.has("v")) {
          videoId = urlObj.searchParams.get("v") || "";
        }

        if (videoId) {
          return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
      }

      // Vimeo - would need API call to get thumbnail
      // For now, return undefined
      return undefined;
    } catch {
      return undefined;
    }
  };

  const handleAddVideo = () => {
    setError("");

    if (!newVideoUrl.trim()) {
      setError("Please enter a video URL");
      return;
    }

    if (videos.length >= maxVideos) {
      setError(`Maximum ${maxVideos} videos allowed`);
      return;
    }

    if (!validateVideoUrl(newVideoUrl)) {
      setError("Invalid video URL. Please use YouTube or Vimeo links.");
      return;
    }

    const newVideo: ProductVideo = {
      videoUrl: newVideoUrl,
      thumbnailUrl: extractThumbnail(newVideoUrl),
      displayOrder: videos.length,
    };

    onVideosChange([...videos, newVideo]);
    setNewVideoUrl("");
  };

  const handleRemoveVideo = (index: number) => {
    const newVideos = videos.filter((_, i) => i !== index);

    // Reorder remaining videos
    newVideos.forEach((video, i) => {
      video.displayOrder = i;
    });

    onVideosChange(newVideos);
  };

  const canAddMore = videos.length < maxVideos;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Product Videos</h3>
        <p className="text-sm text-muted-foreground">
          Add up to {maxVideos} video links (YouTube, Vimeo)
        </p>
      </div>

      {/* Add Video Input */}
      {canAddMore && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddVideo();
                }
              }}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
              disabled={disabled}
            />

            <Button
              type="button"
              onClick={handleAddVideo}
              disabled={disabled || !newVideoUrl.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
        </div>
      )}

      {/* Video List */}
      {videos.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <Video className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-1">No videos added yet</p>
          <p className="text-sm text-muted-foreground">
            Add YouTube or Vimeo links to showcase your product
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card"
            >
              {/* Thumbnail or Icon */}
              <div className="flex-shrink-0">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-24 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-24 h-16 bg-muted rounded flex items-center justify-center">
                    <Video className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* URL */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate" title={video.videoUrl}>
                  {video.videoUrl}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Video {index + 1}
                </p>
              </div>

              {/* Remove Button */}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveVideo(index)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {videos.length} / {maxVideos} videos • Supported: YouTube, Vimeo
      </p>
    </div>
  );
}
