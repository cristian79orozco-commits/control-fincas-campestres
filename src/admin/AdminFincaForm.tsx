import React from 'react';
import {
  Save, Trash2, Plus, Upload, Link as LinkIcon, Loader, Image as ImageIcon,
  Eye, ChevronDown, ChevronUp, Search, Check, Sparkles, MapPin, Users,
  Bed, Bath, Clock, ShieldAlert, Volume2, Dog, Home,
  CreditCard, Copy, Building, DollarSign, ArrowLeft
} from 'lucide-react';
import type { Finca, FincaEstado } from '../types';
import { CurrencyInput } from '../components/CurrencyInput';
import { NumericInput } from '../components/NumericInput';
import {
  useFincaFormController,
  AMENIDADES_SUGERIDAS,
  PLANES_SUGERIDOS,
  type FincaFormTabId
} from './useFincaFormController';

interface AdminFincaFormProps {
  fincas: Finca[];
  onSave: (
    fincaData: Partial<Finca>,
    imagenesUrls: string[],
    planesStr: string,
    amenidadesArr?: { nombre: string; icono?: string }[]
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const AdminFincaForm: React.FC<AdminFincaFormProps> = ({
  fincas,
  onSave,
  onDelete,
  showToast,
  openConfirm,
}) => {
  // Capa Controladora Desacoplada (Architecture Shield)
  const {
    selectedFincaId,
    isNew,
    fincaActual,
    fincasFiltradas,
    listaDesplegada,
    toggleListaDesplegada,
    busquedaFinca,
    setBusquedaFinca,
    activeTab,
    setActiveTab,
    guardando,
    fotoPortadaActual,

    // Campos del formulario
    nombre, setNombre,
    zona, setZona,
    capacidad, setCapacidad,
    capacidadMinima, setCapacidadMinima,
    habitaciones, setHabitaciones,
    camas, setCamas,
    banos, setBanos,
    precio, setPrecio,
    precioFincaCompleta, setPrecioFincaCompleta,
    depositoGarantia, setDepositoGarantia,
    estado, setEstado,
    activo, setActivo,
    descripcion, setDescripcion,
    indicacionesLlegada, setIndicacionesLlegada,
    checkinHora, setCheckinHora,
    checkoutHora, setCheckoutHora,
    politicaMascotas, setPoliticaMascotas,
    valorMascota, setValorMascota,
    politicaMusica, setPoliticaMusica,
    normas, setNormas,
    waNumber, setWaNumber,

    // Datos bancarios
    bancoNombre, setBancoNombre,
    bancoTipoCuenta, setBancoTipoCuenta,
    bancoCuenta, setBancoCuenta,
    bancoTitular, setBancoTitular,
    bancoIdentificacion, setBancoIdentificacion,
    copiadoCuenta, handleCopiarCuenta,

    // Amenidades y Planes
    amenidades,
    nuevaAmenidadTexto, setNuevaAmenidadTexto,
    toggleAmenidadSugerida,
    handleAgregarAmenidadPersonalizada,
    handleEliminarAmenidad,
    planesSeleccionados,
    nuevoPlanTexto, setNuevoPlanTexto,
    togglePlan,
    handleAgregarPlanPersonalizado,

    // Galería
    imagenes,
    selectedThumbs,
    uploading,
    uploadLabel,
    handleSubirImagenes,
    handleAgregarUrl,
    toggleThumbSelection,
    handleMarcarComoPrincipal,
    handleEliminarSeleccionadas,

    // Acciones principales
    handleSelectFinca,
    handleNuevaFinca,
    handleGuardar,
    handleEliminarDefinitivo,
    handleVerEnCliente,
  } = useFincaFormController({
    fincas,
    onSave,
    onDelete,
    showToast,
    openConfirm,
  });

  return (
    <div className="relative w-full max-w-full overflow-hidden rounded-[var(--rad-md,16px)] bg-[var(--surface,#1a1814)] border border-[var(--border,#312e28)] p-4 sm:p-6 shadow-[var(--sh-md,0_4px_20px_rgba(0,0,0,0.25))] transition-all duration-300">
      {/* Luz ambiental sutil High-End en esquina superior */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[var(--accent,#d4924a)]/5 blur-3xl" />

      {/* ============================================================== */}
      {/* 1. CABECERA: TÍTULO, SELECTOR Y ACCIONES PRINCIPALES */}
      {/* ============================================================== */}
      <div className="relative z-10 flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-[var(--text,#f0eae0)]">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--primary,#4da89e)]/10 text-[var(--primary,#4da89e)] border border-[var(--primary,#4da89e)]/20">
                <Home size={18} />
              </span>
              Gestor Profesional de Fincas
            </div>
            <p className="text-xs text-[var(--text-muted,#a8a097)] mt-1">
              Configura acomodación, tarifas, comodidades, normas, cuentas y fotografías de alta resolución
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Si está creando una nueva finca, permite cancelar y regresar a la lista */}
            {isNew ? (
              <button
                type="button"
                onClick={() => handleSelectFinca(fincas.length > 0 ? fincas[0].id : 'new')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--rad-sm,10px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs font-semibold border border-[var(--border,#312e28)] transition-all hover:border-[var(--accent,#d4924a)] hover:text-[var(--accent,#d4924a)]"
              >
                <ArrowLeft size={14} /> Volver a la lista
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleVerEnCliente}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--rad-sm,10px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs font-semibold border border-[var(--border,#312e28)] transition-all hover:border-[var(--primary,#4da89e)] hover:text-[var(--primary,#4da89e)]"
                  title="Ver cómo lo ve el cliente en el catálogo público"
                >
                  <Eye size={14} /> Ver en cliente
                </button>

                <button
                  type="button"
                  onClick={handleNuevaFinca}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-[var(--rad-sm,10px)] bg-[var(--accent,#d4924a)] text-[#141210] text-xs font-bold tracking-wide shadow-[0_2px_10px_rgba(212,146,74,0.25)] transition-all hover:brightness-110 hover:shadow-[0_4px_16px_rgba(212,146,74,0.35)] active:scale-[0.98]"
                >
                  <Plus size={15} /> Nueva finca
                </button>
              </>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* BARRA CONTRAÍDA PREDETERMINADA CON SELECTOR Y ESTADO PRO */}
        {/* ============================================================== */}
        <div className="rounded-[var(--rad-sm,12px)] bg-[var(--surface-2,#201e19)] border border-[var(--border,#312e28)] p-3 transition-all hover:border-[var(--accent,#d4924a)]/60">
          <div
            onClick={toggleListaDesplegada}
            className="flex items-center justify-between gap-3 cursor-pointer select-none"
            title="Haz clic para desplegar o contraer el catálogo de fincas"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {fotoPortadaActual ? (
                <img
                  src={fotoPortadaActual}
                  alt="Portada"
                  className="w-11 h-11 rounded-[var(--rad-xs,8px)] object-cover border border-[var(--border,#312e28)] shrink-0 shadow-sm"
                />
              ) : (
                <div className="w-11 h-11 rounded-[var(--rad-xs,8px)] bg-[var(--surface-3,#272420)] border border-[var(--border,#312e28)] flex items-center justify-center text-[var(--text-muted,#a8a097)] shrink-0">
                  <Home size={18} />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-[var(--text,#f0eae0)] truncate max-w-[280px] sm:max-w-md">
                    {isNew ? '✨ Creando Nueva Finca' : nombre || 'Finca sin nombre'}
                  </span>

                  {isNew ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent,#d4924a)]/15 text-[var(--accent,#d4924a)] border border-[var(--accent,#d4924a)]/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent,#d4924a)] animate-pulse" />
                      Nueva
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        activo
                          ? 'bg-[var(--success,#22c55e)]/10 text-[var(--success,#22c55e)] border border-[var(--success,#22c55e)]/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          activo ? 'bg-[var(--success,#22c55e)] animate-pulse' : 'bg-red-400'
                        }`}
                      />
                      {activo ? 'Activa' : 'Inactiva'}
                    </span>
                  )}
                </div>

                <div className="text-xs text-[var(--text-muted,#a8a097)] flex items-center gap-2 mt-0.5">
                  <span>{zona || 'Ubicación no especificada'}</span>
                  <span>•</span>
                  <span>
                    {capacidadMinima && capacidadMinima > 1
                      ? `${capacidadMinima} a ${capacidad} huéspedes`
                      : `Hasta ${capacidad} huéspedes`}
                  </span>
                  <span>•</span>
                  <span>${Number(precio || 0).toLocaleString('es-CO')} / pers.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted,#a8a097)] shrink-0 pl-2">
              <span className="hidden sm:inline">
                {listaDesplegada ? 'Cerrar selector' : `Ver todas (${fincas.length})`}
              </span>
              <div className="w-7 h-7 rounded-md bg-[var(--surface-3,#272420)] flex items-center justify-center text-[var(--text,#f0eae0)] border border-[var(--border,#312e28)]">
                {listaDesplegada ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* GRILLA DESPLEGABLE DE SELECCIÓN RÁPIDA DE FINCAS */}
          {/* ============================================================== */}
          {listaDesplegada && (
            <div className="mt-3.5 pt-3.5 border-t border-[var(--border,#312e28)]">
              {/* Buscador interno */}
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted,#a8a097)]" />
                <input
                  type="text"
                  placeholder="Buscar finca por nombre o zona…"
                  value={busquedaFinca}
                  onChange={e => setBusquedaFinca(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-[var(--rad-xs,8px)] bg-[var(--surface-3,#272420)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] placeholder:text-[var(--text-muted,#a8a097)]/60 outline-none transition-all focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {/* Opción rápida: Nueva Finca */}
                <div
                  onClick={handleNuevaFinca}
                  className={`flex items-center gap-3 p-2.5 rounded-[var(--rad-xs,8px)] cursor-pointer transition-all border ${
                    isNew
                      ? 'bg-[var(--accent,#d4924a)]/15 border-[var(--accent,#d4924a)] shadow-[0_0_12px_rgba(212,146,74,0.15)]'
                      : 'bg-[var(--surface-3,#272420)] border-dashed border-[var(--border,#312e28)] hover:border-[var(--accent,#d4924a)]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-md bg-[var(--accent,#d4924a)] text-[#141210] flex items-center justify-center font-bold shrink-0">
                    <Plus size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[var(--accent,#d4924a)]">Nueva Finca</div>
                    <div className="text-[11px] text-[var(--text-muted,#a8a097)]">Crear propiedad desde cero</div>
                  </div>
                </div>

                {/* Lista de fincas */}
                {fincasFiltradas.map(f => {
                  const isSelected = f.id === selectedFincaId;
                  const thumb = f.finca_imagenes?.[0]?.url;
                  return (
                    <div
                      key={f.id}
                      onClick={() => handleSelectFinca(f.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-[var(--rad-xs,8px)] cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-[var(--primary,#4da89e)]/15 border-[var(--primary,#4da89e)] shadow-[0_0_12px_rgba(77,168,158,0.15)]'
                          : 'bg-[var(--surface-3,#272420)] border-[var(--border,#312e28)] hover:border-[var(--border,#312e28)]/80 hover:bg-[var(--surface-3,#272420)]/80'
                      }`}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={f.nombre}
                          className="w-9 h-9 rounded-md object-cover border border-[var(--border,#312e28)] shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-[var(--surface,#1a1814)] border border-[var(--border,#312e28)] flex items-center justify-center text-[var(--text-muted,#a8a097)] shrink-0">
                          <Home size={15} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-[var(--text,#f0eae0)] truncate">
                            {f.nombre}
                          </span>
                          {f.activo === false && (
                            <span className="text-[10px] text-red-400 font-bold shrink-0">Inactiva</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted,#a8a097)] flex items-center gap-1.5 mt-0.5 truncate">
                          <span>{f.capacidad_minima && f.capacidad_minima > 1 ? `${f.capacidad_minima}-${f.capacidad}` : `Hasta ${f.capacidad}`} pers.</span>
                          <span>•</span>
                          <span>${Number(f.precio_pp || 0).toLocaleString('es-CO')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. PESTAÑAS DEL FORMULARIO HIGH-END (RESPONSIVE GRID) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 mb-6 w-full">
        {[
          { id: 'general', label: '1. General', icon: <MapPin size={13} /> },
          { id: 'acomodacion', label: '2. Capacidad', icon: <Bed size={13} /> },
          { id: 'tarifas', label: '3. Tarifas', icon: <DollarSign size={13} /> },
          { id: 'bancario', label: '4. Bancario', icon: <CreditCard size={13} /> },
          { id: 'amenidades', label: '5. Comodidades', icon: <Check size={13} />, badge: amenidades.length },
          { id: 'politicas', label: '6. Políticas', icon: <Clock size={13} /> },
          { id: 'fotos', label: '7. Galería', icon: <ImageIcon size={13} />, badge: imagenes.length },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as FincaFormTabId)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[var(--rad-xs,8px)] text-xs font-semibold transition-all border ${
                isActive
                  ? 'bg-[var(--accent,#d4924a)] text-[#141210] border-[var(--accent,#d4924a)] shadow-[0_2px_12px_rgba(212,146,74,0.3)] font-bold'
                  : 'bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] border-[var(--border,#312e28)] hover:border-[var(--accent,#d4924a)]/50 hover:text-[var(--accent,#d4924a)]'
              }`}
            >
              <span className="shrink-0">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-none ${
                    isActive ? 'bg-[#141210]/20 text-[#141210]' : 'bg-[var(--surface-3,#272420)] text-[var(--text-muted,#a8a097)]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 3. CONTENIDO DE LAS PESTAÑAS (HIGH-END INPUTS CON FOCUS GLOW) */}
      {/* ============================================================== */}
      <div className="relative z-10 min-h-[360px]">

        {/* TAB 1: GENERAL */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                Nombre comercial de la finca campestre *
                <span className="text-[11px] font-normal text-[var(--text-muted,#a8a097)] ml-2">
                  (Nombre oficial visible para los clientes)
                </span>
              </label>
              <input
                type="text"
                placeholder="Ej: Finca Campestre El Edén de las Mercedes"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-sm font-semibold border border-[var(--border,#312e28)] placeholder:text-[var(--text-muted,#a8a097)]/60 outline-none transition-all focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)] focus:shadow-[0_0_12px_rgba(212,146,74,0.2)]"
              />
            </div>

            {/* Switch elegante de estado Activa / Inactiva */}
            <div className="md:col-span-2 flex items-center justify-between p-3.5 rounded-[var(--rad-xs,10px)] bg-[var(--surface-2,#201e19)] border border-[var(--border,#312e28)]">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={e => setActivo(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--primary,#4da89e)] accent-[var(--accent,#d4924a)] cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-[var(--text,#f0eae0)]">
                    Finca visible y activa en el catálogo público
                  </div>
                  <div className="text-[11px] text-[var(--text-muted,#a8a097)]">
                    Si se desactiva, los clientes no podrán cotizarla ni verla en la web principal
                  </div>
                </div>
              </label>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  activo
                    ? 'bg-[var(--success,#22c55e)]/10 text-[var(--success,#22c55e)] border border-[var(--success,#22c55e)]/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {activo ? 'Activa ✓' : 'Inactiva 🚫'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                Zona / Ubicación (Municipio, Vereda)
              </label>
              <input
                type="text"
                placeholder="Ej: Santa Elena, El Cerrito, Valle del Cauca"
                value={zona}
                onChange={e => setZona(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] placeholder:text-[var(--text-muted,#a8a097)]/60 outline-none transition-all focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                Estado operativo inicial
              </label>
              <select
                value={estado}
                onChange={e => setEstado(e.target.value as FincaEstado)}
                className="w-full px-3.5 py-2.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] outline-none transition-all focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
              >
                <option value="disponible">🟢 Disponible para reservas</option>
                <option value="alta_demanda">🟠 Alta demanda / Temporada</option>
                <option value="fin_de_semana">🔵 Fines de semana exclusivamente</option>
                <option value="no_disponible">🔴 En mantenimiento / No disponible</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                WhatsApp específico para esta propiedad (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: 573176827093"
                value={waNumber}
                onChange={e => setWaNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] placeholder:text-[var(--text-muted,#a8a097)]/60 outline-none transition-all focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
              />
              <span className="text-[11px] text-[var(--text-muted,#a8a097)] mt-1 block">
                Si lo dejas vacío, el sistema utilizará el número de WhatsApp central configurado.
              </span>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[var(--text,#f0eae0)]">
                  Descripción completa y atractiva
                </label>
                <span className="text-[11px] text-[var(--text-muted,#a8a097)]">
                  {descripcion.length} caracteres
                </span>
              </div>
              <textarea
                rows={5}
                placeholder="Describe el ambiente, la vista, privacidad, zonas verdes, si el clima es cálido o templado, y las características que enamoran a los huéspedes…&#10;&#10;Ejemplo:&#10;• Casa principal con amplios ventanales&#10;• Kiosko y asador al lado de la piscina&#10;• Clima cálido con brisa fresca en la tarde"
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                className="w-full p-3.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] placeholder:text-[var(--text-muted,#a8a097)]/60 outline-none transition-all leading-relaxed focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)] focus:shadow-[0_0_12px_rgba(212,146,74,0.2)]"
              />
              <span className="text-[11px] text-[var(--text-muted,#a8a097)] mt-1 block">
                💡 <strong>Visualización exacta:</strong> Los saltos de línea (Enter) y viñetas se respetan fielmente en la ficha pública.
              </span>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                Indicaciones de llegada / referencias de acceso (Privado)
              </label>
              <textarea
                rows={2}
                placeholder="Ej: A 5 minutos del parque principal de Santa Elena, entrada por el callejón de los guaduales, portón blanco número 12."
                value={indicacionesLlegada}
                onChange={e => setIndicacionesLlegada(e.target.value)}
                className="w-full p-3 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] placeholder:text-[var(--text-muted,#a8a097)]/60 outline-none transition-all focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
              />
            </div>
          </div>
        )}

        {/* TAB 2: ACOMODACIÓN Y CAPACIDAD */}
        {activeTab === 'acomodacion' && (
          <div className="flex flex-col gap-4">
            <div className="p-3 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] border border-[var(--border,#312e28)] text-xs text-[var(--text-muted,#a8a097)]">
              💡 <strong>Edición rápida fluida:</strong> Puedes escribir directamente el número con el teclado numérico o pulsar los botones (+ / -).
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                  <Users size={14} className="text-[var(--primary,#4da89e)]" />
                  Capacidad mínima (personas) *
                </label>
                <NumericInput
                  value={capacidadMinima}
                  onChange={val => setCapacidadMinima(val)}
                  min={1}
                  max={capacidad || 250}
                  suffix="personas"
                  placeholder="1"
                />
                <span className="text-[11px] text-[var(--text-muted,#a8a097)] mt-1 block">
                  Mínimo de huéspedes exigido para cotizar o reservar
                </span>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                  <Users size={14} className="text-[var(--primary,#4da89e)]" />
                  Capacidad máxima (personas) *
                </label>
                <NumericInput
                  value={capacidad}
                  onChange={val => setCapacidad(val)}
                  min={Math.max(1, capacidadMinima)}
                  max={250}
                  suffix="personas"
                  placeholder="10"
                />
                <span className="text-[11px] text-[var(--text-muted,#a8a097)] mt-1 block">
                  Límite máximo de huéspedes admitido
                </span>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                  <Bed size={14} className="text-[var(--primary,#4da89e)]" />
                  Habitaciones
                </label>
                <NumericInput
                  value={habitaciones}
                  onChange={val => setHabitaciones(val)}
                  min={1}
                  max={50}
                  suffix="habitaciones"
                  placeholder="3"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                  <Bed size={14} className="text-[var(--primary,#4da89e)]" />
                  Camas disponibles
                </label>
                <NumericInput
                  value={camas}
                  onChange={val => setCamas(val)}
                  min={1}
                  max={100}
                  suffix="camas"
                  placeholder="5"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                  <Bath size={14} className="text-[var(--primary,#4da89e)]" />
                  Baños
                </label>
                <NumericInput
                  value={banos}
                  onChange={val => setBanos(val)}
                  min={1}
                  max={30}
                  suffix="baños"
                  placeholder="2"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TARIFAS Y PRECIOS */}
        {activeTab === 'tarifas' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                Precio por persona / noche (COP) *
              </label>
              <CurrencyInput
                value={precio}
                onChange={val => setPrecio(val)}
                placeholder="85.000"
              />
              <span className="text-[11px] text-[var(--text-muted,#a8a097)] mt-1 block">
                Tarifa base para el cotizador público por persona
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                Precio finca completa por noche (COP)
              </label>
              <CurrencyInput
                value={precioFincaCompleta}
                onChange={val => setPrecioFincaCompleta(val)}
                placeholder="0"
              />
              <span className="text-[11px] text-[var(--text-muted,#a8a097)] mt-1 block">
                Opcional. Alquiler exclusivo sin importar cantidad de huéspedes
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                Depósito de garantía reembolsable (COP)
              </label>
              <CurrencyInput
                value={depositoGarantia}
                onChange={val => setDepositoGarantia(val)}
                placeholder="0"
              />
              <span className="text-[11px] text-[var(--text-muted,#a8a097)] mt-1 block">
                Depósito retornable que cubre posibles daños o normas
              </span>
            </div>
          </div>
        )}

        {/* TAB 4: DATOS BANCARIOS DEL PROPIETARIO */}
        {activeTab === 'bancario' && (
          <div className="flex flex-col gap-4">
            <div className="p-3.5 rounded-[var(--rad-xs,10px)] bg-[var(--surface-2,#201e19)] border border-[var(--border,#312e28)] flex gap-3 items-start">
              <div className="w-9 h-9 rounded-lg bg-[var(--primary,#4da89e)]/10 text-[var(--primary,#4da89e)] border border-[var(--primary,#4da89e)]/20 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-[var(--text,#f0eae0)] mb-0.5">
                  Cuenta Bancaria para Separación y Anticipo (50%)
                </div>
                <p className="m-0 text-[11px] text-[var(--text-muted,#a8a097)] leading-relaxed">
                  🔒 <strong>Privacidad resguardada:</strong> Estos datos <strong>NO</strong> se muestran públicamente en el catálogo. Se insertan automáticamente <strong>únicamente en el mensaje oficial de WhatsApp</strong> al solicitar el abono de reserva al cliente.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="sm:col-span-2 md:col-span-4">
                <label className="block text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                  Banco o Entidad Financiera *
                </label>
                {/* Chips de bancos rápidos */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { nombre: 'Bancolombia', tipo: 'Ahorros' },
                    { nombre: 'Nequi', tipo: 'Billetera Digital / Celular' },
                    { nombre: 'Daviplata', tipo: 'Billetera Digital / Celular' },
                    { nombre: 'Davivienda', tipo: 'Ahorros' },
                    { nombre: 'Banco de Bogotá', tipo: 'Ahorros' },
                    { nombre: 'BBVA', tipo: 'Ahorros' },
                    { nombre: 'Nu Colombia', tipo: 'Cuenta de Ahorros' },
                    { nombre: 'Lulo Bank', tipo: 'Cuenta de Ahorros' },
                  ].map(b => {
                    const isSelected = bancoNombre.toLowerCase() === b.nombre.toLowerCase();
                    return (
                      <button
                        key={b.nombre}
                        type="button"
                        onClick={() => {
                          setBancoNombre(b.nombre);
                          if (b.nombre === 'Nequi' || b.nombre === 'Daviplata') {
                            setBancoTipoCuenta('Billetera Digital / Celular');
                          } else if (!bancoTipoCuenta || bancoTipoCuenta === 'Billetera Digital / Celular') {
                            setBancoTipoCuenta('Ahorros');
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs transition-all border ${
                          isSelected
                            ? 'bg-[var(--primary,#4da89e)] text-[#141210] font-bold border-[var(--primary,#4da89e)]'
                            : 'bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] border-[var(--border,#312e28)] hover:border-[var(--primary,#4da89e)]/40'
                        }`}
                      >
                        {b.nombre} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  placeholder="Ej: Bancolombia, Nequi, etc."
                  value={bancoNombre}
                  onChange={e => setBancoNombre(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] outline-none transition-all focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                  Tipo de Cuenta
                </label>
                <select
                  value={bancoTipoCuenta}
                  onChange={e => setBancoTipoCuenta(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] outline-none transition-all focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
                >
                  <option value="Ahorros">Cuenta de Ahorros</option>
                  <option value="Corriente">Cuenta Corriente</option>
                  <option value="Billetera Digital / Celular">Billetera Digital / Celular</option>
                  <option value="Llave Transfiya / Bre-B">Llave Transfiya / Bre-B</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[var(--text,#f0eae0)]">
                    Número de Cuenta o Celular *
                  </label>
                  {bancoCuenta && (
                    <button
                      type="button"
                      onClick={handleCopiarCuenta}
                      className="text-[11px] text-[var(--primary,#4da89e)] hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      {copiadoCuenta ? <Check size={11} /> : <Copy size={11} />}
                      {copiadoCuenta ? 'Copiado' : 'Copiar'}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Ej: 123-456789-01 o 3151234567"
                  value={bancoCuenta}
                  onChange={e => setBancoCuenta(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs tracking-wider border border-[var(--border,#312e28)] outline-none transition-all focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                  Nombre del Titular
                </label>
                <input
                  type="text"
                  placeholder="Ej: Carlos Gómez"
                  value={bancoTitular}
                  onChange={e => setBancoTitular(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] outline-none transition-all focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                  Cédula / NIT del Titular
                </label>
                <input
                  type="text"
                  placeholder="Ej: CC 16.789.012"
                  value={bancoIdentificacion}
                  onChange={e => setBancoIdentificacion(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] outline-none transition-all focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
                />
              </div>
            </div>

            {/* Live Preview de WhatsApp */}
            <div className="rounded-[var(--rad-xs,10px)] bg-[var(--surface-2,#201e19)] border border-[var(--border,#312e28)] p-3.5 mt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text,#f0eae0)]">
                  <span>📲</span>
                  <span>Previsualización en mensaje oficial de WhatsApp:</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#25d366]/15 text-[#25d366] border border-[#25d366]/20">
                  WhatsApp Oficial
                </span>
              </div>

              <div className="rounded-lg bg-[var(--surface,#1a1814)] border border-[var(--border,#312e28)] p-3 font-mono text-xs text-[var(--text,#f0eae0)] whitespace-pre-wrap leading-relaxed">
                <strong>💳 *DATOS DE CONSIGNACIÓN / CUENTA DEL PROPIETARIO:*</strong>{'\n'}
                {bancoCuenta ? (
                  <>
                    • *Banco:* {bancoNombre || 'Bancolombia'}{'\n'}
                    • *Tipo de Cuenta:* {bancoTipoCuenta || 'Ahorros'}{'\n'}
                    • *Número de Cuenta:* {bancoCuenta}{'\n'}
                    • *Titular:* {bancoTitular || 'Propietario de la Finca'}
                    {bancoIdentificacion ? `\n• *Identificación / NIT:* ${bancoIdentificacion}` : ''}
                  </>
                ) : (
                  <span className="text-[var(--text-muted,#a8a097)] italic font-sans">
                    (Al completar los datos de cuenta arriba, se visualizará aquí el bloque exacto que recibirá el cliente.)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: COMODIDADES */}
        {activeTab === 'amenidades' && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="font-bold text-xs text-[var(--text,#f0eae0)] mb-1">
                Comodidades seleccionadas ({amenidades.length}):
              </div>
              <p className="text-[11px] text-[var(--text-muted,#a8a097)] mb-3">
                Haz clic en cualquiera de las comodidades sugeridas para activarla o añadir una propia personalizada.
              </p>

              {/* Chips sugeridos */}
              <div className="flex flex-wrap gap-2 mb-4">
                {AMENIDADES_SUGERIDAS.map(sug => {
                  const seleccionada = amenidades.some(a => a.nombre.toLowerCase() === sug.nombre.toLowerCase());
                  return (
                    <button
                      key={sug.nombre}
                      type="button"
                      onClick={() => toggleAmenidadSugerida(sug)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        seleccionada
                          ? 'bg-[var(--primary,#4da89e)]/15 border-[var(--primary,#4da89e)] text-[var(--primary,#4da89e)] shadow-[0_0_10px_rgba(77,168,158,0.2)]'
                          : 'bg-[var(--surface-2,#201e19)] border-[var(--border,#312e28)] text-[var(--text,#f0eae0)] hover:border-[var(--primary,#4da89e)]/40'
                      }`}
                    >
                      <span>{sug.emoji}</span>
                      <span>{sug.nombre}</span>
                      {seleccionada && <Check size={13} className="stroke-[3]" />}
                    </button>
                  );
                })}
              </div>

              {/* Input para agregar comodidad personalizada */}
              <div className="flex gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="Añadir otra comodidad (ej: Sendero ecológico)…"
                  value={nuevaAmenidadTexto}
                  onChange={e => setNuevaAmenidadTexto(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAgregarAmenidadPersonalizada();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] outline-none focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
                />
                <button
                  type="button"
                  onClick={handleAgregarAmenidadPersonalizada}
                  className="px-4 py-2 rounded-[var(--rad-xs,8px)] bg-[var(--accent,#d4924a)] text-[#141210] font-bold text-xs shrink-0 transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  <Plus size={14} className="inline mr-1" /> Añadir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: POLÍTICAS Y NORMAS */}
        {activeTab === 'politicas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                <Clock size={14} className="text-[var(--primary,#4da89e)]" />
                Hora de Check-in (Entrada)
              </label>
              <input
                type="text"
                placeholder="15:00 o 3:00 PM"
                value={checkinHora}
                onChange={e => setCheckinHora(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] outline-none focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                <Clock size={14} className="text-[var(--primary,#4da89e)]" />
                Hora de Check-out (Salida)
              </label>
              <input
                type="text"
                placeholder="13:00 o 1:00 PM"
                value={checkoutHora}
                onChange={e => setCheckoutHora(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] outline-none focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                <Dog size={14} className="text-[var(--primary,#4da89e)]" />
                Política de mascotas (Pet-friendly)
              </label>
              <select
                value={politicaMascotas}
                onChange={e => setPoliticaMascotas(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] outline-none focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
              >
                <option value="permitido">🐶 Mascotas permitidas sin costo adicional</option>
                <option value="con_costo">🐾 Se aceptan mascotas con tarifa adicional</option>
                <option value="consulta_previa">⚠️ Permitido con consulta previa / razas pequeñas</option>
                <option value="no_permitido">🚫 No se permiten mascotas</option>
              </select>
            </div>

            {politicaMascotas === 'con_costo' ? (
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                  <DollarSign size={14} className="text-[var(--accent,#d4924a)]" />
                  Valor adicional por mascota (COP) *
                </label>
                <CurrencyInput
                  value={valorMascota}
                  onChange={val => setValorMascota(val)}
                  placeholder="25.000"
                />
              </div>
            ) : (
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                  <Volume2 size={14} className="text-[var(--primary,#4da89e)]" />
                  Política de música y sonido
                </label>
                <select
                  value={politicaMusica}
                  onChange={e => setPoliticaMusica(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] outline-none focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
                >
                  <option value="moderada">🎵 Música moderada (tranquilidad campestre)</option>
                  <option value="hasta_medianoche">🔊 Música permitida hasta medianoche (12:00 AM)</option>
                  <option value="sin_restriccion">🎉 Eventos y música libre acordada</option>
                  <option value="no_permitida">🤫 Finca de descanso / Prohibido sonido alto</option>
                </select>
              </div>
            )}

            {politicaMascotas === 'con_costo' && (
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                  <Volume2 size={14} className="text-[var(--primary,#4da89e)]" />
                  Política de música y sonido
                </label>
                <select
                  value={politicaMusica}
                  onChange={e => setPoliticaMusica(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] outline-none focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
                >
                  <option value="moderada">🎵 Música moderada (tranquilidad campestre)</option>
                  <option value="hasta_medianoche">🔊 Música permitida hasta medianoche (12:00 AM)</option>
                  <option value="sin_restriccion">🎉 Eventos y música libre acordada</option>
                  <option value="no_permitida">🤫 Finca de descanso / Prohibido sonido alto</option>
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                <ShieldAlert size={14} className="text-[var(--primary,#4da89e)]" />
                Normas de convivencia y reglas de la finca
              </label>
              <textarea
                rows={3}
                placeholder="Ej: Uso de traje de baño obligatorio en piscina. Apagar luces exteriores al dormir. Prohibido fumar dentro de las habitaciones."
                value={normas}
                onChange={e => setNormas(e.target.value)}
                className="w-full p-3 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] outline-none focus:border-[var(--accent,#d4924a)] focus:ring-1 focus:ring-[var(--accent,#d4924a)]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text,#f0eae0)] mb-1.5">
                <Sparkles size={14} className="text-[var(--primary,#4da89e)]" />
                Planes de alimentación disponibles
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {PLANES_SUGERIDOS.map(plan => {
                  const activoPlan = planesSeleccionados.includes(plan);
                  return (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => togglePlan(plan)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rad-xs,6px)] text-xs font-semibold transition-all border ${
                        activoPlan
                          ? 'bg-[var(--primary,#4da89e)]/15 border-[var(--primary,#4da89e)] text-[var(--primary,#4da89e)]'
                          : 'bg-[var(--surface-2,#201e19)] border-[var(--border,#312e28)] text-[var(--text-muted,#a8a097)] hover:text-[var(--text,#f0eae0)]'
                      }`}
                    >
                      <span>{plan}</span>
                      {activoPlan && <Check size={12} />}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  placeholder="Añadir otro plan…"
                  value={nuevoPlanTexto}
                  onChange={e => setNuevoPlanTexto(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAgregarPlanPersonalizado();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 rounded-[var(--rad-xs,6px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs border border-[var(--border,#312e28)] outline-none"
                />
                <button
                  type="button"
                  onClick={handleAgregarPlanPersonalizado}
                  className="px-3 py-1.5 rounded-[var(--rad-xs,6px)] bg-[var(--surface-3,#272420)] border border-[var(--border,#312e28)] text-xs text-[var(--text,#f0eae0)] font-semibold"
                >
                  Añadir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: FOTOGRAFÍAS Y GALERÍA (SIN BOTONES REDUNDANTES) */}
        {activeTab === 'fotos' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--border,#312e28)]">
              <div>
                <div className="text-xs font-bold text-[var(--text,#f0eae0)] flex items-center gap-2">
                  <ImageIcon size={15} /> Fotografías de la finca ({imagenes.length}/20)
                </div>
                <div className="text-[11px] text-[var(--text-muted,#a8a097)]">
                  La primera imagen es la portada. Haz clic sobre una foto para seleccionarla.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAgregarUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rad-xs,8px)] bg-[var(--surface-2,#201e19)] text-[var(--text,#f0eae0)] text-xs font-semibold border border-[var(--border,#312e28)] hover:border-[var(--accent,#d4924a)]"
                >
                  <LinkIcon size={12} /> Añadir URL
                </button>

                {selectedThumbs.size > 0 && (
                  <button
                    type="button"
                    onClick={handleEliminarSeleccionadas}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rad-xs,8px)] bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/30 hover:bg-red-500/25"
                  >
                    <Trash2 size={12} /> Eliminar ({selectedThumbs.size})
                  </button>
                )}
              </div>
            </div>

            {/* Dropzone unificada con micro-animación y optimización WebP */}
            <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--border,#312e28)] rounded-[var(--rad-sm,12px)] bg-[var(--surface-2,#201e19)] hover:border-[var(--accent,#d4924a)] cursor-pointer transition-all">
              <input
                type="file"
                multiple
                accept="image/*,image/heic,image/heif,.heic,.heif"
                className="hidden"
                onChange={handleSubirImagenes}
              />
              <div className="w-12 h-12 rounded-full bg-[var(--accent,#d4924a)]/10 text-[var(--accent,#d4924a)] flex items-center justify-center mb-2">
                <Upload size={22} />
              </div>
              <div className="text-xs font-bold text-[var(--text,#f0eae0)]">
                Arrastra imágenes aquí o <span className="text-[var(--accent,#d4924a)] underline">haz clic para examinar</span>
              </div>
              <div className="text-[11px] text-[var(--text-muted,#a8a097)] mt-1 text-center">
                Conversión automática a WebP ligero · Compatible con iPhone HEIC, JPG y PNG
              </div>
            </label>

            {uploading && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-[var(--surface-2,#201e19)] border border-[var(--primary,#4da89e)] text-xs text-[var(--primary,#4da89e)] font-bold animate-pulse">
                <Loader size={16} className="animate-spin" />
                <span>{uploadLabel}</span>
              </div>
            )}

            {/* Grilla de miniaturas con estrella de portada */}
            {imagenes.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-1">
                {imagenes.map((url, idx) => {
                  const isSelected = selectedThumbs.has(idx);
                  const esPrincipal = idx === 0;
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleThumbSelection(idx)}
                      className={`group relative aspect-video rounded-[var(--rad-xs,8px)] overflow-hidden border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--accent,#d4924a)] ring-2 ring-[var(--accent,#d4924a)] shadow-[0_0_15px_rgba(212,146,74,0.3)]'
                          : 'border-[var(--border,#312e28)] hover:border-[var(--text-muted,#a8a097)]'
                      }`}
                    >
                      <img src={url} alt={`Finca ${idx + 1}`} className="w-full h-full object-cover" />

                      <div
                        className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                          esPrincipal
                            ? 'bg-[var(--accent,#d4924a)] text-[#141210] shadow'
                            : 'bg-black/60 text-white backdrop-blur-sm'
                        }`}
                      >
                        {esPrincipal ? '★ Portada' : `#${idx + 1}`}
                      </div>

                      {!esPrincipal && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleMarcarComoPrincipal(idx);
                          }}
                          className="opacity-0 group-hover:opacity-100 absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 hover:bg-[var(--accent,#d4924a)] hover:text-[#141210] text-white text-[10px] font-bold transition-all shadow"
                        >
                          Hacer portada
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ============================================================== */}
      {/* 4. BARRA DE ACCIONES PRINCIPALES (STICKY / SIN REDUNDANCIAS) */}
      {/* ============================================================== */}
      <div className="relative z-10 flex items-center justify-between flex-wrap gap-3 mt-8 pt-4 border-t border-[var(--border,#312e28)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className={`inline-flex items-center justify-center gap-2 px-7 py-3 rounded-[var(--rad-sm,10px)] font-bold text-sm tracking-wide shadow-lg transition-all active:scale-[0.98] ${
              isNew
                ? 'bg-[var(--accent,#d4924a)] text-[#141210] shadow-[0_4px_20px_rgba(212,146,74,0.35)] hover:brightness-110'
                : 'bg-[var(--primary,#4da89e)] text-[#141210] shadow-[0_4px_20px_rgba(77,168,158,0.35)] hover:brightness-110'
            }`}
          >
            {guardando ? (
              <>
                <Loader size={16} className="animate-spin" /> Guardando…
              </>
            ) : isNew ? (
              <>
                <Plus size={16} /> Crear Nueva Finca
              </>
            ) : (
              <>
                <Save size={16} /> Guardar Cambios
              </>
            )}
          </button>
        </div>

        {!isNew && (
          <button
            type="button"
            onClick={handleEliminarDefinitivo}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--rad-sm,10px)] text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
            title="Borrar permanentemente de la base de datos"
          >
            <Trash2 size={14} /> Eliminar finca
          </button>
        )}
      </div>
    </div>
  );
};
