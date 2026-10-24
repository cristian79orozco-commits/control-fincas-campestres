import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Finca, FincaEstado } from '../types';
import { supabase, DEFAULT_WA_NUMBER } from '../services/supabase';
import { optimizarImagen, formatearBytes } from '../utils/imageOptimizer';
import { useApp } from '../context/AppContext';

export type FincaFormTabId = 'general' | 'acomodacion' | 'tarifas' | 'bancario' | 'amenidades' | 'politicas' | 'fotos';

export interface UseFincaFormControllerParams {
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

export const AMENIDADES_SUGERIDAS: { nombre: string; icono: string; emoji: string }[] = [
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

export const PLANES_SUGERIDOS = [
  'Sin alimentación',
  'Desayuno incluido',
  'Media pensión',
  'Alimentación completa (3 comidas)',
  'Todo incluido campestre',
];

export function useFincaFormController({
  fincas = [],
  onSave,
  showToast,
  openConfirm,
}: UseFincaFormControllerParams) {
  const { previsualizarFinca, fincaParaEditarId, setFincaParaEditarId, eliminarFinca, desactivarFinca, reactivarFinca } = useApp();

  // Selección de finca
  const [selectedFincaId, setSelectedFincaId] = useState<string>(() => (fincas.length > 0 ? fincas[0].id : 'new'));
  const [listaDesplegada, setListaDesplegada] = useState<boolean>(false);
  const [busquedaFinca, setBusquedaFinca] = useState<string>('');
  const [activeTab, setActiveTab] = useState<FincaFormTabId>('general');
  const [guardando, setGuardando] = useState<boolean>(false);

  // Control estricto de no-reversión: evitar que cargas asíncronas cancelen la acción "Nueva finca"
  const hasInitializedSelectionRef = useRef(fincas.length > 0);
  const lastLoadedFincaIdRef = useRef<string | null>(null);

  // Campos del formulario
  const [nombre, setNombre] = useState('');
  const [zona, setZona] = useState('Santa Elena, Valle');
  const [capacidad, setCapacidad] = useState<number>(10);
  const [capacidadMinima, setCapacidadMinima] = useState<number>(1);
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
  const [valorMascota, setValorMascota] = useState<number>(0);
  const [politicaMusica, setPoliticaMusica] = useState('moderada');
  const [normas, setNormas] = useState('Cuidar las instalaciones y la naturaleza. Respetar horarios de silencio. Dejar la finca en las condiciones recibidas.');
  const [waNumber, setWaNumber] = useState(DEFAULT_WA_NUMBER);

  // Datos bancarios
  const [bancoNombre, setBancoNombre] = useState('Bancolombia');
  const [bancoTipoCuenta, setBancoTipoCuenta] = useState('Ahorros');
  const [bancoCuenta, setBancoCuenta] = useState('');
  const [bancoTitular, setBancoTitular] = useState('');
  const [bancoIdentificacion, setBancoIdentificacion] = useState('');
  const [copiadoCuenta, setCopiadoCuenta] = useState(false);

  // Amenidades y Planes
  const [amenidades, setAmenidades] = useState<{ nombre: string; icono?: string }[]>([
    { nombre: 'Piscina privada', icono: 'waves' },
    { nombre: 'Zona BBQ / Asador campestre', icono: 'flame' },
    { nombre: 'Wi-Fi de alta velocidad', icono: 'wifi' },
    { nombre: 'Parqueadero privado', icono: 'car' },
    { nombre: 'Amplias zonas verdes', icono: 'trees' },
    { nombre: 'Cocina dotada con electrodomésticos', icono: 'utensils' },
  ]);
  const [nuevaAmenidadTexto, setNuevaAmenidadTexto] = useState('');
  const [planesSeleccionados, setPlanesSeleccionados] = useState<string[]>([
    'Sin alimentación',
    'Desayuno incluido',
    'Todo incluido campestre',
  ]);
  const [nuevoPlanTexto, setNuevoPlanTexto] = useState('');

  // Galería de imágenes
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [selectedThumbs, setSelectedThumbs] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('');

  // Sincronización inicial única cuando fincas cargan por primera vez desde Supabase
  useEffect(() => {
    if (!hasInitializedSelectionRef.current && fincas.length > 0) {
      hasInitializedSelectionRef.current = true;
      if (selectedFincaId === 'new') {
        setSelectedFincaId(fincas[0].id);
      }
    }
  }, [fincas, selectedFincaId]);

  // Si se solicita editar una finca específica desde el panel cliente o barra flotante
  useEffect(() => {
    if (fincaParaEditarId) {
      lastLoadedFincaIdRef.current = null;
      setSelectedFincaId(fincaParaEditarId);
      setListaDesplegada(false);
      setFincaParaEditarId(null);
    }
  }, [fincaParaEditarId, setFincaParaEditarId]);

  // Finca seleccionada actualmente en el modelo
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

  // Cargar datos al cambiar de finca seleccionada o resetear al crear nueva
  useEffect(() => {
    if (lastLoadedFincaIdRef.current === selectedFincaId) return;
    lastLoadedFincaIdRef.current = selectedFincaId;

    if (selectedFincaId === 'new') {
      setNombre('');
      setZona('Santa Elena, Valle');
      setCapacidad(10);
      setCapacidadMinima(1);
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
      setValorMascota(0);
      setPoliticaMusica('moderada');
      setNormas('Cuidar las instalaciones y la naturaleza. Respetar horarios de silencio. Dejar la finca en las condiciones recibidas.');
      setWaNumber(DEFAULT_WA_NUMBER);
      setBancoNombre('Bancolombia');
      setBancoTipoCuenta('Ahorros');
      setBancoCuenta('');
      setBancoTitular('');
      setBancoIdentificacion('');
      setCopiadoCuenta(false);
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
        setCapacidadMinima(f.capacidad_minima || 1);
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
        setValorMascota(Number(f.valor_mascota) || 0);
        setPoliticaMusica(f.politica_musica || 'moderada');
        setNormas(f.normas || '');
        setWaNumber(f.whatsapp || DEFAULT_WA_NUMBER);
        setBancoNombre(f.banco_nombre || 'Bancolombia');
        setBancoTipoCuenta(f.banco_tipo_cuenta || 'Ahorros');
        setBancoCuenta(f.banco_cuenta || '');
        setBancoTitular(f.banco_titular || '');
        setBancoIdentificacion(f.banco_identificacion || '');
        setCopiadoCuenta(false);

        if (f.finca_amenidades && f.finca_amenidades.length > 0) {
          setAmenidades(f.finca_amenidades.map(a => ({ nombre: a.nombre, icono: a.icono || 'check' })));
        } else {
          setAmenidades([
            { nombre: 'Piscina privada', icono: 'waves' },
            { nombre: 'Zona BBQ / Asador campestre', icono: 'flame' },
            { nombre: 'Wi-Fi de alta velocidad', icono: 'wifi' },
          ]);
        }

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

  // Selección manual de una finca existente
  const handleSelectFinca = useCallback((id: string) => {
    lastLoadedFincaIdRef.current = null;
    setSelectedFincaId(id);
    setListaDesplegada(false);
  }, []);

  // Creación de nueva finca (resetea formulario y previene rebotes)
  const handleNuevaFinca = useCallback(() => {
    lastLoadedFincaIdRef.current = null;
    setSelectedFincaId('new');
    setListaDesplegada(false);
    setActiveTab('general');
  }, []);

  // Acciones de amenidades
  const toggleAmenidadSugerida = useCallback((sugerida: { nombre: string; icono: string }) => {
    setAmenidades(prev => {
      const yaExiste = prev.some(a => a.nombre.toLowerCase() === sugerida.nombre.toLowerCase());
      if (yaExiste) {
        return prev.filter(a => a.nombre.toLowerCase() !== sugerida.nombre.toLowerCase());
      } else {
        return [...prev, { nombre: sugerida.nombre, icono: sugerida.icono }];
      }
    });
  }, []);

  const handleAgregarAmenidadPersonalizada = useCallback(() => {
    const texto = nuevaAmenidadTexto.trim();
    if (!texto) return;
    if (amenidades.some(a => a.nombre.toLowerCase() === texto.toLowerCase())) {
      showToast('Esta comodidad ya está en la lista', 'info');
      return;
    }
    setAmenidades(prev => [...prev, { nombre: texto, icono: 'check' }]);
    setNuevaAmenidadTexto('');
  }, [nuevaAmenidadTexto, amenidades, showToast]);

  const handleEliminarAmenidad = useCallback((index: number) => {
    setAmenidades(prev => prev.filter((_, idx) => idx !== index));
  }, []);

  // Acciones de planes de estadía
  const togglePlan = useCallback((plan: string) => {
    setPlanesSeleccionados(prev => {
      if (prev.includes(plan)) {
        return prev.filter(p => p !== plan);
      } else {
        return [...prev, plan];
      }
    });
  }, []);

  const handleAgregarPlanPersonalizado = useCallback(() => {
    const texto = nuevoPlanTexto.trim();
    if (!texto) return;
    if (planesSeleccionados.includes(texto)) {
      showToast('Este plan ya está en la lista', 'info');
      return;
    }
    setPlanesSeleccionados(prev => [...prev, texto]);
    setNuevoPlanTexto('');
  }, [nuevoPlanTexto, planesSeleccionados, showToast]);

  // Subida y compresión WebP de imágenes
  const handleSubirImagenes = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const available = 20 - imagenes.length;
    if (available <= 0) {
      showToast('Límite alcanzado: máximo 20 imágenes por finca.', 'error');
      return;
    }

    const toUpload = files.slice(0, available);
    if (files.length > available) {
      showToast(`Se procesarán ${available} imágenes (límite: 20)`, 'info');
    }

    setUploading(true);
    let subidasOk = 0;
    let totalBytesOriginales = 0;
    let totalBytesOptimizados = 0;
    const nuevasUrls: string[] = [];

    for (let i = 0; i < toUpload.length; i++) {
      const rawFile = toUpload[i];
      setUploadLabel(`Optimizando imagen ${i + 1} de ${toUpload.length}: ${rawFile.name}…`);

      try {
        const opt = await optimizarImagen(rawFile);
        const fileToUpload = opt.file;
        totalBytesOriginales += opt.originalSize;
        totalBytesOptimizados += opt.optimizedSize;

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
      } catch (err: any) {
        console.error('Error procesando imagen:', err);
        showToast(`Error al procesar ${rawFile.name}`, 'error');
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
  }, [imagenes.length, showToast]);

  const handleAgregarUrl = useCallback(() => {
    const url = prompt('Ingresa la URL pública de la imagen (debe comenzar con http):');
    if (!url || !url.startsWith('http')) return;
    setImagenes(prev => [...prev, url]);
    showToast('Imagen añadida a la galería', 'info');
  }, [showToast]);

  const toggleThumbSelection = useCallback((index: number) => {
    setSelectedThumbs(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleMarcarComoPrincipal = useCallback((index: number) => {
    if (index === 0) return;
    setImagenes(prev => {
      const list = [...prev];
      const [item] = list.splice(index, 1);
      list.unshift(item);
      return list;
    });
    showToast('Imagen fijada como portada principal ⭐', 'success');
  }, [showToast]);

  const handleEliminarSeleccionadas = useCallback(() => {
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
  }, [selectedThumbs, openConfirm, showToast]);

  // Guardar finca completa
  const handleGuardar = useCallback(async () => {
    if (!nombre.trim()) {
      showToast('El nombre de la finca campestre es obligatorio', 'error');
      setActiveTab('general');
      return;
    }

    if (Number(capacidadMinima) > Number(capacidad)) {
      showToast('La capacidad mínima no puede ser mayor que la capacidad máxima', 'error');
      setActiveTab('acomodacion');
      return;
    }

    setGuardando(true);

    const payload: Partial<Finca> = {
      nombre: nombre.trim(),
      zona: zona.trim() || 'Santa Elena, Valle',
      capacidad: Number(capacidad) || 10,
      capacidad_minima: Math.max(1, Number(capacidadMinima) || 1),
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
      valor_mascota: politicaMascotas === 'con_costo' ? Number(valorMascota) || 0 : 0,
      politica_musica: politicaMusica,
      normas: normas.trim(),
      whatsapp: waNumber ? waNumber.replace(/[^0-9]/g, '') : null,
      banco_nombre: bancoNombre.trim() || null,
      banco_tipo_cuenta: bancoTipoCuenta || 'Ahorros',
      banco_cuenta: bancoCuenta.trim() || null,
      banco_titular: bancoTitular.trim() || null,
      banco_identificacion: bancoIdentificacion.trim() || null,
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
          : 'Finca actualizada con éxito ✅',
        'success'
      );
      if (res.id) {
        lastLoadedFincaIdRef.current = null;
        setSelectedFincaId(res.id);
      }
    } else {
      showToast(`Error al guardar: ${res.error || 'Revisa la conexión o permisos'}`, 'error');
    }
  }, [
    nombre, zona, capacidad, capacidadMinima, habitaciones, camas, banos,
    precio, precioFincaCompleta, depositoGarantia, estado, activo, descripcion,
    indicacionesLlegada, checkinHora, checkoutHora, politicaMascotas, valorMascota,
    politicaMusica, normas, waNumber, bancoNombre, bancoTipoCuenta, bancoCuenta,
    bancoTitular, bancoIdentificacion, selectedFincaId, planesSeleccionados,
    imagenes, amenidades, onSave, showToast
  ]);

  const handleDesactivarFinca = useCallback(() => {
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
  }, [selectedFincaId, activo, nombre, openConfirm, desactivarFinca, reactivarFinca, showToast]);

  const handleEliminarDefinitivo = useCallback(() => {
    if (selectedFincaId === 'new') return;
    openConfirm(
      `¿ELIMINAR DEFINITIVAMENTE "${nombre}"?`,
      '⚠️ Esta acción borrará la finca, sus imágenes y su disponibilidad permanentemente de la base de datos.',
      async () => {
        const res = await eliminarFinca(selectedFincaId);
        if (res.success) {
          showToast('Finca eliminada definitivamente de la base de datos ✅', 'success');
          lastLoadedFincaIdRef.current = null;
          setSelectedFincaId(fincas.length > 1 ? fincas.find(f => f.id !== selectedFincaId)?.id || 'new' : 'new');
        } else {
          showToast(`Error al eliminar: ${res.error}`, 'error');
        }
      }
    );
  }, [selectedFincaId, nombre, openConfirm, eliminarFinca, showToast, fincas]);

  const handleCopiarCuenta = useCallback(() => {
    if (!bancoCuenta) return;
    navigator.clipboard.writeText(bancoCuenta);
    setCopiadoCuenta(true);
    setTimeout(() => setCopiadoCuenta(false), 2000);
    showToast('Número de cuenta copiado al portapapeles 📋', 'success');
  }, [bancoCuenta, showToast]);

  const handleVerEnCliente = useCallback(() => {
    if (selectedFincaId === 'new') return;
    previsualizarFinca(selectedFincaId);
  }, [selectedFincaId, previsualizarFinca]);

  const toggleListaDesplegada = useCallback(() => {
    setListaDesplegada(prev => !prev);
  }, []);

  const fotoPortadaActual = imagenes[0] || (fincaActual?.finca_imagenes?.[0]?.url) || '';

  return {
    // Estado de selección y navegación
    selectedFincaId,
    setSelectedFincaId,
    isNew: selectedFincaId === 'new',
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

    // Campos formulario
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
    handleDesactivarFinca,
    handleEliminarDefinitivo,
    handleVerEnCliente,
  };
}
