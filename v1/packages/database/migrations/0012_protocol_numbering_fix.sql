CREATE OR REPLACE FUNCTION protocol.next_protocol_number()
RETURNS TABLE(year integer, sequence bigint, protocol_number varchar)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = protocol, pg_temp AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM timezone('UTC', now()))::integer;
  v_sequence bigint;
BEGIN
  INSERT INTO protocol.sequences AS sequence_row(year, last_sequence)
  VALUES (v_year, 1)
  ON CONFLICT ON CONSTRAINT sequences_pkey
  DO UPDATE SET last_sequence = sequence_row.last_sequence + 1
  RETURNING sequence_row.last_sequence INTO v_sequence;
  IF v_sequence > 999999 THEN
    RAISE EXCEPTION 'Limite anual de protocolos atingido para %.', v_year USING ERRCODE = '22003';
  END IF;
  RETURN QUERY SELECT v_year, v_sequence, format('%s-%s', v_year, lpad(v_sequence::text, 6, '0'))::varchar;
END;
$$;
