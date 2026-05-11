alter table public.users
  add column if not exists telegram_chat_id text;

alter table public.driver_profiles
  add column if not exists phone text;

create index if not exists users_telegram_chat_id_idx
  on public.users (telegram_chat_id);

create index if not exists users_driver_district_idx
  on public.users (district_id)
  where role = 'driver';

comment on column public.users.telegram_chat_id is
  'Telegram private chat id. For Mini App private chats this is the Telegram user id as text.';

comment on column public.driver_profiles.phone is
  'Driver phone shown to passenger after a ride is confirmed.';
