"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GalleryGridSkeleton } from "@/components/LoadingStates";
import { fetchGalleryPosts } from "@/lib/gallery";
import { GalleryPost } from "@/types";
import { handleApiError } from "@/lib/api-error-handler";
import { Image as ImageIcon, Video, X, ChevronLeft, ChevronRight, Instagram, Music, Sparkles } from "lucide-react";
import Image from "next/image";

export default function GalleryPage() {
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mediaFilter, setMediaFilter] = useState<"all" | "image" | "video">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "instagram" | "tiktok" | "original">("all");
  const [lightboxPost, setLightboxPost] = useState<GalleryPost | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);

  const pageSize = 12;

  useEffect(() => {
    loadPosts();
  }, [page, mediaFilter, sourceFilter]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {
        page,
        pageSize,
      };

      if (mediaFilter !== "all") {
        filters.mediaType = mediaFilter;
      }

      if (sourceFilter !== "all") {
        filters.sourceType = sourceFilter;
      }

      const response = await fetchGalleryPosts(filters);
      setPosts(response.items);
      setTotalPages(response.total_pages);
    } catch (err) {
      console.error("Failed to load gallery:", err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    // Reset to page 1 when filters change
    if (page !== 1) {
      setPage(1);
    } else {
      loadPosts();
    }
  };

  useEffect(() => {
    handleFilterChange();
  }, [mediaFilter, sourceFilter]);

  const openLightbox = (post: GalleryPost, index: number) => {
    setLightboxPost(post);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxPost(null);
    setLightboxIndex(-1);
  };

  const goToPrevious = () => {
    if (lightboxIndex > 0) {
      const newIndex = lightboxIndex - 1;
      setLightboxIndex(newIndex);
      setLightboxPost(posts[newIndex]);
    }
  };

  const goToNext = () => {
    if (lightboxIndex < posts.length - 1) {
      const newIndex = lightboxIndex + 1;
      setLightboxIndex(newIndex);
      setLightboxPost(posts[newIndex]);
    }
  };

  const getSourceIcon = (sourceType?: string) => {
    switch (sourceType) {
      case "instagram":
        return <Instagram className="h-4 w-4" />;
      case "tiktok":
        return <Music className="h-4 w-4" />;
      case "original":
        return <Sparkles className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section - Dark gradient matching brand */}
        <section className="relative overflow-hidden bg-hero-gradient text-white py-12 md:py-16">
          {/* Animated pink glow effect */}
          <div className="absolute -right-1/2 -top-1/2 h-[200%] w-[200%] bg-pink-subtle animate-hero-pulse" />
          <div className="container relative mx-auto px-4">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold md:text-5xl drop-shadow-lg">
                <span className="text-white">Our</span>{" "}
                <span className="text-[#FFB6C1]">Gallery</span>
              </h1>
              <p className="text-lg text-white/80 max-w-2xl mx-auto">
                Explore our portfolio of stunning makeup transformations, bridal looks, and beauty moments
              </p>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Filters:</span>
              </div>

              <div className="flex flex-wrap gap-3">
                {/* Media Type Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <Select value={mediaFilter} onValueChange={(value: any) => setMediaFilter(value)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Media</SelectItem>
                      <SelectItem value="image">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Images
                        </div>
                      </SelectItem>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Videos
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Source Type Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Source:</span>
                  <Select value={sourceFilter} onValueChange={(value: any) => setSourceFilter(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="instagram">
                        <div className="flex items-center gap-2">
                          <Instagram className="h-4 w-4" />
                          Instagram
                        </div>
                      </SelectItem>
                      <SelectItem value="tiktok">
                        <div className="flex items-center gap-2">
                          <Music className="h-4 w-4" />
                          TikTok
                        </div>
                      </SelectItem>
                      <SelectItem value="original">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Original
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {loading ? (
              <GalleryGridSkeleton count={pageSize} />
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive">{error}</p>
                <Button onClick={loadPosts} className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No gallery posts found with the selected filters.</p>
                <Button
                  onClick={() => {
                    setMediaFilter("all");
                    setSourceFilter("all");
                  }}
                  variant="outline"
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {posts.map((post, index) => (
                    <div
                      key={post.id}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-muted cursor-pointer transition-transform hover:scale-[1.02]"
                      onClick={() => openLightbox(post, index)}
                    >
                      {post.mediaType === "image" ? (
                        <Image
                          src={post.thumbnailUrl || post.mediaUrl}
                          alt={post.caption || "Gallery image"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="relative h-full w-full">
                          <video
                            src={post.mediaUrl}
                            poster={post.thumbnailUrl}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="rounded-full bg-white/90 p-4">
                              <Video className="h-6 w-6 text-foreground" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          {post.caption && (
                            <p className="text-sm line-clamp-2 mb-2">{post.caption}</p>
                          )}
                          <div className="flex items-center gap-2">
                            {post.sourceType && (
                              <div className="flex items-center gap-1 text-xs">
                                {getSourceIcon(post.sourceType)}
                                <span className="capitalize">{post.sourceType}</span>
                              </div>
                            )}
                            {post.isFeatured && (
                              <span className="text-xs bg-secondary/90 text-secondary-foreground px-2 py-1 rounded">
                                Featured
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (page <= 3) {
                          pageNumber = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = page - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNumber}
                            onClick={() => setPage(pageNumber)}
                            variant={page === pageNumber ? "default" : "outline"}
                            size="sm"
                            className="w-10"
                          >
                            {pageNumber}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* Lightbox */}
      {lightboxPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            aria-label="Close lightbox"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation Buttons */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {lightboxIndex < posts.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Content */}
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxPost.mediaType === "image" ? (
              <img
                src={lightboxPost.mediaUrl}
                alt={lightboxPost.caption || "Gallery image"}
                className="max-h-[90vh] max-w-[90vw] object-contain"
              />
            ) : (
              <video
                src={lightboxPost.mediaUrl}
                poster={lightboxPost.thumbnailUrl}
                controls
                autoPlay
                className="max-h-[90vh] max-w-[90vw] object-contain"
              />
            )}

            {/* Caption & Meta */}
            {(lightboxPost.caption || lightboxPost.externalPermalink) && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-4 text-white">
                {lightboxPost.caption && (
                  <p className="text-sm md:text-base">{lightboxPost.caption}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {lightboxPost.sourceType && (
                    <div className="flex items-center gap-1 text-xs">
                      {getSourceIcon(lightboxPost.sourceType)}
                      <span className="capitalize">{lightboxPost.sourceType}</span>
                    </div>
                  )}
                  {lightboxPost.tags && lightboxPost.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {lightboxPost.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-white/20 px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {lightboxPost.externalPermalink && (
                    <a
                      href={lightboxPost.externalPermalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors ml-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Instagram className="h-3 w-3" />
                      View on Instagram
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
