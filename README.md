# Content Suite - Reto Tecnico Alicorp

Backend del reto. Estado actual: **Modulos I (Brand DNA Architect), II
(Creative Engine), III (Governance & Multimodal Audit) y IV
(Observabilidad con Langfuse) implementados y probados.**
Frontend: prompt listo para v0.dev/Bolt.new + cliente API tipado (ver
`frontend/`). Falta desplegar todo y grabar trazas reales antes de la
entrevista (ver plan en `Plan_Reto_Tecnico_Alicorp.docx`).

## Arquitectura

```
React (v0.dev / Bolt.new)
        |
   FastAPI (backend/app)
        |
   Groq Cloud (texto)  +  Google AI Studio (embeddings y vision)
        |
   Supabase Postgres + pgvector
        |
   Langfuse (traza cada llamada IA)
```

## Setup local

### 1. Crear el proyecto en Supabase

1. Crea una cuenta en https://supabase.com y un proyecto nuevo.
2. Ve a `SQL Editor` y ejecuta el contenido de `backend/sql/schema.sql`.
   Esto crea las tablas (`users`, `brand_manual_chunks`, `content_pieces`,
   `image_audits`) y siembra los 3 usuarios de demo.
3. Ve a `Settings -> Database -> Connection string -> URI` y copia la
   cadena de conexion (reemplaza `[PASSWORD]` por tu password de proyecto).

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

### 4. Instalar dependencias y correr

```bash
python3 -m venv venv
source venv/bin/activate        # En Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Abre http://localhost:8000/docs para la documentacion interactiva (Swagger).

## Endpoints disponibles

| Metodo | Ruta                | Descripcion                                                        |
|--------|---------------------|----------------------------------------------------------------------|
| GET    | `/health`           | Chequeo de salud del servicio.                                       |
| POST   | `/brand`            | Modulo I: genera el manual de marca y lo indexa en el RAG.           |
| POST   | `/generate`         | Modulo II: genera contenido consultando el manual de marca (RAG).    |
| GET    | `/review/pending`   | Modulo III: lista piezas de contenido pendientes (Aprobador A).      |
| PATCH  | `/review/{id}`      | Modulo III: aprueba o rechaza una pieza de contenido (Aprobador A).  |
| POST   | `/audit-image`      | Modulo III: audita una imagen contra el manual de marca (Aprobador B). |

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

### Ejemplo: `GET /review/pending` y `PATCH /review/{id}`

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
v0/Bolt.new)"), el frontend no se escribio a mano: se preparo todo lo
necesario para generarlo con IA y que conecte sin fricciones con el
backend real.

- `frontend/PROMPT_v0_boltnew.md`: prompt completo, listo para copiar y
  pegar en https://v0.dev o https://bolt.new. Describe las 3 vistas por
  rol (Creador, Aprobador A, Aprobador B), que endpoint llama cada
  pantalla y el estilo visual esperado.
- `frontend/lib/api.ts`: cliente API en TypeScript con una funcion por
  endpoint, tipada exactamente igual que los esquemas Pydantic del
  backend (`createBrandManual`, `generateContent`, `listPendingReviews`,
  `reviewContentPiece`, `auditImage`). Se compilo con `tsc --strict`
  sin errores. Reemplaza el `fetch` que genere la IA por este archivo
  para garantizar que la integracion funcione a la primera.

### Como usarlo

1. Pega el prompt de `PROMPT_v0_boltnew.md` en v0.dev o Bolt.new.
2. Cuando el proyecto este generado, copia `frontend/lib/api.ts` dentro
   de el (normalmente en `lib/api.ts` o `src/lib/api.ts`).
3. Conecta los componentes generados a estas funciones en vez de al
   `fetch` que haya inventado la IA.
4. Crea un `.env` en el frontend con `VITE_API_URL=http://localhost:8000`
   (o la URL de Render una vez desplegado).

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

## Usuarios de demo (sembrados por schema.sql)

| Rol          | Email                  | Password  |
|--------------|-------------------------|-----------|
| Creador      | creador@demo.com        | demo1234  |
| Aprobador A  | aprobadora@demo.com     | demo1234  |
| Aprobador B  | aprobadorb@demo.com     | demo1234  |

## Decisiones de diseno (para la entrevista)

- **Embeddings via Google AI Studio en vez de un modelo local**: evita
  cargar un modelo pesado (tipo sentence-transformers/torch) en el free
  tier de Render (512 MB de RAM), y reutiliza el mismo proveedor que ya
  se usa para la auditoria multimodal del Modulo III.
- **Sin ORM**: se usa `psycopg2` directo. Para un backend de pocos
  endpoints en 3 dias, SQLAlchemy anade configuracion sin aportar valor
  proporcional.
- **Autenticacion simplificada**: 3 usuarios sembrados por SQL en vez de
  un sistema de login completo, documentado como recorte de alcance
  consciente (ver seccion 2 del plan).
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
  escribir componentes React a mano, se invirtio el tiempo en un prompt
  preciso y un cliente API tipado y verificado, que es lo que realmente
  determina si la integracion funciona.

## Proximos pasos

- Pegar el prompt en v0.dev/Bolt.new y conectar `lib/api.ts`.
- Desplegar backend en Render y frontend en Render/Vercel.
- Generar trazas reales en Langfuse antes de la entrevista (entregable obligatorio).
- Documentar la URL publica y las credenciales en este README.
