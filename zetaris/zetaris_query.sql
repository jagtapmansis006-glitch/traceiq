-- TraceIQ: Zetaris query (PREPARED, NOT RUN)
-- Status: not executed. No Zetaris access in the hackathon (Zetaris is paid / AWS-linked).
-- Purpose: show how many incidents each service has, so repeat-offender services stand out.

-- 1) Table that would be uploaded (the 4 sample incidents)
CREATE TABLE incidents (
  incident_id VARCHAR(10),
  service     VARCHAR(50)
);

INSERT INTO incidents (incident_id, service) VALUES
  ('INC-001', 'checkout-service'),
  ('INC-002', 'auth-service'),
  ('INC-003', 'payment-service'),
  ('INC-004', 'api-gateway');

-- 2) The query that would be run
SELECT service,
       COUNT(*) AS incident_count
FROM incidents
GROUP BY service
ORDER BY incident_count DESC, service ASC;
