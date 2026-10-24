# Guía Detallada: Arquitectura Desacoplada en 4 Capas

El propósito de esta arquitectura es conseguir que **puedas rediseñar o cambiar cualquier pantalla sin riesgo de alterar la base de datos**, y viceversa, cambiar una consulta a Supabase sin romper la interfaz visual.

---

## Capa 1: Capa Visual / Presentacional (Dumb UI)
- **Rol:** Renderizar JSX, aplicar clases Tailwind, manejar animaciones con Framer Motion, y emitir eventos del usuario.
- **Regla Estricta:** NO conoce Supabase ni sabe cómo se calculan las tarifas o métricas. Solo recibe props o el retorno limpio de su hook controlador.
- **Ejemplo:**
```tsx
interface AdminReservasViewProps {
  reservas: Reserva[];
  isLoading: boolean;
  onSelectReserva: (id: string) => void;
  onFiltrarEstado: (estado: ReservaEstado | 'todos') => void;
  estadoSeleccionado: string;
}

export const AdminReservasView: React.FC<AdminReservasViewProps> = ({
  reservas,
  isLoading,
  onSelectReserva,
  onFiltrarEstado,
  estadoSeleccionado,
}) => {
  // Solo lógica visual y de presentación
  return (
    <div className="space-y-4">
      {/* Botones de filtro, tablas, modales */}
    </div>
  );
};
```

---

## Capa 2: Capa Controladora (Modular Controller Hooks)
- **Rol:** Orquestar el flujo entre la UI y el Store/Servicios. Maneja estados locales efímeros (por ejemplo, si un dropdown está abierto, texto temporal de búsqueda, modales abiertos).
- **Regla Estricta:** Expone una interfaz concisa (`state` + `handlers`) hacia la UI.
- **Ejemplo:**
```tsx
export function useAdminReservasController() {
  const [filtroEstado, setFiltroEstado] = useState<ReservaEstado | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');
  
  // Consumo selectivo del Store
  const reservas = useApp(state => state.reservas);
  const loading = useApp(state => state.loading);
  const cambiarEstado = useApp(state => state.cambiarEstadoReserva);

  // Filtrado y cómputo memoizado para alto rendimiento
  const reservasFiltradas = useMemo(() => {
    return reservas.filter(r => {
      const matchEstado = filtroEstado === 'todos' || r.estado === filtroEstado;
      const matchTexto = busqueda ? r.clienteNombre.toLowerCase().includes(busqueda.toLowerCase()) : true;
      return matchEstado && matchTexto;
    });
  }, [reservas, filtroEstado, busqueda]);

  const handleCambiarEstado = useCallback(async (id: string, nuevoEstado: ReservaEstado) => {
    await cambiarEstado(id, nuevoEstado);
  }, [cambiarEstado]);

  return {
    reservas: reservasFiltradas,
    loading,
    filtroEstado,
    setFiltroEstado,
    busqueda,
    setBusqueda,
    handleCambiarEstado,
  };
}
```

---

## Capa 3: Capa de Estado Reactivo Centralizado (Zustand / Redux)
- **Rol:** Es la **única fuente de la verdad**. Almacena los datos compartidos entre múltiples vistas (Reservas, Clientes, Fincas, Configuración, Métricas).
- **Garantía:** Cuando una reserva se aprueba, el Store se actualiza y automáticamente:
  1. El Calendario se pinta con el nuevo color.
  2. El Dashboard suma el dinero a ingresos mensuales.
  3. El Historial del cliente registra la visita confirmada.
  4. La tabla de Reservas cambia la insignia a "Confirmada".

---

## Capa 4: Capa de Servicios y Supabase Realtime
- **Rol:** Comunicación directa con la base de datos PostgreSQL en Supabase, autenticación y canales WebSocket en tiempo real.
- **Regla Estricta:** Todas las llamadas devuelven tipos TypeScript seguros (`Promise<{ data: T | null, error: Error | null }>`).
- **Manejo de Errores:** Errores capturados y normalizados para que la interfaz nunca quede congelada ni rompa con pantalla blanca.
