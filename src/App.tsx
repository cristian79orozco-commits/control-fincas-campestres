import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Catalog } from './components/Catalog';
import { FincaDetail } from './components/FincaDetail';
import { AdminDashboard } from './admin/AdminDashboard';
import { ToastContainer } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminFloatingBar } from './components/AdminFloatingBar';
import { BannerPromocional } from './components/BannerPromocional';
import { BeneficiosSection } from './components/BeneficiosSection';
import { MenusPublicosSection } from './components/MenusPublicosSection';
import { FaqSection } from './components/FaqSection';
import { FooterPublico } from './components/FooterPublico';
import { useAuth } from './hooks/useAuth';
import { useApp } from './context/AppContext';
import { DEFAULT_WA_NUMBER } from './services/supabase';
import type { ViewType, SeccionClave } from './types';

export const App: React.FC = () => {
  // Autenticación administrativa
  const { user, isAdminLoggedIn, login, logout } = useAuth();

  // ESTADO Y ACCIONES CENTRALIZADAS EN TIEMPO REAL (Única fuente de la verdad para toda la app)
  const {
    view,
    setView,
    selectedFincaId,
    setSelectedFincaId,
    navegarACliente,
    navegarAAdmin,
    previsualizarFinca,
    toasts,
    showToast,
    dismissToast,
    confirmModalState,
    openConfirm,
    closeConfirm,
    fincas,
    todasLasFincas,
    bloquesAdmin,
    clientes,
    cotizaciones,
    reservas,
    menus,
    comunicaciones,
    configuracion,
    contenidoSitio,
    loading: loadingFincas,
    metricasFincas: metricas,
    metricasReservas,
    recargarTodo,
    guardarCotizacionPublica,
    guardarFinca,
    desactivarFinca,
    reactivarFinca,
    marcarDiasAdmin,
    eliminarBloqueo,
    guardarCliente,
    desactivarCliente,
    eliminarCliente,
    guardarCotizacion,
    cambiarEstadoCotizacion,
    eliminarCotizacion,
    convertirCotizacionAReserva,
    guardarReserva,
    cambiarEstadoReserva,
    cerrarReserva,
    reabrirReserva,
    eliminarReserva,
    registrarPago,
    eliminarPago,
    guardarMenu,
    cambiarEstadoMenu,
    eliminarMenu,
    registrarComunicacion,
    limpiarHistorialComunicaciones,
    guardandoConfig,
    guardarConfiguracion,
    restablecerConfiguracion,
    guardandoContenido,
    guardarContenido,
    restablecerContenido,
  } = useApp();

  // Tema claro/oscuro
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('fc_theme') as 'light' | 'dark') || 'light';
  });

  // Número de WhatsApp global (sincronizado desde Supabase via configuracion_general)
  const [waNumberGlobal, setWaNumberGlobal] = useState<string>(DEFAULT_WA_NUMBER);

  // Modal de login rápido (acceso secreto)
  const [adminLoginModalOpen, setAdminLoginModalOpen] = useState(false);

  // Bloques de fechas para la finca seleccionada (computado reactivamente desde el estado central)
  const bloquesFinca = useMemo(() => {
    if (!selectedFincaId) return [];
    return bloquesAdmin.filter(b => b.finca_id === selectedFincaId);
  }, [bloquesAdmin, selectedFincaId]);

  // Sincronizar WhatsApp global desde configuración de Supabase
  useEffect(() => {
    if (configuracion.whatsapp) {
      setWaNumberGlobal(configuracion.whatsapp);
    }
  }, [configuracion.whatsapp]);

  // Sincronizar tema con el DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fc_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSelectFinca = (id: string) => {
    previsualizarFinca(id);
  };

  const handleSaveWaNumber = (num: string) => {
    setWaNumberGlobal(num);
    guardarConfiguracion({ whatsapp: num });
  };

  const handleViewChange = (newView: ViewType) => {
    if (newView === 'cliente') {
      navegarACliente();
      recargarTodo();
    } else if (newView === 'admin') {
      navegarAAdmin();
    } else {
      setView(newView);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Sincronización automática de datos al enfocar la pestaña del navegador
  useEffect(() => {
    const handleFocus = () => {
      recargarTodo();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [recargarTodo]);

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
                waNumber={waNumberGlobal}
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
            configuracion={configuracion}
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
            fincas={todasLasFincas}
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
            onEliminarCliente={eliminarCliente}
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

      {/* Barra de control flotante del Administrador cuando navega en portal cliente */}
      <AdminFloatingBar
        isAdminLoggedIn={isAdminLoggedIn}
        onVolverAdmin={() => handleViewChange('admin')}
      />

      {/* Notificaciones Toast flotantes */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Modal de confirmación genérico */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        onConfirm={confirmModalState.onConfirm}
        onCancel={closeConfirm}
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
