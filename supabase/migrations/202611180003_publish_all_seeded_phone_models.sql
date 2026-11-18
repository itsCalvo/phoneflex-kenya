-- Publish the complete starter catalogue. Admin can edit or unpublish individual records later.
update public.phones set is_published = true, updated_at = now() where is_published = false;