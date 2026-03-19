// frontend/src/components/layout/LeftSidebar.tsx

import { ReactNode } from 'react';

interface LeftSidebarProps {
  children: ReactNode;
}

export function LeftSidebar({ children }: LeftSidebarProps) {
  return (
    <div className="w-60 bg-bg-secondary border-r border-border-color">
      {children}
    </div>
  );
}
