# Content Suite - Reto Tecnico Alicorp

Plataforma de consistencia de marca para lanzamiento masivo de productos,
con RAG multimodal y gobernanza de datos. **Los 4 modulos del reto estan
implementados, probados y desplegados en produccion.**

## Demo en vivo

- **App web**: https://nice-tree-00b25910f.7.azurestaticapps.net
- **API (backend)**: https://content-suite-api-joan-bkhec2dbgnbdf6a4.centralus-01.azurewebsites.net/docs
- **Langfuse (trazas en vivo)**: https://cloud.langfuse.com/project/cmrs275wy1cttad0iwpobcemt

### Credenciales de demo

| Rol          | Email                  | Password  |
|--------------|-------------------------|-----------|
| Creador      | creador@demo.com        | demo1234  |
| Aprobador A  | aprobadora@demo.com     | demo1234  |
| Aprobador B  | aprobadorb@demo.com     | demo1234  |

## Arquitectura

```
React (Vite, generado con v0.dev/Bolt.new) -- Azure Static Web Apps
        |
   FastAPI (backend/app) -- Azure App Service
        |
   Groq Cloud (texto)  +  Google AI Studio (embeddings y vision)
        |
   Supabase Postgres + pgvector
        |
   Langfuse (traza cada llamada IA)
```

Backend y frontend se despliegan automaticamente desde este repositorio
via GitHub Actions en cada push a `main` (ver `.github/workflows/`).

## Setup local

### 1. Crear el proyecto en Supabase

1. Crea una cuenta en https://supabase.com y un proyecto nuevo.
2. Ve a `SQL Editor` y ejecuta el contenido de `backend/sql/schema.sql`.
   Esto crea las tablas (`users`, `brand_manual_chunks`, `content_pieces`,
   `image_audits`) y siembra los 3 usuarios de demo.
3. Ve a `Settings -> Database -> Connection Pooling` y copia la cadena de
   conexion del **Transaction pooler** (compatible con IPv4, recomendado
   para entornos locales que no soportan IPv6).

### 2. Obtener las API keys

- **Groq Cloud**: https://console.groq.com/keys (gratis, sin tarjeta).
- **Google AI Studio**: https://aistudio.google.com/apikey (gratis, sin tarjeta).
- **Langfuse**: https://cloud.langfuse.com -> crea un proyecto -> Settings
  -> API Keys (plan Hobby gratis, sin tarjeta).

### 3. Configurar variables de entorno

```bash
cd backend
cp .env.example .env
# Edita .env con tu DATABASE_URL, GROQ_API_KEY, GOOGLE_API_KEY y las
# variables LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY
```

### 4. Instalar dependencias y correr el backend

```bash
python3 -m venv venv
source venv/bin/activate        # En Windows (Git Bash): source venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Abre http://localhost:8000/docs para la documentacion interactiva (Swagger).

### 5. Correr el frontend

```bash
cd frontend
npm install
# Crea un .env con VITE_API_URL=http://localhost:8000
npm run dev
```

## Endpoints disponibles

| Metodo | Ruta                | Descripcion                                                           |
|--------|---------------------|------------------------------------------------------------------------|
| GET    | `/health`           | Chequeo de salud del servicio.                                         |
| POST   | `/login`             | Valida email/password contra la tabla `users` y devuelve el rol.       |
| POST   | `/brand`            | Modulo I: genera el manual de marca y lo indexa en el RAG.             |
| GET    | `/brand/{producto}` | Modulo I: consulta el manual ya indexado de un producto.               |
| POST   | `/generate`         | Modulo II: genera contenido consultando el manual de marca (RAG).      |
| GET    | `/review/pending`   | Modulo III: lista piezas de contenido pendientes (Aprobador A).        |
| GET    | `/review/history`   | Modulo III: bitacora completa de revisiones (todos los estados).       |
| PATCH  | `/review/{id}`      | Modulo III: aprueba o rechaza una pieza de contenido (Aprobador A).    |
| POST   | `/audit-image`      | Modulo III: audita una imagen contra el manual de marca (Aprobador B). |
| GET    | `/metrics`          | Panel de metricas: conteos de contenido generado y auditorias.         |

### Ejemplo: `POST /brand`

```json
{
  "producto": "Snack saludable de quinua",
  "tono": "divertido pero profesional",
  "publico": "Gen Z"
}
```

Respuesta:

```json
{
  "producto": "Snack saludable de quinua",
  "manual": {
    "tono": "...",
    "publico": "...",
    "prohibiciones": ["...", "..."],
    "mensajes_clave": ["...", "..."],
    "resumen": "..."
  },
  "chunks_indexados": 8
}
```

### Ejemplo: `POST /generate`

```json
{
  "producto": "Snack saludable de quinua",
  "content_type": "descripcion",
  "brief": "Descripcion corta para el feed de Instagram",
  "top_k": 5
}
```

### Ejemplo: `PATCH /review/{id}`

```json
{
  "status": "aprobado",
  "reviewer_note": "Tono correcto, aprobado sin cambios."
}
```

### Ejemplo: `POST /audit-image`

Request `multipart/form-data` con `producto` e `image`.

```json
{
  "id": 1,
  "producto": "Snack saludable de quinua",
  "cumple": false,
  "razon": "El logo es demasiado pequeno segun las reglas del manual."
}
```

## Frontend

Siguiendo la sugerencia del propio reto ("Frontend: React (sugerido via
v0/Bolt.new)"), el frontend se genero con v0.dev/Bolt.new y se conecto a
un cliente API tipado en TypeScript (`frontend/src/lib/api.ts`), con una
funcion por endpoint, tipada igual que los esquemas Pydantic del backend.
Esto garantizo que la integracion funcionara sin adivinar contratos entre
frontend y backend generados por separado.

Vistas por rol:

- **Creador**: define/consulta el manual de marca y genera contenido
  (descripciones, guiones, prompts de imagen).
- **Aprobador A**: revisa contenido pendiente, aprueba/rechaza con nota,
  y tiene una bitacora con el historial completo de revisiones.
- **Aprobador B**: sube imagenes y las audita contra el manual de marca.
- **Panel de metricas** (visible para los 3 roles): totales de contenido
  generado por estado y de auditorias de imagen por resultado.

## Modulo IV: que se ve en Langfuse

Cada request a `/brand`, `/generate` y `/audit-image` genera un trace
completo en Langfuse (uno por request, gracias a `@observe()` en el
propio endpoint), con estos spans hijos segun el flujo:

- **retriever** (`pgvector-retrieve-brand-context`): input = producto +
  query de busqueda, output = los chunks del manual recuperados. Aqui se
  ve exactamente "que contexto se recupero del RAG".
- **embedding** (`google-embed-text`): un span por cada texto embebido.
- **generation** (`groq-generate-brand-manual` / `groq-generate-content`):
  input = el prompt final enviado a Groq (ya con el contexto de marca
  inyectado), output = la respuesta del modelo.
- **generation** (`gemini-multimodal-audit`): input = el prompt de
  auditoria enviado a Gemini, output = el veredicto `{cumple, razon}`.
  Langfuse registra automaticamente el timestamp de inicio y fin de este
  span, por lo que la duracion de la auditoria multimodal queda visible
  sin codigo adicional.

Si `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` no estan configuradas,
el SDK se desactiva solo (loguea un warning) y el resto del sistema sigue
funcionando exactamente igual: la observabilidad es un add-on, no una
dependencia dura.

## Decisiones de diseno (para la entrevista)

- **Embeddings via Google AI Studio en vez de un modelo local**: evita
  cargar un modelo pesado (tipo sentence-transformers/torch) en un free
  tier con RAM limitada, y reutiliza el mismo proveedor que ya se usa
  para la auditoria multimodal del Modulo III.
- **Sin ORM**: se usa `psycopg2` directo. Para un backend de pocos
  endpoints en 3 dias, SQLAlchemy anade configuracion sin aportar valor
  proporcional.
- **Autenticacion simplificada (login real, sin JWT/sesiones)**: el
  endpoint `POST /login` valida email/password contra la tabla `users` y
  devuelve el rol; el frontend usa ese rol para mostrar la vista
  correspondiente. Se opto por no implementar tokens con expiracion por
  alcance de tiempo (3 dias), documentado aqui como recorte consciente y
  como siguiente paso natural en "Proximos pasos".
- **Despliegue en Azure en vez de Render**: el stack sugerido por el reto
  incluye Render por ser gratuito, pero se eligio Azure App Service +
  Static Web Apps (tambien con capa gratuita) por alineacion con la nube
  que usa Alicorp.
- **`response_format: json_object` / `response_mime_type: application/json`**:
  se fuerza a Groq y a Gemini a devolver JSON valido, evitando parseo
  fragil de texto libre en dos puntos distintos del sistema.
- **Similarity search con `<=>` (distancia coseno) en pgvector**: se
  filtra ademas por `product` para que el RAG no mezcle manuales de
  productos distintos si en el futuro hay varios activos a la vez.
- **La auditoria de imagen reutiliza el RAG del Modulo I**: en vez de
  mandarle a Gemini el manual completo, se le pasan solo los chunks mas
  relevantes recuperados por similarity search, igual que en el Modulo II.
- **Manejo de errores consistente**: cada operacion externa (Groq, Google
  AI Studio, Postgres) esta envuelta en try/except que devuelve un
  `HTTPException` con mensaje claro.
- **Langfuse como decorador, no como dependencia dura**: los endpoints se
  decoran con `@observe()` y los servicios internos enriquecen el span
  activo via `get_client().update_current_span/generation(...)`. Si
  Langfuse no esta configurado, el sistema sigue funcionando.
- **Frontend generado con IA en vez de escrito a mano**: el reto
  explicitamente sugiere v0/Bolt.new para el frontend. En vez de
  escribir componentes React a mano, se invirtio el tiempo en un cliente
  API tipado y verificado, que es lo que realmente determina si la
  integracion funciona.

## Extras sobre lo pedido en el reto

- **Panel de metricas**: totales de contenido generado (pendiente,
  aprobado, rechazado) y de auditorias de imagen (cumple/no cumple),
  visible para los 3 roles.
- **Bitacora de revision**: historial completo de todas las piezas de
  contenido (no solo las pendientes), con nota del revisor y fecha, en
  la vista del Aprobador A.
- **Consulta de manual existente**: el Creador puede buscar y ver el
  manual de marca ya indexado de un producto, sin tener que regenerarlo.

## Proximos pasos

- Migrar la autenticacion a sesiones con JWT (expiracion, refresh token).
- Notificaciones por email/WhatsApp cuando se genera, aprueba o rechaza
  contenido.
- Streaming de la respuesta de Groq en el Creative Engine (token a token)
  para mejorar la percepcion de velocidad en la generacion.