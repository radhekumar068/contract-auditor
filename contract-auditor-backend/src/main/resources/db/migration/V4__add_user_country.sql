ALTER TABLE users
    ADD COLUMN country_code CHAR(2) NOT NULL DEFAULT 'IN';

ALTER TABLE users
    ADD COLUMN preferred_currency CHAR(3) NOT NULL DEFAULT 'INR';

UPDATE contract_terms
SET currency = 'INR'
WHERE currency = 'USD';
