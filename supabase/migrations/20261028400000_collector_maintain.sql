-- The collector refreshes planner statistics after each run that wrote data (stale counts
-- after bulk COPY loads made the profile's attendance query hit the site's timeout).
-- Postgres 17: MAINTAIN allows ANALYZE without owning the tables.
grant maintain on all tables in schema core to cobra_collector;
alter default privileges in schema core grant maintain on tables to cobra_collector;
