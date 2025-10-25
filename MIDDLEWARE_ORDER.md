# Express Middleware Order (Fixed)

## Prawidłowa kolejność wykonywania:

```
1. app.use(express.json())                         [server/index.ts:64]
2. app.use(express.urlencoded())                   [server/index.ts:65]
3. app.use(metricsMiddleware())                    [server/index.ts:68]
4. app.use(logging middleware)                     [server/index.ts:70-98]

5. registerRoutes(app) - dodaje wszystkie routes:  [server/index.ts:110]
   - setupSession(app)                             [server/routes.ts:25]
   - GET /health                                   [server/routes.ts:29]
   - GET /                                         [server/routes.ts:42]
   - POST /api/auth/login                          [server/routes.ts:52]
   - GET /api/groups                               [server/routes.ts:205]
   - GET /api/students                             [server/routes.ts:228]
   - ... wszystkie inne API routes ...

6. serveStatic(app) - tylko w production:          [server/index.ts:130-131]
   - app.use(express.static(distPath))             [server/vite.ts:113]
   - app.use("*", catch-all BUT skips /api)        [server/vite.ts:117-130]
      ⚠️  CRITICAL FIX: Catch-all teraz sprawdza:
          if (req.originalUrl.startsWith('/api') || 
              req.originalUrl.startsWith('/health')) {
            return next(); // NIE przechwytuj API routes!
          }

7. app.use(sentryErrorHandler)                     [server/index.ts:140]
8. app.use(error handler middleware)               [server/index.ts:143-149]
9. server.listen()                                 [server/index.ts:162-174]
```

## Naprawione błędy:

### ❌ BŁĄD #1: Endpoint dodany PO server.listen()
**Problem:** 
- `server/index.ts` linie 189-201 definiowały `GET /` PO `server.listen()`
- Express NIE MOŻE dodawać routes po nasłuchiwaniu

**Rozwiązanie:**
- ✅ USUNIĘTO duplikowany endpoint z linii 189-201
- ✅ Endpoint `GET /` jest już zdefiniowany w `server/routes.ts:42`

### ❌ BŁĄD #2: Duplikacja /health endpoint
**Problem:**
- `/health` był zdefiniowany 2 razy:
  - `server/index.ts:101-112` (PRZED registerRoutes)
  - `server/routes.ts:29-38` (w registerRoutes)

**Rozwiązanie:**
- ✅ USUNIĘTO duplikat z `server/index.ts`
- ✅ Pozostawiono tylko definicję w `server/routes.ts`

### ❌ BŁĄD #3: Catch-all route blokował API
**Problem:**
- `server/vite.ts:116-124` catch-all `app.use("*", ...)` przechwytywał WSZYSTKIE żądania
- Nawet `/api/*` routes były kierowane do `index.html`

**Rozwiązanie:**
- ✅ DODANO sprawdzanie w catch-all route:
  ```typescript
  if (req.originalUrl.startsWith('/api') || 
      req.originalUrl.startsWith('/health')) {
    return next(); // Przepuść do innych route'ów
  }
  ```

### ❌ BŁĄD #4: Error handlers przed serveStatic
**Problem:**
- Error handlers były dodane PRZED `serveStatic()`
- To blokowało prawidłowe przetwarzanie błędów z catch-all route

**Rozwiązanie:**
- ✅ PRZENIESIONO error handlers DOPO `serveStatic()`
- ✅ Kolejność: routes → serveStatic → error handlers → listen

### ❌ BŁĄD #5: GET / endpoint blokował frontend
**Problem:**
- `server/routes.ts` definiował `GET /` endpoint który zwracał JSON
- Ten endpoint był wykonywany PRZED catch-all z `serveStatic()`
- Frontend (index.html) nigdy nie był serwowany na `/`

**Rozwiązanie:**
- ✅ USUNIĘTO endpoint `GET /` z `server/routes.ts`
- ✅ Teraz catch-all z `serveStatic()` serwuje `index.html` na `/`
- ✅ Frontend ładuje się poprawnie!

## Testowanie:

```bash
# W production mode:
NODE_ENV=production npm start

# Testuj endpointy:
curl http://localhost:5000/health        # ✅ Powinno zwrócić JSON z health status
curl http://localhost:5000/              # ✅ Powinno zwrócić index.html (frontend)
curl http://localhost:5000/api/groups    # ✅ Powinno zwrócić JSON lub 401 (wymaga auth)
```

## Debugging na Coolify:

Sprawdź logi Coolify - powinny zawierać:
```
Routes registered successfully
Production mode - setting up static file serving
Serving static files from: /path/to/dist/public
Static files serving enabled
SERVER STARTED SUCCESSFULLY on port 5000
```

Jeśli widzisz te logi, ale żądania nadal nie działają:
1. Sprawdź czy Coolify przekazuje ruch na port 5000
2. Sprawdź czy env var PORT=5000 jest ustawiony
3. Sprawdź czy brak firewalla blokującego port
