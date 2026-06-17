// ─────────────────────────────────────────────────────────────
// Large context generator (~550KB JSON)
// ─────────────────────────────────────────────────────────────

export function generateLargeContext(): Record<string, unknown> {
  const tables: Record<string, unknown>[] = [];
  const domains = ["user_management", "billing", "analytics", "agent_ops"];
  const columnTypes = [
    "uuid",
    "varchar(255)",
    "text",
    "integer",
    "bigint",
    "boolean",
    "timestamp with time zone",
    "jsonb",
    "float8",
    "inet",
    "cidr",
    "macaddr",
    "bytea",
    "numeric(12,4)",
    "interval",
  ];
  const constraintTypes = [
    "NOT NULL",
    "UNIQUE",
    "CHECK",
    "DEFAULT",
    "REFERENCES",
  ];
  const indexTypes = ["btree", "hash", "gin", "gist", "brin"];

  for (let i = 0; i < 64; i++) {
    const domain = domains[i % domains.length];
    const tableName = `${domain}_table_${i}`;
    const columns: Record<string, unknown>[] = [];
    const numColumns = 10 + (i % 8); // 10-17 columns per table

    for (let c = 0; c < numColumns; c++) {
      const colNames = [
        "id",
        "name",
        "status",
        "created_at",
        "updated_at",
        "value",
        "ref_id",
        "metadata",
        "score",
        "flags",
        "email",
        "config",
        "payload",
        "version",
        "checksum",
        "priority",
        "tags",
      ];
      const colDescriptions = [
        "primary key used for unique row identification across all foreign references",
        "human-readable display name, indexed for full-text search with pg_trgm extension",
        "current lifecycle status tracked via state machine transitions in the application layer",
        "timestamp of initial record creation, auto-populated by database trigger on insert",
        "timestamp of most recent modification, auto-updated by before-update trigger",
        "computed aggregate value derived from downstream analytics pipeline runs",
        "foreign key reference to the parent entity, cascades on delete per domain policy",
        "schemaless JSON metadata blob for extensible attributes not covered by typed columns",
        "normalized numeric score between 0.0 and 1.0 used for ranking and threshold filtering",
        "bitwise integer flags encoding boolean feature toggles (see docs/flags.md for bitmap)",
        "verified email address with uniqueness constraint, validated by application-level regex",
        "JSON configuration object merged with domain defaults at read time by the config service",
        "binary or JSON payload stored as the primary content body of this record type",
        "monotonically increasing version counter for optimistic concurrency control",
        "SHA-256 checksum of the payload column used for deduplication and integrity verification",
        "integer priority level (0=critical, 1=high, 2=normal, 3=low) used by the job scheduler",
        "array of string tags for categorical filtering, indexed with GIN for containment queries",
      ];

      const indices: Record<string, unknown>[] = [];
      if (c < 3 || c % 4 === 0) {
        indices.push({
          name: `idx_${tableName}_${colNames[c % colNames.length]}`,
          type: indexTypes[c % indexTypes.length],
          unique: c === 0,
          partial: c > 5 ? `WHERE status != 'archived'` : null,
          size_mb: Math.round((10 + Math.random() * 200) * 100) / 100,
        });
      }

      const constraints: Record<string, unknown>[] = [];
      if (c === 0) constraints.push({ type: "PRIMARY KEY" });
      if (c < 3) constraints.push({ type: "NOT NULL" });
      if (c % 6 === 0 && c > 0) {
        constraints.push({
          type: "REFERENCES",
          target_table: `${domains[(i + 1) % domains.length]}_table_${(i + c) % 64}`,
          target_column: "col_0_id",
          on_delete: c % 2 === 0 ? "CASCADE" : "SET NULL",
        });
      }

      columns.push({
        name: `col_${c}_${colNames[c % colNames.length]}`,
        type: columnTypes[c % columnTypes.length],
        nullable: c > 2,
        default_value:
          c === 3 ? "now()" : c === 4 ? "now()" : c === 13 ? "1" : null,
        indices,
        constraints,
        statistics: {
          null_fraction:
            c > 2 ? Math.round(Math.random() * 0.3 * 1000) / 1000 : 0,
          avg_width_bytes: 8 + (c % 5) * 32,
          n_distinct:
            c === 2
              ? 6
              : c === 0
                ? -1
                : Math.floor(100 + Math.random() * 50000),
          most_common_vals:
            c === 2
              ? [
                  "active",
                  "inactive",
                  "pending",
                  "archived",
                  "suspended",
                  "deleted",
                ]
              : null,
          correlation: Math.round((Math.random() * 2 - 1) * 1000) / 1000,
        },
        description: `${colDescriptions[c % colDescriptions.length]} This column was introduced in migration ${20230100 + i * 10 + c} and is actively used by ${1 + (c % 4)} downstream services. Average query frequency: ${Math.floor(100 + Math.random() * 5000)} reads/sec, ${Math.floor(1 + Math.random() * 200)} writes/sec.`,
      });
    }

    const relationships: Record<string, unknown>[] = [];
    if (i > 0 && i % 3 === 0) {
      relationships.push({
        type: "belongs_to",
        target: `${domains[(i - 1) % domains.length]}_table_${i - 1}`,
        foreign_key: "col_0_id",
        on_delete: "CASCADE",
        cardinality: "many-to-one",
        join_frequency_per_sec: Math.floor(50 + Math.random() * 500),
      });
    }
    if (i % 5 === 0 && i < 40) {
      relationships.push({
        type: "has_many",
        target: `${domains[(i + 3) % domains.length]}_table_${i + 3}`,
        through: null,
        cardinality: "one-to-many",
        avg_children: Math.floor(3 + Math.random() * 50),
      });
    }
    if (i % 7 === 0) {
      relationships.push({
        type: "many_to_many",
        target: `${domains[(i + 2) % domains.length]}_table_${(i + 2) % 64}`,
        through: `join_${tableName}_${(i + 2) % 64}`,
        cardinality: "many-to-many",
      });
    }

    // Sample data (3 rows) to make the context more realistic
    const sampleRows: Record<string, unknown>[] = [];
    for (let r = 0; r < 3; r++) {
      const row: Record<string, unknown> = {};
      for (let c = 0; c < Math.min(numColumns, 8); c++) {
        const colNames = [
          "id",
          "name",
          "status",
          "created_at",
          "updated_at",
          "value",
          "ref_id",
          "metadata",
        ];
        const key = `col_${c}_${colNames[c]}`;
        if (c === 0)
          row[key] =
            `${tableName}_${r}_${Math.random().toString(36).slice(2, 10)}`;
        else if (c === 1)
          row[key] =
            `Sample ${domain} record ${r} with extended name for display`;
        else if (c === 2) row[key] = ["active", "inactive", "pending"][r];
        else if (c === 3 || c === 4)
          row[key] = new Date(2025, 0, 1 + r * 30).toISOString();
        else if (c === 5) row[key] = Math.round(Math.random() * 10000) / 100;
        else if (c === 6)
          row[key] =
            `ref_${(i + r) % 64}_${Math.random().toString(36).slice(2, 8)}`;
        else if (c === 7)
          row[key] = {
            source: domain,
            version: r + 1,
            tags: ["auto", "generated"],
          };
      }
      sampleRows.push(row);
    }

    tables.push({
      name: tableName,
      schema: "public",
      domain,
      columns,
      relationships,
      sample_data: sampleRows,
      row_count_estimate: 1000 + i * 5000,
      dead_tuple_count: Math.floor(Math.random() * 500),
      avg_row_size_bytes: 128 + (i % 20) * 64,
      total_size_mb:
        Math.round((10 + i * 50 + Math.random() * 500) * 100) / 100,
      index_size_mb: Math.round((5 + i * 10 + Math.random() * 100) * 100) / 100,
      toast_size_mb:
        i % 3 === 0 ? Math.round(Math.random() * 200 * 100) / 100 : 0,
      last_vacuum: "2025-09-15T03:00:00Z",
      last_analyze: "2025-09-15T03:15:00Z",
      autovacuum_enabled: true,
      has_rls: i % 4 === 0,
      rls_policies:
        i % 4 === 0 ? [`policy_${domain}_read`, `policy_${domain}_write`] : [],
      partitioned: i % 8 === 0,
      partition_key: i % 8 === 0 ? "created_at" : null,
      partition_strategy: i % 8 === 0 ? "RANGE" : null,
      triggers:
        i % 6 === 0
          ? [
              {
                name: `trg_${tableName}_audit`,
                timing: "AFTER",
                events: ["INSERT", "UPDATE", "DELETE"],
                function: `fn_audit_${domain}`,
              },
            ]
          : [],
      description: `Table ${i} in the ${domain} domain. Manages ${["core entities and their lifecycle states", "financial transaction records and payment ledger entries", "user behavior event logs and clickstream analytics", "agent runtime configuration and execution state"][i % 4]} for the ${domain.replace(/_/g, " ")} subsystem. Created during the ${["initial migration (2023-01)", "v2 schema update (2023-06)", "Q2 refactor (2024-04)", "performance optimization sprint (2024-09)"][i % 4]} phase. Primary consumers: ${["auth-service, user-api, admin-dashboard", "billing-service, invoice-generator, tax-engine", "analytics-pipeline, reporting-api, data-warehouse-sync", "agent-runtime, orchestrator, context-engine"][i % 4]}. SLA: ${["p99 < 50ms read, < 100ms write", "p99 < 200ms (batch), < 50ms (single)", "p99 < 500ms (analytical), < 100ms (realtime)", "p99 < 30ms read, < 80ms write"][i % 4]}.`,
    });
  }

  return {
    schema_version: "4.7.2",
    database: "alchemyst_production",
    engine: "PostgreSQL 16.1",
    total_tables: tables.length,
    total_size_gb: 234.7,
    total_index_size_gb: 67.3,
    active_connections: 142,
    max_connections: 500,
    domains,
    extensions: [
      "pg_trgm",
      "uuid-ossp",
      "pgcrypto",
      "postgis",
      "pg_stat_statements",
      "hstore",
    ],
    replication: { mode: "streaming", replicas: 2, lag_bytes: 1024 },
    backup: {
      last_full: "2025-09-14T02:00:00Z",
      last_incremental: "2025-09-15T02:00:00Z",
      retention_days: 30,
    },
    tables,
  };
}
