CREATE FUNCTION ledger.validate_deferred_reference()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ledger, pg_temp AS $$
BEGIN
  IF NEW.ledger_block_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM ledger.ledger_blocks block WHERE block.id = NEW.ledger_block_id
  ) THEN
    RAISE EXCEPTION 'Referência ao ledger inexistente: %', NEW.ledger_block_id USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER profile_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON identity.professional_profiles
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();

CREATE CONSTRAINT TRIGGER license_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON identity.licenses
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();

CREATE CONSTRAINT TRIGGER accreditation_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON identity.accreditations
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();

CREATE CONSTRAINT TRIGGER relationship_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON identity.relationships
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
