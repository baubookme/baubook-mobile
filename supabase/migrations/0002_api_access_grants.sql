-- BauBook! 1.6.0
-- Grant API privileges required by Supabase PostgREST.
-- RLS policies in 0001 still decide what each role can actually see/change.
-- Run this once in Supabase SQL Editor after 0001_initial_schema.sql and the seed.

grant usage on schema public to anon, authenticated;

-- Public read surfaces used by the app before login.
grant select on table
  public.cities,
  public.city_areas,
  public.feature_flags,
  public.app_config,
  public.knowledge_cards,
  public.places,
  public.place_reviews,
  public.profiles,
  public.dogs,
  public.dog_media,
  public.dog_food_preferences,
  public.dog_relationships,
  public.community_events,
  public.presence_sessions,
  public.walk_plans,
  public.service_recommendations,
  public.lost_dog_alerts,
  public.danger_reports
  to anon, authenticated;

-- Authenticated user operations. RLS keeps these scoped to the current profile/dog.
grant insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.dogs to authenticated;
grant select, insert, update, delete on table public.dog_media to authenticated;
grant select, insert, update, delete on table public.dog_food_preferences to authenticated;
grant insert on table public.places to authenticated;
grant select, insert, update, delete on table public.place_reviews to authenticated;
grant select, insert, update, delete on table public.profile_relationships to authenticated;
grant select, insert, update, delete on table public.dog_relationships to authenticated;
grant select, insert, update, delete on table public.community_events to authenticated;
grant select, insert, update, delete on table public.community_event_participants to authenticated;
grant select, insert, update, delete on table public.presence_sessions to authenticated;
grant select, insert, update, delete on table public.walk_plans to authenticated;
grant select, insert, update, delete on table public.walk_plan_participants to authenticated;
grant select, insert, update, delete on table public.service_recommendations to authenticated;
grant select, insert, update, delete on table public.lost_dog_alerts to authenticated;
grant select, insert on table public.lost_dog_sightings to authenticated;
grant select, insert, update, delete on table public.danger_reports to authenticated;
grant select, insert on table public.reports to authenticated;
grant select, insert, update, delete on table public.blocks to authenticated;
grant select, insert, update, delete on table public.push_tokens to authenticated;
grant select on table public.supporter_entitlements to authenticated;

-- Keep moderator-only tables without client grants:
-- moderation_actions, user_suspensions, content_removals, audit_logs, alert_notifications.
