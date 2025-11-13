import vobject
from typing import Optional


def generate_vcard(
    display_name: str,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    org_name: Optional[str] = None,
    title: Optional[str] = None,
    linkedin_url: Optional[str] = None,
    website: Optional[str] = None,
) -> str:
    """Generate VCard (VCF) string from contact details"""

    vcard = vobject.vCard()

    # Name
    vcard.add('fn')
    vcard.fn.value = display_name

    # Parse name into components
    name_parts = display_name.split(' ', 1)
    vcard.add('n')
    if len(name_parts) == 2:
        vcard.n.value = vobject.vcard.Name(family=name_parts[1], given=name_parts[0])
    else:
        vcard.n.value = vobject.vcard.Name(family=name_parts[0])

    # Email
    if email:
        vcard.add('email')
        vcard.email.value = email
        vcard.email.type_param = 'INTERNET'

    # Phone
    if phone:
        vcard.add('tel')
        vcard.tel.value = phone
        vcard.tel.type_param = 'CELL'

    # Organization
    if org_name:
        vcard.add('org')
        vcard.org.value = [org_name]

    # Title
    if title:
        vcard.add('title')
        vcard.title.value = title

    # LinkedIn URL
    if linkedin_url:
        vcard.add('url')
        vcard.url.value = linkedin_url
        vcard.url.type_param = 'LinkedIn'

    # Website
    if website:
        vcard.add('url')
        vcard.url.value = website
        vcard.url.type_param = 'WORK'

    # Version
    vcard.add('rev')
    from datetime import datetime
    vcard.rev.value = datetime.utcnow().isoformat()

    return vcard.serialize()
