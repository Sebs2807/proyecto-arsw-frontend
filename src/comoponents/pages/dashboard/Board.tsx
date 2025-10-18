import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Trash2 } from "lucide-react";
import { apiService } from "../../../services/api/ApiService";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  value?: string;
}

const Board: React.FC = () => {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [newTaskTitle, setNewTaskTitle] = React.useState<string>("");
  const [newTaskDescription, setNewTaskDescription] = React.useState<string>("");
  const [newTaskDueDate, setNewTaskDueDate] = React.useState<string>("");
  const [activeColumn, setActiveColumn] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  

  const columns = ["Nuevo", "En Progreso", "Completado"];

  const statusMap: Record<string, string> = {
    Nuevo: "new",
    "En Progreso": "in_progress",
    Completado: "completed",
  };

  React.useEffect(() => {
    const fetchCards = async () => {
      try {
        const data = await apiService.get<any[]>("/cards");
        const formatted = data.map((card: any) => ({
          id: card.id,
          title: card.title,
          description: card.description || "Sin descripción",
          status:
            card.status === "new"
              ? "Nuevo"
              : card.status === "in_progress"
              ? "En Progreso"
              : "Completado",
        }));
        setTasks(formatted);
      } catch (err: any) {
        console.error("Error al cargar las tarjetas:", err);
        setError("No se pudieron cargar las tareas");
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, []);

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const updated = tasks.map((task) =>
      task.id === draggableId
        ? { ...task, status: destination.droppableId }
        : task
    );
    setTasks(updated);

    const newStatus = statusMap[destination.droppableId];
    try {
      await apiService.put(`/cards/${draggableId}`, {
        status: newStatus,
      });
    } catch (err) {
      console.error("Error al actualizar el estado:", err);
    }
  };

  const handleCreateTask = async (column: string) => {
    if (!newTaskTitle.trim()) return;
    setIsCreating(true);
    const backendStatus = statusMap[column];

    try {
      const newCard = await apiService.post<Task>("/cards", {
        cardData: {
          title: newTaskTitle,
          description: newTaskDescription || "Sin descripción",
          status: backendStatus,
          priority: "medium",
          dueDate: newTaskDueDate || null,
        },
        listId: "f4cd68e3-ebd5-494b-b8f0-dfe650cd587f",
      });

      const formatted = {
        id: newCard.id,
        title: newCard.title,
        description: newCard.description,
        status: column,
      };

      setTasks((prev) => [...prev, formatted]);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDueDate("");
      setActiveColumn(null);
    } catch (err) {
      console.error("Error al crear la tarea:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmDelete = window.confirm("¿Seguro que deseas eliminar esta tarea?");
    if (!confirmDelete) return;

    try {
      await apiService.delete(`/cards/${taskId}`);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      console.error("Error al eliminar la tarea:", err);
      alert("No se pudo eliminar la tarea. Intenta nuevamente.");
    }
  };

  if (loading) return <p className="text-center text-gray-400">Cargando...</p>;
  if (error) return <p className="text-center text-red-400">{error}</p>;

  return (
    <div className="bg-dark-900 min-h-screen p-6 text-text-primary font-poppins">
      <h1 className="text-2xl font-semibold mb-6 text-text-secondary">
        Tablero CRM
      </h1>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col md:flex-row gap-6 overflow-x-auto">
          {columns.map((col) => (
            <Droppable droppableId={col} key={col}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-1 min-w-[280px] bg-dark-800 rounded-xl border border-dark-600 p-4 shadow-md"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-text-secondary">
                      {col}
                    </h2>
                    <span className="text-sm text-text-muted bg-dark-600/50 px-2 py-1 rounded-md">
                      {tasks.filter((t) => t.status === col).length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {tasks
                      .filter((t) => t.status === col)
                      .map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="relative bg-dark-100/20 border border-dark-600 rounded-lg p-4 hover:border-limeyellow-500/40 hover:shadow-[0_0_10px_rgba(124,106,247,0.25)] transition-all duration-300 cursor-pointer"
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
                              <button onClick={() => handleDeleteTask(task.id)}
                                title="Eliminar tarea"
                                className="absolute bottom-2 right-2 text-white text-lg hover:text-red-400 hover:scale-110 transition">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}

                    {activeColumn === col ? (
                      <div className="mt-3 space-y-2">
                        <input
                          type="text"
                          placeholder="Título de la tarea"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="w-full p-2 rounded bg-dark-700 text-sm text-text-primary border border-dark-500"
                        />
                        <textarea
                          placeholder="Descripción (opcional)"
                          value={newTaskDescription}
                          onChange={(e) =>
                            setNewTaskDescription(e.target.value)
                          }
                          className="w-full p-2 rounded bg-dark-700 text-sm text-text-primary border border-dark-500"
                        />
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                          className="w-full p-2 rounded bg-dark-700 text-sm text-text-primary border border-dark-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCreateTask(col)}
                            disabled={isCreating}
                            className="px-3 py-1 bg-limeyellow-500 text-dark-900 rounded text-sm font-medium hover:bg-limeyellow-400 transition"
                          >
                            {isCreating ? "Creando..." : "Añadir"}
                          </button>
                          <button
                            onClick={() => setActiveColumn(null)}
                            className="px-3 py-1 bg-dark-600 text-text-muted rounded text-sm hover:bg-dark-500"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveColumn(col)}
                        className="mt-4 w-full text-sm text-text-muted hover:text-text-primary transition"
                      >
                        + Añadir tarea
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default Board;
