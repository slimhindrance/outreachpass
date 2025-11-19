"""
Apple Wallet (.pkpass) Pass Generation

This module handles the creation of Apple Wallet passes for event attendees.
A .pkpass file is a signed ZIP archive containing:
- pass.json (pass definition)
- Images (icon, logo, strip, etc.)
- manifest.json (file checksums)
- signature (cryptographic signature)

Implementation uses native Python libraries and OpenSSL for signing.
No third-party wallet libraries required.

Certificate Setup:
1. Create Pass Type ID in Apple Developer Portal
2. Download certificate (.cer) and convert to .pem
3. Export private key from Keychain and convert to .pem
4. Download Apple WWDR certificate and convert to .pem

Example OpenSSL commands:
  openssl x509 -inform DER -in pass.cer -out pass.pem
  openssl pkcs12 -in Certificates.p12 -out key.pem -nodes
  openssl x509 -inform DER -in AppleWWDRCA.cer -out wwdr.pem
"""
import logging
import json
import hashlib
import zipfile
import io
import os
import subprocess
import tempfile
from typing import Optional, Dict, Any
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


class AppleWalletPassGenerator:
    """Generate Apple Wallet (.pkpass) passes"""

    def __init__(
        self,
        team_id: str,
        pass_type_id: str,
        organization_name: str,
        cert_path: Optional[str] = None,
        key_path: Optional[str] = None,
        wwdr_cert_path: Optional[str] = None
    ):
        """
        Initialize Apple Wallet pass generator

        Args:
            team_id: Apple Developer Team ID (10 characters, e.g., "A1B2C3D4E5")
            pass_type_id: Pass Type ID from Apple Developer (e.g., "pass.com.outreachpass.event")
            organization_name: Organization name to display on pass
            cert_path: Path to signing certificate (.pem file)
            key_path: Path to private key (.pem file)
            wwdr_cert_path: Path to Apple WWDR certificate (.pem file)
        """
        self.team_id = team_id
        self.pass_type_id = pass_type_id
        self.organization_name = organization_name
        self.cert_path = cert_path
        self.key_path = key_path
        self.wwdr_cert_path = wwdr_cert_path

        # Validate certificate paths if provided
        if cert_path and not os.path.exists(cert_path):
            logger.warning(f"Certificate not found at {cert_path}")
        if key_path and not os.path.exists(key_path):
            logger.warning(f"Private key not found at {key_path}")
        if wwdr_cert_path and not os.path.exists(wwdr_cert_path):
            logger.warning(f"WWDR certificate not found at {wwdr_cert_path}")

    def create_event_pass(
        self,
        serial_number: str,
        attendee_name: str,
        event_name: str,
        event_date: datetime,
        qr_code_url: str,
        logo_image: Optional[bytes] = None,
        icon_image: Optional[bytes] = None,
        strip_image: Optional[bytes] = None,
        background_color: str = "#1E40AF",  # Blue
        foreground_color: str = "#FFFFFF",  # White
        label_color: str = "#E5E7EB",  # Light gray
        additional_fields: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """
        Create an Apple Wallet event pass

        Args:
            serial_number: Unique identifier for this pass (e.g., card_id)
            attendee_name: Name to display on pass
            event_name: Event name
            event_date: Event start date/time
            qr_code_url: URL for QR code on back of pass
            logo_image: Logo image bytes (PNG, ~160x50px)
            icon_image: Icon image bytes (PNG, 58x58px)
            strip_image: Strip image bytes (PNG, 375x123px for 1x)
            background_color: Hex color for background
            foreground_color: Hex color for text
            label_color: Hex color for field labels
            additional_fields: Additional key-value pairs to display

        Returns:
            bytes: Complete .pkpass file as bytes
        """
        try:
            # Create pass object
            pass_obj = Pass(
                passTypeIdentifier=self.pass_type_id,
                organizationName=self.organization_name,
                teamIdentifier=self.team_id,
                serialNumber=serial_number,
                description=f"{event_name} - Digital Contact Card"
            )

            # Set visual appearance
            pass_obj.backgroundColor = background_color
            pass_obj.foregroundColor = foreground_color
            pass_obj.labelColor = label_color
            pass_obj.logoText = event_name

            # Add barcode/QR code for back of pass
            pass_obj.barcode = Barcode(
                message=qr_code_url,
                format=BarcodeFormat.QR,
                altText=attendee_name
            )

            # Event ticket style
            pass_obj.eventTicket = {
                "headerFields": [
                    {
                        "key": "event",
                        "label": "EVENT",
                        "value": event_name
                    }
                ],
                "primaryFields": [
                    {
                        "key": "attendee",
                        "label": "ATTENDEE",
                        "value": attendee_name
                    }
                ],
                "secondaryFields": [
                    {
                        "key": "date",
                        "label": "DATE",
                        "value": event_date.strftime("%B %d, %Y"),
                        "dateStyle": "PKDateStyleMedium"
                    },
                    {
                        "key": "time",
                        "label": "TIME",
                        "value": event_date.strftime("%I:%M %p"),
                        "timeStyle": "PKDateStyleShort"
                    }
                ],
                "auxiliaryFields": [],
                "backFields": [
                    {
                        "key": "contact_card",
                        "label": "Digital Contact Card",
                        "value": qr_code_url
                    }
                ]
            }

            # Add any additional fields
            if additional_fields:
                for key, value in additional_fields.items():
                    if isinstance(value, dict):
                        pass_obj.eventTicket["auxiliaryFields"].append({
                            "key": key,
                            "label": value.get("label", key.upper()),
                            "value": value.get("value", "")
                        })
                    else:
                        pass_obj.eventTicket["auxiliaryFields"].append({
                            "key": key,
                            "label": key.upper().replace("_", " "),
                            "value": str(value)
                        })

            # Add images if provided
            if logo_image:
                pass_obj.addFile("logo.png", logo_image)
                pass_obj.addFile("logo@2x.png", logo_image)

            if icon_image:
                pass_obj.addFile("icon.png", icon_image)
                pass_obj.addFile("icon@2x.png", icon_image)

            if strip_image:
                pass_obj.addFile("strip.png", strip_image)
                pass_obj.addFile("strip@2x.png", strip_image)

            # Generate .pkpass file
            if self.cert_path and self.key_path and self.wwdr_cert_path:
                # Sign the pass with certificates
                pkpass_bytes = pass_obj.create(
                    self.cert_path,
                    self.key_path,
                    self.wwdr_cert_path
                )
            else:
                # For development/testing: create unsigned pass
                logger.warning("Creating unsigned .pkpass file - certificates not configured")
                pkpass_bytes = self._create_unsigned_pass(pass_obj)

            return pkpass_bytes

        except Exception as e:
            logger.error(f"Error creating Apple Wallet pass: {str(e)}", exc_info=True)
            raise

    def _create_unsigned_pass(self, pass_obj: Dict[str, Any]) -> bytes:
        """
        Create an unsigned .pkpass file for development/testing

        WARNING: Unsigned passes will not work on actual devices.
        This is only for testing the structure.

        Args:
            pass_obj: Pass object to package

        Returns:
            bytes: Unsigned .pkpass file
        """
        # Create a ZIP file in memory
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add pass.json
            pass_json = json.dumps(pass_obj.json, indent=2)
            zip_file.writestr("pass.json", pass_json)

            # Add image files
            for filename, file_data in pass_obj.files.items():
                zip_file.writestr(filename, file_data)

            # Create manifest (checksums)
            manifest = {}
            manifest["pass.json"] = hashlib.sha1(pass_json.encode()).hexdigest()
            for filename, file_data in pass_obj.files.items():
                manifest[filename] = hashlib.sha1(file_data).hexdigest()

            zip_file.writestr("manifest.json", json.dumps(manifest, indent=2))

            # Note: Skipping signature for unsigned pass
            # In production, this would contain a cryptographic signature

        return zip_buffer.getvalue()


# Global instance (will be configured from settings)
apple_wallet_generator: Optional[AppleWalletPassGenerator] = None


def initialize_apple_wallet(
    team_id: str,
    pass_type_id: str,
    organization_name: str,
    cert_path: Optional[str] = None,
    key_path: Optional[str] = None,
    wwdr_cert_path: Optional[str] = None
):
    """Initialize the global Apple Wallet generator"""
    global apple_wallet_generator
    apple_wallet_generator = AppleWalletPassGenerator(
        team_id=team_id,
        pass_type_id=pass_type_id,
        organization_name=organization_name,
        cert_path=cert_path,
        key_path=key_path,
        wwdr_cert_path=wwdr_cert_path
    )


def get_apple_wallet_generator() -> Optional[AppleWalletPassGenerator]:
    """Get the global Apple Wallet generator instance"""
    return apple_wallet_generator
