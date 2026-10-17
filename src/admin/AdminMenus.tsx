import React, { useState } from 'react';
import {
  UtensilsCrossed, Plus, Edit3, Trash2, X, Save, Image as ImageIcon,
  Upload, FileText, CheckCircle, Eye, EyeOff, Search, DollarSign,
  Coffee, Flame, Sunset, Apple, Sparkles, Package, Download, UserCheck,
  CreditCard, Building, Copy, Check
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { generarPropuestaAlimentacion } from '../services/documentos';
import { optimizarImagen, formatearBytes } from '../utils/imageOptimizer';
import { obtenerFotoMenu } from '../utils/menuUtils';
import type { Menu, MenuCategoria, Cliente, Finca, ConfiguracionGeneral } from '../types';
import { CurrencyInput } from '../components/CurrencyInput';

interface AdminMenusProps {
  menus: Menu[];
  clientes: Cliente[];
  fincas: Finca[];
  configuracion?: ConfiguracionGeneral;
  onGuardarConfiguracion?: (datos: Partial<ConfiguracionGeneral>) => Promise<{ success: boolean; error?: string }>;
  onGuardar: (menuData: Partial<Menu>, imagenesUrls?: string[]) => Promise<{ success: boolean; id?: string; error?: string }>;
  onCambiarEstado: (id: string, activo: boolean) => Promise<{ success: boolean; error?: string }>;
  onEliminar: (id: string) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const CATEGORIAS: MenuCategoria[] = [
  'Desayuno',
  'Almuerzo',
  'Cena',
  'Parrilla',
  'Refrigerio',
  'Menú especial',
  'Paquetes',
];

const CATEGORIA_ICONS: Record<MenuCategoria, React.ReactNode> = {
  Desayuno: <Coffee size={14} />,
  Almuerzo: <UtensilsCrossed size={14} />,
  Cena: <Sunset size={14} />,
  Parrilla: <Flame size={14} />,
  Refrigerio: <Apple size={14} />,
  'Menú especial': <Sparkles size={14} />,
  Paquetes: <Package size={14} />,
};

const CATEGORIA_COLORS: Record<MenuCategoria, { bg: string; text: string }> = {
  Desayuno: { bg: 'rgba(234, 179, 8, 0.15)', text: '#b45309' },
  Almuerzo: { bg: 'rgba(34, 197, 94, 0.15)', text: '#15803d' },
  Cena: { bg: 'rgba(99, 102, 241, 0.15)', text: '#4338ca' },
  Parrilla: { bg: 'rgba(239, 68, 68, 0.15)', text: '#b91c1c' },
  Refrigerio: { bg: 'rgba(20, 184, 166, 0.15)', text: '#0f766e' },
  'Menú especial': { bg: 'rgba(168, 85, 247, 0.15)', text: '#7e22ce' },
  Paquetes: { bg: 'rgba(249, 115, 22, 0.15)', text: '#c2410c' },
};

const VACIO: Partial<Menu> = {
  nombre: '',
  descripcion: '',
  categoria: 'Almuerzo',
  precio_pp: 25000,
  condiciones: '',
  imagen_url: '',
  activo: true,
};

function formatCOP(v: number) {
  return '$' + (v || 0).toLocaleString('es-CO') + ' COP';
}

export const AdminMenus: React.FC<AdminMenusProps> = ({
  menus,
  clientes,
  fincas,
  configuracion,
  onGuardarConfiguracion,
  onGuardar,
  onCambiarEstado,
  onEliminar,
  showToast,
  openConfirm,
}) => {
  const [form, setForm] = useState<Partial<Menu>>(VACIO);
  const [imagenesUrls, setImagenesUrls] = useState<string[]>([]);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<MenuCategoria | 'todas'>('todas');
  const [busqueda, setBusqueda] = useState('');

  // Regla operativa de alimentación mínima
  const [reglaActiva, setReglaActiva] = useState(configuracion?.regla_alimentacion_activa ?? true);
  const [reglaMaxPersonas, setReglaMaxPersonas] = useState(configuracion?.regla_alimentacion_max_personas ?? 10);
  const [reglaMinServicios, setReglaMinServicios] = useState(configuracion?.regla_alimentacion_min_servicios ?? 2);
  const [reglaMensaje, setReglaMensaje] = useState(
    configuracion?.regla_alimentacion_mensaje ||
    'Para grupos de hasta 10 personas, como mínimo se debe contratar servicio de desayuno y almuerzo (mínimo 2 servicios de alimentación complementaria).'
  );
  const [guardandoRegla, setGuardandoRegla] = useState(false);
  const [reglaExpandida, setReglaExpandida] = useState(false);

  // Datos bancarios de la administración de Paraíso Terrenal para cobro de menús / alimentación
  const [bancoNombre, setBancoNombre] = useState(configuracion?.banco_nombre || 'Bancolombia');
  const [bancoTipoCuenta, setBancoTipoCuenta] = useState(configuracion?.banco_tipo_cuenta || 'Ahorros');
  const [bancoCuenta, setBancoCuenta] = useState(configuracion?.banco_cuenta || '');
  const [bancoTitular, setBancoTitular] = useState(configuracion?.banco_titular || 'Administración Paraíso Terrenal');
  const [bancoIdentificacion, setBancoIdentificacion] = useState((configuracion as any)?.banco_identificacion || configuracion?.nit || '');
  const [copiadoCuenta, setCopiadoCuenta] = useState(false);
  const [guardandoBanco, setGuardandoBanco] = useState(false);
  const [bancoExpandido, setBancoExpandido] = useState(Boolean(!configuracion?.banco_cuenta));

  // Sincronizar reactivamente si cambia la configuración global o desde Supabase
  React.useEffect(() => {
    if (configuracion) {
      if (configuracion.banco_nombre) setBancoNombre(configuracion.banco_nombre);
      if (configuracion.banco_tipo_cuenta) setBancoTipoCuenta(configuracion.banco_tipo_cuenta);
      if (configuracion.banco_cuenta !== undefined) setBancoCuenta(configuracion.banco_cuenta || '');
      if (configuracion.banco_titular) setBancoTitular(configuracion.banco_titular);
      const iden = (configuracion as any)?.banco_identificacion || configuracion?.nit;
      if (iden) setBancoIdentificacion(iden);
      if (configuracion.regla_alimentacion_activa !== undefined) setReglaActiva(configuracion.regla_alimentacion_activa);
      if (configuracion.regla_alimentacion_max_personas !== undefined) setReglaMaxPersonas(configuracion.regla_alimentacion_max_personas);
      if (configuracion.regla_alimentacion_min_servicios !== undefined) setReglaMinServicios(configuracion.regla_alimentacion_min_servicios);
      if (configuracion.regla_alimentacion_mensaje) setReglaMensaje(configuracion.regla_alimentacion_mensaje);
    }
  }, [configuracion]);

  const handleGuardarDatosBancarios = async () => {
    if (!onGuardarConfiguracion) {
      showToast('No se dispone de permisos para guardar configuración', 'error');
      return;
    }
    setGuardandoBanco(true);
    const res = await onGuardarConfiguracion({
      banco_nombre: bancoNombre.trim() || 'Bancolombia',
      banco_tipo_cuenta: bancoTipoCuenta || 'Ahorros',
      banco_cuenta: bancoCuenta.trim(),
      banco_titular: bancoTitular.trim() || 'Administración Paraíso Terrenal',
      banco_identificacion: bancoIdentificacion.trim(),
      nit: bancoIdentificacion.trim() || configuracion?.nit || '900.123.456-7',
    });
    setGuardandoBanco(false);
    if (res.success) {
      showToast('Datos bancarios de Paraíso Terrenal guardados y centralizados con éxito ✅', 'success');
    } else {
      showToast(res.error || 'Error al guardar los datos bancarios', 'error');
    }
  };

  const handleGuardarRegla = async () => {
    if (!onGuardarConfiguracion) {
      showToast('No se dispone de permisos para guardar configuración', 'error');
      return;
    }
    setGuardandoRegla(true);
    const res = await onGuardarConfiguracion({
      regla_alimentacion_activa: reglaActiva,
      regla_alimentacion_max_personas: reglaMaxPersonas,
      regla_alimentacion_min_servicios: reglaMinServicios,
      regla_alimentacion_mensaje: reglaMensaje,
    });
    setGuardandoRegla(false);
    if (res.success) {
      showToast('Regla de alimentación mínima guardada en Supabase ✅', 'success');
    } else {
      showToast(res.error || 'Error al guardar regla', 'error');
    }
  };

  // Modal de propuesta PDF
  const [modalPdfAbierto, setModalPdfAbierto] = useState(false);
  const [menuParaPdf, setMenuParaPdf] = useState<Menu | null>(null);
  const [pdfClienteId, setPdfClienteId] = useState('');
  const [pdfClienteNombreLibre, setPdfClienteNombreLibre] = useState('');
  const [pdfFincaId, setPdfFincaId] = useState('');
  const [pdfPersonas, setPdfPersonas] = useState(10);
  const [pdfServicios, setPdfServicios] = useState(1);
  const [pdfNotas, setPdfNotas] = useState('');
  const [generandoPdf, setGenerandoPdf] = useState(false);

  // Abrir modal de creación
  const abrirNuevo = () => {
    setForm(VACIO);
    setImagenesUrls([]);
    setEditando(true);
  };

  // Abrir modal de edición
  const abrirEdicion = (m: Menu) => {
    const hijas = (m.menu_imagenes || []).map(i => i.url).filter(Boolean);
    const portadaActual = m.imagen_url || hijas[0] || '';
    const lista = [...hijas];
    if (portadaActual && !lista.includes(portadaActual)) {
      lista.unshift(portadaActual);
    }

    setForm({
      ...m,
      imagen_url: portadaActual,
    });
    setImagenesUrls(lista);
    setEditando(true);
  };

  const cerrarModal = () => {
    setForm(VACIO);
    setImagenesUrls([]);
    setEditando(false);
  };

  // Subir imagen a Supabase Storage convertida a WebP
  const handleSubirImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setSubiendoImg(true);
    let subidasOk = 0;
    let totalOriginales = 0;
    let totalOptimizados = 0;
    const nuevas: string[] = [];

    for (const rawFile of files) {
      // Optimización automática y obligatoria a WebP en el navegador
      const opt = await optimizarImagen(rawFile, { format: 'image/webp' });
      const fileToUpload = opt.file;
      totalOriginales += opt.originalSize;
      totalOptimizados += opt.optimizedSize;

      const mimeType = 'image/webp';
      const path = `menus/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;

      const { error } = await supabase.storage
        .from('finca-imagenes')
        .upload(path, fileToUpload, { upsert: false, contentType: mimeType });

      if (error) {
        console.error('Error subiendo imagen de menú:', error);
        showToast(`Error subiendo ${rawFile.name}: ${error.message}`, 'error');
        continue;
      }

      const { data } = supabase.storage.from('finca-imagenes').getPublicUrl(path);
      if (data?.publicUrl) {
        nuevas.push(data.publicUrl);
        subidasOk++;
      }
    }

    setSubiendoImg(false);
    e.target.value = '';

    if (nuevas.length > 0) {
      setImagenesUrls(prev => [...prev, ...nuevas]);
      // Si la foto actual es vacía o es una plantilla de Unsplash, reemplazarla por la foto real subida
      setForm(prev => {
        const esUnsplash = prev.imagen_url && prev.imagen_url.includes('unsplash.com');
        if (!prev.imagen_url || esUnsplash) {
          return { ...prev, imagen_url: nuevas[0] };
        }
        return prev;
      });
      const ahorro = totalOriginales - totalOptimizados;
      const ahorroTxt = ahorro > 0 ? ` (ahorro de peso: ${formatearBytes(ahorro)})` : '';
      showToast(`${subidasOk} foto(s) convertida(s) a WebP y subida(s) ✅${ahorroTxt}`, 'success');
    }
  };

  // Asignar foto de portada / principal
  const handleSeleccionarPrincipal = (url: string) => {
    setForm(prev => ({ ...prev, imagen_url: url }));
    showToast('Foto asignada como portada del menú ★', 'info');
  };

  // Agregar URL manual
  const handleAgregarUrl = () => {
    const url = prompt('Ingresa la URL pública de la fotografía del menú:');
    if (!url || !url.startsWith('http')) return;
    setImagenesUrls(prev => [...prev, url]);
    if (!form.imagen_url || form.imagen_url.includes('unsplash.com')) {
      setForm(prev => ({ ...prev, imagen_url: url }));
    }
    showToast('Foto agregada a la lista', 'info');
  };

  // Eliminar imagen de la lista del formulario
  const handleEliminarImagen = (idx: number) => {
    setImagenesUrls(prev => {
      const removed = prev[idx];
      const updated = prev.filter((_, i) => i !== idx);
      if (form.imagen_url === removed) {
        setForm(f => ({ ...f, imagen_url: updated[0] || '' }));
      }
      return updated;
    });
  };

  // Guardar menú
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre?.trim()) {
      showToast('El nombre del menú es obligatorio', 'error');
      return;
    }
    if ((form.precio_pp || 0) < 0) {
      showToast('El precio por persona debe ser mayor o igual a 0', 'error');
      return;
    }

    // Determinar la foto de portada: si form.imagen_url está en imagenesUrls, usarla; si no, la primera de imagenesUrls
    const portadaFinal = imagenesUrls.length > 0
      ? (form.imagen_url && imagenesUrls.includes(form.imagen_url) ? form.imagen_url : imagenesUrls[0])
      : null;

    setGuardando(true);
    const res = await onGuardar({ ...form, imagen_url: portadaFinal }, imagenesUrls);
    setGuardando(false);

    if (res.success) {
      showToast(form.id ? 'Menú actualizado con éxito ✅' : 'Menú creado con éxito ✅', 'success');
      cerrarModal();
    } else {
      showToast(`Error al guardar: ${res.error}`, 'error');
    }
  };

  // Cambiar estado activo/inactivo
  const handleToggleActivo = async (menu: Menu) => {
    const nuevoEstado = !menu.activo;
    const res = await onCambiarEstado(menu.id, nuevoEstado);
    if (res.success) {
      showToast(`Menú ${nuevoEstado ? 'activado' : 'desactivado'}`, 'info');
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  };

  // Eliminar menú
  const handleEliminar = (menu: Menu) => {
    openConfirm(
      `¿Eliminar el menú "${menu.nombre}"?`,
      'Esta acción eliminará el menú y sus fotografías asociadas.',
      async () => {
        const res = await onEliminar(menu.id);
        if (res.success) {
          showToast('Menú eliminado correctamente', 'info');
        } else {
          showToast(`Error: ${res.error}`, 'error');
        }
      }
    );
  };

  // Abrir modal de propuesta PDF
  const abrirModalPdf = (m: Menu) => {
    setMenuParaPdf(m);
    setPdfClienteId(clientes[0]?.id || '');
    setPdfFincaId(fincas[0]?.id || '');
    setPdfPersonas(10);
    setPdfServicios(1);
    setPdfNotas('');
    setModalPdfAbierto(true);
  };

  // Generar y descargar propuesta PDF
  const handleDescargarPdf = async () => {
    if (!menuParaPdf) return;
    setGenerandoPdf(true);
    try {
      const cli = clientes.find(c => c.id === pdfClienteId) || (pdfClienteNombreLibre ? {
        id: 'tmp',
        nombre: pdfClienteNombreLibre,
        activo: true,
      } : null);

      const fin = fincas.find(f => f.id === pdfFincaId) || null;

      await generarPropuestaAlimentacion({
        menu: menuParaPdf,
        cliente: cli,
        finca: fin,
        personas: pdfPersonas,
        cantidadServicios: pdfServicios,
        notasEspeciales: pdfNotas,
      });

      showToast('Propuesta en PDF generada y descargada ✅', 'success');
      setModalPdfAbierto(false);
    } catch (e: any) {
      console.error('Error generando propuesta:', e);
      showToast('Error al generar PDF de alimentación', 'error');
    } finally {
      setGenerandoPdf(false);
    }
  };

  // Filtrado
  const menusFiltrados = menus.filter(m => {
    const matchCat = filtroCategoria === 'todas' || m.categoria === filtroCategoria;
    const q = busqueda.toLowerCase().trim();
    const matchBusqueda = !q ||
      m.nombre.toLowerCase().includes(q) ||
      (m.descripcion || '').toLowerCase().includes(q);
    return matchCat && matchBusqueda;
  });

  const menusActivos = menus.filter(m => m.activo).length;

  return (
    <div className="panel" style={{ display: 'grid', gap: '1.25rem' }}>
      {/* ===== HEADER ===== */}
      <div className="panel-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UtensilsCrossed size={20} style={{ color: 'var(--primary)' }} />
            <span>Módulo de Menús y Alimentación</span>
          </div>
          <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
            Gestión de menús, tarifas por comensal, condiciones gastronómicas y emisión de propuestas PDF.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={abrirNuevo}>
            <Plus size={15} /> Nuevo Menú
          </button>
        </div>
      </div>

      {/* ===== MÉTRICAS RÁPIDAS ===== */}
      <div className="admin-stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-val">{menus.length}</div>
          <div className="stat-lbl">Total menús</div>
        </div>
        <div className="stat-card">
          <div className="stat-val" style={{ color: 'var(--primary)' }}>{menusActivos}</div>
          <div className="stat-lbl">Menús activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-val" style={{ color: 'var(--success)' }}>{CATEGORIAS.length}</div>
          <div className="stat-lbl">Categorías</div>
        </div>
        <div className="stat-card">
          <div className="stat-val" style={{ color: 'var(--warning, #f59e0b)', fontSize: '1.15rem' }}>
            {menus.length ? formatCOP(Math.min(...menus.map(m => m.precio_pp || 0))) : '$0'}
          </div>
          <div className="stat-lbl">Tarifa desde</div>
        </div>
      </div>

      {/* ===== REGLA OPERATIVA DE ALIMENTACIÓN MÍNIMA ===== */}
      <div
        style={{
          background: 'var(--surface-sunken)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--rad-sm, 8px)',
          padding: '0.85rem 1rem',
          display: 'grid',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>⚖️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                Regla Operativa: Requisito Mínimo de Alimentación para Grupos Pequeños
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Garantiza la rentabilidad operativa exigiendo servicios mínimos (ej. desayuno y almuerzo) si el grupo es de pocas personas.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`status-badge ${reglaActiva ? 's-avail' : 's-busy'}`} style={{ fontSize: '0.72rem' }}>
              {reglaActiva ? 'Regla activa' : 'Desactivada'}
            </span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setReglaExpandida(v => !v)}
              style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem' }}
            >
              {reglaExpandida ? 'Ocultar ajuste ▴' : 'Configurar regla ▾'}
            </button>
          </div>
        </div>

        {reglaExpandida && (
          <div
            style={{
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'grid',
              gap: '0.75rem',
              animation: 'fadeIn 0.15s ease',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {/* Activar/Desactivar */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={reglaActiva}
                  onChange={e => setReglaActiva(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 600 }}>Activar requisito mínimo para grupos pequeños</span>
              </label>

              {/* Límite de personas */}
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  Aplica a grupos de hasta:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={reglaMaxPersonas}
                    onChange={e => setReglaMaxPersonas(Math.max(1, Number(e.target.value)))}
                    style={{ height: '32px', fontSize: '0.82rem', width: '80px' }}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>personas (ej: 10)</span>
                </div>
              </div>

              {/* Servicios mínimos */}
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  Mínimo de servicios requeridos:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={reglaMinServicios}
                    onChange={e => setReglaMinServicios(Math.max(1, Number(e.target.value)))}
                    style={{ height: '32px', fontSize: '0.82rem', width: '80px' }}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>servicios (ej: 2)</span>
                </div>
              </div>
            </div>

            {/* Mensaje personalizado */}
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                Mensaje explicativo visible para el cliente en el cotizador:
              </label>
              <textarea
                rows={2}
                value={reglaMensaje}
                onChange={e => setReglaMensaje(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.5rem', borderRadius: '4px' }}
              />
            </div>

            {/* Botón guardar regla */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleGuardarRegla}
                disabled={guardandoRegla}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Save size={13} /> {guardandoRegla ? 'Guardando regla...' : 'Guardar regla de servicio en Supabase'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== CUENTA BANCARIA PARA COBRO DE ALIMENTACIÓN (ADMINISTRACIÓN) ===== */}
      <div
        style={{
          background: 'var(--surface-sunken)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--rad-sm, 8px)',
          padding: '0.85rem 1rem',
          display: 'grid',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CreditCard size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <span>Cuenta Bancaria de Paraíso Terrenal (Cobro de Alimentación y Menús)</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background: 'color-mix(in srgb, #25d366 15%, transparent)',
                    color: '#16a34a',
                    fontWeight: 700,
                  }}
                >
                  Centralizado en WhatsApp
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                🔒 Esta cuenta se utiliza de forma exclusiva para cobrar los planes gastronómicos en Cotizaciones, Reservas y Comunicaciones.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`status-badge ${bancoCuenta ? 's-avail' : 's-busy'}`} style={{ fontSize: '0.72rem' }}>
              {bancoCuenta ? `${bancoNombre} (${bancoCuenta})` : 'Sin cuenta registrada'}
            </span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setBancoExpandido(v => !v)}
              style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem' }}
            >
              {bancoExpandido ? 'Ocultar cuenta ▴' : 'Configurar cuenta ▾'}
            </button>
          </div>
        </div>

        {bancoExpandido && (
          <div
            style={{
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'grid',
              gap: '0.75rem',
              animation: 'fadeIn 0.15s ease',
            }}
          >
            {/* Chips rápidos de entidades financieras comunes en Colombia */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Selecciona una entidad financiera rápida o escribe el nombre:
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {[
                  { nombre: 'Bancolombia', tipo: 'Ahorros' },
                  { nombre: 'Nequi', tipo: 'Billetera Digital / Celular' },
                  { nombre: 'Daviplata', tipo: 'Billetera Digital / Celular' },
                  { nombre: 'Davivienda', tipo: 'Ahorros' },
                  { nombre: 'Banco de Bogotá', tipo: 'Ahorros' },
                  { nombre: 'BBVA', tipo: 'Ahorros' },
                  { nombre: 'Nu Colombia', tipo: 'Cuenta de Ahorros' },
                  { nombre: 'Lulo Bank', tipo: 'Cuenta de Ahorros' },
                  { nombre: 'Dale!', tipo: 'Billetera Digital / Celular' },
                ].map(b => {
                  const isSelected = bancoNombre.toLowerCase() === b.nombre.toLowerCase();
                  return (
                    <button
                      key={b.nombre}
                      type="button"
                      onClick={() => {
                        setBancoNombre(b.nombre);
                        if (b.nombre === 'Nequi' || b.nombre === 'Daviplata' || b.nombre === 'Dale!') {
                          setBancoTipoCuenta('Billetera Digital / Celular');
                        } else if (!bancoTipoCuenta || bancoTipoCuenta === 'Billetera Digital / Celular') {
                          setBancoTipoCuenta('Ahorros');
                        }
                      }}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? 700 : 500,
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                        background: isSelected ? 'var(--primary)' : 'var(--surface-2)',
                        color: isSelected ? '#fff' : 'var(--text)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {b.nombre} {isSelected && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.75rem' }}>
              {/* Entidad Financiera / Banco */}
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Building size={13} style={{ color: 'var(--primary)' }} />
                  Banco o Entidad Financiera *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Bancolombia, Nequi, etc."
                  value={bancoNombre}
                  onChange={e => setBancoNombre(e.target.value)}
                  style={{ height: '34px', fontSize: '0.82rem' }}
                />
              </div>

              {/* Tipo de Cuenta */}
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Tipo de Cuenta</label>
                <select
                  value={bancoTipoCuenta}
                  onChange={e => setBancoTipoCuenta(e.target.value)}
                  style={{ height: '34px', fontSize: '0.82rem' }}
                >
                  <option value="Ahorros">Cuenta de Ahorros</option>
                  <option value="Corriente">Cuenta Corriente</option>
                  <option value="Billetera Digital / Celular">Billetera Digital / Celular (Nequi / Daviplata)</option>
                  <option value="Llave Transfiya / Bre-B">Llave Transfiya / Bre-B</option>
                </select>
              </div>

              {/* Número de Cuenta / Celular */}
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Número de Cuenta o Celular *</span>
                  {bancoCuenta && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(bancoCuenta);
                        setCopiadoCuenta(true);
                        setTimeout(() => setCopiadoCuenta(false), 2000);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copiadoCuenta ? 'var(--success)' : 'var(--primary)',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontWeight: 600,
                        padding: 0,
                      }}
                    >
                      {copiadoCuenta ? <Check size={11} /> : <Copy size={11} />}
                      {copiadoCuenta ? 'Copiado' : 'Copiar'}
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="Ej: 123-456789-01 o 3176827093"
                  value={bancoCuenta}
                  onChange={e => setBancoCuenta(e.target.value)}
                  style={{ height: '34px', fontSize: '0.82rem', letterSpacing: '0.5px' }}
                />
              </div>

              {/* Nombre del Titular */}
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Nombre del Titular / Beneficiario (Administración)</label>
                <input
                  type="text"
                  placeholder="Ej: Paraíso Terrenal o Carlos Gómez"
                  value={bancoTitular}
                  onChange={e => setBancoTitular(e.target.value)}
                  style={{ height: '34px', fontSize: '0.82rem' }}
                />
              </div>

              {/* Identificación / Cédula / NIT */}
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Cédula o NIT del Titular (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: NIT 900.123.456-7 o CC"
                  value={bancoIdentificacion}
                  onChange={e => setBancoIdentificacion(e.target.value)}
                  style={{ height: '34px', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            {/* LIVE PREVIEW: CÓMO LO RECIBIRÁ EL CLIENTE EN WHATSAPP */}
            <div
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--rad-xs, 8px)',
                padding: '0.75rem 1rem',
                marginTop: '0.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>
                  <span>📲</span>
                  <span>Previsualización exacta en el texto de cobro de alimentación:</span>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background: 'color-mix(in srgb, #25d366 15%, transparent)',
                    color: '#16a34a',
                    fontWeight: 700,
                  }}
                >
                  Formato WhatsApp Oficial
                </span>
              </div>

              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0.75rem 0.9rem',
                  fontFamily: 'monospace, -apple-system, sans-serif',
                  fontSize: '0.78rem',
                  lineHeight: '1.55',
                  color: 'var(--text)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                <strong>💳 *DATOS BANCARIOS DE LA ADMINISTRACIÓN:*</strong>{'\n'}
                {bancoCuenta ? (
                  <>
                    • *Banco:* {bancoNombre || 'Bancolombia'}{'\n'}
                    • *Tipo de Cuenta:* {bancoTipoCuenta || 'Ahorros'}{'\n'}
                    • *Número de Cuenta:* {bancoCuenta}{'\n'}
                    • *Titular:* {bancoTitular || 'Administración Paraíso Terrenal'}
                    {bancoIdentificacion ? `\n• *Identificación / NIT:* ${bancoIdentificacion}` : ''}
                  </>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    (No has definido un número de cuenta todavía. Al completar los campos arriba, aparecerán automáticamente aquí.)
                  </span>
                )}
              </div>

              <div className="text-xs text-muted" style={{ marginTop: '0.4rem', fontSize: '0.72rem' }}>
                💡 Este fragmento se inserta automáticamente al pulsar <strong>"Cobro de Alimentación"</strong> en los módulos de <strong>Cotizaciones</strong>, <strong>Reservas</strong> y en las fases de <strong>Comunicaciones</strong>.
              </div>
            </div>

            {/* Botón guardar datos bancarios */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleGuardarDatosBancarios}
                disabled={guardandoBanco}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Save size={13} /> {guardandoBanco ? 'Guardando datos bancarios...' : 'Guardar Datos Bancarios de Alimentación'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== BARRA DE BÚSQUEDA Y CATEGORÍAS ===== */}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por plato, ingrediente o descripción…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ width: '100%', paddingLeft: '2rem', height: '34px', fontSize: '0.82rem' }}
            />
          </div>
        </div>

        {/* Categorías tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          <button
            className={`btn btn-sm${filtroCategoria === 'todas' ? ' btn-primary' : ''}`}
            onClick={() => setFiltroCategoria('todas')}
            style={{ fontSize: '0.74rem', padding: '0.25rem 0.65rem', whiteSpace: 'nowrap' }}
          >
            Todas ({menus.length})
          </button>
          {CATEGORIAS.map(cat => {
            const count = menus.filter(m => m.categoria === cat).length;
            const isSel = filtroCategoria === cat;
            return (
              <button
                key={cat}
                className={`btn btn-sm${isSel ? ' btn-primary' : ''}`}
                onClick={() => setFiltroCategoria(cat)}
                style={{
                  fontSize: '0.74rem',
                  padding: '0.25rem 0.65rem',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                {CATEGORIA_ICONS[cat]}
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== LISTADO DE MENÚS (CARDS GRID) ===== */}
      {menusFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--surface-sunken)', borderRadius: 'var(--rad-sm)' }}>
          <UtensilsCrossed size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No se encontraron menús</div>
          <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
            {busqueda ? 'Prueba con otro término de búsqueda o categoría.' : 'Comienza creando el primer menú para la oferta gastronómica.'}
          </p>
          <button className="btn btn-primary btn-sm" style={{ marginTop: '0.85rem' }} onClick={abrirNuevo}>
            <Plus size={14} /> Crear Menú
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem' }}>
          {menusFiltrados.map(m => {
            const catStyle = CATEGORIA_COLORS[m.categoria] || { bg: '#e5e7eb', text: '#374151' };
            const foto = obtenerFotoMenu(m);

            return (
              <div
                key={m.id}
                className="panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '0',
                  overflow: 'hidden',
                  position: 'relative',
                  border: m.activo ? '1px solid var(--border)' : '1px dashed var(--border-subtle)',
                  opacity: m.activo ? 1 : 0.72,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
              >
                {/* Imagen del plato */}
                <div style={{ height: '140px', width: '100%', position: 'relative', background: '#e2e8f0', overflow: 'hidden' }}>
                  {foto ? (
                    <img
                      src={foto}
                      alt={m.nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                      <ImageIcon size={32} />
                    </div>
                  )}

                  {/* Badge de Categoría */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '100px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      background: 'rgba(255,255,255,0.92)',
                      color: catStyle.text,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {CATEGORIA_ICONS[m.categoria]}
                    {m.categoria}
                  </span>

                  {/* Switch rápido activo */}
                  <button
                    onClick={() => handleToggleActivo(m)}
                    title={m.activo ? 'Menú activo (clic para desactivar)' : 'Menú inactivo (clic para activar)'}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: m.activo ? 'rgba(34, 197, 94, 0.92)' : 'rgba(100, 116, 139, 0.85)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '100px',
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    }}
                  >
                    {m.activo ? <Eye size={11} /> : <EyeOff size={11} />}
                    {m.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </div>

                {/* Contenido */}
                <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.45rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, lineHeight: 1.25 }}>
                      {m.nombre}
                    </h3>
                  </div>

                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {formatCOP(m.precio_pp)}
                    <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                      / persona
                    </span>
                  </div>

                  {m.descripcion && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {m.descripcion}
                    </p>
                  )}

                  {m.condiciones && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontStyle: 'italic', background: 'var(--surface-sunken)', padding: '0.35rem 0.5rem', borderRadius: 'var(--rad-xs)' }}>
                      ℹ️ {m.condiciones}
                    </div>
                  )}

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      className="btn btn-sm"
                      style={{ flex: 1, fontSize: '0.75rem', gap: '0.3rem', justifyContent: 'center' }}
                      onClick={() => abrirEdicion(m)}
                    >
                      <Edit3 size={13} /> Editar
                    </button>

                    <button
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: '0.75rem', gap: '0.3rem' }}
                      onClick={() => abrirModalPdf(m)}
                      title="Generar propuesta de alimentación en PDF"
                    >
                      <FileText size={13} /> PDF
                    </button>

                    <button
                      className="btn btn-sm btn-danger"
                      style={{ padding: '0.35rem 0.5rem' }}
                      onClick={() => handleEliminar(m)}
                      title="Eliminar menú"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== MODAL CREAR / EDITAR MENÚ ===== */}
      {editando && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UtensilsCrossed size={18} />
                <span>{form.id ? 'Editar Menú' : 'Nuevo Menú de Alimentación'}</span>
              </div>
              <button className="btn btn-sm" onClick={cerrarModal}><X size={15} /></button>
            </div>

            <form onSubmit={handleGuardar} style={{ display: 'grid', gap: '0.85rem', padding: '1.25rem' }}>
              {/* Nombre y Categoría */}
              <div className="form-grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
                <div className="field">
                  <label>Nombre del Menú / Plato *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Sancocho Tradicional en Leña"
                    value={form.nombre || ''}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  />
                </div>

                <div className="field">
                  <label>Categoría *</label>
                  <select
                    value={form.categoria || 'Almuerzo'}
                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value as MenuCategoria }))}
                  >
                    {CATEGORIAS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Precio y Estado */}
              <div className="form-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
                <div className="field">
                  <label>
                    <DollarSign size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Precio por persona (COP) *
                  </label>
                  <CurrencyInput
                    value={form.precio_pp}
                    onChange={val => setForm(f => ({ ...f, precio_pp: val }))}
                    placeholder="0"
                    required
                  />
                </div>

                <div className="field" style={{ justifyContent: 'center' }}>
                  <label>Estado del menú</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.4rem' }}>
                    <input
                      type="checkbox"
                      checked={form.activo ?? true}
                      onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                    />
                    <span style={{ fontSize: '0.85rem' }}>Activo para cotizaciones</span>
                  </label>
                </div>
              </div>

              {/* Descripción */}
              <div className="field">
                <label>Descripción detallada e ingredientes</label>
                <textarea
                  rows={3}
                  placeholder="Describe los componentes del menú, acompañamientos, bebidas, ensalada, preparación…"
                  value={form.descripcion || ''}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                />
              </div>

              {/* Condiciones del servicio */}
              <div className="field">
                <label>Condiciones y requerimientos del servicio</label>
                <input
                  type="text"
                  placeholder="Ej. Mínimo 6 personas. Requiere confirmación 24h antes. Incluye vajilla."
                  value={form.condiciones || ''}
                  onChange={e => setForm(f => ({ ...f, condiciones: e.target.value }))}
                />
              </div>

              {/* Sección de Fotografías */}
              <div className="field">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><ImageIcon size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> Fotografías del Menú</span>
                  <span className="text-xs text-muted">{imagenesUrls.length} imagen(es)</span>
                </label>

                {/* Botones para subir imagen o url */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <label className="btn btn-sm" style={{ cursor: subiendoImg ? 'not-allowed' : 'pointer' }}>
                    <Upload size={13} /> {subiendoImg ? 'Subiendo…' : 'Subir archivo'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={subiendoImg}
                      style={{ display: 'none' }}
                      onChange={handleSubirImagen}
                    />
                  </label>

                  <button type="button" className="btn btn-sm" onClick={handleAgregarUrl}>
                    + URL directa
                  </button>
                </div>

                {/* Previsualización de miniaturas */}
                {imagenesUrls.length > 0 && (
                  <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.65rem' }}>
                    <div className="text-xs text-muted" style={{ fontStyle: 'italic' }}>
                      💡 Haz clic sobre una foto para definirla como la <strong>Portada / Principal</strong> del menú.
                    </div>
                    <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                      {imagenesUrls.map((url, idx) => {
                        const esPrincipal = form.imagen_url === url || (idx === 0 && !form.imagen_url);
                        return (
                          <div
                            key={idx}
                            onClick={() => handleSeleccionarPrincipal(url)}
                            title={esPrincipal ? 'Foto de portada activa (Principal)' : 'Clic para asignar como portada de este menú'}
                            style={{
                              width: '78px',
                              height: '78px',
                              borderRadius: 'var(--rad-xs)',
                              overflow: 'hidden',
                              position: 'relative',
                              border: esPrincipal ? '2.5px solid var(--primary)' : '1px solid var(--border)',
                              cursor: 'pointer',
                              boxShadow: esPrincipal ? '0 0 0 2px color-mix(in srgb, var(--primary) 28%, transparent)' : 'none',
                              transition: 'transform 0.15s, border-color 0.15s',
                            }}
                          >
                            <img src={url} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEliminarImagen(idx);
                              }}
                              title="Eliminar foto"
                              style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                background: 'rgba(0,0,0,0.65)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 3,
                              }}
                            >
                              <X size={10} />
                            </button>
                            {esPrincipal && (
                              <span style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'var(--primary)',
                                color: '#fff',
                                fontSize: '0.6rem',
                                textAlign: 'center',
                                fontWeight: 700,
                                padding: '1px 0',
                                letterSpacing: '0.02em',
                              }}>
                                ★ Portada
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-sm" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={guardando}>
                  <Save size={14} /> {guardando ? 'Guardando…' : 'Guardar Menú'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL GENERAR PROPUESTA PDF ===== */}
      {modalPdfAbierto && menuParaPdf && (
        <div className="modal-overlay" onClick={() => setModalPdfAbierto(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <FileText size={17} style={{ color: 'var(--primary)' }} />
                <span>Generar Propuesta de Alimentación</span>
              </div>
              <button className="btn btn-sm" onClick={() => setModalPdfAbierto(false)}><X size={15} /></button>
            </div>

            <div style={{ padding: '1.25rem', display: 'grid', gap: '0.85rem' }}>
              <div style={{ background: 'var(--surface-sunken)', padding: '0.75rem 1rem', borderRadius: 'var(--rad-xs)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{menuParaPdf.nombre}</div>
                <div className="text-xs text-muted" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                  <span>Categoría: <strong>{menuParaPdf.categoria}</strong></span>
                  <span>•</span>
                  <span>Tarifa: <strong>{formatCOP(menuParaPdf.precio_pp)} /pp</strong></span>
                </div>
              </div>

              {/* Selector de Cliente */}
              <div className="field">
                <label>Cliente destinatario</label>
                <select
                  value={pdfClienteId}
                  onChange={e => {
                    setPdfClienteId(e.target.value);
                    if (e.target.value) setPdfClienteNombreLibre('');
                  }}
                >
                  <option value="">— Escribir nombre libre —</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.apellido || ''} {c.whatsapp ? `(${c.whatsapp})` : ''}</option>
                  ))}
                </select>

                {!pdfClienteId && (
                  <input
                    type="text"
                    placeholder="Nombre completo del cliente o empresa"
                    style={{ marginTop: '0.4rem' }}
                    value={pdfClienteNombreLibre}
                    onChange={e => setPdfClienteNombreLibre(e.target.value)}
                  />
                )}
              </div>

              {/* Selector de Finca */}
              <div className="field">
                <label>Finca / Locación del evento</label>
                <select value={pdfFincaId} onChange={e => setPdfFincaId(e.target.value)}>
                  <option value="">— Sin finca asignada —</option>
                  {fincas.map(f => (
                    <option key={f.id} value={f.id}>{f.nombre} ({f.zona})</option>
                  ))}
                </select>
              </div>

              {/* Comensales y Servicios */}
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field">
                  <label>Comensales (personas)</label>
                  <input
                    type="number"
                    min={1}
                    value={pdfPersonas}
                    onChange={e => setPdfPersonas(Math.max(1, +e.target.value))}
                  />
                </div>

                <div className="field">
                  <label>Servicios / Días</label>
                  <input
                    type="number"
                    min={1}
                    value={pdfServicios}
                    onChange={e => setPdfServicios(Math.max(1, +e.target.value))}
                  />
                </div>
              </div>

              {/* Total liquidado */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(26, 107, 94, 0.1)',
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--rad-xs)',
                  border: '1px solid rgba(26, 107, 94, 0.25)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>
                  Total Cotizado Propuesta:
                </span>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}>
                  {formatCOP((menuParaPdf.precio_pp || 0) * pdfPersonas * pdfServicios)}
                </span>
              </div>

              {/* Notas especiales */}
              <div className="field">
                <label>Observaciones o notas adicionales</label>
                <textarea
                  rows={2}
                  placeholder="Ej. Servicio vegetariano para 2 comensales, montaje en kiosco principal…"
                  value={pdfNotas}
                  onChange={e => setPdfNotas(e.target.value)}
                />
              </div>

              {/* Botón descarga */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn btn-sm" onClick={() => setModalPdfAbierto(false)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleDescargarPdf}
                  disabled={generandoPdf}
                >
                  <Download size={14} /> {generandoPdf ? 'Generando PDF…' : 'Descargar Propuesta PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
