import logging
import boto3
from botocore.exceptions import ClientError
from typing import Optional, List
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailClient:
    """SES email operations wrapper"""

    def __init__(self):
        self.ses = boto3.client('ses', region_name=settings.SES_REGION)
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

            self.ses.send_email(**kwargs)
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
        qr_url: str
    ) -> bool:
        """Send pass issuance email"""
        subject = f"Your {event_name} Digital Contact Card"

        body_text = f"""
Hello {display_name},

Your digital contact card for {event_name} is ready!

Access your card: {card_url}

Share your contact info instantly by showing your QR code or sharing your link.

Best regards,
The OutreachPass Team
"""

        body_html = f"""
<html>
<head></head>
<body>
    <h2>Hello {display_name},</h2>
    <p>Your digital contact card for <strong>{event_name}</strong> is ready!</p>
    <p><a href="{card_url}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Access Your Card</a></p>
    <p>Share your contact info instantly by showing your QR code or sharing your link.</p>
    <p style="margin-top: 30px; color: #666;">Best regards,<br/>The OutreachPass Team</p>
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
