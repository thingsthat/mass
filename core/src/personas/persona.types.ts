export type PersonaMetadata = {
  // Primary
  name?: string;
  age?: number;
  gender?: string;
  pronouns?: string;
  ethnicity?: string;
  accent?: string;
  location?: string;
  languages?: string;
  job_title?: string;
  job_industry?: string;
  education?: string;
  personality_traits?: string[];
  relationship_status?: string;
  birth_date?: string;
  zodiac_sign?: string;
  political_leaning?: string;
  religion?: string;
  height_centimeters?: number;
  city_town?: string;
  sexual_orientation?: string;
};

export type PersonaMetadataExtended = {
  // Body & Physical
  body_type?: string;
  distinctive_features?: string[];
  disabilities?: string[];

  // Lifestyle & Habits
  exercise_frequency?: string;
  diet_preferences?: string;
  sleep_schedule?: string;
  drugs_use?: string[];

  // Social & Communication
  social_media_usage?: string;
  communication_style?: string;
  social_circle_size?: string;

  // Background & History
  childhood_location?: string;
  family_structure?: string;
  trauma_history?: string;

  // Psychological & Cognitive
  myers_briggs_type?: string;
  emotional_intelligence?: string;

  // Cultural & Values
  core_values?: string[];
  environmental_consciousness?: string;

  // Technology & Media
  tech_savviness?: string;
  preferred_devices?: string[];
  news_consumption?: string;
  entertainment_preferences?: string[];

  // Relationships & Intimacy
  attachment_style?: string;
  parental_status?: string;
  intimacy_comfort_level?: string;

  // Health & Wellness
  mental_health_status?: string;
  therapy_experience?: string;

  // Financial & Lifestyle
  housing_situation?: string;
  transportation?: string[];
  travel_frequency?: string;
  spending_habits?: string;
};

export type PersonaMetadataExtendedProfessional = {
  // Professional & Financial
  income_range?: string;
  career_stage?: string;
  work_environment?: string;
  job_satisfaction?: string;
  career_ambitions?: string;
};

/**
 * Type of connection between personas
 */
export type ConnectionType = 'work' | 'relationship' | 'social';

/**
 * Metadata about a connection between personas
 */
export type ConnectionMetadata = {
  strength?: string; // e.g., "close", "distant", "acquaintance"
  duration?: string; // e.g., "met in 2020", "5 years"
  context?: string; // e.g., "met at work", "college roommate"
  status?: string; // e.g., "active", "distant", "former"
  notes?: string; // optional additional context
};

/**
 * One edge in the connections index (data/connections.json).
 * persona_a and persona_b are persona IDs; order is arbitrary.
 */
export type ConnectionsIndexEdge = {
  persona_a: string;
  persona_b: string;
  type: ConnectionType;
  metadata?: ConnectionMetadata;
};

/**
 * Structure of the connections index file (data/connections.json).
 */
export type ConnectionsIndex = {
  edges: ConnectionsIndexEdge[];
};

export type ConnectionWithDetails = {
  persona_id: string;
  persona_name: string;
  has_image: boolean;
  type: ConnectionType;
  metadata?: ConnectionMetadata;
};

/**
 * A connection from one persona to another
 */
export type PersonaConnection = {
  persona_id: string; // target persona ID
  type: ConnectionType;
  metadata?: ConnectionMetadata;
};

// Used by CLI (personaHelpers) and by the Conversation component
export type PersonaItem = {
  id: string;
  name: string;
  username: string;
  has_image?: boolean;
  image_url?: string | null;
  generation?: string;
  metadata?: PersonaMetadata;
  metadata_extended?: PersonaMetadataExtended;
};

export type PersonaDetails = {
  name: string;
  persona: string;
  metadata: PersonaMetadata;
  metadata_extended?: PersonaMetadataExtended;
  username?: string;
  connections?: PersonaConnection[];
  media?: {
    original?: string;
    preview?: string;
    preview_web?: string;
    large?: string;
    large_web?: string;
  };
};

export type Persona = {
  id: string;
  details: PersonaDetails;
  type: string;
  created_at: Date;
  updated_at: Date;
  version?: number;
};

/**
 * Age range type matching the existing system
 */
export type AgeRangeOption = readonly [number, number];

/**
 * Weighted options type for demographic selection
 */
export type WeightedOption<T> = Array<{ value: T; weight: number }>;
