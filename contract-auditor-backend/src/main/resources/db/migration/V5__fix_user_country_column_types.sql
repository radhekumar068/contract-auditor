-- V4 added CHAR columns with DEFAULT 'IN'/'INR'. Hibernate validate expects VARCHAR,
-- and the column default would also apply to new inserts. Convert types, keep existing
-- rows as India/INR, and drop the insert default so new users must supply country.
ALTER TABLE users
    MODIFY COLUMN country_code VARCHAR(2) NOT NULL;

ALTER TABLE users
    MODIFY COLUMN preferred_currency VARCHAR(3) NOT NULL;
