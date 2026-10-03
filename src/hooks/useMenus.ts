import { useApp } from '../context/AppContext';
import type { Menu } from '../types';

export const MENUS_DEFAULT: Menu[] = [
  {
    id: 'menu-1',
    nombre: 'Desayuno Campestre Típico',
    categoria: 'Desayuno',
    precio_pp: 18000,
    descripcion: 'Calentao tradicional de la casa con fríjol y hogao, huevos al gusto, arepa de choclo con quesito cuajada, pan caliente, jugo de naranja natural y chocolate en jarra o café de greca.',
    condiciones: 'Servicio entre 7:30 a.m. y 10:00 a.m. Mínimo 4 personas. Incluye menaje y vajilla.',
    imagen_url: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80',
    activo: true,
  },
  {
    id: 'menu-2',
    nombre: 'Sancocho Tradicional de Gallina en Leña',
    categoria: 'Almuerzo',
    precio_pp: 35000,
    descripcion: 'Cocido tradicional en leña de gallina criolla con plátano verde, yuca suave, papa pastusa y mazorca tierna. Acompañado de presa dorada, arroz blanco, aguacate maduro, ensalada campesina y limonada natural con panela.',
    condiciones: 'Preparación en sitio por cocinera campesina. Mínimo 8 personas. Confirmar con 24 horas de anticipación.',
    imagen_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
    activo: true,
  },
  {
    id: 'menu-3',
    nombre: 'Gran Parrillada Mixta Campestre',
    categoria: 'Parrilla',
    precio_pp: 48000,
    descripcion: 'Corte grueso de churrasco de res a la parrilla, pechuga marinada a las finas hierbas, chorizo santarrosano artesanal y morcilla criolla. Servido con papas saladas, arepas con mantequilla, chimichurri argentino de la casa y guacamole rústico.',
    condiciones: 'Incluye servicio de parrillero profesional durante 3 horas, carbón vegetal de leña y montaje.',
    imagen_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
    activo: true,
  },
  {
    id: 'menu-4',
    nombre: 'Cena Ligera Gourmet Campestre',
    categoria: 'Cena',
    precio_pp: 25000,
    descripcion: 'Crema aterciopelada de calabaza y zanahoria de la huerta con croutons aromatizados, pechuga a la plancha sobre cama de vegetales salteados al wok y tostadas con finas hierbas y queso campesino.',
    condiciones: 'Servicio entre 6:30 p.m. y 8:30 p.m. Mínimo 4 personas.',
    imagen_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    activo: true,
  },
  {
    id: 'menu-5',
    nombre: 'Refrigerio Valluno con Empanadas Crocantes',
    categoria: 'Refrigerio',
    precio_pp: 14000,
    descripcion: 'Trilogía de empanadas vallunas crocantes de carne y papa con ají pique casero y guacamole suave, acompañadas de vaso frío de lulada tradicional con leche condensada.',
    condiciones: 'Mínimo 6 personas. Ideal para media tarde o pausas en reuniones familiares.',
    imagen_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
    activo: true,
  },
  {
    id: 'menu-6',
    nombre: 'Paquete Campestre Día Completo (3 Tiempos)',
    categoria: 'Paquetes',
    precio_pp: 68000,
    descripcion: 'Solución gastronómica completa: Desayuno Campestre Típico + Sancocho Tradicional de Gallina en Leña para almuerzo + Refrigerio Valluno de la tarde. La mejor opción para disfrutar sin preocuparse por la cocina.',
    condiciones: 'Mínimo 8 personas. Ahorro del 10% frente al valor individual de los servicios.',
    imagen_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    activo: true,
  },
];

export function useMenus() {
  const {
    menus,
    loading,
    recargarTodo,
    guardarMenu,
    cambiarEstadoMenu,
    eliminarMenu,
  } = useApp();

  return {
    menus,
    loading,
    error: null,
    recargarMenus: recargarTodo,
    guardar: guardarMenu,
    cambiarEstado: cambiarEstadoMenu,
    eliminar: eliminarMenu,
  };
}
