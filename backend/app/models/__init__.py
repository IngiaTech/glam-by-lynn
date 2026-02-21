"""Database models for Glam by Lynn application."""
# Import all models to make them available for Alembic migrations
from app.models.user import User
from app.models.product import (
    Brand,
    Category,
    Product,
    ProductImage,
    ProductVideo,
    ProductVariant,
)
from app.models.service import (
    ServicePackage,
    TransportLocation,
    CalendarAvailability,
)
from app.models.booking import Booking
from app.models.order import (
    PromoCode,
    Order,
    OrderItem,
    Cart,
    CartItem,
    Wishlist,
)
from app.models.content import (
    Review,
    GalleryPost,
    Testimonial,
    VisionRegistration,
    AdminActivityLog,
)
from app.models.makeup_class import (
    MakeupClass,
    ClassEnrollment,
)
from app.models.site_setting import SiteSetting

__all__ = [
    # User
    "User",
    # Products
    "Brand",
    "Category",
    "Product",
    "ProductImage",
    "ProductVideo",
    "ProductVariant",
    # Services
    "ServicePackage",
    "TransportLocation",
    "CalendarAvailability",
    # Bookings
    "Booking",
    # Orders
    "PromoCode",
    "Order",
    "OrderItem",
    "Cart",
    "CartItem",
    "Wishlist",
    # Content
    "Review",
    "GalleryPost",
    "Testimonial",
    "VisionRegistration",
    "AdminActivityLog",
    # Makeup Classes
    "MakeupClass",
    "ClassEnrollment",
    # Site Settings
    "SiteSetting",
]
