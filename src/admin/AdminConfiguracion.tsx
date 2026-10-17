import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, FileText, CreditCard, Check, Save, RotateCcw,
  Download, Eye, Globe, Phone, Mail, MapPin, Share2, Sparkles,
  ShieldCheck, AlertCircle, Info, ExternalLink, UtensilsCrossed,
  CheckCircle2, HelpCircle, ArrowRight, Layers, Sliders, Hash,
  Upload, Trash2, PenTool, Image as ImageIcon
} from 'lucide-react';
import type { ConfiguracionGeneral, PlantillasPdfPersonalizadas } from '../types';
import {
  generarDocSeparacion,
  generarDocCotizacion,
  generarComprobantePago,
  generarEstadoCuenta,
  generarPazYSalvo,
  generarPropuestaAlimentacion,
} from '../services/documentos';

interface AdminConfiguracionProps {
  config: ConfiguracionGeneral;
  guardando: boolean;
  onGuardar: (datos: Partial<ConfiguracionGeneral>) => Promise<{ success: boolean; error?: string }>;
  onRestablecer: () => Promise<{ success: boolean; error?: string }>;
  onSaveWaNumber?: (num: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

type MainTab = 'empresa' | 'plantillas' | 'cuentas';
type DocumentoSubTab = 'cotizacion' | 'separacion' | 'abono' | 'estado_cuenta' | 'paz_salvo' | 'menu' | 'membrete';

export const AdminConfiguracion: React.FC<AdminConfiguracionProps> = ({
  config,
  guardando,
  onGuardar,
  onRestablecer,
  onSaveWaNumber,
  showToast,
  openConfirm,
}) => {
  // Navegación principal en 3 pilares
  const [activeTab, setActiveTab] = useState<MainTab>('empresa');
  
  // Sub-pestaña activa dentro del Editor de Plantillas PDF
  const [docSubTab, setDocSubTab] = useState<DocumentoSubTab>('cotizacion');

  // Estado del formulario reactivo local
  const [formData, setFormData] = useState<ConfiguracionGeneral>(() => ({
    ...config,
    firma_digital_url: config.firma_digital_url || config.plantillas_pdf?.firma_digital_url || '',
    plantillas_pdf: {
      titulo_cotizacion: 'COTIZACIÓN FORMAL DE SERVICIOS',
      titulo_separacion: 'DOCUMENTO DE SEPARACIÓN',
      titulo_abono: 'COMPROBANTE DE ABONO / PAGO',
      titulo_estado_cuenta: 'ESTADO DE CUENTA CONSOLIDADO',
      titulo_paz_salvo: 'CERTIFICADO DE PAZ Y SALVO',
      titulo_propuesta_menu: 'PROPUESTA DE SERVICIO GASTRONÓMICO',
      instruccion_abono_cotizacion: 'ABONO REQUERIDO (50% ALOJAMIENTO PARA BLOQUEAR DISPONIBILIDAD):',
      vigencia_cotizacion: `- Esta cotización tiene una vigencia de 5 días hábiles a partir de su emisión.\n- Para formalizar y bloquear la disponibilidad de las fechas se requiere un anticipo del 50%.\n- Los precios pactados se respetan únicamente con la confirmación oportuna de la reserva.`,
      clausulas_separacion: `- La separación garantiza la disponibilidad de la finca para las fechas pactadas.\n- El saldo restante de alojamiento debe cancelarse al momento del check-in directamente al propietario.\n- En caso de cancelación por el cliente, el anticipo no será reembolsable salvo acuerdo formal previo.\n- El huésped es responsable del cuidado del inmueble, enseres e inventario entregados.\n- La capacidad máxima pactada debe respetarse estrictamente.`,
      politicas_cancelacion: 'Cancelaciones con más de 15 días calendario de anticipación permiten reprogramación sujeta a disponibilidad dentro del mismo año. Cancelaciones posteriores conllevan la pérdida de la suma de separación pactada.',
      texto_paz_salvo: 'En consecuencia, se expide el presente paz y salvo a plena conformidad de las partes.',
      condiciones_gastronomicas: `- Preparación artesanal con ingredientes frescos de la región.\n- Se requiere anticipo del 50% de alimentación para garantizar compras e insumos.\n- Modificaciones en número de comensales deben avisarse con 48 horas de anticipación.\n- Incluye menaje campestre y servicio en mesa durante los horarios acordados.`,
      pie_firma_admin: 'Administración • Paraíso Terrenal',
      pie_firma_cargo: 'Administración General',
      firma_digital_url: config.firma_digital_url || config.plantillas_pdf?.firma_digital_url || '',
      ...(config.plantillas_pdf || {}),
    },
  }));

  const [hayCambios, setHayCambios] = useState(false);
  const [descargandoPrueba, setDescargandoPrueba] = useState(false);
  const [subiendoFirma, setSubiendoFirma] = useState(false);

  // Sincronizar si cambian los datos externos
  useEffect(() => {
    setFormData({
      ...config,
      firma_digital_url: config.firma_digital_url || config.plantillas_pdf?.firma_digital_url || '',
      plantillas_pdf: {
        titulo_cotizacion: 'COTIZACIÓN FORMAL DE SERVICIOS',
        titulo_separacion: 'DOCUMENTO DE SEPARACIÓN',
        titulo_abono: 'COMPROBANTE DE ABONO / PAGO',
        titulo_estado_cuenta: 'ESTADO DE CUENTA CONSOLIDADO',
        titulo_paz_salvo: 'CERTIFICADO DE PAZ Y SALVO',
        titulo_propuesta_menu: 'PROPUESTA DE SERVICIO GASTRONÓMICO',
        instruccion_abono_cotizacion: 'ABONO REQUERIDO (50% ALOJAMIENTO PARA BLOQUEAR DISPONIBILIDAD):',
        vigencia_cotizacion: `- Esta cotización tiene una vigencia de 5 días hábiles a partir de su emisión.\n- Para formalizar y bloquear la disponibilidad de las fechas se requiere un anticipo del 50%.\n- Los precios pactados se respetan únicamente con la confirmación oportuna de la reserva.`,
        clausulas_separacion: `- La separación garantiza la disponibilidad de la finca para las fechas pactadas.\n- El saldo restante de alojamiento debe cancelarse al momento del check-in directamente al propietario.\n- En caso de cancelación por el cliente, el anticipo no será reembolsable salvo acuerdo formal previo.\n- El huésped es responsable del cuidado del inmueble, enseres e inventario entregados.\n- La capacidad máxima pactada debe respetarse estrictamente.`,
        politicas_cancelacion: 'Cancelaciones con más de 15 días calendario de anticipación permiten reprogramación sujeta a disponibilidad dentro del mismo año. Cancelaciones posteriores conllevan la pérdida de la suma de separación pactada.',
        texto_paz_salvo: 'En consecuencia, se expide el presente paz y salvo a plena conformidad de las partes.',
        condiciones_gastronomicas: `- Preparación artesanal con ingredientes frescos de la región.\n- Se requiere anticipo del 50% de alimentación para garantizar compras e insumos.\n- Modificaciones en número de comensales deben avisarse con 48 horas de anticipación.\n- Incluye menaje campestre y servicio en mesa durante los horarios acordados.`,
        pie_firma_admin: 'Administración • Paraíso Terrenal',
        pie_firma_cargo: 'Administración General',
        firma_digital_url: config.firma_digital_url || config.plantillas_pdf?.firma_digital_url || '',
        ...(config.plantillas_pdf || {}),
      },
    });
    setHayCambios(false);
  }, [config]);

  const handleChange = (campo: keyof ConfiguracionGeneral, valor: any) => {
    setFormData(prev => {
      const updated = { ...prev, [campo]: valor };
      setHayCambios(true);
      return updated;
    });
  };

  const handlePlantillaPdfChange = (campo: keyof PlantillasPdfPersonalizadas, valor: string) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        plantillas_pdf: {
          ...(prev.plantillas_pdf || {}),
          [campo]: valor,
        },
      };
      setHayCambios(true);
      return updated;
    });
  };

  const handleRedesChange = (red: 'facebook' | 'instagram' | 'tiktok', valor: string) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        redes_sociales: {
          ...prev.redes_sociales,
          [red]: valor,
        },
      };
      setHayCambios(true);
      return updated;
    });
  };

  const handleSubirFirmaDigital = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona una imagen válida (PNG, JPG o WebP)', 'error');
      return;
    }

    setSubiendoFirma(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        let finalUrl = dataUrl;

        try {
          const { supabase } = await import('../services/supabase');
          const ext = file.name.split('.').pop() || 'png';
          const path = `firmas/firma_admin_${Date.now()}.${ext}`;
          const { error } = await supabase.storage
            .from('finca-imagenes')
            .upload(path, file, { upsert: true, contentType: file.type || 'image/png' });

          if (!error) {
            const { data } = supabase.storage.from('finca-imagenes').getPublicUrl(path);
            if (data?.publicUrl) {
              // Si se subió con éxito a storage, mantenemos dataUrl como respaldo instantáneo o publicUrl
              finalUrl = dataUrl;
            }
          }
        } catch (uploadErr) {
          console.warn('Aviso: guardando firma como DataURL embebida:', uploadErr);
        }

        setFormData(prev => ({
          ...prev,
          firma_digital_url: finalUrl,
          plantillas_pdf: {
            ...(prev.plantillas_pdf || {}),
            firma_digital_url: finalUrl,
          },
        }));
        setHayCambios(true);
        showToast('Firma digital cargada con éxito. Recuerda pulsar Guardar.', 'success');
        setSubiendoFirma(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error al procesar la imagen de firma:', err);
      showToast('No se pudo procesar la firma seleccionada', 'error');
      setSubiendoFirma(false);
    } finally {
      e.target.value = '';
    }
  };

  const handleEliminarFirmaDigital = () => {
    setFormData(prev => ({
      ...prev,
      firma_digital_url: '',
      plantillas_pdf: {
        ...(prev.plantillas_pdf || {}),
        firma_digital_url: '',
      },
    }));
    setHayCambios(true);
    showToast('Firma digital retirada. Pulsa Guardar para aplicar en el sistema.', 'info');
  };

  const handleGuardar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanWa = (formData.whatsapp || '').replace(/[^0-9]/g, '');
    if (cleanWa.length < 10) {
      showToast('El WhatsApp debe incluir al menos 10 dígitos con código de país (ej: 573176827093)', 'error');
      return;
    }

    const payload = {
      ...formData,
      whatsapp: cleanWa,
    };

    const res = await onGuardar(payload);
    if (res.success) {
      if (onSaveWaNumber) {
        onSaveWaNumber(cleanWa);
      }
      setHayCambios(false);
      showToast('Configuración centralizada guardada exitosamente ✅', 'success');
    } else {
      showToast(res.error || 'Error al guardar la configuración', 'error');
    }
  };

  const handleRestablecer = () => {
    openConfirm(
      '¿Restablecer configuración predeterminada?',
      'Esta acción devolverá los datos de la empresa, plantillas PDF y cuentas bancarias a los valores oficiales de fábrica.',
      async () => {
        const res = await onRestablecer();
        if (res.success) {
          showToast('Configuración restablecida a valores por defecto 🔄', 'info');
        } else {
          showToast('Error al restablecer configuración', 'error');
        }
      }
    );
  };

  // Generador dinámico de prueba según el documento activo
  const emitirPrueba = async (tipo: DocumentoSubTab) => {
    setDescargandoPrueba(true);
    try {
      const demoCliente = {
        id: 'demo-cli',
        nombre: 'Carlos',
        apellido: 'Rodríguez',
        whatsapp: formData.whatsapp || '573176827093',
        telefono: formData.telefono || '+57 317 682 7093',
        correo: formData.correo || 'cliente@ejemplo.com',
        activo: true,
      };

      const demoFinca = {
        id: 'demo-finca',
        nombre: 'Finca Villa Paraíso Campestre',
        zona: 'Santa Elena, Valle del Cauca',
        capacidad: 20,
        precio_pp: 75000,
        banco_nombre: 'Bancolombia',
        banco_tipo_cuenta: 'Ahorros',
        banco_cuenta: '315-998877-01',
        banco_titular: 'Propietario Finca Villa Paraíso',
        banco_identificacion: '1.118.234.567',
        estado: 'disponible' as const,
        activo: true,
      };

      const demoReserva: any = {
        id: 'demo-reserva-1001',
        consecutivo: '1001',
        cliente_id: 'demo-cli',
        finca_id: 'demo-finca',
        fecha_inicio: '2026-11-15',
        fecha_fin: '2026-11-17',
        personas: 12,
        valor_total: 2280000,
        separacion: 900000,
        costo_alimentacion: 480000,
        alimentacion: 'Asado campestre gourmet + Desayuno típico',
        estado: 'activa',
        clientes: demoCliente,
        fincas: demoFinca,
        pagos: [
          {
            id: 'demo-pago-01',
            reserva_id: 'demo-reserva-1001',
            tipo: 'separacion' as const,
            fecha: '2026-10-01',
            valor: 900000,
            observacion: 'Transferencia Bancolombia - Separación 50% Finca',
          },
        ],
      };

      if (tipo === 'cotizacion') {
        const demoCot: any = {
          id: 'demo-cot-1001',
          consecutivo: '1001',
          cliente_id: 'demo-cli',
          finca_id: 'demo-finca',
          fecha_inicio: '2026-11-15',
          fecha_fin: '2026-11-17',
          personas: 12,
          subtotal_alojamiento: 1800000,
          costo_alimentacion: 480000,
          descuento: 0,
          recargo: 0,
          total: 2280000,
          estado: 'cotizada',
          clientes: demoCliente,
          fincas: demoFinca,
          alimentacion: 'Asado campestre gourmet + Desayuno típico campesino',
        };
        generarDocCotizacion(demoCot, formData, demoFinca);
        showToast('PDF de Cotización de prueba generado ✅', 'success');
      } else if (tipo === 'separacion') {
        generarDocSeparacion(demoReserva, formData, demoFinca);
        showToast('Documento de Separación de prueba generado ✅', 'success');
      } else if (tipo === 'abono') {
        generarComprobantePago(demoReserva, demoReserva.pagos[0], formData);
        showToast('Comprobante de Abono de prueba generado ✅', 'success');
      } else if (tipo === 'estado_cuenta') {
        generarEstadoCuenta(demoReserva, formData);
        showToast('Estado de Cuenta de prueba generado ✅', 'success');
      } else if (tipo === 'paz_salvo') {
        const reservaPagada = {
          ...demoReserva,
          pagos: [
            ...demoReserva.pagos,
            {
              id: 'demo-pago-02',
              reserva_id: 'demo-reserva-1001',
              tipo: 'pago_total' as const,
              fecha: '2026-10-10',
              valor: 1380000,
              observacion: 'Saldo de alojamiento y alimentación cancelado 100%',
            },
          ],
        };
        generarPazYSalvo(reservaPagada, formData);
        showToast('Paz y Salvo de prueba generado ✅', 'success');
      } else if (tipo === 'menu') {
        const demoMenu: any = {
          id: 'demo-menu-1',
          nombre: 'Sancocho Tradicional de Gallina en Leña',
          categoria: 'Almuerzo',
          precio_pp: 35000,
          descripcion: 'Cocido tradicional en leña con plátano verde, yuca campesina, papa pastusa y mazorca tierna. Acompañado de arroz, ensalada y limonada natural con panela.',
          activo: true,
        };
        await generarPropuestaAlimentacion({
          menu: demoMenu,
          cliente: demoCliente,
          finca: demoFinca,
          personas: 12,
          cantidadServicios: 1,
          consecutivo: '1001',
          tituloDocumento: formData.plantillas_pdf?.titulo_propuesta_menu || 'PROPUESTA DE SERVICIO GASTRONÓMICO',
          config: formData,
        });
        showToast('Propuesta de Menú de prueba generada ✅', 'success');
      } else if (tipo === 'membrete') {
        // Generar cotización de muestra para ver membrete y pie
        emitirPrueba('cotizacion');
      }
    } catch (err) {
      console.error('Error generando prueba PDF:', err);
      showToast('Error al generar PDF de prueba', 'error');
    } finally {
      setDescargandoPrueba(false);
    }
  };

  const plantillas = formData.plantillas_pdf || {};

  return (
    <div className="admin-configuracion-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ============================================================== */}
      {/* ENCABEZADO PRINCIPAL & BARRA DE ACCIÓN SUPERIOR */}
      {/* ============================================================== */}
      <div className="panel" style={{ padding: '1.25rem 1.5rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 107, 94, 0.15) 0%, rgba(212, 172, 63, 0.15) 100%)',
              color: 'var(--primary)',
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
              border: '1px solid rgba(26, 107, 94, 0.2)'
            }}>
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                  Configuración Centralizada
                </h1>
                <span className="badge s-avail" style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>
                  <CheckCircle2 size={11} style={{ marginRight: '3px', display: 'inline' }} /> En Tiempo Real
                </span>
              </div>
              <p className="text-xs text-muted" style={{ margin: '0.2rem 0 0' }}>
                Identidad de marca, plantillas PDF oficiales, cuentas de recaudo y reglas operativas
              </p>
            </div>
          </div>

          {/* Botones de acción y estado de cambios */}
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
            <AnimatePresence>
              {hayCambios && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="badge"
                  style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    borderColor: '#fde68a',
                    fontWeight: 600,
                    boxShadow: '0 1px 4px rgba(245, 158, 11, 0.15)'
                  }}
                >
                  <AlertCircle size={12} style={{ marginRight: '0.3rem' }} /> Cambios pendientes de guardar
                </motion.span>
              )}
            </AnimatePresence>

            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={handleRestablecer}
              disabled={guardando}
              title="Restablecer valores originales de fábrica"
            >
              <RotateCcw size={14} /> Restablecer
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleGuardar()}
              disabled={guardando}
              style={{ fontWeight: 600, minWidth: '150px' }}
            >
              <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar Todo'}
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* NAVEGACIÓN PRINCIPAL EN 3 PILARES CLAROS */}
        {/* ============================================================== */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginTop: '1.25rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.25rem'
        }}>
          <button
            type="button"
            className={`btn text-xs ${activeTab === 'empresa' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('empresa')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: activeTab === 'empresa' ? 700 : 500,
              padding: '0.55rem 1rem'
            }}
          >
            <Building2 size={16} /> 1. Empresa & Contacto
          </button>

          <button
            type="button"
            className={`btn text-xs ${activeTab === 'plantillas' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('plantillas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: activeTab === 'plantillas' ? 700 : 500,
              padding: '0.55rem 1rem'
            }}
          >
            <FileText size={16} /> 2. Plantillas & Editor de Documentos PDF
          </button>

          <button
            type="button"
            className={`btn text-xs ${activeTab === 'cuentas' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('cuentas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: activeTab === 'cuentas' ? 700 : 500,
              padding: '0.55rem 1rem'
            }}
          >
            <CreditCard size={16} /> 3. Cuentas Bancarias & Servicios
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      {/* ============================================================== */}
      <form onSubmit={handleGuardar}>
        {/* ------------------------------------------------------------ */}
        {/* PILAR 1: EMPRESA & CONTACTO */}
        {/* ------------------------------------------------------------ */}
        {activeTab === 'empresa' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}
          >
            {/* Tarjeta: Identidad Institucional */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={17} style={{ color: 'var(--primary)' }} /> Identidad Institucional
                </div>
                <span className="text-xs text-muted">Aparece en Web pública, Cotizaciones y Membretes</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Logo oficial */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.85rem',
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '12px',
                    background: '#FAF7EE',
                    border: '1.5px solid #d4ac3f',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    flexShrink: 0,
                  }}>
                    <img
                      src={formData.logo_url || '/logo.png'}
                      alt="Logo Oficial"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
                      Logo Oficial — Paraíso Terrenal
                    </div>
                    <p className="text-xs text-muted" style={{ margin: '0.2rem 0 0.4rem 0' }}>
                      Incrustado en alta definición en todos los documentos PDF y en la barra de navegación del cliente.
                    </p>
                    <span className="badge s-avail" style={{ fontSize: '0.7rem' }}>
                      <Check size={11} style={{ marginRight: '3px', display: 'inline' }} /> Alta Resolución (300 DPI)
                    </span>
                  </div>
                </div>

                <div className="field">
                  <label>Nombre de la Empresa o Marca Comercial *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre_empresa}
                    onChange={e => handleChange('nombre_empresa', e.target.value)}
                    placeholder="Ej: Paraíso Terrenal"
                  />
                  <span className="text-xs text-muted">Visible en el título de la página, pie de página y membretes.</span>
                </div>

                <div className="field">
                  <label>NIT / Identificación Tributaria</label>
                  <input
                    type="text"
                    value={formData.nit || ''}
                    onChange={e => handleChange('nit', e.target.value)}
                    placeholder="Ej: 900.123.456-7"
                  />
                  <span className="text-xs text-muted">Aparece en el encabezado de documentos formales.</span>
                </div>

                <div className="field">
                  <label>Lema o Eslogan Corporativo</label>
                  <input
                    type="text"
                    value={formData.eslogan || ''}
                    onChange={e => handleChange('eslogan', e.target.value)}
                    placeholder="Ej: Experiencias exclusivas y descanso en la naturaleza"
                  />
                </div>

                <div className="field">
                  <label>Sitio Web Oficial</label>
                  <input
                    type="url"
                    value={formData.sitio_web || ''}
                    onChange={e => handleChange('sitio_web', e.target.value)}
                    placeholder="https://fincascampestres.com"
                  />
                </div>
              </div>
            </div>

            {/* Tarjeta: Canales de Contacto Directo */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={17} style={{ color: 'var(--primary)' }} /> Canales de Contacto Directo
                </div>
                <span className="text-xs text-muted">Conexión reactiva con WhatsApp y footer</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="field">
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>WhatsApp Principal * (10+ dígitos con indicativo)</span>
                    <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>Centralizado</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.whatsapp}
                    onChange={e => handleChange('whatsapp', e.target.value)}
                    placeholder="573176827093"
                  />
                  <span className="text-xs text-muted">
                    Conectado con todos los botones de reserva, cálculo de cotización y chat en vivo con clientes.
                  </span>
                </div>

                <div className="field">
                  <label>Teléfono de Atención / Oficina</label>
                  <input
                    type="text"
                    value={formData.telefono || ''}
                    onChange={e => handleChange('telefono', e.target.value)}
                    placeholder="+57 317 682 7093"
                  />
                </div>

                <div className="field">
                  <label>Correo Electrónico Institucional</label>
                  <input
                    type="email"
                    value={formData.correo || ''}
                    onChange={e => handleChange('correo', e.target.value)}
                    placeholder="reservas@fincascampestres.com"
                  />
                </div>

                <div className="field">
                  <label>Dirección Operativa</label>
                  <input
                    type="text"
                    value={formData.direccion || ''}
                    onChange={e => handleChange('direccion', e.target.value)}
                    placeholder="Santa Elena, El Cerrito, Valle del Cauca"
                  />
                </div>

                <div className="field">
                  <label>Ciudad y Departamento / Región</label>
                  <input
                    type="text"
                    value={formData.ciudad || ''}
                    onChange={e => handleChange('ciudad', e.target.value)}
                    placeholder="Valle del Cauca, Colombia"
                  />
                </div>
              </div>
            </div>

            {/* Tarjeta: Redes Sociales */}
            <div className="panel" style={{ gridColumn: '1 / -1' }}>
              <div className="panel-header">
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Share2 size={17} style={{ color: 'var(--primary)' }} /> Presencia en Redes Sociales
                </div>
                <span className="text-xs text-muted">Aparece en el pie de página de la página pública</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
                <div className="field">
                  <label>Instagram</label>
                  <input
                    type="url"
                    value={formData.redes_sociales?.instagram || ''}
                    onChange={e => handleRedesChange('instagram', e.target.value)}
                    placeholder="https://instagram.com/tu_cuenta"
                  />
                </div>
                <div className="field">
                  <label>Facebook</label>
                  <input
                    type="url"
                    value={formData.redes_sociales?.facebook || ''}
                    onChange={e => handleRedesChange('facebook', e.target.value)}
                    placeholder="https://facebook.com/tu_pagina"
                  />
                </div>
                <div className="field">
                  <label>TikTok</label>
                  <input
                    type="url"
                    value={formData.redes_sociales?.tiktok || ''}
                    onChange={e => handleRedesChange('tiktok', e.target.value)}
                    placeholder="https://tiktok.com/@tu_cuenta"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* PILAR 2: PLANTILLAS Y EDITOR INTEGRAL DE DOCUMENTOS PDF */}
        {/* ------------------------------------------------------------ */}
        {activeTab === 'plantillas' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            {/* Sub-navegación interactiva por tipo de documento con Framer Motion */}
            <div className="panel" style={{ padding: '0.85rem 1.25rem', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={15} /> Selecciona la plantilla que deseas personalizar:
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Consecutivos numéricos automáticos vinculados desde el #1001
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.35rem' }}>
                {[
                  { id: 'cotizacion', label: 'Cotización Formal', icon: '📝' },
                  { id: 'separacion', label: 'Separación y Reserva', icon: '🤝' },
                  { id: 'abono', label: 'Comprobante de Abono', icon: '💰' },
                  { id: 'estado_cuenta', label: 'Estado de Cuenta', icon: '📊' },
                  { id: 'paz_salvo', label: 'Paz y Salvo', icon: '🏅' },
                  { id: 'menu', label: 'Propuesta de Menú', icon: '🍽️' },
                  { id: 'membrete', label: 'Membrete & Pie General', icon: '🏛️' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDocSubTab(item.id as DocumentoSubTab)}
                    className={`btn btn-sm ${docSubTab === item.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      fontSize: '0.76rem',
                      padding: '0.4rem 0.75rem',
                      fontWeight: docSubTab === item.id ? 700 : 500,
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>{item.icon}</span> {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Área de trabajo en 2 columnas: Editor a la Izquierda, Simulador en Vivo a la Derecha */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
              {/* COLUMNA 1: FORMULARIO DE EDICIÓN DEL DOCUMENTO SELECCIONADO */}
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* 1. COTIZACIÓN FORMAL */}
                {docSubTab === 'cotizacion' && (
                  <>
                    <div className="panel-header">
                      <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={17} style={{ color: 'var(--primary)' }} /> Plantilla: Cotización Formal
                      </div>
                      <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>Alojamiento + Alimentación</span>
                    </div>

                    <div className="field">
                      <label>Título Oficial del Documento en PDF</label>
                      <input
                        type="text"
                        value={plantillas.titulo_cotizacion || 'COTIZACIÓN FORMAL DE SERVICIOS'}
                        onChange={e => handlePlantillaPdfChange('titulo_cotizacion', e.target.value)}
                        placeholder="Ej: COTIZACIÓN FORMAL DE SERVICIOS"
                      />
                      <span className="text-xs text-muted">Aparece en letras mayúsculas destacadas en el encabezado.</span>
                    </div>

                    <div className="field">
                      <label>Texto de Instrucción del Abono de Reserva</label>
                      <input
                        type="text"
                        value={plantillas.instruccion_abono_cotizacion || 'ABONO REQUERIDO (50% ALOJAMIENTO PARA BLOQUEAR):'}
                        onChange={e => handlePlantillaPdfChange('instruccion_abono_cotizacion', e.target.value)}
                        placeholder="Ej: ABONO REQUERIDO (50% ALOJAMIENTO PARA BLOQUEAR DISPONIBILIDAD):"
                      />
                      <span className="text-xs text-muted">Franja amarilla que resalta el 50% de anticipo para la finca.</span>
                    </div>

                    <div className="field">
                      <label>Términos, Políticas y Vigencia de la Cotización</label>
                      <textarea
                        rows={5}
                        value={plantillas.vigencia_cotizacion || ''}
                        onChange={e => handlePlantillaPdfChange('vigencia_cotizacion', e.target.value)}
                        placeholder="Escribe cada punto en una línea nueva..."
                        style={{ fontFamily: 'inherit', fontSize: '0.82rem' }}
                      />
                      <span className="text-xs text-muted">Cada salto de línea se imprime con su respectiva viñeta en el PDF.</span>
                    </div>

                    <div className="field">
                      <label>Pie de Firma del Asesor / Administración</label>
                      <input
                        type="text"
                        value={plantillas.pie_firma_admin || 'Asesor Comercial • Paraíso Terrenal'}
                        onChange={e => handlePlantillaPdfChange('pie_firma_admin', e.target.value)}
                        placeholder="Ej: Asesor Comercial • Paraíso Terrenal"
                      />
                    </div>
                  </>
                )}

                {/* 2. DOCUMENTO DE SEPARACIÓN */}
                {docSubTab === 'separacion' && (
                  <>
                    <div className="panel-header">
                      <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={17} style={{ color: 'var(--primary)' }} /> Plantilla: Documento de Separación
                      </div>
                      <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>Comprobante de Reserva Oficial</span>
                    </div>

                    <div className="field">
                      <label>Título del Documento</label>
                      <input
                        type="text"
                        value={plantillas.titulo_separacion || 'DOCUMENTO DE SEPARACIÓN'}
                        onChange={e => handlePlantillaPdfChange('titulo_separacion', e.target.value)}
                        placeholder="Ej: DOCUMENTO DE SEPARACIÓN Y COMPROMISO"
                      />
                    </div>

                    <div className="field">
                      <label>Cláusulas de Reserva y Compromiso del Huésped</label>
                      <textarea
                        rows={6}
                        value={plantillas.clausulas_separacion || formData.terminos_condiciones || ''}
                        onChange={e => {
                          handlePlantillaPdfChange('clausulas_separacion', e.target.value);
                          handleChange('terminos_condiciones', e.target.value);
                        }}
                        placeholder="Escribe cada cláusula en una línea nueva..."
                        style={{ fontFamily: 'inherit', fontSize: '0.82rem' }}
                      />
                      <span className="text-xs text-muted">
                        Condiciones de entrega del inmueble, responsabilidad por inventario y liquidación de saldo al check-in.
                      </span>
                    </div>

                    <div className="field">
                      <label>Políticas de Cancelación y Reprogramación</label>
                      <textarea
                        rows={3}
                        value={plantillas.politicas_cancelacion || formData.politicas_cancelacion || ''}
                        onChange={e => {
                          handlePlantillaPdfChange('politicas_cancelacion', e.target.value);
                          handleChange('politicas_cancelacion', e.target.value);
                        }}
                        placeholder="Plazos y penalizaciones en caso de cancelación..."
                        style={{ fontFamily: 'inherit', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div className="field">
                      <label>Firma Autorizada de la Administración</label>
                      <input
                        type="text"
                        value={plantillas.pie_firma_admin || 'Administración • Paraíso Terrenal'}
                        onChange={e => handlePlantillaPdfChange('pie_firma_admin', e.target.value)}
                        placeholder="Ej: Administración • Paraíso Terrenal"
                      />
                    </div>
                  </>
                )}

                {/* 3. COMPROBANTE DE ABONO */}
                {docSubTab === 'abono' && (
                  <>
                    <div className="panel-header">
                      <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CreditCard size={17} style={{ color: 'var(--primary)' }} /> Plantilla: Comprobante de Abono / Pago
                      </div>
                      <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>Recibo Individual</span>
                    </div>

                    <div className="field">
                      <label>Título del Comprobante</label>
                      <input
                        type="text"
                        value={plantillas.titulo_abono || 'COMPROBANTE DE ABONO / PAGO'}
                        onChange={e => handlePlantillaPdfChange('titulo_abono', e.target.value)}
                        placeholder="Ej: COMPROBANTE DE ABONO / PAGO"
                      />
                    </div>

                    <div className="field">
                      <label>Declaración de Validez del Recibo</label>
                      <textarea
                        rows={4}
                        value={formData.textos_legales || ''}
                        onChange={e => handleChange('textos_legales', e.target.value)}
                        placeholder="Texto legal sobre la validez del comprobante..."
                        style={{ fontFamily: 'inherit', fontSize: '0.82rem' }}
                      />
                      <span className="text-xs text-muted">Se imprime al final del comprobante garantizando validez comercial.</span>
                    </div>
                  </>
                )}

                {/* 4. ESTADO DE CUENTA */}
                {docSubTab === 'estado_cuenta' && (
                  <>
                    <div className="panel-header">
                      <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={17} style={{ color: 'var(--primary)' }} /> Plantilla: Estado de Cuenta Consolidado
                      </div>
                      <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>Auditoría y Doble Balance</span>
                    </div>

                    <div className="field">
                      <label>Título del Estado de Cuenta</label>
                      <input
                        type="text"
                        value={plantillas.titulo_estado_cuenta || 'ESTADO DE CUENTA CONSOLIDADO'}
                        onChange={e => handlePlantillaPdfChange('titulo_estado_cuenta', e.target.value)}
                        placeholder="Ej: ESTADO DE CUENTA CONSOLIDADO"
                      />
                      <span className="text-xs text-muted">
                        Desglosa de forma independiente los saldos de Alojamiento (Propietario) y Alimentación (Administración).
                      </span>
                    </div>

                    <div className="field">
                      <label>Texto de Conformidad Financiera</label>
                      <textarea
                        rows={4}
                        value={formData.textos_legales || ''}
                        onChange={e => handleChange('textos_legales', e.target.value)}
                        placeholder="Texto legal de conformidad..."
                        style={{ fontFamily: 'inherit', fontSize: '0.82rem' }}
                      />
                    </div>
                  </>
                )}

                {/* 5. CERTIFICADO DE PAZ Y SALVO */}
                {docSubTab === 'paz_salvo' && (
                  <>
                    <div className="panel-header">
                      <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShieldCheck size={17} style={{ color: 'var(--primary)' }} /> Plantilla: Certificado de Paz y Salvo
                      </div>
                      <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>100% Pagado</span>
                    </div>

                    <div className="field">
                      <label>Título Oficial del Certificado</label>
                      <input
                        type="text"
                        value={plantillas.titulo_paz_salvo || 'CERTIFICADO DE PAZ Y SALVO'}
                        onChange={e => handlePlantillaPdfChange('titulo_paz_salvo', e.target.value)}
                        placeholder="Ej: CERTIFICADO DE PAZ Y SALVO"
                      />
                    </div>

                    <div className="field">
                      <label>Declaración de Cumplimiento y Liberación de Obligación</label>
                      <textarea
                        rows={4}
                        value={plantillas.texto_paz_salvo || 'En consecuencia, se expide el presente paz y salvo a plena conformidad de las partes.'}
                        onChange={e => handlePlantillaPdfChange('texto_paz_salvo', e.target.value)}
                        placeholder="Texto de cierre de certificación..."
                        style={{ fontFamily: 'inherit', fontSize: '0.82rem' }}
                      />
                      <span className="text-xs text-muted">Se incluye bajo la certificación de pago 100% completado.</span>
                    </div>

                    <div className="field">
                      <label>Firma y Autorización Administrativa</label>
                      <input
                        type="text"
                        value={plantillas.pie_firma_admin || 'Administración • Paraíso Terrenal'}
                        onChange={e => handlePlantillaPdfChange('pie_firma_admin', e.target.value)}
                        placeholder="Ej: Administración • Paraíso Terrenal"
                      />
                    </div>
                  </>
                )}

                {/* 6. PROPUESTA DE MENÚ */}
                {docSubTab === 'menu' && (
                  <>
                    <div className="panel-header">
                      <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <UtensilsCrossed size={17} style={{ color: 'var(--primary)' }} /> Plantilla: Propuesta Gastronómica
                      </div>
                      <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>Servicios de Alimentación</span>
                    </div>

                    <div className="field">
                      <label>Título de la Propuesta</label>
                      <input
                        type="text"
                        value={plantillas.titulo_propuesta_menu || 'PROPUESTA DE SERVICIO GASTRONÓMICO'}
                        onChange={e => handlePlantillaPdfChange('titulo_propuesta_menu', e.target.value)}
                        placeholder="Ej: PROPUESTA DE SERVICIO GASTRONÓMICO"
                      />
                    </div>

                    <div className="field">
                      <label>Condiciones y Políticas del Servicio Gastronómico</label>
                      <textarea
                        rows={5}
                        value={plantillas.condiciones_gastronomicas || ''}
                        onChange={e => handlePlantillaPdfChange('condiciones_gastronomicas', e.target.value)}
                        placeholder="Escribe cada punto en una línea nueva..."
                        style={{ fontFamily: 'inherit', fontSize: '0.82rem' }}
                      />
                      <span className="text-xs text-muted">
                        Condiciones sobre insumos frescos, anticipo del 50% de alimentación, menaje campestre y avisos de modificación.
                      </span>
                    </div>

                    <div className="field">
                      <label>Firma de Coordinación Gastronómica</label>
                      <input
                        type="text"
                        value={plantillas.pie_firma_admin || 'Coordinación • Paraíso Terrenal'}
                        onChange={e => handlePlantillaPdfChange('pie_firma_admin', e.target.value)}
                        placeholder="Ej: Coordinación • Paraíso Terrenal"
                      />
                    </div>
                  </>
                )}

                {/* 7. MEMBRETE Y PIE GENERAL */}
                {/* 7. MEMBRETE Y PIE GENERAL (INCLUYE FIRMA DIGITAL) */}
                {docSubTab === 'membrete' && (
                  <>
                    <div className="panel-header">
                      <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={17} style={{ color: 'var(--primary)' }} /> Membrete, Logo Oficial & Firma Digital
                      </div>
                      <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>Aplica a Todos los Documentos</span>
                    </div>

                    {/* BLOQUE PRINCIPAL: FIRMA DIGITAL DE ADMINISTRACIÓN */}
                    <div style={{
                      border: '1.5px dashed var(--border)',
                      borderRadius: '12px',
                      padding: '1.15rem',
                      background: 'var(--surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <PenTool size={16} style={{ color: 'var(--primary)' }} />
                          Firma Digital de la Administración (Paraíso Terrenal)
                        </div>
                        <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>
                          Fondo Transparente Recomendado (PNG)
                        </span>
                      </div>

                      <p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.45 }}>
                        Sube una imagen de tu firma manuscrita (preferiblemente PNG sin fondo o fondo blanco recortado). 
                        El sistema la insertará de manera automática y ajustada sobre la línea de firma autorizada en todos los documentos PDF 
                        (Cotizaciones, Separaciones, Comprobantes de Abono, Estados de Cuenta, Paz y Salvo y Menús). La firma del cliente ha sido 
                        removida según la directriz operativa.
                      </p>

                      {/* Recuadro con patrón de transparencia tipo tablero para apreciar el PNG transparente */}
                      <div style={{
                        width: '100%',
                        minHeight: '120px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundImage: `
                          linear-gradient(45deg, #f1f5f9 25%, transparent 25%), 
                          linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), 
                          linear-gradient(45deg, transparent 75%, #f1f5f9 75%), 
                          linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)
                        `,
                        backgroundSize: '16px 16px',
                        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.25rem',
                        position: 'relative',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)'
                      }}>
                        {formData.firma_digital_url || plantillas.firma_digital_url ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                            <img
                              src={formData.firma_digital_url || plantillas.firma_digital_url || ''}
                              alt="Firma Digital Oficial"
                              style={{
                                maxHeight: '80px',
                                maxWidth: '240px',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.15))'
                              }}
                            />
                            <div style={{
                              width: '180px',
                              borderBottom: '1.5px solid #1e1b13',
                              marginTop: '0.2rem'
                            }} />
                            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#1e1b13', textAlign: 'center' }}>
                              {plantillas.pie_firma_admin || 'Administración • Paraíso Terrenal'}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: '#64748b' }}>Firma Autorizada Paraíso Terrenal</span>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '0.85rem' }}>
                            <Upload size={26} style={{ margin: '0 auto 0.4rem', opacity: 0.5, color: 'var(--primary)' }} />
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>Sin firma digital configurada</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              Haz clic en el botón inferior para cargar tu firma manuscrita
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botones de acción */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                          <Upload size={14} />
                          {subiendoFirma ? 'Procesando firma...' : (formData.firma_digital_url || plantillas.firma_digital_url ? 'Cambiar Imagen de Firma' : 'Subir Firma Digital (PNG / JPG)')}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleSubirFirmaDigital}
                            style={{ display: 'none' }}
                            disabled={subiendoFirma}
                          />
                        </label>

                        {(formData.firma_digital_url || plantillas.firma_digital_url) && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={handleEliminarFirmaDigital}
                            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                          >
                            <Trash2 size={14} /> Eliminar Firma
                          </button>
                        )}
                      </div>

                      {/* Cargo o Nombre de quien firma */}
                      <div className="field" style={{ marginTop: '0.4rem' }}>
                        <label>Nombre y Cargo bajo la Línea de Firma</label>
                        <input
                          type="text"
                          value={plantillas.pie_firma_admin || 'Administración • Paraíso Terrenal'}
                          onChange={e => handlePlantillaPdfChange('pie_firma_admin', e.target.value)}
                          placeholder="Ej: Administración • Paraíso Terrenal o Representante Legal"
                        />
                        <span className="text-xs text-muted">Texto impreso directamente debajo de la línea de firma en todos los documentos.</span>
                      </div>
                    </div>

                    <div className="field">
                      <label>Encabezado Superior de Documentos</label>
                      <input
                        type="text"
                        value={formData.doc_encabezado || ''}
                        onChange={e => handleChange('doc_encabezado', e.target.value)}
                        placeholder="PARAÍSO TERRENAL — FINCAS DE ALQUILER Y SERVICIOS TURÍSTICOS"
                      />
                      <span className="text-xs text-muted">Texto que identifica la razón de ser comercial en el título del membrete.</span>
                    </div>

                    <div className="field">
                      <label>Texto del Pie de Página Principal</label>
                      <input
                        type="text"
                        value={formData.doc_pie_pagina || ''}
                        onChange={e => handleChange('doc_pie_pagina', e.target.value)}
                        placeholder="Paraíso Terrenal • Fincas de Alquiler • Documento oficial generado automáticamente"
                      />
                      <span className="text-xs text-muted">Aparece centrado en la franja esmeralda inferior de cada documento.</span>
                    </div>

                    <div className="field">
                      <label>Información de Contacto a Pie de Página</label>
                      <input
                        type="text"
                        value={formData.doc_contacto_info || ''}
                        onChange={e => handleChange('doc_contacto_info', e.target.value)}
                        placeholder="WhatsApp: +57 317 682 7093 | reservas@fincascampestres.com | Santa Elena, Valle"
                      />
                      <span className="text-xs text-muted">Línea complementaria visible en el pie de página con datos de atención.</span>
                    </div>
                  </>
                )}
              </div>

              {/* COLUMNA 2: SIMULADOR VISUAL EN TIEMPO REAL CON FRAMER MOTION */}
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="panel-header">
                    <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Eye size={17} style={{ color: 'var(--primary)' }} /> Simulador Visual en Vivo del Documento
                    </div>
                    <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>Reactivo</span>
                  </div>

                  {/* HOJA SIMULADA TIPO A4 CON MEMBRETE Y ESTILO OFICIAL */}
                  <motion.div
                    key={docSubTab}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      background: '#ffffff',
                      color: '#1e1b13',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      border: '1px solid var(--border)',
                      fontSize: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Encabezado Esmeralda Institucional */}
                    <div style={{
                      background: '#1a6b5e',
                      color: '#ffffff',
                      padding: '1rem',
                      borderBottom: '2.5px solid #d4ac3f',
                      position: 'relative'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '8px',
                            background: '#FAF7EE',
                            border: '1px solid #d4ac3f',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <img
                              src={formData.doc_logo_url || formData.logo_url || '/logo.png'}
                              alt="Logo"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                              {formData.nombre_empresa || 'Paraíso Terrenal'}
                            </div>
                            <div style={{ fontSize: '0.68rem', fontStyle: 'italic', opacity: 0.9 }}>
                              {formData.eslogan || 'Fincas de Alquiler · Experiencias exclusivas y descanso en la naturaleza'}
                            </div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: '0.35rem', color: '#fff', letterSpacing: '0.02em' }}>
                              {docSubTab === 'cotizacion' && (plantillas.titulo_cotizacion || 'COTIZACIÓN FORMAL DE SERVICIOS')}
                              {docSubTab === 'separacion' && (plantillas.titulo_separacion || 'DOCUMENTO DE SEPARACIÓN')}
                              {docSubTab === 'abono' && (plantillas.titulo_abono || 'COMPROBANTE DE ABONO / PAGO')}
                              {docSubTab === 'estado_cuenta' && (plantillas.titulo_estado_cuenta || 'ESTADO DE CUENTA CONSOLIDADO')}
                              {docSubTab === 'paz_salvo' && (plantillas.titulo_paz_salvo || 'CERTIFICADO DE PAZ Y SALVO')}
                              {docSubTab === 'menu' && (plantillas.titulo_propuesta_menu || 'PROPUESTA DE SERVICIO GASTRONÓMICO')}
                              {docSubTab === 'membrete' && (formData.doc_encabezado || 'MEMBRETE INSTITUCIONAL')}
                            </div>
                            <div style={{ fontSize: '0.62rem', opacity: 0.85, marginTop: '0.1rem' }}>
                              {formData.nit ? `NIT: ${formData.nit} • ` : ''}{formData.telefono || '+57 317 682 7093'} • {formData.ciudad || 'Santa Elena, Valle'}
                            </div>
                          </div>
                        </div>

                        {/* Consecutivo Oficial */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{
                            background: '#124c43',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            border: '1px solid rgba(255,255,255,0.25)'
                          }}>
                            # 1001
                          </div>
                          <div style={{ fontSize: '0.62rem', opacity: 0.85, marginTop: '0.2rem' }}>
                            Emitido: {new Date().toLocaleDateString('es-CO')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Franja de Cliente y Finca */}
                    <div style={{
                      background: '#f4f1ea',
                      padding: '0.65rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #dbd4c3',
                      fontSize: '0.72rem'
                    }}>
                      <div>
                        <strong>Cliente:</strong> Carlos Rodríguez <br />
                        <strong>Contacto:</strong> +57 317 682 7093
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong>Finca:</strong> Villa Paraíso Campestre <br />
                        <strong>Huéspedes:</strong> 12 personas
                      </div>
                    </div>

                    {/* Cuerpo Dinámico Simulado según documento */}
                    <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {/* Simulación Paz y Salvo */}
                      {docSubTab === 'paz_salvo' && (
                        <div style={{
                          background: '#d1ead9',
                          color: '#1a6b5e',
                          fontWeight: 700,
                          textAlign: 'center',
                          padding: '0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.88rem'
                        }}>
                          ✓ PAGADO EN SU TOTALIDAD
                        </div>
                      )}

                      {/* Simulación Cotización: Abono destacado y cuentas separadas */}
                      {docSubTab === 'cotizacion' && (
                        <>
                          <div style={{
                            background: '#fef9c3',
                            border: '1px solid #ca8a04',
                            color: '#a16207',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <span>{plantillas.instruccion_abono_cotizacion || 'ABONO REQUERIDO (50% ALOJAMIENTO):'}</span>
                            <span>$900.000 COP</span>
                          </div>

                          {/* Cuenta 1: Finca */}
                          <div style={{ background: '#f8f9f8', border: '1px solid #dbd4c3', padding: '0.45rem', borderRadius: '4px', fontSize: '0.68rem' }}>
                            <div style={{ fontWeight: 700, color: '#1a6b5e' }}>1. CUENTA DEL PROPIETARIO (50% ALOJAMIENTO):</div>
                            <div>Banco: Bancolombia • Ahorros N°: 315-998877-01 • Titular: Propietario Finca</div>
                          </div>

                          {/* Cuenta 2: Administración Paraíso Terrenal */}
                          <div style={{ background: '#f4f8f6', border: '1px solid #1a6b5e', padding: '0.45rem', borderRadius: '4px', fontSize: '0.68rem' }}>
                            <div style={{ fontWeight: 700, color: '#1a6b5e' }}>2. CUENTA ADMINISTRACIÓN (ALIMENTACIÓN PARAÍSO TERRENAL):</div>
                            <div>
                              Banco: {formData.banco_nombre || 'Bancolombia'} • {formData.banco_tipo_cuenta || 'Ahorros'} N°: {formData.banco_cuenta || 'Configura la cuenta en la pestaña 3'} • Titular: {formData.banco_titular || 'Paraíso Terrenal'}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Simulación Separación: Doble Balance */}
                      {docSubTab === 'separacion' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.7rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', paddingBottom: '0.2rem' }}>
                            <span>1. Alojamiento Finca (Total: $1.800.000):</span>
                            <span><strong>Saldo Check-in: $900.000 COP</strong></span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', paddingBottom: '0.2rem' }}>
                            <span>2. Alimentación Paraíso Terrenal ($480.000):</span>
                            <span><strong>Saldo Comida: $480.000 COP</strong></span>
                          </div>
                        </div>
                      )}

                      {/* Términos en miniatura */}
                      <div style={{ fontSize: '0.64rem', color: '#555', fontStyle: 'italic', background: '#faf9f6', padding: '0.45rem', borderRadius: '4px' }}>
                        {docSubTab === 'cotizacion' && (plantillas.vigencia_cotizacion ? plantillas.vigencia_cotizacion.slice(0, 160) + '...' : '• Vigencia de 5 días hábiles...')}
                        {docSubTab === 'separacion' && (plantillas.clausulas_separacion ? plantillas.clausulas_separacion.slice(0, 160) + '...' : '• La separación bloquea la disponibilidad...')}
                        {docSubTab === 'paz_salvo' && (plantillas.texto_paz_salvo || 'Se expide el presente paz y salvo...')}
                        {docSubTab === 'menu' && (plantillas.condiciones_gastronomicas ? plantillas.condiciones_gastronomicas.slice(0, 160) + '...' : '• Preparación con ingredientes seleccionados...')}
                        {docSubTab === 'abono' && (formData.textos_legales ? formData.textos_legales.slice(0, 160) + '...' : '• Válido como comprobante de pago...')}
                        {docSubTab === 'estado_cuenta' && (formData.textos_legales ? formData.textos_legales.slice(0, 160) + '...' : '• Documento expedido de conformidad...')}
                        {docSubTab === 'membrete' && 'Encabezado y pie aplicables a todos los documentos del sistema.'}
                      </div>

                      {/* Firma Oficial de Administración Simulada (Sin firma de cliente) */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginTop: '0.6rem',
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '0.5rem',
                        fontSize: '0.65rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center'
                        }}>
                          {(formData.firma_digital_url || plantillas.firma_digital_url) ? (
                            <img
                              src={formData.firma_digital_url || plantillas.firma_digital_url || ''}
                              alt="Firma Digital"
                              style={{
                                maxHeight: '38px',
                                maxWidth: '130px',
                                objectFit: 'contain',
                                marginBottom: '-4px',
                                filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))'
                              }}
                            />
                          ) : (
                            <div style={{ height: '24px' }} />
                          )}
                          <div style={{ width: '130px', borderBottom: '1.5px solid #1e1b13', marginBottom: '2px' }} />
                          <span style={{ fontWeight: 700, color: '#1a6b5e', fontSize: '0.68rem' }}>
                            {plantillas.pie_firma_admin || 'Administración • Paraíso Terrenal'}
                          </span>
                          <span style={{ fontSize: '0.55rem', color: '#64748b' }}>Firma Autorizada Paraíso Terrenal</span>
                        </div>
                      </div>
                    </div>

                    {/* Pie de Página Esmeralda Institucional */}
                    <div style={{
                      background: '#1a6b5e',
                      color: '#ffffff',
                      padding: '0.5rem 1rem',
                      textAlign: 'center',
                      fontSize: '0.65rem',
                      borderTop: '1px solid #d4ac3f'
                    }}>
                      <div>{formData.doc_pie_pagina || 'Paraíso Terrenal • Fincas de Alquiler • Documento oficial generado automáticamente'}</div>
                      <div style={{ fontSize: '0.58rem', opacity: 0.85, marginTop: '0.1rem' }}>
                        {formData.doc_contacto_info || 'WhatsApp: +57 317 682 7093 | reservas@fincascampestres.com'}
                      </div>
                    </div>
                  </motion.div>

                  {/* Botón interactivo de descarga de prueba directa */}
                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span className="text-xs text-muted">
                      Descarga el documento real emitido por jsPDF con tus ajustes actuales:
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary text-xs"
                      onClick={() => emitirPrueba(docSubTab)}
                      disabled={descargandoPrueba}
                      style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Download size={14} /> {descargandoPrueba ? 'Generando PDF...' : `Descargar Muestra (${docSubTab.toUpperCase()})`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* PILAR 3: CUENTAS BANCARIAS & SEPARACIÓN DE SERVICIOS */}
        {/* ------------------------------------------------------------ */}
        {activeTab === 'cuentas' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}
          >
            {/* TARJETA 1: CUENTA DE LA ADMINISTRACIÓN (PARAÍSO TERRENAL) */}
            <div className="panel" style={{ border: '1.5px solid rgba(26, 107, 94, 0.4)' }}>
              <div className="panel-header">
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UtensilsCrossed size={17} style={{ color: 'var(--primary)' }} /> Cuenta de la Administración — Paraíso Terrenal
                </div>
                <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>100% Alimentación</span>
              </div>

              {/* Banner explicativo de separación de servicios */}
              <div style={{
                background: 'rgba(26, 107, 94, 0.08)',
                border: '1px solid rgba(26, 107, 94, 0.2)',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem',
                fontSize: '0.78rem',
                color: 'var(--text)'
              }}>
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Info size={14} /> Recaudo Exclusivo de Menús y Servicios Gastronómicos
                </div>
                Esta cuenta bancaria institucional se imprime automáticamente en <strong>Cotizaciones</strong>, <strong>Separaciones</strong>, <strong>Estados de Cuenta</strong> y <strong>Propuestas de Menú</strong> para que el cliente transfiera el 100% del valor de la alimentación directamente a Paraíso Terrenal.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="field">
                  <label>Entidad Bancaria de la Administración *</label>
                  <input
                    type="text"
                    required
                    value={formData.banco_nombre || 'Bancolombia'}
                    onChange={e => handleChange('banco_nombre', e.target.value)}
                    placeholder="Ej: Bancolombia, Davivienda, Nequi"
                  />
                </div>

                <div className="field">
                  <label>Tipo de Cuenta Bancaria *</label>
                  <select
                    value={formData.banco_tipo_cuenta || 'Ahorros'}
                    onChange={e => handleChange('banco_tipo_cuenta', e.target.value)}
                    className="btn btn-sm"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  >
                    <option value="Ahorros">Cuenta de Ahorros</option>
                    <option value="Corriente">Cuenta Corriente</option>
                    <option value="Nequi / Daviplata">Billetera Digital (Nequi / Daviplata)</option>
                  </select>
                </div>

                <div className="field">
                  <label>Número de Cuenta para Alimentación *</label>
                  <input
                    type="text"
                    required
                    value={formData.banco_cuenta || ''}
                    onChange={e => handleChange('banco_cuenta', e.target.value)}
                    placeholder="Ej: 315-000000-99"
                  />
                </div>

                <div className="field">
                  <label>Nombre del Titular de la Cuenta *</label>
                  <input
                    type="text"
                    required
                    value={formData.banco_titular || 'Paraíso Terrenal - Fincas de Alquiler'}
                    onChange={e => handleChange('banco_titular', e.target.value)}
                    placeholder="Ej: Paraíso Terrenal - Fincas de Alquiler"
                  />
                </div>

                <div className="field">
                  <label>NIT / Cédula del Titular *</label>
                  <input
                    type="text"
                    value={formData.banco_identificacion || ''}
                    onChange={e => handleChange('banco_identificacion', e.target.value)}
                    placeholder="Ej: 900.123.456-7"
                  />
                </div>
              </div>
            </div>

            {/* TARJETA 2: EXPLICACIÓN DE CUENTAS DE ALOJAMIENTO (PROPIETARIOS DE FINCAS) */}
            <div className="panel" style={{ border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div className="panel-header">
                  <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CreditCard size={17} style={{ color: '#ca8a04' }} /> Cuentas de Alojamiento — Propietarios de Fincas
                  </div>
                  <span className="badge" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a', fontSize: '0.68rem' }}>
                    Configuración por Finca
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text)' }}>
                  <p style={{ margin: 0 }}>
                    Para garantizar la <strong>separación transparente de servicios</strong>, los datos bancarios del alojamiento corresponden a cada finca de manera individual:
                  </p>

                  <div style={{
                    background: 'var(--surface-2)',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem'
                  }}>
                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      1. Anticipo de Finca (50%):
                    </div>
                    <div className="text-xs text-muted">
                      El cliente realiza el abono para bloquear las fechas en el calendario.
                    </div>

                    <div style={{ fontWeight: 600, color: '#a16207', marginTop: '0.35rem' }}>
                      2. Saldo de Alojamiento al Check-in:
                    </div>
                    <div className="text-xs text-muted">
                      El saldo restante de hospedaje se liquida directamente al propietario el día de la llegada a su cuenta registrada.
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    💡 Los datos bancarios de cada propietario se configuran en el formulario de edición de cada finca dentro del módulo <strong>Fincas</strong>.
                  </div>
                </div>
              </div>

              {/* TARJETA 3: REGLA OPERATIVA DE ALIMENTACIÓN MÍNIMA */}
              <div style={{
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)' }}>
                    <Sliders size={15} /> Regla Operativa de Alimentación Mínima
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={formData.regla_alimentacion_activa ?? true}
                      onChange={e => handleChange('regla_alimentacion_activa', e.target.checked)}
                    />
                    {formData.regla_alimentacion_activa ? 'Activa' : 'Inactiva'}
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="field">
                    <label>Hasta cuántas personas aplica:</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={formData.regla_alimentacion_max_personas ?? 10}
                      onChange={e => handleChange('regla_alimentacion_max_personas', parseInt(e.target.value) || 10)}
                    />
                  </div>

                  <div className="field">
                    <label>Mínimo de servicios requeridos:</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={formData.regla_alimentacion_min_servicios ?? 2}
                      onChange={e => handleChange('regla_alimentacion_min_servicios', parseInt(e.target.value) || 2)}
                    />
                  </div>
                </div>

                <div className="field" style={{ marginTop: '0.5rem' }}>
                  <label>Mensaje de advertencia para cotizadores:</label>
                  <textarea
                    rows={2}
                    value={formData.regla_alimentacion_mensaje || ''}
                    onChange={e => handleChange('regla_alimentacion_mensaje', e.target.value)}
                    placeholder="Para grupos de hasta 10 personas, como mínimo se debe contratar servicio de desayuno y almuerzo..."
                    style={{ fontSize: '0.78rem' }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/* BARRA FLOTANTE DE GUARDADO AL FINAL */}
        {/* ============================================================== */}
        <div style={{
          marginTop: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1rem 1.25rem',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={15} style={{ color: 'var(--primary)' }} />
            Tus cambios se sincronizan en Supabase y se aplican al instante en el portal del cliente y documentos PDF.
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {hayCambios && (
              <span className="text-xs" style={{ color: '#b45309', fontWeight: 600 }}>
                ● Cambios sin guardar
              </span>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={guardando}
              style={{ fontWeight: 600, padding: '0.65rem 1.75rem', fontSize: '0.88rem' }}
            >
              <Save size={16} /> {guardando ? 'Guardando en Supabase...' : 'Guardar Toda la Configuración'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
