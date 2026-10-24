# Checklist de Rendimiento Extremo (60 FPS & Cero Lag)

Esta guía define las verificaciones técnicas necesarias para garantizar máxima velocidad, fluidez en scroll, transiciones instantáneas y cero sobrecarga de memoria.

---

## 1. Selectores Atómicos en Zustand / Redux
- **Problema:** Suscribirse a todo el store causa re-render en todo el componente cada vez que cambia cualquier propiedad no relacionada.
- **Solución:** Extraer sólo los campos requeridos individualmente:
  ```tsx
  // ⚡ BIEN: Solo se re-renderiza si 'filtroFecha' cambia
  const filtroFecha = useDashboardStore(s => s.filtroFecha);
  const setFiltroFecha = useDashboardStore(s => s.setFiltroFecha);
  ```

---

## 2. Memoización Estratégica (Sin Sobre-optimización Ciega)
- **Cuando usar `useMemo`:**
  - Cálculos financieros de cotizaciones con tarifas por noche, temporadas y huéspedes adicionales.
  - Transformaciones de arreglos grandes (más de 100 elementos) al agrupar o filtrar para gráficos o tablas.
  - Generación de objetos de configuración para `Chart.js` o `react-chartjs-2`.
- **Cuando usar `useCallback`:**
  - En funciones manejadoras que se envían como props a componentes hijos memorizados con `React.memo`.
- **Cuando usar `React.memo`:**
  - En componentes de tarjetas (`FincaCard`), filas de tablas (`ReservaRow`), y celdas del calendario (`CalendarDayCell`).

---

## 3. Optimización de Listas y Tablas Densas
- Si una tabla o historial supera los 100 registros activos:
  - Implementar paginación virtual o desplazamiento paginado con límites (`limit` y `offset` en Supabase o en memoria).
  - Mantener las keys de React estrictamente estables (usar `item.id`, jamás índices de arreglo `key={index}`).

---

## 4. Debounce en Entradas de Texto y Búsqueda
- Evitar ejecutar filtros pesados en cada letra tecleada:
  ```tsx
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(handler);
  }, [query]);
  ```

---

## 5. Carga Dinámica (Code-Splitting)
- Separar módulos pesados que no se necesitan en el primer render:
  ```tsx
  import React, { Suspense, lazy } from 'react';

  const AdminCalendar = lazy(() => import('./admin/AdminCalendar'));
  const AdminComunicaciones = lazy(() => import('./admin/AdminComunicaciones'));

  // En el render:
  <Suspense fallback={<DashboardSkeleton />}>
    <AdminCalendar />
  </Suspense>
  ```

---

## 6. Monitoreo de Render y Métricas de Rendimiento
- **Tiempos de respuesta de interacción (INP):** Menos de 50ms para cualquier clic o selección.
- **Pintado inicial de contenido (FCP / LCP):** Skeletons inmediatos sin parpadeo blanco.
- **Tamaño de Bundle:** Evitar importar librerías completas de utilidades (usar `import debounce from 'lodash/debounce'` en lugar de `import _ from 'lodash'`).
