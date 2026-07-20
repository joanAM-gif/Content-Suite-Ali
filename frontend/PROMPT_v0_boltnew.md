# Prompt listo para v0.dev o Bolt.new

Copia todo el bloque de abajo (desde "Construye..." hasta el final) y
pegalo como primer mensaje en https://v0.dev o https://bolt.new. Ambas
herramientas generan un proyecto React + Tailwind que puedes descargar o
conectar a GitHub directamente.

Despues de que la IA genere el proyecto, reemplaza (o crea) el archivo
`lib/api.ts` con el que esta en `frontend/lib/api.ts` de este mismo
repositorio: tiene las funciones ya tipadas y probadas contra el backend
real, asi no dependes de que la IA adivine el contrato exacto de la API.

---

## Prompt

Construye una aplicacion web interna llamada "Content Suite" en React +
TypeScript + TailwindCSS (Vite). Es una herramienta de marketing con IA
para lanzar productos manteniendo consistencia de marca. Tiene 3 roles
con vistas distintas: Creador, Aprobador A y Aprobador B.

### Pantalla de acceso

Un selector simple (no hace falta backend real de login, es solo
client-side): 3 tarjetas grandes para elegir el rol -"Creador",
"Aprobador A", "Aprobador B"- cada una con el email de demo debajo
(creador@demo.com / aprobadora@demo.com / aprobadorb@demo.com). Al
hacer click en una tarjeta, navega a la vista de ese rol. Guarda el rol
elegido en el estado de la app (Context o similar) para mostrar un
badge con el rol activo en la barra superior de cada vista, con boton
"Cambiar de rol" que vuelve a esta pantalla.

### Vista Creador (2 pestañas)

**Pestaña "Manual de Marca"**: formulario con 3 campos (Producto,
Tono deseado, Publico objetivo, todos texto libre) y boton "Generar
manual". Al enviar, hace `POST /brand` y muestra el resultado en una
tarjeta: tono, publico, lista de prohibiciones, lista de mensajes
clave, resumen, y un badge "X chunks indexados en el RAG". Mientras
carga, muestra un spinner (la llamada puede tardar unos segundos).

**Pestaña "Generar Contenido"**: formulario con Producto (texto),
Tipo de contenido (select: Descripcion / Guion / Prompt de imagen),
Brief (textarea), y boton "Generar". Hace `POST /generate` y muestra el
contenido generado en una tarjeta, con una seccion colapsable "Contexto
de marca usado" que lista cada chunk recuperado del RAG (tipo,
contenido, distancia de similitud).

### Vista Aprobador A ("Revision de Contenido")

Al cargar, hace `GET /review/pending` y muestra una lista de tarjetas
(producto, tipo de contenido, preview del texto). Al hacer click en una
tarjeta se expande mostrando el contenido completo, un campo de texto
opcional "Nota" y dos botones: "Aprobar" (verde) y "Rechazar" (rojo).
Cada boton hace `PATCH /review/{id}` con el status correspondiente y la
nota, y quita el item de la lista al confirmar. Si la lista esta vacia,
muestra un mensaje "No hay contenido pendiente de revision".

### Vista Aprobador B ("Auditoria de Imagen")

Formulario con: Producto (texto) y zona de carga de imagen (drag &
drop o click, acepta jpg/png, muestra preview de la imagen antes de
enviar). Boton "Auditar imagen" hace `POST /audit-image` (multipart
form-data con campos `producto` e `image`). Muestra el resultado en una
tarjeta grande: si `cumple` es true, un check verde con "Cumple con el
manual de marca"; si es false, una alerta roja con el texto de `razon`.

### Estilo

Diseno limpio y profesional tipo herramienta B2B de marketing (piensa
Notion o Linear): fondo claro, tarjetas con bordes suaves y sombra
sutil, acentos en un color (elige un azul o verde), tipografia sans
legible, buen espaciado. Responsive pero prioriza desktop (es una
herramienta interna de escritorio).

### Integracion con el backend

La URL del backend vive en una variable de entorno `VITE_API_URL`
(default `http://localhost:8000`). Todas las llamadas van sin headers
de autenticacion (el backend no tiene auth real todavia, es un MVP).
Maneja estados de carga y error de forma visible (toast o mensaje en la
tarjeta) en cada llamada, mostrando el mensaje de `detail` que devuelve
el backend cuando hay un error HTTP.
