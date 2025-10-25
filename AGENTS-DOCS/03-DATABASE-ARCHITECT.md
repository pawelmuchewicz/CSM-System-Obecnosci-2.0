# 🗄️ DATABASE ARCHITECT AGENT

Ekspert w PostgreSQL, Drizzle ORM, schema design, migrations i query optimization. Optymalizuje bazę danych i performance.

## 📌 Overview

| Aspekt | Szczegóły |
|--------|-----------|
| **Nazwa** | Database Architect |
| **Specjalność** | PostgreSQL, Drizzle ORM, schema design, indexes, query optimization |
| **Włącza się** | `shared/schema.ts`, `server/lib/**/*.ts`, `drizzle.config.ts` |
| **Status** | ✅ Aktywny |
| **ID** | `database-architect` |

## 🎯 Czym się zajmuje?

### 1. **Schema Design**
- Przegląda strukturę tabel
- Analizuje relationships
- Sprawdza normalizację
- Sugeruje lepszy design

### 2. **Index Strategy**
- Identyfikuje missing indexes
- Analizuje query patterns
- Sugeruje composite indexes
- Wspiera performance tuning

### 3. **Query Optimization**
- Przegląda SQL queries
- Identyfikuje slow queries
- Sugeruje join optimization
- Wspiera query refactoring

### 4. **Migration Planning**
- Planuje zmiany schematu
- Wspiera data migration
- Sugeruje safe migrations
- Unika downtime

### 5. **Performance Tuning**
- Analizuje query patterns
- Sugeruje caching strategy
- Wspiera connection pooling
- Optymizuje memory usage

## 🚀 Kiedy go używać?

### Automatycznie włącza się:
- Edytujesz `shared/schema.ts`
- Edytujesz pliki w `server/lib/` (sheets.ts, etc)
- Edytujesz `drizzle.config.ts`

### Jawnie pytaj:
```
"Database Architect, review schema design"
"Czy ta tabela potrzebuje indeksów?"
"Jak zoptymalizować tę query?"
"Planowanie migracji?"
```

## 📊 Twoja Aktualna Struktura

Twoja aplikacja używa:

```
Database: PostgreSQL (Neon)
ORM: Drizzle ORM
Tables (z shared/schema.ts):

1. instructorsAuth
   - id (PK)
   - email (unique)
   - password (bcrypt)
   - groupIds (array)
   - createdAt

2. groupsConfig
   - id (PK)
   - groupId
   - spreadsheetId
   - usersSpreadsheetId
   - active

External Storage: Google Sheets
- Students sheet
- Sessions sheet
- Attendance sheet
```

## 💡 Praktyczne Przykłady

### Przykład 1: Schema Review

Twoja struktura:

```typescript
// shared/schema.ts
export const instructorsAuth = pgTable('instructorsAuth', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique(),
  password: varchar('password', { length: 255 }).notNull(),
  groupIds: text('groupIds').notNull(), // ❌ Problem!
  createdAt: timestamp('createdAt').defaultNow()
});
```

**Pytasz**:
```
"Database Architect, review tego schema.
Widzisz jakieś problemy?"
```

**Agent odpowiada**:
```
Problemy znalezione:

1. ❌ groupIds jako text - storing array jako text string
   - Trudno queryować: WHERE groupIds CONTAINS '123'
   - Type unsafe w aplikacji

2. ❌ Brak updatedAt timestamp
   - Trudno śledzić zmiany

3. ❌ Brak indexów
   - email ma unique() - OK
   - Ale brak indexu na groupIds lookup

4. ❌ password w plaintext w schema - powinno być hashed

Rekomendacje:

export const instructorsAuth = pgTable('instructorsAuth', {
  id: serial('id').primaryKey(),

  email: varchar('email', { length: 255 })
    .unique()
    .notNull(),

  passwordHash: varchar('passwordHash', { length: 255 })
    .notNull(), // ← Jasne że to hashed

  // ← Oddzielna tabela dla groups!

  createdAt: timestamp('createdAt', { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updatedAt', { withTimezone: true })
    .defaultNow()
    .notNull()
});

// Oddzielna tabela dla relationships
export const instructorGroups = pgTable(
  'instructorGroups',
  {
    id: serial('id').primaryKey(),
    instructorId: integer('instructorId')
      .references(() => instructorsAuth.id, { onDelete: 'cascade' })
      .notNull(),
    groupId: varchar('groupId', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).default('instructor'),
    createdAt: timestamp('createdAt').defaultNow()
  },
  (table) => ({
    // Indexes
    instructorGroupIdx: index('idx_instructor_groups_instructor_id')
      .on(table.instructorId),
    groupIdx: index('idx_instructor_groups_group_id')
      .on(table.groupId)
  })
);
```

### Przykład 2: Missing Indexes

**Scenariusz**: "Aplikacja jest wolna gdy filtruje instruktorów"

```typescript
// server/lib/sheets.ts
async function getInstructorsByGroup(groupId: string) {
  // ❌ Ta query jest powolna!
  return db.select()
    .from(instructorsAuth)
    .where(sql`groupIds LIKE '%${groupId}%'`)
    .all();
}
```

**Pytasz**:
```
"Database Architect, ta query jest powolna.
Jak zoptymalizować?"
```

**Agent odpowiada**:
```
Problem: Nie ma indexu na lookupie groupIds!

Optimizacja:

1. Refactor do oddzielnej tabeli (jak wyżej)

2. Lub dodaj index (temporary):
   CREATE INDEX idx_instructors_group_ids
   ON instructorsAuth USING GIN (groupIds);

3. W Drizzle:

export const instructorsAuth = pgTable(
  'instructorsAuth',
  {
    // ... columns ...
  },
  (table) => ({
    // Indexes
    emailIdx: index('idx_instructors_auth_email')
      .on(table.email),
    groupsIdx: index('idx_instructors_auth_group_ids')
      .on(table.groupIds)
  })
);

4. Lepiej: Normalizuj!

// Po migracji do instructorGroups tabeli:

async function getInstructorsByGroup(groupId: string) {
  return db
    .select({ id: instructorsAuth.id, email: instructorsAuth.email })
    .from(instructorsAuth)
    .innerJoin(
      instructorGroups,
      eq(instructorsAuth.id, instructorGroups.instructorId)
    )
    .where(eq(instructorGroups.groupId, groupId))
    .all();

  // Query plan jest teraz optimal!
}
```

### Przykład 3: Migration Planning

**Scenariusz**: "Chcę dodać nową kolumnę status do instructorsAuth"

**Pytasz**:
```
"Database Architect, jak safely dodać kolumnę status?"
```

**Agent odpowiada**:
```
Safe migration strategy:

KROK 1: Dodaj do schema.ts:

export const instructorsAuth = pgTable('instructorsAuth', {
  // ... existing columns ...
  status: varchar('status', { length: 50 })
    .default('active')
    .notNull(), // ← Nowa kolumna
});

KROK 2: Wygeneruj migrację:

npm run db:push

KROK 3: Drizzle automatycznie:
- Dodaje kolumnę
- Ustawia DEFAULT 'active' dla istniejących rows
- Zero downtime (kolumna nullable podczas dodawania)

KROK 4: Weryfikuj:

SELECT COUNT(*) FROM instructorsAuth
WHERE status = 'active';

✅ Zero downtime migration!

Dodatkowe tipy:

1. Dodawaj kolumny z DEFAULT
2. Nie usuwaj kolumn (archive zamiast)
3. Zmień typ tylko jeśli konieczne
4. Test migracji na dev environment najpierw
5. Zawsze miej backup przed migracją prod
```

### Przykład 4: Query Optimization

**Scenariusz**: Attendance report jest wolny

```typescript
// server/lib/sheets.ts - wolna query
async function getAttendanceReport(groupId: string, dateRange) {
  const students = await getStudents(groupId);
  const sessions = await getSessions(groupId, dateRange);
  const attendance = await getAttendance(groupId, dateRange);

  // N+1 query problem!
  const report = attendance.map(a => ({
    ...a,
    student: students.find(s => s.id === a.studentId),
    session: sessions.find(s => s.id === a.sessionId)
  }));

  return report;
}
```

**Pytasz**:
```
"Database Architect, attendance report jest powolny.
Jak zoptymalizować?"
```

**Agent odpowiada**:
```
Problem: N+1 queries + client-side joins!

Optimization:

// ✅ Single query with joins
async function getAttendanceReport(groupId: string, dateRange) {
  return db
    .select({
      // Attendance fields
      sessionId: attendance.sessionId,
      studentId: attendance.studentId,
      status: attendance.status,
      notes: attendance.notes,

      // Student fields
      studentName: students.full_name,
      studentClass: students.class,

      // Session fields
      sessionDate: sessions.date
    })
    .from(attendance)
    .innerJoin(
      students,
      eq(attendance.studentId, students.id)
    )
    .innerJoin(
      sessions,
      eq(attendance.sessionId, sessions.id)
    )
    .where(
      and(
        eq(attendance.groupId, groupId),
        gte(sessions.date, dateRange.start),
        lte(sessions.date, dateRange.end)
      )
    )
    .all();

  // Single query, fully typed, optimized!
}

Performance improvement:
- Przed: 1 + N + M queries = potencjalnie 1000+
- Po: 1 query

Dodatkowo:
- Dodaj indexes na (groupId, date)
- Cache result na 5 minut
- Paginate jeśli duzo rekordów
```

## 📋 Checklista: Kiedy Pytać?

| Sytuacja | Pytanie |
|----------|---------|
| Nowa tabela | "Design tabeli OK?" |
| Aplikacja powolna | "Query optimization?" |
| Brak indeksów | "Które kolumny powinny mieć index?" |
| Duzo danych | "Jak skalować?" |
| Migration | "Jak safely zrobić zmianę?" |
| Relationship | "One-to-many OK?" |
| Normalizacja | "Czy denormalizować?" |

## 🔧 Integracja z Innymi Agentami

### Database Architect + Backend Developer
Gdy pracujesz nad API.

```
"Backend Developer, endpoint design OK?
 Database Architect, query optimization OK?"
```

### Database Architect + Security Auditor
Gdy pracujesz z sensitive data.

```
"Database Architect, schema jest OK?
 Security Auditor, dane są secure?"
```

## 📊 Capability Matrix

| Umiejętność | Level | Przykład |
|------------|-------|---------|
| PostgreSQL | 🟢 Expert | Schema, queries, optimization |
| Drizzle ORM | 🟢 Expert | Migrations, types, queries |
| Index strategy | 🟢 Expert | Index selection, composite |
| Query optimization | 🟢 Expert | Joins, query plans, performance |
| Normalization | 🟢 Expert | Normal forms, relationships |
| Migrations | 🟢 Expert | Safe migrations, zero-downtime |
| Performance tuning | 🟢 Expert | Caching, pooling, optimization |
| Backup/Recovery | 🟡 Good | Strategy, implementation |

## 🚫 Kiedy NIE Pytać?

- Frontend logic (pytaj Frontend Developer)
- API design (pytaj Backend Developer)
- Security deep-dive (pytaj Security Auditor)
- Infra/Hosting (pytaj DevOps Engineer)
- Data science (pytaj Data Engineer)

## 💬 Najlepsze Prompts

### Schema Design
```
"Database Architect, design schema dla:
- Tabela: events
- Pola: title, description, startDate, endDate, location
- Relationships: user -> events (one-to-many)"
```

### Performance
```
"Database Architect, query optimization:
- Query: [copy query]
- Problem: powolny
- Propozycje optymizacji?"
```

### Index Strategy
```
"Database Architect, index strategy:
- Która tabela potrzebuje indeksów?
- Które kolumny są queryowane najczęściej?
- Composite indexes?"
```

### Migration Planning
```
"Database Architect, plan migration:
- Chcę zmienić struktur tabel
- Zero-downtime requirement
- Jak to bezpiecznie zrobić?"
```

## 🎓 Best Practices (Co wie ten agent)

1. ✅ Każda tabela powinna mieć PK
2. ✅ Foreign keys dla relationships
3. ✅ Indexes na frequently queried columns
4. ✅ Timestamps dla audit trail
5. ✅ Normalize zamiast denormalize
6. ✅ Type safety z Drizzle
7. ✅ Migrations zamiast manual SQL
8. ✅ Connection pooling
9. ✅ Query caching
10. ✅ Monitoring performance

## 📈 Performance Tips (co będzie sugerować)

- Index na foreign keys
- Index na WHERE clauses
- Index na JOIN columns
- Composite indexes dla multi-column queries
- Avoid SELECT * - choose specific columns
- Pagination dla large datasets
- Connection pooling
- Query caching
- Archive old data
- Vacuum/analyze regularly

## 🔗 Powiązane

- **Backend Developer**: Dla API queries
- **Security Auditor**: Dla data security
- **QUICK-START.md**: Szybki overview
- **README.md**: Pełna dokumentacja

---

**Wersja**: 1.0.0
**Data**: 25 października 2025
**Status**: ✅ Aktywny i gotowy do pracy
