import React, { useState, useEffect, useMemo } from 'react';
import {
  Save, Trash2, Plus, Upload, Link as LinkIcon, Loader, Image as ImageIcon,
  Eye, ChevronDown, ChevronUp, Search, Check, Sparkles, MapPin, Users,
  Bed, Bath, Clock, ShieldAlert, Volume2, Dog, HelpCircle, AlertCircle, Home
} from 'lucide-react';
import { supabase, DEFAULT_WA_NUMBER } from '../services/supabase';
import { optimizarImagen, formatearBytes } from '../utils/imageOptimizer';
import type { Finca, FincaEstado } from '../types';
import { CurrencyInput } from '../components/CurrencyInput';
import { NumericInput } from '../components/NumericInput';
import { useApp } from '../context/AppContext';

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

// Lista de amenidades predeterminadas sugeridas para fincas campestres
const AMENIDADES_SUGERIDAS: { nombre: string; icono: string; emoji: string }[] = [
  { nombre: 'Piscina privada', icono: 'waves', emoji: '🏊' },
  { nombre: 'Jacuzzi / Hidromasaje', icono: 'sparkles', emoji: '♨️' },
  { nombre: 'Zona BBQ / Asador campestre', icono: 'flame', emoji: '🥩' },
  { nombre: 'Wi-Fi de alta velocidad', icono: 'wifi', emoji: '📶' },
  { nombre: 'Parqueadero privado', icono: 'car', emoji: '🚗' },
  { nombre: 'Amplias zonas verdes', icono: 'trees', emoji: '🌿' },
  { nombre: 'Cancha de fútbol / múltiple', icono: 'activity', emoji: '⚽' },
  { nombre: 'Equipo de sonido Bluetooth', icono: 'speaker', emoji: '🔊' },
  { nombre: 'Cocina dotada con electrodomésticos', icono: 'utensils', emoji: '🍳' },
  { nombre: 'Smart TV con streaming', icono: 'tv', emoji: '📺' },
  { nombre: 'Mesa de billar / juegos de mesa', icono: 'dices', emoji: '🎱' },
  { nombre: 'Kiosko / Estadero social', icono: 'home', emoji: '🛖' },
  { nombre: 'Vista panorámica al valle/montaña', icono: 'mountain', emoji: '🌅' },
  { nombre: 'Aire acondicionado / Ventiladores', icono: 'wind', emoji: '❄️' },
];

const PLANES_SUGERIDOS = [
  'Sin alimentación',
  'Desayuno incluido',
  'Media pensión',
  'Alimentación completa (3 comidas)',
  'Todo incluido campestre',
];

type TabId = 'general' | 'acomodacion' | 'tarifas' | 'amenidades' | 'politicas' | 'fotos';

export const AdminFincaForm: React.FC<AdminFincaFormProps> = ({
  fincas,
  onSave,
  onDelete,
  showToast,
  openConfirm,
}) => {
  const { previsualizarFinca, fincaParaEditarId, setFincaParaEditarId, eliminarFinca, desactivarFinca, reactivarFinca } = useApp();

  // Estado de selección y lista contraída
  const [selectedFincaId, setSelectedFincaId] = useState<string>('new');
  const [listaDesplegada, setListaDesplegada] = useState<boolean>(false);
  const [busquedaFinca, setBusquedaFinca] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [guardando, setGuardando] = useState<boolean>(false);

  // Si se solicita editar una finca específica desde el panel cliente
  useEffect(() => {
    if (fincaParaEditarId) {
      setSelectedFincaId(fincaParaEditarId);
      setListaDesplegada(false);
      setFincaParaEditarId(null);
    }
  }, [fincaParaEditarId, setFincaParaEditarId]);

  // Campos del formulario
  const [nombre, setNombre] = useState('');
  const [zona, setZona] = useState('Santa Elena, Valle');
  const [capacidad, setCapacidad] = useState<number>(10);
  const [habitaciones, setHabitaciones] = useState<number>(3);
  const [camas, setCamas] = useState<number>(5);
  const [banos, setBanos] = useState<number>(2);
  const [precio, setPrecio] = useState<number>(85000);
  const [precioFincaCompleta, setPrecioFincaCompleta] = useState<number>(0);
  const [depositoGarantia, setDepositoGarantia] = useState<number>(0);
  const [estado, setEstado] = useState<FincaEstado>('disponible');
  const [activo, setActivo] = useState(true);
  const [descripcion, setDescripcion] = useState('');
  const [indicacionesLlegada, setIndicacionesLlegada] = useState('');
  const [checkinHora, setCheckinHora] = useState('15:00');
  const [checkoutHora, setCheckoutHora] = useState('13:00');
  const [politicaMascotas, setPoliticaMascotas] = useState('permitido');
  const [politicaMusica, setPoliticaMusica] = useState('moderada');
  const [normas, setNormas] = useState('');
  const [waNumber, setWaNumber] = useState(DEFAULT_WA_NUMBER);

  // Amenidades y Planes
  const [amenidades, setAmenidades] = useState<{ nombre: string; icono?: string }[]>([]);
  const [nuevaAmenidadTexto, setNuevaAmenidadTexto] = useState('');
  const [planesSeleccionados, setPlanesSeleccionados] = useState<string[]>([
    'Sin alimentación',
    'Desayuno incluido',
    'Todo incluido campestre',
  ]);
  const [nuevoPlanTexto, setNuevoPlanTexto] = useState('');

  // Galería de Imágenes
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [selectedThumbs, setSelectedThumbs] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('');

  // Finca seleccionada actualmente
  const fincaActual = useMemo(() => {
    return fincas.find(f => f.id === selectedFincaId) || null;
  }, [fincas, selectedFincaId]);

  // Fincas filtradas en la lista desplegable
  const fincasFiltradas = useMemo(() => {
    if (!busquedaFinca.trim()) return fincas;
    const q = busquedaFinca.toLowerCase();
    return fincas.filter(f =>
      f.nombre.toLowerCase().includes(q) ||
      (f.zona && f.zona.toLowerCase().includes(q))
    );
  }, [fincas, busquedaFinca]);

  // Cargar datos de la finca seleccionada o resetear a nuevo
  useEffect(() => {
    if (selectedFincaId === 'new') {
      setNombre('');
      setZona('Santa Elena, Valle');
      setCapacidad(10);
      setHabitaciones(3);
      setCamas(5);
      setBanos(2);
      setPrecio(85000);
      setPrecioFincaCompleta(0);
      setDepositoGarantia(0);
      setEstado('disponible');
      setActivo(true);
      setDescripcion('');
      setIndicacionesLlegada('');
      setCheckinHora('15:00');
      setCheckoutHora('13:00');
      setPoliticaMascotas('permitido');
      setPoliticaMusica('moderada');
      setNormas('Cuidar las instalaciones y la naturaleza. Respetar horarios de silencio. Dejar la finca en las condiciones recibidas.');
      setWaNumber(DEFAULT_WA_NUMBER);
      setAmenidades([
        { nombre: 'Piscina privada', icono: 'waves' },
        { nombre: 'Zona BBQ / Asador campestre', icono: 'flame' },
        { nombre: 'Wi-Fi de alta velocidad', icono: 'wifi' },
        { nombre: 'Parqueadero privado', icono: 'car' },
        { nombre: 'Amplias zonas verdes', icono: 'trees' },
        { nombre: 'Cocina dotada con electrodomésticos', icono: 'utensils' },
      ]);
      setPlanesSeleccionados(['Sin alimentación', 'Desayuno incluido', 'Todo incluido campestre']);
      setImagenes([]);
      setSelectedThumbs(new Set());
    } else {
      const f = fincas.find(x => x.id === selectedFincaId);
      if (f) {
        setNombre(f.nombre || '');
        setZona(f.zona || 'Santa Elena, Valle');
        setCapacidad(f.capacidad || 10);
        setHabitaciones(f.habitaciones || 3);
        setCamas(f.camas || 5);
        setBanos(f.banos || 2);
        setPrecio(Number(f.precio_pp) || 0);
        setPrecioFincaCompleta(Number(f.precio_finca_completa) || 0);
        setDepositoGarantia(Number(f.deposito_garantia) || 0);
        setEstado(f.estado || 'disponible');
        setActivo(f.activo !== false);
        setDescripcion(f.descripcion || '');
        setIndicacionesLlegada(f.indicaciones_llegada || '');
        setCheckinHora(f.checkin_hora || '15:00');
        setCheckoutHora(f.checkout_hora || '13:00');
        setPoliticaMascotas(f.politica_mascotas || 'permitido');
        setPoliticaMusica(f.politica_musica || 'moderada');
        setNormas(f.normas || '');
        setWaNumber(f.whatsapp || DEFAULT_WA_NUMBER);

        // Cargar amenidades existentes
        if (f.finca_amenidades && f.finca_amenidades.length > 0) {
          setAmenidades(f.finca_amenidades.map(a => ({ nombre: a.nombre, icono: a.icono || 'check' })));
        } else {
          setAmenidades([
            { nombre: 'Piscina privada', icono: 'waves' },
            { nombre: 'Zona BBQ / Asador campestre', icono: 'flame' },
            { nombre: 'Wi-Fi de alta velocidad', icono: 'wifi' },
          ]);
        }

        // Cargar planes
        if (f.finca_planes && f.finca_planes.length > 0) {
          setPlanesSeleccionados(f.finca_planes.map(p => p.nombre));
        } else {
          setPlanesSeleccionados(['Sin alimentación', 'Desayuno incluido', 'Todo incluido campestre']);
        }

        const imgs = [...(f.finca_imagenes || [])].sort((a, b) => a.orden - b.orden).map(i => i.url);
        setImagenes(imgs);
        setSelectedThumbs(new Set());
      }
    }
  }, [selectedFincaId, fincas]);

  // Acciones de amenidades
  const toggleAmenidadSugerida = (sugerida: { nombre: string; icono: string }) => {
    const yaExiste = amenidades.some(a => a.nombre.toLowerCase() === sugerida.nombre.toLowerCase());
    if (yaExiste) {
      setAmenidades(prev => prev.filter(a => a.nombre.toLowerCase() !== sugerida.nombre.toLowerCase()));
    } else {
      setAmenidades(prev => [...prev, { nombre: sugerida.nombre, icono: sugerida.icono }]);
    }
  };

  const handleAgregarAmenidadPersonalizada = () => {
    const texto = nuevaAmenidadTexto.trim();
    if (!texto) return;
    if (amenidades.some(a => a.nombre.toLowerCase() === texto.toLowerCase())) {
      showToast('Esta comodidad ya está añadida', 'info');
      return;
    }
    setAmenidades(prev => [...prev, { nombre: texto, icono: 'check' }]);
    setNuevaAmenidadTexto('');
  };

  const handleEliminarAmenidad = (index: number) => {
    setAmenidades(prev => prev.filter((_, idx) => idx !== index));
  };

  // Acciones de planes
  const togglePlan = (plan: string) => {
    if (planesSeleccionados.includes(plan)) {
      setPlanesSeleccionados(prev => prev.filter(p => p !== plan));
    } else {
      setPlanesSeleccionados(prev => [...prev, plan]);
    }
  };

  const handleAgregarPlanPersonalizado = () => {
    const texto = nuevoPlanTexto.trim();
    if (!texto) return;
    if (planesSeleccionados.includes(texto)) {
      showToast('Este plan ya está en la lista', 'info');
      return;
    }
    setPlanesSeleccionados(prev => [...prev, texto]);
    setNuevoPlanTexto('');
  };

  // Subir y optimizar imágenes
  const handleSubirImagenes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const available = 20 - imagenes.length;
    if (available <= 0) {
      showToast('Ya tienes el límite de 20 imágenes por finca.', 'error');
      return;
    }

    const toUpload = files.slice(0, available);
    if (files.length > available) {
      showToast(`Solo se subirán ${available} imágenes (límite: 20)`, 'info');
    }

    setUploading(true);
    let subidasOk = 0;
    let totalBytesOriginales = 0;
    let totalBytesOptimizados = 0;
    const nuevasUrls: string[] = [];

    for (let i = 0; i < toUpload.length; i++) {
      const rawFile = toUpload[i];
      setUploadLabel(`Optimizando imagen ${i + 1} de ${toUpload.length}: ${rawFile.name}…`);

      const opt = await optimizarImagen(rawFile);
      const fileToUpload = opt.file;
      totalBytesOriginales += opt.originalSize;
      totalBytesOptimizados += opt.optimizedSize;

      if (opt.reductionPct > 0) {
        setUploadLabel(`Subiendo ${i + 1} de ${toUpload.length} (reducida ${opt.reductionPct}% a WebP)…`);
      } else {
        setUploadLabel(`Subiendo ${i + 1} de ${toUpload.length}: ${fileToUpload.name}…`);
      }

      const mimeType = fileToUpload.type || 'image/webp';
      const ext = mimeType.includes('webp') ? 'webp' : (fileToUpload.name.split('.').pop()?.toLowerCase() || 'jpg');
      const path = `fincas/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from('finca-imagenes')
        .upload(path, fileToUpload, { upsert: false, contentType: mimeType });

      if (error) {
        console.error('Error subiendo imagen:', error);
        showToast(`Error subiendo ${rawFile.name}: ${error.message}`, 'error');
        continue;
      }

      const { data: urlData } = supabase.storage.from('finca-imagenes').getPublicUrl(path);
      if (urlData?.publicUrl) {
        nuevasUrls.push(urlData.publicUrl);
        subidasOk++;
      }
    }

    setUploading(false);
    e.target.value = '';

    if (nuevasUrls.length > 0) {
      setImagenes(prev => [...prev, ...nuevasUrls]);
      const ahorro = totalBytesOriginales - totalBytesOptimizados;
      const ahorroTexto = ahorro > 0 ? ` (ahorro de peso: ${formatearBytes(ahorro)})` : '';
      showToast(`${subidasOk} imagen(es) optimizada(s) a WebP y subida(s) con éxito ✅${ahorroTexto}`, 'success');
    }
  };

  const handleAgregarUrl = () => {
    const url = prompt('Ingresa la URL pública de la imagen:');
    if (!url || !url.startsWith('http')) return;
    setImagenes(prev => [...prev, url]);
    showToast('Imagen añadida a la galería', 'info');
  };

  const toggleThumbSelection = (index: number) => {
    setSelectedThumbs(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleMarcarComoPrincipal = (index: number) => {
    if (index === 0) return;
    setImagenes(prev => {
      const list = [...prev];
      const [item] = list.splice(index, 1);
      list.unshift(item);
      return list;
    });
    showToast('Imagen fijada como portada principal', 'success');
  };

  const handleEliminarSeleccionadas = () => {
    if (!selectedThumbs.size) {
      showToast('Selecciona al menos una imagen haciendo clic en ella', 'error');
      return;
    }

    openConfirm(
      '¿Eliminar imágenes seleccionadas?',
      `Se removerán ${selectedThumbs.size} imagen(es) de esta finca.`,
      () => {
        setImagenes(prev => prev.filter((_, i) => !selectedThumbs.has(i)));
        setSelectedThumbs(new Set());
        showToast('Imágenes eliminadas', 'success');
      }
    );
  };

  // Guardar finca completa en Supabase
  const handleGuardar = async () => {
    if (!nombre.trim()) {
      showToast('El nombre de la finca es obligatorio', 'error');
      setActiveTab('general');
      return;
    }

    setGuardando(true);

    const payload: Partial<Finca> = {
      nombre: nombre.trim(),
      zona: zona.trim() || 'Santa Elena, Valle',
      capacidad: Number(capacidad) || 10,
      habitaciones: Number(habitaciones) || 3,
      camas: Number(camas) || 5,
      banos: Number(banos) || 2,
      precio_pp: Number(precio) || 0,
      precio_finca_completa: Number(precioFincaCompleta) || 0,
      deposito_garantia: Number(depositoGarantia) || 0,
      estado,
      activo,
      descripcion: descripcion.trim(),
      indicaciones_llegada: indicacionesLlegada.trim(),
      checkin_hora: checkinHora,
      checkout_hora: checkoutHora,
      politica_mascotas: politicaMascotas,
      politica_musica: politicaMusica,
      normas: normas.trim(),
      whatsapp: waNumber.replace(/[^0-9]/g, ''),
    };

    if (selectedFincaId !== 'new') {
      payload.id = selectedFincaId;
    }

    const planesStr = planesSeleccionados.join(', ');
    const res = await onSave(payload, imagenes, planesStr, amenidades);
    setGuardando(false);

    if (res.success) {
      showToast(
        selectedFincaId === 'new'
          ? '¡Nueva finca creada exitosamente! 🎉'
          : 'Finca actualizada exitosamente en Supabase ✅',
        'success'
      );
      if (res.id) setSelectedFincaId(res.id);
    } else {
      showToast(`Error al guardar: ${res.error}`, 'error');
    }
  };

  const handleDesactivarFinca = () => {
    if (selectedFincaId === 'new') return;
    const esActivo = activo;
    openConfirm(
      esActivo ? `¿Desactivar "${nombre}"?` : `¿Reactivar "${nombre}"?`,
      esActivo
        ? 'La finca dejará de estar visible en el catálogo de clientes, pero se conservará en el sistema.'
        : 'La finca volverá a estar disponible en el catálogo público de clientes.',
      async () => {
        const res = esActivo ? await desactivarFinca(selectedFincaId) : await reactivarFinca(selectedFincaId);
        if (res.success) {
          showToast(esActivo ? 'Finca desactivada exitosamente' : 'Finca reactivada exitosamente', 'success');
          setActivo(!esActivo);
        } else {
          showToast(`Error: ${res.error}`, 'error');
        }
      }
    );
  };

  const handleEliminarDefinitivo = () => {
    if (selectedFincaId === 'new') return;
    openConfirm(
      `¿ELIMINAR DEFINITIVAMENTE "${nombre}"?`,
      '⚠️ Esta acción borrará la finca, sus imágenes y su disponibilidad permanentemente de la base de datos.',
      async () => {
        const res = await eliminarFinca(selectedFincaId);
        if (res.success) {
          showToast('Finca eliminada definitivamente de la base de datos ✅', 'success');
          setSelectedFincaId('new');
        } else {
          showToast(`Error al eliminar: ${res.error}`, 'error');
        }
      }
    );
  };

  // Datos para resumen de la finca seleccionada en la cabecera
  const fotoPortadaActual = imagenes[0] || (fincaActual?.finca_imagenes?.[0]?.url) || '';

  return (
    <div className="panel" style={{ padding: '1.25rem' }}>
      {/* ============================================================== */}
      {/* 1. CABECERA: TÍTULO, SELECTOR CONTRAÍDO Y BOTÓN NUEVA FINCA */}
      {/* ============================================================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--text-lg)' }}>
              <Home size={20} style={{ color: 'var(--primary)' }} />
              Gestionador Profesional de Fincas
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
              Administra detalles, capacidad, tarifas, amenidades, normas y fotografías
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {selectedFincaId !== 'new' && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => previsualizarFinca(selectedFincaId)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface-2)' }}
                title="Ver cómo lo ve el cliente en el catálogo y cotizador"
              >
                <Eye size={14} /> Ver en cliente
              </button>
            )}

            {/* BOTÓN INDEPENDIENTE PARA NUEVA FINCA */}
            <button
              type="button"
              className={`btn btn-sm ${selectedFincaId === 'new' ? 'btn-primary' : ''}`}
              onClick={() => {
                setSelectedFincaId('new');
                setListaDesplegada(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 700,
                border: selectedFincaId === 'new' ? 'none' : '1px solid var(--primary)',
                color: selectedFincaId === 'new' ? '#fff' : 'var(--primary)',
              }}
            >
              <Plus size={15} /> + Nueva finca
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* BARRA CONTRAÍDA PREDETERMINADA CON SELECTOR Y ESTADO */}
        {/* ============================================================== */}
        <div
          style={{
            background: 'var(--surface-sunken, var(--surface-2))',
            border: '1px solid var(--border)',
            borderRadius: 'var(--rad-sm, 14px)',
            padding: '0.65rem 0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Tarjeta compacta de la finca actualmente activa */}
          <div
            onClick={() => setListaDesplegada(!listaDesplegada)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              flex: 1,
              minWidth: '240px',
              userSelect: 'none',
            }}
            title="Haz clic para desplegar o contraer todas las fincas"
          >
            {fotoPortadaActual ? (
              <img
                src={fotoPortadaActual}
                alt="Portada"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--rad-xs, 8px)',
                  objectFit: 'cover',
                  border: '1px solid var(--border)',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--rad-xs, 8px)',
                  background: 'var(--surface-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                <Home size={18} />
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                  {selectedFincaId === 'new' ? '✨ Creando Nueva Finca' : nombre || 'Finca sin nombre'}
                </span>

                {selectedFincaId !== 'new' && (
                  <>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        color: activo ? 'var(--success)' : '#ef4444',
                        background: activo ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'rgba(239,68,68,0.1)',
                      }}
                    >
                      {activo ? 'Activa ✓' : 'Inactiva 🚫'}
                    </span>
                    <span className="status-badge s-avail" style={{ fontSize: '0.68rem', padding: '0.12rem 0.45rem' }}>
                      {estado}
                    </span>
                  </>
                )}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                <span><Users size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> {capacidad} personas</span>
                <span>•</span>
                <span>${(precio || 0).toLocaleString('es-CO')} /pp</span>
                <span>•</span>
                <span><ImageIcon size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> {imagenes.length} fotos</span>
              </div>
            </div>
          </div>

          {/* Botón de despliegue de lista */}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setListaDesplegada(!listaDesplegada)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: listaDesplegada ? 'var(--primary-bg)' : 'var(--surface-3)',
              color: listaDesplegada ? 'var(--primary)' : 'var(--text)',
              borderColor: listaDesplegada ? 'var(--primary)' : 'transparent',
              fontWeight: 600,
              padding: '0.45rem 0.85rem',
            }}
          >
            <span>{listaDesplegada ? 'Ocultar listado' : `Ver listado completo (${fincas.length} fincas)`}</span>
            {listaDesplegada ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        {/* ============================================================== */}
        {/* LISTA DESPLEGABLE DE TODAS LAS FINCAS CREADAS */}
        {/* ============================================================== */}
        {listaDesplegada && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--rad-sm, 14px)',
              padding: '1rem',
              boxShadow: 'var(--sh-md)',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>
                Selecciona una finca para editar sus campos:
              </div>

              {/* Buscador en la lista */}
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar finca…"
                  value={busquedaFinca}
                  onChange={e => setBusquedaFinca(e.target.value)}
                  style={{
                    paddingLeft: '1.85rem',
                    paddingRight: '0.5rem',
                    paddingTop: '0.35rem',
                    paddingBottom: '0.35rem',
                    fontSize: '0.8rem',
                    borderRadius: 'var(--rad-xs, 8px)',
                    height: '32px',
                  }}
                />
              </div>
            </div>

            {/* Grid de tarjetas de fincas */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '0.65rem',
                maxHeight: '320px',
                overflowY: 'auto',
                paddingRight: '0.25rem',
              }}
            >
              {/* Opción rápida: Nueva Finca */}
              <div
                onClick={() => {
                  setSelectedFincaId('new');
                  setListaDesplegada(false);
                }}
                style={{
                  border: selectedFincaId === 'new' ? '2px solid var(--primary)' : '1px dashed var(--border)',
                  borderRadius: 'var(--rad-xs, 8px)',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  cursor: 'pointer',
                  background: selectedFincaId === 'new' ? 'var(--primary-bg)' : 'var(--surface-2)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--rad-xs, 8px)',
                    background: 'var(--primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Plus size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>+ Nueva Finca</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Crear propiedad desde cero</div>
                </div>
              </div>

              {/* Lista de fincas registradas */}
              {fincasFiltradas.map(f => {
                const isSelected = f.id === selectedFincaId;
                const thumb = f.finca_imagenes?.[0]?.url;
                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      setSelectedFincaId(f.id);
                      setListaDesplegada(false);
                    }}
                    style={{
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 'var(--rad-xs, 8px)',
                      padding: '0.6rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--primary-bg)' : 'var(--surface-2)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={f.nombre}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: 'var(--rad-xs, 6px)',
                          objectFit: 'cover',
                          border: '1px solid var(--border)',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: 'var(--rad-xs, 6px)',
                          background: 'var(--surface-3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                          flexShrink: 0,
                        }}
                      >
                        <Home size={16} />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.3rem' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            color: 'var(--text)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {f.nombre}
                        </span>
                        {f.activo === false && (
                          <span style={{ fontSize: '0.62rem', color: '#ef4444', fontWeight: 700 }}>Inactiva</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.45rem', marginTop: '0.1rem' }}>
                        <span>Hasta {f.capacidad} pers.</span>
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

      {/* ============================================================== */}
      {/* 2. PESTAÑAS DEL FORMULARIO ORGANIZADAS POR SECCIÓN */}
      {/* ============================================================== */}
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          borderBottom: '1px solid var(--border)',
          marginBottom: '1.25rem',
          overflowX: 'auto',
          paddingBottom: '0.35rem',
        }}
      >
        {[
          { id: 'general', label: '1. General y Ubicación', icon: <MapPin size={14} /> },
          { id: 'acomodacion', label: '2. Capacidad y Distribución', icon: <Bed size={14} /> },
          { id: 'tarifas', label: '3. Tarifas y Precios', icon: <Sparkles size={14} /> },
          { id: 'amenidades', label: '4. Comodidades y Servicios', icon: <Check size={14} />, badge: amenidades.length },
          { id: 'politicas', label: '5. Políticas y Horarios', icon: <Clock size={14} /> },
          { id: 'fotos', label: '6. Galería WebP', icon: <ImageIcon size={14} />, badge: imagenes.length },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabId)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 0.95rem',
                border: 'none',
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-muted)',
                borderRadius: 'var(--rad-xs, 8px)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.84rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '999px',
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--surface-3)',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 3. CONTENIDO DE LAS PESTAÑAS */}
      {/* ============================================================== */}

      {/* TAB 1: GENERAL Y UBICACIÓN */}
      {activeTab === 'general' && (
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div className="field col-span-full">
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Nombre comercial de la finca campestre *</span>
              <span className="text-xs text-muted">Aparece en catálogo y cotizaciones</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Finca Campestre El Edén de las Mercedes"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              style={{ fontSize: '1rem', fontWeight: 600 }}
            />
          </div>

          {/* Toggle Activa / Inactiva */}
          <div
            className="field col-span-full"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface-sunken)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--rad-xs, 8px)',
              border: '1px solid var(--border)',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', margin: 0, userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={activo}
                onChange={e => setActivo(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                  Finca visible y activa en el catálogo público
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Si se desactiva, los clientes no podrán cotizarla ni verla en la web principal
                </div>
              </div>
            </label>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                color: activo ? 'var(--success)' : '#ef4444',
                background: activo ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'rgba(239,68,68,0.1)',
              }}
            >
              {activo ? 'Activa ✓' : 'Inactiva 🚫'}
            </span>
          </div>

          <div className="field">
            <label>Zona / Ubicación (Municipio, Vereda)</label>
            <input
              type="text"
              placeholder="Ej: Santa Elena, El Cerrito, Valle del Cauca"
              value={zona}
              onChange={e => setZona(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Estado operativo inicial</label>
            <select value={estado} onChange={e => setEstado(e.target.value as FincaEstado)}>
              <option value="disponible">🟢 Disponible para reservas</option>
              <option value="alta_demanda">🟠 Alta demanda / Temporada</option>
              <option value="fin_de_semana">🔵 Fines de semana exclusivamente</option>
              <option value="no_disponible">🔴 En mantenimiento / No disponible</option>
            </select>
          </div>

          <div className="field col-span-full">
            <label>Número de WhatsApp específico (opcional)</label>
            <input
              type="text"
              placeholder="573176827093"
              value={waNumber}
              onChange={e => setWaNumber(e.target.value)}
            />
            <span className="text-xs text-muted" style={{ marginTop: '0.25rem', display: 'block' }}>
              Si lo dejas en blanco, usará el número central configurado en el sistema
            </span>
          </div>

          <div className="field col-span-full">
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Descripción detallada de la propiedad</span>
              <span className="text-xs text-muted">{descripcion.length} caracteres</span>
            </label>
            <textarea
              rows={4}
              placeholder="Describe el ambiente, la vista, privacidad, zonas verdes, si el clima es cálido o templado, y las características que enamoran a los huéspedes…"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
            />
          </div>

          <div className="field col-span-full">
            <label>Indicaciones de llegada o referencias de acceso (interno / confirmación)</label>
            <textarea
              rows={2}
              placeholder="Ej: A 5 minutos del parque de Santa Elena, entrada por el callejón de los guaduales, portón blanco número 12."
              value={indicacionesLlegada}
              onChange={e => setIndicacionesLlegada(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* TAB 2: CAPACIDAD Y DISTRIBUCIÓN (NUMERIC INPUTS FLUIDOS) */}
      {activeTab === 'acomodacion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              background: 'var(--surface-sunken)',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--rad-xs, 8px)',
              border: '1px solid var(--border)',
              fontSize: '0.84rem',
              color: 'var(--text-muted)',
            }}
          >
            💡 <strong>Edición rápida sin trabas:</strong> Puedes hacer clic en los campos, borrar libremente con Backspace o escribir directamente el número deseado, o usar los controles (+ / -).
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={14} style={{ color: 'var(--primary)' }} />
                <span>Capacidad máxima (personas) *</span>
              </label>
              <NumericInput
                value={capacidad}
                onChange={val => setCapacidad(val)}
                min={1}
                max={250}
                suffix="personas"
                placeholder="10"
              />
              <span className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                Límite de huéspedes permitido en cotizaciones
              </span>
            </div>

            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Bed size={14} style={{ color: 'var(--primary)' }} />
                <span>Número de habitaciones</span>
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

            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Bed size={14} style={{ color: 'var(--primary)' }} />
                <span>Total de camas disponibles</span>
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

            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Bath size={14} style={{ color: 'var(--primary)' }} />
                <span>Número de baños</span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <div className="field">
              <label>Precio por persona / noche (COP) *</label>
              <CurrencyInput
                value={precio}
                onChange={val => setPrecio(val)}
                placeholder="85.000"
              />
              <span className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                Tarifa base para el cotizador público por persona
              </span>
            </div>

            <div className="field">
              <label>Precio alquiler finca completa por noche (COP)</label>
              <CurrencyInput
                value={precioFincaCompleta}
                onChange={val => setPrecioFincaCompleta(val)}
                placeholder="0"
              />
              <span className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                Opcional. Alquiler exclusivo sin importar cantidad de personas
              </span>
            </div>

            <div className="field">
              <label>Depósito de garantía reembolsable (COP)</label>
              <CurrencyInput
                value={depositoGarantia}
                onChange={val => setDepositoGarantia(val)}
                placeholder="0"
              />
              <span className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                Garantía reembolsable para cubrir posibles daños o normas
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AMENIDADES Y SERVICIOS */}
      {activeTab === 'amenidades' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              Comodidades activas para esta finca ({amenidades.length}):
            </div>
            <div className="text-xs text-muted" style={{ marginBottom: '0.75rem' }}>
              Haz clic en cualquiera de las comodidades sugeridas para activarla o desactivarla, o añade tus propias comodidades personalizadas.
            </div>

            {/* Chips de amenidades sugeridas */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {AMENIDADES_SUGERIDAS.map(sug => {
                const seleccionada = amenidades.some(a => a.nombre.toLowerCase() === sug.nombre.toLowerCase());
                return (
                  <button
                    key={sug.nombre}
                    type="button"
                    onClick={() => toggleAmenidadSugerida(sug)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '999px',
                      border: seleccionada ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: seleccionada ? 'var(--primary-bg)' : 'var(--surface-2)',
                      color: seleccionada ? 'var(--primary)' : 'var(--text)',
                      fontWeight: seleccionada ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{sug.emoji}</span>
                    <span>{sug.nombre}</span>
                    {seleccionada && <Check size={13} style={{ strokeWidth: 3 }} />}
                  </button>
                );
              })}
            </div>

            {/* Agregar amenidad personalizada */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                maxWidth: '460px',
              }}
            >
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
              />
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleAgregarAmenidadPersonalizada}
                style={{ flexShrink: 0 }}
              >
                <Plus size={14} /> Añadir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: POLÍTICAS, HORARIOS Y NORMAS */}
      {activeTab === 'politicas' && (
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={14} style={{ color: 'var(--primary)' }} />
              <span>Hora de Check-in (Entrada)</span>
            </label>
            <input
              type="text"
              placeholder="15:00 o 3:00 PM"
              value={checkinHora}
              onChange={e => setCheckinHora(e.target.value)}
            />
          </div>

          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={14} style={{ color: 'var(--primary)' }} />
              <span>Hora de Check-out (Salida)</span>
            </label>
            <input
              type="text"
              placeholder="13:00 o 1:00 PM"
              value={checkoutHora}
              onChange={e => setCheckoutHora(e.target.value)}
            />
          </div>

          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Dog size={14} style={{ color: 'var(--primary)' }} />
              <span>Política de mascotas (Pet-friendly)</span>
            </label>
            <select value={politicaMascotas} onChange={e => setPoliticaMascotas(e.target.value)}>
              <option value="permitido">🐶 Mascotas bienvenidas sin costo</option>
              <option value="consulta_previa">🐾 Permitido con consulta previa / razas pequeñas</option>
              <option value="no_permitido">🚫 No se permiten mascotas</option>
            </select>
          </div>

          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Volume2 size={14} style={{ color: 'var(--primary)' }} />
              <span>Política de música y sonido</span>
            </label>
            <select value={politicaMusica} onChange={e => setPoliticaMusica(e.target.value)}>
              <option value="moderada">🎵 Música moderada (respetando la tranquilidad campestre)</option>
              <option value="hasta_medianoche">🔊 Música permitida hasta las 12:00 AM (medianoche)</option>
              <option value="sin_restriccion">🎉 Eventos y música libre en horario acordado</option>
              <option value="no_permitida">🤫 Finca de descanso / Prohibido sonido alto</option>
            </select>
          </div>

          <div className="field col-span-full">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldAlert size={14} style={{ color: 'var(--primary)' }} />
              <span>Normas de convivencia y condiciones de alquiler</span>
            </label>
            <textarea
              rows={3}
              placeholder="Ej: Uso de traje de baño obligatorio en piscina. Apagar luces exteriores al dormir. Prohibido fumar dentro de las habitaciones."
              value={normas}
              onChange={e => setNormas(e.target.value)}
            />
          </div>

          {/* Planes de alimentación */}
          <div className="field col-span-full">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={14} style={{ color: 'var(--primary)' }} />
              <span>Planes de estadía y alimentación disponibles:</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.35rem', marginBottom: '0.75rem' }}>
              {PLANES_SUGERIDOS.map(plan => {
                const activoPlan = planesSeleccionados.includes(plan);
                return (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => togglePlan(plan)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--rad-xs, 6px)',
                      border: activoPlan ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: activoPlan ? 'var(--primary-bg)' : 'var(--surface-2)',
                      color: activoPlan ? 'var(--primary)' : 'var(--text-muted)',
                      fontWeight: activoPlan ? 700 : 500,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{plan}</span>
                    {activoPlan && <Check size={12} />}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px' }}>
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
              />
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleAgregarPlanPersonalizado}
                style={{ flexShrink: 0 }}
              >
                <Plus size={13} /> Añadir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: FOTOGRAFÍAS Y GALERÍA WEBP */}
      {activeTab === 'fotos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="sec-header" style={{ marginBottom: '0.25rem' }}>
            <div>
              <div className="sec-title" style={{ fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ImageIcon size={16} /> Fotografías de la finca ({imagenes.length}/20)
              </div>
              <div className="text-xs text-muted">
                La primera foto es la imagen de portada. Puedes reordenar haciendo clic en "Fijar portada".
              </div>
            </div>

            <div className="img-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <label className="btn btn-sm btn-primary" style={{ cursor: 'pointer' }}>
                <Upload size={13} /> Subir fotos optimizadas
                <input
                  type="file"
                  multiple
                  accept="image/*,image/heic,image/heif,.heic,.heif"
                  style={{ display: 'none' }}
                  onChange={handleSubirImagenes}
                />
              </label>
              <button className="btn btn-sm" onClick={handleAgregarUrl}>
                <LinkIcon size={13} /> Añadir URL
              </button>
              {selectedThumbs.size > 0 && (
                <button className="btn btn-sm btn-danger" onClick={handleEliminarSeleccionadas}>
                  <Trash2 size={13} /> Eliminar ({selectedThumbs.size})
                </button>
              )}
            </div>
          </div>

          <label className="upload-area" style={{ cursor: 'pointer' }}>
            <input
              type="file"
              multiple
              accept="image/*,image/heic,image/heif,.heic,.heif"
              style={{ display: 'none' }}
              onChange={handleSubirImagenes}
            />
            <Upload size={24} style={{ color: 'var(--text-faint)', marginBottom: '0.35rem' }} />
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Arrastra imágenes aquí o <span style={{ color: 'var(--primary)', fontWeight: 600 }}>haz clic para seleccionar</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '0.25rem' }}>
              Conversión automática a formato WebP ligero · Compatible con iPhone HEIC, JPG y PNG
            </div>
          </label>

          {uploading && (
            <div className="upload-progress">
              <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
              <span>{uploadLabel}</span>
            </div>
          )}

          {imagenes.length > 0 && (
            <div className="img-grid" style={{ marginTop: '0.5rem' }}>
              {imagenes.map((url, idx) => {
                const isSelected = selectedThumbs.has(idx);
                const esPrincipal = idx === 0;
                return (
                  <div
                    key={idx}
                    className={`img-thumb ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleThumbSelection(idx)}
                    title={esPrincipal ? 'Foto de portada principal' : 'Clic para seleccionar'}
                    style={{ position: 'relative' }}
                  >
                    <img src={url} alt={`Imagen ${idx + 1}`} />
                    <div className="img-order">
                      {esPrincipal ? '★ Portada' : idx + 1}
                    </div>

                    {!esPrincipal && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleMarcarComoPrincipal(idx);
                        }}
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          right: '6px',
                          fontSize: '10px',
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          cursor: 'pointer',
                        }}
                        title="Mover esta imagen a la primera posición como foto de portada"
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

      {/* ============================================================== */}
      {/* 4. BARRA FIJA DE ACCIONES: GUARDAR, VER EN CLIENTE, ELIMINAR */}
      {/* ============================================================== */}
      <div
        className="form-actions"
        style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGuardar}
            disabled={guardando}
            style={{ fontWeight: 700, padding: '0.65rem 1.35rem' }}
          >
            {guardando ? (
              <>
                <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Guardando…
              </>
            ) : (
              <>
                <Save size={16} /> Guardar Finca en Supabase
              </>
            )}
          </button>

          {selectedFincaId !== 'new' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDesactivarFinca}
              title={activo ? 'Ocultar finca del catálogo público' : 'Mostrar finca en el catálogo público'}
            >
              {activo ? 'Desactivar finca' : 'Reactivar finca'}
            </button>
          )}
        </div>

        {selectedFincaId !== 'new' && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleEliminarDefinitivo}
            title="Borrar permanentemente de la base de datos"
            style={{ fontSize: '0.85rem' }}
          >
            <Trash2 size={14} /> Eliminar definitivamente
          </button>
        )}
      </div>
    </div>
  );
};
