-- ============================================
-- Migration 004: Add super_admin role
-- ============================================

-- 1. Update CHECK constraint on users.role
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'courier', 'super_admin'));

-- 2. Add RLS policies for super_admin

-- USERS: super_admin full access
CREATE POLICY "super_admin_full_users" ON users
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

-- BUSINESS_CONFIG: super_admin full access
CREATE POLICY "super_admin_full_business_config" ON business_config
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

-- AUDIT_LOG: super_admin read-only
CREATE POLICY "super_admin_read_audit_log" ON audit_log
  FOR SELECT TO authenticated
  USING (get_user_role() = 'super_admin');

-- 3. Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies for logos bucket
CREATE POLICY "super_admin_upload_logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND get_user_role() = 'super_admin');

CREATE POLICY "super_admin_update_logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'logos' AND get_user_role() = 'super_admin');

CREATE POLICY "super_admin_delete_logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos' AND get_user_role() = 'super_admin');

CREATE POLICY "public_read_logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'logos');
