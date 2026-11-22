"""Drop room-rental ads mis-filed as whole-unit rents.

A listing is treated as a room rental if the title says so (bilik / master room /
"room for rent", etc.), or if the rent-per-sqft and unit size look like a room
priced against a whole-unit floor plate. Landed houses and older flats are
allowed a lower psf; typical landed rents in Subang are about RM1.0–1.4 psf.
"""
from __future__ import annotations
import re

WHOLE_UNIT_RE = re.compile(
    r'whole\s*unit|entire\s*(unit|apartment|condo|home|house)|full\s*unit|'
    r'seluruh\s*unit',
    re.I,
)
# Intentionally does not match "1 bedroom for rent" or "3 room unit".
ROOM_TITLE_RE = re.compile(
    r'(?i)('
    r'\b(master|single|middle|small|big|guest)\s+rooms?\b|'
    r'\bsewa\s*bilik\b|'
    r'\bbilik\s*(sewa|master|single|kecil|besar|tengah|kongsi|airbnb)?\b|'
    r'\b(shared?|sharing)\s+rooms?\b|'
    r'\broom\s+sharing\b|'
    r'\bper\s+room\b|'
    r'\broom\s+only\b|'
    r'房间|客房|分租'
    r')'
)
ROOM_FOR_RENT_RE = re.compile(r'(?i)\broom for rent\b')
BEDROOM_OR_LAYOUT_RE = re.compile(r'(?i)\b(bedrooms?|studio|\d+\s*rooms?)\b')


def is_whole_unit_title(title: str | None) -> bool:
    return bool(title and WHOLE_UNIT_RE.search(title))


def title_says_room(title: str | None) -> bool:
    if not title:
        return False
    if is_whole_unit_title(title):
        return False
    if ROOM_TITLE_RE.search(title):
        return True
    if ROOM_FOR_RENT_RE.search(title) and not BEDROOM_OR_LAYOUT_RE.search(title):
        return True
    return False


def is_room_rental(r: dict, typ: str | None = None, brickz_type: str | None = None) -> tuple[bool, str]:
    """Return (drop?, reason). `r` uses price or rent, plus size, rooms, title."""
    title = r.get('title') or ''
    size = r.get('size') or 0
    rent = r.get('price') if r.get('price') is not None else r.get('rent')
    rooms = r.get('rooms')
    typ = typ or ''
    bt = (brickz_type or '').lower()
    is_landed = typ == 'Landed' or 'landed' in bt
    is_lowcost = ('flat' in bt) or (bt == 'apartment')

    if rent is None or not size or size <= 0:
        return True, 'missing_rent_or_size'
    if not (800 <= rent <= 60_000):
        return True, 'rent_out_of_range'

    rpsf = rent / size
    if title_says_room(title):
        return True, 'title_room_rental'
    if is_landed:
        if rpsf < 0.5 or rpsf > 15:
            return True, 'landed_psf'
        return False, 'ok'
    # Non-landed: tiny sizes are rooms or non-comparable pods (PG sometimes has 200 sqft).
    if size < 250:
        return True, 'size_below_250'
    if rpsf > 15:
        return True, 'psf_too_high'
    if is_lowcost:
        if rpsf < 0.8:
            return True, 'lowcost_psf'
        return False, 'ok'
    # Condo / serviced residence: ~RM1.5/psf floor, with care for large cheap units.
    if rpsf < 0.8:
        return True, 'psf_below_0.8'
    if rpsf < 1.0 and size >= 600:
        return True, 'psf_below_1.0_unit_size'
    if rpsf < 1.5 and rooms is not None and rooms >= 4 and rent < 2000:
        return True, 'cheap_4plus_bed'
    if rpsf < 1.5 and size >= 700 and (rooms is None or rooms <= 1) and not is_whole_unit_title(title):
        return True, 'cheap_1bed_unit_plate'
    return False, 'ok'


def clean_whole_unit_rents(rs, typ=None, brickz_type=None):
    kept, dropped = [], []
    for r in rs:
        drop, reason = is_room_rental(r, typ=typ, brickz_type=brickz_type)
        if drop:
            dropped.append((r, reason))
        else:
            kept.append(r)
    return kept, dropped
