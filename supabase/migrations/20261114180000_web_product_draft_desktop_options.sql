-- Add the desktop-required inventory and unit preparation fields without
-- modifying or publishing live products. Existing drafts remain valid.
alter table public.web_product_drafts
  add column desktop_options jsonb not null default '{}'::jsonb
  check(jsonb_typeof(desktop_options)='object' and
        pg_column_size(desktop_options)<=4096);
-- This check intentionally allows older drafts with {} until their author
-- chooses and confirms desktop options in the editor.
