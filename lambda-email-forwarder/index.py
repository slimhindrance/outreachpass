"""
SES Email Forwarder Lambda Function

This Lambda is triggered by SES receipt rules to forward emails
from clindeman@base2ml.com to christopherwlindeman@gmail.com
"""
import boto3
import email
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ses = boto3.client('ses', region_name='us-east-1')
s3 = boto3.client('s3')

# Configuration
FORWARD_TO = 'christopherwlindeman@gmail.com'
FROM_EMAIL = 'clindeman@base2ml.com'


def lambda_handler(event, context):
    """
    Process SES event and forward email
    """
    try:
        # Get the S3 bucket and object key from the event
        record = event['Records'][0]
        ses_notification = record['ses']

        message_id = ses_notification['mail']['messageId']
        logger.info(f"Processing message {message_id}")

        # Get the email content from S3 (SES stores it there)
        # The bucket name comes from the receipt rule configuration
        bucket = record['s3']['bucket']['name'] if 's3' in record else None
        key = record['s3']['object']['key'] if 's3' in record else None

        if not bucket or not key:
            logger.error("No S3 bucket/key in event")
            return {'statusCode': 400, 'body': 'No S3 data'}

        # Get the email from S3
        response = s3.get_object(Bucket=bucket, Key=key)
        raw_email = response['Body'].read()

        # Parse the email
        msg = email.message_from_bytes(raw_email)

        # Get original headers
        from_address = msg.get('From', FROM_EMAIL)
        subject = msg.get('Subject', 'No Subject')

        # Create new message
        new_msg = MIMEMultipart()
        new_msg['From'] = FROM_EMAIL
        new_msg['To'] = FORWARD_TO
        new_msg['Subject'] = f"[Forwarded] {subject}"
        new_msg['Reply-To'] = from_address

        # Add forwarding note
        forward_note = f"""
        -------- Forwarded Message --------
        From: {from_address}
        To: {msg.get('To', 'N/A')}
        Subject: {subject}
        Date: {msg.get('Date', 'N/A')}

        """

        # Get email body
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    new_msg.attach(MIMEText(forward_note + body, 'plain'))
                    break
        else:
            body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
            new_msg.attach(MIMEText(forward_note + body, 'plain'))

        # Send forwarded email
        ses.send_raw_email(
            Source=FROM_EMAIL,
            Destinations=[FORWARD_TO],
            RawMessage={'Data': new_msg.as_string()}
        )

        logger.info(f"Successfully forwarded message {message_id} to {FORWARD_TO}")

        return {
            'statusCode': 200,
            'body': f'Email forwarded to {FORWARD_TO}'
        }

    except Exception as e:
        logger.error(f"Error forwarding email: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': f'Error: {str(e)}'
        }
