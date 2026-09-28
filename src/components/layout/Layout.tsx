import Sidebar from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

// No auth gate here anymore — this app runs locally for a single admin user,
// so it always renders straight to the app shell.
const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
