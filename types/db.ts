/**
 * Database types for Dewly — hand-derived from `db/schema.sql`.
 *
 * Deliberately written in the exact shape `supabase gen types typescript`
 * emits (Row / Insert / Update / Relationships / Enums), so when a Supabase
 * access token or a local Docker stack is available the generated file can
 * replace this one with a minimal diff.
 *
 * Insert/Update optionality follows the SQL:
 *   - column has a DEFAULT        -> optional on Insert
 *   - column is NULLABLE          -> optional on Insert, `| null` allowed
 *   - NOT NULL and no DEFAULT     -> required on Insert
 *   - every column                -> optional on Update
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ingredients: {
        Row: {
          id: string;
          inci_name: string;
          common_name: string | null;
          category: Database['public']['Enums']['ingredient_category'];
          functions: string[];
          targets_concerns: string[];
          cautions: string | null;
          description_en: string | null;
          description_tr: string | null;
          caution_en: string | null;
          caution_tr: string | null;
          comedogenic_rating: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          inci_name: string;
          common_name?: string | null;
          category?: Database['public']['Enums']['ingredient_category'];
          functions?: string[];
          targets_concerns?: string[];
          cautions?: string | null;
          description_en?: string | null;
          description_tr?: string | null;
          caution_en?: string | null;
          caution_tr?: string | null;
          comedogenic_rating?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          inci_name?: string;
          common_name?: string | null;
          category?: Database['public']['Enums']['ingredient_category'];
          functions?: string[];
          targets_concerns?: string[];
          cautions?: string | null;
          description_en?: string | null;
          description_tr?: string | null;
          caution_en?: string | null;
          caution_tr?: string | null;
          comedogenic_rating?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      interaction_rules: {
        Row: {
          id: string;
          category_a: string;
          category_b: string;
          severity: Database['public']['Enums']['severity_level'];
          /** Free text in SQL. See the `InteractionType` union for known values. */
          type: string;
          explanation: string;
          recommendation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_a: string;
          category_b: string;
          severity: Database['public']['Enums']['severity_level'];
          type: string;
          explanation: string;
          recommendation?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_a?: string;
          category_b?: string;
          severity?: Database['public']['Enums']['severity_level'];
          type?: string;
          explanation?: string;
          recommendation?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      products: {
        Row: {
          id: string;
          name: string;
          brand: string | null;
          barcode: string | null;
          step_type: Database['public']['Enums']['step_type'] | null;
          inci_raw: string | null;
          ingredient_ids: string[];
          /** Free text in SQL. See the `ProductSource` union for known values. */
          source: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          brand?: string | null;
          barcode?: string | null;
          step_type?: Database['public']['Enums']['step_type'] | null;
          inci_raw?: string | null;
          ingredient_ids?: string[];
          source?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          brand?: string | null;
          barcode?: string | null;
          step_type?: Database['public']['Enums']['step_type'] | null;
          inci_raw?: string | null;
          ingredient_ids?: string[];
          source?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedSchema: 'auth';
            referencedColumns: ['id'];
          },
        ];
      };

      user_shelf: {
        Row: {
          user_id: string;
          product_id: string;
          added_at: string;
          time_of_day: Database['public']['Enums']['shelf_time_of_day'];
        };
        Insert: {
          user_id: string;
          product_id: string;
          added_at?: string;
          time_of_day?: Database['public']['Enums']['shelf_time_of_day'];
        };
        Update: {
          user_id?: string;
          product_id?: string;
          added_at?: string;
          time_of_day?: Database['public']['Enums']['shelf_time_of_day'];
        };
        Relationships: [
          {
            foreignKeyName: 'user_shelf_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_shelf_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedSchema: 'auth';
            referencedColumns: ['id'];
          },
        ];
      };

      skin_profiles: {
        Row: {
          user_id: string;
          skin_type: Database['public']['Enums']['skin_type'];
          concerns: string[];
          goals: string[];
          age_range: Database['public']['Enums']['age_range'];
          sensitivity: Database['public']['Enums']['sensitivity_level'];
          version: number;
          completed_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          skin_type: Database['public']['Enums']['skin_type'];
          concerns?: string[];
          goals?: string[];
          age_range: Database['public']['Enums']['age_range'];
          sensitivity: Database['public']['Enums']['sensitivity_level'];
          version?: number;
          completed_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          skin_type?: Database['public']['Enums']['skin_type'];
          concerns?: string[];
          goals?: string[];
          age_range?: Database['public']['Enums']['age_range'];
          sensitivity?: Database['public']['Enums']['sensitivity_level'];
          version?: number;
          completed_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'skin_profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedSchema: 'auth';
            referencedColumns: ['id'];
          },
        ];
      };

      routines: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          time_of_day: Database['public']['Enums']['time_of_day'];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          time_of_day: Database['public']['Enums']['time_of_day'];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          time_of_day?: Database['public']['Enums']['time_of_day'];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'routines_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedSchema: 'auth';
            referencedColumns: ['id'];
          },
        ];
      };

      routine_steps: {
        Row: {
          id: string;
          routine_id: string;
          product_id: string;
          step_order: number;
          step_type: Database['public']['Enums']['step_type'];
        };
        Insert: {
          id?: string;
          routine_id: string;
          product_id: string;
          step_order: number;
          step_type: Database['public']['Enums']['step_type'];
        };
        Update: {
          id?: string;
          routine_id?: string;
          product_id?: string;
          step_order?: number;
          step_type?: Database['public']['Enums']['step_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'routine_steps_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routine_steps_routine_id_fkey';
            columns: ['routine_id'];
            isOneToOne: false;
            referencedRelation: 'routines';
            referencedColumns: ['id'];
          },
        ];
      };
    };

    Views: Record<never, never>;
    Functions: Record<never, never>;

    Enums: {
      /**
       * Canonical K-beauty routine order. Declaration order IS the sort order —
       * `ORDER BY step_type` yields a correctly sequenced routine (Phase 6).
       */
      step_type:
        | 'oil_cleanser'
        | 'water_cleanser'
        | 'exfoliant'
        | 'toner'
        | 'essence'
        | 'serum'
        | 'eye_cream'
        | 'moisturizer'
        | 'face_oil'
        | 'spf';
      time_of_day: 'am' | 'pm';
      severity_level: 'low' | 'medium' | 'high';
      /** Phase 8 — onboarding answers stored per user. */
      skin_type: 'dry' | 'oily' | 'combination' | 'sensitive' | 'normal';
      age_range: 'under-18' | '18-24' | '25-34' | '35-44' | '45-plus';
      sensitivity_level: 'not-sensitive' | 'slightly' | 'very';
      /** A shelf entry can be morning, evening, or both. */
      shelf_time_of_day: 'am' | 'pm' | 'both';
      ingredient_category:
        | 'humectant'
        | 'occlusive'
        | 'emollient'
        | 'active'
        | 'antioxidant'
        | 'spf_filter'
        | 'preservative'
        | 'fragrance'
        | 'solvent'
        | 'other';
    };

    CompositeTypes: Record<never, never>;
  };
};

// ---------------------------------------------------------------------------
// Convenience aliases
// ---------------------------------------------------------------------------

type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];

// Row aliases
export type Ingredient = Tables<'ingredients'>;
export type InteractionRule = Tables<'interaction_rules'>;
export type Product = Tables<'products'>;
export type UserShelfEntry = Tables<'user_shelf'>;
export type Routine = Tables<'routines'>;
export type RoutineStep = Tables<'routine_steps'>;

// Enum aliases
export type StepType = Enums<'step_type'>;
export type TimeOfDay = Enums<'time_of_day'>;
export type SeverityLevel = Enums<'severity_level'>;
export type IngredientCategory = Enums<'ingredient_category'>;

/**
 * Routine order as a runtime array. Mirrors the `step_type` enum declaration
 * order in `db/schema.sql`; the `satisfies` keeps the two in sync — dropping or
 * misspelling a member is a compile error.
 */
export const STEP_ORDER = [
  'oil_cleanser',
  'water_cleanser',
  'exfoliant',
  'toner',
  'essence',
  'serum',
  'eye_cream',
  'moisturizer',
  'face_oil',
  'spf',
] as const satisfies readonly StepType[];

/**
 * Known values for `interaction_rules.type`.
 *
 * NOT a Postgres enum — the column is `text not null`, documented by a COMMENT.
 * Use this union in app code for exhaustiveness, but remember the database
 * will accept any string.
 */
export type InteractionType =
  | 'irritation'
  | 'deactivation'
  | 'ph_conflict'
  | 'redundancy'
  | 'over_exfoliation';

/**
 * Known values for `products.source`. Also `text`, not a Postgres enum.
 */
export type ProductSource = 'manual' | 'open_beauty_facts' | 'seed';
