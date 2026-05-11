-- Add video and audio to message_type enum
alter type public.message_type add value if not exists 'video';
alter type public.message_type add value if not exists 'audio';
