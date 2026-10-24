# Reglas Maestras de Desarrollo: Blindaje, Desacoplamiento y Rendimiento

Este proyecto opera bajo estrictas directivas de **no-regresión (zero-breakage)**, **arquitectura desacoplada en 4 capas** y **optimización de rendimiento a 60 FPS**.

---

## 1. Principio Fundamental: Preservación de Lógica Activa
1. **No Destrucción:** Queda terminantemente prohibido sobrescribir o eliminar componentes funcionales asumiendo que "se reharán de cero". Todo cambio debe adaptarse sobre lo que ya funciona.
2. **Respeto a Contratos:** No modificar nombres ni tipos en `src/types/index.ts` sin compatibilidad hacia atrás.
3. **Persistencia y Base de Datos:** Toda funcionalidad conectada a Supabase o al estado reactivo (`src/store/`, `src/context/AppContext.tsx`, `src/services/`) debe preservar sus métodos, queries y validaciones.

---

## 2. Arquitectura Desacoplada Obligatoria
- **Capa Visual (Dumb UI):** Los componentes en `src/components/` o `src/admin/` solo renderizan interfaz y emiten eventos. Cero lógica de negocio o llamadas directas crudas a la base de datos dentro del JSX.
- **Capa Controladora (Hooks Desacoplados):** La lógica de interacción, validaciones y cálculos derivados reside en Custom Hooks (`use[Nombre]Controller.ts` o en `src/hooks/`).
- **Capa de Estado Centralizado:** La coordinación entre vistas se gestiona en Zustand / Contextos (`useAdminDashboardStore`, `useClientStore`, `useComunicacionesStore`), garantizando sinergia entre todos los paneles (Calendario, Reservas, Cotizaciones, Clientes, Historial, Métricas) sin recargas.
- **Capa de Servicios & Realtime:** Llamadas tipadas a Supabase y canales en tiempo real (`postgres_changes`) gestionados en `src/services/`.

---

## 3. Estándar de Fluidez y Rendimiento (60 FPS)
- Utilizar **selectores atómicos** al consumir stores de Zustand (`state => state.propiedad`) para evitar re-renders innecesarios.
- Cálculos intensivos (sumatorias financieras, cálculos de cotizaciones, filtros de fechas) deben estar memoizados con `useMemo`.
- Las funciones pasadas como props a componentes de listas deben protegerse con `useCallback`.
- Implementar **actualizaciones optimistas** para que la UI responda de inmediato (< 50ms) mientras Supabase confirma en segundo plano.
- Mantener las interfaces táctiles fluidas (mínimo 44x44px en móviles) y soporte mobile-first.

---

## 4. Skills de Referencia Asociadas
- **`architecture-shield-optimizer`**: Consultar para la arquitectura de 4 capas, sincronización en tiempo real y guías de rendimiento.
- **`fincas-ui-ux`**: Consultar para la paleta de colores (`var(--primary)`, `var(--accent)`, `var(--surface)`), tokens y biblioteca de componentes High-End.
