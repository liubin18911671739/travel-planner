# Knowledge Base Pipeline

This document describes the complete knowledge base pipeline implementation for the travel planner application.

## Overview

The knowledge base pipeline enables:
1. **File Upload** - Upload PDF/DOCX/TXT/images to Supabase Storage
2. **Text Extraction** - Extract text from various file formats
3. **Chunking** - Split text into searchable chunks with metadata
4. **Embedding Generation** - Generate vector embeddings for each chunk
5. **Vector Search** - RAG retrieval using pgvector cosine similarity
6. **Knowledge Packs** - Group files for organized retrieval

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│  API Route   │─────▶│   Supabase  │
│  (Upload)   │      │  /upload     │      │  Storage    │
└─────────────┘      └──────┬───────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐      ┌─────────────┐
                     │   Inngest    │─────▶│  Extractor  │
                     │   Event      │      │  (lib/knowledge/)
                     └──────┬───────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐      ┌─────────────┐
                     │   Chunker    │─────▶│ Embeddings  │
                     │ (1000 chars) │      │  Provider   │
                     └──────┬───────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐      ┌─────────────┐
                     │   Supabase   │─────▶│   pgvector  │
                     │   Database   │      │    Search   │
                     └──────────────┘      └─────────────┘
```

## API Routes

### Upload

**POST** `/api/knowledge/upload`

Upload a file and trigger indexing.

Request: `multipart/form-data`
- `file`: File (PDF, DOCX, TXT, JPG, PNG, max 10MB)

Response:
```json
{
  "fileId": "uuid",
  "status": "pending",
  "jobId": "uuid"
}
```

### Search (RAG)

**POST** `/api/knowledge/search`

Search for relevant content using vector similarity.

Request body:
```json
{
  "query": "search query text",
  "packIds": ["uuid1", "uuid2"],  // optional
  "fileIds": ["uuid1"],            // optional
  "topK": 10,                      // optional, default 10
  "threshold": 0.7                 // optional, default 0.7
}
```

Response:
```json
{
  "query": "search query text",
  "chunks": [
    {
      "id": "uuid",
      "fileId": "uuid",
      "fileName": "document.pdf",
      "content": "chunk content...",
      "metadata": {},
      "similarity": 0.92
    }
  ],
  "citations": [
    {
      "chunkId": "uuid",
      "fileId": "uuid",
      "fileName": "document.pdf",
      "similarity": 0.92
    }
  ],
  "context": "formatted context for LLM..."
}
```

### Knowledge Packs

**GET** `/api/knowledge/packs`
**POST** `/api/knowledge/packs`
**GET** `/api/knowledge/packs/[id]`
**PATCH** `/api/knowledge/packs/[id]`
**DELETE** `/api/knowledge/packs/[id]`

Manage knowledge packs (groups of files).

## Inngest Functions

### `knowledge/index.requested`

Indexes a knowledge file:
1. Downloads file from Supabase Storage
2. Extracts text based on file type
3. Chunks text (1000 chars, 150 overlap)
4. Generates embeddings
5. Stores chunks in database with vectors
6. Updates file status to `ready`

### `knowledge/delete.requested`

Deletes a knowledge file and its chunks.

## Configuration

### Environment Variables

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Inngest
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key

# Embeddings (optional, defaults to stub)
EMBEDDING_PROVIDER=openai  # or 'stub' for development
OPENAI_API_KEY=your_openai_key  # required if using openai
```

## Database Schema

### Tables

#### `knowledge_files`
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key → users)
- `name`: string
- `file_type`: string (PDF, DOCX, TXT, JPG, PNG)
- `file_size`: integer
- `storage_path`: string (Supabase Storage path)
- `status`: string (pending, indexing, ready, failed)
- `chunk_count`: integer
- `last_indexed_at`: timestamptz
- `metadata`: jsonb

#### `knowledge_chunks`
- `id`: UUID (primary key)
- `file_id`: UUID (foreign key → knowledge_files)
- `chunk_index`: integer
- `content`: text
- `embedding`: vector(1536)
- `metadata`: jsonb

#### `knowledge_packs`
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key → users)
- `name`: string
- `description`: text
- `file_ids`: uuid[]

### RLS Policies

All tables have Row Level Security policies ensuring:
- Users can only access their own data
- Service role can bypass RLS for Inngest functions

### Functions

- `match_knowledge_chunks(query_embedding, match_threshold, match_count, file_ids)` - Vector search with optional file filtering
- `match_file_chunks(query_embedding, file_id, match_count)` - Vector search within a specific file
- `get_pack_file_ids(pack_ids[])` - Get all file IDs from a list of packs

## Chunking Strategy

- **Chunk size**: 1000 characters
- **Overlap**: 150 characters
- **Minimum size**: 50 characters
- **Separator**: Paragraph breaks (`\n\n`)
- **Metadata**: File type, source, position info

## Text Extraction

| File Type | Library | Status |
|-----------|---------|--------|
| TXT | Native | ✅ Implemented |
| PDF | pdf-parse | ⚠️ Stub (TODO) |
| DOCX | mammoth | ⚠️ Stub (TODO) |
| Images | tesseract.js | ⚠️ Stub (TODO) |

To enable PDF/DOCX extraction:
```bash
npm install pdf-parse mammoth
```

## Embedding Providers

### Stub (Default)
Deterministic pseudo-random embeddings for development.

### OpenAI
Production-ready embeddings using `text-embedding-3-small` or `text-embedding-3-large`.

```bash
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

## Security

1. **Authentication**: All API routes require authenticated user via Supabase Auth
2. **Authorization**: RLS policies ensure users can only access their own data
3. **File validation**: File type and size limits enforced
4. **User ownership**: Inngest functions verify user ownership before processing

## Migration

Apply the new RLS policies:

```bash
# The migration file is at:
# supabase/migrations/002_knowledge_rls.sql
```

Apply via Supabase CLI:
```bash
supabase db push
```
