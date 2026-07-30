import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/Login/LoginPage";
import { DashboardPage } from "./pages/Dashboard/DashboardPage";
import { MesasPage } from "./pages/Mesas/MesasPage";
import { MesaDetallePage } from "./pages/Mesas/MesaDetallePage";
import { NuevoPedidoPage } from "./pages/Mesas/NuevoPedidoPage";
import { CocinaPage } from "./pages/Cocina/CocinaPage";
import { BarraPage } from "./pages/Barra/BarraPage";
import { CajaPage } from "./pages/Caja/CajaPage";
import { AppLayout } from "./layouts/AppLayout";
import { RequireAuth } from "./components/RequireAuth";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/mesas" element={<MesasPage />} />
            <Route path="/mesas/:id" element={<MesaDetallePage />} />
            <Route path="/mesas/:id/pedido" element={<NuevoPedidoPage />} />
            <Route path="/cocina" element={<CocinaPage />} />
            <Route path="/barra" element={<BarraPage />} />
            <Route path="/caja" element={<CajaPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
