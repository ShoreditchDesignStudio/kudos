-- Lower the message-length cap from 2000 to 320 chars to match the slide
-- layout — anything longer overflows the quote block in Cabinet Grotesk
-- Bold 64px. MESSAGE_MAX in lib/wins.ts already enforces 320 at the
-- application layer.
--
-- ⚠️  BLOCKED: this will FAIL until 3 legacy rows are shortened. They were
-- written before the app-level cap existed and are still in the data:
--
--   7c742786…  2026-04-24  331 chars
--   7f94f756…  2026-04-24  420 chars
--   b54dee3b…  2026-04-24  510 chars
--
-- Find them with:
--   select id, week_start_date, char_length(btrim(message)) as len
--     from wins where char_length(btrim(message)) > 320 order by len desc;
--
-- Shorten those three by hand (they are real messages from the team — do not
-- blind-truncate), then apply this file.

alter table wins drop constraint if exists wins_message_length;

alter table wins
  add constraint wins_message_length
  check (char_length(btrim(message)) between 1 and 320);
