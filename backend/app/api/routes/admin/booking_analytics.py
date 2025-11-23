"""
Admin booking location analytics endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_admin_user
from app.models.user import User
from app.models.booking import Booking
from app.models.service import TransportLocation


router = APIRouter(prefix="/admin/bookings/analytics", tags=["admin", "booking-analytics"])


class LocationDistribution(BaseModel):
    """Location distribution data"""
    location_name: str
    location_type: str  # "predefined" or "custom"
    booking_count: int
    total_revenue: float
    avg_distance_km: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class LocationAnalyticsResponse(BaseModel):
    """Response for location analytics"""
    total_bookings: int
    predefined_locations: List[LocationDistribution]
    custom_locations: List[LocationDistribution]
    distance_ranges: dict


@router.get("/locations", response_model=LocationAnalyticsResponse)
async def get_location_analytics(
    status: Optional[str] = Query(None, description="Filter by booking status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get booking location distribution and analytics.

    Helps admin understand:
    - Where bookings are coming from
    - Which areas are most popular
    - Distance patterns from Nairobi
    - Revenue by location
    """

    # Base query
    query = db.query(Booking)

    # Apply status filter
    if status:
        query = query.filter(Booking.status == status)

    all_bookings = query.all()
    total_bookings = len(all_bookings)

    # Analyze predefined locations
    predefined_query = (
        db.query(
            TransportLocation.name,
            func.count(Booking.id).label("booking_count"),
            func.sum(Booking.total_amount).label("total_revenue"),
            func.avg(TransportLocation.distance_km).label("avg_distance"),
            TransportLocation.latitude,
            TransportLocation.longitude,
        )
        .join(Booking, Booking.location_id == TransportLocation.id)
        .filter(Booking.location_id.isnot(None))
    )

    if status:
        predefined_query = predefined_query.filter(Booking.status == status)

    predefined_results = predefined_query.group_by(
        TransportLocation.id,
        TransportLocation.name,
        TransportLocation.distance_km,
        TransportLocation.latitude,
        TransportLocation.longitude,
    ).all()

    predefined_locations = [
        LocationDistribution(
            location_name=row.name,
            location_type="predefined",
            booking_count=row.booking_count,
            total_revenue=float(row.total_revenue or 0),
            avg_distance_km=float(row.avg_distance or 0),
            latitude=row.latitude,
            longitude=row.longitude,
        )
        for row in predefined_results
    ]

    # Analyze custom locations (group by general area/city extracted from address)
    custom_bookings = [b for b in all_bookings if b.custom_location_address]

    # Group custom locations by city/area (extract first part of address)
    custom_location_groups = {}
    for booking in custom_bookings:
        # Extract city name (usually after first comma or the whole address)
        address_parts = booking.custom_location_address.split(",")
        city_name = address_parts[1].strip() if len(address_parts) > 1 else address_parts[0].strip()

        if city_name not in custom_location_groups:
            custom_location_groups[city_name] = {
                "bookings": [],
                "total_revenue": 0,
                "latitudes": [],
                "longitudes": [],
                "distances": [],
            }

        custom_location_groups[city_name]["bookings"].append(booking)
        custom_location_groups[city_name]["total_revenue"] += float(booking.total_amount)
        custom_location_groups[city_name]["latitudes"].append(booking.custom_location_latitude)
        custom_location_groups[city_name]["longitudes"].append(booking.custom_location_longitude)
        custom_location_groups[city_name]["distances"].append(booking.custom_location_distance_km)

    custom_locations = [
        LocationDistribution(
            location_name=city_name,
            location_type="custom",
            booking_count=len(data["bookings"]),
            total_revenue=data["total_revenue"],
            avg_distance_km=sum(data["distances"]) / len(data["distances"]) if data["distances"] else None,
            latitude=sum(data["latitudes"]) / len(data["latitudes"]) if data["latitudes"] else None,
            longitude=sum(data["longitudes"]) / len(data["longitudes"]) if data["longitudes"] else None,
        )
        for city_name, data in custom_location_groups.items()
    ]

    # Distance range analysis
    all_distances = []
    for booking in all_bookings:
        if booking.custom_location_distance_km:
            all_distances.append(booking.custom_location_distance_km)
        elif booking.location and hasattr(booking.location, 'distance_km'):
            all_distances.append(booking.location.distance_km)

    distance_ranges = {
        "0-20km": len([d for d in all_distances if d <= 20]),
        "20-50km": len([d for d in all_distances if 20 < d <= 50]),
        "50-150km": len([d for d in all_distances if 50 < d <= 150]),
        "150km+": len([d for d in all_distances if d > 150]),
    }

    return LocationAnalyticsResponse(
        total_bookings=total_bookings,
        predefined_locations=predefined_locations,
        custom_locations=custom_locations,
        distance_ranges=distance_ranges,
    )


class PopularLocation(BaseModel):
    """Popular location data"""
    name: str
    count: int
    percentage: float


@router.get("/popular-locations", response_model=List[PopularLocation])
async def get_popular_locations(
    limit: int = Query(10, ge=1, le=50, description="Number of locations to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get most popular booking locations.
    Useful for planning physical locations or targeting marketing.
    """

    # Get total bookings
    total_bookings = db.query(func.count(Booking.id)).scalar()

    if total_bookings == 0:
        return []

    # Combine predefined and custom locations
    all_locations = []

    # Predefined locations
    predefined = (
        db.query(
            TransportLocation.name,
            func.count(Booking.id).label("count")
        )
        .join(Booking, Booking.location_id == TransportLocation.id)
        .group_by(TransportLocation.name)
        .all()
    )

    all_locations.extend([{"name": row.name, "count": row.count} for row in predefined])

    # Custom locations (grouped by city)
    custom_bookings = db.query(Booking).filter(
        Booking.custom_location_address.isnot(None)
    ).all()

    custom_location_counts = {}
    for booking in custom_bookings:
        address_parts = booking.custom_location_address.split(",")
        city_name = address_parts[1].strip() if len(address_parts) > 1 else address_parts[0].strip()
        custom_location_counts[city_name] = custom_location_counts.get(city_name, 0) + 1

    all_locations.extend([{"name": name, "count": count} for name, count in custom_location_counts.items()])

    # Sort by count and limit
    sorted_locations = sorted(all_locations, key=lambda x: x["count"], reverse=True)[:limit]

    return [
        PopularLocation(
            name=loc["name"],
            count=loc["count"],
            percentage=round((loc["count"] / total_bookings) * 100, 2)
        )
        for loc in sorted_locations
    ]
