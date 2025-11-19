import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.services.card_service import CardService

# Database connection
DATABASE_URL = "postgresql+asyncpg://outreachpass_admin:Lindy101Prod@outreachpass-prod.cluster-cu1y2a26idsb.us-east-1.rds.amazonaws.com:5432/outreachpass"

async def generate_pass():
    """Generate pass for attendee"""
    attendee_id = uuid.UUID("07e954df-c0d0-400b-a791-bec466c03830")
    
    # Create async engine
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        try:
            print(f"Generating pass for attendee {attendee_id}...")
            result = await CardService.create_card_for_attendee(
                db=db,
                attendee_id=attendee_id
            )
            
            if result:
                print(f"✅ Pass generated successfully!")
                print(f"Card ID: {result.card_id}")
                print(f"QR URL: {result.qr_url}")
                print(f"Wallet Passes: {len(result.wallet_passes)}")
                print(f"\n🎉 Email sent to christopherwlindeman@gmail.com with OutreachPass branding!")
            else:
                print("❌ Failed to generate pass")
                
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(generate_pass())
