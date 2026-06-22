-- BauBook 0.7.0 - Contact requests Edge Function grants.
-- The contact-request Edge Function writes through PostgREST using service_role.
-- It needs SELECT for return=representation, INSERT for saving, UPDATE for email status.

grant usage on schema public to service_role;

grant select, insert, update
on public.contact_requests
to service_role;