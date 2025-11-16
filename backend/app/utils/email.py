import logging
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from typing import Optional, List
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailClient:
    """SES email operations wrapper"""

    def __init__(self):
        # Configure SES client with timeout to prevent Lambda timeouts
        ses_config = Config(
            connect_timeout=5,
            read_timeout=5,
            retries={'max_attempts': 2}
        )
        self.ses = boto3.client('ses', region_name=settings.SES_REGION, config=ses_config)
        self.from_email = settings.SES_FROM_EMAIL

    def send_email(
        self,
        to_addresses: List[str],
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        reply_to: Optional[str] = None
    ) -> bool:
        """Send email via SES"""
        try:
            logger.info(f"Attempting to send email to {to_addresses} with subject: {subject}")

            body_data = {'Text': {'Data': body_text, 'Charset': 'UTF-8'}}
            if body_html:
                body_data['Html'] = {'Data': body_html, 'Charset': 'UTF-8'}

            message = {
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': body_data
            }

            kwargs = {
                'Source': self.from_email,
                'Destination': {'ToAddresses': to_addresses},
                'Message': message
            }

            if reply_to:
                kwargs['ReplyToAddresses'] = [reply_to]

            response = self.ses.send_email(**kwargs)
            message_id = response.get('MessageId', 'unknown')
            logger.info(f"Email sent successfully to {to_addresses}. MessageId: {message_id}")
            return True

        except ClientError as e:
            logger.error(f"SES send error: {e.response['Error']['Code']}",
                        extra={"error_message": e.response['Error']['Message']})
            return False

    def send_pass_email(
        self,
        to_email: str,
        display_name: str,
        event_name: str,
        card_url: str,
        qr_url: str,
        wallet_passes: Optional[List] = None,
        vcard_url: Optional[str] = None
    ) -> bool:
        """Send pass issuance email with optional wallet passes"""
        logger.info(f"send_pass_email called for {to_email}, event: {event_name}, wallet_passes: {len(wallet_passes) if wallet_passes else 0}")

        subject = f"Your {event_name} Digital Contact Card"

        # Build wallet pass text for plain text email
        wallet_text = ""
        if wallet_passes:
            for wallet_pass in wallet_passes:
                if wallet_pass.type == "apple":
                    wallet_text += f"\n\nAdd to Apple Wallet: {wallet_pass.url}"
                elif wallet_pass.type == "google":
                    wallet_text += f"\n\nAdd to Google Wallet: {wallet_pass.url}"

        # Add VCard download link
        vcard_text = ""
        if vcard_url:
            vcard_text = f"\n\nDownload contact (.vcf): {vcard_url}"

        body_text = f"""
Hello {display_name},

Your digital contact card for {event_name} is ready!

Access your card: {card_url}
{wallet_text}{vcard_text}

Share your contact info instantly by showing your QR code or sharing your link.

Best regards,
The OutreachPass Team
"""

        # Build wallet pass buttons for HTML email
        wallet_buttons = ""
        if wallet_passes:
            for wallet_pass in wallet_passes:
                if wallet_pass.type == "apple":
                    wallet_buttons += f"""
    <p style="margin-top: 20px;">
        <a href="{wallet_pass.url}" style="background-color: #000000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            <img src="https://developer.apple.com/wallet/add-to-apple-wallet-logo.svg" alt="Add to Apple Wallet" style="height: 20px; vertical-align: middle; margin-right: 8px;">
            Add to Apple Wallet
        </a>
    </p>"""
                elif wallet_pass.type == "google":
                    wallet_buttons += f"""
    <p style="margin-top: 20px;">
        <a href="{wallet_pass.url}">
            <img src="https://pay.google.com/gp/p/generate_button?c=save" alt="Add to Google Wallet" style="height: 48px;">
        </a>
    </p>"""

        # Build VCard download button for HTML email
        vcard_button = ""
        if vcard_url:
            vcard_button = f"""
    <p style="margin-top: 20px;">
        <a href="{vcard_url}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600;">
            📥 Download Contact Card (.vcf)
        </a>
    </p>"""

        body_html = f"""
<html>
<head></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #333;">Hello {display_name},</h2>
    <p style="font-size: 16px; color: #555;">Your digital contact card for <strong>{event_name}</strong> is ready!</p>
    <p style="margin-top: 20px;">
        <a href="{card_url}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600;">
            Access Your Card
        </a>
    </p>
    {wallet_buttons}{vcard_button}
    <p style="margin-top: 30px; font-size: 14px; color: #777;">Share your contact info instantly by showing your QR code or sharing your link.</p>
    <p style="margin-top: 30px; color: #666; font-size: 14px;">Best regards,<br/>The OutreachPass Team</p>
</body>
</html>
"""

        return self.send_email(
            to_addresses=[to_email],
            subject=subject,
            body_text=body_text,
            body_html=body_html
        )


# Global email client instance
email_client = EmailClient()
