import React, { useState } from 'react';
import { Users, Plus, Edit3, Trash2, Phone, Mail, MessageCircle, X, Save, Search } from 'lucide-react';
import type { Cliente } from '../types';

interface AdminClientesProps {
  clientes: Cliente[];
  onGuardar: (datos: Partial<Cliente>) => Promise<{ success: boolean; id?: string; error?: string }>;
  onDesactivar: (id: string) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const VACIO: Partial<Cliente> = {
  nombre: '',
  apellido: '',
  telefono: '',
  whatsapp: '',
  correo: '',
  observaciones: '',
};

export const AdminClientes: React.FC<AdminClientesProps> = ({
  clientes,
  onGuardar,
  onDesactivar,
  showToast,
  openConfirm,
}) => {
  const [form, setForm] = useState<Partial<Cliente>>(VACIO);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const abrirNuevo = () => {
    setForm(VACIO);
    setEditando(true);
  };

  const abrirEdicion = (c: Cliente) => {
    setForm({ ...c });
    setEditando(true);
  };

  const cerrar = () => {
    setForm(VACIO);
    setEditando(false);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre?.trim()) {
      showToast('El nombre es obligatorio', 'error');
      return;
    }
    setGuardando(true);
    const res = await onGuardar(form);
    setGuardando(false);
    if (res.success) {
      showToast(form.id ? 'Cliente actualizado ✅' : 'Cliente creado ✅', 'success');
      cerrar();
    } else {
      showToast(`Error: ${res.error}`, 'error');
    }
  };

  const handleEliminar = (c: Cliente) => {
    openConfirm(
      '¿Desactivar cliente?',
      `El cliente "${c.nombre} ${c.apellido || ''}" quedará inactivo. Sus reservas e historial no se eliminarán.`,
      async () => {
        const res = await onDesactivar(c.id);
        if (res.success) showToast('Cliente desactivado', 'info');
        else showToast(`Error: ${res.error}`, 'error');
      }
    );
  };

  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.apellido || '').toLowerCase().includes(q) ||
      (c.telefono || '').includes(q) ||
      (c.correo || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Users size={18} /> Clientes
          </div>
          <div className="text-xs text-muted mt-1">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrados</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={abrirNuevo}>
          <Plus size={14} /> Nuevo cliente
        </button>
      </div>

      {/* Buscador */}
      <div style={{ padding: '0 0 1rem 0' }}>
        <div className="field" style={{ position: 'relative', margin: 0 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o correo…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ paddingLeft: '2rem' }}
          />
        </div>
      </div>

      {/* Formulario (modal inline) */}
      {editando && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div className="panel-title">{form.id ? 'Editar cliente' : 'Nuevo cliente'}</div>
              <button className="btn btn-sm" onClick={cerrar}><X size={14} /></button>
            </div>

            <form onSubmit={handleGuardar} style={{ display: 'grid', gap: '0.75rem', padding: '1.25rem' }}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field">
                  <label>Nombre *</label>
                  <input value={form.nombre || ''} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" />
                </div>
                <div className="field">
                  <label>Apellido</label>
                  <input value={form.apellido || ''} onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))} placeholder="Apellido" />
                </div>
                <div className="field">
                  <label><Phone size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Teléfono</label>
                  <input value={form.telefono || ''} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="Ej. 3001234567" />
                </div>
                <div className="field">
                  <label><MessageCircle size={11} style={{ display:'inline', verticalAlign:'-1px', color:'#25d366' }} /> WhatsApp</label>
                  <input value={form.whatsapp || ''} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="Ej. 573001234567" />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label><Mail size={11} style={{ display:'inline', verticalAlign:'-1px' }} /> Correo electrónico</label>
                  <input type="email" value={form.correo || ''} onChange={e => setForm(p => ({ ...p, correo: e.target.value }))} placeholder="correo@ejemplo.com" />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Observaciones</label>
                  <textarea rows={3} value={form.observaciones || ''} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} placeholder="Preferencias, alergias, notas…" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button type="button" className="btn" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  <Save size={14} /> {guardando ? 'Guardando…' : 'Guardar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de clientes */}
      <div className="avail-table">
        {filtrados.length === 0 ? (
          <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '1.5rem' }}>
            {busqueda ? 'Sin resultados para la búsqueda.' : 'No hay clientes registrados aún.'}
          </p>
        ) : (
          filtrados.map(c => (
            <div key={c.id} className="avail-row" style={{ alignItems: 'flex-start', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{c.nombre} {c.apellido}</div>
                <div className="text-xs text-muted" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                  {c.telefono && <span><Phone size={10} style={{ display:'inline', verticalAlign:'-1px' }} /> {c.telefono}</span>}
                  {c.whatsapp && <span><MessageCircle size={10} style={{ display:'inline', verticalAlign:'-1px', color:'#25d366' }} /> {c.whatsapp}</span>}
                  {c.correo && <span><Mail size={10} style={{ display:'inline', verticalAlign:'-1px' }} /> {c.correo}</span>}
                </div>
                {c.observaciones && (
                  <div className="text-xs" style={{ color: 'var(--text-faint)', marginTop: '0.2rem', fontStyle: 'italic' }}>{c.observaciones}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, marginTop: '0.1rem' }}>
                <button className="btn btn-sm" onClick={() => abrirEdicion(c)} title="Editar"><Edit3 size={13} /></button>
                <button className="btn btn-sm btn-danger" onClick={() => handleEliminar(c)} title="Desactivar"><Trash2 size={13} /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
