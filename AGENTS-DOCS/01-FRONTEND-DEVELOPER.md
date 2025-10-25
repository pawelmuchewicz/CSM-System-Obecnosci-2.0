# 👨‍💻 FRONTEND DEVELOPER AGENT

Ekspert w React, TypeScript, Vite, TailwindCSS i shadcn/ui. Optymalizuje komponenty i performance aplikacji frontendowej.

## 📌 Overview

| Aspekt | Szczegóły |
|--------|-----------|
| **Nazwa** | Frontend Developer |
| **Specjalność** | React, TypeScript, Vite, TailwindCSS, shadcn/ui |
| **Włącza się** | `client/src/**/*.tsx`, `client/src/**/*.ts`, `vite.config.ts` |
| **Status** | ✅ Aktywny |
| **ID** | `frontend-developer` |

## 🎯 Czym się zajmuje?

### 1. **Analiza Komponentów React**
- Przegląda strukturę komponentów
- Sprawdza prop handling
- Analizuje state management
- Sugeruje refactoring

### 2. **Optymizacja Performance**
- Rekomenduje React.memo()
- Sugeruje useMemo/useCallback
- Analizuje re-render issues
- Wspiera code splitting

### 3. **TypeScript Best Practices**
- Sprawdza type safety
- Sugeruje lepsze typowanie
- Weryfikuje interfaces
- Unika `any` typów

### 4. **TailwindCSS Styling**
- Analizuje class names
- Sugeruje responsive design
- Optymizuje utility classes
- Wspiera dark mode

### 5. **Vite Configuration**
- Sprawdza konfigurację
- Sugeruje optimizacje
- Analizuje bundle
- Rekomenduje split points

## 🚀 Kiedy go używać?

### Automatycznie włącza się:
- Edytujesz plik w `client/src/pages/`
- Edytujesz plik w `client/src/components/`
- Edytujesz `vite.config.ts`

### Jawnie pytaj:
```
"Frontend Developer, review tego komponentu"
"Jak zoptymalizować rendering?"
"Czy ten TypeScript jest poprawny?"
"Jak lepiej strukturyzować tą stronę?"
```

## 💡 Praktyczne Przykłady

### Przykład 1: Code Review Komponenty

```typescript
// client/src/components/StudentCard.tsx
export const StudentCard = ({ student, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div onClick={() => onSelect(student)}>
      {student.name}
    </div>
  );
};
```

**Pytasz**:
```
"Frontend Developer, review tego komponenty.
Czym się zajmować w zakresie performance?"
```

**Agent odpowiada**:
```
Zauważam:
1. Brak React.memo() - komponenta re-renderuje się bez powodu
2. onClick callback będzie nowy za każdym razem
3. Brak type safety (TypeScript)
4. isHovered nie jest używany

Sugestie:
- Dodaj React.memo()
- Use useCallback dla onClick
- Dodaj typy: interface StudentCardProps
- Usuń nieużywany state
```

### Przykład 2: TailwindCSS Optimization

```typescript
// Przed
<div className="text-white bg-blue-500 px-4 py-2 rounded-lg shadow-lg hover:bg-blue-600 transition-colors">
  Klick mnie
</div>

// Pytasz
"Frontend Developer, optimize ten div - zbyt wiele classes"
```

**Agent odpowiada**:
```
Sugestie:
1. Grupuj related classes: bg-blue-500 hover:bg-blue-600 → responsive
2. Spraw się responsive: dodaj md:text-lg
3. Use @apply w CSS zamiast inline classes
4. Consider component extraction

Refactored:
<button className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600
                   transition-colors text-white shadow-lg">
  Klick mnie
</button>
```

### Przykład 3: Performance Optimization

```typescript
// Problematyczne
const AttendanceList = ({ students }) => {
  const sortedStudents = students.sort(...); // Re-sort za każdym razem!
  const filteredStudents = sortedStudents.filter(...);

  return (
    <div>
      {filteredStudents.map(s => (
        <StudentRow key={s.id} student={s} />
      ))}
    </div>
  );
};
```

**Pytasz**:
```
"Frontend Developer, ta komponenta ma performance issues?"
```

**Agent odpowiada**:
```
Problemy znalezione:
1. sort/filter na każdy render - O(n) overhead
2. StudentRow nie ma React.memo() - 100 re-renders jeśli parent zmienia się
3. Brak memoization dla computed values

Optymizacja:
- Use useMemo dla sortedStudents
- Use useMemo dla filteredStudents
- Wrap StudentRow w React.memo()
- Use useCallback dla onClick handlers
```

### Przykład 4: Type Safety

```typescript
// Przed (brak typów)
const handleSelect = (student) => {
  console.log(student.name);
};

// Pytasz
"Frontend Developer, jak typed to powinno być?"
```

**Agent odpowiada**:
```
Typy z Twojego schematu (shared/schema.ts):

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  class: string;
  phone?: string;
  email?: string;
  group_id: string;
  active: boolean;
  status: 'active' | 'inactive' | 'pending';
  created_at: Date;
}

Poprawnie:
const handleSelect = (student: Student): void => {
  console.log(\`\${student.first_name} \${student.last_name}\`);
};

// Lub w komponencie:
interface StudentRowProps {
  student: Student;
  onSelect: (student: Student) => void;
}

export const StudentRow: React.FC<StudentRowProps> = ({
  student,
  onSelect
}) => { ... };
```

## 📋 Checklista: Kiedy Pytać?

| Sytuacja | Pytanie |
|----------|---------|
| Nowy komponent | "Review nowego komponenta?" |
| Komponent wolny | "Jak zoptymalizować rendering?" |
| Wiele props | "Jak podzielić ten komponent?" |
| CSS chaotyczne | "Jak lepiej organizować Tailwind?" |
| TypeScript błędy | "Jak to typed powinno być?" |
| Bundle za duży | "Czy mogę lazily load to?" |

## 🔧 Integracja z Innymi Agentami

### Frontend Developer + React Performance Optimizer
Obie pracują razem gdy edytujesz komponenty.

```
Edytujesz: client/src/pages/attendance.tsx
    ↓
Frontend Developer: "Struktura komponenty OK?"
React Performance Optimizer: "Performance OK?"
    ↓
Multi-agent review!
```

### Frontend Developer + Backend Developer
Gdy pracujesz z API data.

```
"Frontend Developer, jak renderować dane z API?
 Backend Developer, czy API returns optimalny format?"
```

## 📊 Capability Matrix

| Umiejętność | Level | Przykład |
|------------|-------|---------|
| React patterns | 🟢 Expert | Hooks, Context, Suspense |
| TypeScript | 🟢 Expert | Advanced types, generics |
| TailwindCSS | 🟢 Expert | Responsive, dark mode, animations |
| Component structure | 🟢 Expert | Composition, split, reusability |
| Performance | 🟢 Expert | Memoization, code splitting |
| Vite | 🟡 Good | Configuration, optimization |
| Accessibility | 🟡 Good | ARIA, semantics |
| Testing | 🟡 Good | Component tests (patrz Frontend Developer + Testing Expert) |

## 🚫 Kiedy NIE Pytać?

- Backend logic (pytaj Backend Developer)
- Database design (pytaj Database Architect)
- Security (pytaj Security Auditor)
- Infrastructure (pytaj DevOps Engineer)
- Bez dostępu do kodu (pokaż kod!)

## 💬 Najlepsze Prompts

### Szybki Review
```
"Frontend Developer, quick review tego pliku"
```

### Performance Focused
```
"Frontend Developer, performance audit:
- Czy komponenty są properly memoized?
- Czy state jest w dobrym miejscu?
- Czy re-renders są minimalne?"
```

### Type Safety
```
"Frontend Developer, add TypeScript types do tego pliku.
Użyj typów z shared/schema.ts gdzie możliwe"
```

### Refactoring
```
"Frontend Developer, refactor ten kod:
- Lepszy structure
- Reusable components
- Cleaner code"
```

### Full Audit
```
"Frontend Developer, comprehensive review:
- Structure
- Performance
- Types
- Styling
- Best practices"
```

## 🎓 Best Practices (Co wie ten agent)

1. ✅ Komponenty powinny być małe i focused
2. ✅ Props powinny być typed
3. ✅ State powinny być w dobrym miejscu
4. ✅ Unikaj re-renders (memo, useMemo, useCallback)
5. ✅ TailwindCSS przez utility classes
6. ✅ Responsive design mobilem zaczynać
7. ✅ dark mode wsparcie
8. ✅ Accessible markup (semantic HTML)
9. ✅ Lazy load duże komponenty
10. ✅ Split code dla produkcji

## 📈 Performance Tips (co będzie sugerować)

- React.memo() dla komponenty które renderują się sami
- useMemo() dla expensive computations
- useCallback() dla callbacks które trafiają do child components
- Dynamic imports dla duże komponenty
- Code splitting na route level
- Image optimization
- CSS minification
- Bundle analysis

## 🔗 Powiązane

- **React Performance Optimizer**: Zaawansowana optymizacja
- **Backend Developer**: Dla integracji z API
- **QUICK-START.md**: Szybki overview
- **README.md**: Pełna dokumentacja

---

**Wersja**: 1.0.0
**Data**: 25 października 2025
**Status**: ✅ Aktywny i gotowy do pracy
