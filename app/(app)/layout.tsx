export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: 20 }}>
      APP LAYOUT WORKING
      {children}
    </div>
  );
}