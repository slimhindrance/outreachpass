"""Database seeding utilities"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.database import Tenant, Brand, User
import uuid

async def seed_database(session: AsyncSession) -> dict:
    """
    Seed database with initial Base2ML tenant, brands, and admin user.

    Returns:
        Dict with seeding status and created records
    """
    try:
        # Check if already seeded
        result = await session.execute(select(Tenant))
        existing = result.scalar_one_or_none()

        if existing:
            return {
                "status": "skipped",
                "message": "Database already seeded",
                "tenant_count": 1
            }

        # Create Base2ML tenant
        tenant = Tenant(
            name="Base2ML",
            status="active"
        )
        session.add(tenant)
        await session.flush()  # Get the tenant_id

        # Create brands
        brands_data = [
            {
                "brand_key": "OUTREACHPASS",
                "display_name": "OutreachPass",
                "domain": "outreachpass.com",
                "theme_json": {
                    "primary_color": "#4F46E5",
                    "secondary_color": "#06B6D4",
                    "logo_url": ""
                },
                "features_json": {
                    "wallet_passes": True,
                    "qr_codes": True,
                    "exhibitor_leads": True,
                    "analytics": True
                }
            },
            {
                "brand_key": "GOVSAFE",
                "display_name": "GovSafe",
                "domain": "govsafe.com",
                "theme_json": {
                    "primary_color": "#1E40AF",
                    "secondary_color": "#059669",
                    "logo_url": ""
                },
                "features_json": {
                    "wallet_passes": True,
                    "qr_codes": True,
                    "security_enhanced": True
                }
            },
            {
                "brand_key": "CAMPUSCARD",
                "display_name": "CampusCard",
                "domain": "campuscard.com",
                "theme_json": {
                    "primary_color": "#7C3AED",
                    "secondary_color": "#F59E0B",
                    "logo_url": ""
                },
                "features_json": {
                    "wallet_passes": True,
                    "qr_codes": True,
                    "student_features": True
                }
            }
        ]

        brands = []
        for brand_data in brands_data:
            brand = Brand(
                tenant_id=tenant.tenant_id,
                **brand_data
            )
            session.add(brand)
            brands.append(brand)

        await session.flush()

        # Create admin user
        admin_user = User(
            tenant_id=tenant.tenant_id,
            email="admin@base2ml.com",
            full_name="Admin User",
            role="OWNER",
            status="active"
        )
        session.add(admin_user)

        await session.commit()

        return {
            "status": "success",
            "message": "Database seeded successfully",
            "tenant": {
                "id": str(tenant.tenant_id),
                "name": tenant.name
            },
            "brands": [
                {
                    "id": str(b.brand_id),
                    "key": b.brand_key,
                    "name": b.display_name
                } for b in brands
            ],
            "admin_user": {
                "id": str(admin_user.user_id),
                "email": admin_user.email
            }
        }

    except Exception as e:
        await session.rollback()
        return {
            "status": "error",
            "message": f"Seeding failed: {str(e)}"
        }
