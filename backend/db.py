import os
import time
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor


def _connect() -> psycopg2.extensions.connection:
    """Open a fresh connection to the database."""
    return psycopg2.connect(
        dsn=os.getenv("DATABASE_URL"),
        connect_timeout=10,
    )


@contextmanager
def get_db():
    """
    Context manager that yields a psycopg2 connection.
    Creates a fresh connection per request (no pool) — avoids all pool-closed
    edge cases from psycopg2.ThreadedConnectionPool.
    Retries up to 3 times on transient network errors.
    """
    last_err = None
    conn = None

    for attempt in range(4):
        try:
            conn = _connect()
            break
        except (psycopg2.OperationalError, psycopg2.InterfaceError) as exc:
            last_err = exc
            if attempt < 3:
                time.sleep(0.2 * (attempt + 1))
                continue
            raise

    if conn is None:
        if last_err:
            raise last_err
        raise psycopg2.OperationalError("Could not open database connection")

    try:
        yield conn
        conn.commit()
    except Exception as exc:
        try:
            conn.rollback()
        except Exception:
            pass
        raise
    finally:
        try:
            conn.close()
        except Exception:
            pass
