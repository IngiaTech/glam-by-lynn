# Glam by Lynn - Enterprise Web Application

## Project Overview

Glam by Lynn is a comprehensive web application for a makeup artist and beauty business serving clients in Kenya (primarily Nairobi and Kitui). The platform combines three core elements:

1. **Makeup Services** - Booking system for bridal makeup, regular makeup, and makeup artistry classes
2. **E-Commerce** - Full-featured online store for skincare and beauty products
3. **2026 Vision Showcase** - Premium salon/spa/barbershop vision with interest registration

## Business Context

**Target Market:** Kenya (Nairobi, Kitui, and surrounding areas)
**Brand Colors:** Black and Light Pink
**Business Owner:** Lynn (Glam by Lynn)

## Technical Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Authentication:** NextAuth.js (Google OAuth)
- **State Management:** React Context + React Query
- **Form Handling:** React Hook Form + Zod validation
- **Testing:** Jest + React Testing Library
- **Deployment:** Vercel (Free tier)

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **ORM:** SQLAlchemy 2.0
- **Validation:** Pydantic v2
- **Database:** PostgreSQL 15+
- **Migrations:** Alembic
- **Authentication:** OAuth2 + JWT
- **Testing:** Pytest + pytest-asyncio
- **Deployment:** AWS EC2 Free Tier (Docker)

### Infrastructure
- **Database:** PostgreSQL (AWS RDS Free Tier or self-hosted on EC2)
- **File Storage:** AWS S3 or Cloudinary (Free tier)
- **Email:** Resend or SendGrid (Free tier)
- **SMS (Future):** Africa's Talking or Twilio
- **Monitoring:** Sentry (Free tier)

## Core Features Specification

### 1. Authentication System

#### Customer Authentication
- **Google OAuth:** Primary login method
- **Guest Checkout:** Allow orders/bookings without account
- **Account Linking:** Link guest orders to accounts when users register (matched by email)
- **Session Management:** JWT tokens with refresh mechanism
- **Data Collected:** Name, email, phone number, profile picture (from Google)

#### Admin Authentication
- **Google OAuth:** Admin login via authorized Google accounts
- **Role System:** Extensible RBAC (start with single super admin)
  - Super Admin (full access)
  - Product Manager (future)
  - Booking Manager (future)
  - Content Editor (future)
  - Individual Artist Accounts (future)
- **Admin Whitelist:** Email whitelist in database for authorized admins

### 2. Makeup Services & Booking System

#### Service Types

**Bridal Makeup Packages:**

1. **Bride + Large Team (6+ maids)**
   - Bride: KES 2,500
   - Each Maid: KES 1,000
   - Mothers: Custom pricing (configurable)
   - Others (aunties, cousins, sisters): Custom pricing (configurable)

2. **Bride + Small Team (1-5 maids)**
   - Bride: KES 3,000
   - Each Maid: KES 1,500
   - Mothers: Custom pricing (configurable)
   - Others: Custom pricing (configurable)

3. **Bride Only**
   - Price: KES 3,500
   - Includes: Mini facial and skin prep

**Non-Bridal Services:**
- Regular Makeup: KES 1,500
- Makeup Artistry Classes: KES 1,500 (multiple tiers based on curriculum)

#### Transport Pricing
- **Free Locations:** Nairobi, Kitui
- **Other Locations:** KES 1,000 (currently flat rate)
- **Future:** Multiple artists, dynamic transport pricing model

#### Booking Flow
1. Customer selects service package
2. Enters number of people:
   - Bride(s)
   - Maids (with validation based on package)
   - Mothers
   - Others
3. Selects location (transport cost calculated)
4. Chooses date and time from available slots
5. Adds additional details:
   - Wedding theme (for color coordination)
   - Special requests
   - Contact information
6. Views total price breakdown
7. Confirms booking
8. Receives confirmation email
9. Admin reviews and confirms
10. Customer pays 50% deposit
11. Booking confirmed and calendar updated

#### Calendar Management
- **Admin Features:**
  - Set working hours
  - Block dates (vacations, personal time)
  - Mark time slots as unavailable
  - View all bookings in calendar view
- **Customer View:**
  - See available time slots only
  - Select date and time
  - Prevent double bookings

#### Booking Status Workflow
- `PENDING` - Submitted, awaiting admin review
- `CONFIRMED` - Admin approved, awaiting deposit
- `DEPOSIT_PAID` - 50% deposit received
- `COMPLETED` - Service delivered
- `CANCELLED` - Cancelled by customer or admin

### 3. E-Commerce System

#### Product Management

**Product Attributes:**
- Title
- Description (rich text)
- Brand
- Category (hierarchical: Category → Subcategory)
- Base Price
- Discount (percentage or fixed amount)
- Multiple Images (with primary image)
- Videos (optional)
- SKU
- Inventory Count
- Low Stock Threshold
- Product Variants:
  - Size (e.g., 50ml, 100ml, 250ml)
  - Color (e.g., shade variations)
  - Type (e.g., matte, glossy)
- Tags for search
- SEO metadata

**Pricing Features:**
- Base pricing
- Percentage discounts
- Fixed amount discounts
- Promo codes (reusable or single-use)
- Flash sales (time-limited)
- Bulk pricing (future)

**Product Organization:**
```
Brand → Category → Subcategory → Product
Example:
  Fenty Beauty → Skincare → Moisturizers → Pro Filt'r Soft Matte Skin Perfecting Powder
```

#### Shopping Experience

**Product Discovery:**
- Advanced filtering:
  - Brand (multi-select)
  - Category (hierarchical)
  - Price range (slider)
  - Rating (stars)
  - In stock only
  - On sale
- Sorting:
  - Newest first
  - Price: Low to High
  - Price: High to Low
  - Most popular
  - Highest rated
- Search (full-text search on title, description, brand, tags)
- Pagination or infinite scroll

**Product Detail Page:**
- Image gallery with zoom
- Image carousel for multiple angles
- Video player (if available)
- Variant selection (size, color)
- Stock availability indicator
- Add to cart button (disabled if out of stock)
- Add to wishlist
- Related products carousel
- Reviews and ratings section
- Product specifications table

**Shopping Cart:**
- Persistent cart (local storage + backend sync for logged-in users)
- Quantity adjustment
- Remove items
- Apply promo codes
- Real-time price calculation
- Stock validation
- Shipping/delivery information
- Proceed to checkout

**Wishlist:**
- Save products for later
- View all wishlist items
- Move to cart
- Share wishlist (future)

#### Checkout Process

**Guest Checkout:**
- Collect required information:
  - Full Name
  - Email Address
  - Phone Number
  - Delivery Address (county, town, specific location)
- Create guest order record
- Store email for future account linking

**Registered User Checkout:**
- Pre-fill saved delivery addresses
- Order history tracking
- Faster checkout

**Order Summary:**
- Itemized list with prices
- Subtotal
- Promo code discount
- Delivery fee (if applicable)
- Total amount
- Delivery location and estimated time

**Payment (Phase 1):**
- Manual payment coordination
- Admin contacts customer via phone/email
- Provides M-Pesa payment instructions
- Confirms payment manually
- Updates order status

**Payment (Future - Phase 2):**
- M-Pesa STK Push integration
- Paystack integration (cards + M-Pesa)
- Automatic payment confirmation
- Payment webhooks

#### Order Management

**Order Status:**
- `PENDING` - Order placed, awaiting payment
- `PAYMENT_CONFIRMED` - Payment received
- `PROCESSING` - Preparing order
- `SHIPPED` - Out for delivery
- `DELIVERED` - Delivered to customer
- `CANCELLED` - Order cancelled

**Customer Features:**
- View order history
- Track order status
- Order details page
- Reorder functionality
- Download order receipt (PDF)

**Admin Features:**
- View all orders (filterable, searchable)
- Update order status
- Add tracking information
- Process refunds (manual)
- Export orders to CSV
- Order analytics

#### Reviews & Ratings

**Review System:**
- 5-star rating
- Written review (optional)
- Customer name and date
- Admin moderation (approve/reject)
- Verified purchase badge
- Helpful votes (thumbs up/down)
- Reply to reviews (admin)

**Display:**
- Average rating on product cards
- Rating distribution (5 stars: X%, 4 stars: Y%, etc.)
- Sort reviews (Most helpful, Newest, Highest rated, Lowest rated)
- Filter by rating

### 4. Content Management

#### Gallery / Social Feed

**Manual Upload System:**
- Admin uploads images/videos manually
- Mimics Instagram/TikTok style posts
- Attributes:
  - Image or video file
  - Caption
  - Tags
  - Post type (Instagram, TikTok, Original)
  - Published date
  - Featured (yes/no)

**Display:**
- Grid layout (masonry or fixed grid)
- Lightbox for viewing
- Video playback
- Filter by type
- Lazy loading for performance

#### Testimonials

**Testimonial Management:**
- Admin CRUD operations
- Attributes:
  - Customer name
  - Customer photo (optional)
  - Location (e.g., Nairobi, Kitui)
  - Rating (5 stars)
  - Testimonial text
  - Service/product related to
  - Featured (yes/no)
  - Approval status

**Display:**
- Homepage testimonials carousel
- Dedicated testimonials page
- Service-specific testimonials
- Product-specific testimonials

### 5. 2026 Vision Showcase

**Purpose:**
- Showcase future premium salon/spa/barbershop
- Measure market interest
- Collect data for funding proposals (banks)
- Build anticipation

**Services to Showcase:**
1. **Premium Salon**
   - Professional styling advice
   - High-end products
   - Welcoming reception (wine/whisky service)

2. **Barbershop**
   - Modern grooming services
   - Premium products

3. **Spa & Wellness**
   - Healing and rejuvenation space
   - Mental health support
   - Therapeutic treatments

4. **Mobile Bridal Van**
   - Complete bridal makeup at wedding venue
   - Multiple artists serve bridal team
   - Attendees can purchase services at van
   - All-in-one bridal beauty solution

**Page Features:**
- Hero section with vision statement
- AI-generated interior/exterior images (placeholders initially)
- Service descriptions with icons
- Benefits and differentiators
- Target market messaging (new middle class, 20s-30s)
- Location focus (especially Kitui)

**Interest Registration Form:**
- Full Name (required)
- Email Address (required)
- Phone Number (required)
- Location/County (dropdown)
- Services Interested In (multi-select checkboxes):
  - [ ] Salon Services
  - [ ] Barbershop
  - [ ] Spa & Wellness
  - [ ] Mobile Bridal Van
  - [ ] All Services
- Additional Comments (textarea)
- Submit button

**Admin Analytics:**
- Total registrations
- Breakdown by service interest
- Geographic distribution
- Timeline of registrations
- Export to CSV for funding proposals
- Visualization (charts/graphs)

### 6. Admin Dashboard

**Dashboard Sections:**

1. **Overview**
   - Total revenue (current month, all time)
   - Total orders (pending, completed)
   - Total bookings (upcoming, completed)
   - Total products
   - Low stock alerts
   - Recent activity feed

2. **Products**
   - List all products (searchable, filterable)
   - Add new product
   - Edit product
   - Delete product
   - Bulk operations (delete, update pricing)
   - Category/brand management
   - Inventory management

3. **Services**
   - List all service packages
   - Create new package (dynamic builder)
   - Edit package pricing and rules
   - Transport cost rules
   - Deactivate/activate packages

4. **Bookings**
   - Calendar view of all bookings
   - List view (filterable by status, date)
   - Booking details
   - Update booking status
   - Mark deposit as received
   - Add notes to booking
   - Contact customer

5. **Orders**
   - List all orders (filterable, searchable)
   - Order details
   - Update order status
   - Add tracking information
   - Mark payment as confirmed
   - Export orders

6. **Calendar Management**
   - Set working hours
   - Block dates
   - Mark time slots unavailable
   - View availability

7. **Gallery**
   - Upload images/videos
   - Edit captions and tags
   - Delete posts
   - Feature/unfeature posts

8. **Testimonials**
   - View all testimonials
   - Approve/reject
   - Edit testimonials
   - Delete testimonials
   - Feature on homepage

9. **Reviews**
   - View all product reviews
   - Moderate (approve/reject)
   - Reply to reviews
   - Delete inappropriate reviews

10. **2026 Vision Registrations**
    - View all registrations
    - Filter by service interest, location
    - Analytics dashboard
    - Export to CSV

11. **Settings**
    - Profile settings
    - Business information
    - Email templates
    - Notification preferences
    - Admin user management (future)

## Database Schema

### Users Table
```sql
users
- id (UUID, PK)
- email (VARCHAR, UNIQUE, NOT NULL)
- full_name (VARCHAR)
- phone_number (VARCHAR)
- profile_picture_url (VARCHAR)
- google_id (VARCHAR, UNIQUE, NULLABLE) -- NULL for guest users
- is_admin (BOOLEAN, DEFAULT FALSE)
- admin_role (ENUM: super_admin, product_manager, booking_manager, content_editor, artist, NULL)
- is_active (BOOLEAN, DEFAULT TRUE)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Products Table
```sql
products
- id (UUID, PK)
- title (VARCHAR, NOT NULL)
- slug (VARCHAR, UNIQUE, NOT NULL)
- description (TEXT)
- brand_id (UUID, FK → brands.id)
- category_id (UUID, FK → categories.id)
- base_price (DECIMAL(10,2), NOT NULL)
- discount_type (ENUM: percentage, fixed, NULL)
- discount_value (DECIMAL(10,2), NULLABLE)
- sku (VARCHAR, UNIQUE)
- inventory_count (INTEGER, DEFAULT 0)
- low_stock_threshold (INTEGER, DEFAULT 10)
- is_active (BOOLEAN, DEFAULT TRUE)
- is_featured (BOOLEAN, DEFAULT FALSE)
- tags (TEXT[])
- meta_title (VARCHAR)
- meta_description (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Product Images Table
```sql
product_images
- id (UUID, PK)
- product_id (UUID, FK → products.id, ON DELETE CASCADE)
- image_url (VARCHAR, NOT NULL)
- alt_text (VARCHAR)
- is_primary (BOOLEAN, DEFAULT FALSE)
- display_order (INTEGER)
- created_at (TIMESTAMP)
```

### Product Videos Table
```sql
product_videos
- id (UUID, PK)
- product_id (UUID, FK → products.id, ON DELETE CASCADE)
- video_url (VARCHAR, NOT NULL)
- thumbnail_url (VARCHAR)
- display_order (INTEGER)
- created_at (TIMESTAMP)
```

### Product Variants Table
```sql
product_variants
- id (UUID, PK)
- product_id (UUID, FK → products.id, ON DELETE CASCADE)
- variant_type (VARCHAR) -- e.g., "size", "color"
- variant_value (VARCHAR) -- e.g., "50ml", "Ruby Red"
- price_adjustment (DECIMAL(10,2), DEFAULT 0)
- inventory_count (INTEGER, DEFAULT 0)
- sku (VARCHAR, UNIQUE)
- is_active (BOOLEAN, DEFAULT TRUE)
- created_at (TIMESTAMP)
```

### Brands Table
```sql
brands
- id (UUID, PK)
- name (VARCHAR, UNIQUE, NOT NULL)
- slug (VARCHAR, UNIQUE, NOT NULL)
- description (TEXT)
- logo_url (VARCHAR)
- is_active (BOOLEAN, DEFAULT TRUE)
- created_at (TIMESTAMP)
```

### Categories Table
```sql
categories
- id (UUID, PK)
- name (VARCHAR, NOT NULL)
- slug (VARCHAR, UNIQUE, NOT NULL)
- parent_category_id (UUID, FK → categories.id, NULLABLE) -- for subcategories
- description (TEXT)
- image_url (VARCHAR)
- display_order (INTEGER)
- is_active (BOOLEAN, DEFAULT TRUE)
- created_at (TIMESTAMP)
```

### Service Packages Table
```sql
service_packages
- id (UUID, PK)
- package_type (ENUM: bridal_large, bridal_small, bride_only, regular, classes)
- name (VARCHAR, NOT NULL)
- description (TEXT)
- base_bride_price (DECIMAL(10,2))
- base_maid_price (DECIMAL(10,2))
- base_mother_price (DECIMAL(10,2), NULLABLE)
- base_other_price (DECIMAL(10,2), NULLABLE)
- max_maids (INTEGER, NULLABLE) -- e.g., 5 for small bridal
- min_maids (INTEGER, NULLABLE)
- includes_facial (BOOLEAN, DEFAULT FALSE)
- duration_minutes (INTEGER) -- estimated duration
- is_active (BOOLEAN, DEFAULT TRUE)
- display_order (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Transport Locations Table
```sql
transport_locations
- id (UUID, PK)
- location_name (VARCHAR, NOT NULL) -- e.g., "Nairobi", "Kitui", "Mombasa"
- county (VARCHAR)
- transport_cost (DECIMAL(10,2), DEFAULT 0)
- is_free (BOOLEAN, DEFAULT FALSE)
- is_active (BOOLEAN, DEFAULT TRUE)
- created_at (TIMESTAMP)
```

### Bookings Table
```sql
bookings
- id (UUID, PK)
- booking_number (VARCHAR, UNIQUE, NOT NULL) -- e.g., "BK-2025-001"
- user_id (UUID, FK → users.id, NULLABLE) -- NULL for guest bookings
- guest_email (VARCHAR, NULLABLE)
- guest_name (VARCHAR, NULLABLE)
- guest_phone (VARCHAR, NULLABLE)
- package_id (UUID, FK → service_packages.id)
- booking_date (DATE, NOT NULL)
- booking_time (TIME, NOT NULL)
- location_id (UUID, FK → transport_locations.id)
- num_brides (INTEGER, DEFAULT 1)
- num_maids (INTEGER, DEFAULT 0)
- num_mothers (INTEGER, DEFAULT 0)
- num_others (INTEGER, DEFAULT 0)
- wedding_theme (VARCHAR, NULLABLE)
- special_requests (TEXT, NULLABLE)
- subtotal (DECIMAL(10,2), NOT NULL)
- transport_cost (DECIMAL(10,2), NOT NULL)
- total_amount (DECIMAL(10,2), NOT NULL)
- deposit_amount (DECIMAL(10,2)) -- 50% of total
- deposit_paid (BOOLEAN, DEFAULT FALSE)
- deposit_paid_at (TIMESTAMP, NULLABLE)
- status (ENUM: pending, confirmed, deposit_paid, completed, cancelled)
- admin_notes (TEXT, NULLABLE)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Calendar Availability Table
```sql
calendar_availability
- id (UUID, PK)
- date (DATE, NOT NULL)
- time_slot (TIME, NOT NULL)
- is_available (BOOLEAN, DEFAULT TRUE)
- reason (VARCHAR, NULLABLE) -- e.g., "Booked", "Vacation", "Personal"
- created_at (TIMESTAMP)
- UNIQUE(date, time_slot)
```

### Orders Table
```sql
orders
- id (UUID, PK)
- order_number (VARCHAR, UNIQUE, NOT NULL) -- e.g., "ORD-2025-001"
- user_id (UUID, FK → users.id, NULLABLE)
- guest_email (VARCHAR, NULLABLE)
- guest_name (VARCHAR, NULLABLE)
- guest_phone (VARCHAR, NULLABLE)
- delivery_county (VARCHAR)
- delivery_town (VARCHAR)
- delivery_address (TEXT)
- subtotal (DECIMAL(10,2), NOT NULL)
- discount_amount (DECIMAL(10,2), DEFAULT 0)
- promo_code_id (UUID, FK → promo_codes.id, NULLABLE)
- delivery_fee (DECIMAL(10,2), DEFAULT 0)
- total_amount (DECIMAL(10,2), NOT NULL)
- payment_method (VARCHAR, NULLABLE) -- e.g., "M-Pesa", "Paystack"
- payment_confirmed (BOOLEAN, DEFAULT FALSE)
- payment_confirmed_at (TIMESTAMP, NULLABLE)
- status (ENUM: pending, payment_confirmed, processing, shipped, delivered, cancelled)
- tracking_number (VARCHAR, NULLABLE)
- admin_notes (TEXT, NULLABLE)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Order Items Table
```sql
order_items
- id (UUID, PK)
- order_id (UUID, FK → orders.id, ON DELETE CASCADE)
- product_id (UUID, FK → products.id)
- product_variant_id (UUID, FK → product_variants.id, NULLABLE)
- product_title (VARCHAR) -- snapshot at time of order
- product_sku (VARCHAR)
- quantity (INTEGER, NOT NULL)
- unit_price (DECIMAL(10,2), NOT NULL) -- price at time of order
- discount (DECIMAL(10,2), DEFAULT 0)
- total_price (DECIMAL(10,2), NOT NULL)
- created_at (TIMESTAMP)
```

### Promo Codes Table
```sql
promo_codes
- id (UUID, PK)
- code (VARCHAR, UNIQUE, NOT NULL)
- description (TEXT)
- discount_type (ENUM: percentage, fixed)
- discount_value (DECIMAL(10,2), NOT NULL)
- min_order_amount (DECIMAL(10,2), NULLABLE)
- max_discount_amount (DECIMAL(10,2), NULLABLE)
- usage_limit (INTEGER, NULLABLE) -- NULL = unlimited
- usage_count (INTEGER, DEFAULT 0)
- valid_from (TIMESTAMP)
- valid_until (TIMESTAMP)
- is_active (BOOLEAN, DEFAULT TRUE)
- created_at (TIMESTAMP)
```

### Cart Table
```sql
carts
- id (UUID, PK)
- user_id (UUID, FK → users.id, UNIQUE)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Cart Items Table
```sql
cart_items
- id (UUID, PK)
- cart_id (UUID, FK → carts.id, ON DELETE CASCADE)
- product_id (UUID, FK → products.id)
- product_variant_id (UUID, FK → product_variants.id, NULLABLE)
- quantity (INTEGER, NOT NULL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- UNIQUE(cart_id, product_id, product_variant_id)
```

### Wishlists Table
```sql
wishlists
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- product_id (UUID, FK → products.id)
- created_at (TIMESTAMP)
- UNIQUE(user_id, product_id)
```

### Reviews Table
```sql
reviews
- id (UUID, PK)
- product_id (UUID, FK → products.id, ON DELETE CASCADE)
- user_id (UUID, FK → users.id)
- order_id (UUID, FK → orders.id, NULLABLE) -- for verified purchase
- rating (INTEGER, CHECK rating >= 1 AND rating <= 5)
- review_text (TEXT, NULLABLE)
- is_verified_purchase (BOOLEAN, DEFAULT FALSE)
- is_approved (BOOLEAN, DEFAULT FALSE)
- helpful_count (INTEGER, DEFAULT 0)
- admin_reply (TEXT, NULLABLE)
- admin_reply_at (TIMESTAMP, NULLABLE)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Gallery Posts Table
```sql
gallery_posts
- id (UUID, PK)
- media_type (ENUM: image, video)
- media_url (VARCHAR, NOT NULL)
- thumbnail_url (VARCHAR, NULLABLE) -- for videos
- caption (TEXT)
- tags (TEXT[])
- source_type (ENUM: instagram, tiktok, original)
- is_featured (BOOLEAN, DEFAULT FALSE)
- display_order (INTEGER)
- published_at (TIMESTAMP)
- created_at (TIMESTAMP)
```

### Testimonials Table
```sql
testimonials
- id (UUID, PK)
- customer_name (VARCHAR, NOT NULL)
- customer_photo_url (VARCHAR, NULLABLE)
- location (VARCHAR) -- e.g., "Nairobi", "Kitui"
- rating (INTEGER, CHECK rating >= 1 AND rating <= 5)
- testimonial_text (TEXT, NOT NULL)
- related_service_id (UUID, FK → service_packages.id, NULLABLE)
- related_product_id (UUID, FK → products.id, NULLABLE)
- is_featured (BOOLEAN, DEFAULT FALSE)
- is_approved (BOOLEAN, DEFAULT TRUE)
- display_order (INTEGER)
- created_at (TIMESTAMP)
```

### 2026 Vision Registrations Table
```sql
vision_registrations
- id (UUID, PK)
- full_name (VARCHAR, NOT NULL)
- email (VARCHAR, NOT NULL)
- phone_number (VARCHAR, NOT NULL)
- location (VARCHAR) -- County
- interested_in_salon (BOOLEAN, DEFAULT FALSE)
- interested_in_barbershop (BOOLEAN, DEFAULT FALSE)
- interested_in_spa (BOOLEAN, DEFAULT FALSE)
- interested_in_mobile_van (BOOLEAN, DEFAULT FALSE)
- additional_comments (TEXT, NULLABLE)
- created_at (TIMESTAMP)
```

### Admin Activity Logs Table (optional, for audit trail)
```sql
admin_activity_logs
- id (UUID, PK)
- admin_user_id (UUID, FK → users.id)
- action (VARCHAR) -- e.g., "created_product", "updated_order"
- entity_type (VARCHAR) -- e.g., "product", "order"
- entity_id (UUID)
- details (JSONB) -- additional context
- ip_address (VARCHAR)
- created_at (TIMESTAMP)
```

## API Endpoints

### Authentication
```
POST   /api/auth/google          - Google OAuth callback
POST   /api/auth/refresh          - Refresh access token
POST   /api/auth/logout           - Logout user
GET    /api/auth/me               - Get current user info
```

### Products (Public)
```
GET    /api/products              - List products (with filters, search, pagination)
GET    /api/products/:slug        - Get product by slug
GET    /api/products/:id/reviews  - Get product reviews
POST   /api/products/:id/reviews  - Create review (authenticated)
```

### Products (Admin)
```
POST   /api/admin/products        - Create product
PUT    /api/admin/products/:id    - Update product
DELETE /api/admin/products/:id    - Delete product
POST   /api/admin/products/:id/images - Upload product image
DELETE /api/admin/products/images/:imageId - Delete product image
```

### Brands (Admin)
```
GET    /api/brands                - List all brands
POST   /api/admin/brands          - Create brand
PUT    /api/admin/brands/:id      - Update brand
DELETE /api/admin/brands/:id      - Delete brand
```

### Categories (Public)
```
GET    /api/categories            - List all categories (hierarchical)
GET    /api/categories/:slug      - Get category details
```

### Categories (Admin)
```
POST   /api/admin/categories      - Create category
PUT    /api/admin/categories/:id  - Update category
DELETE /api/admin/categories/:id  - Delete category
```

### Service Packages (Public)
```
GET    /api/services              - List all active service packages
GET    /api/services/:id          - Get service package details
```

### Service Packages (Admin)
```
POST   /api/admin/services        - Create service package
PUT    /api/admin/services/:id    - Update service package
DELETE /api/admin/services/:id    - Delete service package
```

### Bookings (Customer)
```
GET    /api/bookings/availability - Get available time slots for a date
POST   /api/bookings              - Create booking
GET    /api/bookings              - List user's bookings (authenticated)
GET    /api/bookings/:id          - Get booking details
PUT    /api/bookings/:id/cancel   - Cancel booking
```

### Bookings (Admin)
```
GET    /api/admin/bookings        - List all bookings (filterable)
PUT    /api/admin/bookings/:id    - Update booking (status, notes)
PUT    /api/admin/bookings/:id/deposit - Mark deposit as paid
```

### Calendar (Admin)
```
GET    /api/admin/calendar        - Get calendar availability
POST   /api/admin/calendar/block  - Block time slots
DELETE /api/admin/calendar/block/:id - Unblock time slot
```

### Transport Locations (Public)
```
GET    /api/locations             - List all locations with transport costs
```

### Transport Locations (Admin)
```
POST   /api/admin/locations       - Create location
PUT    /api/admin/locations/:id   - Update location
DELETE /api/admin/locations/:id   - Delete location
```

### Cart (Authenticated)
```
GET    /api/cart                  - Get user's cart
POST   /api/cart/items            - Add item to cart
PUT    /api/cart/items/:id        - Update cart item quantity
DELETE /api/cart/items/:id        - Remove item from cart
DELETE /api/cart                  - Clear cart
```

### Wishlist (Authenticated)
```
GET    /api/wishlist              - Get user's wishlist
POST   /api/wishlist              - Add product to wishlist
DELETE /api/wishlist/:productId   - Remove from wishlist
```

### Orders (Customer)
```
POST   /api/orders                - Create order (guest or authenticated)
GET    /api/orders                - List user's orders (authenticated)
GET    /api/orders/:orderNumber   - Get order details (by order number or ID)
```

### Orders (Admin)
```
GET    /api/admin/orders          - List all orders (filterable, searchable)
PUT    /api/admin/orders/:id      - Update order status
PUT    /api/admin/orders/:id/payment - Mark payment confirmed
GET    /api/admin/orders/export   - Export orders to CSV
```

### Promo Codes (Customer)
```
POST   /api/promo-codes/validate  - Validate promo code
```

### Promo Codes (Admin)
```
GET    /api/admin/promo-codes     - List all promo codes
POST   /api/admin/promo-codes     - Create promo code
PUT    /api/admin/promo-codes/:id - Update promo code
DELETE /api/admin/promo-codes/:id - Delete promo code
```

### Gallery (Public)
```
GET    /api/gallery               - List gallery posts (paginated)
GET    /api/gallery/:id           - Get gallery post details
```

### Gallery (Admin)
```
POST   /api/admin/gallery         - Upload gallery post
PUT    /api/admin/gallery/:id     - Update gallery post
DELETE /api/admin/gallery/:id     - Delete gallery post
```

### Testimonials (Public)
```
GET    /api/testimonials          - List approved testimonials
GET    /api/testimonials/featured - Get featured testimonials
```

### Testimonials (Admin)
```
GET    /api/admin/testimonials    - List all testimonials
POST   /api/admin/testimonials    - Create testimonial
PUT    /api/admin/testimonials/:id - Update testimonial
DELETE /api/admin/testimonials/:id - Delete testimonial
PUT    /api/admin/testimonials/:id/approve - Approve testimonial
```

### 2026 Vision (Public)
```
POST   /api/vision/register       - Register interest
```

### 2026 Vision (Admin)
```
GET    /api/admin/vision/registrations - List all registrations
GET    /api/admin/vision/analytics     - Get registration analytics
GET    /api/admin/vision/export        - Export registrations to CSV
```

### Analytics (Admin)
```
GET    /api/admin/analytics/overview   - Dashboard overview stats
GET    /api/admin/analytics/sales      - Sales analytics
GET    /api/admin/analytics/products   - Product performance
GET    /api/admin/analytics/bookings   - Booking analytics
```

## Development Workflow

### Git Workflow
1. Pick a GitHub issue from the backlog
2. Create feature branch: `feature/issue-{number}-{short-description}`
   - Example: `feature/issue-15-auth-system`
3. Implement the feature following TDD:
   - Write tests first (red)
   - Implement feature (green)
   - Refactor (clean)
4. Ensure all tests pass locally:
   - Backend: `pytest`
   - Frontend: `npm test`
5. Commit with clear message referencing issue:
   - Example: `feat: implement Google OAuth authentication (#15)`
6. Push branch to GitHub
7. Create Pull Request:
   - Reference issue in description: "Closes #15"
   - Provide summary of changes
   - Include screenshots if UI changes
8. Review code
9. Merge to `main` branch
10. Deploy and test on staging/production
11. Close issue
12. Move to next issue

### Branch Naming Convention
- Features: `feature/issue-{number}-{description}`
- Bugfixes: `fix/issue-{number}-{description}`
- Hotfixes: `hotfix/{description}`
- Documentation: `docs/{description}`

### Commit Message Format
Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions or updates
- `chore:` Build process or auxiliary tool changes

### Testing Strategy

**Backend Testing (Pytest):**
- Unit tests for business logic
- Integration tests for API endpoints
- Database transaction tests
- Authentication/authorization tests
- Test coverage target: 80%+

**Frontend Testing (Jest + RTL):**
- Component unit tests
- Integration tests for user flows
- Form validation tests
- API integration tests (mocked)
- Accessibility tests
- Test coverage target: 70%+

**E2E Testing (Future - Playwright):**
- Critical user journeys
- Checkout flow
- Booking flow
- Admin operations

## Security Considerations

### Authentication & Authorization
- OAuth 2.0 with Google
- JWT tokens with short expiration (15 min access, 7 day refresh)
- HTTP-only cookies for refresh tokens
- CSRF protection for state-changing operations
- Admin email whitelist in database

### Data Protection
- Input validation with Pydantic (backend) and Zod (frontend)
- SQL injection prevention via SQLAlchemy ORM
- XSS prevention (sanitize user input, escape output)
- Rate limiting on API endpoints
- Secure password hashing (if adding password auth later)

### Infrastructure Security
- HTTPS only (enforced)
- Environment variables for secrets (never commit)
- CORS configuration (whitelist frontend domain)
- Security headers (Helmet.js, FastAPI middleware)
- Regular dependency updates
- Database connection encryption

### Payment Security (Future)
- PCI DSS compliance (use Paystack SDK)
- Never store payment credentials
- Webhook signature verification
- Transaction logging

## Performance Optimization

### Frontend
- Next.js Image component for optimized images
- Lazy loading for images and components
- Code splitting and dynamic imports
- Prefetching for navigation
- Service Worker for offline support (future)
- Compression (gzip/brotli)
- CDN for static assets

### Backend
- Database query optimization (indexes, avoid N+1)
- Pagination for large datasets
- Caching (Redis future, in-memory for now)
- Background tasks for emails (Celery future)
- Database connection pooling
- API response compression

### Database
- Proper indexes on frequently queried columns
- Foreign key constraints
- Composite indexes for complex queries
- Regular VACUUM and ANALYZE

## SEO Strategy

### Technical SEO
- Dynamic metadata per page (Next.js Metadata API)
- Semantic HTML structure
- XML sitemap
- robots.txt
- Canonical URLs
- Open Graph tags for social sharing
- Schema.org structured data (Product, Review, LocalBusiness)

### Content SEO
- Descriptive product titles and descriptions
- Alt text for all images
- URL slugs with keywords
- Internal linking structure
- Blog/content section (future)

## Deployment Strategy

### Environments
- **Development:** Local machine
- **Staging:** Vercel preview deployments (frontend), EC2 (backend)
- **Production:** Vercel (frontend), EC2 (backend)

### Frontend Deployment (Vercel)
1. Connect GitHub repository
2. Configure build settings:
   - Framework: Next.js
   - Build command: `npm run build`
   - Output directory: `.next`
3. Environment variables:
   - `NEXT_PUBLIC_API_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
4. Custom domain configuration
5. SSL certificate (automatic via Vercel)

### Backend Deployment (AWS EC2)
1. Launch EC2 instance (t2.micro, free tier)
2. Install Docker and Docker Compose
3. Setup PostgreSQL (RDS or Docker container)
4. Clone repository
5. Create `.env` file with production secrets
6. Build and run containers:
   ```bash
   docker-compose up -d
   ```
7. Setup Nginx reverse proxy
8. Configure SSL with Let's Encrypt (Certbot)
9. Setup automated backups for database

### CI/CD (Future)
- GitHub Actions for automated testing
- Auto-deploy to staging on PR
- Auto-deploy to production on merge to main
- Automated database migrations

## Monitoring & Maintenance

### Error Tracking
- Sentry for frontend and backend errors
- Real-time alerts for critical errors
- User context for debugging

### Analytics
- Google Analytics for user behavior
- Custom event tracking for conversions
- Funnel analysis for checkout/booking flows

### Logging
- Structured logging (JSON format)
- Log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- Log rotation and retention policies

### Backups
- Daily automated database backups
- Retention: 30 days
- Offsite storage (S3)
- Regular restore testing

### Maintenance Tasks
- Weekly dependency updates
- Monthly security audits
- Quarterly performance reviews
- Regular database optimization

## Scalability Roadmap

### Phase 2 Enhancements
- Payment gateway integration (M-Pesa, Paystack)
- Email marketing automation (Mailchimp/SendGrid)
- SMS notifications (Africa's Talking)
- Multiple admin roles
- Staff artist accounts
- Advanced analytics and reporting
- Customer loyalty program
- Referral system

### Phase 3 Enhancements
- Mobile app (React Native)
- Live chat support
- Appointment reminders (automated)
- Subscription/membership tiers
- Advanced inventory management
- Multi-location support
- Marketplace for other artists (platform model)

### Infrastructure Scaling
- Database read replicas
- Redis caching layer
- CDN for global reach
- Load balancer for backend
- Microservices architecture (if needed)
- Kubernetes for container orchestration (if needed)

## Timeline & Milestones

### Milestone 1: Foundation (Weeks 1-2)
- Project setup and configuration
- Database schema implementation
- Authentication system
- Admin panel foundation

### Milestone 2: Admin Features (Weeks 3-4)
- Product management
- Service package management
- Calendar management
- Content management (gallery, testimonials)

### Milestone 3: Customer E-Commerce (Weeks 5-7)
- Homepage and navigation
- Product catalog and search
- Shopping cart and wishlist
- Checkout and order management

### Milestone 4: Booking System (Weeks 8-9)
- Service listing and details
- Booking flow with calendar
- Booking management
- Email notifications

### Milestone 5: Content & Vision (Weeks 10-11)
- Gallery display
- Testimonials display
- 2026 Vision showcase
- Interest registration

### Milestone 6: Launch Preparation (Week 12)
- Testing and bug fixes
- Performance optimization
- Security audit
- SEO implementation
- Deployment and launch

## Success Metrics

### Business KPIs
- Number of orders per month
- Average order value
- Number of bookings per month
- Conversion rate (visitors → customers)
- Customer retention rate
- 2026 vision registrations

### Technical KPIs
- Page load time (< 3 seconds)
- API response time (< 500ms)
- Uptime (99.9%)
- Test coverage (80%+ backend, 70%+ frontend)
- Zero critical security vulnerabilities

## Support & Documentation

### User Documentation
- Customer help center (FAQs)
- How to place an order
- How to book makeup services
- Payment instructions
- Delivery information
- Returns and refunds policy

### Admin Documentation
- Admin user guide
- Product management guide
- Booking management guide
- Content management guide
- Troubleshooting guide

### Developer Documentation
- API documentation (auto-generated with Swagger/OpenAPI)
- Database schema documentation
- Setup and installation guide
- Contribution guidelines
- Code style guide

## Legal & Compliance

### Required Pages
- Terms and Conditions
- Privacy Policy
- Shipping and Delivery Policy
- Returns and Refunds Policy
- Cookie Policy

### Data Protection
- GDPR compliance (if targeting EU)
- Kenya Data Protection Act compliance
- User consent for data collection
- Right to access personal data
- Right to delete personal data

## Conclusion

This comprehensive plan provides a roadmap for building an enterprise-grade web application for Glam by Lynn. The phased approach ensures a solid foundation while allowing for iterative improvements and scalability as the business grows. By following industry best practices and focusing on user experience, security, and performance, this platform will serve as a powerful tool for business growth and customer engagement.

---

**Last Updated:** 2025-01-16
**Version:** 1.0
**Status:** Ready for Implementation
