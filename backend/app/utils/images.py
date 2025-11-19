"""Image fetching and processing utilities for wallet passes"""
import logging
from typing import Optional
from urllib.parse import urlparse
import httpx
from app.utils.s3 import s3_client
from app.core.config import settings

logger = logging.getLogger(__name__)


async def fetch_image_from_url(
    url: str,
    timeout: int = 10,
    max_size_mb: int = 5
) -> Optional[bytes]:
    """
    Fetch image bytes from a URL (HTTP/HTTPS or S3)

    Args:
        url: Image URL (http://, https://, or s3://)
        timeout: Request timeout in seconds
        max_size_mb: Maximum allowed image size in MB

    Returns:
        Image bytes if successful, None if fetch fails

    Examples:
        - HTTP: https://example.com/logo.png
        - S3: s3://bucket-name/path/to/image.png
        - S3 HTTP: https://bucket-name.s3.amazonaws.com/path/to/image.png
    """
    if not url or not url.strip():
        return None

    try:
        parsed = urlparse(url)

        # Handle S3 URLs (s3://bucket/key)
        if parsed.scheme == 's3':
            return await _fetch_from_s3(parsed.netloc, parsed.path.lstrip('/'))

        # Handle S3 HTTP URLs (https://bucket.s3.amazonaws.com/key)
        if 's3.amazonaws.com' in parsed.netloc or 's3-' in parsed.netloc:
            # Extract bucket and key from S3 HTTP URL
            if '.s3.' in parsed.netloc or '.s3-' in parsed.netloc:
                bucket = parsed.netloc.split('.s3')[0]
                key = parsed.path.lstrip('/')
                return await _fetch_from_s3(bucket, key)

        # Handle regular HTTP/HTTPS URLs
        if parsed.scheme in ('http', 'https'):
            return await _fetch_from_http(url, timeout, max_size_mb)

        logger.warning(f"Unsupported URL scheme: {parsed.scheme} for URL: {url}")
        return None

    except Exception as e:
        logger.warning(f"Failed to fetch image from {url}: {str(e)}")
        return None


async def _fetch_from_http(url: str, timeout: int, max_size_mb: int) -> Optional[bytes]:
    """Fetch image from HTTP/HTTPS URL"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=timeout, follow_redirects=True)

            if response.status_code != 200:
                logger.warning(f"HTTP {response.status_code} when fetching {url}")
                return None

            # Check content length
            content_length = response.headers.get('content-length')
            if content_length and int(content_length) > max_size_mb * 1024 * 1024:
                logger.warning(f"Image too large: {content_length} bytes from {url}")
                return None

            image_bytes = response.content

            # Verify it's actually an image by checking magic bytes
            if not _is_valid_image(image_bytes):
                logger.warning(f"Invalid image format from {url}")
                return None

            return image_bytes

    except httpx.TimeoutException:
        logger.warning(f"Timeout fetching image from {url}")
        return None
    except Exception as e:
        logger.warning(f"HTTP fetch error for {url}: {str(e)}")
        return None


async def _fetch_from_s3(bucket: str, key: str) -> Optional[bytes]:
    """Fetch image from S3 bucket"""
    try:
        # Note: get_file raises Exception on error, doesn't return None
        image_bytes = s3_client.get_file(key=key, bucket=bucket)

        if not image_bytes:
            logger.warning(f"Empty S3 object: s3://{bucket}/{key}")
            return None

        # Verify it's actually an image
        if not _is_valid_image(image_bytes):
            logger.warning(f"Invalid image format from s3://{bucket}/{key}")
            return None

        return image_bytes

    except Exception as e:
        logger.warning(f"S3 fetch error for s3://{bucket}/{key}: {str(e)}")
        return None


def _is_valid_image(data: bytes) -> bool:
    """
    Check if bytes represent a valid image by checking magic bytes

    Supports: PNG, JPEG, GIF, WebP
    """
    if not data or len(data) < 8:
        return False

    # PNG: 89 50 4E 47 0D 0A 1A 0A
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return True

    # JPEG: FF D8 FF
    if data[:3] == b'\xff\xd8\xff':
        return True

    # GIF: 47 49 46 38
    if data[:4] in (b'GIF87a', b'GIF89a'):
        return True

    # WebP: RIFF....WEBP
    if len(data) >= 12 and data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return True

    return False


async def fetch_brand_images(
    brand_theme: dict,
    wallet_type: str = 'apple'
) -> dict:
    """
    Fetch all brand images for a specific wallet type

    Args:
        brand_theme: Brand theme_json dictionary
        wallet_type: 'apple' or 'google'

    Returns:
        Dictionary with fetched image bytes:
        {
            'logo': bytes or None,
            'icon': bytes or None,
            'strip': bytes or None,  # Apple only
            'hero': bytes or None    # Google only
        }
    """
    images = {}

    if wallet_type == 'apple':
        apple_theme = brand_theme.get('apple_wallet', {})

        # Fetch logo (with fallback to global logo_url)
        logo_url = apple_theme.get('logo_url') or brand_theme.get('logo_url')
        if logo_url:
            images['logo'] = await fetch_image_from_url(logo_url)

        # Fetch icon
        icon_url = apple_theme.get('icon_url')
        if icon_url:
            images['icon'] = await fetch_image_from_url(icon_url)

        # Fetch strip image
        strip_url = apple_theme.get('strip_image_url')
        if strip_url:
            images['strip'] = await fetch_image_from_url(strip_url)

    elif wallet_type == 'google':
        google_theme = brand_theme.get('google_wallet', {})

        # Fetch logo (with fallback to global logo_url)
        logo_url = google_theme.get('logo_url') or brand_theme.get('logo_url')
        if logo_url:
            images['logo'] = await fetch_image_from_url(logo_url)

        # Fetch hero image
        hero_url = google_theme.get('hero_image_url')
        if hero_url:
            images['hero'] = await fetch_image_from_url(hero_url)

    return images
