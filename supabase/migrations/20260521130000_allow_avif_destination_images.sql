-- Allow AVIF uploads on existing trip-destination-images buckets.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'trip-destination-images';
