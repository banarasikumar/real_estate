-- Composite B-Tree indexes for property coordinates and geospatial bounding box queries
CREATE INDEX IF NOT EXISTS idx_properties_coordinates ON public.properties (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_properties_status_coordinates ON public.properties (status, latitude, longitude) WHERE deleted_at IS NULL;
