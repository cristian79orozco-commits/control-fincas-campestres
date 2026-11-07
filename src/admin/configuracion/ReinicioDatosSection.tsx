/**
 * ReinicioDatosSection.tsx
 * Capa 1: Capa Visual / Presentacional (Dumb UI / High-End Design)
 *
 * Módulo de mantenimiento y reinicio quirúrgico de datos de prueba dentro
 * de la sección de Configuración del Administrador.
 *
 * Cumple estrictamente con la guía de estilo fincas-ui-ux y architecture-shield-optimizer:
 * - Paleta oficial de tokens CSS (var(--surface), var(--accent), var(--border), var(--text)).
 * - Card Pro con luces ambientales sutiles y bordes de alta gama.
 * - Validación de seguridad estricta para prevenir eliminaciones accidentales.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw, Trash2, ShieldAlert, CheckCircle2, AlertTriangle,
  RefreshCw, Calendar, ClipboardList, FileText, Users,
  MessageCircle, Home, UtensilsCrossed, Hash, Lock, Check,
  AlertCircle, X, ShieldCheck, Sparkles, Database
} from 'lucide-react';
import {
  useReinicioDatosController,
  type UseReinicioDatosControllerProps,
} from '../../hooks/useReinicioDatosController';
import type { OpcionesReinicioDatos } from '../../types';

export interface ReinicioDatosSectionProps extends UseReinicioDatosControllerProps {}

export const ReinicioDatosSection: React.FC<ReinicioDatosSectionProps> = ({
  showToast,
  onReiniciarPersonalizado,
}) => {
  const {
    opciones,
    conteos,
    cargandoConteos,
    ejecutando,
    modalSeguridadAbierto,
    palabraConfirmacion,
    ultimoResultado,
    totalRegistrosAfectados,
    hayAlgunaOpcionSeleccionada,
    setPalabraConfirmacion,
    toggleOpcion,
    seleccionarTodoPrueba,
    desmarcarTodo,
    abrirModalSeguridad,
    cerrarModalSeguridad,
    ejecutarReinicioDefinitivo,
    refrescarDiagnostico,
  } = useReinicioDatosController({ showToast, onReiniciarPersonalizado });

  const confirmacionEsValida = palabraConfirmacion.trim().toUpperCase() === 'REINICIAR';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ============================================================== */}
      {/* 1. TARJETA HERO: DIAGNÓSTICO & ESTADO EN TIEMPO REAL */}
      {/* ============================================================== */}
      <div
        className="panel"
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1.5rem',
        }}
      >
        {/* Luz ambiental sutil en esquina */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'rgba(212, 146, 74, 0.08)',
            filter: 'blur(45px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(212, 146, 74, 0.15) 100%)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              <Database size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
                  Reinicio y Depuración de Datos
                </h2>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '999px',
                    background: 'rgba(212, 146, 74, 0.12)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(212, 146, 74, 0.3)',
                  }}
                >
                  <Sparkles size={11} /> Ambiente de Pruebas
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Permite purgar de forma controlada reservas, cotizaciones, bloqueos y clientes creados durante pruebas.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={refrescarDiagnostico}
              disabled={cargandoConteos}
              title="Volver a escanear la base de datos"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem' }}
            >
              <RefreshCw size={13} className={cargandoConteos ? 'animate-spin' : ''} />
              {cargandoConteos ? 'Analizando...' : 'Actualizar Conteo'}
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* GRILLA DE DIAGNÓSTICO EN TIEMPO REAL */}
        {/* ============================================================== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
            gap: '0.75rem',
            marginTop: '1.25rem',
          }}
        >
          {/* Item 1: Disponibilidad */}
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'var(--surface-2)',
              border: conteos.disponibilidad > 0 ? '1px solid rgba(212, 146, 74, 0.35)' : '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={13} /> Calendario</span>
              {conteos.disponibilidad > 0 && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
              {conteos.disponibilidad} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>fechas</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: conteos.disponibilidad > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
              {conteos.disponibilidad > 0 ? 'Bloqueadas en calendario' : 'Calendario despejado'}
            </span>
          </div>

          {/* Item 2: Reservas */}
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'var(--surface-2)',
              border: conteos.reservas > 0 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><ClipboardList size={13} /> Reservas</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
              {conteos.reservas} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>registros</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {conteos.pagos} pagos registrados
            </span>
          </div>

          {/* Item 3: Cotizaciones */}
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'var(--surface-2)',
              border: conteos.cotizaciones > 0 ? '1px solid rgba(212, 146, 74, 0.35)' : '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FileText size={13} /> Cotizaciones</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
              {conteos.cotizaciones} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>emitidas</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Próx. consecutivo: #{conteos.siguienteCotizacion}
            </span>
          </div>

          {/* Item 4: Clientes */}
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Users size={13} /> Clientes</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
              {conteos.clientes} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>perfiles</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Contactos en CRM
            </span>
          </div>

          {/* Item 5: Fincas (Protegidas) */}
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(26, 107, 94, 0.08)',
              border: '1px solid rgba(26, 107, 94, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Home size={13} /> Fincas</span>
              <span title="Protegidas por defecto" style={{ display: 'inline-flex' }}><Lock size={11} /></span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
              {conteos.fincas} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>propiedades</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--primary)' }}>
              ● Catálogo Seguro
            </span>
          </div>

          {/* Item 6: Menús (Protegidos) */}
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(26, 107, 94, 0.08)',
              border: '1px solid rgba(26, 107, 94, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><UtensilsCrossed size={13} /> Menús</span>
              <span title="Protegidos por defecto" style={{ display: 'inline-flex' }}><Lock size={11} /></span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
              {conteos.menus} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>platos</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--primary)' }}>
              ● Menús Seguros
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. PANEL PRINCIPAL: SELECCIÓN Y CONFIGURACIÓN DEL REINICIO */}
      {/* ============================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1.5rem' }}>
        {/* COLUMNA IZQUIERDA: OPCIONES DEPURACIÓN */}
        <div
          className="panel"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
                1. Selección de Datos a Purgar
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Marca lo que deseas vaciar. Lo no seleccionado quedará intacto.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                className="btn text-xs"
                onClick={seleccionarTodoPrueba}
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', color: 'var(--accent)', background: 'rgba(212, 146, 74, 0.1)', border: '1px solid rgba(212, 146, 74, 0.25)' }}
              >
                Modo Pruebas
              </button>
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={desmarcarTodo}
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
              >
                Desmarcar Todo
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {/* OPCIÓN 1: DISPONIBILIDAD */}
            <div
              onClick={() => toggleOpcion('disponibilidad')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: opciones.disponibilidad ? 'rgba(212, 146, 74, 0.08)' : 'var(--surface-2)',
                border: opciones.disponibilidad ? '1px solid rgba(212, 146, 74, 0.4)' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: opciones.disponibilidad ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                    background: opciones.disponibilidad ? 'var(--accent)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#141210',
                  }}
                >
                  {opciones.disponibilidad && <Check size={12} strokeWidth={3} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text)' }}>
                    Bloqueos y Fechas de Disponibilidad
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Libera todos los días ocupados en el calendario de las fincas ({conteos.disponibilidad} registros)
                  </div>
                </div>
              </div>
              <span className="badge s-busy" style={{ fontSize: '0.68rem' }}>
                {conteos.disponibilidad} fechas
              </span>
            </div>

            {/* OPCIÓN 2: RESERVAS Y PAGOS */}
            <div
              onClick={() => toggleOpcion('reservasYPagos')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: opciones.reservasYPagos ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface-2)',
                border: opciones.reservasYPagos ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: opciones.reservasYPagos ? '1.5px solid #ef4444' : '1.5px solid var(--border)',
                    background: opciones.reservasYPagos ? '#ef4444' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  {opciones.reservasYPagos && <Check size={12} strokeWidth={3} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text)' }}>
                    Reservas, Pagos y Liquidaciones
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Historial de reservas activas/cerradas, abonos bancarios y cierres ({conteos.reservas} reservas, {conteos.pagos} pagos)
                  </div>
                </div>
              </div>
              <span className="badge" style={{ fontSize: '0.68rem', background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' }}>
                {conteos.reservas}
              </span>
            </div>

            {/* OPCIÓN 3: COTIZACIONES */}
            <div
              onClick={() => toggleOpcion('cotizaciones')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: opciones.cotizaciones ? 'rgba(212, 146, 74, 0.08)' : 'var(--surface-2)',
                border: opciones.cotizaciones ? '1px solid rgba(212, 146, 74, 0.4)' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: opciones.cotizaciones ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                    background: opciones.cotizaciones ? 'var(--accent)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#141210',
                  }}
                >
                  {opciones.cotizaciones && <Check size={12} strokeWidth={3} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text)' }}>
                    Cotizaciones Realizadas
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Cotizaciones públicas y manuales de prueba ({conteos.cotizaciones} registros)
                  </div>
                </div>
              </div>
              <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>
                {conteos.cotizaciones}
              </span>
            </div>

            {/* OPCIÓN 4: CLIENTES */}
            <div
              onClick={() => toggleOpcion('clientes')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: opciones.clientes ? 'rgba(212, 146, 74, 0.08)' : 'var(--surface-2)',
                border: opciones.clientes ? '1px solid rgba(212, 146, 74, 0.4)' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: opciones.clientes ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                    background: opciones.clientes ? 'var(--accent)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#141210',
                  }}
                >
                  {opciones.clientes && <Check size={12} strokeWidth={3} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text)' }}>
                    Directorio de Clientes de Prueba
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Perfiles y teléfonos creados durante las cotizaciones/reservas ({conteos.clientes} clientes)
                  </div>
                </div>
              </div>
              <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>
                {conteos.clientes}
              </span>
            </div>

            {/* OPCIÓN 5: COMUNICACIONES */}
            <div
              onClick={() => toggleOpcion('comunicaciones')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: opciones.comunicaciones ? 'rgba(212, 146, 74, 0.08)' : 'var(--surface-2)',
                border: opciones.comunicaciones ? '1px solid rgba(212, 146, 74, 0.4)' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: opciones.comunicaciones ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                    background: opciones.comunicaciones ? 'var(--accent)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#141210',
                  }}
                >
                  {opciones.comunicaciones && <Check size={12} strokeWidth={3} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text)' }}>
                    Historial de Comunicaciones por WhatsApp
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Bitácora de mensajes y plantillas enviadas ({conteos.comunicaciones} mensajes)
                  </div>
                </div>
              </div>
              <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>
                {conteos.comunicaciones}
              </span>
            </div>

            {/* OPCIÓN 6: CONSECUTIVOS */}
            <div
              onClick={() => toggleOpcion('reiniciarConsecutivos')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: opciones.reiniciarConsecutivos ? 'rgba(26, 107, 94, 0.08)' : 'var(--surface-2)',
                border: opciones.reiniciarConsecutivos ? '1px solid rgba(26, 107, 94, 0.4)' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: opciones.reiniciarConsecutivos ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                    background: opciones.reiniciarConsecutivos ? 'var(--primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  {opciones.reiniciarConsecutivos && <Check size={12} strokeWidth={3} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text)' }}>
                    Reiniciar Consecutivos a 1001
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Reinicia los contadores de cotización y reserva para que comiencen de nuevo en 1001 (actualmente #{conteos.siguienteCotizacion})
                  </div>
                </div>
              </div>
              <span className="badge s-avail" style={{ fontSize: '0.68rem' }}>
                #1001
              </span>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: PROTECCIÓN DE CATÁLOGO & BOTÓN DE EJECUCIÓN */}
        <div
          className="panel"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
                  Blindaje & Datos Protegidos
                </h3>
              </div>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Los siguientes activos estructurales están 100% protegidos y <strong>NO serán eliminados</strong>:
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.78rem',
                color: 'var(--text)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--surface-2)', borderRadius: '6px' }}>
                <CheckCircle2 size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span><strong>Catálogo de Fincas ({conteos.fincas} propiedades):</strong> Fotos, tarifas, amenidades y normas campestres.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--surface-2)', borderRadius: '6px' }}>
                <CheckCircle2 size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span><strong>Oferta Gastronómica ({conteos.menus} menús):</strong> Sancocho, asados, desayunos y paquetes.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--surface-2)', borderRadius: '6px' }}>
                <CheckCircle2 size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span><strong>Identidad y Banco:</strong> Nombre de la empresa, teléfono WhatsApp oficial y cuentas bancarias.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--surface-2)', borderRadius: '6px' }}>
                <CheckCircle2 size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span><strong>Firma Digital y Plantillas PDF:</strong> Logo oficial y cláusulas contractuales configuradas.</span>
              </div>
            </div>

            {/* Advertencia de Seguridad */}
            <div
              style={{
                display: 'flex',
                gap: '0.65rem',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontSize: '0.76rem',
                color: '#ef4444',
                lineHeight: 1.45,
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Acción Irreversible:</strong> Al pulsar el botón de reinicio, las reservas, bloqueos y cotizaciones seleccionadas serán retiradas permanentemente de Supabase. El calendario y los contadores quedarán listos para operar en producción real.
              </div>
            </div>
          </div>

          {/* BOTÓN PRO DE EJECUCIÓN CON GLOW */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Total de registros a depurar:</span>
              <strong style={{ color: totalRegistrosAfectados > 0 ? '#ef4444' : 'var(--text)' }}>
                {totalRegistrosAfectados} elementos
              </strong>
            </div>

            <button
              type="button"
              onClick={abrirModalSeguridad}
              disabled={!hayAlgunaOpcionSeleccionada || ejecutando}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                width: '100%',
                padding: '0.85rem 1.25rem',
                borderRadius: '8px',
                background: hayAlgunaOpcionSeleccionada
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'var(--surface-3)',
                color: hayAlgunaOpcionSeleccionada ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: hayAlgunaOpcionSeleccionada ? 'pointer' : 'not-allowed',
                border: hayAlgunaOpcionSeleccionada ? '1px solid #b91c1c' : '1px solid var(--border)',
                boxShadow: hayAlgunaOpcionSeleccionada ? '0 4px 18px rgba(239, 68, 68, 0.35)' : 'none',
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <Trash2 size={17} />
              {ejecutando ? 'Ejecutando Limpieza...' : 'Reiniciar Datos de Prueba'}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MODAL DE CONFIRMACIÓN DE SEGURIDAD HIGH-END */}
      {/* ============================================================== */}
      <AnimatePresence>
        {modalSeguridadAbierto && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '1rem',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              style={{
                width: '100%',
                maxWidth: '520px',
                background: 'var(--surface)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '16px',
                padding: '1.75rem',
                boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6), 0 0 25px rgba(239, 68, 68, 0.2)',
                position: 'relative',
              }}
            >
              {/* Encabezado del Modal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
                      ¿Confirmar Reinicio de Datos?
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
                      Operación definitiva de limpieza en Supabase
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={cerrarModalSeguridad}
                  disabled={ejecutando}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Contenido / Resumen de eliminación */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text)', lineHeight: 1.55 }}>
                  Estás a punto de eliminar <strong>{totalRegistrosAfectados} registros</strong> de prueba de la base de datos. Las fechas tomadas en el calendario quedarán inmediatamente disponibles para clientes reales.
                </p>

                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: '8px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    fontSize: '0.76rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <strong style={{ color: 'var(--text)' }}>Resumen de la purga:</strong>
                  {opciones.disponibilidad && <div>• Se liberarán {conteos.disponibilidad} fechas bloqueadas en el calendario.</div>}
                  {opciones.reservasYPagos && <div>• Se eliminarán {conteos.reservas} reservas y sus pagos asociados.</div>}
                  {opciones.cotizaciones && <div>• Se eliminarán {conteos.cotizaciones} cotizaciones registradas.</div>}
                  {opciones.clientes && <div>• Se eliminarán {conteos.clientes} clientes de prueba.</div>}
                  {opciones.comunicaciones && <div>• Se vaciará el historial de {conteos.comunicaciones} mensajes.</div>}
                  {opciones.reiniciarConsecutivos && <div>• Los consecutivos de documentos se reiniciarán en #1001.</div>}
                  <div style={{ color: 'var(--primary)', marginTop: '0.2rem' }}>
                    ✔ Fincas, fotos, menús y configuración bancaria permanecen protegidos.
                  </div>
                </div>

                {/* Confirmación mediante texto para evitar clics accidentales */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>
                    Para autorizar el reinicio, escribe la palabra <span style={{ color: '#ef4444', fontFamily: 'monospace', fontWeight: 800 }}>REINICIAR</span>:
                  </label>
                  <input
                    type="text"
                    value={palabraConfirmacion}
                    onChange={e => setPalabraConfirmacion(e.target.value)}
                    placeholder="Escribe REINICIAR aquí"
                    autoFocus
                    disabled={ejecutando}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      background: 'var(--surface-2)',
                      border: confirmacionEsValida ? '1.5px solid #ef4444' : '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: '0.9rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      outline: 'none',
                      boxShadow: confirmacionEsValida ? '0 0 12px rgba(239, 68, 68, 0.25)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>
              </div>

              {/* Botones de acción del Modal */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cerrarModalSeguridad}
                  disabled={ejecutando}
                  style={{ fontSize: '0.85rem', padding: '0.65rem 1.25rem' }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={ejecutarReinicioDefinitivo}
                  disabled={!confirmacionEsValida || ejecutando}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    background: confirmacionEsValida
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                      : 'var(--surface-3)',
                    color: confirmacionEsValida ? '#ffffff' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    border: confirmacionEsValida ? '1px solid #b91c1c' : '1px solid var(--border)',
                    boxShadow: confirmacionEsValida ? '0 4px 15px rgba(239, 68, 68, 0.35)' : 'none',
                    cursor: confirmacionEsValida && !ejecutando ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Trash2 size={15} />
                  {ejecutando ? 'Purgando base de datos...' : 'Confirmar y Purgar Datos'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
