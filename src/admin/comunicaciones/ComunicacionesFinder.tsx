import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, Check, X, FileText, Calendar } from 'lucide-react';
import type { CotizacionDB, Reserva } from '../../types';
import { formatearConsecutivoSimple } from '../../utils/consecutivos';
import { formatCOP, formatFecha } from '../../services/whatsapp';
import { useComunicacionesStore } from '../../store/useComunicacionesStore';

interface ComunicacionesFinderProps {
  cotizaciones: CotizacionDB[];
  reservas: Reserva[];
  onSeleccionarExpediente: (item: {
    tipo: 'cotizacion' | 'reserva';
    id: string;
    consecutivo: string;
  }) => void;
  onActivarModoLibre: () => void;
}

export const ComunicacionesFinder: React.FC<ComunicacionesFinderProps> = ({
  cotizaciones,
  reservas,
  onSeleccionarExpediente,
  onActivarModoLibre,
}) => {
  const {
    busquedaExpediente,
    setBusquedaExpediente,
    busquedaAbierta,
    setBusquedaAbierta,
    expedienteTipo,
    cotizacionId,
    reservaId,
  } = useComunicacionesStore();

  // Expedientes unificados por consecutivo (1 solo registro por consecutivo con su estado actual)
  const expedientesUnificados = useMemo(() => {
    const mapa = new Map<string, {
      tipo: 'cotizacion' | 'reserva';
      id: string;
      consecutivo: string;
      clienteNombre: string;
      fincaNombre: string;
      telefono: string;
      fechas: string;
      total: number;
    }>();

    reservas.forEach((r) => {
      const num = formatearConsecutivoSimple(r.consecutivo);
      const key = num || `res-${r.id}`;
      mapa.set(key, {
        tipo: 'reserva',
        id: r.id,
        consecutivo: num,
        clienteNombre: r.clientes
          ? `${r.clientes.nombre} ${r.clientes.apellido || ''}`.trim()
          : 'Sin cliente',
        fincaNombre: r.fincas?.nombre || 'Finca Campestre',
        telefono: r.clientes?.whatsapp || r.clientes?.telefono || '',
        fechas: `${formatFecha(r.fecha_inicio)} al ${formatFecha(r.fecha_fin)}`,
        total: r.valor_total || 0,
      });
    });

    cotizaciones.forEach((c) => {
      const num = formatearConsecutivoSimple(c.consecutivo);
      const key = num || `cot-${c.id}`;
      const yaTieneReserva = mapa.has(key) || reservas.some((r) => r.cotizacion_id === c.id);
      if (!yaTieneReserva) {
        mapa.set(key, {
          tipo: 'cotizacion',
          id: c.id,
          consecutivo: num,
          clienteNombre: c.clientes
            ? `${c.clientes.nombre} ${c.clientes.apellido || ''}`.trim()
            : 'Sin cliente',
          fincaNombre: c.fincas?.nombre || 'Finca Campestre',
          telefono: c.clientes?.whatsapp || (c.clientes as any)?.telefono || '',
          fechas: `${formatFecha(c.fecha_inicio)} al ${formatFecha(c.fecha_fin)}`,
          total: c.total || 0,
        });
      }
    });

    return Array.from(mapa.values()).sort((a, b) => {
      const numA = parseInt(a.consecutivo.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.consecutivo.replace(/\D/g, ''), 10) || 0;
      return numB - numA;
    });
  }, [cotizaciones, reservas]);

  // Búsqueda inteligente predictiva sin duplicar consecutivos
  const listaResultadosFinder = useMemo(() => {
    const q = busquedaExpediente.toLowerCase().trim();
    if (!q) return [];

    return expedientesUnificados
      .filter((item) => {
        const num = item.consecutivo.toLowerCase();
        const cliNom = item.clienteNombre.toLowerCase();
        const fNom = item.fincaNombre.toLowerCase();
        const tel = item.telefono.toLowerCase();
        return num.includes(q) || cliNom.includes(q) || fNom.includes(q) || tel.includes(q);
      })
      .slice(0, 8);
  }, [busquedaExpediente, expedientesUnificados]);

  return (
    <div className="flex flex-col gap-3.5">
      {/* Barra de Búsqueda y Botón Modo Libre */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Input Buscador con Autocompletado Flotante */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600 dark:text-emerald-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Buscar por Consecutivo (#1001), Cliente, Finca o Teléfono…"
            value={busquedaExpediente}
            onChange={(e) => {
              setBusquedaExpediente(e.target.value);
              setBusquedaAbierta(true);
            }}
            onFocus={() => setBusquedaAbierta(true)}
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm transition-all"
          />
          {busquedaExpediente && (
            <button
              onClick={() => {
                setBusquedaExpediente('');
                setBusquedaAbierta(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}

          {/* Menú Desplegable con Resultados */}
          <AnimatePresence>
            {busquedaAbierta && listaResultadosFinder.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-72 overflow-y-auto p-2"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                  Expedientes Coincidentes ({listaResultadosFinder.length}):
                </div>
                {listaResultadosFinder.map((item) => {
                  const esCot = item.tipo === 'cotizacion';
                  return (
                    <div
                      key={`${item.tipo}-${item.id}`}
                      onClick={() => {
                        onSeleccionarExpediente(item);
                        setBusquedaExpediente('');
                        setBusquedaAbierta(false);
                      }}
                      className="px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                            esCot
                              ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {esCot ? 'COT' : 'RES'} #{item.consecutivo}
                        </span>
                        <div className="truncate">
                          <strong className="text-slate-800 dark:text-slate-100">
                            {item.clienteNombre}
                          </strong>
                          <span className="text-slate-400 text-[11px] ml-1.5 hidden sm:inline">
                            · {item.fincaNombre}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[11px] text-slate-400 hidden md:inline">
                          {item.fechas}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCOP(item.total)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Botón Modo Libre / Chat Rápido */}
        <button
          type="button"
          onClick={onActivarModoLibre}
          className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 shadow-sm transition-all whitespace-nowrap"
        >
          <MessageSquare size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span>Modo Libre / Chat Rápido</span>
        </button>
      </div>

      {/* Chips de Acceso Rápido a Últimos Expedientes (1 por consecutivo con su estado actual) */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
          Cargar rápido:
        </span>

        {expedientesUnificados.slice(0, 6).map((item) => {
          const esRes = item.tipo === 'reserva';
          const activo = esRes
            ? reservaId === item.id && expedienteTipo === 'reserva'
            : cotizacionId === item.id && expedienteTipo === 'cotizacion';
          return (
            <button
              key={`${item.tipo}-${item.id}`}
              type="button"
              onClick={() => onSeleccionarExpediente({ tipo: item.tipo, id: item.id, consecutivo: item.consecutivo })}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-all ${
                activo
                  ? esRes
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-orange-600 text-white border-orange-600 shadow-sm'
                  : esRes
                  ? 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-orange-300'
              }`}
            >
              {esRes ? (
                <Calendar size={11} className={activo ? 'text-white' : 'text-emerald-500'} />
              ) : (
                <FileText size={11} className={activo ? 'text-white' : 'text-orange-500'} />
              )}
              <span>{esRes ? 'RES' : 'COT'} #{item.consecutivo}</span>
              <span className="text-[10px] opacity-75">
                ({item.clienteNombre.split(' ')[0] || 'Cliente'})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
