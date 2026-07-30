import { apiRequest } from "./api";

export interface IngredienteDTO {
  id: string;
  nombre: string;
  unidad: string;
  stock: number;
  stockMinimo: number;
  stockBajo: boolean;
}

export function listarIngredientes(soloStockBajo?: boolean) {
  const query = soloStockBajo ? "?stockBajo=true" : "";
  return apiRequest<IngredienteDTO[]>(`/ingredientes${query}`);
}
