import { useState, useEffect, useCallback } from 'react';
import type { ContenidoSitio, SeccionClave, BeneficioItem, FaqItem } from '../types';

export interface UsePersonalizacionControllerParams {
  contenido: ContenidoSitio;
  guardando: boolean;
  onGuardar: (datos: Partial<ContenidoSitio>) => Promise<{ success: boolean; error?: string }>;
  onRestablecer: () => Promise<{ success: boolean; error?: string }>;
  onVerSitioPublico: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export type PersonalizacionTab =
  | 'orden'
  | 'hero'
  | 'destacados'
  | 'graficos'
  | 'busqueda'
  | 'menus'
  | 'faq'
  | 'footer';

export const SECCIONES_PREDETERMINADAS: SeccionClave[] = [
  'banner',
  'hero',
  'destacados',
  'graficos',
  'estado',
  'filtros',
  'catalogo',
  'comparador',
  'menus',
  'faq',
];

export function asegurarOrdenCompleto(c: ContenidoSitio): ContenidoSitio {
  const existentes = c.orden_secciones || [];
  const faltantes = SECCIONES_PREDETERMINADAS.filter(s => !existentes.includes(s));
  return {
    ...c,
    orden_secciones: [...existentes, ...faltantes],
    graficos_visible: c.graficos_visible ?? true,
    graficos_titulo: c.graficos_titulo || 'Análisis Visual & Calculadora de Presupuesto',
    graficos_subtitulo:
      c.graficos_subtitulo ||
      'Compara capacidades, tarifas y simula tu inversión con ahorro directo en tiempo real',
    graficos_tipo: c.graficos_tipo || 'ambos',
    comparador_visible: c.comparador_visible ?? true,
    comparador_titulo: c.comparador_titulo || 'Comparador de Fincas',
    comparador_subtitulo:
      c.comparador_subtitulo || 'Compara especificaciones, comodidades y tarifas lado a lado',
    catalogo_vista_predeterminada: c.catalogo_vista_predeterminada || 'grid',
    catalogo_mostrar_badges: c.catalogo_mostrar_badges ?? true,
    catalogo_mostrar_precio_total: c.catalogo_mostrar_precio_total ?? true,
  };
}

export function usePersonalizacionController({
  contenido,
  guardando,
  onGuardar,
  onRestablecer,
  showToast,
  openConfirm,
}: UsePersonalizacionControllerParams) {
  const [form, setForm] = useState<ContenidoSitio>(() => asegurarOrdenCompleto(contenido));
  const [tabActiva, setTabActiva] = useState<PersonalizacionTab>('orden');
  const [hayCambios, setHayCambios] = useState(false);
  const [modalPreviewOpen, setModalPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    if (!hayCambios) {
      setForm(asegurarOrdenCompleto(contenido));
    }
  }, [contenido, hayCambios]);

  const handleChange = useCallback(<K extends keyof ContenidoSitio>(campo: K, valor: ContenidoSitio[K]) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
    setHayCambios(true);
  }, []);

  const handleGuardar = useCallback(async () => {
    const res = await onGuardar(form);
    if (res.success) {
      showToast('Personalización del sitio público guardada correctamente', 'success');
      setHayCambios(false);
    } else {
      showToast(res.error || 'Error al guardar los cambios', 'error');
    }
  }, [form, onGuardar, showToast]);

  const handleRestablecer = useCallback(() => {
    openConfirm(
      '¿Restablecer contenido de fábrica?',
      'Se restaurarán todos los textos, títulos, beneficios y preguntas frecuentes a los valores iniciales predeterminados.',
      async () => {
        const res = await onRestablecer();
        if (res.success) {
          showToast('Contenido restablecido a valores por defecto', 'info');
          setHayCambios(false);
        } else {
          showToast(res.error || 'Error al restablecer', 'error');
        }
      }
    );
  }, [openConfirm, onRestablecer, showToast]);

  // Manejo del orden de secciones
  const moverSeccion = useCallback((seccion: SeccionClave, direccion: 'arriba' | 'abajo') => {
    setForm(prev => {
      const orden = [...prev.orden_secciones];
      const idx = orden.indexOf(seccion);
      if (idx === -1) return prev;

      if (direccion === 'arriba' && idx > 0) {
        const temp = orden[idx - 1];
        orden[idx - 1] = orden[idx];
        orden[idx] = temp;
      } else if (direccion === 'abajo' && idx < orden.length - 1) {
        const temp = orden[idx + 1];
        orden[idx + 1] = orden[idx];
        orden[idx] = temp;
      }

      return { ...prev, orden_secciones: orden };
    });
    setHayCambios(true);
  }, []);

  const toggleVisibilidad = useCallback((seccion: SeccionClave) => {
    setForm(prev => {
      let campo: keyof ContenidoSitio;
      switch (seccion) {
        case 'banner': campo = 'banner_visible'; break;
        case 'hero': campo = 'hero_visible'; break;
        case 'destacados': campo = 'destacados_visible'; break;
        case 'graficos': campo = 'graficos_visible'; break;
        case 'estado': campo = 'estado_visible'; break;
        case 'filtros': campo = 'filtros_visible'; break;
        case 'catalogo': campo = 'catalogo_visible'; break;
        case 'comparador': campo = 'comparador_visible'; break;
        case 'portal_cliente': campo = 'portal_cliente_visible'; break;
        case 'menus': campo = 'menus_visible'; break;
        case 'faq': campo = 'faq_visible'; break;
        default: return prev;
      }
      const nuevoValor = !prev[campo];
      return { ...prev, [campo]: nuevoValor };
    });
    setHayCambios(true);
  }, []);

  const esVisible = useCallback((seccion: SeccionClave): boolean => {
    switch (seccion) {
      case 'banner': return form.banner_visible;
      case 'hero': return form.hero_visible;
      case 'destacados': return form.destacados_visible;
      case 'graficos': return form.graficos_visible ?? true;
      case 'estado': return form.estado_visible;
      case 'filtros': return form.filtros_visible;
      case 'catalogo': return form.catalogo_visible;
      case 'comparador': return form.comparador_visible ?? true;
      case 'portal_cliente': return form.portal_cliente_visible ?? true;
      case 'menus': return form.menus_visible;
      case 'faq': return form.faq_visible;
      default: return true;
    }
  }, [form]);

  // Manejo de Beneficios Destacados
  const handleAddBeneficio = useCallback(() => {
    const nuevo: BeneficioItem = {
      id: `ben-${Date.now()}`,
      icono: '✨',
      titulo: 'Nueva Ventaja Exclusiva',
      descripcion: 'Describe el beneficio para tus clientes o huéspedes.',
    };
    setForm(prev => ({ ...prev, destacados_items: [...prev.destacados_items, nuevo] }));
    setHayCambios(true);
  }, []);

  const handleUpdateBeneficio = useCallback((index: number, campo: keyof BeneficioItem, valor: string) => {
    setForm(prev => {
      const updated = [...prev.destacados_items];
      updated[index] = { ...updated[index], [campo]: valor };
      return { ...prev, destacados_items: updated };
    });
    setHayCambios(true);
  }, []);

  const handleRemoveBeneficio = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      destacados_items: prev.destacados_items.filter((_, i) => i !== index),
    }));
    setHayCambios(true);
  }, []);

  // Manejo de Preguntas Frecuentes (FAQ)
  const handleAddFaq = useCallback(() => {
    const nuevo: FaqItem = {
      id: `faq-${Date.now()}`,
      pregunta: '¿Nueva pregunta frecuente?',
      respuesta: 'Escribe aquí la respuesta clara y detallada para tus clientes.',
    };
    setForm(prev => ({ ...prev, faq_items: [...prev.faq_items, nuevo] }));
    setHayCambios(true);
  }, []);

  const handleUpdateFaq = useCallback((index: number, campo: keyof FaqItem, valor: string) => {
    setForm(prev => {
      const updated = [...prev.faq_items];
      updated[index] = { ...updated[index], [campo]: valor };
      return { ...prev, faq_items: updated };
    });
    setHayCambios(true);
  }, []);

  const handleRemoveFaq = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      faq_items: prev.faq_items.filter((_, i) => i !== index),
    }));
    setHayCambios(true);
  }, []);

  return {
    form,
    tabActiva,
    setTabActiva,
    hayCambios,
    modalPreviewOpen,
    setModalPreviewOpen,
    previewDevice,
    setPreviewDevice,
    guardando,
    handleChange,
    handleGuardar,
    handleRestablecer,
    moverSeccion,
    toggleVisibilidad,
    esVisible,
    handleAddBeneficio,
    handleUpdateBeneficio,
    handleRemoveBeneficio,
    handleAddFaq,
    handleUpdateFaq,
    handleRemoveFaq,
  };
}
