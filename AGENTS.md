# Reglas Maestras de Desarrollo: Blindaje, Desacoplamiento y Rendimiento

Este proyecto opera bajo estrictas directivas de **no-regresión (zero-breakage)**, **arquitectura desacoplada en 4 capas**, **optimización de rendimiento a 60 FPS** y **paridad obligatoria PC & Dispositivos Móviles**.

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

---

## 4. Garantía de Optimización Dual Obligatoria (PC y Mobile)
- **Paridad de Plataforma:** Todo cambio, ajuste visual o nueva característica debe implementarse y validarse de forma paralela para PC (escritorio) y dispositivos móviles.
- **Reglas Móviles Inquebrantables:**
  - Áreas táctiles mínimas de 44x44px (`min-h-[44px] min-w-[44px]`).
  - Inputs con tamaño mínimo de fuente `text-base md:text-sm` (16px en móvil) para evitar el zoom automático invasivo en iOS Safari.
  - Blindaje contra scroll horizontal no deseado (`w-full max-w-full overflow-x-hidden`).
  - Tablas densas adaptadas a tarjetas (*cards*) o scrolls horizontales fluidos en `< 768px`.
  - Formularios con margen inferior suficiente para no tapar botones con el teclado virtual.
- **Experiencia de Escritorio (PC):** Mantener el aprovechamiento panorámico, microinteracciones hover y visualización analítica densa sin comprometerla por las restricciones móviles.

---

## 5. Skills de Referencia Asociadas
- **`architecture-shield-optimizer`**: Consultar para la arquitectura de 4 capas, sincronización en tiempo real, rendimiento 60 FPS y blindaje multi-dispositivo.
- **`fincas-ui-ux`**: Consultar para la paleta de colores (`var(--primary)`, `var(--accent)`, `var(--surface)`), tokens, directrices ergonómicas y biblioteca de componentes High-End para PC y móvil.
