import React from 'react';

export interface CashRegisterIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  className?: string;
}

/**
 * Ícone estilizado de "Caixa Registradora" (Frente de Caixa / PDV Balcão)
 * Desenhado no padrão visual de traço, proporção e grid do Lucide Icons (24x24, 2px stroke).
 */
export const CashRegisterIcon: React.FC<CashRegisterIconProps> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 2,
  className = '',
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      {...props}
    >
      {/* Visor digital superior do caixa */}
      <rect x="6" y="2" width="12" height="5" rx="1" />
      <line x1="9" y1="4.5" x2="15" y2="4.5" />
      <line x1="12" y1="7" x2="12" y2="10" />

      {/* Corpo inclinado com teclado numérico */}
      <path d="M2.5 16L4 10h16l1.5 6" />
      <path d="M7 13h2" />
      <path d="M11 13h2" />
      <path d="M15 13h2" />

      {/* Gaveta de cédulas inferior com puxador/fechadura */}
      <rect x="2" y="16" width="20" height="6" rx="1" />
      <line x1="10" y1="19" x2="14" y2="19" />
    </svg>
  );
};

export const CashRegister = CashRegisterIcon;
export default CashRegisterIcon;
