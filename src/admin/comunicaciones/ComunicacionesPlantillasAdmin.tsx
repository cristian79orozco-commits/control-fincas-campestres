import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Save,
  RotateCcw,
  Sparkles,
  Eye,
  Info,
  Loader2,
  Copy,
  Check,
  CheckCircle2,
  HelpCircle,
  Layers,
  MessageCircle,
  Home,
  Utensils,
  CreditCard,
  FileText,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PLANTILLAS_PREDETERMINADAS,
  renderizarPlantillaPersonalizada,
  obtenerTokensParaMensaje,
  copiarAlPortapapeles,
} from '../../services/whatsapp';
import type {
  ConfiguracionGeneral,
  CotizacionDB,
  Reserva,
  Cliente,
  Finca,
  TipoComunicacion,
} from '../../types';
import { useComunicacionesStore } from '../../store/useComunicacionesStore';

export interface PlantillaDefinicion {
  id: string;
  label: string;
  categoria: 'cliente' | 'cotizacion' | 'alimentacion' | 'reserva' | 'saldos' | 'llegada';
  categoriaLabel: string;
  subtitulo: string;
  icono: React.ReactNode;
}

export const LISTA_PLANTILLAS_COMPLETA: PlantillaDefinicion[] = [
  // 1. Panel de Cliente (Público)
  {
    id: 'solicitud_cliente_publica',
    label: 'Cotización Web del Huésped',
    categoria: 'cliente',
    categoriaLabel: '🟢 Panel del Cliente (Web)',
    subtitulo: 'Mensaje generado por el cliente al cotizar en la web pública con código de reserva',
    icono: <MessageCircle size={15} className="text-emerald-500" />,
  },

  // 2. Cotización y Finca (Dueño)
  {
    id: 'cotizacion',
    label: 'Cotización Formal de Estancia',
    categoria: 'cotizacion',
    categoriaLabel: '🟡 Cotización & Finca (Dueño)',
    subtitulo: 'Propuesta formal emitida por el administrador con desglose de liquidación y valores',
    icono: <FileText size={15} className="text-amber-500" />,
  },
  {
    id: 'pedir_abono',
    label: 'Solicitud de Anticipo (50% Finca)',
    categoria: 'cotizacion',
    categoriaLabel: '🟡 Cotización & Finca (Dueño)',
    subtitulo: 'Instrucciones y datos bancarios del dueño para bloquear fechas en el calendario',
    icono: <Home size={15} className="text-amber-500" />,
  },

  // 3. Alimentación (Paraíso Terrenal)
  {
    id: 'cobrar_alimentacion',
    label: 'Cobro de Alimentación / Menús',
    categoria: 'alimentacion',
    categoriaLabel: '🍽️ Alimentación (Paraíso Terrenal)',
    subtitulo: 'Cobro de menús con datos bancarios de la administración para compras y cocina',
    icono: <Utensils size={15} className="text-orange-500" />,
  },

  // 4. Reserva y Pagos
  {
    id: 'separacion',
    label: 'Confirmación Oficial de Separación',
    categoria: 'reserva',
    categoriaLabel: '🔵 Reserva & Pagos',
    subtitulo: 'Notifica reserva asegurada, términos y comprobante oficial con PDF adjunto',
    icono: <CheckCircle2 size={15} className="text-blue-500" />,
  },
  {
    id: 'abono',
    label: 'Comprobante Oficial de Abono / Pago',
    categoria: 'reserva',
    categoriaLabel: '🔵 Reserva & Pagos',
    subtitulo: 'Certifica la recepción de un anticipo o abono parcial y actualiza el saldo restante',
    icono: <CreditCard size={15} className="text-blue-500" />,
  },

  // 5. Saldos y Liquidación
  {
    id: 'estado_cuenta',
    label: 'Estado de Cuenta (Doble Balance)',
    categoria: 'saldos',
    categoriaLabel: '🟣 Saldos & Cierre',
    subtitulo: 'Balance transparente: Saldo check-in (dueño) vs Saldo menús (administración)',
    icono: <Layers size={15} className="text-purple-500" />,
  },
  {
    id: 'recordatorio_pago',
    label: 'Recordatorio Amistoso de Saldos',
    categoria: 'saldos',
    categoriaLabel: '🟣 Saldos & Cierre',
    subtitulo: 'Aviso previo a la llegada recordando los montos a liquidar en finca y a Paraíso',
    icono: <Clock size={15} className="text-purple-500" />,
  },
  {
    id: 'paz_salvo',
    label: 'Certificado Oficial de Paz y Salvo',
    categoria: 'saldos',
    categoriaLabel: '🟣 Saldos & Cierre',
    subtitulo: 'Emisión oficial cuando todos los saldos de alojamiento y comida están en $0',
    icono: <ShieldCheck size={15} className="text-purple-500" />,
  },

  // 6. Llegada y Experiencia
  {
    id: 'bienvenida',
    label: 'Instrucciones de Llegada y Bienvenida',
    categoria: 'llegada',
    categoriaLabel: '🏡 Llegada & Estadía',
    subtitulo: 'Ubicación, contacto del mayordomo/anfitrión y recomendaciones para el check-in',
    icono: <Sparkles size={15} className="text-teal-500" />,
  },
];

interface ComunicacionesPlantillasAdminProps {
  configuracion?: ConfiguracionGeneral;
  onGuardarConfiguracion?: (
    datos: Partial<ConfiguracionGeneral>
  ) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  cotizacionEfectiva: CotizacionDB | null;
  reservaEfectiva: Reserva | null;
  clienteActual: Cliente | any | null;
  fincaActual: Finca | any | null;
  consecutivoBase: string;
}

export const ComunicacionesPlantillasAdmin: React.FC<ComunicacionesPlantillasAdminProps> = ({
  configuracion,
  onGuardarConfiguracion,
  showToast,
  cotizacionEfectiva,
  reservaEfectiva,
  clienteActual,
  fincaActual,
  consecutivoBase,
}) => {
  const {
    plantillaSeleccionada,
    setPlantillaSeleccionada,
    textoEditorPlantilla,
    setTextoEditorPlantilla,
    guardandoPlantilla,
    setGuardandoPlantilla,
  } = useComunicacionesStore();

  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [categoriaVariables, setCategoriaVariables] = useState<'general' | 'estancia' | 'finanzas' | 'bancos' | 'todos'>('general');
  const [copiadoPreview, setCopiadoPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Asegurar que si la plantilla actual no existe en el catálogo, se use una válida
  useEffect(() => {
    const existe = LISTA_PLANTILLAS_COMPLETA.some((p) => p.id === plantillaSeleccionada);
    if (!existe) {
      setPlantillaSeleccionada('cotizacion');
    }
  }, [plantillaSeleccionada, setPlantillaSeleccionada]);

  // Sincronizar el texto del editor cuando cambia la plantilla o la configuración global
  useEffect(() => {
    const custom = configuracion?.plantillas_comunicacion?.[plantillaSeleccionada];
    const def = PLANTILLAS_PREDETERMINADAS[plantillaSeleccionada] || '';
    setTextoEditorPlantilla(custom || def);
  }, [plantillaSeleccionada, configuracion, setTextoEditorPlantilla]);

  const plantillaActualDef = useMemo(() => {
    return (
      LISTA_PLANTILLAS_COMPLETA.find((p) => p.id === plantillaSeleccionada) ||
      LISTA_PLANTILLAS_COMPLETA[1]
    );
  }, [plantillaSeleccionada]);

  const esPersonalizada = useMemo(() => {
    return Boolean(configuracion?.plantillas_comunicacion?.[plantillaSeleccionada]);
  }, [configuracion, plantillaSeleccionada]);

  // Tokens calculados a partir del expediente activo para visualización en tiempo real
  const tokensActivos = useMemo(() => {
    try {
      return obtenerTokensParaMensaje({
        tipo: plantillaSeleccionada as TipoComunicacion,
        cotizacion: cotizacionEfectiva || undefined,
        reserva: reservaEfectiva || undefined,
        cliente: clienteActual,
        finca: fincaActual,
        consecutivoBase,
        configuracion,
      });
    } catch {
      return {};
    }
  }, [
    plantillaSeleccionada,
    cotizacionEfectiva,
    reservaEfectiva,
    clienteActual,
    fincaActual,
    consecutivoBase,
    configuracion,
  ]);

  // Renderizado en vivo de la plantilla con tokens del expediente activo
  const previewPlantilla = useMemo(() => {
    try {
      return renderizarPlantillaPersonalizada(textoEditorPlantilla, tokensActivos);
    } catch {
      return textoEditorPlantilla;
    }
  }, [textoEditorPlantilla, tokensActivos]);

  // Inserción de variable en la posición exacta del cursor
  const insertarVariable = (variable: string) => {
    const tag = `{{${variable}}}`;
    const textarea = textareaRef.current;
    if (!textarea) {
      setTextoEditorPlantilla((prev) => `${prev} ${tag}`);
      return;
    }

    const start = textarea.selectionStart ?? textoEditorPlantilla.length;
    const end = textarea.selectionEnd ?? textoEditorPlantilla.length;
    const anterior = textoEditorPlantilla.substring(0, start);
    const posterior = textoEditorPlantilla.substring(end);
    const nuevoTexto = `${anterior}${tag}${posterior}`;

    setTextoEditorPlantilla(nuevoTexto);

    setTimeout(() => {
      textarea.focus();
      const nuevaPos = start + tag.length;
      textarea.setSelectionRange(nuevaPos, nuevaPos);
    }, 0);
  };

  const handleGuardarPlantilla = async () => {
    if (!onGuardarConfiguracion) {
      showToast('No se dispone de permisos para guardar la configuración', 'error');
      return;
    }
    setGuardandoPlantilla(true);
    const plantillasActuales = {
      ...(configuracion?.plantillas_comunicacion || {}),
    };
    plantillasActuales[plantillaSeleccionada] = textoEditorPlantilla;

    const res = await onGuardarConfiguracion({
      plantillas_comunicacion: plantillasActuales,
    });
    setGuardandoPlantilla(false);

    if (res.success) {
      showToast(
        `Plantilla "${plantillaActualDef.label}" guardada en Supabase con éxito ✅`,
        'success'
      );
    } else {
      showToast(`Error al guardar plantilla: ${res.error}`, 'error');
    }
  };

  const handleRestablecerPlantilla = async () => {
    if (!onGuardarConfiguracion) return;
    const def = PLANTILLAS_PREDETERMINADAS[plantillaSeleccionada] || '';
    setTextoEditorPlantilla(def);

    const plantillasActuales = {
      ...(configuracion?.plantillas_comunicacion || {}),
    };
    delete plantillasActuales[plantillaSeleccionada];

    setGuardandoPlantilla(true);
    const res = await onGuardarConfiguracion({
      plantillas_comunicacion: plantillasActuales,
    });
    setGuardandoPlantilla(false);

    if (res.success) {
      showToast(
        `Plantilla "${plantillaActualDef.label}" restablecida a la oficial predeterminada 🔄`,
        'info'
      );
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  };

  const handleCopiarPreview = async () => {
    const ok = await copiarAlPortapapeles(previewPlantilla);
    if (ok) {
      setCopiadoPreview(true);
      setTimeout(() => setCopiadoPreview(false), 2000);
      showToast('Mensaje de prueba copiado al portapapeles 📋', 'success');
    }
  };

  // Diccionario de Variables agrupadas con etiquetas amigables
  const variablesGrupos = [
    {
      categoria: 'general',
      label: '👤 Cliente & Finca',
      items: [
        { key: 'cliente', desc: 'Nombre del huésped' },
        { key: 'finca', desc: 'Nombre de la propiedad' },
        { key: 'consecutivo', desc: 'Código con prefijo (COT-1001 / RES-1001)' },
        { key: 'celular', desc: 'Teléfono de contacto' },
        { key: 'whatsapp', desc: 'Número de WhatsApp' },
      ],
    },
    {
      categoria: 'estancia',
      label: '📅 Estancia & Huéspedes',
      items: [
        { key: 'fechas', desc: 'Rango de fechas (ej: 10/11/2026 al 15/11/2026)' },
        { key: 'fecha_llegada', desc: 'Fecha de llegada (Check-in)' },
        { key: 'fecha_salida', desc: 'Fecha de salida (Check-out)' },
        { key: 'noches', desc: 'Número de noches' },
        { key: 'personas', desc: 'Cantidad de personas' },
        { key: 'mascotas_linea', desc: 'Detalle de mascotas si aplica' },
        { key: 'deposito_linea', desc: 'Línea de depósito de garantía' },
      ],
    },
    {
      categoria: 'finanzas',
      label: '💰 Valores & Liquidación',
      items: [
        { key: 'total', desc: 'Total general acordado' },
        { key: 'total_finca', desc: 'Total exclusivo de la finca' },
        { key: 'alojamiento_base', desc: 'Subtotal del alojamiento' },
        { key: 'abono_50', desc: 'Abono requerido del 50%' },
        { key: 'anticipo', desc: 'Anticipo registrado' },
        { key: 'saldo', desc: 'Saldo pendiente total' },
        { key: 'saldo_finca', desc: 'Saldo a liquidar al dueño en check-in' },
        { key: 'costo_alimentacion', desc: 'Valor total del menú' },
        { key: 'saldo_alimentacion', desc: 'Saldo pendiente del menú' },
        { key: 'desglose_finca', desc: 'Bloque estructurado finca + mascotas' },
        { key: 'desglose_alimentacion', desc: 'Bloque estructurado de menú' },
      ],
    },
    {
      categoria: 'bancos',
      label: '💳 Cuentas Bancarias',
      items: [
        { key: 'banco_dueno', desc: 'Banco del propietario' },
        { key: 'cuenta_dueno', desc: 'Número de cuenta del dueño' },
        { key: 'tipo_cuenta_dueno', desc: 'Ahorros / Corriente dueño' },
        { key: 'titular_dueno', desc: 'Nombre del titular dueño' },
        { key: 'nit_dueno', desc: 'Identificación / NIT dueño' },
        { key: 'banco_admin', desc: 'Banco de Paraíso Terrenal' },
        { key: 'cuenta_admin', desc: 'Cuenta de Paraíso Terrenal' },
        { key: 'tipo_cuenta_admin', desc: 'Tipo cuenta de Paraíso' },
        { key: 'titular_admin', desc: 'Titular Paraíso Terrenal' },
        { key: 'nit_admin', desc: 'NIT Paraíso Terrenal' },
      ],
    },
  ];

  const variablesAMostrar = useMemo(() => {
    if (categoriaVariables === 'todos') {
      return variablesGrupos.flatMap((g) => g.items);
    }
    const grupo = variablesGrupos.find((g) => g.categoria === categoriaVariables);
    return grupo ? grupo.items : variablesGrupos[0].items;
  }, [categoriaVariables]);

  const plantillasFiltradas = useMemo(() => {
    if (filtroCategoria === 'todas') return LISTA_PLANTILLAS_COMPLETA;
    return LISTA_PLANTILLAS_COMPLETA.filter((p) => p.categoria === filtroCategoria);
  }, [filtroCategoria]);

  return (
    <div className="flex flex-col gap-4 w-full max-w-full overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────
          1. CABECERA PRO: SELECTOR DE PLANTILLAS CENTRALIZADO
          ───────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--sh-md)] flex flex-col gap-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold flex-shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-[var(--text)] tracking-tight">
                  Editor Centralizado de Plantillas Oficiales
                </h3>
                {esPersonalizada ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Personalizada en Supabase
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 size={12} />
                    Predeterminada Oficial
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Las modificaciones en texto se sincronizan en tiempo real para todos los paneles (Cotizador Cliente, Calendario, Reservas y WhatsApp).
              </p>
            </div>
          </div>

          {/* Selector de Plantilla Principal (Touch Safe 44px) */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <label htmlFor="selector-plantilla-admin" className="sr-only">Seleccionar plantilla</label>
            <select
              id="selector-plantilla-admin"
              value={plantillaSeleccionada}
              onChange={(e) => setPlantillaSeleccionada(e.target.value)}
              className="w-full md:w-80 min-h-[44px] px-3.5 py-2.5 bg-[var(--surface-2)] text-[var(--text)] text-base md:text-sm font-semibold rounded-xl border border-[var(--border)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all cursor-pointer"
            >
              {LISTA_PLANTILLAS_COMPLETA.map((p) => {
                const tieneCustom = Boolean(configuracion?.plantillas_comunicacion?.[p.id]);
                return (
                  <option key={p.id} value={p.id}>
                    {p.label} {tieneCustom ? '⭐ (Modificada)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Barra de Píldoras de Filtro por Etapas del Ciclo de Vida */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-[var(--border)]">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mr-1 hidden sm:inline">
            Etapas:
          </span>
          {[
            { id: 'todas', label: 'Todas las plantillas' },
            { id: 'cliente', label: '🟢 Cotización Web Huésped' },
            { id: 'cotizacion', label: '🟡 Finca & Anticipo 50%' },
            { id: 'alimentacion', label: '🍽️ Alimentación Admin' },
            { id: 'reserva', label: '🔵 Reservas & Pagos' },
            { id: 'saldos', label: '🟣 Saldos & Cierre' },
            { id: 'llegada', label: '🏡 Llegada' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFiltroCategoria(cat.id)}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filtroCategoria === cat.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tarjeta Informativa de la Plantilla Activa */}
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-[var(--text)]">
            <div className="p-1.5 rounded-lg bg-[var(--surface)] text-emerald-500 border border-[var(--border)]">
              {plantillaActualDef.icono}
            </div>
            <div>
              <span className="font-bold block sm:inline mr-2">
                {plantillaActualDef.label}:
              </span>
              <span className="text-[var(--text-muted)]">
                {plantillaActualDef.subtitulo}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-muted)] hidden lg:inline flex-shrink-0">
            ID: <code className="text-emerald-500 font-bold">{plantillaActualDef.id}</code>
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. WORKSPACE DE EDICIÓN: EDITOR IZQUIERDO Y PREVIEW DERECHO
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start w-full">
        {/* COLUMNA IZQUIERDA: EDITOR DE TEXTO Y VARIABLES */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--sh-md)] flex flex-col gap-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-bold text-[var(--text)] flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                Cuerpo del Mensaje (Totalmente Editable)
              </h4>
              <p className="text-[11px] text-[var(--text-muted)]">
                Modifica libremente el saludo, tono e indicaciones. Las variables se llenarán automáticamente.
              </p>
            </div>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              {textoEditorPlantilla.length} caracteres
            </span>
          </div>

          {/* Textarea con tamaño de texto seguro para iOS y altura ergonómica */}
          <textarea
            ref={textareaRef}
            rows={14}
            value={textoEditorPlantilla}
            onChange={(e) => setTextoEditorPlantilla(e.target.value)}
            placeholder="Escribe o personaliza el texto de la plantilla oficial aquí…"
            className="w-full p-4 bg-[var(--surface-2)] text-[var(--text)] text-base md:text-xs font-mono leading-relaxed rounded-xl border border-[var(--border)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-y min-h-[300px] sm:min-h-[360px]"
          />

          {/* Paleta de Variables con Filtros y 1 Clic */}
          <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex flex-col gap-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-500" />
                Insertar variable en el cursor (1 clic):
              </span>

              {/* Pestañas de categorías de variables */}
              <div className="flex items-center gap-1">
                {[
                  { id: 'general', label: 'Cliente' },
                  { id: 'estancia', label: 'Estancia' },
                  { id: 'finanzas', label: 'Montos' },
                  { id: 'bancos', label: 'Bancos' },
                  { id: 'todos', label: 'Todas' },
                ].map((vg) => (
                  <button
                    key={vg.id}
                    type="button"
                    onClick={() => setCategoriaVariables(vg.id as any)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                      categoriaVariables === vg.id
                        ? 'bg-[var(--accent)] text-[#141210]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {vg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chips de variables */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {variablesAMostrar.map((v) => {
                const sampleVal = tokensActivos[v.key];
                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertarVariable(v.key)}
                    title={`${v.desc}${sampleVal ? ` · Ejemplo actual: ${sampleVal}` : ''}`}
                    className="group inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono bg-[var(--surface)] text-[var(--text)] hover:text-emerald-500 hover:border-emerald-500/50 border border-[var(--border)] transition-all shadow-sm active:scale-[0.98]"
                  >
                    <span className="text-emerald-500 font-bold">+</span>
                    <span>{`{{${v.key}}}`}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">
              💡 Tip: Coloca el cursor en el texto donde desees la información y haz clic en la variable para insertarla.
            </span>
          </div>

          {/* Barra de Acciones (Dual PC y Móvil Touch Safe >= 44px) */}
          <div className="pt-2 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleRestablecerPlantilla}
              disabled={guardandoPlantilla}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <RotateCcw size={14} />
              <span>Restablecer oficial</span>
            </button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleGuardarPlantilla}
              disabled={guardandoPlantilla}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {guardandoPlantilla ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Guardando en Supabase…</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Guardar Plantilla en Supabase</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* COLUMNA DERECHA: VISTA PREVIA RENDERIZADA EN VIVO */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--sh-md)] flex flex-col gap-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Eye size={15} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text)]">
                  Vista Previa en Vivo (WhatsApp)
                </h4>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Simulación con datos del expediente activo: #{consecutivoBase || '1001'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopiarPreview}
              className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface-2)] text-[var(--text)] hover:border-emerald-500 border border-[var(--border)] flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
            >
              {copiadoPreview ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copiadoPreview ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          {/* Burbuja Simulación WhatsApp */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#0b141a] border border-[#222e35] text-slate-100 font-sans text-xs sm:text-sm leading-relaxed whitespace-pre-wrap min-h-[300px] sm:min-h-[360px] shadow-inner select-text">
            {previewPlantilla}
          </div>

          {/* Banner de Garantía y Seguridad */}
          <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-muted)] flex items-start gap-2.5">
            <Info size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-[var(--text)] block mb-0.5">
                Blindaje de datos dinámicos activo:
              </span>
              Toda etiqueta entre llaves (ej: <code className="text-emerald-500 font-mono">{'{{cliente}}'}</code>, <code className="text-emerald-500 font-mono">{'{{total}}'}</code>) se reemplaza automáticamente con la información real de cada huésped al enviar.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
