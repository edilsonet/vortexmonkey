CREATE TABLE compliance.regulatory_parameters (
  key text NOT NULL,
  version integer NOT NULL,
  value jsonb NOT NULL,
  legal_reference text NOT NULL,
  effective_from date NOT NULL,
  effective_until date,
  source_document text NOT NULL,
  checksum varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key, version)
);

INSERT INTO compliance.regulatory_parameters(key, version, value, legal_reference, effective_from, source_document, checksum) VALUES
('rbac183.accreditation.validity_days', 1, '1095', 'RBAC 183.15 / IS 183-002', DATE '2026-01-01', 'docs/07-delimitacao.md', encode(digest('1095', 'sha256'), 'hex')),
('rbac183.accreditation.renewal_alert_days', 1, '60', 'RBAC 183.15 / IS 183-002', DATE '2026-01-01', 'docs/07-delimitacao.md', encode(digest('60', 'sha256'), 'hex')),
('rbac183.sdea_provisional.validity_days', 1, '365', 'IS 183-001', DATE '2026-01-01', 'docs/07-delimitacao.md', encode(digest('365', 'sha256'), 'hex')),
('rbac61.pilot.recent_landings', 1, '{"count":3,"window_days":90,"alternative_hours":5}', 'RBAC 61.21', DATE '2026-01-01', 'docs/07-delimitacao.md', encode(digest('{"count":3,"window_days":90,"alternative_hours":5}', 'sha256'), 'hex'));

GRANT SELECT ON compliance.regulatory_parameters TO vortex_app;
