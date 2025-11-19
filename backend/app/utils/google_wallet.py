"""
Google Wallet Pass Generation

This module handles the creation of Google Wallet passes for event attendees.
Google Wallet uses a REST API and JWT-based pass links rather than downloadable files.

Key concepts:
- Pass Class: Template defining the pass structure (created once per event type)
- Pass Object: Individual pass instance for each attendee
- Save Link: JWT-signed URL that users click to add the pass to Google Wallet
"""
import logging
import json
import uuid
import time
from typing import Optional, Dict, Any
from datetime import datetime
from google.auth import jwt, crypt
from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account

logger = logging.getLogger(__name__)

# Google Wallet API base URL
WALLET_API_BASE = "https://walletobjects.googleapis.com/walletobjects/v1"


class GoogleWalletPassGenerator:
    """Generate Google Wallet passes using the Google Wallet API"""

    def __init__(
        self,
        issuer_id: str,
        service_account_email: str,
        service_account_file: Optional[str] = None,
        origins: Optional[list[str]] = None
    ):
        """
        Initialize Google Wallet pass generator

        Args:
            issuer_id: Google Cloud Project numeric ID (Issuer ID)
            service_account_email: Service account email address
            service_account_file: Path to service account JSON key file
            origins: List of authorized origins for the Save button
        """
        self.issuer_id = issuer_id
        self.service_account_email = service_account_email
        self.service_account_file = service_account_file
        self.origins = origins or []

        # Initialize credentials if service account file is provided
        self.credentials = None
        self.http_client = None
        if service_account_file:
            try:
                self.credentials = service_account.Credentials.from_service_account_file(
                    service_account_file,
                    scopes=['https://www.googleapis.com/auth/wallet_object.issuer']
                )
                self.http_client = AuthorizedSession(self.credentials)
            except Exception as e:
                logger.warning(f"Failed to initialize Google Wallet credentials: {str(e)}")

    def create_event_pass_class(
        self,
        class_id: str,
        event_name: str,
        organization_name: str = "OutreachPass"
    ) -> Optional[str]:
        """
        Create a pass class for event tickets (template for all passes of this event)

        Args:
            class_id: Unique identifier for this pass class
            event_name: Name of the event
            organization_name: Organization issuing the passes

        Returns:
            Full class ID string or None if creation failed
        """
        try:
            full_class_id = f"{self.issuer_id}.{class_id}"

            class_resource = {
                "id": full_class_id,
                "eventId": class_id,  # Required field - must be ≤64 chars (use class_id without issuer prefix)
                "issuerName": organization_name,
                "eventName": {
                    "defaultValue": {
                        "language": "en-US",
                        "value": event_name
                    }
                },
                "reviewStatus": "UNDER_REVIEW",  # Will auto-transition to APPROVED for approved issuer accounts
                "textModulesData": [
                    {
                        "id": "contact_card_info",
                        "header": "Digital Contact Card",
                        "body": "Scan the QR code or tap to view contact information"
                    }
                ]
            }

            if not self.http_client:
                logger.warning("No HTTP client - skipping pass class creation")
                return full_class_id

            # Try to create the class
            response = self.http_client.post(
                f"{WALLET_API_BASE}/eventTicketClass",
                json=class_resource
            )

            if response.status_code == 200:
                logger.info(f"Created event pass class: {full_class_id}")
                return full_class_id
            elif response.status_code == 409:
                # Class already exists
                logger.info(f"Event pass class already exists: {full_class_id}")
                return full_class_id
            else:
                logger.error(f"Failed to create pass class: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error creating Google Wallet pass class: {str(e)}", exc_info=True)
            return None

    def create_event_pass_object(
        self,
        class_id: str,
        object_id: str,
        attendee_name: str,
        event_name: str,
        event_date: datetime,
        qr_code_url: str,
        additional_fields: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Create a pass object for a specific attendee

        Args:
            class_id: Pass class ID (template ID)
            object_id: Unique identifier for this pass object (e.g., card_id)
            attendee_name: Name to display on pass
            event_name: Event name
            event_date: Event start date/time
            qr_code_url: URL for QR code/barcode
            additional_fields: Additional info to display (organization, title, etc.)

        Returns:
            Full object ID string or None if creation failed
        """
        try:
            full_class_id = f"{self.issuer_id}.{class_id}"
            full_object_id = f"{self.issuer_id}.{object_id}"

            # Build the pass object
            object_resource = {
                "id": full_object_id,
                "classId": full_class_id,
                "state": "active",  # Google Wallet API returns lowercase
                "ticketHolderName": attendee_name,
                "eventName": {
                    "defaultValue": {
                        "language": "en-US",
                        "value": event_name
                    }
                },
                "barcode": {
                    "type": "QR_CODE",
                    "value": qr_code_url,
                    "alternateText": attendee_name
                },
                "textModulesData": []
            }

            # Add event date/time if provided
            if event_date:
                object_resource["eventDateTime"] = {
                    "start": event_date.isoformat(),
                }

            # Add additional fields as text modules
            if additional_fields:
                for key, value in additional_fields.items():
                    if isinstance(value, dict):
                        object_resource["textModulesData"].append({
                            "id": key,
                            "header": value.get("label", key.upper()),
                            "body": value.get("value", "")
                        })
                    else:
                        object_resource["textModulesData"].append({
                            "id": key,
                            "header": key.upper().replace("_", " "),
                            "body": str(value)
                        })

            if not self.http_client:
                logger.warning("No HTTP client - returning object ID without creating")
                return full_object_id

            # Try to create the object
            response = self.http_client.post(
                f"{WALLET_API_BASE}/eventTicketObject",
                json=object_resource
            )

            if response.status_code == 200:
                response_data = response.json() if response.text else {}
                logger.info(f"Created event pass object: {full_object_id}")
                logger.info(f"Google API response: {response_data}")
                # Check if object state is active (Google API returns lowercase)
                state = response_data.get('state', 'UNKNOWN')
                if state != 'active':
                    logger.warning(f"Pass object state is {state}, not active. This may prevent users from adding it.")
                return full_object_id
            elif response.status_code == 409:
                # Object already exists - update it
                logger.info(f"Event pass object already exists, updating: {full_object_id}")
                response = self.http_client.put(
                    f"{WALLET_API_BASE}/eventTicketObject/{full_object_id}",
                    json=object_resource
                )
                if response.status_code == 200:
                    response_data = response.json() if response.text else {}
                    logger.info(f"Updated pass object. State: {response_data.get('state', 'UNKNOWN')}")
                    return full_object_id
                else:
                    logger.error(f"Failed to update pass object: {response.status_code} - {response.text}")
                    return None
            else:
                logger.error(f"Failed to create pass object: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error creating Google Wallet pass object: {str(e)}", exc_info=True)
            return None

    def generate_save_url(
        self,
        class_id: str,
        object_id: str
    ) -> str:
        """
        Generate a "Save to Google Wallet" JWT-signed link for a pre-created pass object

        Google Wallet requires ALL save URLs to use signed JWT tokens, even when
        referencing pre-created objects. The JWT contains a reference to the object
        ID, and Google validates the signature before allowing the user to save.

        For pre-created objects, the JWT payload is minimal - just a reference to
        the object ID. This keeps the token small while maintaining security.

        CRITICAL: Do NOT include 'origins' field for email-based links - it will
        cause validation errors.

        Args:
            class_id: Pass class ID
            object_id: Pass object ID

        Returns:
            JWT-signed URL that users can click to add the pass to Google Wallet
        """
        try:
            full_object_id = f"{self.issuer_id}.{object_id}"

            # Create JWT payload with reference to pre-created object
            current_time = int(time.time())
            payload = {
                "iss": self.service_account_email,
                "aud": "google",
                "typ": "savetowallet",
                "iat": current_time,
                "exp": current_time + 3600,  # Token valid for 1 hour
                # Reference the pre-created pass object
                "payload": {
                    "eventTicketObjects": [
                        {
                            "id": full_object_id
                        }
                    ]
                }
            }
            # IMPORTANT: Do NOT include 'origins' field for email-based links

            # Sign the JWT with service account credentials
            if not self.credentials:
                logger.error("No credentials available for JWT signing")
                return f"https://pay.google.com/gp/v/save/{full_object_id}"

            signer = crypt.RSASigner.from_service_account_file(self.service_account_file)
            token = jwt.encode(signer, payload)

            # Decode bytes to string if needed
            if isinstance(token, bytes):
                token = token.decode('utf-8')

            save_url = f"https://pay.google.com/gp/v/save/{token}"
            logger.info(f"Generated JWT-signed Google Wallet save URL for object {full_object_id}")
            logger.info(f"JWT token length: {len(token)} characters")

            return save_url

        except Exception as e:
            logger.error(f"Error generating Google Wallet save URL: {str(e)}", exc_info=True)
            # Fallback to direct object ID URL (will likely fail, but provides debugging info)
            return f"https://pay.google.com/gp/v/save/{self.issuer_id}.{object_id}"


# Global instance (will be configured from settings)
google_wallet_generator: Optional[GoogleWalletPassGenerator] = None


def initialize_google_wallet(
    issuer_id: str,
    service_account_email: str,
    service_account_file: Optional[str] = None,
    origins: Optional[list[str]] = None
):
    """Initialize the global Google Wallet generator"""
    global google_wallet_generator
    google_wallet_generator = GoogleWalletPassGenerator(
        issuer_id=issuer_id,
        service_account_email=service_account_email,
        service_account_file=service_account_file,
        origins=origins
    )


def get_google_wallet_generator() -> Optional[GoogleWalletPassGenerator]:
    """Get the global Google Wallet generator instance"""
    return google_wallet_generator
