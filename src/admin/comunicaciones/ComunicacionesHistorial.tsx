import React, { useMemo } from 'react';
import {
  MessageCircle,
  Copy,
  Trash2,
  Search,
  Check,
  Calendar,
  Phone,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import _ from 'lodash';
import type { Comunicacion } from '../../types';
import { abrirWhatsApp, copiarAlPortapapeles } from '../../services/whatsapp';
import { useComunicacionesStore } from '../../store/useComunicacionesStore';

interface ComunicacionesHistorialProps {
  comunicaciones: Comunicacion[];
  onLimpiarHistorial?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ComunicacionesHistorial: React.FC<ComunicacionesHistorialProps> = ({
  comunicaciones,
  onLimpiarHistorial,
  showToast,
}) => {
  const {
    filtroTipoHistorial,
    setFiltroTipoHistorial,
    busquedaHistorial,
    setBusquedaHistorial,
  } = useComunicacionesStore();

  const [copiadoId, setCopiadoId] = React.useState<string | null>(null);

  const categorias = [
    { id: 'todos', label: 'Todos' },
    { id: 'cotizacion', label: 'Cotización' },
    { id: 'separacion', label: 'Separación' },
    { id: 'abono', label: 'Abonos' },
    { id: 'estado_cuenta', label: 'Estado de Cuenta' },
    { id: 'paz_salvo', label: 'Paz y Salvo' },
    { id: 'menu', label: 'Menús' },
    { id: 'recordatorio_pago', label: 'Recordatorios' },
  ];

  // Filtrado y búsqueda con Lodash
  const comunicacionesFiltradas = useMemo(() => {
    let list = comunicaciones;

    // Filtro por tipo
    if (filtroTipoHistorial !== 'todos') {
      list = _.filter(list, (c) => c.tipo === filtroTipoHistorial);
    }

    // Filtro por término de búsqueda
    const q = busquedaHistorial.toLowerCase().trim();
    if (q) {
      list = _.filter(list, (c) => {
        const dest = (c.destinatario || '').toLowerCase();
        const tel = (c.telefono || '').toLowerCase();
        const msg = (c.mensaje || '').toLowerCase();
        return dest.includes(q) || tel.includes(q) || msg.includes(q);
      });
    }

    return _.orderBy(list, [(c) => new Date(c.created_at || '').getTime()], ['desc']);
  }, [comunicaciones, filtroTipoHistorial, busquedaHistorial]);

  const handleCopiar = async (id: string, texto: string) => {
    const ok = await copiarAlPortapapeles(texto);
    if (ok) {
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 2000);
      showToast('Texto de comunicación copiado al portapapeles 📋', 'success');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Chips de Categorías */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categorias.map((cat) => {
            const activa = filtroTipoHistorial === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFiltroTipoHistorial(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activa
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Búsqueda en Vivo */}
        <div className="relative min-w-[220px]">
          <Search
            size={14}
            className="absolute inset-y-0 left-3 my-auto text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar en mensajes o destinatario…"
            value={busquedaHistorial}
            onChange={(e) => setBusquedaHistorial(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Botón Limpiar Historial */}
        {onLimpiarHistorial && comunicaciones.length > 0 && (
          <button
            type="button"
            onClick={onLimpiarHistorial}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center gap-1.5 transition-all self-end sm:self-auto"
          >
            <Trash2 size={12} />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* Lista de Registros */}
      <div className="flex flex-col gap-2.5">
        {comunicacionesFiltradas.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
            No se encontraron comunicaciones registradas con los filtros actuales.
          </div>
        ) : (
          <AnimatePresence>
            {comunicacionesFiltradas.map((c) => {
              const fechaStr = c.created_at
                ? new Date(c.created_at).toLocaleString('es-CO')
                : '—';
              const copiado = copiadoId === c.id;

              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        {c.tipo}
                      </span>
                      <strong className="text-sm font-bold text-slate-900 dark:text-white">
                        {c.destinatario}
                      </strong>
                      <span className="text-xs text-emerald-600 font-mono font-semibold flex items-center gap-1">
                        <Phone size={11} /> +{c.telefono}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-auto flex items-center gap-1">
                        <Calendar size={11} /> {fechaStr}
                      </span>
                    </div>

                    <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                      {c.mensaje}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-start flex-shrink-0 pt-1">
                    <button
                      type="button"
                      onClick={() => abrirWhatsApp(c.telefono, c.mensaje)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-800/60 flex items-center gap-1.5 transition-all"
                    >
                      <MessageCircle size={13} />
                      <span>Reenviar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopiar(c.id, c.mensaje)}
                      className={`p-1.5 rounded-xl border transition-all ${
                        copiado
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Copiar texto"
                    >
                      {copiado ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
