CREATE TABLE public."account_deletion_requests" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "profile_id" uuid,
  "email" text,
  "reason" text,
  "status" text NOT NULL DEFAULT 'requested'::text,
  "requested_at" timestamp with time zone NOT NULL DEFAULT now(),
  "processed_at" timestamp with time zone,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "processed_by" text,
  "admin_notes" text,
  CONSTRAINT "account_deletion_requests_profile_id_fkey" FOREIGN KEY ("profile_id")
    REFERENCES public."profiles" ("id") ON DELETE SET NULL,
  CONSTRAINT "account_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES public."null" ("null") ON DELETE CASCADE,
  CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."alert_notifications" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "alert_type" text NOT NULL,
  "alert_id" uuid NOT NULL,
  "recipient_id" uuid NOT NULL,
  "delivery_status" text NOT NULL DEFAULT 'queued'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "sent_at" timestamp with time zone,
  CONSTRAINT "alert_notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "alert_notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."app_config" (
  "key" text NOT NULL,
  "value" jsonb NOT NULL,
  "is_public" boolean NOT NULL DEFAULT false,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
);

CREATE TABLE public."audit_logs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "actor_profile_id" uuid,
  "action" text NOT NULL,
  "target_type" text,
  "target_id" uuid,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "audit_logs_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id")
    REFERENCES public."profiles" ("id") ON DELETE SET NULL,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."blocks" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "blocker_id" uuid NOT NULL,
  "blocked_profile_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "blocks_blocked_profile_id_fkey" FOREIGN KEY ("blocked_profile_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "blocks_blocker_id_blocked_profile_id_key" UNIQUE ("blocker_id", "blocked_profile_id")
);

CREATE TABLE public."cities" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "country_code" text NOT NULL DEFAULT 'IT'::text,
  "region" text,
  "status" city_status NOT NULL DEFAULT 'beta'::city_status,
  "center" geometry,
  "boundary" geometry,
  "timezone" text NOT NULL DEFAULT 'Europe/Rome'::text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cities_slug_key" UNIQUE ("slug")
);

CREATE TABLE public."city_areas" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "city_id" uuid NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "area_type" city_area_type NOT NULL DEFAULT 'custom'::city_area_type,
  "center" geometry,
  "boundary" geometry,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "city_areas_city_id_fkey" FOREIGN KEY ("city_id")
    REFERENCES public."cities" ("id") ON DELETE CASCADE,
  CONSTRAINT "city_areas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "city_areas_city_id_slug_key" UNIQUE ("city_id", "slug")
);

CREATE TABLE public."community_event_participants" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL,
  "profile_id" uuid NOT NULL,
  "dog_id" uuid,
  "status" participation_status NOT NULL DEFAULT 'interested'::participation_status,
  "note" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "community_event_participants_dog_id_fkey" FOREIGN KEY ("dog_id")
    REFERENCES public."dogs" ("id") ON DELETE SET NULL,
  CONSTRAINT "community_event_participants_event_id_fkey" FOREIGN KEY ("event_id")
    REFERENCES public."community_events" ("id") ON DELETE CASCADE,
  CONSTRAINT "community_event_participants_profile_id_fkey" FOREIGN KEY ("profile_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "community_event_participants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_event_participants_event_id_profile_id_key" UNIQUE ("event_id", "profile_id")
);

CREATE TABLE public."community_events" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "city_id" uuid,
  "place_id" uuid,
  "organizer_id" uuid NOT NULL,
  "dog_id" uuid,
  "event_type" community_event_type NOT NULL DEFAULT 'walk'::community_event_type,
  "status" event_status NOT NULL DEFAULT 'scheduled'::event_status,
  "title" text NOT NULL,
  "description" text,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone,
  "location" geometry,
  "area" geometry,
  "max_participants" integer,
  "accepts_new_participants" boolean NOT NULL DEFAULT true,
  "visibility" content_visibility NOT NULL DEFAULT 'public'::content_visibility,
  "moderation_status" moderation_status NOT NULL DEFAULT 'approved'::moderation_status,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "community_events_city_id_fkey" FOREIGN KEY ("city_id")
    REFERENCES public."cities" ("id") ON DELETE SET NULL,
  CONSTRAINT "community_events_dog_id_fkey" FOREIGN KEY ("dog_id")
    REFERENCES public."dogs" ("id") ON DELETE SET NULL,
  CONSTRAINT "community_events_organizer_id_fkey" FOREIGN KEY ("organizer_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "community_events_place_id_fkey" FOREIGN KEY ("place_id")
    REFERENCES public."places" ("id") ON DELETE SET NULL,
  CONSTRAINT "community_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."contact_requests" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "request_type" text NOT NULL,
  "name" text,
  "city" text,
  "contact_email" text,
  "contact_phone" text,
  "message" text NOT NULL,
  "source" text NOT NULL DEFAULT 'app'::text,
  "app_version" text,
  "status" text NOT NULL DEFAULT 'new'::text,
  "email_sent" boolean NOT NULL DEFAULT false,
  "email_status" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."content_removals" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "moderator_id" uuid,
  "target_type" text NOT NULL,
  "target_id" uuid NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "content_removals_moderator_id_fkey" FOREIGN KEY ("moderator_id")
    REFERENCES public."profiles" ("id") ON DELETE SET NULL,
  CONSTRAINT "content_removals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."danger_reports" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "reporter_id" uuid NOT NULL,
  "city_id" uuid,
  "danger_type" text NOT NULL,
  "location" geometry,
  "area" geometry,
  "description" text,
  "severity" integer NOT NULL DEFAULT 2,
  "status" text NOT NULL DEFAULT 'active'::text,
  "moderation_status" moderation_status NOT NULL DEFAULT 'pending'::moderation_status,
  "expires_at" timestamp with time zone NOT NULL DEFAULT (now() + '06:00:00'::interval),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "source_place_id" uuid,
  "radius_m" integer NOT NULL DEFAULT 250,
  "disclaimer_accepted_at" timestamp with time zone,
  "closed_reason" text,
  "location_mode" text,
  "location_label" text,
  "location_latitude" double precision,
  "location_longitude" double precision,
  "manual_address" text,
  CONSTRAINT "danger_reports_city_id_fkey" FOREIGN KEY ("city_id")
    REFERENCES public."cities" ("id") ON DELETE SET NULL,
  CONSTRAINT "danger_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "danger_reports_source_place_id_fkey" FOREIGN KEY ("source_place_id")
    REFERENCES public."places" ("id") ON DELETE SET NULL,
  CONSTRAINT "danger_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."dog_diary_events" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "dog_id" uuid,
  "event_type" text NOT NULL,
  "title" text NOT NULL DEFAULT ''::text,
  "note" text,
  "event_date" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "dog_diary_events_dog_id_fkey" FOREIGN KEY ("dog_id")
    REFERENCES public."dogs" ("id") ON DELETE SET NULL,
  CONSTRAINT "dog_diary_events_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES public."null" ("null") ON DELETE CASCADE,
  CONSTRAINT "dog_diary_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."dog_food_preferences" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "dog_id" uuid NOT NULL,
  "owner_id" uuid NOT NULL,
  "item_name" text NOT NULL,
  "item_brand" text,
  "category" text,
  "preference_type" food_preference_type NOT NULL,
  "rating" integer,
  "comment" text,
  "photo_storage_path" text,
  "visibility" content_visibility NOT NULL DEFAULT 'friends'::content_visibility,
  "moderation_status" moderation_status NOT NULL DEFAULT 'approved'::moderation_status,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "dog_food_preferences_dog_id_fkey" FOREIGN KEY ("dog_id")
    REFERENCES public."dogs" ("id") ON DELETE CASCADE,
  CONSTRAINT "dog_food_preferences_owner_id_fkey" FOREIGN KEY ("owner_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "dog_food_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."dog_friends" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "owner_id" uuid NOT NULL,
  "dog_id" uuid NOT NULL,
  "friend_owner_id" uuid NOT NULL,
  "friend_dog_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "dog_friends_dog_id_fkey" FOREIGN KEY ("dog_id")
    REFERENCES public."dogs" ("id") ON DELETE CASCADE,
  CONSTRAINT "dog_friends_friend_dog_id_fkey" FOREIGN KEY ("friend_dog_id")
    REFERENCES public."dogs" ("id") ON DELETE CASCADE,
  CONSTRAINT "dog_friends_friend_owner_id_fkey" FOREIGN KEY ("friend_owner_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "dog_friends_owner_id_fkey" FOREIGN KEY ("owner_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "dog_friends_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dog_friends_unique" UNIQUE ("dog_id", "friend_dog_id")
);

CREATE TABLE public."dog_media" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "dog_id" uuid NOT NULL,
  "owner_id" uuid NOT NULL,
  "storage_path" text NOT NULL,
  "media_type" text NOT NULL,
  "caption" text,
  "visibility" content_visibility NOT NULL DEFAULT 'public'::content_visibility,
  "moderation_status" moderation_status NOT NULL DEFAULT 'pending'::moderation_status,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "dog_media_dog_id_fkey" FOREIGN KEY ("dog_id")
    REFERENCES public."dogs" ("id") ON DELETE CASCADE,
  CONSTRAINT "dog_media_owner_id_fkey" FOREIGN KEY ("owner_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "dog_media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."dog_profile_tag_options" (
  "key" text NOT NULL,
  "label" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "dog_profile_tag_options_pkey" PRIMARY KEY ("key")
);

CREATE TABLE public."dog_relationships" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "dog_a_id" uuid NOT NULL,
  "dog_b_id" uuid NOT NULL,
  "created_by_profile_id" uuid NOT NULL,
  "relationship_type" dog_relationship_type NOT NULL DEFAULT 'friend'::dog_relationship_type,
  "status" relationship_status NOT NULL DEFAULT 'pending'::relationship_status,
  "anniversary_date" date,
  "note" text,
  "visibility" content_visibility NOT NULL DEFAULT 'friends'::content_visibility,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "dog_relationships_created_by_profile_id_fkey" FOREIGN KEY ("created_by_profile_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "dog_relationships_dog_a_id_fkey" FOREIGN KEY ("dog_a_id")
    REFERENCES public."dogs" ("id") ON DELETE CASCADE,
  CONSTRAINT "dog_relationships_dog_b_id_fkey" FOREIGN KEY ("dog_b_id")
    REFERENCES public."dogs" ("id") ON DELETE CASCADE,
  CONSTRAINT "dog_relationships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dog_relationships_dog_a_id_dog_b_id_relationship_type_key" UNIQUE ("dog_a_id", "dog_b_id", "relationship_type")
);

CREATE TABLE public."dogs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "owner_id" uuid NOT NULL,
  "name" text NOT NULL,
  "avatar_url" text,
  "birth_year" integer,
  "size" text,
  "personality_tags" ARRAY NOT NULL DEFAULT '{}'::text[],
  "sociality_tags" ARRAY NOT NULL DEFAULT '{}'::text[],
  "walk_tags" ARRAY NOT NULL DEFAULT '{}'::text[],
  "notes_public" text,
  "notes_private" text,
  "visibility" content_visibility NOT NULL DEFAULT 'public'::content_visibility,
  "moderation_status" moderation_status NOT NULL DEFAULT 'approved'::moderation_status,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "dogs_owner_id_fkey" FOREIGN KEY ("owner_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "dogs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."feature_flags" (
  "key" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "enabled" boolean NOT NULL DEFAULT false,
  "rollout" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "min_app_version" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

CREATE TABLE public."knowledge_cards" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "slug" text NOT NULL,
  "category" text NOT NULL DEFAULT 'safety'::text,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "severity" integer NOT NULL DEFAULT 1,
  "source_label" text,
  "source_url" text,
  "display_order" integer NOT NULL DEFAULT 100,
  "is_active" boolean NOT NULL DEFAULT true,
  "moderation_status" moderation_status NOT NULL DEFAULT 'approved'::moderation_status,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "knowledge_cards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "knowledge_cards_slug_key" UNIQUE ("slug")
);

CREATE TABLE public."legal_documents" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "document_key" text NOT NULL,
  "version" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "status" text NOT NULL DEFAULT 'published'::text,
  "last_reviewed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "legal_documents_document_key_key" UNIQUE ("document_key")
);

CREATE TABLE public."lost_dog_alerts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "dog_id" uuid NOT NULL,
  "owner_id" uuid NOT NULL,
  "city_id" uuid,
  "last_seen_area" geometry,
  "last_seen_at" timestamp with time zone NOT NULL,
  "description" text,
  "contact_mode" text NOT NULL DEFAULT 'in_app'::text,
  "status" alert_status NOT NULL DEFAULT 'active'::alert_status,
  "moderation_status" moderation_status NOT NULL DEFAULT 'approved'::moderation_status,
  "expires_at" timestamp with time zone NOT NULL DEFAULT (now() + '24:00:00'::interval),
  "closed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "source_place_id" uuid,
  "radius_m" integer NOT NULL DEFAULT 350,
  "disclaimer_accepted_at" timestamp with time zone,
  "closed_reason" text,
  "location_mode" text,
  "location_label" text,
  "location_latitude" double precision,
  "location_longitude" double precision,
  "manual_address" text,
  CONSTRAINT "lost_dog_alerts_city_id_fkey" FOREIGN KEY ("city_id")
    REFERENCES public."cities" ("id") ON DELETE SET NULL,
  CONSTRAINT "lost_dog_alerts_dog_id_fkey" FOREIGN KEY ("dog_id")
    REFERENCES public."dogs" ("id") ON DELETE CASCADE,
  CONSTRAINT "lost_dog_alerts_owner_id_fkey" FOREIGN KEY ("owner_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "lost_dog_alerts_source_place_id_fkey" FOREIGN KEY ("source_place_id")
    REFERENCES public."places" ("id") ON DELETE SET NULL,
  CONSTRAINT "lost_dog_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."lost_dog_sightings" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "alert_id" uuid NOT NULL,
  "reporter_id" uuid NOT NULL,
  "location" geometry,
  "area" geometry,
  "note" text,
  "sighting_type" text NOT NULL DEFAULT 'seen'::text,
  "moderation_status" moderation_status NOT NULL DEFAULT 'approved'::moderation_status,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "location_mode" text,
  "location_label" text,
  "location_latitude" double precision,
  "location_longitude" double precision,
  "manual_address" text,
  "status" text NOT NULL DEFAULT 'active'::text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "closed_at" timestamp with time zone,
  "sighted_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "lost_dog_sightings_alert_id_fkey" FOREIGN KEY ("alert_id")
    REFERENCES public."lost_dog_alerts" ("id") ON DELETE CASCADE,
  CONSTRAINT "lost_dog_sightings_reporter_id_fkey" FOREIGN KEY ("reporter_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "lost_dog_sightings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."moderation_actions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "moderator_id" uuid,
  "action" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" uuid NOT NULL,
  "reason" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "moderation_actions_moderator_id_fkey" FOREIGN KEY ("moderator_id")
    REFERENCES public."profiles" ("id") ON DELETE SET NULL,
  CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."place_favorites" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "place_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "place_favorites_place_id_fkey" FOREIGN KEY ("place_id")
    REFERENCES public."places" ("id") ON DELETE CASCADE,
  CONSTRAINT "place_favorites_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES public."null" ("null") ON DELETE CASCADE,
  CONSTRAINT "place_favorites_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "place_favorites_user_id_place_id_key" UNIQUE ("user_id", "place_id")
);

CREATE TABLE public."place_reports" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "place_id" uuid,
  "report_type" text NOT NULL,
  "message" text NOT NULL,
  "contact_email" text,
  "status" text NOT NULL DEFAULT 'new'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "place_reports_place_id_fkey" FOREIGN KEY ("place_id")
    REFERENCES public."places" ("id") ON DELETE SET NULL,
  CONSTRAINT "place_reports_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES public."null" ("null") ON DELETE SET NULL,
  CONSTRAINT "place_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."place_reviews" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "place_id" uuid NOT NULL,
  "reviewer_id" uuid NOT NULL,
  "rating" integer NOT NULL,
  "title" text,
  "body" text,
  "tags" ARRAY NOT NULL DEFAULT '{}'::text[],
  "moderation_status" moderation_status NOT NULL DEFAULT 'pending'::moderation_status,
  "visibility" content_visibility NOT NULL DEFAULT 'public'::content_visibility,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "place_reviews_place_id_fkey" FOREIGN KEY ("place_id")
    REFERENCES public."places" ("id") ON DELETE CASCADE,
  CONSTRAINT "place_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "place_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "place_reviews_place_id_reviewer_id_key" UNIQUE ("place_id", "reviewer_id")
);

CREATE TABLE public."places" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "city_id" uuid,
  "city_area_id" uuid,
  "slug" text,
  "name" text NOT NULL,
  "type" place_type NOT NULL,
  "location" geometry,
  "area" geometry,
  "google_place_id" text,
  "source" text NOT NULL DEFAULT 'user'::text,
  "tags" ARRAY NOT NULL DEFAULT '{}'::text[],
  "description" text,
  "moderation_status" moderation_status NOT NULL DEFAULT 'pending'::moderation_status,
  "visibility" content_visibility NOT NULL DEFAULT 'public'::content_visibility,
  "created_by" uuid,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "places_city_area_id_fkey" FOREIGN KEY ("city_area_id")
    REFERENCES public."city_areas" ("id") ON DELETE SET NULL,
  CONSTRAINT "places_city_id_fkey" FOREIGN KEY ("city_id")
    REFERENCES public."cities" ("id") ON DELETE SET NULL,
  CONSTRAINT "places_created_by_fkey" FOREIGN KEY ("created_by")
    REFERENCES public."profiles" ("id") ON DELETE SET NULL,
  CONSTRAINT "places_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "places_city_id_slug_key" UNIQUE ("city_id", "slug")
);

CREATE TABLE public."presence_sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL,
  "dog_id" uuid,
  "city_id" uuid,
  "place_id" uuid,
  "location" geometry,
  "status" text NOT NULL DEFAULT 'walking'::text,
  "message" text,
  "visibility" content_visibility NOT NULL DEFAULT 'public'::content_visibility,
  "moderation_status" moderation_status NOT NULL DEFAULT 'approved'::moderation_status,
  "expires_at" timestamp with time zone NOT NULL DEFAULT (now() + '02:00:00'::interval),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "active" boolean NOT NULL DEFAULT false,
  "location_mode" text,
  "location_label" text,
  "location_latitude" double precision,
  "location_longitude" double precision,
  "manual_address" text,
  CONSTRAINT "presence_sessions_city_id_fkey" FOREIGN KEY ("city_id")
    REFERENCES public."cities" ("id") ON DELETE SET NULL,
  CONSTRAINT "presence_sessions_dog_id_fkey" FOREIGN KEY ("dog_id")
    REFERENCES public."dogs" ("id") ON DELETE SET NULL,
  CONSTRAINT "presence_sessions_place_id_fkey" FOREIGN KEY ("place_id")
    REFERENCES public."places" ("id") ON DELETE SET NULL,
  CONSTRAINT "presence_sessions_profile_id_fkey" FOREIGN KEY ("profile_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "presence_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."profile_relationships" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "requester_id" uuid NOT NULL,
  "addressee_id" uuid NOT NULL,
  "relationship_type" profile_relationship_type NOT NULL DEFAULT 'friend'::profile_relationship_type,
  "status" relationship_status NOT NULL DEFAULT 'pending'::relationship_status,
  "note" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "profile_relationships_addressee_id_fkey" FOREIGN KEY ("addressee_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "profile_relationships_requester_id_fkey" FOREIGN KEY ("requester_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "profile_relationships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "profile_relationships_requester_id_addressee_id_relationshi_key" UNIQUE ("requester_id", "addressee_id", "relationship_type")
);

CREATE TABLE public."profiles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "display_name" text NOT NULL DEFAULT 'Nuovo umano BauBook'::text,
  "avatar_url" text,
  "city_id" uuid,
  "city_label" text NOT NULL DEFAULT 'Venezia-Mestre'::text,
  "home_area" geometry,
  "is_verified_email" boolean NOT NULL DEFAULT false,
  "is_verified_phone" boolean NOT NULL DEFAULT false,
  "trust_score" integer NOT NULL DEFAULT 0,
  "status" user_status NOT NULL DEFAULT 'active'::user_status,
  "suspension_reason" text,
  "suspended_until" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "account_status" text NOT NULL DEFAULT 'active'::text,
  "account_deactivated_at" timestamp with time zone,
  "account_deactivation_reason" text,
  CONSTRAINT "profiles_city_id_fkey" FOREIGN KEY ("city_id")
    REFERENCES public."cities" ("id") ON DELETE SET NULL,
  CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES public."null" ("null") ON DELETE CASCADE,
  CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id")
);

CREATE TABLE public."push_tokens" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL,
  "token" text NOT NULL,
  "platform" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "push_tokens_profile_id_fkey" FOREIGN KEY ("profile_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "push_tokens_profile_id_token_key" UNIQUE ("profile_id", "token")
);

CREATE TABLE public."reports" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "reporter_id" uuid NOT NULL,
  "target_type" text NOT NULL,
  "target_id" uuid NOT NULL,
  "reason" report_reason NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'open'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."service_recommendations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "recommender_id" uuid NOT NULL,
  "city_id" uuid,
  "place_id" uuid,
  "service_type" service_recommendation_type NOT NULL,
  "provider_name" text NOT NULL,
  "rating" integer,
  "title" text,
  "body" text,
  "contact_summary" text,
  "tags" ARRAY NOT NULL DEFAULT '{}'::text[],
  "visibility" content_visibility NOT NULL DEFAULT 'public'::content_visibility,
  "moderation_status" moderation_status NOT NULL DEFAULT 'pending'::moderation_status,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "service_recommendations_city_id_fkey" FOREIGN KEY ("city_id")
    REFERENCES public."cities" ("id") ON DELETE SET NULL,
  CONSTRAINT "service_recommendations_place_id_fkey" FOREIGN KEY ("place_id")
    REFERENCES public."places" ("id") ON DELETE SET NULL,
  CONSTRAINT "service_recommendations_recommender_id_fkey" FOREIGN KEY ("recommender_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "service_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."spatial_ref_sys" (
  "srid" integer NOT NULL,
  "auth_name" varchar(256),
  "auth_srid" integer,
  "srtext" varchar(2048),
  "proj4text" varchar(2048),
  CONSTRAINT "spatial_ref_sys_pkey" PRIMARY KEY ("srid")
);

CREATE TABLE public."sponsored_slots" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "placement" text NOT NULL,
  "sponsor_name" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "cta_label" text NOT NULL DEFAULT 'Scopri di piu'::text,
  "cta_url" text,
  "status" text NOT NULL DEFAULT 'draft'::text,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "sponsored_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."supporter_entitlements" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL,
  "entitlement" text NOT NULL,
  "source" text NOT NULL DEFAULT 'manual'::text,
  "starts_at" timestamp with time zone NOT NULL DEFAULT now(),
  "ends_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "supporter_entitlements_profile_id_fkey" FOREIGN KEY ("profile_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "supporter_entitlements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supporter_entitlements_profile_id_entitlement_source_key" UNIQUE ("profile_id", "entitlement", "source")
);

CREATE TABLE public."user_suspensions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL,
  "moderator_id" uuid,
  "reason" text NOT NULL,
  "starts_at" timestamp with time zone NOT NULL DEFAULT now(),
  "ends_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "user_suspensions_moderator_id_fkey" FOREIGN KEY ("moderator_id")
    REFERENCES public."profiles" ("id") ON DELETE SET NULL,
  CONSTRAINT "user_suspensions_profile_id_fkey" FOREIGN KEY ("profile_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "user_suspensions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."walk_plan_participants" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "walk_plan_id" uuid NOT NULL,
  "profile_id" uuid NOT NULL,
  "dog_id" uuid,
  "status" participation_status NOT NULL DEFAULT 'interested'::participation_status,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "walk_plan_participants_dog_id_fkey" FOREIGN KEY ("dog_id")
    REFERENCES public."dogs" ("id") ON DELETE SET NULL,
  CONSTRAINT "walk_plan_participants_profile_id_fkey" FOREIGN KEY ("profile_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "walk_plan_participants_walk_plan_id_fkey" FOREIGN KEY ("walk_plan_id")
    REFERENCES public."walk_plans" ("id") ON DELETE CASCADE,
  CONSTRAINT "walk_plan_participants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "walk_plan_participants_walk_plan_id_profile_id_key" UNIQUE ("walk_plan_id", "profile_id")
);

CREATE TABLE public."walk_plans" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "community_event_id" uuid,
  "place_id" uuid,
  "dog_id" uuid NOT NULL,
  "owner_id" uuid NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone,
  "message" text,
  "accepts_company" boolean NOT NULL DEFAULT true,
  "visibility" content_visibility NOT NULL DEFAULT 'public'::content_visibility,
  "moderation_status" moderation_status NOT NULL DEFAULT 'approved'::moderation_status,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "active" boolean NOT NULL DEFAULT false,
  "location_mode" text,
  "location_label" text,
  "location_latitude" double precision,
  "location_longitude" double precision,
  "manual_address" text,
  CONSTRAINT "walk_plans_community_event_id_fkey" FOREIGN KEY ("community_event_id")
    REFERENCES public."community_events" ("id") ON DELETE SET NULL,
  CONSTRAINT "walk_plans_dog_id_fkey" FOREIGN KEY ("dog_id")
    REFERENCES public."dogs" ("id") ON DELETE CASCADE,
  CONSTRAINT "walk_plans_owner_id_fkey" FOREIGN KEY ("owner_id")
    REFERENCES public."profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "walk_plans_place_id_fkey" FOREIGN KEY ("place_id")
    REFERENCES public."places" ("id") ON DELETE SET NULL,
  CONSTRAINT "walk_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX account_deletion_requests_one_requested_profile_idx ON public.account_deletion_requests USING btree (profile_id) WHERE ((profile_id IS NOT NULL) AND (status = 'requested'::text));
CREATE UNIQUE INDEX account_deletion_requests_one_requested_user_idx ON public.account_deletion_requests USING btree (user_id) WHERE ((user_id IS NOT NULL) AND (status = 'requested'::text));
CREATE INDEX account_deletion_requests_status_idx ON public.account_deletion_requests USING btree (status);
CREATE INDEX account_deletion_requests_user_id_idx ON public.account_deletion_requests USING btree (user_id);
CREATE INDEX audit_logs_target_idx ON public.audit_logs USING btree (target_type, target_id);
CREATE UNIQUE INDEX blocks_blocker_id_blocked_profile_id_key ON public.blocks USING btree (blocker_id, blocked_profile_id);
CREATE INDEX cities_boundary_gix ON public.cities USING gist (boundary);
CREATE INDEX cities_center_gix ON public.cities USING gist (center);
CREATE UNIQUE INDEX cities_slug_key ON public.cities USING btree (slug);
CREATE INDEX city_areas_boundary_gix ON public.city_areas USING gist (boundary);
CREATE INDEX city_areas_center_gix ON public.city_areas USING gist (center);
CREATE UNIQUE INDEX city_areas_city_id_slug_key ON public.city_areas USING btree (city_id, slug);
CREATE UNIQUE INDEX community_event_participants_event_id_profile_id_key ON public.community_event_participants USING btree (event_id, profile_id);
CREATE INDEX community_events_area_gix ON public.community_events USING gist (area);
CREATE INDEX community_events_city_starts_idx ON public.community_events USING btree (city_id, starts_at);
CREATE INDEX community_events_location_gix ON public.community_events USING gist (location);
CREATE INDEX community_events_status_idx ON public.community_events USING btree (status, moderation_status);
CREATE INDEX danger_reports_area_gix ON public.danger_reports USING gist (area);
CREATE INDEX danger_reports_city_idx ON public.danger_reports USING btree (city_id);
CREATE INDEX danger_reports_location_gix ON public.danger_reports USING gist (location);
CREATE INDEX danger_reports_reporter_active_idx ON public.danger_reports USING btree (reporter_id, status, expires_at);
CREATE INDEX danger_reports_source_place_idx ON public.danger_reports USING btree (source_place_id);
CREATE INDEX danger_reports_status_expiry_idx ON public.danger_reports USING btree (status, expires_at);
CREATE INDEX dog_diary_events_user_date_idx ON public.dog_diary_events USING btree (user_id, event_date DESC);
CREATE INDEX dog_food_preferences_dog_id_idx ON public.dog_food_preferences USING btree (dog_id);
CREATE INDEX dog_friends_dog_id_idx ON public.dog_friends USING btree (dog_id);
CREATE INDEX dog_friends_friend_dog_id_idx ON public.dog_friends USING btree (friend_dog_id);
CREATE INDEX dog_friends_owner_id_idx ON public.dog_friends USING btree (owner_id);
CREATE UNIQUE INDEX dog_friends_unique ON public.dog_friends USING btree (dog_id, friend_dog_id);
CREATE UNIQUE INDEX dog_relationships_dog_a_id_dog_b_id_relationship_type_key ON public.dog_relationships USING btree (dog_a_id, dog_b_id, relationship_type);
CREATE INDEX dog_relationships_dog_a_idx ON public.dog_relationships USING btree (dog_a_id);
CREATE INDEX dog_relationships_dog_b_idx ON public.dog_relationships USING btree (dog_b_id);
CREATE INDEX dogs_owner_id_idx ON public.dogs USING btree (owner_id);
CREATE UNIQUE INDEX dogs_owner_name_unique ON public.dogs USING btree (owner_id, lower(btrim(name))) WHERE ((owner_id IS NOT NULL) AND (btrim(COALESCE(name, ''::text)) <> ''::text));
CREATE INDEX knowledge_cards_category_idx ON public.knowledge_cards USING btree (category, is_active, display_order);
CREATE UNIQUE INDEX knowledge_cards_slug_key ON public.knowledge_cards USING btree (slug);
CREATE UNIQUE INDEX legal_documents_document_key_key ON public.legal_documents USING btree (document_key);
CREATE INDEX lost_dog_alerts_area_gix ON public.lost_dog_alerts USING gist (last_seen_area);
CREATE INDEX lost_dog_alerts_city_idx ON public.lost_dog_alerts USING btree (city_id);
CREATE INDEX lost_dog_alerts_owner_active_idx ON public.lost_dog_alerts USING btree (owner_id, dog_id, status, expires_at);
CREATE INDEX lost_dog_alerts_owner_recent_idx ON public.lost_dog_alerts USING btree (owner_id, created_at DESC);
CREATE INDEX lost_dog_alerts_source_place_idx ON public.lost_dog_alerts USING btree (source_place_id);
CREATE INDEX lost_dog_alerts_status_expiry_idx ON public.lost_dog_alerts USING btree (status, expires_at);
CREATE UNIQUE INDEX lost_dog_sightings_alert_reporter_uidx ON public.lost_dog_sightings USING btree (alert_id, reporter_id);
CREATE INDEX lost_dog_sightings_alert_status_sighted_idx ON public.lost_dog_sightings USING btree (alert_id, status, sighted_at DESC);
CREATE INDEX place_favorites_user_created_idx ON public.place_favorites USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX place_favorites_user_id_place_id_key ON public.place_favorites USING btree (user_id, place_id);
CREATE INDEX place_reports_status_created_idx ON public.place_reports USING btree (status, created_at DESC);
CREATE UNIQUE INDEX place_reviews_place_id_reviewer_id_key ON public.place_reviews USING btree (place_id, reviewer_id);
CREATE INDEX places_area_gix ON public.places USING gist (area);
CREATE INDEX places_city_id_idx ON public.places USING btree (city_id);
CREATE UNIQUE INDEX places_city_id_slug_key ON public.places USING btree (city_id, slug);
CREATE INDEX places_dog_area_location_gix ON public.places USING gist (location) WHERE ((type = 'dog_area'::place_type) AND (location IS NOT NULL));
CREATE UNIQUE INDEX places_google_place_id_uidx ON public.places USING btree (google_place_id) WHERE (google_place_id IS NOT NULL);
CREATE INDEX places_location_gix ON public.places USING gist (location);
CREATE INDEX places_type_idx ON public.places USING btree (type);
CREATE INDEX presence_sessions_expires_at_idx ON public.presence_sessions USING btree (expires_at);
CREATE INDEX presence_sessions_location_gix ON public.presence_sessions USING gist (location);
CREATE UNIQUE INDEX presence_sessions_one_active_per_profile_uidx ON public.presence_sessions USING btree (profile_id) WHERE (active = true);
CREATE INDEX presence_sessions_profile_active_expires_idx ON public.presence_sessions USING btree (profile_id, active, expires_at DESC);
CREATE INDEX presence_sessions_profile_idx ON public.presence_sessions USING btree (profile_id);
CREATE INDEX profile_relationships_addressee_idx ON public.profile_relationships USING btree (addressee_id);
CREATE UNIQUE INDEX profile_relationships_requester_id_addressee_id_relationshi_key ON public.profile_relationships USING btree (requester_id, addressee_id, relationship_type);
CREATE INDEX profile_relationships_requester_idx ON public.profile_relationships USING btree (requester_id);
CREATE INDEX profiles_city_id_idx ON public.profiles USING btree (city_id);
CREATE UNIQUE INDEX profiles_display_name_unique_normalized_idx ON public.profiles USING btree (lower(btrim(display_name))) WHERE ((display_name IS NOT NULL) AND (btrim(display_name) <> ''::text));
CREATE INDEX profiles_user_id_idx ON public.profiles USING btree (user_id);
CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id);
CREATE UNIQUE INDEX push_tokens_profile_id_token_key ON public.push_tokens USING btree (profile_id, token);
CREATE UNIQUE INDEX reports_one_reporter_per_target_uidx ON public.reports USING btree (reporter_id, target_type, target_id) WHERE ((reporter_id IS NOT NULL) AND (target_type IS NOT NULL) AND (target_id IS NOT NULL));
CREATE INDEX reports_target_idx ON public.reports USING btree (target_type, target_id);
CREATE INDEX service_recommendations_city_type_idx ON public.service_recommendations USING btree (city_id, service_type);
CREATE INDEX sponsored_slots_active_idx ON public.sponsored_slots USING btree (placement, status, starts_at, ends_at);
CREATE UNIQUE INDEX supporter_entitlements_profile_id_entitlement_source_key ON public.supporter_entitlements USING btree (profile_id, entitlement, source);
CREATE UNIQUE INDEX walk_plan_participants_walk_plan_id_profile_id_key ON public.walk_plan_participants USING btree (walk_plan_id, profile_id);
CREATE UNIQUE INDEX walk_plans_one_active_per_owner_uidx ON public.walk_plans USING btree (owner_id) WHERE (active = true);
CREATE INDEX walk_plans_owner_active_starts_idx ON public.walk_plans USING btree (owner_id, active, starts_at DESC);
CREATE INDEX walk_plans_starts_at_idx ON public.walk_plans USING btree (starts_at);

