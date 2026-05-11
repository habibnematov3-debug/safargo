create or replace function public.update_driver_rating()
returns trigger as $$
declare
  avg_stars numeric;
  trip_count int;
begin
  select
    avg(stars)::numeric(3,1),
    count(*)::int
  into avg_stars, trip_count
  from public.ratings
  where driver_id = NEW.driver_id;

  update public.driver_profiles
  set
    rating_avg = avg_stars,
    rating_trips = trip_count
  where id = NEW.driver_id;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists on_rating_inserted on public.ratings;

create trigger on_rating_inserted
after insert on public.ratings
for each row
execute function public.update_driver_rating();
