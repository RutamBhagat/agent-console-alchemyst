"use client";

import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@agent-console-alchemyst/ui/components/sidebar";

export default function Home() {
  return (
    <SidebarProvider>
      <SidebarTrigger className="fixed left-3 top-3 z-50 bg-background/90 shadow-sm backdrop-blur" />
      <Sidebar side="left" collapsible="offcanvas"></Sidebar>
      <SidebarInset className="h-svh min-h-0 p-4"></SidebarInset>
      <Sidebar side="right" collapsible="offcanvas"></Sidebar>
    </SidebarProvider>
  );
}
