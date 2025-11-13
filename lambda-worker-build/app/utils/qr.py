import qrcode
from io import BytesIO
from typing import Optional


def generate_qr_code(
    url: str,
    box_size: int = 10,
    border: int = 4,
) -> bytes:
    """Generate QR code PNG as bytes"""

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=box_size,
        border=border,
    )

    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    # Convert to bytes
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return buffer.getvalue()
