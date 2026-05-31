-- Rating must be 1-5
ALTER TABLE ratings 
  DROP CONSTRAINT IF EXISTS ratings_stars_check,
  ADD CONSTRAINT ratings_stars_check 
    CHECK (stars BETWEEN 1 AND 5);

ALTER TABLE ratings
  DROP CONSTRAINT IF EXISTS ratings_on_time_check,
  ADD CONSTRAINT ratings_on_time_check 
    CHECK (on_time BETWEEN 1 AND 5);

ALTER TABLE ratings
  DROP CONSTRAINT IF EXISTS ratings_car_check,  
  ADD CONSTRAINT ratings_car_check 
    CHECK (car BETWEEN 1 AND 5);

ALTER TABLE ratings
  DROP CONSTRAINT IF EXISTS ratings_manners_check,
  ADD CONSTRAINT ratings_manners_check 
    CHECK (manners BETWEEN 1 AND 5);

-- Seats must be 1-8
ALTER TABLE passenger_requests
  DROP CONSTRAINT IF EXISTS seats_check,
  ADD CONSTRAINT seats_check 
    CHECK (seats BETWEEN 1 AND 8);

-- Status must be valid values
ALTER TABLE passenger_requests
  DROP CONSTRAINT IF EXISTS valid_status,
  ADD CONSTRAINT valid_status
    CHECK (status IN (
      'active', 'confirmed', 'cancelled', 'completed'
    ));
