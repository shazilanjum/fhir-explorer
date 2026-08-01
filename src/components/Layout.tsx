/**
 * App shell (Workbench): command bar on top, a resource rail on the left (fixed
 * on desktop, a slide-over drawer on mobile), routed content in the canvas.
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Dialog } from '@base-ui-components/react/dialog';
import { ConnectionBar } from './ConnectionBar';
import { ResourceSidebar } from './ResourceSidebar';
import { CommandPalette } from './CommandPalette';
import { RequestInspector } from './RequestInspector';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <CommandPalette />
      <RequestInspector />
      <ConnectionBar onToggleSidebar={() => setSidebarOpen((o) => !o)} />

      <div className="flex min-h-0 flex-1">
        {/* Desktop rail */}
        <aside className="hidden w-60 shrink-0 border-r border-rule md:block">
          <ResourceSidebar />
        </aside>

        {/* Mobile drawer */}
        <Dialog.Root open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink/25 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 md:hidden" />
            <Dialog.Popup className="fixed left-0 top-0 z-40 h-full w-72 rounded-r-card bg-paper shadow-pop outline-none transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full md:hidden">
              <ResourceSidebar onNavigate={() => setSidebarOpen(false)} />
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        <main className="blueprint scrollbar-thin min-w-0 flex-1 overflow-y-auto bg-paper-2">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
