import React, { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Upload, Link as LinkIcon, Loader, Image as ImageIcon } from 'lucide-react';
import { supabase, DEFAULT_WA_NUMBER } from '../services/supabase';
import { optimizarImagen, formatearBytes } from '../utils/imageOptimizer';
import type { Finca } from '../types';
import { CurrencyInput } from '../components/CurrencyInput';

interface AdminFincaFormProps {
  fincas: Finca[];
  onSave: (fincaData: Partial<Finca>, imagenesUrls: string[], planesStr: string) => Promise<{ success: boolean; id?: string; error?: string }>;
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
  const [selectedFincaId, setSelectedFincaId] = useState<string>('new');
  const [nombre, setNombre] = useState('');
  const [capacidad, setCapacidad] = useState<number>(10);
  const [precio, setPrecio] = useState<number>(85000);
  const [estado, setEstado] = useState<Finca['estado']>('disponible');
  const [descripcion, setDescripcion] = useState('');
  const [planes, setPlanes] = useState('Sin alimentación, Desayuno, Todo incluido');
  const [waNumber, setWaNumber] = useState(DEFAULT_WA_NUMBER);
  const [activo, setActivo] = useState(true);

  // Imágenes
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [selectedThumbs, setSelectedThumbs] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('');

  // Cargar datos de la finca seleccionada en el formulario
  useEffect(() => {
    if (selectedFincaId === 'new') {
      setNombre('');
      setCapacidad(10);
      setPrecio(85000);
      setEstado('disponible');
      setDescripcion('');
      setPlanes('Sin alimentación, Desayuno, Todo incluido');
      setWaNumber(DEFAULT_WA_NUMBER);
      setActivo(true);
      setImagenes([]);
      setSelectedThumbs(new Set());
    } else {
      const f = fincas.find(x => x.id === selectedFincaId);
      if (f) {
        setNombre(f.nombre || '');
        setCapacidad(f.capacidad || 10);
        setPrecio(Number(f.precio_pp) || 0);
        setEstado(f.estado || 'disponible');
        setDescripcion(f.descripcion || '');
        setPlanes((f.finca_planes || []).map(p => p.nombre).join(', '));
        setWaNumber(f.whatsapp || DEFAULT_WA_NUMBER);
        setActivo(f.activo !== false);

        const imgs = [...(f.finca_imagenes || [])].sort((a, b) => a.orden - b.orden).map(i => i.url);
        setImagenes(imgs);
        setSelectedThumbs(new Set());
      }
    }
  }, [selectedFincaId, fincas]);

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

      // Optimización automática en cliente (Fase 5)
      const opt = await optimizarImagen(rawFile);
      const fileToUpload = opt.file;
      totalBytesOriginales += opt.originalSize;
      totalBytesOptimizados += opt.optimizedSize;

      if (opt.reductionPct > 0) {
        setUploadLabel(`Subiendo ${i + 1} de ${toUpload.length} (reducida ${opt.reductionPct}% a WebP: ${formatearBytes(opt.originalSize)} → ${formatearBytes(opt.optimizedSize)})…`);
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
    showToast('Imagen añadida a la lista', 'info');
  };

  const toggleThumbSelection = (index: number) => {
    setSelectedThumbs(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
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

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      showToast('El nombre de la finca es obligatorio', 'error');
      return;
    }

    const payload: Partial<Finca> = {
      nombre: nombre.trim(),
      zona: 'Santa Elena, Valle',
      capacidad: Number(capacidad) || 10,
      precio_pp: Number(precio) || 0,
      descripcion: descripcion.trim(),
      estado,
      whatsapp: waNumber.replace(/[^0-9]/g, ''),
      activo,
    };

    if (selectedFincaId !== 'new') {
      payload.id = selectedFincaId;
    }

    const res = await onSave(payload, imagenes, planes);
    if (res.success) {
      showToast('Finca guardada exitosamente en Supabase ✅', 'success');
      if (res.id) setSelectedFincaId(res.id);
    } else {
      showToast(`Error al guardar: ${res.error}`, 'error');
    }
  };

  const handleEliminarFinca = () => {
    if (selectedFincaId === 'new') return;
    openConfirm(
      `¿Desactivar "${nombre}"?`,
      'La finca dejará de estar visible en el catálogo de clientes.',
      async () => {
        const res = await onDelete(selectedFincaId);
        if (res.success) {
          showToast('Finca desactivada exitosamente ✅', 'success');
          setSelectedFincaId('new');
        } else {
          showToast(`Error: ${res.error}`, 'error');
        }
      }
    );
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Gestionar fincas campestres</div>
          <div className="text-xs text-muted mt-1">Crea o edita las propiedades del catálogo</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="btn btn-sm"
            value={selectedFincaId}
            onChange={e => setSelectedFincaId(e.target.value)}
            style={{ minHeight: '36px' }}
          >
            <option value="new">+ Nueva finca</option>
            {fincas.map(f => (
              <option key={f.id} value={f.id}>
                {f.nombre}{f.activo === false ? ' 🚫 (Inactiva)' : ''}
              </option>
            ))}
          </select>
          <button className="btn btn-sm" onClick={() => setSelectedFincaId('new')}>
            <Plus size={14} /> Nueva
          </button>
        </div>
      </div>

      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="field col-span-full">
          <label>Nombre de la propiedad</label>
          <input
            type="text"
            placeholder="Ej: Finca El Paraíso"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
          />
        </div>

        {/* Selector de estado activo/inactivo */}
        <div className="field col-span-full" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-sunken)',
          padding: '0.65rem 0.9rem',
          borderRadius: 'var(--rad-xs)',
          border: '1px solid var(--border)',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', margin: 0, userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={activo}
              onChange={e => setActivo(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Finca activa (visible en el catálogo público y cotizador)
            </span>
          </label>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.15rem 0.55rem',
              borderRadius: '999px',
              color: activo ? 'var(--success)' : '#ef4444',
              background: activo ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'rgba(239,68,68,0.1)',
            }}
          >
            {activo ? 'Activa ✓' : 'Inactiva 🚫'}
          </span>
        </div>

        <div className="field">
          <label>Ubicación</label>
          <input
            type="text"
            value="Santa Elena, Valle"
            readOnly
            style={{ background: 'var(--surface-2)', cursor: 'not-allowed', opacity: 0.85 }}
          />
        </div>

        <div className="field">
          <label>Capacidad máxima (personas)</label>
          <input
            type="number"
            min="1"
            max="200"
            value={capacidad}
            onChange={e => setCapacidad(Number(e.target.value))}
          />
        </div>

        <div className="field">
          <label>Precio por persona / noche (COP)</label>
          <CurrencyInput
            value={precio}
            onChange={val => setPrecio(val)}
            placeholder="0"
          />
        </div>

        <div className="field">
          <label>Estado de disponibilidad</label>
          <select value={estado} onChange={e => setEstado(e.target.value as any)}>
            <option value="disponible">Disponible</option>
            <option value="alta_demanda">Alta demanda</option>
            <option value="fin_de_semana">Fin de semana</option>
            <option value="no_disponible">No disponible</option>
          </select>
        </div>

        <div className="field col-span-full">
          <label>Descripción detallada</label>
          <textarea
            placeholder="Describe las habitaciones, zonas verdes, piscina, vista y atractivos…"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
          />
        </div>

        <div className="field col-span-full">
          <label>Planes de alimentación (separados por coma)</label>
          <input
            type="text"
            placeholder="Sin alimentación, Desayuno, Todo incluido"
            value={planes}
            onChange={e => setPlanes(e.target.value)}
          />
        </div>

        <div className="field col-span-full">
          <label>Número WhatsApp específico (opcional, ej: 573176827093)</label>
          <input
            type="text"
            placeholder="573176827093"
            value={waNumber}
            onChange={e => setWaNumber(e.target.value)}
          />
        </div>
      </div>

      {/* Gestor de Fotos */}
      <div className="divider" style={{ margin: '1.25rem 0' }} />

      <div className="sec-header" style={{ marginBottom: '0.75rem' }}>
        <div className="sec-title" style={{ fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ImageIcon size={16} /> Fotografías ({imagenes.length}/20)
        </div>
        <div className="img-actions" style={{ display: 'flex', gap: '0.5rem' }}>
          <label className="btn btn-sm btn-primary" style={{ cursor: 'pointer' }}>
            <Upload size={13} /> Subir archivo
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
        <Upload size={22} style={{ color: 'var(--text-faint)', marginBottom: '0.35rem' }} />
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Arrastra imágenes aquí o <span style={{ color: 'var(--primary)', fontWeight: 600 }}>haz clic para seleccionar</span>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
          Compatible con JPG, PNG, WEBP y HEIC de iPhone · Subida directa a Supabase Storage
        </div>
      </label>

      {uploading && (
        <div className="upload-progress">
          <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
          <span>{uploadLabel}</span>
        </div>
      )}

      {imagenes.length > 0 && (
        <div className="img-grid" style={{ marginTop: '0.85rem' }}>
          {imagenes.map((url, idx) => {
            const isSelected = selectedThumbs.has(idx);
            return (
              <div
                key={idx}
                className={`img-thumb ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleThumbSelection(idx)}
                title="Clic para seleccionar o deseleccionar"
              >
                <img src={url} alt={`Imagen ${idx + 1}`} />
                <div className="img-order">{idx + 1}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="form-actions" style={{ marginTop: '1.25rem' }}>
        <button className="btn btn-primary" onClick={handleGuardar}>
          <Save size={15} /> Guardar en Supabase
        </button>
        {selectedFincaId !== 'new' && (
          <button className="btn btn-danger" onClick={handleEliminarFinca}>
            <Trash2 size={15} /> Desactivar finca
          </button>
        )}
      </div>
    </div>
  );
};
