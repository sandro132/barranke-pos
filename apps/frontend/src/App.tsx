import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/Login/LoginPage";
import { DashboardPage } from "./pages/Dashboard/DashboardPage";
import { MesasPage } from "./pages/Mesas/MesasPage";
import { MesaDetallePage } from "./pages/Mesas/MesaDetallePage";
import { NuevoPedidoPage } from "./pages/Mesas/NuevoPedidoPage";
import { CocinaPage } from "./pages/Cocina/CocinaPage";
import { BarraPage } from "./pages/Barra/BarraPage";
import { CajaPage } from "./pages/Caja/CajaPage";
import { ComprasPage } from "./pages/Compras/ComprasPage";
import { NuevaCompraPage } from "./pages/Compras/NuevaCompraPage";
import { ProductosPage } from "./pages/Productos/ProductosPage";
import { IngredientesPage } from "./pages/Ingredientes/IngredientesPage";
import { TicketPage } from "./pages/Ticket/TicketPage";
import { ReportesPage } from "./pages/Reportes/ReportesPage";
import { HistorialCajaPage } from "./pages/Caja/HistorialCajaPage";
import { DetalleCajaHistorialPage } from "./pages/Caja/DetalleCajaHistorialPage";
import { AppLayout } from "./layouts/AppLayout";
import { RequireAuth } from "./components/RequireAuth";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          {/* Fuera del AppLayout a propósito: el ticket no debe mostrar el sidebar al imprimir */}
          <Route path="/ventas/:ventaId/ticket" element={<TicketPage />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/mesas" element={<MesasPage />} />
            <Route path="/mesas/:id" element={<MesaDetallePage />} />
            <Route path="/mesas/:id/pedido" element={<NuevoPedidoPage />} />
            <Route path="/cocina" element={<CocinaPage />} />
            <Route path="/barra" element={<BarraPage />} />
            <Route path="/caja" element={<CajaPage />} />
            <Route path="/caja/historial" element={<HistorialCajaPage />} />
            <Route path="/caja/historial/:id" element={<DetalleCajaHistorialPage />} />
            <Route path="/compras" element={<ComprasPage />} />
            <Route path="/compras/nueva" element={<NuevaCompraPage />} />
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/ingredientes" element={<IngredientesPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
