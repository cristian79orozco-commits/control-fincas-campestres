import React, { useState, useEffect } from 'react';
import {
  Building2, FileText, Scale, Hash, Check, Save, RotateCcw,
  Download, Eye, Globe, Phone, Mail, MapPin, Share2, Sparkles,
  ShieldCheck, AlertCircle, Info, ExternalLink
} from 'lucide-react';
import type { ConfiguracionGeneral } from '../types';
import {
  generarDocSeparacion,
  generarDocCotizacion,
  generarEstadoCuenta,
  generarPazYSalvo,
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

type TabType = 'empresa' | 'documentos' | 'legales' | 'consecutivos' | 'pruebas';

export const AdminConfiguracion: React.FC<AdminConfiguracionProps> = ({
  config,
  guardando,
  onGuardar,
  onRestablecer,
  onSaveWaNumber,
  showToast,
  openConfirm,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('empresa');
  const [formData, setFormData] = useState<ConfiguracionGeneral>(config);
  const [hayCambios, setHayCambios] = useState(false);

  // Actualizar estado local si config externa cambia
  useEffect(() => {
    setFormData(config);
    setHayCambios(false);
  }, [config]);

  const handleChange = (campo: keyof ConfiguracionGeneral, valor: any) => {
    setFormData(prev => {
      const updated = { ...prev, [campo]: valor };
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
      showToast('Configuración general guardada exitosamente ✅', 'success');
    } else {
      showToast(res.error || 'Error al guardar la configuración', 'error');
    }
  };

  const handleRestablecer = () => {
    openConfirm(
      '¿Restablecer configuración predeterminada?',
      'Esta acción devolverá los datos de la empresa, numeraciones, textos legales y encabezados a los valores originales de fábrica.',
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

  // Muestra de prueba en vivo
  const emitirPrueba = (tipo: 'separacion' | 'cotizacion' | 'estado_cuenta' | 'paz_salvo') => {
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
        zona: 'Santa Elena, Valle',
        capacidad: 20,
        precio_pp: 75000,
        estado: 'disponible' as const,
        activo: true,
      };

      const demoReserva: any = {
        id: 'demo-reserva-8899',
        cliente_id: 'demo-cli',
        finca_id: 'demo-finca',
        fecha_inicio: '2026-11-15',
        fecha_fin: '2026-11-17',
        personas: 12,
        valor_total: 1800000,
        separacion: 900000,
        estado: 'activa',
        clientes: demoCliente,
        fincas: demoFinca,
        pagos: [
          {
            id: 'demo-pago-01',
            reserva_id: 'demo-reserva-8899',
            tipo: 'separacion' as const,
            fecha: '2026-10-01',
            valor: 900000,
            observacion: 'Transferencia Bancolombia - Abono inicial 50%',
          },
        ],
      };

      if (tipo === 'separacion') {
        generarDocSeparacion(demoReserva, formData);
        showToast('Documento de Separación de prueba generado ✅', 'success');
      } else if (tipo === 'cotizacion') {
        const demoCot: any = {
          id: 'demo-cot-7744',
          cliente_id: 'demo-cli',
          finca_id: 'demo-finca',
          fecha_inicio: '2026-11-15',
          fecha_fin: '2026-11-17',
          personas: 12,
          subtotal_alojamiento: 1800000,
          costo_alimentacion: 480000,
          descuento: 80000,
          recargo: 0,
          total: 2200000,
          estado: 'cotizada',
          clientes: demoCliente,
          fincas: demoFinca,
          alimentacion: 'Asado campestre gourmet + Desayuno típico',
        };
        generarDocCotizacion(demoCot, formData);
        showToast('Cotización de prueba generada ✅', 'success');
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
              reserva_id: 'demo-reserva-8899',
              tipo: 'pago_total' as const,
              fecha: '2026-10-10',
              valor: 900000,
              observacion: 'Saldo cancelado en totalidad',
            },
          ],
        };
        generarPazYSalvo(reservaPagada, formData);
        showToast('Paz y Salvo de prueba generado ✅', 'success');
      }
    } catch (err) {
      console.error('Error generando prueba:', err);
      showToast('Error al generar documento de prueba', 'error');
    }
  };

  return (
    <div className="admin-configuracion-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Encabezado Principal */}
      <div className="panel" style={{ padding: '1.5rem', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                background: 'rgba(26, 107, 94, 0.12)',
                color: 'var(--primary)',
                padding: '0.55rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Building2 size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, margin: 0 }}>
                  Configuración General
                </h1>
                <p className="text-xs text-muted" style={{ margin: '0.2rem 0 0' }}>
                  Fase 4 • Parámetros de la empresa, identidad de marca, plantillas de documentos oficiales y consecutivos
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
            {hayCambios && (
              <span className="badge" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}>
                <AlertCircle size={12} style={{ marginRight: '0.25rem' }} /> Cambios sin guardar
              </span>
            )}
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={handleRestablecer}
              disabled={guardando}
              title="Restablecer valores por defecto"
            >
              <RotateCcw size={14} /> Restablecer
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleGuardar()}
              disabled={guardando}
              style={{ fontWeight: 600 }}
            >
              <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginTop: '1.25rem',
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
          paddingBottom: '0.25rem'
        }}>
          <button
            type="button"
            className={`btn text-xs ${activeTab === 'empresa' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('empresa')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Building2 size={15} /> Empresa & Contacto
          </button>
          <button
            type="button"
            className={`btn text-xs ${activeTab === 'documentos' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('documentos')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <FileText size={15} /> Diseño & Encabezados PDF
          </button>
          <button
            type="button"
            className={`btn text-xs ${activeTab === 'legales' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('legales')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Scale size={15} /> Términos Legales & Políticas
          </button>
          <button
            type="button"
            className={`btn text-xs ${activeTab === 'consecutivos' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('consecutivos')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Hash size={15} /> Prefijos & Numeración
          </button>
          <button
            type="button"
            className={`btn text-xs ${activeTab === 'pruebas' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('pruebas')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={15} /> Muestras & Pruebas en Vivo
          </button>
        </div>
      </div>

      {/* Contenido de Cada Pestaña */}
      <form onSubmit={handleGuardar}>
        {/* TAB 1: EMPRESA */}
        {activeTab === 'empresa' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={17} style={{ color: 'var(--primary)' }} /> Identidad Institucional
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="field">
                  <label>Nombre de la Empresa o Marca Comercial *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre_empresa}
                    onChange={e => handleChange('nombre_empresa', e.target.value)}
                    placeholder="Ej: Control de Fincas Campestres"
                  />
                </div>

                <div className="field">
                  <label>NIT / Identificación Tributaria</label>
                  <input
                    type="text"
                    value={formData.nit || ''}
                    onChange={e => handleChange('nit', e.target.value)}
                    placeholder="Ej: 900.123.456-7"
                  />
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
                  <div style={{ position: 'relative' }}>
                    <input
                      type="url"
                      value={formData.sitio_web || ''}
                      onChange={e => handleChange('sitio_web', e.target.value)}
                      placeholder="https://fincascampestres.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={17} style={{ color: 'var(--primary)' }} /> Canales de Contacto
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="field">
                  <label>WhatsApp de Contacto Principal * (10 dígitos con indicativo)</label>
                  <input
                    type="tel"
                    required
                    value={formData.whatsapp}
                    onChange={e => handleChange('whatsapp', e.target.value)}
                    placeholder="573176827093"
                  />
                  <span className="text-xs text-muted">
                    Se utiliza automáticamente en todos los enlaces de reservas, cotizaciones y documentos.
                  </span>
                </div>

                <div className="field">
                  <label>Teléfono Fijo / Celular para Documentos</label>
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
                  <label>Dirección Física / Ubicación Operativa</label>
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

            <div className="panel" style={{ gridColumn: '1 / -1' }}>
              <div className="panel-header">
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Share2 size={17} style={{ color: 'var(--primary)' }} /> Presencia en Redes Sociales
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
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
                  <label>Instagram</label>
                  <input
                    type="url"
                    value={formData.redes_sociales?.instagram || ''}
                    onChange={e => handleRedesChange('instagram', e.target.value)}
                    placeholder="https://instagram.com/tu_cuenta"
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
          </div>
        )}

        {/* TAB 2: DOCUMENTOS */}
        {activeTab === 'documentos' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={17} style={{ color: 'var(--primary)' }} /> Estructura de Documentos PDF
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="field">
                  <label>Encabezado Superior de Documentos</label>
                  <input
                    type="text"
                    value={formData.doc_encabezado || ''}
                    onChange={e => handleChange('doc_encabezado', e.target.value)}
                    placeholder="CONTROL DE FINCAS CAMPESTRES — ALQUILER Y SERVICIOS TURÍSTICOS"
                  />
                  <span className="text-xs text-muted">
                    Texto que identifica formalmente la razón de ser comercial en el título del membrete.
                  </span>
                </div>

                <div className="field">
                  <label>Texto del Pie de Página Principal</label>
                  <input
                    type="text"
                    value={formData.doc_pie_pagina || ''}
                    onChange={e => handleChange('doc_pie_pagina', e.target.value)}
                    placeholder="Control de Fincas Campestres • Documento oficial generado automáticamente"
                  />
                  <span className="text-xs text-muted">
                    Aparece centrado en la franja inferior de cada documento emitido.
                  </span>
                </div>

                <div className="field">
                  <label>Información de Contacto a Pie de Página</label>
                  <input
                    type="text"
                    value={formData.doc_contacto_info || ''}
                    onChange={e => handleChange('doc_contacto_info', e.target.value)}
                    placeholder="WhatsApp: +57 317 682 7093 | reservas@fincascampestres.com | Santa Elena, Valle"
                  />
                  <span className="text-xs text-muted">
                    Línea complementaria visible en el pie de página con datos de atención y soporte.
                  </span>
                </div>
              </div>
            </div>

            {/* Vista previa en vivo del diseño del encabezado y pie */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div className="panel-header">
                  <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Eye size={17} style={{ color: 'var(--primary)' }} /> Vista Previa Visual del Membrete
                  </div>
                </div>

                {/* Simulación del encabezado PDF */}
                <div style={{
                  background: '#1a6b5e',
                  color: '#ffffff',
                  padding: '1.25rem 1rem',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                        {formData.nombre_empresa || 'Control de Fincas Campestres'}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontStyle: 'italic', opacity: 0.9, marginTop: '0.15rem' }}>
                        {formData.eslogan || 'Experiencias exclusivas y descanso en la naturaleza'}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.65rem' }}>
                        DOCUMENTO OFICIAL (EJEMPLO)
                      </div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.85, marginTop: '0.2rem' }}>
                        {formData.nit ? `NIT: ${formData.nit}` : ''} {formData.telefono ? `• ${formData.telefono}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        background: 'rgba(255,255,255,0.2)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}>
                        {formData.prefijo_separacion || 'SEP-'}1001
                      </div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.85, marginTop: '0.35rem' }}>
                        Emitido: {new Date().toLocaleDateString('es-CO')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cuerpo simulado */}
                <div style={{
                  background: 'var(--bg-main)',
                  padding: '1rem',
                  borderLeft: '1px solid var(--border)',
                  borderRight: '1px solid var(--border)',
                  minHeight: '110px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  <div style={{ background: 'var(--surface)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <strong>Cliente:</strong> Carlos Rodríguez • <strong>Finca:</strong> Villa Paraíso
                  </div>
                  <div style={{ fontStyle: 'italic', fontSize: '0.7rem' }}>
                    [Contenido dinámico: Fechas, valores, abonos y detalle económico de la reserva]
                  </div>
                </div>

                {/* Simulación del pie de página PDF */}
                <div style={{
                  background: '#1a6b5e',
                  color: '#ffffff',
                  padding: '0.65rem 1rem',
                  borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem' }}>
                    {formData.doc_pie_pagina || 'Control de Fincas Campestres • Documento oficial generado automáticamente'}
                  </div>
                  <div style={{ fontSize: '0.62rem', opacity: 0.85, marginTop: '0.15rem' }}>
                    {formData.doc_contacto_info || 'WhatsApp: +57 317 682 7093 | reservas@fincascampestres.com'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <span className="text-xs text-muted">
                  Este membrete se aplica de forma unificada a Separaciones, Cotizaciones, Abonos, Estados de Cuenta y Paz y Salvo.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TÉRMINOS Y LEGALES */}
        {activeTab === 'legales' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Scale size={17} style={{ color: 'var(--primary)' }} /> Términos y Condiciones Generales
                </div>
              </div>
              <div className="field">
                <label>Cláusulas de Reserva y Separación (Aparecen impresas en las Separaciones y Cotizaciones)</label>
                <textarea
                  rows={6}
                  value={formData.terminos_condiciones || ''}
                  onChange={e => handleChange('terminos_condiciones', e.target.value)}
                  placeholder="Escribe cada punto o viñeta en una línea separada..."
                  style={{ fontFamily: 'inherit', fontSize: '0.85rem' }}
                />
                <span className="text-xs text-muted">
                  Tip: Separa cada cláusula con un salto de línea. Cada línea se imprimirá con su viñeta correspondiente en el PDF.
                </span>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={17} style={{ color: 'var(--primary)' }} /> Políticas de Cancelación y Reprogramación
                </div>
              </div>
              <div className="field">
                <label>Políticas de Cancelación, Reembolso y Cambios de Fecha</label>
                <textarea
                  rows={4}
                  value={formData.politicas_cancelacion || ''}
                  onChange={e => handleChange('politicas_cancelacion', e.target.value)}
                  placeholder="Detalla los plazos y condiciones en caso de cancelación de la reserva..."
                  style={{ fontFamily: 'inherit', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={17} style={{ color: 'var(--primary)' }} /> Textos Legales y Declaración de Conformidad
                </div>
              </div>
              <div className="field">
                <label>Declaración de Validez Comercial y Cumplimiento Normativo</label>
                <textarea
                  rows={3}
                  value={formData.textos_legales || ''}
                  onChange={e => handleChange('textos_legales', e.target.value)}
                  placeholder="Texto legal sobre la validez del comprobante y conformidad contractual..."
                  style={{ fontFamily: 'inherit', fontSize: '0.85rem' }}
                />
                <span className="text-xs text-muted">
                  Se incluye en Comprobantes de Abono, Estados de Cuenta y Certificados de Paz y Salvo.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CONSECUTIVOS Y PREFIJOS */}
        {activeTab === 'consecutivos' && (
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Hash size={17} style={{ color: 'var(--primary)' }} /> Numeración y Prefijos Oficiales
              </div>
              <span className="text-xs text-muted">
                Configura los identificadores y consecutivos automáticos de cada tipo de documento generado
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
              {/* Cotizaciones */}
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                  Cotizaciones
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="field">
                    <label>Prefijo (Opcional)</label>
                    <input
                      type="text"
                      value={formData.prefijo_cotizacion}
                      onChange={e => handleChange('prefijo_cotizacion', e.target.value)}
                      placeholder="Sin letras (ej: 1001)"
                    />
                  </div>
                  <div className="field">
                    <label>Siguiente #</label>
                    <input
                      type="number"
                      min={1001}
                      value={formData.siguiente_cotizacion}
                      onChange={e => handleChange('siguiente_cotizacion', parseInt(e.target.value) || 1001)}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted mt-1">
                  Muestra: <strong>{formData.prefijo_cotizacion ? `${formData.prefijo_cotizacion}${formData.siguiente_cotizacion}` : formData.siguiente_cotizacion}</strong>
                </div>
              </div>

              {/* Separaciones */}
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                  Documentos de Separación
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="field">
                    <label>Prefijo (Opcional)</label>
                    <input
                      type="text"
                      value={formData.prefijo_separacion}
                      onChange={e => handleChange('prefijo_separacion', e.target.value)}
                      placeholder="Sin letras (ej: 1001)"
                    />
                  </div>
                  <div className="field">
                    <label>Siguiente #</label>
                    <input
                      type="number"
                      min={1001}
                      value={formData.siguiente_separacion}
                      onChange={e => handleChange('siguiente_separacion', parseInt(e.target.value) || 1001)}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted mt-1">
                  Muestra: <strong>{formData.prefijo_separacion ? `${formData.prefijo_separacion}${formData.siguiente_separacion}` : formData.siguiente_separacion}</strong>
                </div>
              </div>

              {/* Abonos */}
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                  Comprobantes de Abono
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="field">
                    <label>Prefijo</label>
                    <input
                      type="text"
                      value={formData.prefijo_abono}
                      onChange={e => handleChange('prefijo_abono', e.target.value)}
                      placeholder="PAG-"
                    />
                  </div>
                  <div className="field">
                    <label>Siguiente #</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.siguiente_abono}
                      onChange={e => handleChange('siguiente_abono', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted mt-1">
                  Muestra: <strong>{formData.prefijo_abono}{formData.siguiente_abono}</strong>
                </div>
              </div>

              {/* Estado de Cuenta */}
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                  Estados de Cuenta
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="field">
                    <label>Prefijo</label>
                    <input
                      type="text"
                      value={formData.prefijo_estado_cuenta}
                      onChange={e => handleChange('prefijo_estado_cuenta', e.target.value)}
                      placeholder="EC-"
                    />
                  </div>
                  <div className="field">
                    <label>Siguiente #</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.siguiente_estado_cuenta}
                      onChange={e => handleChange('siguiente_estado_cuenta', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted mt-1">
                  Muestra: <strong>{formData.prefijo_estado_cuenta}{formData.siguiente_estado_cuenta}</strong>
                </div>
              </div>

              {/* Paz y Salvo */}
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                  Certificados de Paz y Salvo
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="field">
                    <label>Prefijo</label>
                    <input
                      type="text"
                      value={formData.prefijo_paz_salvo}
                      onChange={e => handleChange('prefijo_paz_salvo', e.target.value)}
                      placeholder="PS-"
                    />
                  </div>
                  <div className="field">
                    <label>Siguiente #</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.siguiente_paz_salvo}
                      onChange={e => handleChange('siguiente_paz_salvo', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted mt-1">
                  Muestra: <strong>{formData.prefijo_paz_salvo}{formData.siguiente_paz_salvo}</strong>
                </div>
              </div>

              {/* Propuestas Gastronómicas */}
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                  Propuestas de Menú
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="field">
                    <label>Prefijo</label>
                    <input
                      type="text"
                      value={formData.prefijo_propuesta_menu}
                      onChange={e => handleChange('prefijo_propuesta_menu', e.target.value)}
                      placeholder="PROP-"
                    />
                  </div>
                  <div className="field">
                    <label>Siguiente #</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.siguiente_propuesta_menu}
                      onChange={e => handleChange('siguiente_propuesta_menu', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted mt-1">
                  Muestra: <strong>{formData.prefijo_propuesta_menu}{formData.siguiente_propuesta_menu}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PRUEBAS Y DESCARGAS */}
        {activeTab === 'pruebas' && (
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={17} style={{ color: 'var(--primary)' }} /> Generación y Verificación de Documentos en Vivo
              </div>
              <span className="text-xs text-muted">
                Prueba en tiempo real cómo lucen los documentos PDF con la configuración activa
              </span>
            </div>

            <p className="text-xs text-muted" style={{ marginBottom: '1.25rem' }}>
              Haz clic en cualquiera de los botones para generar y descargar un documento de prueba con la identidad corporativa, términos y numeración que acabas de configurar:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div style={{
                background: 'var(--bg-main)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                    Documento de Separación
                  </div>
                  <p className="text-xs text-muted" style={{ margin: 0 }}>
                    Incluye membrete, desglose de saldo pendiente y términos de reserva.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary text-xs mt-3"
                  onClick={() => emitirPrueba('separacion')}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Download size={14} /> Descargar Separación PDF
                </button>
              </div>

              <div style={{
                background: 'var(--bg-main)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                    Cotización Formal
                  </div>
                  <p className="text-xs text-muted" style={{ margin: 0 }}>
                    Propuesta de valor con alimentación, alojamiento y validez de cotización.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary text-xs mt-3"
                  onClick={() => emitirPrueba('cotizacion')}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Download size={14} /> Descargar Cotización PDF
                </button>
              </div>

              <div style={{
                background: 'var(--bg-main)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                    Estado de Cuenta
                  </div>
                  <p className="text-xs text-muted" style={{ margin: 0 }}>
                    Historial consolidado de abonos, saldo y textos legales de conformidad.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary text-xs mt-3"
                  onClick={() => emitirPrueba('estado_cuenta')}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Download size={14} /> Descargar Estado Cuenta PDF
                </button>
              </div>

              <div style={{
                background: 'var(--bg-main)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                    Certificado de Paz y Salvo
                  </div>
                  <p className="text-xs text-muted" style={{ margin: 0 }}>
                    Sello visual de pago 100% completado, certificación y firmas.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary text-xs mt-3"
                  onClick={() => emitirPrueba('paz_salvo')}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Download size={14} /> Descargar Paz y Salvo PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Barra Flotante de Guardar al Final */}
        <div style={{
          marginTop: '1.25rem',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          alignItems: 'center'
        }}>
          {hayCambios && (
            <span className="text-xs text-muted">
              Recuerda guardar para aplicar los cambios en Supabase y el sistema
            </span>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={guardando}
            style={{ fontWeight: 600, padding: '0.65rem 1.5rem' }}
          >
            <Save size={16} /> {guardando ? 'Guardando en Supabase...' : 'Guardar Toda la Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
};
