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
  guardarFirmaEnCacheLocal,
  precargarFirmaDataUrl,
  KEY_FIRMA_CACHE_LOCAL,
  firmaDataUrlCache,
} from '../services/documentos';
import { procesarFirmaTransparente, formatearBytes } from '../utils/imageOptimizer';
import { PdfStudioViewer } from './configuracion/PdfStudioViewer';
import { PdfSignatureMapper } from './configuracion/PdfSignatureMapper';
import { PdfStyleCustomizer } from './configuracion/PdfStyleCustomizer';
import { usePdfConfigController, type DocumentoSubTab } from '../hooks/usePdfConfigController';

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
  const [infoFirmaOptimizada, setInfoFirmaOptimizada] = useState<string | null>(null);

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

  const handlePlantillaPdfChange = (campo: keyof PlantillasPdfPersonalizadas, valor: any) => {
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

  // Controlador desacoplado del estudio de PDFs (Capa 2 Arquitectura)
  const {
    docSubTab,
    setDocSubTab,
    viewerMode,
    setViewerMode,
    zoomLevel,
    zoomIn,
    zoomOut,
    zoomReset,
    sincronizandoBD,
    generandoPreviewPdf,
    previewPdfBlobUrl,
    refrescarDatosDesdeBD,
  } = usePdfConfigController({
    formData,
    onChangeCampo: handleChange,
    onChangePlantilla: handlePlantillaPdfChange,
    showToast,
  });

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
    setInfoFirmaOptimizada(null);

    try {
      showToast('Procesando firma: retirando fondo blanco y optimizando trazo...', 'info');

      // 1. Detección de fondo, remoción automática de blanco, auto-crop y compresión PNG
      const resultado = await procesarFirmaTransparente(file);

      // Guardar inmediatamente en caché DataURL para que los PDF de muestra y reales dispongan de la imagen al instante
      guardarFirmaEnCacheLocal(resultado.dataUrl, resultado.dataUrl);

      // 2. Intentar subir el archivo PNG transparente y liviano (~15-35 KB) a Supabase Storage
      let finalUrl = resultado.dataUrl;
      try {
        const { supabase } = await import('../services/supabase');
        const path = `firmas/firma_admin_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('finca-imagenes')
          .upload(path, resultado.blob, { upsert: true, contentType: 'image/png' });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('finca-imagenes').getPublicUrl(path);
          if (urlData?.publicUrl) {
            finalUrl = urlData.publicUrl;
            guardarFirmaEnCacheLocal(finalUrl, resultado.dataUrl);
          }
        } else {
          console.warn('[AdminConfiguracion] Supabase Storage aviso:', uploadError.message, 'usando DataURL optimizada');
        }
      } catch (storageErr) {
        console.warn('[AdminConfiguracion] Error conectando a Storage, usando DataURL ultraliviana:', storageErr);
      }

      // 3. Actualizar estado local reactivo
      const nuevoForm = {
        ...formData,
        firma_digital_url: finalUrl,
        plantillas_pdf: {
          ...(formData.plantillas_pdf || {}),
          firma_digital_url: finalUrl,
        },
      };
      setFormData(nuevoForm);

      const resumenPeso = `${formatearBytes(resultado.originalBytes)} ➔ ${formatearBytes(resultado.optimizedBytes)}`;
      const detalleTexto = resultado.fondoRemovido
        ? `Fondo blanco retirado · 100% transparente · Reducida (${resumenPeso})`
        : `Firma recortada y optimizada · ${resumenPeso}`;
      setInfoFirmaOptimizada(detalleTexto);

      // 4. Persistencia inmediata y automática en Supabase (evita que el usuario deba buscar otro botón de guardar)
      try {
        let cleanWa = (nuevoForm.whatsapp || '').replace(/[^0-9]/g, '');
        if (cleanWa.length < 10) cleanWa = '573176827093';

        const payloadAutoGuardado: ConfiguracionGeneral = {
          ...nuevoForm,
          whatsapp: cleanWa,
          firma_digital_url: finalUrl,
          plantillas_pdf: {
            ...(nuevoForm.plantillas_pdf || {}),
            firma_digital_url: finalUrl,
          },
        };

        const resAuto = await onGuardar(payloadAutoGuardado);
        if (resAuto && resAuto.success) {
          setHayCambios(false);
          showToast(`Firma digital subida, guardada e implementada con éxito ✅ (${resumenPeso})`, 'success');
        } else {
          setHayCambios(true);
          showToast(`Firma optimizada (${resumenPeso}). Haz clic en Guardar para confirmar en la base de datos.`, 'info');
        }
      } catch (saveErr) {
        console.warn('[AdminConfiguracion] Error en autoguardado de firma:', saveErr);
        setHayCambios(true);
        showToast(`Firma optimizada (${resumenPeso}). Haz clic en Guardar para confirmar en la base de datos.`, 'info');
      }
    } catch (err: any) {
      console.error('Error al procesar la imagen de firma:', err);
      showToast(err?.message || 'No se pudo procesar la firma seleccionada', 'error');
    } finally {
      setSubiendoFirma(false);
      e.target.value = '';
    }
  };

  const handleEliminarFirmaDigital = async () => {
    try {
      localStorage.removeItem(KEY_FIRMA_CACHE_LOCAL);
      firmaDataUrlCache.clear();
    } catch {
      // ignorar
    }

    const nuevoForm = {
      ...formData,
      firma_digital_url: '',
      plantillas_pdf: {
        ...(formData.plantillas_pdf || {}),
        firma_digital_url: '',
      },
    };
    setFormData(nuevoForm);
    setInfoFirmaOptimizada(null);

    try {
      let cleanWa = (nuevoForm.whatsapp || '').replace(/[^0-9]/g, '');
      if (cleanWa.length < 10) cleanWa = '573176827093';

      const payloadEliminacion: ConfiguracionGeneral = {
        ...nuevoForm,
        whatsapp: cleanWa,
        firma_digital_url: '',
        plantillas_pdf: {
          ...(nuevoForm.plantillas_pdf || {}),
          firma_digital_url: '',
        },
      };

      const res = await onGuardar(payloadEliminacion);
      if (res && res.success) {
        setHayCambios(false);
        showToast('Firma digital retirada y guardada en el sistema exitosamente ✅', 'info');
      } else {
        setHayCambios(true);
        showToast('Firma digital retirada localmente. Pulsa Guardar para aplicar cambios.', 'info');
      }
    } catch {
      setHayCambios(true);
      showToast('Firma digital retirada localmente. Pulsa Guardar para aplicar cambios.', 'info');
    }
  };

  const handleGuardar = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    let cleanWa = (formData.whatsapp || '').replace(/[^0-9]/g, '');
    if (cleanWa.length < 10) {
      cleanWa = '573176827093'; // Fallback a WhatsApp oficial para nunca bloquear el guardado
    }

    const firmaFinal = formData.firma_digital_url || formData.plantillas_pdf?.firma_digital_url || '';

    const payload: ConfiguracionGeneral = {
      ...formData,
      whatsapp: cleanWa,
      firma_digital_url: firmaFinal,
      plantillas_pdf: {
        ...(formData.plantillas_pdf || {}),
        firma_digital_url: firmaFinal,
      },
    };

    try {
      console.log('[AdminConfiguracion] Ejecutando guardado centralizado...');
      const res = await onGuardar(payload);
      if (res && res.success) {
        if (onSaveWaNumber) {
          onSaveWaNumber(cleanWa);
        }
        setHayCambios(false);
        showToast('Configuración y firma digital guardadas exitosamente ✅', 'success');
      } else {
        const msg = res?.error || 'Error al guardar la configuración';
        console.error('[AdminConfiguracion] Error retornado por onGuardar:', msg);
        showToast(`Error al guardar: ${msg}`, 'error');
      }
    } catch (err: any) {
      console.error('[AdminConfiguracion] Error de conexión al guardar:', err);
      showToast(`Error de conexión al guardar: ${err?.message || 'Error inesperado'}`, 'error');
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
      const firmaUrlEfectiva = formData.firma_digital_url || formData.plantillas_pdf?.firma_digital_url;
      if (firmaUrlEfectiva && typeof firmaUrlEfectiva === 'string' && firmaUrlEfectiva.trim().length > 0) {
        await precargarFirmaDataUrl(firmaUrlEfectiva);
      }

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
                  { id: 'membrete', label: 'Firma Digital & Membrete', icon: '✍️' },
                  { id: 'diseno', label: 'Estilos & Paleta PDF', icon: '🎨' },
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

                {/* 7. MEMBRETE Y PIE GENERAL (INCLUYE FIRMA DIGITAL CALIBRADA) */}
                {docSubTab === 'membrete' && (
                  <>
                    <div className="panel-header">
                      <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={17} style={{ color: 'var(--primary)' }} /> Membrete, Logo Oficial & Firma Digital
                      </div>
                      <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>Aplica a Todos los Documentos</span>
                    </div>

                    <PdfSignatureMapper
                      firmaUrl={formData.firma_digital_url || plantillas.firma_digital_url || ''}
                      plantillas={plantillas}
                      subiendoFirma={subiendoFirma}
                      infoFirmaOptimizada={infoFirmaOptimizada}
                      onSubirFirma={handleSubirFirmaDigital}
                      onEliminarFirma={handleEliminarFirmaDigital}
                      onChangePlantilla={handlePlantillaPdfChange}
                    />

                    <div className="field">
                      <label>Nombre y Cargo bajo la Línea de Firma</label>
                      <input
                        type="text"
                        value={plantillas.pie_firma_admin || 'Administración • Paraíso Terrenal'}
                        onChange={e => handlePlantillaPdfChange('pie_firma_admin', e.target.value)}
                        placeholder="Ej: Administración • Paraíso Terrenal o Representante Legal"
                      />
                      <span className="text-xs text-muted">Texto impreso directamente debajo de la línea de firma en todos los documentos.</span>
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
                      <span className="text-xs text-muted">Aparece centrado en la franja inferior de cada documento.</span>
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

                {/* 8. REDISEÑO VISUAL & PALETA CROMÁTICA PDF */}
                {docSubTab === 'diseno' && (
                  <>
                    <div className="panel-header">
                      <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sparkles size={17} style={{ color: 'var(--primary)' }} /> Rediseño Visual & Acabados PDF
                      </div>
                      <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>Suite de Estilos Pro</span>
                    </div>

                    <PdfStyleCustomizer
                      formData={formData}
                      plantillas={plantillas}
                      onChangeCampo={handleChange}
                      onChangePlantilla={handlePlantillaPdfChange}
                    />
                  </>
                )}
              </div>

              {/* COLUMNA 2: VISOR INTERACTIVO Y NATIVO (APRYSE & SYNCFUSION SUITE PRO) */}
              <PdfStudioViewer
                docSubTab={docSubTab}
                formData={formData}
                viewerMode={viewerMode}
                zoomLevel={zoomLevel}
                sincronizandoBD={sincronizandoBD}
                generandoPreviewPdf={generandoPreviewPdf}
                previewPdfBlobUrl={previewPdfBlobUrl}
                firmaUrl={formData.firma_digital_url || plantillas.firma_digital_url || ''}
                descargandoPrueba={descargandoPrueba}
                onSetViewerMode={setViewerMode}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onZoomReset={zoomReset}
                onRefrescarBD={refrescarDatosDesdeBD}
                onEmitirPrueba={emitirPrueba}
              />
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
              type="button"
              onClick={() => handleGuardar()}
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
