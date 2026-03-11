ALTER TABLE users ADD COLUMN newsletter_promos BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN newsletter_collections BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN newsletter_projects BOOLEAN NOT NULL DEFAULT false;
