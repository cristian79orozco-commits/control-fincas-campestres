import React from 'react';
import {
  MapPin, Phone, Mail, MessageCircle, ShieldCheck, Heart,
  Instagram, Facebook
} from 'lucide-react';
import type { ConfiguracionGeneral } from '../types';

interface FooterPublicoProps {
  visible: boolean;
  titulo?: string;
  subtitulo?: string;
  whatsappCta?: string;
  configuracion?: ConfiguracionGeneral;
  waNumber: string;
}

export const FooterPublico: React.FC<FooterPublicoProps> = ({
  visible,
  titulo,
  subtitulo,
  whatsappCta,
  configuracion,
  waNumber,
}) => {
  if (!visible) return null;

  const nombreEmpresa = titulo || configuracion?.nombre_empresa || 'Paraíso Terrenal';
  const descEmpresa = subtitulo || configuracion?.eslogan || 'Fincas de Alquiler · Experiencias exclusivas y descanso en Santa Elena, El Cerrito, Valle del Cauca.';
  const tel = configuracion?.telefono || '+57 317 682 7093';
  const email = configuracion?.correo || 'reservas@fincascampestres.com';
  const dir = configuracion?.direccion || 'Santa Elena, El Cerrito, Valle del Cauca';
  const redes = configuracion?.redes_sociales;

  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        marginTop: '4rem',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '3rem 1.5rem 2rem 1.5rem',
        borderRadius: 'var(--rad-lg) var(--rad-lg) 0 0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.02)',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '2.5rem',
          marginBottom: '2.5rem',
        }}
      >
        {/* Columna 1: Empresa & Propuesta */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FAF7EE',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                flexShrink: 0,
              }}
            >
              <img
                src="/logo.png"
                alt={nombreEmpresa}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
              />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              {nombreEmpresa}
            </span>
          </div>

          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              marginBottom: '1rem',
            }}
          >
            {descEmpresa}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontSize: '0.76rem', fontWeight: 600 }}>
            <ShieldCheck size={16} /> Reservas verificadas y soporte directo
          </div>
        </div>

        {/* Columna 2: Contacto & Ubicación */}
        <div>
          <h4
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              fontWeight: 600,
              marginBottom: '0.85rem',
              color: 'var(--text)',
            }}
          >
            Contacto & Ubicación
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span>{dir}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span>{tel}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span>{email}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageCircle size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <span>WhatsApp Directo: +{waNumber}</span>
            </div>
          </div>
        </div>

        {/* Columna 3: Atención WhatsApp y Redes */}
        <div>
          <h4
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              fontWeight: 600,
              marginBottom: '0.85rem',
              color: 'var(--text)',
            }}
          >
            ¿Hablamos por WhatsApp?
          </h4>

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.85rem' }}>
            {whatsappCta || 'Resuelve tus dudas al instante con nuestros asesores de reservas campestres.'}
          </p>

          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent('¡Hola! Me gustaría recibir información y asesoría para alquilar una finca campestre.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}
          >
            <MessageCircle size={15} /> Chatear con un asesor
          </a>

          {/* Redes sociales */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {redes?.instagram && (
              <a
                href={redes.instagram}
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              >
                <Instagram size={15} />
              </a>
            )}
            {redes?.facebook && (
              <a
                href={redes.facebook}
                target="_blank"
                rel="noopener noreferrer"
                title="Facebook"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              >
                <Facebook size={15} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Franja de créditos y copyright */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '1.2rem',
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.8rem',
          fontSize: '0.75rem',
          color: 'var(--text-faint)',
        }}
      >
        <div>
          © {currentYear} {nombreEmpresa}. Todos los derechos reservados.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          Hecho con <Heart size={12} style={{ color: 'var(--danger)', fill: 'var(--danger)' }} /> para el turismo campestre en Colombia
        </div>
      </div>
    </footer>
  );
};
