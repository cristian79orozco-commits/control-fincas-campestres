# 🏡 Fincas Campestres · Plataforma de Control y Reservas de Alquiler

[![React](https://img.shields.io/badge/React-18-blue.svg?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg?logo=vite)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Storage-3ECF8E.svg?logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Plataforma web moderna y de alto rendimiento diseñada para la gestión, exhibición y reserva directa de fincas campestres y casas de recreo en **Santa Elena, Valle del Cauca, Colombia**.

Conectada a **Supabase (PostgreSQL, Storage y Auth)** en tiempo real, con cotizador dinámico de estadías y reservas automatizadas por **WhatsApp**, sin intermediarios ni comisiones.

---

## ✨ Características Principales

### 🌿 Experiencia de Huésped (Vista Cliente)
- **Catálogo Interactivo**: Tarjetas detalladas con estado en tiempo real (*Disponible, Alta demanda, Fin de semana, Ocupado*), capacidad máxima, precios por persona y amenidades.
- **Filtro de Disponibilidad Real**: Buscador por fechas de llegada y salida que comprueba en vivo contra la base de datos de bloqueos en Supabase para descartar propiedades ocupadas.
- **Galería Fotográfica con Lightbox**: Visor de imágenes a pantalla completa con navegación táctil, teclado y soporte para carrusel en alta resolución.
- **Calendario Interactivo con Selección de Rango**: Los clientes seleccionan la fecha de entrada y salida directamente sobre el calendario mensual, con validación instantánea contra días no disponibles.
- **Cotizador en Vivo**: Cálculo automático en tiempo real según número de noches, personas y plan de alimentación seleccionado (*Sin alimentación, Desayuno, Todo incluido*).
- **Reserva Directa por WhatsApp**: Genera automáticamente un mensaje estructurado y listo para enviar al número del anfitrión con los datos completos de la reserva.
- **Tema Claro / Oscuro**: Paleta rústica artesanal inspirada en tonos tierra y bosque, con persistencia en `localStorage`.

### 🛡️ Panel de Administración (Vista Admin)
- **Autenticación con Supabase Auth**: Acceso seguro con correo y contraseña, con persistencia de sesión JWT.
- **Acceso Rápido "Easter Egg"**: Tres clics sobre el logotipo de la marca despliegan el modal de inicio de sesión administrativo desde cualquier pantalla.
- **CRUD Completo de Propiedades**: Crear, editar, fijar capacidades, precios, descripciones, planes y números de contacto individuales.
- **Gestión de Fotografías con Supabase Storage**: Subida directa desde dispositivo móvil o escritorio con soporte automático para formatos JPG, PNG, WEBP y archivos HEIC/HEIF de iPhone.
- **Calendario Multi-día de Bloqueos**: Selección interactiva de múltiples fechas para marcar como libres u ocupadas, registrando el nombre del huésped de forma privada.
- **Control de Reservas**: Tabla administrativa con detalle de fechas ocupadas y botón de liberación con un solo clic.
- **Configuración de WhatsApp Central**: Actualización del número predeterminado para todas las reservas.
- **Suscripciones en Tiempo Real (Supabase Realtime)**: Cualquier bloqueo o modificación realizada por el admin se refleja al instante en los navegadores de los clientes.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) |
| **Bundler & Tooling** | [Vite 6](https://vitejs.dev/) |
| **Iconografía** | [Lucide React](https://lucide.dev/) |
| **Estilos** | CSS Moderno con Custom Properties (Tokens HSL, Glassmorphism, Micro-animaciones) |
| **Base de Datos** | [PostgreSQL en Supabase](https://supabase.com/) |
| **Almacenamiento** | Supabase Storage (`finca-imagenes` bucket) |
| **Autenticación** | Supabase Auth (Email & Password) |
| **Tiempo Real** | Supabase Realtime Channels (Postgres Changes) |

---

## 🚀 Inicio Rápido en Local

### Prerrequisitos
- [Node.js](https://nodejs.org/) v18 o superior.
- Gestor de paquetes `npm`, `pnpm` o `yarn`.

### Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/control-de-fincas-campestres.git
   cd control-de-fincas-campestres
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar las variables de entorno:**
   Copia el archivo de plantilla `.env.example` y crea tu `.env`:
   ```bash
   cp .env.example .env
   ```
   Rellena con tus datos de Supabase:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
   VITE_DEFAULT_WA_NUMBER=573176827093
   ```

4. **Ejecutar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

5. **Compilar para producción:**
   ```bash
   npm run build
   ```

---

## 🗄️ Configuración de la Base de Datos (Supabase)

En la carpeta [`supabase/`](supabase/schema.sql) encontrarás el script SQL listo para inicializar tu base de datos:

1. Ingresa a tu panel de **Supabase** -> **SQL Editor**.
2. Abre el archivo [`supabase/schema.sql`](supabase/schema.sql) y pega su contenido.
3. Ejecuta el script (**Run**). Esto creará:
   - Tabla `fincas` con triggers para `updated_at`.
   - Tabla `finca_imagenes` con índices y ordenación.
   - Tabla `finca_amenidades` y `finca_planes`.
   - Tabla `disponibilidad` con validación de fechas continuas.
   - Políticas de seguridad **RLS (Row Level Security)** que permiten lectura pública a visitantes anónimos y restringen modificaciones exclusivamente a administradores autenticados.
   - Bucket público de almacenamiento `finca-imagenes` con políticas de carga.

---

## 🌐 Despliegue en Producción

La aplicación está lista para desplegarse con un solo clic en plataformas estáticas modernas:

### Despliegue en Vercel
1. Conecta tu repositorio de GitHub en [Vercel](https://vercel.com).
2. En la sección **Environment Variables**, añade:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DEFAULT_WA_NUMBER`
3. Haz clic en **Deploy**.

### Despliegue en Netlify
1. Conecta tu repositorio en [Netlify](https://www.netlify.com).
2. Comando de compilación: `npm run build`
3. Directorio de publicación: `dist`
4. Configura las mismas variables de entorno en **Site Configuration > Environment Variables**.

---

## 📁 Estructura del Proyecto

```
├── .env.example              # Plantilla pública de variables de entorno
├── .gitignore                # Exclusión de archivos sensibles para Git
├── index.html                # Entry point HTML optimizado con Google Fonts
├── package.json              # Dependencias y scripts del proyecto
├── tsconfig.json             # Configuración de compilador TypeScript
├── vite.config.ts            # Configuración de Vite con React
├── README.md                 # Documentación completa
├── supabase/
│   └── schema.sql            # Script DDL, índices y políticas RLS
└── src/
    ├── main.tsx              # Inicialización de la aplicación React
    ├── App.tsx               # Enrutamiento de vistas y estado global
    ├── index.css             # Tokens de diseño, tema light/dark y utilidades
    ├── types/
    │   └── index.ts          # Interfaces TypeScript (Finca, Bloqueo, Cotización)
    ├── services/
    │   └── supabase.ts       # Cliente Supabase inicializado con env vars
    ├── hooks/
    │   ├── useAuth.ts        # Hook de autenticación y sesión
    │   ├── useFincas.ts      # Hook de propiedades y tiempo real
    │   └── useDisponibilidad.ts # Hook de calendario, bloqueos y validación
    ├── components/
    │   ├── Navbar.tsx        # Barra de navegación superior con acceso secreto
    │   ├── Hero.tsx          # Panel hero con estadísticas y pasos
    │   ├── Catalog.tsx       # Catálogo con filtro de fechas real
    │   ├── FincaCard.tsx     # Tarjeta individual de finca
    │   ├── FincaDetail.tsx   # Detalle, galería y cotizador
    │   ├── CalendarPicker.tsx# Selector de fechas por rango en calendario
    │   ├── QuoteCalculator.tsx# Cotizador en vivo y WhatsApp
    │   ├── GalleryLightbox.tsx# Visor de fotos pantalla completa
    │   ├── Toast.tsx         # Notificaciones flotantes
    │   └── ConfirmModal.tsx  # Diálogo de confirmación
    └── admin/
        ├── AdminDashboard.tsx   # Panel administrativo principal
        ├── AdminFincaForm.tsx   # Formulario con subida de fotos a Storage
        ├── AdminCalendar.tsx    # Calendario multi-día para anfitriones
        ├── AdminReservasTable.tsx# Tabla de fechas ocupadas y liberación
        └── AdminWaConfig.tsx    # Configuración de WhatsApp central
```

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.
