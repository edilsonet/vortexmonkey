SELECT schema_name
FROM information_schema.schemata
WHERE schema_name IN ('identity','ledger','protocol','documents','catalog','subscriptions','oauth','signatures','compliance','notifications')
ORDER BY 1;

SELECT namespace.nspname || '.' || relation.relname || ':rls=' || relation.relrowsecurity || ':forced=' || relation.relforcerowsecurity
FROM pg_class relation
JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname IN ('identity','ledger') AND relation.relkind IN ('r','p')
ORDER BY 1;

SELECT name FROM public.schema_migrations ORDER BY name;
