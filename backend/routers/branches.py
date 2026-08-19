from fastapi import APIRouter, Depends, HTTPException

from db import get_db
from dependencies.auth import get_restaurant_id

router = APIRouter()

DEFAULT_BRANCH = {
    "id": 1,
    "name": "Six Seven DHA Phase 4",
    "address": "75 CCA, DD Block, DHA Phase 4",
    "city": "Lahore",
    "phone": "DM @sixseven.pk",
    "hours": "Mon-Thu 12 PM-1:30 AM; Fri 2 PM-2:30 AM; Sat 12 PM-2:30 AM; Sun 5 PM-1:30 AM",
    "isOpen": True,
    "mapsUrl": "https://maps.google.com/?q=31.4641372,74.3822137",
    "isDefault": True,
}


def _row_to_branch(r):
    return {
        "id": r[0], "name": r[1], "address": r[2], "city": r[3],
        "phone": r[4], "hours": r[5], "isOpen": r[6],
        "mapsUrl": r[7] if len(r) > 7 else "",
        "isDefault": r[8] if len(r) > 8 else False,
    }


def _is_placeholder_branch(branch: dict) -> bool:
    text = " ".join(
        str(branch.get(key) or "").lower()
        for key in ("name", "address", "city", "phone")
    )
    return "flavor hub" in text or "555-01" in text or "new york" in text


@router.get("/")
def get_branches(restaurant_id: int = Depends(get_restaurant_id)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, address, city, phone, hours, is_open, maps_url, is_default "
                "FROM branches WHERE restaurant_id = %s ORDER BY is_default DESC, id",
                (restaurant_id,),
            )
            rows = cur.fetchall()
    if not rows:
        return [DEFAULT_BRANCH]
    branches = [_row_to_branch(r) for r in rows]
    if all(_is_placeholder_branch(branch) for branch in branches):
        return [DEFAULT_BRANCH]
    return branches


@router.get("/{branch_id}")
def get_branch(branch_id: int, restaurant_id: int = Depends(get_restaurant_id)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, address, city, phone, hours, is_open, maps_url, is_default "
                "FROM branches WHERE id = %s AND restaurant_id = %s",
                (branch_id, restaurant_id),
            )
            row = cur.fetchone()
    if not row:
        if branch_id == DEFAULT_BRANCH["id"]:
            return DEFAULT_BRANCH
        raise HTTPException(status_code=404, detail="Branch not found")
    branch = _row_to_branch(row)
    if _is_placeholder_branch(branch):
        return DEFAULT_BRANCH
    return branch
