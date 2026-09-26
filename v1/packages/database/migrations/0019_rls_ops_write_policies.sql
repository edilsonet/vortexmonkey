-- ============================================================
-- VORTEX — Fix: políticas RLS de escrita no schema ops
-- As migrações 0016/0017/0018 ativaram RLS (FORCE) nas tabelas ops
-- criando apenas políticas SELECT. Com RLS habilitado e sem política
-- de INSERT/UPDATE, o PostgreSQL aplica DEFAULT DENY: toda escrita do
-- vortex_app (NOBYPASSRLS) falhava com "new row violates row-level
-- security policy". Esta migração adiciona as políticas de escrita
-- ausentes, seguindo o mesmo padrão das demais políticas do projeto.
-- ============================================================

-- ── Fase 5 (0016): Manutenção (RBAC 43/145) ──────────────────
CREATE POLICY mo_insert ON ops.maintenance_organizations FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY mo_update ON ops.maintenance_organizations FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY mop_insert ON ops.maintenance_organization_personnel FOR INSERT WITH CHECK (organization_id IN (SELECT id FROM ops.maintenance_organizations));
CREATE POLICY mop_update ON ops.maintenance_organization_personnel FOR UPDATE USING (organization_id IN (SELECT id FROM ops.maintenance_organizations)) WITH CHECK (organization_id IN (SELECT id FROM ops.maintenance_organizations));
CREATE POLICY aircraft_insert ON ops.aircraft FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY aircraft_update ON ops.aircraft FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY logbooks_insert ON ops.aircraft_logbooks FOR INSERT WITH CHECK (aircraft_id IN (SELECT id FROM ops.aircraft));
CREATE POLICY logbooks_update ON ops.aircraft_logbooks FOR UPDATE USING (aircraft_id IN (SELECT id FROM ops.aircraft)) WITH CHECK (aircraft_id IN (SELECT id FROM ops.aircraft));
CREATE POLICY wo_insert ON ops.work_orders FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY wo_update ON ops.work_orders FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY wo_tasks_insert ON ops.work_order_tasks FOR INSERT WITH CHECK (work_order_id IN (SELECT id FROM ops.work_orders));
CREATE POLICY wo_tasks_update ON ops.work_order_tasks FOR UPDATE USING (work_order_id IN (SELECT id FROM ops.work_orders)) WITH CHECK (work_order_id IN (SELECT id FROM ops.work_orders));
CREATE POLICY parts_insert ON ops.parts_inventory FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY parts_update ON ops.parts_inventory FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY tools_insert ON ops.tools FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY tools_update ON ops.tools FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY ndt_insert ON ops.non_destructive_tests FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY ad_insert ON ops.airworthiness_directives FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY ad_update ON ops.airworthiness_directives FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));

-- ── Fase 6 (0017): Operadores (RBAC 91/119/121/135/137) ───────
CREATE POLICY air_operators_insert ON ops.air_operators FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY air_operators_update ON ops.air_operators FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY fleet_insert ON ops.operator_fleet FOR INSERT WITH CHECK (operator_id IN (SELECT id FROM ops.air_operators));
CREATE POLICY fleet_update ON ops.operator_fleet FOR UPDATE USING (operator_id IN (SELECT id FROM ops.air_operators)) WITH CHECK (operator_id IN (SELECT id FROM ops.air_operators));
CREATE POLICY mel_items_insert ON ops.mel_items FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY mel_items_update ON ops.mel_items FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY logbook_insert ON ops.logbook_entries FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY logbook_update ON ops.logbook_entries FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY dispatch_insert ON ops.dispatch_releases FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY dispatch_update ON ops.dispatch_releases FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY manuals_insert ON ops.operational_manuals FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY manuals_update ON ops.operational_manuals FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY agri_operators_insert ON ops.agri_operators FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY agri_operators_update ON ops.agri_operators FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY dispersers_insert ON ops.dispersers FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY dispersers_update ON ops.dispersers FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));

-- ── Fase 7 (0018): Instrução (RBAC 141/142) e Aeródromos (RBAC 153) ──
CREATE POLICY training_centers_insert ON ops.training_centers FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY training_centers_update ON ops.training_centers FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY training_documents_insert ON ops.training_documents FOR INSERT WITH CHECK (center_id IN (SELECT id FROM ops.training_centers));
CREATE POLICY training_documents_update ON ops.training_documents FOR UPDATE USING (center_id IN (SELECT id FROM ops.training_centers)) WITH CHECK (center_id IN (SELECT id FROM ops.training_centers));
CREATE POLICY students_insert ON ops.students FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY students_update ON ops.students FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY student_records_insert ON ops.student_records FOR INSERT WITH CHECK (student_id IN (SELECT id FROM ops.students));
CREATE POLICY student_records_update ON ops.student_records FOR UPDATE USING (student_id IN (SELECT id FROM ops.students)) WITH CHECK (student_id IN (SELECT id FROM ops.students));
CREATE POLICY fstd_insert ON ops.fstd_devices FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY fstd_update ON ops.fstd_devices FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY instructors_insert ON ops.instructors FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY instructors_update ON ops.instructors FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY aerodromes_insert ON ops.aerodromes FOR INSERT WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY aerodromes_update ON ops.aerodromes FOR UPDATE USING (tenant_id IN (SELECT identity.current_tenant_ids())) WITH CHECK (tenant_id IN (SELECT identity.current_tenant_ids()));
CREATE POLICY runway_pavement_insert ON ops.runway_pavement FOR INSERT WITH CHECK (aerodrome_id IN (SELECT id FROM ops.aerodromes));
CREATE POLICY runway_pavement_update ON ops.runway_pavement FOR UPDATE USING (aerodrome_id IN (SELECT id FROM ops.aerodromes)) WITH CHECK (aerodrome_id IN (SELECT id FROM ops.aerodromes));
CREATE POLICY rcr_insert ON ops.runway_condition_reports FOR INSERT WITH CHECK (aerodrome_id IN (SELECT id FROM ops.aerodromes));
CREATE POLICY rcr_update ON ops.runway_condition_reports FOR UPDATE USING (aerodrome_id IN (SELECT id FROM ops.aerodromes)) WITH CHECK (aerodrome_id IN (SELECT id FROM ops.aerodromes));
CREATE POLICY fire_response_insert ON ops.fire_response_logs FOR INSERT WITH CHECK (aerodrome_id IN (SELECT id FROM ops.aerodromes));
CREATE POLICY fire_response_update ON ops.fire_response_logs FOR UPDATE USING (aerodrome_id IN (SELECT id FROM ops.aerodromes)) WITH CHECK (aerodrome_id IN (SELECT id FROM ops.aerodromes));
CREATE POLICY fauna_insert ON ops.fauna_events FOR INSERT WITH CHECK (aerodrome_id IN (SELECT id FROM ops.aerodromes));
CREATE POLICY fauna_update ON ops.fauna_events FOR UPDATE USING (aerodrome_id IN (SELECT id FROM ops.aerodromes)) WITH CHECK (aerodrome_id IN (SELECT id FROM ops.aerodromes));