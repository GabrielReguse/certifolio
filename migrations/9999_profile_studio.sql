-- Profile Studio: banner composition controls.
-- The migration is intentionally additive and keeps existing profiles unchanged.
ALTER TABLE profiles ADD COLUMN banner_position_x INTEGER NOT NULL DEFAULT 50;
ALTER TABLE profiles ADD COLUMN banner_position_y INTEGER NOT NULL DEFAULT 50;
ALTER TABLE profiles ADD COLUMN banner_zoom INTEGER NOT NULL DEFAULT 100;
