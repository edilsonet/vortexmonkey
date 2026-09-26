ALTER TABLE protocol.protocol_views ADD COLUMN owner_company_id uuid REFERENCES identity.companies(id);
UPDATE protocol.protocol_views view_row
SET owner_company_id = protocol_row.company_id
FROM protocol.protocols protocol_row
WHERE protocol_row.id = view_row.protocol_id;
ALTER TABLE protocol.protocol_views ALTER COLUMN owner_company_id SET NOT NULL;
CREATE UNIQUE INDEX uq_protocol_pending_view ON protocol.protocol_views(protocol_id, requested_by) WHERE status='PENDING';

DROP POLICY timeline_select ON protocol.timeline_events;
CREATE POLICY timeline_select ON protocol.timeline_events FOR SELECT USING (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND protocol_id IN (SELECT id FROM protocol.protocols)
  AND (
    access_level = 'PUBLIC'
    OR created_by = identity.current_user_id()
    OR (access_level = 'RESTRICTED' AND company_id = identity.current_company_id())
    OR EXISTS (
      SELECT 1 FROM protocol.protocol_views v
      WHERE v.protocol_id = timeline_events.protocol_id
        AND v.requested_by = identity.current_user_id()
        AND v.status = 'GRANTED'
        AND v.granted_until > now()
    )
  )
);

DROP POLICY views_select ON protocol.protocol_views;
CREATE POLICY views_select ON protocol.protocol_views FOR SELECT USING (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND (requested_by = identity.current_user_id() OR owner_company_id = identity.current_company_id())
);

DROP POLICY views_update ON protocol.protocol_views;
CREATE POLICY views_update ON protocol.protocol_views FOR UPDATE USING (
  tenant_id IN (SELECT identity.current_tenant_ids()) AND owner_company_id = identity.current_company_id()
) WITH CHECK (
  tenant_id IN (SELECT identity.current_tenant_ids()) AND owner_company_id = identity.current_company_id()
);
