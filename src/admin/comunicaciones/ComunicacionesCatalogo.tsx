import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Home,
  Utensils,
  CheckCircle,
  CreditCard,
  Tag,
  Clock,
  ShieldCheck,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import type { TipoComunicacion } from '../../types';
import {
  FaseMensaje,
  useComunicacionesStore,
} from '../../store/useComunicacionesStore';
import {
  formatearConsecutivoConPrefijo,
  type TipoDocumentoPrefijo,
} from '../../utils/consecutivos';

export interface TarjetaTipoMensaje {
  id: TipoComunicacion | 'pedir_abono' | 'cobrar_alimentacion' | 'cobrar_alimentacion_cotiz';
  tipoReal: TipoComunicacion;
  titulo: string;
  subtitulo: string;
  fase: FaseMensaje;
  destinatarioCobro: 'dueno' | 'admin' | 'info';
  icono: React.ReactNode;
  prefijoDoc?: TipoDocumentoPrefijo;
}

export const CATALOGO_MENSAJES: TarjetaTipoMensaje[] = [
  // FASE 1: PROSPECCIÓN Y COTIZACIÓN
  {
    id: 'cotizacion',
    tipoReal: 'cotizacion',
    titulo: 'Cotización Formal de Estancia',
    subtitulo: 'Propuesta completa con desglose de alojamiento y alimentación',
    fase: 'fase_1_cotizacion',
    destinatarioCobro: 'info',
    prefijoDoc: 'cotizacion',
    icono: <FileText size={18} />,
  },
  {
    id: 'pedir_abono',
    tipoReal: 'cotizacion',
    titulo: 'Solicitud de Anticipo (50% Finca)',
    subtitulo: 'Abono para bloquear fechas en la cuenta bancaria del Propietario',
    fase: 'fase_1_cotizacion',
    destinatarioCobro: 'dueno',
    prefijoDoc: 'cotizacion',
    icono: <Home size={18} />,
  },
  {
    id: 'cobrar_alimentacion_cotiz',
    tipoReal: 'cotizacion',
    titulo: 'Cobro de Alimentación (Paraíso Terrenal)',
    subtitulo: 'Solicitud anticipada del menú a la cuenta de la administración',
    fase: 'fase_1_cotizacion',
    destinatarioCobro: 'admin',
    prefijoDoc: 'menu',
    icono: <Utensils size={18} />,
  },

  // FASE 2: RESERVAS Y PAGOS
  {
    id: 'separacion',
    tipoReal: 'separacion',
    titulo: 'Confirmación Oficial de Separación',
    subtitulo: 'Notifica reserva asegurada y saldo pendiente de finca al check-in',
    fase: 'fase_2_reserva',
    destinatarioCobro: 'dueno',
    prefijoDoc: 'separacion',
    icono: <CheckCircle size={18} />,
  },
  {
    id: 'cobrar_alimentacion',
    tipoReal: 'cotizacion',
    titulo: 'Cobro de Alimentación (Paraíso Terrenal)',
    subtitulo: 'Solicitud de pago o saldo de menú a la cuenta de la administración',
    fase: 'fase_2_reserva',
    destinatarioCobro: 'admin',
    prefijoDoc: 'menu',
    icono: <Utensils size={18} />,
  },
  {
    id: 'abono',
    tipoReal: 'abono',
    titulo: 'Comprobante de Abono / Pago',
    subtitulo: 'Certifica la recepción de un pago y actualiza el saldo',
    fase: 'fase_2_reserva',
    destinatarioCobro: 'info',
    prefijoDoc: 'abono',
    icono: <CreditCard size={18} />,
  },

  // FASE 3: SALDOS Y LIQUIDACIÓN
  {
    id: 'estado_cuenta',
    tipoReal: 'estado_cuenta',
    titulo: 'Estado de Cuenta (Doble Balance)',
    subtitulo: 'Desglose transparente: Saldo check-in (dueño) vs Saldo comida (Paraíso)',
    fase: 'fase_3_saldos',
    destinatarioCobro: 'info',
    prefijoDoc: 'estado_cuenta',
    icono: <Tag size={18} />,
  },
  {
    id: 'recordatorio_pago',
    tipoReal: 'recordatorio_pago',
    titulo: 'Recordatorio Amistoso de Saldos',
    subtitulo: 'Recordatorio previo a la llegada detallando qué pagar en finca y qué a Paraíso',
    fase: 'fase_3_saldos',
    destinatarioCobro: 'info',
    icono: <Clock size={18} />,
  },
  {
    id: 'paz_salvo',
    tipoReal: 'paz_salvo',
    titulo: 'Certificado de Paz y Salvo',
    subtitulo: 'Emisión oficial cuando los saldos de finca y alimentación están en $0',
    fase: 'fase_3_saldos',
    destinatarioCobro: 'info',
    prefijoDoc: 'paz_salvo',
    icono: <ShieldCheck size={18} />,
  },

  // FASE 4: EXPERIENCIA Y LLEGADA
  {
    id: 'bienvenida',
    tipoReal: 'bienvenida',
    titulo: 'Instrucciones de Llegada y Bienvenida',
    subtitulo: 'Ubicación, normas de la finca y contacto directo del anfitrión',
    fase: 'fase_4_llegada',
    destinatarioCobro: 'info',
    icono: <Sparkles size={18} />,
  },

  // FASE 5: LIBRE / BROCHURES
  {
    id: 'menu',
    tipoReal: 'menu',
    titulo: 'Catálogo de Menú y Gastronomía',
    subtitulo: 'Catálogo de platos y costos para clientes que aún no eligen menú',
    fase: 'fase_5_libre',
    destinatarioCobro: 'admin',
    prefijoDoc: 'menu',
    icono: <Utensils size={18} />,
  },
  {
    id: 'personalizado',
    tipoReal: 'personalizado',
    titulo: 'Mensaje Rápido Personalizado',
    subtitulo: 'Texto libre con soporte de etiquetas y variables dinámicas',
    fase: 'fase_5_libre',
    destinatarioCobro: 'info',
    icono: <MessageCircle size={18} />,
  },
];

interface ComunicacionesCatalogoProps {
  consecutivoBase: string;
  onSeleccionarTarjeta: (tarjeta: TarjetaTipoMensaje) => void;
  onCambiarFase: (fase: FaseMensaje) => void;
}

export const ComunicacionesCatalogo: React.FC<ComunicacionesCatalogoProps> = ({
  consecutivoBase,
  onSeleccionarTarjeta,
  onCambiarFase,
}) => {
  const { faseFiltro, tipoSeleccionado, subTipoAccion } = useComunicacionesStore();

  const fases: Array<{ id: FaseMensaje; label: string }> = [
    { id: 'fase_1_cotizacion', label: '1. Cotización & Finca' },
    { id: 'fase_2_reserva', label: '2. Reserva & Abonos' },
    { id: 'fase_3_saldos', label: '3. Saldos & Paz y Salvo' },
    { id: 'fase_4_llegada', label: '4. Llegada & Bienvenida' },
    { id: 'fase_5_libre', label: '5. Libre' },
  ];

  const mensajesFiltrados = CATALOGO_MENSAJES.filter((m) => m.fase === faseFiltro);

  return (
    <div className="flex flex-col gap-3">
      {/* Selector de Fase Comercial */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Sparkles size={14} className="text-emerald-500" />
          <span>Seleccionar Tipo Lógico de Plantilla / Mensaje:</span>
        </div>

        {/* Botones de Fases */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {fases.map((f) => {
            const activa = faseFiltro === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onCambiarFase(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                  activa
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Tarjetas de Mensajes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {mensajesFiltrados.map((tarjeta) => {
          const esCobrarAlim =
            tarjeta.id === 'cobrar_alimentacion' || tarjeta.id === 'cobrar_alimentacion_cotiz';
          const esActivo =
            tipoSeleccionado === tarjeta.tipoReal &&
            ((tarjeta.id === 'pedir_abono' && subTipoAccion === 'pedir_abono') ||
              (esCobrarAlim && subTipoAccion === 'cobrar_alimentacion') ||
              (!esCobrarAlim &&
                tarjeta.id !== 'pedir_abono' &&
                subTipoAccion === 'normal'));

          return (
            <motion.div
              key={tarjeta.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => onSeleccionarTarjeta(tarjeta)}
              className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col justify-between gap-2.5 transition-all duration-200 ${
                esActivo
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`flex items-center gap-2 font-bold text-xs tracking-tight ${
                      esActivo
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {tarjeta.icono}
                    </span>
                    <span>{tarjeta.titulo}</span>
                  </div>

                  {/* Badge Destinatario de Pago */}
                  {tarjeta.destinatarioCobro === 'dueno' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 flex-shrink-0">
                      Dueño
                    </span>
                  )}
                  {tarjeta.destinatarioCobro === 'admin' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 flex-shrink-0">
                      Paraíso
                    </span>
                  )}
                  {tarjeta.destinatarioCobro === 'info' && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 flex-shrink-0">
                      Info
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {tarjeta.subtitulo}
                </p>
              </div>

              {/* Prefijo PDF */}
              {tarjeta.prefijoDoc && (
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-400">PDF:</span>
                  <code className="font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">
                    {formatearConsecutivoConPrefijo(consecutivoBase, tarjeta.prefijoDoc)}
                  </code>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
