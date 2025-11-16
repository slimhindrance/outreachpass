import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from typing import Optional
from app.core.config import settings


class S3Client:
    """S3 operations wrapper"""

    def __init__(self):
        # Configure S3 client with timeout to prevent Lambda timeouts
        s3_config = Config(
            connect_timeout=5,
            read_timeout=30,  # S3 uploads might take longer
            retries={'max_attempts': 2}
        )
        self.s3 = boto3.client('s3', region_name=settings.AWS_REGION, config=s3_config)
        self.assets_bucket = settings.S3_BUCKET_ASSETS
        self.uploads_bucket = settings.S3_BUCKET_UPLOADS

    def upload_file(
        self,
        file_bytes: bytes,
        key: str,
        bucket: Optional[str] = None,
        content_type: str = "application/octet-stream"
    ) -> bool:
        """Upload file to S3"""
        try:
            bucket = bucket or self.assets_bucket
            self.s3.put_object(
                Bucket=bucket,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
                ServerSideEncryption='AES256'
            )
            return True
        except ClientError as e:
            print(f"S3 upload error: {e}")
            return False

    def get_presigned_url(
        self,
        key: str,
        bucket: Optional[str] = None,
        expiration: int = 3600
    ) -> Optional[str]:
        """Generate pre-signed URL for S3 object"""
        try:
            bucket = bucket or self.assets_bucket
            url = self.s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            print(f"Pre-signed URL error: {e}")
            return None

    def delete_file(
        self,
        key: str,
        bucket: Optional[str] = None
    ) -> bool:
        """Delete file from S3"""
        try:
            bucket = bucket or self.assets_bucket
            self.s3.delete_object(Bucket=bucket, Key=key)
            return True
        except ClientError as e:
            print(f"S3 delete error: {e}")
            return False


# Global S3 client instance
s3_client = S3Client()
