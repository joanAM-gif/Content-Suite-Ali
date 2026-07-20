"""
Conexion a Supabase Postgres con soporte pgvector.

Se usa psycopg2 directo (sin ORM) a proposito: para un reto de 3 dias,
SQLAlchemy anade una capa de abstraccion que no aporta valor y sí tiempo
de configuracion. Las consultas quedan explicitas y faciles de explicar
en la entrevista.
"""
from contextlib import contextmanager

import psycopg2
from pgvector.psycopg2 import register_vector

from app.config import settings


@contextmanager
def get_connection():
    """Entrega una conexion con pgvector registrado y hace commit/rollback automatico."""
    if not settings.DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL no esta configurada. Copia .env.example a .env y "
            "completa la cadena de conexion de Supabase."
        )

    conn = psycopg2.connect(settings.DATABASE_URL)
    register_vector(conn)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
