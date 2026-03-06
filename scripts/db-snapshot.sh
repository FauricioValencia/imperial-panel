#!/bin/bash
# ============================================
# db-snapshot.sh
# Genera un snapshot completo del esquema de la base de datos en Supabase
# Incluye: tablas, columnas, policies, functions, triggers, indices
#
# Uso:
#   ./scripts/db-snapshot.sh
#
# Requisitos:
#   - Supabase CLI instalado (brew install supabase/tap/supabase)
#   - Estar linkeado al proyecto: supabase link --project-ref <ref>
#   - O tener SUPABASE_DB_URL en .env.local
# ============================================

set -e

OUTPUT_DIR="docs"
OUTPUT_FILE="$OUTPUT_DIR/DB_SNAPSHOT.md"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Intentar obtener la URL de la DB
if [ -z "$SUPABASE_DB_URL" ]; then
  # Intentar leer de .env.local
  if [ -f .env.local ]; then
    SUPABASE_DB_URL=$(grep '^SUPABASE_DB_URL=' .env.local | cut -d '=' -f2-)
  fi
fi

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "Error: SUPABASE_DB_URL no encontrada."
  echo ""
  echo "Opciones:"
  echo "  1. Agregar SUPABASE_DB_URL=postgresql://... a .env.local"
  echo "  2. Exportar: export SUPABASE_DB_URL=postgresql://..."
  echo "  3. Encontrarlo en: Supabase Dashboard > Settings > Database > Connection string > URI"
  echo ""
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "Generando snapshot de la base de datos..."
echo ""

cat > "$OUTPUT_FILE" << HEADER
# DB Snapshot - Imperial Apps

> Generado automaticamente el $TIMESTAMP
> **NO editar manualmente.** Ejecutar \`./scripts/db-snapshot.sh\` para regenerar.

---

HEADER

# ============================================
# TABLAS Y COLUMNAS
# ============================================
echo ">> Tablas y columnas..."
cat >> "$OUTPUT_FILE" << 'SECTION'
## Tablas y Columnas

SECTION

psql "$SUPABASE_DB_URL" --no-psqlrc -t -A -F '|' << 'SQL' 2>/dev/null | while IFS='|' read -r table_name column_name data_type is_nullable column_default; do
  echo "$table_name|$column_name|$data_type|$is_nullable|$column_default"
SQL
SELECT
  c.table_name,
  c.column_name,
  c.data_type || CASE
    WHEN c.character_maximum_length IS NOT NULL THEN '(' || c.character_maximum_length || ')'
    WHEN c.numeric_precision IS NOT NULL AND c.data_type = 'numeric' THEN '(' || c.numeric_precision || ',' || c.numeric_scale || ')'
    ELSE ''
  END AS data_type,
  c.is_nullable,
  COALESCE(c.column_default, '')
FROM information_schema.columns c
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;

  # Detectar cambio de tabla para crear headers
  if [ "$current_table" != "$table_name" ]; then
    if [ -n "$current_table" ]; then
      echo "" >> "$OUTPUT_FILE"
    fi
    current_table="$table_name"
    echo "### \`$table_name\`" >> "$OUTPUT_FILE"
    echo "| Columna | Tipo | Nullable | Default |" >> "$OUTPUT_FILE"
    echo "|---------|------|----------|---------|" >> "$OUTPUT_FILE"
  fi
  echo "| $column_name | $data_type | $is_nullable | $column_default |" >> "$OUTPUT_FILE"
done

echo "" >> "$OUTPUT_FILE"

# ============================================
# CONSTRAINTS (PKs, FKs, CHECKs, UNIQUEs)
# ============================================
echo ">> Constraints..."
cat >> "$OUTPUT_FILE" << 'SECTION'
---

## Constraints

| Tabla | Constraint | Tipo | Detalle |
|-------|-----------|------|---------|
SECTION

psql "$SUPABASE_DB_URL" --no-psqlrc -t -A -F '|' << 'SQL' 2>/dev/null | while IFS='|' read -r table_name constraint_name constraint_type details; do
  echo "| $table_name | $constraint_name | $constraint_type | $details |" >> "$OUTPUT_FILE"
done
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  CASE
    WHEN tc.constraint_type = 'FOREIGN KEY' THEN
      kcu.column_name || ' -> ' || ccu.table_name || '(' || ccu.column_name || ')'
    WHEN tc.constraint_type = 'CHECK' THEN
      (SELECT pg_get_constraintdef(pg_constraint.oid)
       FROM pg_constraint
       WHERE conname = tc.constraint_name LIMIT 1)
    WHEN tc.constraint_type = 'PRIMARY KEY' THEN
      kcu.column_name
    WHEN tc.constraint_type = 'UNIQUE' THEN
      kcu.column_name
    ELSE ''
  END
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;
SQL

echo "" >> "$OUTPUT_FILE"

# ============================================
# INDICES
# ============================================
echo ">> Indices..."
cat >> "$OUTPUT_FILE" << 'SECTION'
---

## Indices

| Nombre | Tabla | Definicion |
|--------|-------|-----------|
SECTION

psql "$SUPABASE_DB_URL" --no-psqlrc -t -A -F '|' << 'SQL' 2>/dev/null | while IFS='|' read -r index_name table_name indexdef; do
  echo "| $index_name | $table_name | \`$indexdef\` |" >> "$OUTPUT_FILE"
done
SELECT
  i.relname AS index_name,
  t.relname AS table_name,
  pg_get_indexdef(i.oid) AS indexdef
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND NOT ix.indisprimary
ORDER BY t.relname, i.relname;
SQL

echo "" >> "$OUTPUT_FILE"

# ============================================
# RLS POLICIES
# ============================================
echo ">> Policies RLS..."
cat >> "$OUTPUT_FILE" << 'SECTION'
---

## Policies (RLS)

| Tabla | Policy | Comando | Roles | USING | WITH CHECK |
|-------|--------|---------|-------|-------|-----------|
SECTION

psql "$SUPABASE_DB_URL" --no-psqlrc -t -A -F '§' << 'SQL' 2>/dev/null | while IFS='§' read -r tablename policyname cmd roles qual with_check; do
  # Escapar pipes en las expresiones SQL
  qual=$(echo "$qual" | tr '|' '¦')
  with_check=$(echo "$with_check" | tr '|' '¦')
  echo "| $tablename | $policyname | $cmd | $roles | \`$qual\` | \`$with_check\` |" >> "$OUTPUT_FILE"
done
SELECT
  schemaname || '.' || tablename,
  policyname,
  cmd,
  roles::text,
  COALESCE(qual, '—'),
  COALESCE(with_check, '—')
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
SQL

echo "" >> "$OUTPUT_FILE"

# ============================================
# FUNCTIONS
# ============================================
echo ">> Funciones..."
cat >> "$OUTPUT_FILE" << 'SECTION'
---

## Funciones

SECTION

psql "$SUPABASE_DB_URL" --no-psqlrc -t -A -F '§' << 'SQL' 2>/dev/null | while IFS='§' read -r func_name args return_type security body; do
  echo "### \`$func_name($args)\`" >> "$OUTPUT_FILE"
  echo "- **Retorna**: $return_type" >> "$OUTPUT_FILE"
  echo "- **Seguridad**: $security" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo '```sql' >> "$OUTPUT_FILE"
  echo "$body" >> "$OUTPUT_FILE"
  echo '```' >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
done
SELECT
  p.proname,
  pg_get_function_arguments(p.oid),
  pg_get_function_result(p.oid),
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END,
  pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;
SQL

# ============================================
# TRIGGERS
# ============================================
echo ">> Triggers..."
cat >> "$OUTPUT_FILE" << 'SECTION'
---

## Triggers

| Trigger | Tabla | Evento | Funcion |
|---------|-------|--------|---------|
SECTION

psql "$SUPABASE_DB_URL" --no-psqlrc -t -A -F '|' << 'SQL' 2>/dev/null | while IFS='|' read -r trigger_name table_name event_manipulation action_statement; do
  echo "| $trigger_name | $table_name | $event_manipulation | $action_statement |" >> "$OUTPUT_FILE"
done
SELECT
  trigger_name,
  event_object_table,
  string_agg(event_manipulation, ', ' ORDER BY event_manipulation),
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
GROUP BY trigger_name, event_object_table, action_statement
ORDER BY event_object_table, trigger_name;
SQL

echo "" >> "$OUTPUT_FILE"

# ============================================
# RLS STATUS
# ============================================
echo ">> Estado RLS por tabla..."
cat >> "$OUTPUT_FILE" << 'SECTION'
---

## Estado RLS

| Tabla | RLS Habilitado |
|-------|----------------|
SECTION

psql "$SUPABASE_DB_URL" --no-psqlrc -t -A -F '|' << 'SQL' 2>/dev/null | while IFS='|' read -r tablename rls_enabled; do
  status="NO"
  if [ "$rls_enabled" = "t" ]; then status="SI"; fi
  echo "| $tablename | $status |" >> "$OUTPUT_FILE"
done
SELECT
  c.relname,
  c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;
SQL

echo ""
echo "Snapshot generado en: $OUTPUT_FILE"
echo "Fecha: $TIMESTAMP"
