# Database Schema Documentation

## Overview

This document describes the complete database schema for the Glam by Lynn application. The database uses PostgreSQL with proper relationships, constraints, and indexes for optimal performance.

## Entity Relationship Diagram (ERD)

```
users (1) ──< (N) orders
users (1) ──< (N) bookings
users (1) ──< (N) reviews
users (1) ──< (1) cart
users (1) ──< (N) wishlists
users (1) ──< (N) admin_activity_logs

products (1) ──< (N) product_images
products (1) ──< (N) product_videos
products (1) ──< (N) product_variants
products (1) ──< (N) reviews
products (1) ──< (N) order_items
products (1) ──< (N) cart_items
products (1) ──< (N) wishlists
products (N) ──> (1) brands
products (N) ──> (1) categories

categories (1) ──< (N) categories (self-referencing for subcategories)

orders (1) ──< (N) order_items
orders (N) ──> (1) promo_codes

carts (1) ──< (N) cart_items

bookings (N) ──> (1) service_packages
bookings (N) ──> (1) transport_locations

testimonials (N) ──> (1) service_packages
testimonials (N) ──> (1) products
```

## Table Definitions

### 1. users

Stores both customer and admin user information.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone_number VARCHAR(20),
    profile_picture_url VARCHAR(500),
    google_id VARCHAR(255) UNIQUE, -- NULL for guest users
    is_admin BOOLEAN DEFAULT FALSE,
    admin_role VARCHAR(50) CHECK (admin_role IN ('super_admin', 'product_manager', 'booking_manager', 'content_editor', 'artist')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_admin_role_check CHECK (
        (is_admin = FALSE AND admin_role IS NULL) OR
        (is_admin = TRUE AND admin_role IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Guest Users:**
- Guest users are created with `google_id = NULL`
- Email is required for order/booking tracking
- Can be linked to registered accounts later by matching email

---

### 2. brands

Product brands (e.g., Fenty Beauty, The Ordinary).

```sql
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brands_is_active ON brands(is_active) WHERE is_active = TRUE;

-- Trigger
CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 3. categories

Product categories with hierarchical structure (categories and subcategories).

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    parent_category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    description TEXT,
    image_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Prevent self-referencing
    CONSTRAINT categories_no_self_reference CHECK (id != parent_category_id)
);

-- Indexes
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_category_id);
CREATE INDEX idx_categories_is_active ON categories(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_categories_display_order ON categories(display_order);

-- Trigger
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Hierarchy:**
- Parent categories have `parent_category_id = NULL`
- Subcategories reference their parent via `parent_category_id`

---

### 4. products

Core product table with pricing and inventory.

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    description TEXT,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    base_price DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) CHECK (discount_value >= 0),
    sku VARCHAR(100) UNIQUE,
    inventory_count INTEGER DEFAULT 0 CHECK (inventory_count >= 0),
    low_stock_threshold INTEGER DEFAULT 10 CHECK (low_stock_threshold >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    meta_title VARCHAR(255),
    meta_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT products_discount_check CHECK (
        (discount_type IS NULL AND discount_value IS NULL) OR
        (discount_type IS NOT NULL AND discount_value IS NOT NULL AND discount_value > 0) OR
        (discount_type = 'percentage' AND discount_value <= 100)
    )
);

-- Indexes
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_is_featured ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_base_price ON products(base_price);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_tags ON products USING GIN(tags);
CREATE INDEX idx_products_inventory ON products(inventory_count) WHERE inventory_count <= low_stock_threshold;

-- Full-text search index
CREATE INDEX idx_products_search ON products USING GIN(
    to_tsvector('english', title || ' ' || COALESCE(description, ''))
);

-- Trigger
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 5. product_images

Product images with ordering.

```sql
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_is_primary ON product_images(product_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_product_images_display_order ON product_images(product_id, display_order);

-- Ensure only one primary image per product
CREATE UNIQUE INDEX idx_product_images_one_primary
    ON product_images(product_id)
    WHERE is_primary = TRUE;
```

---

### 6. product_videos

Product videos.

```sql
CREATE TABLE product_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    video_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_product_videos_product_id ON product_videos(product_id);
CREATE INDEX idx_product_videos_display_order ON product_videos(product_id, display_order);
```

---

### 7. product_variants

Product variants (size, color, etc.).

```sql
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_type VARCHAR(50) NOT NULL, -- 'size', 'color', 'type'
    variant_value VARCHAR(100) NOT NULL, -- '50ml', 'Ruby Red', etc.
    price_adjustment DECIMAL(10, 2) DEFAULT 0,
    inventory_count INTEGER DEFAULT 0 CHECK (inventory_count >= 0),
    sku VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Prevent duplicate variants
    UNIQUE(product_id, variant_type, variant_value)
);

-- Indexes
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_is_active ON product_variants(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_product_variants_type ON product_variants(variant_type);

-- Trigger
CREATE TRIGGER update_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 8. service_packages

Makeup service packages with dynamic pricing.

```sql
CREATE TABLE service_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_type VARCHAR(50) NOT NULL CHECK (package_type IN ('bridal_large', 'bridal_small', 'bride_only', 'regular', 'classes')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_bride_price DECIMAL(10, 2) CHECK (base_bride_price >= 0),
    base_maid_price DECIMAL(10, 2) CHECK (base_maid_price >= 0),
    base_mother_price DECIMAL(10, 2) CHECK (base_mother_price >= 0),
    base_other_price DECIMAL(10, 2) CHECK (base_other_price >= 0),
    max_maids INTEGER CHECK (max_maids > 0),
    min_maids INTEGER DEFAULT 0 CHECK (min_maids >= 0),
    includes_facial BOOLEAN DEFAULT FALSE,
    duration_minutes INTEGER CHECK (duration_minutes > 0),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT service_packages_maid_range_check CHECK (
        max_maids IS NULL OR min_maids IS NULL OR max_maids >= min_maids
    )
);

-- Indexes
CREATE INDEX idx_service_packages_type ON service_packages(package_type);
CREATE INDEX idx_service_packages_is_active ON service_packages(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_service_packages_display_order ON service_packages(display_order);

-- Trigger
CREATE TRIGGER update_service_packages_updated_at
    BEFORE UPDATE ON service_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 9. transport_locations

Locations with transport pricing.

```sql
CREATE TABLE transport_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_name VARCHAR(255) NOT NULL UNIQUE,
    county VARCHAR(100),
    transport_cost DECIMAL(10, 2) DEFAULT 0 CHECK (transport_cost >= 0),
    is_free BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_transport_locations_is_active ON transport_locations(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_transport_locations_is_free ON transport_locations(is_free) WHERE is_free = TRUE;

-- Trigger
CREATE TRIGGER update_transport_locations_updated_at
    BEFORE UPDATE ON transport_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 10. bookings

Makeup service bookings.

```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    guest_email VARCHAR(255),
    guest_name VARCHAR(255),
    guest_phone VARCHAR(20),
    package_id UUID NOT NULL REFERENCES service_packages(id) ON DELETE RESTRICT,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    location_id UUID NOT NULL REFERENCES transport_locations(id) ON DELETE RESTRICT,
    num_brides INTEGER DEFAULT 1 CHECK (num_brides >= 0),
    num_maids INTEGER DEFAULT 0 CHECK (num_maids >= 0),
    num_mothers INTEGER DEFAULT 0 CHECK (num_mothers >= 0),
    num_others INTEGER DEFAULT 0 CHECK (num_others >= 0),
    wedding_theme VARCHAR(255),
    special_requests TEXT,
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    transport_cost DECIMAL(10, 2) NOT NULL CHECK (transport_cost >= 0),
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    deposit_amount DECIMAL(10, 2) CHECK (deposit_amount >= 0),
    deposit_paid BOOLEAN DEFAULT FALSE,
    deposit_paid_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'deposit_paid', 'completed', 'cancelled')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Either user_id or guest info must be provided
    CONSTRAINT bookings_user_or_guest_check CHECK (
        user_id IS NOT NULL OR (guest_email IS NOT NULL AND guest_name IS NOT NULL AND guest_phone IS NOT NULL)
    ),
    -- Deposit amount is 50% of total
    CONSTRAINT bookings_deposit_amount_check CHECK (
        deposit_amount IS NULL OR deposit_amount = ROUND(total_amount * 0.5, 2)
    )
);

-- Indexes
CREATE INDEX idx_bookings_booking_number ON bookings(booking_number);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_guest_email ON bookings(guest_email);
CREATE INDEX idx_bookings_package_id ON bookings(package_id);
CREATE INDEX idx_bookings_location_id ON bookings(location_id);
CREATE INDEX idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX idx_bookings_date_time ON bookings(booking_date, booking_time);

-- Trigger
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 11. calendar_availability

Calendar availability for bookings.

```sql
CREATE TABLE calendar_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    time_slot TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    reason VARCHAR(255), -- e.g., 'Booked', 'Vacation', 'Personal'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(date, time_slot)
);

-- Indexes
CREATE INDEX idx_calendar_availability_date ON calendar_availability(date);
CREATE INDEX idx_calendar_availability_date_time ON calendar_availability(date, time_slot);
CREATE INDEX idx_calendar_availability_is_available ON calendar_availability(is_available) WHERE is_available = FALSE;
```

---

### 12. promo_codes

Discount promo codes.

```sql
CREATE TABLE promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
    min_order_amount DECIMAL(10, 2) CHECK (min_order_amount >= 0),
    max_discount_amount DECIMAL(10, 2) CHECK (max_discount_amount >= 0),
    usage_limit INTEGER CHECK (usage_limit > 0),
    usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT promo_codes_date_range_check CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from),
    CONSTRAINT promo_codes_usage_check CHECK (usage_limit IS NULL OR usage_count <= usage_limit)
);

-- Indexes
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_is_active ON promo_codes(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_promo_codes_valid_dates ON promo_codes(valid_from, valid_until);

-- Trigger
CREATE TRIGGER update_promo_codes_updated_at
    BEFORE UPDATE ON promo_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 13. orders

Customer orders.

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    guest_email VARCHAR(255),
    guest_name VARCHAR(255),
    guest_phone VARCHAR(20),
    delivery_county VARCHAR(100),
    delivery_town VARCHAR(100),
    delivery_address TEXT,
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    discount_amount DECIMAL(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
    promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0 CHECK (delivery_fee >= 0),
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(50),
    payment_confirmed BOOLEAN DEFAULT FALSE,
    payment_confirmed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'payment_confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    tracking_number VARCHAR(100),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Either user_id or guest info must be provided
    CONSTRAINT orders_user_or_guest_check CHECK (
        user_id IS NOT NULL OR (guest_email IS NOT NULL AND guest_name IS NOT NULL AND guest_phone IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_guest_email ON orders(guest_email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_payment_confirmed ON orders(payment_confirmed);

-- Trigger
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 14. order_items

Items in each order (snapshot at time of purchase).

```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    product_title VARCHAR(500) NOT NULL, -- snapshot
    product_sku VARCHAR(100), -- snapshot
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    discount DECIMAL(10, 2) DEFAULT 0 CHECK (discount >= 0),
    total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_created_at ON order_items(created_at);
```

---

### 15. carts

User shopping carts.

```sql
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_carts_user_id ON carts(user_id);

-- Trigger
CREATE TRIGGER update_carts_updated_at
    BEFORE UPDATE ON carts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 16. cart_items

Items in shopping carts.

```sql
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(cart_id, product_id, product_variant_id)
);

-- Indexes
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);

-- Trigger
CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 17. wishlists

User wishlists.

```sql
CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, product_id)
);

-- Indexes
CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX idx_wishlists_product_id ON wishlists(product_id);
```

---

### 18. reviews

Product reviews and ratings.

```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0 CHECK (helpful_count >= 0),
    admin_reply TEXT,
    admin_reply_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- User can only review a product once
    UNIQUE(product_id, user_id)
);

-- Indexes
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_is_approved ON reviews(is_approved) WHERE is_approved = TRUE;
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Trigger
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 19. gallery_posts

Gallery/social media posts.

```sql
CREATE TABLE gallery_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    caption TEXT,
    tags TEXT[],
    source_type VARCHAR(20) CHECK (source_type IN ('instagram', 'tiktok', 'original')),
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_gallery_posts_media_type ON gallery_posts(media_type);
CREATE INDEX idx_gallery_posts_source_type ON gallery_posts(source_type);
CREATE INDEX idx_gallery_posts_is_featured ON gallery_posts(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_gallery_posts_published_at ON gallery_posts(published_at DESC);
CREATE INDEX idx_gallery_posts_tags ON gallery_posts USING GIN(tags);

-- Trigger
CREATE TRIGGER update_gallery_posts_updated_at
    BEFORE UPDATE ON gallery_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 20. testimonials

Customer testimonials.

```sql
CREATE TABLE testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    customer_photo_url VARCHAR(500),
    location VARCHAR(100),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    testimonial_text TEXT NOT NULL,
    related_service_id UUID REFERENCES service_packages(id) ON DELETE SET NULL,
    related_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_testimonials_is_featured ON testimonials(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_testimonials_is_approved ON testimonials(is_approved) WHERE is_approved = TRUE;
CREATE INDEX idx_testimonials_display_order ON testimonials(display_order);
CREATE INDEX idx_testimonials_rating ON testimonials(rating);

-- Trigger
CREATE TRIGGER update_testimonials_updated_at
    BEFORE UPDATE ON testimonials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 21. vision_registrations

2026 vision interest registrations.

```sql
CREATE TABLE vision_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    location VARCHAR(100),
    interested_in_salon BOOLEAN DEFAULT FALSE,
    interested_in_barbershop BOOLEAN DEFAULT FALSE,
    interested_in_spa BOOLEAN DEFAULT FALSE,
    interested_in_mobile_van BOOLEAN DEFAULT FALSE,
    additional_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_vision_registrations_email ON vision_registrations(email);
CREATE INDEX idx_vision_registrations_location ON vision_registrations(location);
CREATE INDEX idx_vision_registrations_created_at ON vision_registrations(created_at DESC);
CREATE INDEX idx_vision_registrations_salon ON vision_registrations(interested_in_salon) WHERE interested_in_salon = TRUE;
CREATE INDEX idx_vision_registrations_barbershop ON vision_registrations(interested_in_barbershop) WHERE interested_in_barbershop = TRUE;
CREATE INDEX idx_vision_registrations_spa ON vision_registrations(interested_in_spa) WHERE interested_in_spa = TRUE;
CREATE INDEX idx_vision_registrations_van ON vision_registrations(interested_in_mobile_van) WHERE interested_in_mobile_van = TRUE;
```

---

### 22. admin_activity_logs

Audit trail for admin actions.

```sql
CREATE TABLE admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_admin_activity_logs_admin_user_id ON admin_activity_logs(admin_user_id);
CREATE INDEX idx_admin_activity_logs_action ON admin_activity_logs(action);
CREATE INDEX idx_admin_activity_logs_entity ON admin_activity_logs(entity_type, entity_id);
CREATE INDEX idx_admin_activity_logs_created_at ON admin_activity_logs(created_at DESC);
CREATE INDEX idx_admin_activity_logs_details ON admin_activity_logs USING GIN(details);
```

---

## Materialized Views

### Product Average Ratings

```sql
CREATE MATERIALIZED VIEW product_avg_ratings AS
SELECT
    product_id,
    COUNT(*) as review_count,
    AVG(rating)::DECIMAL(3,2) as avg_rating,
    COUNT(*) FILTER (WHERE rating = 5) as five_star_count,
    COUNT(*) FILTER (WHERE rating = 4) as four_star_count,
    COUNT(*) FILTER (WHERE rating = 3) as three_star_count,
    COUNT(*) FILTER (WHERE rating = 2) as two_star_count,
    COUNT(*) FILTER (WHERE rating = 1) as one_star_count
FROM reviews
WHERE is_approved = TRUE
GROUP BY product_id;

CREATE UNIQUE INDEX ON product_avg_ratings(product_id);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_product_avg_ratings()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY product_avg_ratings;
END;
$$ LANGUAGE plpgsql;
```

---

## Sequences

### Order Number Sequence

```sql
CREATE SEQUENCE order_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_val INTEGER;
    year VARCHAR(4);
BEGIN
    next_val := nextval('order_number_seq');
    year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    RETURN 'ORD-' || year || '-' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
```

### Booking Number Sequence

```sql
CREATE SEQUENCE booking_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_val INTEGER;
    year VARCHAR(4);
BEGIN
    next_val := nextval('booking_number_seq');
    year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    RETURN 'BK-' || year || '-' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
```

---

## Database Functions

### Calculate Product Final Price

```sql
CREATE OR REPLACE FUNCTION calculate_product_price(
    p_base_price DECIMAL,
    p_discount_type VARCHAR,
    p_discount_value DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
    IF p_discount_type IS NULL THEN
        RETURN p_base_price;
    ELSIF p_discount_type = 'percentage' THEN
        RETURN ROUND(p_base_price * (1 - p_discount_value / 100), 2);
    ELSIF p_discount_type = 'fixed' THEN
        RETURN GREATEST(p_base_price - p_discount_value, 0);
    ELSE
        RETURN p_base_price;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Link Guest Orders to User

```sql
CREATE OR REPLACE FUNCTION link_guest_orders_to_user(
    p_email VARCHAR,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Link orders
    UPDATE orders
    SET user_id = p_user_id,
        guest_email = NULL,
        guest_name = NULL,
        guest_phone = NULL
    WHERE guest_email = p_email
    AND user_id IS NULL;

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    -- Link bookings
    UPDATE bookings
    SET user_id = p_user_id,
        guest_email = NULL,
        guest_name = NULL,
        guest_phone = NULL
    WHERE guest_email = p_email
    AND user_id IS NULL;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
```

---

## Sample Data Population

### Initial Transport Locations

```sql
INSERT INTO transport_locations (location_name, county, transport_cost, is_free) VALUES
('Nairobi', 'Nairobi', 0, TRUE),
('Kitui', 'Kitui', 0, TRUE),
('Mombasa', 'Mombasa', 1000, FALSE),
('Kisumu', 'Kisumu', 1000, FALSE),
('Nakuru', 'Nakuru', 1000, FALSE);
```

### Sample Service Packages

```sql
INSERT INTO service_packages (
    package_type, name, description,
    base_bride_price, base_maid_price, base_mother_price, base_other_price,
    max_maids, min_maids, includes_facial, duration_minutes
) VALUES
(
    'bridal_large', 'Bridal Team (6+ Maids)',
    'Perfect for large bridal parties with 6 or more bridesmaids',
    2500, 1000, 1200, 1000,
    NULL, 6, FALSE, 240
),
(
    'bridal_small', 'Bridal Team (1-5 Maids)',
    'Ideal for intimate bridal parties with up to 5 bridesmaids',
    3000, 1500, 1500, 1200,
    5, 1, FALSE, 180
),
(
    'bride_only', 'Bride Only Package',
    'Exclusive bride makeup including mini facial and skin prep',
    3500, NULL, NULL, NULL,
    0, 0, TRUE, 120
),
(
    'regular', 'Regular Makeup',
    'Professional makeup for any occasion',
    1500, NULL, NULL, NULL,
    NULL, NULL, FALSE, 60
),
(
    'classes', 'Makeup Artistry Class',
    'Learn professional makeup techniques',
    1500, NULL, NULL, NULL,
    NULL, NULL, FALSE, 120
);
```

---

## Performance Considerations

### Recommended Indexes Summary

1. **Frequently Filtered Columns:** `status`, `is_active`, `is_approved`
2. **Foreign Keys:** All FK columns have indexes
3. **Date/Time Columns:** For sorting and range queries
4. **Full-Text Search:** Products table for search functionality
5. **Array Columns:** GIN indexes for tags

### Query Optimization Tips

1. Use materialized views for expensive aggregate queries
2. Implement pagination for large result sets
3. Use partial indexes for filtered queries (e.g., WHERE is_active = TRUE)
4. Monitor slow queries with pg_stat_statements
5. Regularly run ANALYZE to update statistics

---

## Backup & Maintenance

### Recommended Maintenance Schedule

```sql
-- Daily: Update statistics
ANALYZE;

-- Weekly: Clean up dead tuples
VACUUM;

-- Monthly: Full vacuum
VACUUM FULL;

-- As needed: Refresh materialized views
SELECT refresh_product_avg_ratings();
```

### Backup Script

```bash
#!/bin/bash
# Daily backup
pg_dump glam_by_lynn > backup_$(date +%Y%m%d).sql

# Weekly full backup with compression
pg_dump glam_by_lynn | gzip > backup_$(date +%Y%m%d).sql.gz
```

---

## Migration Strategy

All schema changes should be managed via Alembic migrations:

```bash
# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

---

**Last Updated:** 2025-01-16
**Database Version:** PostgreSQL 15+
**Schema Version:** 1.0
