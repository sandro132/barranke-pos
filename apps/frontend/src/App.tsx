import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/Login/LoginPage";
import { DashboardPage } from "./pages/Dashboard/DashboardPage";
import { CuentasPage } from "./pages/Mesas/CuentasPage";
import { CuentaDetallePage } from "./pages/Mesas/CuentaDetallePage";
import { NuevoPedidoPage } from "./pages/Mesas/NuevoPedidoPage";
import { PrecuentaPage } from "./pages/Mesas/PrecuentaPage";
import { CocinaPage } from "./pages/Cocina/CocinaPage";
import { BarraPage } from "./pages/Barra/BarraPage";
import { CajaPage } from "./pages/Caja/CajaPage";
import { VentasPage } from "./pages/Ventas/VentasPage";
import { ComprasPage } from "./pages/Compras/ComprasPage";
import { ConsumoInternoPage } from "./pages/ConsumoInterno/ConsumoInternoPage";
import { NuevaCompraPage } from "./pages/Compras/NuevaCompraPage";
import { ProductosPage } from "./pages/Productos/ProductosPage";
import { IngredientesPage } from "./pages/Ingredientes/IngredientesPage";
import { TicketPage } from "./pages/Ticket/TicketPage";
import { ReportesPage } from "./pages/Reportes/ReportesPage";
import { PromocionesPage } from "./pages/Promociones/PromocionesPage";
import { ClientesPage } from "./pages/Clientes/ClientesPage";
import { HistorialCajaPage } from "./pages/Caja/HistorialCajaPage";
import { DetalleCajaHistorialPage } from "./pages/Caja/DetalleCajaHistorialPage";
import { AppLayout } from "./layouts/AppLayout";
import { RequireAuth } from "./components/RequireAuth";
import { RequireRole } from "./components/RequireRole";
import { UsuariosPage } from "./pages/Usuarios/UsuariosPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          {/* Fuera del AppLayout a propósito: el ticket y la precuenta no deben mostrar el sidebar al imprimir */}
          <Route path="/ventas/:ventaId/ticket" element={<TicketPage />} />
          <Route path="/cuentas/:id/precuenta" element={<PrecuentaPage />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<RequireRole roles={[]}><DashboardPage /></RequireRole>} />
            <Route
              path="/cuentas"
              element={
                <RequireRole roles={["MESERO"]}>
                  <CuentasPage />
                </RequireRole>
              }
            />
            <Route
              path="/cuentas/:id"
              element={
                <RequireRole roles={["MESERO"]}>
                  <CuentaDetallePage />
                </RequireRole>
              }
            />
            <Route
              path="/cuentas/:id/pedido"
              element={
                <RequireRole roles={["MESERO"]}>
                  <NuevoPedidoPage />
                </RequireRole>
              }
            />
            <Route
              path="/cocina"
              element={
                <RequireRole roles={["COCINA"]}>
                  <CocinaPage />
                </RequireRole>
              }
            />
            <Route
              path="/barra"
              element={
                <RequireRole roles={["BAR"]}>
                  <BarraPage />
                </RequireRole>
              }
            />
            <Route path="/caja" element={<RequireRole roles={[]}><CajaPage /></RequireRole>} />
            <Route path="/ventas" element={<RequireRole roles={[]}><VentasPage /></RequireRole>} />
            <Route
              path="/caja/historial"
              element={
                <RequireRole roles={[]}>
                  <HistorialCajaPage />
                </RequireRole>
              }
            />
            <Route
              path="/caja/historial/:id"
              element={
                <RequireRole roles={[]}>
                  <DetalleCajaHistorialPage />
                </RequireRole>
              }
            />
            <Route path="/compras" element={<RequireRole roles={[]}><ComprasPage /></RequireRole>} />
            <Route
              path="/consumo-interno"
              element={
                <RequireRole roles={["MESERO", "COCINA", "BAR"]}>
                  <ConsumoInternoPage />
                </RequireRole>
              }
            />
            <Route
              path="/compras/nueva"
              element={
                <RequireRole roles={[]}>
                  <NuevaCompraPage />
                </RequireRole>
              }
            />
            <Route
              path="/productos"
              element={
                <RequireRole roles={[]}>
                  <ProductosPage />
                </RequireRole>
              }
            />
            <Route
              path="/ingredientes"
              element={
                <RequireRole roles={[]}>
                  <IngredientesPage />
                </RequireRole>
              }
            />
            <Route path="/reportes" element={<RequireRole roles={[]}><ReportesPage /></RequireRole>} />
            <Route
              path="/promociones"
              element={
                <RequireRole roles={[]}>
                  <PromocionesPage />
                </RequireRole>
              }
            />
            <Route
              path="/clientes"
              element={
                <RequireRole roles={["MESERO"]}>
                  <ClientesPage />
                </RequireRole>
              }
            />
            <Route path="/usuarios" element={<RequireRole roles={[]}><UsuariosPage /></RequireRole>} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
