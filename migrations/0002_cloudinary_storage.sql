-- Metadados necessários para armazenar arquivos no Cloudinary sem R2.
-- object_key/avatar_key/banner_key passam a guardar o public_id do Cloudinary.
ALTER TABLE profiles ADD COLUMN avatar_format TEXT;
ALTER TABLE profiles ADD COLUMN banner_format TEXT;

ALTER TABLE course_files ADD COLUMN resource_type TEXT NOT NULL DEFAULT 'image'
  CHECK (resource_type IN ('image', 'raw'));
ALTER TABLE course_files ADD COLUMN delivery_type TEXT NOT NULL DEFAULT 'authenticated'
  CHECK (delivery_type = 'authenticated');
ALTER TABLE course_files ADD COLUMN format TEXT NOT NULL DEFAULT '';
ALTER TABLE course_files ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
