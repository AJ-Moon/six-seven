"""Where uploaded images live.

Menu photos are written to disk and served back under /static/uploads. On
container hosts (Railway, Render, Fly, App Platform) the container filesystem is
rebuilt on every deploy, so anything the admin uploaded would disappear the next
time the app shipped — the menu would keep the database rows but lose the
pictures.

UPLOADS_DIR points at a mounted persistent volume in production. It defaults to
the in-repo folder so local development and the seeded menu images keep working
with no configuration.
"""
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Images that ship with the repo (the seeded Six Seven menu photos).
BUNDLED_UPLOADS_DIR = BACKEND_DIR / "static" / "uploads"


def uploads_dir() -> Path:
    """Directory that receives new uploads. Mount a volume here in production."""
    configured = os.getenv("UPLOADS_DIR", "").strip()
    path = Path(configured) if configured else BUNDLED_UPLOADS_DIR
    path.mkdir(parents=True, exist_ok=True)
    return path


def static_dir() -> Path:
    """Directory mounted at /static."""
    return BACKEND_DIR / "static"


def sync_bundled_uploads() -> int:
    """Copy the repo's menu photos into the uploads volume if they aren't there.

    A freshly attached volume is empty, and because it is mounted over
    /static/uploads it hides the images that ship with the repo — every seeded
    menu photo would 404. Copying the defaults in on boot makes the volume the
    single source of truth without losing them. Existing files are never
    overwritten, so anything the admin replaced through the panel stays put.
    """
    target = uploads_dir()
    if target.resolve() == BUNDLED_UPLOADS_DIR.resolve():
        return 0
    if not BUNDLED_UPLOADS_DIR.is_dir():
        return 0

    import shutil

    copied = 0
    for src in BUNDLED_UPLOADS_DIR.iterdir():
        if not src.is_file():
            continue
        dest = target / src.name
        if dest.exists():
            continue
        try:
            shutil.copy2(src, dest)
            copied += 1
        except OSError:
            # A read-only or full volume should not stop the app from booting.
            pass
    return copied
