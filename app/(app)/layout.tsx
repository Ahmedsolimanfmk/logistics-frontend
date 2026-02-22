// app/(app)/layout.tsx
import AppShell from "@/src/components/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}