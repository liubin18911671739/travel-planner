export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type PublicSchema = {
  Tables: {
    users: {
      Row: {
        id: string
        email: string
        full_name: string | null
        plan_tier: string | null
        quota_used: number | null
        quota_limit: number | null
        settings: Json
        created_at: string | null
        updated_at: string | null
      }
      Insert: {
        id: string
        email: string
        full_name?: string | null
        plan_tier?: string | null
        quota_used?: number | null
        quota_limit?: number | null
        settings?: Json
        created_at?: string | null
        updated_at?: string | null
      }
      Update: {
        id?: string
        email?: string
        full_name?: string | null
        plan_tier?: string | null
        quota_used?: number | null
        quota_limit?: number | null
        settings?: Json
        created_at?: string | null
        updated_at?: string | null
      }
      Relationships: []
    }
    jobs: {
      Row: {
        id: string
        user_id: string
        type: string
        status: string
        idempotency_key: string | null
        input: Json
        output: Json | null
        error_message: string | null
        progress: number | null
        metadata: Json | null
        created_at: string | null
        updated_at: string | null
        started_at: string | null
        completed_at: string | null
      }
      Insert: {
        id?: string
        user_id: string
        type: string
        status?: string
        idempotency_key?: string | null
        input: Json
        output?: Json | null
        error_message?: string | null
        progress?: number | null
        metadata?: Json | null
        created_at?: string | null
        updated_at?: string | null
        started_at?: string | null
        completed_at?: string | null
      }
      Update: {
        id?: string
        user_id?: string
        type?: string
        status?: string
        idempotency_key?: string | null
        input?: Json
        output?: Json | null
        error_message?: string | null
        progress?: number | null
        metadata?: Json | null
        created_at?: string | null
        updated_at?: string | null
        started_at?: string | null
        completed_at?: string | null
      }
      Relationships: []
    }
    job_logs: {
      Row: {
        id: string
        job_id: string
        level: string
        message: string
        timestamp: string | null
        metadata: Json | null
      }
      Insert: {
        id?: string
        job_id: string
        level: string
        message: string
        timestamp?: string | null
        metadata?: Json | null
      }
      Update: {
        id?: string
        job_id?: string
        level?: string
        message?: string
        timestamp?: string | null
        metadata?: Json | null
      }
      Relationships: []
    }
    knowledge_files: {
      Row: {
        id: string
        user_id: string
        name: string
        file_type: string
        file_size: number
        storage_path: string
        status: string
        chunk_count: number | null
        last_indexed_at: string | null
        metadata: Json | null
        created_at: string | null
        updated_at: string | null
      }
      Insert: {
        id?: string
        user_id: string
        name: string
        file_type: string
        file_size: number
        storage_path: string
        status?: string
        chunk_count?: number | null
        last_indexed_at?: string | null
        metadata?: Json | null
        created_at?: string | null
        updated_at?: string | null
      }
      Update: {
        id?: string
        user_id?: string
        name?: string
        file_type?: string
        file_size?: number
        storage_path?: string
        status?: string
        chunk_count?: number | null
        last_indexed_at?: string | null
        metadata?: Json | null
        created_at?: string | null
        updated_at?: string | null
      }
      Relationships: []
    }
    knowledge_chunks: {
      Row: {
        id: string
        file_id: string
        chunk_index: number
        content: string
        embedding: number[] | null
        metadata: Json | null
        created_at: string | null
      }
      Insert: {
        id?: string
        file_id: string
        chunk_index: number
        content: string
        embedding?: number[] | null
        metadata?: Json | null
        created_at?: string | null
      }
      Update: {
        id?: string
        file_id?: string
        chunk_index?: number
        content?: string
        embedding?: number[] | null
        metadata?: Json | null
        created_at?: string | null
      }
      Relationships: []
    }
    knowledge_packs: {
      Row: {
        id: string
        user_id: string
        name: string
        description: string | null
        file_ids: string[]
        created_at: string | null
        updated_at: string | null
      }
      Insert: {
        id?: string
        user_id: string
        name: string
        description?: string | null
        file_ids?: string[]
        created_at?: string | null
        updated_at?: string | null
      }
      Update: {
        id?: string
        user_id?: string
        name?: string
        description?: string | null
        file_ids?: string[]
        created_at?: string | null
        updated_at?: string | null
      }
      Relationships: []
    }
    itineraries: {
      Row: {
        id: string
        user_id: string
        job_id: string | null
        name: string
        destination: string
        duration_days: number
        knowledge_pack_ids: string[] | null
        settings: Json | null
        content: Json | null
        gamma_deck_url: string | null
        gamma_deck_id: string | null
        export_url: string | null
        status: string
        created_at: string | null
        updated_at: string | null
      }
      Insert: {
        id?: string
        user_id: string
        job_id?: string | null
        name: string
        destination: string
        duration_days: number
        knowledge_pack_ids?: string[] | null
        settings?: Json | null
        content?: Json | null
        gamma_deck_url?: string | null
        gamma_deck_id?: string | null
        export_url?: string | null
        status?: string
        created_at?: string | null
        updated_at?: string | null
      }
      Update: {
        id?: string
        user_id?: string
        job_id?: string | null
        name?: string
        destination?: string
        duration_days?: number
        knowledge_pack_ids?: string[] | null
        settings?: Json | null
        content?: Json | null
        gamma_deck_url?: string | null
        gamma_deck_id?: string | null
        export_url?: string | null
        status?: string
        created_at?: string | null
        updated_at?: string | null
      }
      Relationships: []
    }
    merch_designs: {
      Row: {
        id: string
        user_id: string
        job_id: string | null
        name: string
        product_type: string
        theme_keywords: string[] | null
        color_mood: string | null
        density: string | null
        style_lock: string | null
        pattern_storage_path: string | null
        mockup_storage_paths: string[] | null
        status: string
        created_at: string | null
        updated_at: string | null
      }
      Insert: {
        id?: string
        user_id: string
        job_id?: string | null
        name: string
        product_type: string
        theme_keywords?: string[] | null
        color_mood?: string | null
        density?: string | null
        style_lock?: string | null
        pattern_storage_path?: string | null
        mockup_storage_paths?: string[] | null
        status?: string
        created_at?: string | null
        updated_at?: string | null
      }
      Update: {
        id?: string
        user_id?: string
        job_id?: string | null
        name?: string
        product_type?: string
        theme_keywords?: string[] | null
        color_mood?: string | null
        density?: string | null
        style_lock?: string | null
        pattern_storage_path?: string | null
        mockup_storage_paths?: string[] | null
        status?: string
        created_at?: string | null
        updated_at?: string | null
      }
      Relationships: []
    }
    artifacts: {
      Row: {
        id: string
        itinerary_id: string | null
        merch_design_id: string | null
        kind: string
        storage_path: string
        storage_bucket: string | null
        file_size: number | null
        metadata: Json | null
        created_at: string | null
        updated_at: string | null
      }
      Insert: {
        id?: string
        itinerary_id?: string | null
        merch_design_id?: string | null
        kind: string
        storage_path: string
        storage_bucket?: string | null
        file_size?: number | null
        metadata?: Json | null
        created_at?: string | null
        updated_at?: string | null
      }
      Update: {
        id?: string
        itinerary_id?: string | null
        merch_design_id?: string | null
        kind?: string
        storage_path?: string
        storage_bucket?: string | null
        file_size?: number | null
        metadata?: Json | null
        created_at?: string | null
        updated_at?: string | null
      }
      Relationships: []
    }
  }
  Views: Record<string, never>
  Functions: {
    match_knowledge_chunks: {
      Args: {
        query_embedding: number[]
        match_threshold?: number
        match_count?: number
        file_ids?: string[] | null
      }
      Returns: {
        id: string
        file_id: string
        content: string
        metadata: Json | null
        similarity: number
      }[]
    }
    match_file_chunks: {
      Args: {
        query_embedding: number[]
        file_id: string
        match_count?: number
      }
      Returns: {
        id: string
        file_id: string
        content: string
        metadata: Json | null
        similarity: number
      }[]
    }
    match_user_chunks: {
      Args: {
        query_embedding: number[]
        match_threshold?: number
        match_count?: number
        pack_ids?: string[] | null
      }
      Returns: {
        id: string
        file_id: string
        content: string
        metadata: Json | null
        similarity: number
        file_name: string | null
        pack_id: string | null
      }[]
    }
    get_pack_file_ids: {
      Args: {
        pack_ids: string[]
      }
      Returns: string[]
    }
    increment_user_quota: {
      Args: {
        user_id: string
        amount?: number
      }
      Returns: null
    }
    decrement_user_quota: {
      Args: {
        user_id: string
        amount?: number
      }
      Returns: null
    }
  }
  Enums: Record<string, never>
  CompositeTypes: Record<string, never>
}

export type Database = {
  public: PublicSchema
}
