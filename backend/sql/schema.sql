-- ============================================================
-- Content Suite - esquema inicial para Supabase (Postgres)
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

-- pgvector viene preinstalado en Supabase, solo hay que habilitarlo
create extension if not exists vector;

-- ---------------------------------------------------------------
-- Usuarios de demo para los 3 roles del reto (auth simplificada)
-- ---------------------------------------------------------------
create table if not exists users (
    id serial primary key,
    email text unique not null,
    password text not null,
    role text not null check (role in ('creador', 'aprobador_a', 'aprobador_b'))
);

insert into users (email, password, role) values
    ('creador@demo.com', 'demo1234', 'creador'),
    ('aprobadora@demo.com', 'demo1234', 'aprobador_a'),
    ('aprobadorb@demo.com', 'demo1234', 'aprobador_b')
on conflict (email) do nothing;

-- ---------------------------------------------------------------
-- Modulo I: Brand DNA Architect
-- Cada fila es un "chunk" del manual de marca con su embedding.
-- Los modulos II y III consultan esta tabla por similarity search.
-- ---------------------------------------------------------------
create table if not exists brand_manual_chunks (
    id serial primary key,
    product text not null,
    chunk_type text not null,       -- tono | publico | resumen | prohibicion_N | mensaje_N
    content text not null,
    embedding vector(768) not null, -- dimension de models/text-embedding-004 (Google AI Studio)
    created_at timestamptz default now()
);

create index if not exists brand_manual_chunks_embedding_idx
    on brand_manual_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index if not exists brand_manual_chunks_product_idx
    on brand_manual_chunks (product);

-- ---------------------------------------------------------------
-- Modulo II: piezas de contenido generadas por el Creative Engine
-- ---------------------------------------------------------------
create table if not exists content_pieces (
    id serial primary key,
    product text not null,
    content_type text not null,   -- descripcion | guion | prompt_imagen
    content text not null,
    context_used jsonb,           -- chunks del RAG usados para generarlo (auditable)
    status text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'rechazado')),
    reviewer_note text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- Modulo III: auditorias multimodales de imagen (Aprobador B)
-- ---------------------------------------------------------------
create table if not exists image_audits (
    id serial primary key,
    product text not null,
    image_url text,
    cumple boolean not null,
    razon text not null,
    created_at timestamptz default now()
);
