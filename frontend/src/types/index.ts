/**
 * Shared TypeScript type definitions
 */

// User types
export interface User {
  id: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  googleId?: string;
  isAdmin: boolean;
  adminRole?: "super_admin" | "product_manager" | "booking_manager" | "content_editor" | "artist";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Product types
export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentCategoryId?: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description?: string;
  brand_id?: string;
  category_id?: string;
  base_price: number;
  discount_type?: "percentage" | "fixed";
  discount_value?: number;
  sku?: string;
  inventory_count: number;
  low_stock_threshold: number;
  is_active: boolean;
  is_featured: boolean;
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
  brand?: Brand;
  category?: Category;
  images?: ProductImage[];
  variants?: ProductVariant[];
  final_price?: number;
  in_stock?: boolean;
  is_low_stock?: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  display_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_type: string;
  variant_value: string;
  price_adjustment: number;
  inventory_count: number;
  sku?: string;
  is_active: boolean;
}

// Service types
export interface ServicePackage {
  id: string;
  package_type: "bridal_large" | "bridal_small" | "bride_only" | "regular" | "classes";
  name: string;
  description?: string;
  base_bride_price?: string; // Decimal from backend
  base_maid_price?: string; // Decimal from backend
  base_mother_price?: string; // Decimal from backend
  base_other_price?: string; // Decimal from backend
  max_maids?: number;
  min_maids?: number;
  includes_facial: boolean;
  duration_minutes?: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TransportLocation {
  id: string;
  location_name: string;
  county?: string;
  transport_cost: string; // Decimal from backend
  is_free: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Booking types
export interface Booking {
  id: string;
  bookingNumber: string;
  userId?: string;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  packageId: string;
  bookingDate: string;
  bookingTime: string;
  locationId?: string; // Optional - bookings can use custom locations instead
  customLocationAddress?: string;
  customLocationLatitude?: number;
  customLocationLongitude?: number;
  customLocationDistanceKm?: number;
  numBrides: number;
  numMaids: number;
  numMothers: number;
  numOthers: number;
  weddingTheme?: string;
  specialRequests?: string;
  subtotal: number;
  transportCost: number;
  totalAmount: number;
  depositAmount?: number;
  depositPaid: boolean;
  depositPaidAt?: string;
  status: "pending" | "confirmed" | "deposit_paid" | "completed" | "cancelled";
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  package?: ServicePackage;
  location?: TransportLocation;
}

// Order types
export interface PromoCode {
  id: string;
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageCount: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  deliveryCounty?: string;
  deliveryTown?: string;
  deliveryAddress?: string;
  subtotal: number;
  discountAmount: number;
  promoCodeId?: string;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentConfirmed: boolean;
  paymentConfirmedAt?: string;
  status: "pending" | "payment_confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  trackingNumber?: string;
  orderItems?: OrderItem[];
  promoCode?: PromoCode;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  productVariantId?: string;
  productTitle: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  productVariantId?: string;
  quantity: number;
  product?: Product;
  productVariant?: ProductVariant;
}

// Content types
export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  reviewText?: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  helpfulCount: number;
  adminReply?: string;
  adminReplyAt?: string;
  createdAt: string;
  user?: User;
}

export interface Testimonial {
  id: string;
  customerName: string;
  customerPhotoUrl?: string;
  location?: string;
  rating: number;
  testimonialText: string;
  relatedServiceId?: string;
  relatedProductId?: string;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface GalleryPost {
  id: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  tags?: string[];
  sourceType?: "instagram" | "tiktok" | "original";
  isFeatured: boolean;
  displayOrder: number;
  externalPermalink?: string;
  publishedAt: string;
}

// Calendar types
export interface CalendarAvailability {
  id: string;
  date: string;
  timeSlot: string;
  isAvailable: boolean;
  reason?: string;
  createdAt: string;
}

export interface CalendarAvailabilityCreate {
  date: string;
  timeSlot: string;
  reason?: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Makeup Classes types
export interface MakeupClass {
  id: string;
  title: string;
  slug: string;
  description?: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  topic: "bridal" | "everyday" | "special_effects" | "editorial" | "corrective" | "stage_theater" | "airbrush" | "contouring" | "eye_makeup" | "other";
  durationDays: number;
  priceFrom?: number;
  priceTo?: number;
  whatYouLearn?: string[];
  requirements?: string[];
  imageUrl?: string;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClassEnrollment {
  id: string;
  enrollmentNumber: string;
  classId: string;
  userId?: string;
  fullName: string;
  email: string;
  phone: string;
  preferredDates?: string[];
  message?: string;
  status: "pending" | "contacted" | "confirmed" | "completed" | "cancelled";
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  makeupClass?: MakeupClass;
}

export interface ClassEnrollmentCreate {
  classId: string;
  fullName: string;
  email: string;
  phone: string;
  preferredDates?: string[];
  message?: string;
}

export interface MakeupClassCreate {
  title: string;
  description?: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  topic: string;
  durationDays: number;
  priceFrom?: number;
  priceTo?: number;
  whatYouLearn?: string[];
  requirements?: string[];
  imageUrl?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
}

export interface MakeupClassUpdate {
  title?: string;
  description?: string;
  skillLevel?: "beginner" | "intermediate" | "advanced";
  topic?: string;
  durationDays?: number;
  priceFrom?: number;
  priceTo?: number;
  whatYouLearn?: string[];
  requirements?: string[];
  imageUrl?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
}
