"""
Autenticacion simplificada para los 3 roles del reto (demo).

Nota de alcance: no se implementa JWT/sesiones (fuera del alcance de un
MVP de 3 dias). El login valida email+password contra la tabla `users`
(seeded en sql/schema.sql) y devuelve el rol correspondiente, que el
frontend usa para decidir que vista mostrar (Creador, Aprobador A,
Aprobador B). Es suficiente para demostrar que las credenciales
"validan" el acceso a cada interfaz, como pide el reto.
"""
from fastapi import APIRouter, HTTPException  # type: ignore[import]

from app.database import get_connection
from app.schemas import LoginRequest, LoginResponse

router = APIRouter(tags=["Auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT email, role FROM users WHERE email = %s AND password = %s",
                    (payload.email, payload.password),
                )
                row = cur.fetchone()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Error validando credenciales: {exc}") from exc

    if row is None:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos.")

    return LoginResponse(email=row[0], role=row[1])