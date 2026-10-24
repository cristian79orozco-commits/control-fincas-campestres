import { useState, useEffect } from 'react';

/**
 * Custom Hook para retrasar la actualización de un valor hasta que haya transcurrido
 * el tiempo de espera especificado (delay en milisegundos).
 * 
 * Permite mantener la fluidez de la interfaz a 60 FPS durante la escritura del usuario
 * en campos de búsqueda y filtros masivos, evitando re-renders y cálculos innecesarios.
 *
 * @param value Valor reactivo inmediato
 * @param delay Tiempo de retardo en milisegundos (por defecto 250ms)
 * @returns Valor retrasado tras transcurrir el delay de inactividad
 */
export function useDebounce<T>(value: T, delay: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
