-- 018 - Custom theme intensity is permanently stored as 0-100 percent.
update public.user_settings
set custom_theme = jsonb_set(
  jsonb_set(custom_theme, '{intensity}', to_jsonb(round(((((custom_theme->>'intensity')::numeric - 0.3) / 1.1) * 100))::integer), true),
  '{schemaVersion}', '2'::jsonb, true
)
where jsonb_typeof(custom_theme) = 'object'
  and coalesce(custom_theme->>'schemaVersion', '') <> '2'
  and coalesce(custom_theme->>'intensity', '') ~ '^[0-9]+(\.[0-9]+)?$'
  and (custom_theme->>'intensity')::numeric between 0.3 and 2;

update public.user_settings
set custom_theme = jsonb_set(custom_theme, '{schemaVersion}', '2'::jsonb, true)
where jsonb_typeof(custom_theme) = 'object'
  and coalesce(custom_theme->>'schemaVersion', '') <> '2';
