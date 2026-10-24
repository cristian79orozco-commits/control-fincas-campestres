---
name: architecture-shield-optimizer
description: >-
  Especialista en arquitectura modular desacoplada, blindaje de lógica funcional existente,
  centralización multi-panel y optimización de rendimiento a alta velocidad (60 FPS).
  Usa esta skill obligatoriamente antes y durante cualquier refactorización, modificación o nueva funcionalidad
  en proyectos con React, TypeScript, Tailwind, Zustand/Redux Toolkit y Supabase con sincronización en tiempo real.
---

# Skill: Architecture Shield & Performance Optimizer

Esta skill define el **estándar arquitectónico maestro, protocolo de no-regresión y motor de optimización de rendimiento** para la aplicación. Su objetivo es garantizar que cualquier cambio o mejora visual/funcional se adapte con precisión quirúrgica sobre la lógica ya activa, separando limpiamente la UI de la base de datos, garantizando sinergia en tiempo real entre todos los paneles y logrando máxima velocidad y fluidez.

---

## 1. Los 5 Mandamientos de Blindaje (Zero-Breakage)

> [!IMPORTANT]
> **REGLA SUPREMA:** Trabajar SIEMPRE sobre lo que está funcionando. Jamás eliminar, renombrar o reescribir funciones activas, contratos de datos o stores a menos que sea una refactorización guiada y validada paso a paso.

1. **Inspección Previa Obligatoria:** Antes de tocar un archivo, mapear:
   - Interfaces TypeScript (`src/types/index.ts`).
   - Hooks y métodos del contexto o store (`src/store/`, `src/hooks/`, `src/context/`).
   - Event handlers y flujos de datos en componentes padre e hijos.
2. **Inmutabilidad de Contratos de Datos:** Si un componente recibe `(reserva: Reserva, onSave: () => void)`, no se pueden alterar las firmas de las props ni omitir callbacks requeridos.
3. **Desacoplamiento Estricto:** Ningún componente visual de presentación (botones, tablas, cards, formularios) debe contener consultas crudas SQL/Supabase (`supabase.from(...)`) ni mutaciones no mediadas por un hook controlador o store.
4. **Adición Incremental:** Los nuevos requerimientos se implementan de forma aditiva: extensiones modulares que enriquecen el sistema sin modificar destructivamente lo existente.
5. **Verificación de No-Regresión:** Antes de dar por concluida una tarea, comprobar que los flujos asociados (creación, edición, listado, filtros, cálculos y sincronización entre paneles) sigan operativos sin errores de compilación ni excepciones en consola.

---

## 2. Arquitectura Desacoplada en 4 Capas

Para garantizar que puedas cambiar la interfaz visual sin que se rompa la base de datos ni los paneles dependientes, toda la aplicación se rige por esta estructura:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CAPA VISUAL / PRESENTACIONAL (Dumb UI / High-End Design)  │
│    - Componentes JSX/TSX puros y reutilizables               │
│    - Solo reciben Props: datos listos + callbacks           │
│    - Cero lógica de negocio, cero llamadas a Supabase       │
└──────────────────────────────┬──────────────────────────────┘
                               │ consume props / callbacks
┌──────────────────────────────▼──────────────────────────────┐
│ 2. CAPA CONTROLADORA (Modular Controller Hooks)             │
│    - Hooks desacoplados (ej: useReservasController)         │
│    - Validaciones, cálculos derivados, estados de UI locales│
│    - Traduce eventos del usuario a acciones del Store       │
└──────────────────────────────┬──────────────────────────────┘
                               │ despacha acciones / lee estado
┌──────────────────────────────▼──────────────────────────────┐
│ 3. CAPA DE ESTADO REACTIVO CENTRALIZADO (Zustand / Redux)   │
│    - Tienda global centralizada (Sinergia Multi-Panel)       │
│    - Selectores atómicos de grano fino (Cero re-renders)    │
│    - Actualizaciones optimistas (UI instantánea < 50ms)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ orquesta peticiones y realtime
┌──────────────────────────────▼──────────────────────────────┐
│ 4. CAPA DE SERVICIOS Y REALTIME (Supabase SDK & APIs)       │
│    - Métodos tipados en src/services/                       │
│    - Suscripciones en tiempo real (Postgres Changes)        │
│    - Reconciliación in-memory sin re-fetch destructivo       │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Centralización y Sinergia Multi-Panel

La plataforma cuenta con paneles interconectados (Dashboard general, Calendario, Reservas, Cotizaciones, Clientes, Historial, Comunicaciones y Configuración).

### Principio de Sinergia Unificada
> Cuando ocurre una acción en un panel, **todos los paneles afectados deben actualizarse instantáneamente sin recargar la página**.

* **Ejemplo 1 (Nueva Reserva creada en Calendario):**
  - Se añade inmediatamente a la lista de reservas.
  - El contador de métricas del Dashboard actualiza sus ingresos y ocupación.
  - La ficha del Cliente vincula la nueva estancia.
  - El panel de Comunicaciones habilita el flujo de recordatorios por WhatsApp.
* **Mecanismo:** Un único bus reactivo de estado (Zustand Stores) sincronizado bidireccionalmente con los canales de **Supabase Realtime**.

---

## 4. Estrategia de Estados Reactivos y Supabase Realtime

### 4.1. Zustand con Selectores Atómicos (Evitar Re-renders)
❌ **Incorrecto (provoca re-render masivo en todo el panel):**
```tsx
const { reservas, fincas, clientes, metricas } = useApp(); // Escucha todo
```
✅ **Correcto (selectores atómicos):**
```tsx
const reservas = useApp(state => state.reservas);
const totalIngresos = useApp(state => state.metricas.totalIngresos);
```

### 4.2. Sincronización en Tiempo Real con Supabase
Al inicializar o montar el módulo raíz de la aplicación, se establecen suscripciones resilientes a cambios de PostgreSQL (`INSERT`, `UPDATE`, `DELETE`):

```ts
// Patrón de canal en tiempo real en Store / Service
export const subscribeToRealtimeChanges = (onUpdate: (payload: any) => void) => {
  const channel = supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reservas' },
      (payload) => onUpdate(payload)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
```

### 4.3. Actualizaciones Optimistas (Optimistic Updates)
Para que la aplicación se sienta ultra-rápida:
1. Al pulsar "Guardar", el Store actualiza el estado local en memoria de inmediato (UI responde en < 16ms).
2. Se ejecuta la llamada asíncrona a Supabase en segundo plano.
3. Si la base de datos responde exitosamente, se confirma el registro.
4. Si ocurre un fallo de red o error de BD, se revierte al estado anterior (*rollback*) y se muestra una notificación sutil.

---

## 5. Optimización de Rendimiento Extremo (Fluidez a 60 FPS)

Para eliminar tirones, lentitud en scroll o retraso en formularios complejos:

1. **Memoización Estratégica:**
   - Cálculos intensivos (sumatorias financieras, cálculos de disponibilidad, filtros de fechas) envueltos estrictamente en `useMemo`.
   - Callbacks pasados a listas o tablas complejas protegidos con `useCallback`.
   - Componentes de tarjeta o fila envueltos en `React.memo` con comparación de ID y fecha de actualización.
2. **Debounce en Búsquedas y Filtros:**
   - Búsquedas por texto o inputs de filtro deben incorporar debounce de 250ms–300ms para no disparar filtros en cada pulsación de tecla.
3. **Carga Perezosa (Code-Splitting / Lazy Loading):**
   - Vistas pesadas (`AdminCalendar`, `AdminComunicaciones`, reportes PDF, modales densos) cargados dinámicamente con `React.lazy` y `Suspense` con skeletons elegantes.
4. **Sanitización de Estado Local:**
   - No duplicar en el estado local de un componente datos que ya existen en el store global. La única fuente de verdad debe ser el Store.

---

## 6. Runbook de Modificación Segura (Paso a Paso)

Cuando se solicite agregar, retocar o refactorizar cualquier panel o vista:

### Fase 1: Diagnóstico (Antes de escribir una sola línea)
1. Leer el componente y sus dependencias (`read_file`).
2. Identificar qué partes son puramente visuales y cuáles tocan la base de datos o el store.
3. Verificar si existen tests o tipos TypeScript que deban ser respetados.

### Fase 2: Desacoplamiento (Si la lógica está mezclada)
1. Extraer la lógica de negocio y llamadas a un Custom Hook (`useNombrePanelController.ts`).
2. Dejar la vista (`NombrePanel.tsx`) como consumidor limpio de dicho hook o de props.
3. Confirmar que las variables, nombres de handlers y valores devueltos sean 100% compatibles.

### Fase 3: Aplicación de Mejoras Visuales o Nuevas Funciones
1. Modificar el componente visual aplicando los tokens de diseño (ver `fincas-ui-ux`).
2. Añadir las nuevas propiedades requeridas sin eliminar las existentes.
3. Optimizar re-renders con selectores y memoización.

### Fase 4: Validación y Verificación
1. Validar tipos de TypeScript con `npx tsc --noEmit` o build.
2. Confirmar que la sinergia multi-panel se mantenga (comprobar que la vista responde a cambios en otros paneles).
3. Asegurar fluidez visual (sin parpadeos de pantalla completa ni pérdida de foco en inputs).

---

## 7. Referencias y Ejemplos Incluidos

Para ver implementaciones listas para usar, consulta:
- [Capas Arquitectónicas](./references/architecture-layers.md)
- [Sincronización en Tiempo Real y Sinergia](./references/realtime-and-synergy.md)
- [Checklist de Rendimiento 60 FPS](./references/performance-checklist.md)
- [Ejemplo de Componente Desacoplado](./examples/decoupled-component-pattern.tsx)
- [Ejemplo de Store Zustand + Supabase Realtime](./examples/realtime-store-pattern.ts)
