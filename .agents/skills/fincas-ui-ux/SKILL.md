---
name: fincas-ui-ux
description: >-
  Especialista en diseño de interfaz (UI) y experiencia de usuario (UX) para el sistema de control de fincas.
  Aplica una estética "High-End" profesional basada en la guía de marca Futuro Digital Pro,
  utilizando estrictamente la paleta de colores y variables CSS existentes, y garantizando la preservación
  total de la lógica de negocio, stores y funciones en ejecución.
---

# Skill: UI/UX High-End para Control de Fincas

Esta skill define el estándar visual, los patrones de componentes y los principios de diseño para el frontend de la plataforma de **Control de fincas de alquiler**.

Su objetivo es entregar una experiencia visualmente impactante, limpia, sofisticada (*High-End*) y ultra-legible, **respetando al 100% la paleta de colores existente del proyecto y protegiendo de forma absoluta la lógica de negocio y arquitectura de estado**.

---

## 1. Principio Fundamental: Blindaje de Lógica y Centralización

> [!CAUTION]
> **REGLA DE ORO DE DESARROLLO:**
> Jamás se debe alterar la lógica funcional, los cálculos, la centralización de datos o las llamadas a servicios al realizar mejoras de UI/UX.

Al intervenir cualquier vista o componente:
1. **Preservar Stores y Contextos:** No modificar los stores de Zustand (`useAdminDashboardStore`, `useClientStore`), hooks de autenticación (`useAuth`) ni contextos existentes.
2. **Preservar Props y Tipos:** Mantener intactas las interfaces TypeScript (`props`, `types`, enums) y los contratos de datos existentes.
3. **Preservar Controladores de Eventos:** Los handlers (`onClick`, `onChange`, `onSubmit`, filtros, paginación, cálculo de cotizaciones) deben permanecer funcionalmente idénticos; únicamente se estiliza su presentación y retroalimentación visual.
4. **Cero Efectos Secundarios:** Las mejoras deben ser visuales y de interacción: clases de Tailwind, estilos CSS nativos, transiciones y microinteracciones.

---

## 2. ADN Visual (Inspiración High-End + Paleta del Proyecto)

El diseño combina la sofisticación y precisión técnica del concepto **Futuro Digital Pro** con la identidad cálida y campestre de la plataforma:

### 2.1. Mapeo de Tokens y Paleta de Colores

Queda prohibido el uso de colores genéricos quemados o no alineados. Se deben utilizar exclusivamente los tokens del proyecto definidos en `src/index.css` y `tailwind.config.js`:

| Concepto Visual (Guía Pro) | Token del Proyecto | Valor Dark (Predeterminado) | Valor Light | Uso Estratégico |
| :--- | :--- | :--- | :--- | :--- |
| **Acento Primario** | `var(--primary)` | `#4da89e` (Esmeralda tecnológico) | `#1a6b5e` | Acciones clave, estados activos, métricas positivas |
| **Acento Secundario (Glow/CTA)** | `var(--accent)` | `#d4924a` (Ámbar dorado cálido) | `#c47a28` | CTAs principales, highlights, glow en inputs, alertas suaves |
| **Fondo Base** | `var(--bg)` | `#141210` (Negro profundo cálido) | `#f5f2eb` | Fondo de la aplicación |
| **Superficie Nivel 1** | `var(--surface)` | `#1a1814` (Slate cálido profundo) | `#fdfcf8` | Cards principales, modales, barras laterales |
| **Superficie Nivel 2** | `var(--surface-2)` | `#201e19` | `#f0ece1` | Sub-tarjetas, cabeceras de tablas, contenedores internos |
| **Superficie Nivel 3** | `var(--surface-3)` | `#272420` | `#e8e2d5` | Hover en elementos de lista, dropdowns |
| **Bordes Sutiles** | `var(--border)` | `#312e28` (Borde sutil 1px) | `#dbd4c3` | Delimitación elegante sin saturar |
| **Texto Principal** | `var(--text)` | `#f0eae0` (Blanco cálido suave) | `#1e1b13` | Títulos y datos de alto contraste |
| **Texto Secundario** | `var(--text-muted)`| `#a8a097` (Gris neutro legible) | `#6b6457` | Microcopy, subtítulos, etiquetas |

---

## 3. Tipografía y Escala Visual

La jerarquía tipográfica debe garantizar claridad inmediata en pantallas de alta densidad:

* **Títulos y Encabezados (H1, H2, H3):**
  * Fuente: `var(--font-dashboard)` o `var(--font-display)` con peso semibold/bold (`font-bold`).
  * `H1`: 36px - 42px (`text-3xl` o `text-4xl`), tracking estrecho (`tracking-tight`), color `var(--text)`.
  * `H2`: 24px - 28px (`text-2xl`), estructurado y conciso.
  * `H3`: 18px - 20px (`text-lg` / `text-xl`), énfasis en métricas o títulos de sección.
* **Cuerpo de Texto y Datos (Body):**
  * Fuente: `var(--font-body)` (`DM Sans` / `Inter`).
  * Tamaño estándar: `16px` (`text-base`) para contenido principal, `14px` (`text-sm`) para tablas densas y formularios.
  * **Interlineado obligatorio:** `line-height: 1.6` (`leading-relaxed`) para máxima legibilidad sin fatiga visual.

---

## 4. Biblioteca de Patrones de Componentes High-End

### 4.1. Card Pro (Tarjetas de Métricas, Fincas y Paneles)
Las tarjetas deben lucir pulidas, con elevación controlada y un borde sutil que reaccione al contexto:

```tsx
// Patrón de Card Pro
<div className="
  relative overflow-hidden rounded-[var(--rad-md)] 
  bg-[var(--surface)] border border-[var(--border)]
  p-6 shadow-[var(--sh-md)]
  transition-all duration-300 ease-out
  hover:border-[var(--accent)] hover:shadow-[0_8px_30px_rgba(212,146,74,0.08)]
">
  {/* Gradiente de luz ambiental sutil en esquina superior */}
  <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[var(--accent)]/5 blur-3xl" />
  
  <div className="relative z-10">
    {/* Contenido de la Card */}
  </div>
</div>
```

### 4.2. Botones de Acción (Button Pro)

#### A. Botón Primario (Llamado a la Acción / CTA):
Fondo sólido con el color de acento o primario, texto en alto contraste, padding generoso y micro-elevación:
```tsx
<button className="
  inline-flex items-center justify-center gap-2.5
  px-7 py-3 rounded-[var(--rad-sm)]
  bg-[var(--accent)] text-[#141210] font-semibold text-sm tracking-wide
  shadow-[0_2px_10px_rgba(212,146,74,0.25)]
  transition-all duration-200 ease-in-out
  hover:brightness-110 hover:shadow-[0_4px_20px_rgba(212,146,74,0.4)]
  active:scale-[0.98]
  disabled:opacity-50 disabled:cursor-not-allowed
">
  {children}
</button>
```

#### B. Botón Secundario (Borde Fino con Glow Suave al Hover):
Fondo transparente o superficie sutil, borde de 1px y efecto *glow* al pasar el cursor:
```tsx
<button className="
  inline-flex items-center justify-center gap-2
  px-6 py-2.5 rounded-[var(--rad-sm)]
  bg-transparent text-[var(--text)] font-medium text-sm
  border border-[var(--border)]
  transition-all duration-200 ease-in-out
  hover:border-[var(--accent)] hover:text-[var(--accent)]
  hover:shadow-[0_0_15px_rgba(212,146,74,0.15)]
  active:scale-[0.98]
">
  {children}
</button>
```

### 4.3. Inputs y Formularios (Focus Glow)
Los campos de entrada deben integrarse orgánicamente en el tema oscuro, ofreciendo feedback nítido al foco:

```tsx
<input 
  type="text" 
  className="
    w-full px-4 py-3 rounded-[var(--rad-xs)]
    bg-[var(--surface-2)] text-[var(--text)] text-sm
    border border-[var(--border)]
    placeholder:text-[var(--text-muted)]/60
    outline-none transition-all duration-200
    focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]
    focus:shadow-[0_0_12px_rgba(212,146,74,0.2)]
  "
/>
```

### 4.4. Badges de Estado (Disponibilidad, Reservas, Métricas)
Insignias de datos compactas, semitransparentes y con borde nítido:
```tsx
// Éxito / Disponible
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20">
  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
  Disponible
</span>

// Acento / En Proceso
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/25">
  Confirmada
</span>
```

---

## 5. Reglas de Experiencia de Usuario (UX)

1. **Mobile-First para Vistas Operativas:** Los administradores deben poder operar el historial, cotizador y fichas de fincas desde dispositivos móviles con total fluidez.
   * Elementos táctiles mínimos: `44px x 44px`.
   * Tablas con desplazamiento horizontal suave o transformación a formato de tarjeta en pantallas pequeñas (`< 768px`).
2. **Estados Vacíos y de Carga Elegantes (Empty & Loading States):**
   * Reemplazar spinners genéricos por esqueletos (*skeletons*) que pulsen suavemente respetando el color `var(--surface-2)`.
   * En listas vacías, presentar ilustraciones o iconos minimalistas con un mensaje claro y un botón secundario de acción.
3. **Micro-interacciones y Feedback:**
   * Cualquier botón de copiado, guardado o confirmación debe ofrecer feedback inmediato (cambio de icono, toast sutil o micro-animación).

---

## 6. Procedimiento Paso a Paso al Rediseñar una Vista

Cuando el usuario pida mejorar o refactorizar visualmente una vista:
1. **Inspeccionar:** Leer el archivo objetivo e identificar:
   * Variables de estado y funciones que deben permanecer intactas.
   * Componentes nativos o Tailwind que pueden elevarse al estándar High-End.
2. **Aplicar el Estándar:**
   * Envolver secciones en contenedores `Card Pro`.
   * Ajustar botones a los estilos primario o secundario con efecto glow.
   * Asegurar que los inputs tengan el estado `focus:shadow-[0_0_12px_...]`.
   * Verificar la consistencia tipográfica (`leading-relaxed`, contraste `var(--text)` vs `var(--text-muted)`).
3. **Validar:**
   * Verificar que todas las funciones, eventos y props sigan enlazados correctamente sin pérdidas de datos.
