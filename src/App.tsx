import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Catalog } from './components/Catalog';
import { FincaDetail } from './components/FincaDetail';
import { AdminDashboard } from './admin/AdminDashboard';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { BannerPromocional } from './components/BannerPromocional';
import { BeneficiosSection } from './components/BeneficiosSection';
import { MenusPublicosSection } from './components/MenusPublicosSection';
import { FaqSection } from './components/FaqSection';
import { FooterPublico } from './components/FooterPublico';
import { useAuth } from './hooks/useAuth';
import { useFincas } from './hooks/useFincas';
import { useDisponibilidad } from './hooks/useDisponibilidad';
import { useClientes } from './hooks/useClientes';
import { useCotizaciones } from './hooks/useCotizaciones';
import { useReservas } from './hooks/useReservas';
import { useMenus } from './hooks/useMenus';
import { useComunicaciones } from './hooks/useComunicaciones';
import { useConfiguracion } from './hooks/useConfiguracion';
import { useContenidoSitio } from './hooks/useContenidoSitio';
import { useCotizadorPublico } from './hooks/useCotizadorPublico';
import { DEFAULT_WA_NUMBER } from './services/supabase';
import type { ViewType, SeccionClave } from './types';

export const App: React.FC = () => {
  // Estado de vistas y navegación
  const [view, setView] = useState<ViewType>('cliente');
  const [selectedFincaId, setSelectedFincaId] = useState<string | null>(null);

  // Tema claro/oscuro
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('fc_theme') as 'light' | 'dark') || 'light';
  });

  // Número de WhatsApp global
  const [waNumberGlobal, setWaNumberGlobal] = useState<string>(() => {
    return localStorage.getItem('fc_global_wa') || DEFAULT_WA_NUMBER;
  });

  // Notificaciones Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modal de confirmación
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Modal de login rápido (acceso secreto)
  const [adminLoginModalOpen, setAdminLoginModalOpen] = useState(false);

  // Hooks de datos y servicios
  const { user, isAdminLoggedIn, login, logout } = useAuth();
  const { fincas, loading: loadingFincas, metricas, guardarFinca, desactivarFinca } = useFincas();
  const {
    bloquesFinca,
    bloquesAdmin,
    marcarDiasAdmin,
    eliminarBloqueo,
  } = useDisponibilidad(selectedFincaId);

  // Fase 1: Clientes, Cotizaciones, Reservas y Pagos
  const { clientes, guardar: guardarCliente, desactivar: desactivarCliente } = useClientes();
  const {
    cotizaciones,
    guardar: guardarCotizacion,
    cambiarEstado: cambiarEstadoCotizacion,
    eliminar: eliminarCotizacion,
  } = useCotizaciones();
  const {
    reservas,
    guardar: guardarReserva,
    cambiarEstado: cambiarEstadoReserva,
    cerrarReserva,
    reabrirReserva,
    eliminar: eliminarReserva,
    registrarPago,
    eliminarPago,
    metricas: metricasReservas,
  } = useReservas();

  // Fase 2: Hook de menús y alimentación
  const {
    menus,
    guardar: guardarMenu,
    cambiarEstado: cambiarEstadoMenu,
    eliminar: eliminarMenu,
  } = useMenus();

  // Fase 3: Hook de comunicaciones y WhatsApp
  const {
    comunicaciones,
    registrarComunicacion,
    limpiarHistorial: limpiarHistorialComunicaciones,
  } = useComunicaciones();

  // Fase 4: Hook de configuración general (empresa, documentos, consecutivos)
  const {
    config: configuracion,
    guardando: guardandoConfig,
    guardarConfiguracion,
    restablecerPorDefecto: restablecerConfiguracion,
  } = useConfiguracion();

  // Fase 5: Hook de contenido y personalización del sitio público
  const {
    contenido: contenidoSitio,
    guardando: guardandoContenido,
    guardarContenido,
    restablecerPorDefecto: restablecerContenido,
  } = useContenidoSitio();

  // Etapa 2: Hook del cotizador público (flujo cliente → Supabase)
  const { guardarCotizacionPublica } = useCotizadorPublico();

  // Sincronizar tema con el DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fc_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Toast helper
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Confirm modal helper
  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModalState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      },
    });
  };

  const handleSelectFinca = (id: string) => {
    setSelectedFincaId(id);
    setView('detalle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveWaNumber = (num: string) => {
    setWaNumberGlobal(num);
    localStorage.setItem('fc_global_wa', num);
  };

  const handleViewChange = (newView: ViewType) => {
    setView(newView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedFinca = fincas.find(f => f.id === selectedFincaId);

  // Renderizado dinámico de las secciones públicas según `orden_secciones`
  const renderSeccionesCliente = () => {
    let catalogoRendered = false;

    return contenidoSitio.orden_secciones.map((seccion: SeccionClave) => {
      switch (seccion) {
        case 'hero':
          return (
            <Hero
              key="hero"
              totalFincas={metricas.total}
              disponibles={metricas.disponibles}
              ocupadas={metricas.ocupadas}
              porcentajeOcupacion={metricas.porcentajeOcupacion}
              contenido={contenidoSitio}
              onExploreClick={() => {
                const el = document.getElementById('catalogo');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onMenusClick={() => {
                const el = document.getElementById('seccion-menus');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          );

        case 'destacados':
          return (
            <BeneficiosSection
              key="destacados"
              visible={contenidoSitio.destacados_visible}
              titulo={contenidoSitio.destacados_titulo}
              subtitulo={contenidoSitio.destacados_subtitulo}
              items={contenidoSitio.destacados_items}
            />
          );

        case 'estado':
        case 'filtros':
        case 'catalogo':
          // Renderiza el bloque del catálogo solo una vez al encontrar cualquiera de sus claves
          if (catalogoRendered) return null;
          catalogoRendered = true;
          return (
            <main key="catalogo-block" className="main-content">
              <Catalog
                fincas={fincas}
                loading={loadingFincas}
                bloquesAdmin={bloquesAdmin}
                onSelectFinca={handleSelectFinca}
                contenido={contenidoSitio}
              />
            </main>
          );

        case 'menus':
          return (
            <div key="menus" id="seccion-menus">
              <MenusPublicosSection
                visible={contenidoSitio.menus_visible}
                titulo={contenidoSitio.menus_titulo}
                subtitulo={contenidoSitio.menus_subtitulo}
                badgeTexto={contenidoSitio.menus_badge_texto}
                menus={menus}
                waNumber={waNumberGlobal}
              />
            </div>
          );

        case 'faq':
          return (
            <FaqSection
              key="faq"
              visible={contenidoSitio.faq_visible}
              titulo={contenidoSitio.faq_titulo}
              subtitulo={contenidoSitio.faq_subtitulo}
              items={contenidoSitio.faq_items}
            />
          );

        default:
          return null;
      }
    });
  };

  return (
    <div className="app-wrapper">
      {/* Banner de anuncio superior */}
      <BannerPromocional
        visible={contenidoSitio.banner_visible}
        texto={contenidoSitio.banner_texto}
        linkTexto={contenidoSitio.banner_link_texto}
        linkUrl={contenidoSitio.banner_link_url}
        tipo={contenidoSitio.banner_tipo}
      />

      <Navbar
        currentView={view}
        onViewChange={handleViewChange}
        theme={theme}
        onThemeToggle={toggleTheme}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAdminLoginModal={() => setAdminLoginModalOpen(true)}
        hasSelectedFinca={!!selectedFinca}
      />

      {view === 'cliente' && (
        <>
          {renderSeccionesCliente()}

          {/* Pie de página público enriquecido */}
          <FooterPublico
            visible={contenidoSitio.footer_visible}
            titulo={contenidoSitio.footer_titulo}
            subtitulo={contenidoSitio.footer_subtitulo}
            whatsappCta={contenidoSitio.footer_whatsapp_cta}
            configuracion={configuracion}
            waNumber={waNumberGlobal}
          />
        </>
      )}

      {view === 'detalle' && selectedFinca && (
        <main className="main-content" style={{ marginTop: '1.5rem' }}>
          <FincaDetail
            finca={selectedFinca}
            bloques={bloquesFinca}
            waNumberGlobal={waNumberGlobal}
            menus={menus}
            onBackToCatalog={() => handleViewChange('cliente')}
            onGuardarCotizacion={guardarCotizacionPublica}
          />
        </main>
      )}

      {view === 'admin' && (
        <main className="main-content" style={{ marginTop: '1.5rem' }}>
          <AdminDashboard
            isAdminLoggedIn={isAdminLoggedIn}
            userEmail={user?.email}
            fincas={fincas}
            bloquesAdmin={bloquesAdmin}
            currentWaNumber={waNumberGlobal}
            clientes={clientes}
            cotizaciones={cotizaciones}
            reservas={reservas}
            metricasReservas={metricasReservas}
            onLogin={login}
            onLogout={() => {
              logout();
              handleViewChange('cliente');
              showToast('Sesión administrativa finalizada', 'info');
            }}
            onSaveFinca={guardarFinca}
            onDeleteFinca={desactivarFinca}
            onMarcarDiasAdmin={marcarDiasAdmin}
            onEliminarBloqueo={eliminarBloqueo}
            onSaveWaNumber={handleSaveWaNumber}
            onGuardarCliente={guardarCliente}
            onDesactivarCliente={desactivarCliente}
            onGuardarCotizacion={guardarCotizacion}
            onCambiarEstadoCotizacion={cambiarEstadoCotizacion}
            onEliminarCotizacion={eliminarCotizacion}
            onGuardarReserva={guardarReserva}
            onCambiarEstadoReserva={cambiarEstadoReserva}
            onCerrarReserva={cerrarReserva}
            onReabrirReserva={reabrirReserva}
            onEliminarReserva={eliminarReserva}
            onRegistrarPago={registrarPago}
            onEliminarPago={eliminarPago}
            menus={menus}
            onGuardarMenu={guardarMenu}
            onCambiarEstadoMenu={cambiarEstadoMenu}
            onEliminarMenu={eliminarMenu}
            comunicaciones={comunicaciones}
            onRegistrarComunicacion={registrarComunicacion}
            onLimpiarHistorialComunicaciones={limpiarHistorialComunicaciones}
            configuracion={configuracion}
            guardandoConfig={guardandoConfig}
            onGuardarConfiguracion={guardarConfiguracion}
            onRestablecerConfiguracion={restablecerConfiguracion}
            contenidoSitio={contenidoSitio}
            guardandoContenido={guardandoContenido}
            onGuardarContenido={guardarContenido}
            onRestablecerContenido={restablecerContenido}
            onVerSitioPublico={() => handleViewChange('cliente')}
            showToast={showToast}
            openConfirm={openConfirm}
          />
        </main>
      )}

      {/* Notificaciones Toast flotantes */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Modal de confirmación genérico */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        onConfirm={confirmModalState.onConfirm}
        onCancel={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Modal de Login Secreto (3 clics en logo) */}
      <AdminLoginModal
        isOpen={adminLoginModalOpen}
        onClose={() => setAdminLoginModalOpen(false)}
        onLogin={async (email, pass) => {
          const res = await login(email, pass);
          if (res.success) {
            handleViewChange('admin');
          }
          return res;
        }}
        showToast={showToast}
      />
    </div>
  );
};
