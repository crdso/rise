import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Remove o indicador flutuante do Next em desenvolvimento (o "N" no canto).
  // Opção oficial e suportada na v16 — nada de esconder DOM interno com CSS.
  // Erros de compilação/runtime continuam sendo exibidos normalmente.
  devIndicators: false,
};

export default nextConfig;
