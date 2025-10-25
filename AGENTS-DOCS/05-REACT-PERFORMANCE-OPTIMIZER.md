# ⚡ REACT PERFORMANCE OPTIMIZER AGENT

Ekspert w React rendering optimization, code splitting, lazy loading i bundle size reduction. Optymalizuje performance frontendowej.

## 📌 Overview

| Aspekt | Szczegóły |
|--------|-----------|
| **Nazwa** | React Performance Optimizer |
| **Specjalność** | Rendering optimization, code splitting, lazy loading, bundle size |
| **Włącza się** | `client/src/pages/**/*.tsx`, `client/src/components/**/*.tsx` |
| **Status** | ✅ Aktywny |
| **ID** | `react-performance-optimizer` |

## 🎯 Czym się zajmuje?

### 1. **Render Optimization**
- Analizuje unnecessary re-renders
- Sugeruje React.memo()
- Wspiera useMemo/useCallback
- Identyfikuje performance bottlenecks

### 2. **Code Splitting**
- Rekomenduje dynamic imports
- Wspiera route-level splitting
- Analizuje chunk sizes
- Optymizuje load time

### 3. **Lazy Loading**
- Rekomenduje Suspense boundaries
- Wspiera image lazy loading
- Analizuje viewport optimization
- Rekomenduje intersection observer

### 4. **Bundle Size Reduction**
- Analizuje bundle composition
- Identyfikuje unused dependencies
- Sugeruje tree shaking
- Optymizuje imports

### 5. **Asset Optimization**
- Image optimization (WebP, AVIF)
- CSS purging (TailwindCSS)
- JavaScript minification
- Tree shaking strategies

## 🚀 Kiedy go używać?

### Automatycznie włącza się:
- Edytujesz `client/src/pages/**/*.tsx`
- Edytujesz `client/src/components/**/*.tsx`
- Build time (bundle analysis)

### Jawnie pytaj:
```
"React Performance Optimizer, performance audit"
"/optimize-bundle"
"Jak lazy load te komponenty?"
"Bundle size jest za duży?"
```

## 💡 Praktyczne Przykłady

### Przykład 1: Unnecessary Re-renders

```typescript
// client/src/pages/attendance.tsx
export const AttendancePage = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // ❌ Nowy handler za każdym razem!
  const handleSelect = (student) => {
    setSelectedStudent(student);
  };

  return (
    <div>
      {/* ❌ StudentList renderuje się zawsze! */}
      <StudentList
        students={students}
        onSelect={handleSelect}
      />

      {selectedStudent && (
        <StudentDetails student={selectedStudent} />
      )}
    </div>
  );
};

// Gdzieś indziej
const StudentList = ({ students, onSelect }) => {
  console.log('StudentList rendered!'); // ← renderuje się 100x!

  return (
    <div>
      {students.map(s => (
        <StudentRow key={s.id} student={s} onSelect={onSelect} />
      ))}
    </div>
  );
};

const StudentRow = ({ student, onSelect }) => {
  console.log('StudentRow rendered!'); // ← kazdy row 100x!

  return (
    <div onClick={() => onSelect(student)}>
      {student.name}
    </div>
  );
};
```

**Pytasz**:
```
"React Performance Optimizer, performance audit tego kodu.
Widzisz re-render issues?"
```

**Agent odpowiada**:
```
PROBLEMY ZNALEZIONE:

1. ❌ handleSelect nowy za każdym razem
   - StudentList dostaje nowy prop
   - StudentList renderuje się bez powodu!
   - Wszystkie StudentRow renderują się też!

2. ❌ StudentList nie memoized
   - Brak React.memo()
   - Renderuje się zawsze gdy parent zmienia się

3. ❌ StudentRow nie memoized
   - Każda row renderuje się dla każdego parent re-render!

OPTIMIZACJA:

// ✅ Memoize handleSelect
export const AttendancePage = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleSelect = useCallback((student) => {
    setSelectedStudent(student);
  }, []); // Memoized!

  return (
    <div>
      {/* ✅ handleSelect jest stable */}
      <StudentList
        students={students}
        onSelect={handleSelect}
      />

      {selectedStudent && (
        <StudentDetails student={selectedStudent} />
      )}
    </div>
  );
};

// ✅ Memoize StudentList
const StudentListContent = ({ students, onSelect }) => {
  return (
    <div>
      {students.map(s => (
        <StudentRow key={s.id} student={s} onSelect={onSelect} />
      ))}
    </div>
  );
};

export const StudentList = React.memo(StudentListContent);

// ✅ Memoize StudentRow
const StudentRowContent = ({ student, onSelect }) => {
  return (
    <div onClick={() => onSelect(student)}>
      {student.name}
    </div>
  );
};

export const StudentRow = React.memo(StudentRowContent);

PERFORMANCE IMPROVEMENT:
Przed: 100 re-renders per interaction
Po: 1 re-render per interaction

Savings: ~99% less rendering!
```

### Przykład 2: Code Splitting Pages

```typescript
// client/src/pages/index.tsx
import { AttendancePage } from './attendance';
import { ReportsPage } from './reports';
import { AdminPage } from './admin';

// ❌ Wszystko bundled do jednego chunk!
// Bundle jest OGROMNY!

export const routes = [
  { path: '/attendance', component: AttendancePage },
  { path: '/reports', component: ReportsPage },
  { path: '/admin', component: AdminPage }
];
```

**Pytasz**:
```
"React Performance Optimizer, bundle size jest problem.
Jak split na mniejsze chunks?"
```

**Agent odpowiada**:
```
PROBLEM:
- Wszystkie pages w jednym bundle
- User musiał loadować AdminPage nawet jeśli to nie potrzebuje
- Bundle jest 300KB zamiast 50KB per page

SOLUTION - Dynamic Imports:

import { lazy, Suspense } from 'react';

// ✅ Lazy load każdy page
const AttendancePage = lazy(() => import('./pages/attendance'));
const ReportsPage = lazy(() => import('./pages/reports'));
const AdminPage = lazy(() => import('./pages/admin'));

// ✅ Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin">⏳ Ładuję...</div>
  </div>
);

export const routes = [
  {
    path: '/attendance',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AttendancePage />
      </Suspense>
    )
  },
  {
    path: '/reports',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ReportsPage />
      </Suspense>
    )
  },
  {
    path: '/admin',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AdminPage />
      </Suspense>
    )
  }
];

RESULTS:
- Initial bundle: 50KB (tylko home page)
- /attendance page loads: +20KB (on demand)
- /reports page loads: +30KB (on demand)
- /admin page loads: +40KB (on demand)

User benefit:
- Faster initial page load
- Load only what's needed
- Better caching (separate chunks)

Vite automatically creates separate chunks!
```

### Przykład 3: Image Optimization

```typescript
// client/src/components/StudentCard.tsx
export const StudentCard = ({ student }) => {
  return (
    <div>
      {/* ❌ Duży image, ładuje się zawsze */}
      <img
        src={`https://api.example.com/students/${student.id}/photo.jpg`}
        alt={student.name}
      />

      <h3>{student.name}</h3>
    </div>
  );
};
```

**Pytasz**:
```
"React Performance Optimizer, image optimization.
Jak zoptymalizować te images?"
```

**Agent odpowiada**:
```
OPTIMIZATIONS:

1. ✅ Lazy load images
<img
  src={...}
  alt={student.name}
  loading="lazy"  // ← Nowa w HTML5
/>

2. ✅ WebP format
<picture>
  <source srcSet={`${student.id}.webp`} type="image/webp" />
  <img src={`${student.id}.jpg`} alt={student.name} loading="lazy" />
</picture>

3. ✅ Responsive images
<img
  srcSet={`
    ${student.id}-small.jpg 300w,
    ${student.id}-medium.jpg 600w,
    ${student.id}-large.jpg 1200w
  `}
  sizes="(max-width: 600px) 300px, (max-width: 1200px) 600px, 1200px"
  src={`${student.id}-medium.jpg`}
  alt={student.name}
  loading="lazy"
/>

4. ✅ Intersection Observer (Suspense)
import { useIntersectionObserver } from './hooks/useIntersectionObserver';

export const StudentCard = ({ student }) => {
  const { ref, isVisible } = useIntersectionObserver();

  return (
    <div ref={ref}>
      {isVisible ? (
        <img
          src={`${student.id}.jpg`}
          alt={student.name}
          loading="lazy"
        />
      ) : (
        <div className="w-32 h-32 bg-gray-200 animate-pulse" />
      )}
      <h3>{student.name}</h3>
    </div>
  );
};

5. ✅ Next.js Image Component (jeśli używałbyś Next.js)
import Image from 'next/image';

<Image
  src={`${student.id}.jpg`}
  alt={student.name}
  width={300}
  height={300}
  loading="lazy"
  onLoadingComplete=...
/>

BENEFITS:
- Images load only when visible
- WebP saves 25-35% size
- Responsive images for different devices
- Better Google PageSpeed score
```

### Przykład 4: Bundle Analysis

**Pytasz**:
```
"React Performance Optimizer, jak zanalyzować bundle size?"
```

**Agent odpowiada**:
```
TOOLS DO ANALIZY:

1. ✅ Vite Build Analyzer
npm install -D rollup-plugin-visualizer

// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [visualizer()],
};

// Build
npm run build

// Open dist/stats.html - wizualna mapa bundle!

2. ✅ Source Map Explorer
npm install -D source-map-explorer

npm run build
source-map-explorer 'dist/assets/client-*.js'

3. ✅ Bundle Buddy
npm install -D @bundle-buddy/cli
bundle-buddy

4. ✅ Webpack Bundle Analyzer
npm install -D webpack-bundle-analyzer

5. ✅ esbuild Stats (już używasz!)
esbuild client/src/index.tsx --bundle --analyze

COMMON ISSUES ZNALEZIONED:
- Duplicate packages
- Large libraries
- Unused dependencies
- Tree-shake failures

OPTIMIZATION STRATEGY:
1. Identify biggest bundles
2. Check if necessary
3. Try lighter alternatives
4. Implement lazy loading
5. Measure improvement
```

## 📋 Checklista: Kiedy Pytać?

| Sytuacja | Pytanie |
|----------|---------|
| App powolna | "Performance audit?" |
| Bundle duży | "/optimize-bundle" |
| Page laggy | "Render optimization?" |
| Lazy load | "Które komponenty lazy load?" |
| Images duże | "Image optimization?" |
| Bundle analysis | "Czym jest bundle composition?" |

## 🔧 Integracja z Innymi Agentami

### React Performance Optimizer + Frontend Developer
Obie pracują razem przy komponentach.

```
Edytujesz: client/src/pages/attendance.tsx
    ↓
Frontend Developer: "Struktura OK?"
React Performance Optimizer: "Performance OK?"
    ↓
Multi-agent code review!
```

## 📊 Capability Matrix

| Umiejętność | Level | Przykład |
|------------|-------|---------|
| Render optimization | 🟢 Expert | memo, useMemo, useCallback |
| Code splitting | 🟢 Expert | Dynamic imports, Suspense, lazy |
| Bundle analysis | 🟢 Expert | Tools, identification, optimization |
| Image optimization | 🟢 Expert | Lazy load, WebP, responsive |
| CSS optimization | 🟡 Good | PurgeCSS, minification |
| Performance profiling | 🟡 Good | React DevTools, Chrome DevTools |
| Caching strategies | 🟡 Good | Browser, server, service worker |

## 🚫 Kiedy NIE Pytać?

- Frontend structure (pytaj Frontend Developer)
- Backend optimization (pytaj Backend Developer)
- Database performance (pytaj Database Architect)
- Infrastructure (pytaj DevOps Engineer)

## 💬 Najlepsze Prompts

### Render Optimization
```
"React Performance Optimizer, render optimization audit:
- Które komponenty renderują się too often?
- Gdzie brakuje memo/useMemo/useCallback?
- Propsy mają stabila references?"
```

### Bundle Size
```
"/optimize-bundle
- Bundle composition analysis
- Które libraries są biggest?
- Jak split na chunks?"
```

### Image Optimization
```
"React Performance Optimizer, image optimization:
- Lazy load strategy
- WebP/AVIF support
- Responsive images"
```

### Comprehensive Audit
```
"React Performance Optimizer, comprehensive audit:
- Rendering bottlenecks
- Bundle size
- Image optimization
- Code splitting opportunities
- Caching strategy"
```

## 🎓 Best Practices (Co wie ten agent)

1. ✅ React.memo() dla komponenty które mają niezmienne props
2. ✅ useMemo() dla expensive computations
3. ✅ useCallback() dla callbacks w props
4. ✅ Dynamic imports dla large features
5. ✅ Suspense boundaries dla loading states
6. ✅ Image lazy loading
7. ✅ Tree shaking dla unused code
8. ✅ Code splitting na route level
9. ✅ CSS purging (TailwindCSS)
10. ✅ Minification i compression

## 📈 Performance Metrics (co będzie sugerować)

- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive**: < 3.5s
- **Bundle Size**: < 150KB (initial)
- **First Paint**: < 1.5s

## 🔗 Powiązane

- **Frontend Developer**: Dla strukury komponentów
- **Backend Developer**: Dla API optimization
- **QUICK-START.md**: Szybki overview
- **README.md**: Pełna dokumentacja

---

**Wersja**: 1.0.0
**Data**: 25 października 2025
**Status**: ✅ Aktywny i gotowy do pracy
