# Podsumowanie poprawek wdrożeniowych - Bad Gateway 502

## Problem
Aplikacja pokazywała "Bad Gateway" (502 error) w Coolify pomimo że build się powiedzie.

## Główna przyczyna
Aplikacja crashowała **przed wywołaniem `server.listen()`** z powodu:
1. `throw Error` w `/server/lib/sheets.ts` wykonywany podczas importu modułu (linie 9-17)
2. Brak obsługi błędów podczas inicjalizacji serwera
3. Brak logowania diagnostycznego
4. `serveStatic()` rzucał błąd jeśli brak dist/

## Wprowadzone zmiany

### 1. `/server/lib/sheets.ts`
**Przed:**
```typescript
// Validate required environment variables
if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
  throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable');
}
// ... (wykonywane przy imporcie modułu)
```

**Po:**
```typescript
// Lazy validation - check credentials only when needed (not at module load)
function validateGoogleCredentials() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable');
  }
  // ... (wykonywane tylko gdy używane)
}

export async function getSheets() {
  validateGoogleCredentials(); // Sprawdź dopiero tutaj
  // ...
}
```

**Efekt:** Aplikacja nie crashuje przy starcie jeśli brakuje Google credentials. Błąd wystąpi dopiero gdy ktoś próbuje użyć Google Sheets.

### 2. `/server/index.ts`
**Dodano:**
- Global error handlers (`uncaughtException`, `unhandledRejection`)
- Szczegółowe logowanie zmiennych środowiskowych przy starcie
- Try-catch wokół całej inicjalizacji
- Obsługa błędów serwera (`server.on('error')`)
- Lepsze logowanie w production mode
- Import `startMetricsLogging` z `./lib/metrics`

**Przykład logów:**
```
Starting server initialization...
NODE_ENV: production
PORT: 5000
DATABASE_URL: set
SESSION_SECRET: set
GOOGLE_SERVICE_ACCOUNT_EMAIL: set
GOOGLE_PRIVATE_KEY: set
Routes registered successfully
Production mode - setting up static file serving
Static files serving enabled
Attempting to listen on port 5000...
SERVER STARTED SUCCESSFULLY on port 5000
```

### 3. `/server/routes.ts`
**Dodano:**
```typescript
// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'configured' : 'NOT configured',
    googleSheets: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY ? 'configured' : 'NOT configured'
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    message: "CSM System Obecnosci API",
    status: "ok",
    version: "2.0"
  });
});

// Test database connection on startup
try {
  console.log('Testing database connection...');
  const testResult = await db.execute(sql`SELECT 1 as test`);
  console.log('Database connection test successful:', testResult.rows);
} catch (error) {
  console.error('Database connection test failed:', error);
  console.error('Application will start but database operations may fail');
  // Don't throw - allow app to start even if DB is temporarily unavailable
}
```

### 4. `/server/vite.ts`
**Przed:**
```typescript
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }
  // ...
}
```

**Po:**
```typescript
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  console.log('serveStatic() called');
  console.log('distPath:', distPath);
  console.log('distPath exists?', fs.existsSync(distPath));

  if (!fs.existsSync(distPath)) {
    // Try alternative paths
    const altPath1 = path.resolve(__dirname, "..", "dist", "public");
    const altPath2 = path.resolve(process.cwd(), "dist", "public");

    if (fs.existsSync(altPath1)) {
      console.log('Using alternative path 1:', altPath1);
      app.use(express.static(altPath1));
      // ...
      return;
    }

    // If no paths work, log warning but don't throw
    console.warn(`WARNING: Could not find the build directory: ${distPath}`);
    console.warn('Static files will not be served. API routes will still work.');
    return; // Don't throw, just return - API will still work
  }
  // ...
}
```

**Efekt:** Aplikacja startuje nawet jeśli brak static files. API nadal działa, tylko frontend nie jest serwowany.

### 5. `/server/db.ts`
**Dodano:**
- Retry mechanism (max 3 próby)
- Zwiększony timeout do 10s
- Test połączenia przed zwróceniem instance
- Lepsze logowanie błędów

```typescript
async function initializeDatabase(retries: number = 0, delayMs: number = 1000) {
  if (dbInstance) return dbInstance;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`Initializing database connection (attempt ${attempt + 1}/${retries + 1})...`);
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 10000, // Increased to 10s
        // ...
      });
      dbInstance = drizzle({ client: pool, schema });

      // Test the connection
      await pool.query('SELECT 1');
      console.log('Database connection established successfully');

      return dbInstance;
    } catch (error) {
      lastError = error as Error;
      console.error(`Database connection attempt ${attempt + 1} failed:`, error.message);

      if (attempt < retries) {
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Failed to connect to database');
}
```

### 6. `/server/auth.ts`
**Dodano:**
- Ostrzeżenie jeśli `SESSION_SECRET` nie jest ustawiony
- Logowanie po skonfigurowaniu session middleware

```typescript
export function setupSession(app: Express) {
  if (!process.env.SESSION_SECRET) {
    console.warn('WARNING: SESSION_SECRET not set. Using default (insecure for production)');
  }
  // ...
  console.log('Session middleware configured successfully');
}
```

## Jak to naprawia problem?

### Scenariusz 1: Brak Google credentials
**Przed:** Aplikacja crashuje przy imporcie `sheets.ts` → Bad Gateway
**Po:** Aplikacja startuje, loguje ostrzeżenie, API działa (endpoints używające Sheets będą failować dopiero gdy zostaną wywołane)

### Scenariusz 2: Timeout bazy danych
**Przed:** Aplikacja czeka nieskończenie → Coolify killuje proces → Bad Gateway
**Po:** Retry 3x z 1s opóźnieniem. Jeśli fail - loguje błąd ale **nie crashuje**, aplikacja startuje

### Scenariusz 3: Brak static files
**Przed:** `serveStatic()` rzuca błąd → crash → Bad Gateway
**Po:** Loguje ostrzeżenie, sprawdza alternatywne ścieżki, **nie crashuje**, API działa

### Scenariusz 4: Nieobsłużone błędy
**Przed:** Uncaught exception → crash bez logów → nie wiadomo co się stało
**Po:** Global error handlers logują szczegóły i gracefully shutdown z kodem exit 1

## Użycie w Coolify

### Debugowanie
1. Sprawdź logi w Coolify (ikona dokumentu)
2. Poszukaj "SERVER STARTED SUCCESSFULLY" - jeśli jest, serwer działa
3. Jeśli nie ma, sprawdź błędy powyżej (będą szczegółowe logi)

### Health check
```bash
curl http://your-app.coolify.domain/health
```

Odpowiedź:
```json
{
  "status": "ok",
  "timestamp": "2025-01-25T10:00:00.000Z",
  "uptime": 123.456,
  "environment": "production",
  "database": "configured",
  "googleSheets": "configured"
}
```

### Testowanie API
```bash
curl http://your-app.coolify.domain/
```

Jeśli zwraca:
```json
{
  "message": "CSM System Obecnosci API",
  "status": "ok",
  "version": "2.0"
}
```

To serwer działa poprawnie!

## Checklist wdrożenia

- [ ] Wszystkie zmienne środowiskowe ustawione
- [ ] `GOOGLE_PRIVATE_KEY` w poprawnym formacie (multiline w Coolify)
- [ ] `npm run build` lokalnie działa
- [ ] Sprawdź logi w Coolify po deploy
- [ ] Test health check: `curl http://app/health`
- [ ] Test API: `curl http://app/`
- [ ] Test login page w przeglądarce

## Pliki zmienione

1. `/server/lib/sheets.ts` - lazy validation
2. `/server/index.ts` - error handlers, logowanie
3. `/server/routes.ts` - health check, db test
4. `/server/vite.ts` - graceful handling brakujących static files
5. `/server/db.ts` - retry mechanism
6. `/server/auth.ts` - ostrzeżenia

## Dokumentacja

- `/DEPLOYMENT-TROUBLESHOOTING.md` - szczegółowy guide
- `/DEPLOYMENT-FIXES-SUMMARY.md` - to podsumowanie

## Następne kroki

Po wdrożeniu:
1. Sprawdź logi w Coolify
2. Odwiedź `/health` endpoint
3. Przetestuj login
4. Jeśli są problemy - sprawdź `/DEPLOYMENT-TROUBLESHOOTING.md`
