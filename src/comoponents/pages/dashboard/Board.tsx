import React from "react";

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  value?: string;
}

const Board: React.FC = () => {
  const tasks: Task[] = [
    {
      id: 1,
      title: "Juan Pérez",
      description: "Nuevo lead LATAM",
      status: "Nuevo",
      value: "$2,300",
    },
    {
      id: 2,
      title: "María Gómez",
      description: "Seguimiento de propuesta",
      status: "En Progreso",
      value: "$5,800",
    },
    {
      id: 3,
      title: "Carlos Ruiz",
      description: "Venta cerrada con éxito",
      status: "Completado",
      value: "$12,000",
    },
    {
      id: 4,
      title: "Ana Torres",
      description: "Esperando respuesta del cliente",
      status: "En Progreso",
      value: "$4,200",
    },
    {
      id: 5,
      title: "Luis Martínez",
      description: "Primer contacto realizado",
      status: "Nuevo",
      value: "$1,900",
    },
  ];

  const columns = ["Nuevo", "En Progreso", "Completado"];

  return (
    <div className="bg-dark-900 min-h-screen p-6 text-text-primary font-poppins">
      <h1 className="text-2xl font-semibold mb-6 text-text-secondary">
        Tablero CRM (Kanban)
      </h1>

      <div className="flex flex-col md:flex-row gap-6 overflow-x-auto">
        {columns.map((col) => (
          <div
            key={col}
            className="flex-1 min-w-[280px] bg-dark-800 rounded-xl border border-dark-600 p-4 shadow-md"
          >
            {/* Header de columna */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-text-secondary">
                {col}
              </h2>
              <span className="text-sm text-text-muted bg-dark-600/50 px-2 py-1 rounded-md">
                {tasks.filter((t) => t.status === col).length}
              </span>
            </div>

            {/* Tarjetas */}
            <div className="flex flex-col gap-3">
              {tasks
                .filter((t) => t.status === col)
                .map((task) => (
                  <div
                    key={task.id}
                    className="bg-dark-100/20 border border-dark-600 rounded-lg p-4 hover:border-limeyellow-500/40 hover:shadow-[0_0_10px_rgba(124,106,247,0.25)] transition-all duration-300 cursor-pointer"
                  >
                    <h3 className="text-text-primary font-medium">
                      {task.title}
                    </h3>
                    <p className="text-sm text-text-muted mt-1">
                      {task.description}
                    </p>
                    {task.value && (
                      <p className="text-sm font-semibold text-text-accent mt-2">
                        {task.value}
                      </p>
                    )}
                  </div>
                ))}

              {/* Si la columna está vacía */}
              {tasks.filter((t) => t.status === col).length === 0 && (
                <p className="text-text-muted text-sm italic text-center py-6">
                  No hay tareas
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Board;
