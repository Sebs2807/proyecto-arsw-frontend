export default function Dashboard() {
  return (
    <div className="min-h-screen bg-neutral-100 text-gray-800">
      {/* Top bar */}
      <header className="h-14 bg-white shadow-sm border-b flex items-center px-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-white font-bold">
            S
          </div>
          <h1 className="text-lg font-semibold">Synapse CRM</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <button className="text-sm px-3 py-1 rounded hover:bg-gray-100">
            Workspace
          </button>
          <div className="h-8 w-8 rounded-full bg-gray-300" />
        </div>
      </header>

      <main className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r min-h-[calc(100vh-56px)] p-4">
          <nav className="space-y-2">
            <div className="text-xs text-gray-500 uppercase">Navegación</div>
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50">
              Dashboard
            </button>
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50">
              Clientes
            </button>
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50">
              Oportunidades
            </button>
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50">
              Llamadas
            </button>
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50">
              Ajustes
            </button>
          </nav>
        </aside>

        {/* Content area (blank) */}
        <section className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-2 bg-white rounded-xl shadow-card p-6 min-h-[120px]">
              <h2 className="text-lg font-medium text-gray-700">Resumen</h2>
              <div className="mt-4 text-sm text-gray-500">
                Área en blanco para tus widgets y gráficos.
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card p-6 min-h-[120px]">
              <h3 className="text-md font-medium text-gray-700">
                Actividad reciente
              </h3>
              <div className="mt-4 text-sm text-gray-500">
                Sin actividad todavía.
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white rounded-xl shadow-card p-6">
            <h3 className="text-md font-medium text-gray-700">
              Tabla / Contenido principal
            </h3>
            <div className="mt-4 text-sm text-gray-500">
              Aquí puedes montar tablas, gráficos o listas.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
