---
name: fincas-ui-ux
description: >-
  Especialista en diseño de interfaz (UI) y experiencia de usuario (UX) para el sistema de control de fincas.
  Aplica una estética "High-End" profesional basada en la guía de marca Futuro Digital Pro,
  con optimización y paridad dual obligatoria tanto en PC (escritorio) como en dispositivos móviles,
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
5. **Paridad de Experiencia Dual (Desktop & Mobile First-Class):** Ningún ajuste visual o de interfaz se considera terminado si solo se concibe o prueba para un factor de forma. Cada pantalla o componente debe ofrecer una experiencia impecable, balanceada y de alto impacto tanto en PC (aprovechamiento panorámico de alta densidad, microinteracciones con cursor, tablas completas) como en Mobile (ergonomía táctil para una mano, prevención de zoom involuntario, adaptabilidad al teclado virtual, cero desbordamiento horizontal).

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

* **Títulos y Encabezados Fluidos (H1, H2, H3):**
  * Fuente: `var(--font-dashboard)` o `var(--font-display)` con peso semibold/bold (`font-bold`).
  * `H1`: Adaptable `text-2xl sm:text-3xl lg:text-4xl` (28px en móvil a 40px en desktop), tracking estrecho (`tracking-tight`), color `var(--text)`.
  * `H2`: Adaptable `text-xl sm:text-2xl` (20px a 24px), estructurado y conciso.
  * `H3`: `text-base sm:text-lg` / `text-xl`, énfasis en métricas o títulos de sección.
* **Cuerpo de Texto y Datos (Body):**
  * Fuente: `var(--font-body)` (`DM Sans` / `Inter`).
  * Tamaño estándar: `16px` (`text-base`) para contenido principal, `14px` (`text-sm`) para tablas densas y formularios en desktop.
  * **Interlineado obligatorio:** `line-height: 1.6` (`leading-relaxed`) para máxima legibilidad sin fatiga visual.
* **Campos de Entrada en Móvil (Prevención de Zoom en iOS):**
  * Todo `<input>`, `<select>` y `<textarea>` debe tener obligatoriamente `text-base md:text-sm` (mínimo 16px en pantallas táctiles móviles) para evitar que Safari / iOS active zoom automático invasivo al enfocar el campo.

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

Todos los botones deben cumplir con el área táctil mínima ergonómica (`min-h-[44px] min-w-[44px]`) y ofrecer respuesta táctil instantánea (`active:scale-[0.98]`).

#### A. Botón Primario (Llamado a la Acción / CTA):
Fondo sólido con el color de acento o primario, texto en alto contraste, padding generoso y micro-elevación:
```tsx
<button className="
  inline-flex items-center justify-center gap-2.5
  min-h-[44px] px-6 sm:px-7 py-3 rounded-[var(--rad-sm)]
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
  min-h-[44px] px-5 sm:px-6 py-2.5 rounded-[var(--rad-sm)]
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

### 4.3. Inputs y Formularios (Focus Glow + iOS Safe)
Los campos de entrada deben integrarse orgánicamente en el tema oscuro, tener altura táctil mínima de 44px y tamaño de texto `text-base md:text-sm` para impedir el zoom intrusivo de iOS Safari:

```tsx
<input 
  type="text" 
  className="
    w-full min-h-[44px] px-4 py-2.5 sm:py-3 rounded-[var(--rad-xs)]
    bg-[var(--surface-2)] text-[var(--text)] text-base md:text-sm
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

### 4.5. Diálogo Adaptable (Modal Centrado en PC / Bottom Sheet en Móvil)
Para garantizar máxima ergonomía, los diálogos deben presentarse centrados en pantallas medianas/grandes y transformarse en una hoja inferior deslizable (*Bottom Sheet*) en dispositivos móviles:

```tsx
<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
  <div className="
    w-full sm:max-w-lg 
    max-h-[92vh] sm:max-h-[85vh] 
    flex flex-col
    rounded-t-2xl sm:rounded-[var(--rad-md)] 
    bg-[var(--surface)] border border-[var(--border)]
    p-5 sm:p-6 shadow-[var(--sh-xl)]
    overflow-hidden
  ">
    {/* Tirador visual táctil para móvil */}
    <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--border)] sm:hidden" />
    
    <div className="flex-1 overflow-y-auto">
      {/* Contenido del modal o formulario */}
    </div>
  </div>
</div>
```

### 4.6. Barra de Acciones Persistente Móvil (Sticky Action Bar)
En formularios extensos o flujos de reserva, los botones de acción principal deben quedar fijados en la parte inferior en móviles para acceso directo con el pulgar:

```tsx
<div className="
  fixed sm:static bottom-0 inset-x-0 z-30
  p-3 sm:p-0 
  bg-[var(--surface)]/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none 
  border-t sm:border-0 border-[var(--border)]
  flex items-center gap-3 justify-end
">
  {/* Botones de acción (ej. Cancelar / Guardar / Cotizar) */}
</div>
```

---

## 5. Directrices Maestras de Experiencia de Usuario: Optimización Dual PC & Mobile

> [!IMPORTANT]
> **ESTÁNDAR DE PARIDAD DUAL INQUEBRANTABLE:**
> Toda vista o componente debe diseñarse y optimizarse en paralelo para **PC (Escritorio / Laptop)** y **Dispositivos Móviles (Smartphones / Tablets)**. Está estrictamente prohibido degradar la experiencia de escritorio para acomodar el móvil, o ignorar la ergonomía móvil asumiendo que el usuario operará con ratón.

### 5.1. Filosofía de Coexistencia (Sin Concesiones)

| Dimensión | Experiencia en PC (Desktop / Laptop) | Experiencia en Móvil (Smartphones) |
| :--- | :--- | :--- |
| **Lienzo y Layout** | Multi-columna (`grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`), paneles laterales analíticos continuos, visualización panorámica de datos. | Columna única fluida (`flex-col`), acordeones colapsables, espaciado perimetral de seguridad (`px-3.5`). |
| **Interacción** | Puntero fino: efectos hover (`hover:border-[var(--accent)]`, `hover:shadow-...`), tooltips enriquecidos al pasar el cursor. | Ergonomía táctil para una mano (*Thumb Zone*): feedback inmediato al toque (`active:scale-[0.98]`), micro-vibración visual y barras fijas inferiores. |
| **Manejo de Tablas** | Tablas densas con todas sus columnas (ID, cliente, fechas, montos, estado, acciones). | *Adaptive Data Display*: En pantallas `< 768px`, las tablas se transforman en **tarjetas modulares** o en contenedores con scroll horizontal elástico y sombreado visual de continuidad. |
| **Modales y Diálogos** | Ventanas modales centradas (`max-w-xl` o `max-w-2xl`) con scroll interno limpio. | **Bottom Sheets** (hojas emergentes desde el fondo de pantalla) con tirador táctil y altura adaptable (`max-h-[92vh]`). |

### 5.2. Reglas Táctiles y Ergonómicas Estrictas

1. **Target Táctil Mínimo (Touch Target 44x44px):**
   * Cualquier botón, pestaña, icono clickeable, checkbox o enlace interactivo debe medir como mínimo `44px x 44px` (`min-h-[44px] min-w-[44px]`).
   * Separación mínima obligatoria de `8px` a `12px` entre controles táctiles contiguos para erradicar pulsaciones accidentales (*fat-finger errors*).
2. **Prevención de Zoom Involuntario en iOS:**
   * En todo `<input>`, `<select>` y `<textarea>`, la fuente debe ser de al menos `16px` en móvil (`text-base md:text-sm`). Si el tamaño es menor a 16px, Safari en iOS fuerza un zoom automático que descompone la alineación de la página.
3. **Blindaje Anti-Scroll Horizontal:**
   * Las vistas raíz y contenedores principales deben portar siempre `w-full max-w-full overflow-x-hidden`.
   * Prohibido definir anchos fijos rígidos que superen el ancho del viewport (usar `w-full max-w-md` en lugar de `w-[480px]`).
4. **Resguardo Perimetral Móvil:**
   * Padding lateral de seguridad en pantallas móviles (`px-3.5` a `px-4`), garantizando que ningún texto, input o botón roce el borde del cristal del teléfono.
5. **Convivencia con el Teclado Virtual:**
   * Los formularios en pantallas móviles deben incluir padding inferior de resguardo (`pb-28` o contenedor flexible con `scroll-padding`) para que los botones de acción ("Guardar", "Confirmar") nunca queden sepultados tras el teclado en pantalla.

### 5.3. Estados Vacíos, Cargas y Microinteracciones Responsivas

1. **Skeletons Proporcionales al Dispositivo:**
   * Los esqueletos de carga deben mantener la misma geometría del contenido final (en PC replican la grilla multi-columna; en móvil replican tarjetas apiladas).
2. **Feedback Visual Inmediato al Tacto:**
   * Debido a que en pantallas táctiles no existe el estado `hover`, los botones e ítems de lista deben utilizar clases activas sutiles (`active:scale-[0.98]` o `active:bg-[var(--surface-3)]`) garantizando respuesta visual en `< 50ms`.

---

## 6. Procedimiento Paso a Paso al Rediseñar una Vista (Protocolo Dual)

Cuando se solicite agregar, retocar o refactorizar visualmente cualquier vista:

1. **Inspección Previa (Desktop & Mobile):**
   * Leer el componente y evaluar cómo se comporta tanto en viewport de escritorio como en pantalla móvil estrecha.
   * Identificar variables de estado, stores y funciones que deben permanecer 100% intactas.
2. **Aplicar el Estándar Dual:**
   * Estructurar el layout con utilidades responsivas (`sm:`, `md:`, `lg:`).
   * Envolver secciones en contenedores `Card Pro`.
   * Asegurar que los botones tengan `min-h-[44px]`, `active:scale-[0.98]` y que los inputs porten `text-base md:text-sm`.
   * En tablas densas, asegurar formato responsivo (tarjetas en móvil o scroll horizontal controlado).
3. **Validación Dual Obligatoria:**
   * **Checkpoint Desktop (1280px - 1920px):** Verificar alineación de grillas, espaciado armónico, legibilidad de tablas completas y efectos hover de precisión.
   * **Checkpoint Mobile (360px - 430px):** Verificar usabilidad táctil con una sola mano, ausencia total de scroll horizontal involuntario, correcta apertura y cierre de formularios con teclado virtual y botones de acción accesibles.
