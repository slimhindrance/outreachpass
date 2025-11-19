#!/usr/bin/env python3
"""
Generate Test Analytics Data

Creates realistic analytics data for testing the analytics dashboard.
Generates events across all analytics tables with realistic distributions.
"""
import asyncio
import sys
import os
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
import uuid

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func

from app.models.database import (
    EmailEvent, WalletPassEvent, CardViewEvent, ContactExportEvent,
    Tenant, Event, Card, Attendee
)
from app.core.config import settings


class AnalyticsDataGenerator:
    """Generate realistic analytics test data"""

    # Data distribution profiles
    EMAIL_EVENTS = ["sent", "delivered", "opened", "clicked", "bounced", "complained"]
    EMAIL_WEIGHTS = [100, 95, 40, 15, 3, 1]  # Realistic email funnel

    WALLET_PLATFORMS = ["apple", "google"]
    WALLET_EVENTS = ["generated", "email_clicked", "added_to_wallet", "removed", "updated"]
    WALLET_WEIGHTS = [100, 60, 30, 5, 10]

    CARD_SOURCES = ["qr_scan", "direct_link", "email_link", "share"]
    CARD_SOURCE_WEIGHTS = [40, 30, 20, 10]

    EXPORT_TYPES = ["vcard_download", "add_to_contacts", "copy_email", "copy_phone"]
    EXPORT_WEIGHTS = [60, 20, 10, 10]

    DEVICE_TYPES = ["mobile", "tablet", "desktop"]
    DEVICE_WEIGHTS = [60, 15, 25]

    BROWSERS = ["Chrome", "Safari", "Firefox", "Edge", "Mobile Safari"]
    OS_OPTIONS = ["iOS", "Android", "Windows", "macOS", "Linux"]

    def __init__(self, session: AsyncSession):
        self.session = session
        self.tenant_id: uuid.UUID = None
        self.event_ids: List[uuid.UUID] = []
        self.card_ids: List[uuid.UUID] = []
        self.attendee_ids: List[uuid.UUID] = []

    async def initialize(self):
        """Get or create test entities"""
        print("🔍 Finding test entities...")

        # Get first tenant (assumes seeded database)
        result = await self.session.execute(select(Tenant).limit(1))
        tenant = result.scalar_one_or_none()

        if not tenant:
            print("❌ No tenant found. Please seed the database first.")
            sys.exit(1)

        self.tenant_id = tenant.tenant_id
        print(f"✅ Using tenant: {tenant.name} ({self.tenant_id})")

        # Get events
        result = await self.session.execute(
            select(Event.event_id).where(Event.tenant_id == self.tenant_id)
        )
        self.event_ids = [row[0] for row in result.fetchall()]

        # Get cards
        result = await self.session.execute(
            select(Card.card_id).where(Card.tenant_id == self.tenant_id).limit(50)
        )
        self.card_ids = [row[0] for row in result.fetchall()]

        # Get attendees
        result = await self.session.execute(
            select(Attendee.attendee_id).where(Attendee.tenant_id == self.tenant_id).limit(50)
        )
        self.attendee_ids = [row[0] for row in result.fetchall()]

        print(f"📊 Found: {len(self.event_ids)} events, {len(self.card_ids)} cards, {len(self.attendee_ids)} attendees")

        if not self.card_ids:
            print("⚠️  No cards found. Some analytics will be limited.")

    def random_timestamp(self, days_back: int = 30) -> datetime:
        """Generate random timestamp within last N days"""
        now = datetime.utcnow()
        delta = timedelta(days=random.uniform(0, days_back))
        return now - delta

    def random_ip(self) -> str:
        """Generate random IP address"""
        return f"{random.randint(1, 255)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 255)}"

    def random_user_agent(self) -> str:
        """Generate random user agent string"""
        browser = random.choice(self.BROWSERS)
        os = random.choice(self.OS_OPTIONS)
        return f"Mozilla/5.0 ({os}) {browser}/{random.randint(90, 120)}.0"

    async def generate_email_events(self, count: int = 1000):
        """Generate email engagement events"""
        print(f"\n📧 Generating {count} email events...")
        events = []

        for i in range(count):
            event_type = random.choices(self.EMAIL_EVENTS, weights=self.EMAIL_WEIGHTS)[0]
            card_id = random.choice(self.card_ids) if self.card_ids else None
            event_id = random.choice(self.event_ids) if self.event_ids else None
            attendee_id = random.choice(self.attendee_ids) if self.attendee_ids else None

            event = EmailEvent(
                tenant_id=self.tenant_id,
                event_id=event_id,
                card_id=card_id,
                attendee_id=attendee_id,
                message_id=f"msg-{uuid.uuid4()}",
                recipient_email=f"user{random.randint(1, 500)}@example.com",
                event_type=event_type,
                link_url=f"https://example.com/card/{uuid.uuid4()}" if event_type == "clicked" else None,
                user_agent=self.random_user_agent() if event_type in ["opened", "clicked"] else None,
                ip_address=self.random_ip() if event_type in ["opened", "clicked"] else None,
                occurred_at=self.random_timestamp(30),
                metadata_json={}
            )
            events.append(event)

            if (i + 1) % 100 == 0:
                self.session.add_all(events)
                await self.session.commit()
                events = []
                print(f"  ✓ {i + 1}/{count} email events")

        if events:
            self.session.add_all(events)
            await self.session.commit()

        print(f"✅ Generated {count} email events")

    async def generate_card_view_events(self, count: int = 2000):
        """Generate card view events"""
        print(f"\n👁️  Generating {count} card view events...")

        if not self.card_ids:
            print("⚠️  Skipping - no cards available")
            return

        events = []

        for i in range(count):
            source_type = random.choices(self.CARD_SOURCES, weights=self.CARD_SOURCE_WEIGHTS)[0]
            device_type = random.choices(self.DEVICE_TYPES, weights=self.DEVICE_WEIGHTS)[0]

            event = CardViewEvent(
                tenant_id=self.tenant_id,
                event_id=random.choice(self.event_ids) if self.event_ids else None,
                card_id=random.choice(self.card_ids),
                source_type=source_type,
                referrer_url=f"https://referrer.com/{random.choice(['email', 'social', 'search', 'direct'])}" if random.random() > 0.3 else None,
                user_agent=self.random_user_agent(),
                ip_address=self.random_ip(),
                device_type=device_type,
                browser=random.choice(self.BROWSERS),
                os=random.choice(self.OS_OPTIONS),
                session_id=f"session-{uuid.uuid4()}",
                occurred_at=self.random_timestamp(30),
                metadata_json={}
            )
            events.append(event)

            if (i + 1) % 100 == 0:
                self.session.add_all(events)
                await self.session.commit()
                events = []
                print(f"  ✓ {i + 1}/{count} card view events")

        if events:
            self.session.add_all(events)
            await self.session.commit()

        print(f"✅ Generated {count} card view events")

    async def generate_wallet_pass_events(self, count: int = 500):
        """Generate wallet pass events"""
        print(f"\n💳 Generating {count} wallet pass events...")

        if not self.card_ids:
            print("⚠️  Skipping - no cards available")
            return

        events = []

        for i in range(count):
            platform = random.choice(self.WALLET_PLATFORMS)
            event_type = random.choices(self.WALLET_EVENTS, weights=self.WALLET_WEIGHTS)[0]
            device_type = random.choices(self.DEVICE_TYPES, weights=self.DEVICE_WEIGHTS)[0]

            event = WalletPassEvent(
                tenant_id=self.tenant_id,
                event_id=random.choice(self.event_ids) if self.event_ids else None,
                card_id=random.choice(self.card_ids),
                platform=platform,
                event_type=event_type,
                user_agent=self.random_user_agent(),
                ip_address=self.random_ip(),
                device_type=device_type,
                occurred_at=self.random_timestamp(30),
                metadata_json={}
            )
            events.append(event)

            if (i + 1) % 100 == 0:
                self.session.add_all(events)
                await self.session.commit()
                events = []
                print(f"  ✓ {i + 1}/{count} wallet pass events")

        if events:
            self.session.add_all(events)
            await self.session.commit()

        print(f"✅ Generated {count} wallet pass events")

    async def generate_contact_export_events(self, count: int = 800):
        """Generate contact export events"""
        print(f"\n📥 Generating {count} contact export events...")

        if not self.card_ids:
            print("⚠️  Skipping - no cards available")
            return

        events = []

        for i in range(count):
            export_type = random.choices(self.EXPORT_TYPES, weights=self.EXPORT_WEIGHTS)[0]
            device_type = random.choices(self.DEVICE_TYPES, weights=self.DEVICE_WEIGHTS)[0]

            event = ContactExportEvent(
                tenant_id=self.tenant_id,
                event_id=random.choice(self.event_ids) if self.event_ids else None,
                card_id=random.choice(self.card_ids),
                export_type=export_type,
                user_agent=self.random_user_agent(),
                ip_address=self.random_ip(),
                device_type=device_type,
                occurred_at=self.random_timestamp(30),
                metadata_json={}
            )
            events.append(event)

            if (i + 1) % 100 == 0:
                self.session.add_all(events)
                await self.session.commit()
                events = []
                print(f"  ✓ {i + 1}/{count} contact export events")

        if events:
            self.session.add_all(events)
            await self.session.commit()

        print(f"✅ Generated {count} contact export events")

    async def print_summary(self):
        """Print summary of generated data"""
        print("\n" + "="*70)
        print("📊 ANALYTICS DATA GENERATION SUMMARY")
        print("="*70)

        # Count email events
        result = await self.session.execute(
            select(func.count(EmailEvent.email_event_id))
            .where(EmailEvent.tenant_id == self.tenant_id)
        )
        email_count = result.scalar()

        # Count card views
        result = await self.session.execute(
            select(func.count(CardViewEvent.view_event_id))
            .where(CardViewEvent.tenant_id == self.tenant_id)
        )
        card_view_count = result.scalar()

        # Count wallet passes
        result = await self.session.execute(
            select(func.count(WalletPassEvent.wallet_event_id))
            .where(WalletPassEvent.tenant_id == self.tenant_id)
        )
        wallet_count = result.scalar()

        # Count contact exports
        result = await self.session.execute(
            select(func.count(ContactExportEvent.export_event_id))
            .where(ContactExportEvent.tenant_id == self.tenant_id)
        )
        export_count = result.scalar()

        print(f"\n📧 Email Events:        {email_count:,}")
        print(f"👁️  Card View Events:    {card_view_count:,}")
        print(f"💳 Wallet Pass Events:  {wallet_count:,}")
        print(f"📥 Contact Exports:     {export_count:,}")
        print(f"\n🎯 Total Events:        {email_count + card_view_count + wallet_count + export_count:,}")
        print("\n" + "="*70)


async def main():
    """Main execution"""
    print("🚀 Analytics Test Data Generator")
    print("="*70)

    # Create async engine
    engine = create_async_engine(
        settings.DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://'),
        echo=False
    )

    # Create session
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        generator = AnalyticsDataGenerator(session)

        try:
            # Initialize
            await generator.initialize()

            # Generate all analytics data
            await generator.generate_email_events(1000)
            await generator.generate_card_view_events(2000)
            await generator.generate_wallet_pass_events(500)
            await generator.generate_contact_export_events(800)

            # Print summary
            await generator.print_summary()

            print("\n✨ Test data generation complete!")
            print("🌐 You can now test the analytics dashboard at:")
            print("   http://localhost:3000/admin/analytics")

        except Exception as e:
            print(f"\n❌ Error generating test data: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
