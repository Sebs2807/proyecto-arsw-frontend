import React from "react";
import ReactDOM from "react-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { Trash2, Plus, Pencil } from "lucide-react";
import { apiService } from "../../../services/api/ApiService";

interface Task {
  id: string;
  title: string;
  description: string;
  listId: string;
}

interface List {
  id: string;
  title: string;
  description?: string;
  order: number;
  cards: Task[];
}

// 🔹 Portal que renderiza el elemento arrastrado directamente en el <body>
const DragOverlayPortal: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  if (typeof window === "undefined") return null;
  const portal = document.getElementById("drag-portal");
  return ReactDOM.createPortal(children, portal ?? document.body);
};

const Board: React.FC = () => {
  const [lists, setLists] = React.useState<List[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [activeListId, setActiveListId] = React.useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskDescription, setNewTaskDescription] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [newListTitle, setNewListTitle] = React.useState("");
  const [editingListId, setEditingListId] = React.useState<string | null>(null);
  const [editedTitle, setEditedTitle] = React.useState("");

  React.useEffect(() => {
    const fetchLists = async () => {
      try {
        const data = await apiService.get<List[]>("/lists");
        setLists(data);
      } catch (err) {
        console.error("Error al cargar las listas:", err);
        setError("No se pudieron cargar las listas");
      } finally {
        setLoading(false);
      }
    };
    fetchLists();
  }, []);

  // 🧩 Drag and Drop
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const sourceListIndex = lists.findIndex((l) => l.id === source.droppableId);
    const destListIndex = lists.findIndex(
      (l) => l.id === destination.droppableId
    );
    if (sourceListIndex === -1 || destListIndex === -1) return;

    const newLists = [...lists];
    const [movedTask] = newLists[sourceListIndex].cards.splice(source.index, 1);
    const taskWithNewListId = { ...movedTask, listId: destination.droppableId };
    newLists[destListIndex].cards.splice(destination.index, 0, taskWithNewListId);
    setLists(newLists);

    try {
      await apiService.put(`/cards/${draggableId}`, {
        listId: destination.droppableId,
      });
    } catch (err) {
      console.error("Error al mover la tarea:", err);
    }
  };

  // 🧱 Crear lista
  const handleCreateList = async () => {
    if (!newListTitle.trim()) return;
    try {
      const newList = await apiService.post<List>("/lists", {
        title: newListTitle,
        order: lists.length,
      });
      setLists((prev) => [...prev, { ...newList, cards: [] }]);
      setNewListTitle("");
    } catch (err) {
      console.error("Error al crear lista:", err);
      alert("No se pudo crear la lista");
    }
  };

  // 🗑️ Eliminar lista
  const handleDeleteList = async (listId: string) => {
    const confirmDelete = window.confirm("¿Seguro que deseas eliminar esta lista?");
    if (!confirmDelete) return;
    try {
      await apiService.delete(`/lists/${listId}`);
      setLists((prev) => prev.filter((l) => l.id !== listId));
    } catch (err) {
      console.error("Error al eliminar lista:", err);
      alert("No se pudo eliminar la lista");
    }
  };

  // ✏️ Editar lista
  const handleEditList = async (listId: string) => {
    if (!editedTitle.trim()) return;
    try {
      const updated = await apiService.put<List>(`/lists/${listId}`, {
        title: editedTitle,
      });
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? { ...l, title: updated.title } : l))
      );
      setEditingListId(null);
    } catch (err) {
      console.error("Error al editar lista:", err);
      alert("No se pudo actualizar la lista");
    }
  };

  // ➕ Crear tarea
  const handleCreateTask = async (listId: string) => {
    if (!newTaskTitle.trim()) return;
    setIsCreating(true);
    try {
      const newCard = await apiService.post<Task>("/cards", {
        cardData: {
          title: newTaskTitle,
          description: newTaskDescription || "Sin descripción",
        },
        listId,
      });
      setLists((prev) =>
        prev.map((list) =>
          list.id === listId ? { ...list, cards: [...list.cards, newCard] } : list
        )
      );
      setNewTaskTitle("");
      setNewTaskDescription("");
      setActiveListId(null);
    } catch (err) {
      console.error("Error al crear tarea:", err);
      alert("Error al crear la tarea");
    } finally {
      setIsCreating(false);
    }
  };

  // 🗑️ Eliminar tarea
  const handleDeleteTask = async (listId: string, taskId: string) => {
    const confirmDelete = window.confirm("¿Seguro que deseas eliminar esta tarea?");
    if (!confirmDelete) return;
    try {
      await apiService.delete(`/cards/${taskId}`);
      setLists((prev) =>
        prev.map((list) =>
          list.id === listId
            ? { ...list, cards: list.cards.filter((c) => c.id !== taskId) }
            : list
        )
      );
    } catch (err) {
      console.error("Error al eliminar tarea:", err);
      alert("Error al eliminar la tarea");
    }
  };

  if (loading) return <p className="text-center text-text-muted">Cargando...</p>;
  if (error) return <p className="text-center text-text-error">{error}</p>;

  return (
    <div className="bg-dark-900 p-6 text-text-primary font-poppins h-screen flex flex-col">
      <h1 className="text-2xl font-semibold mb-6 text-text-secondary">
        Tablero CRM Dinámico
      </h1>

      {/* 🔸 Crear nueva lista */}
      <div className="mb-6 flex gap-2 items-center">
        <input
          type="text"
          placeholder="Nombre lista"
          value={newListTitle}
          onChange={(e) => setNewListTitle(e.target.value)}
          className="p-2 rounded-xl bg-dark-800 border border-dark-600 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-limeyellow-500 w-60 transition-all"
        />
        <button
          onClick={handleCreateList}
          className="text-sm text-text-muted hover:text-text-primary transition flex items-center gap-1"
        >
          <Plus size={16} /> Añadir lista
        </button>
      </div>

      {/* 🔹 Listas con tareas */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-row gap-6 overflow-x-auto flex-1 items-stretch scrollbar-custom">
          {lists.map((list) => (
            <Droppable droppableId={list.id} key={list.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-shrink-0 min-w-[300px] max-w-[350px] bg-dark-800 rounded-2xl border border-dark-600 p-4 flex flex-col"
                >
                  {/* 🏷️ Encabezado lista */}
                  <div className="flex justify-between items-center mb-4">
                    {editingListId === list.id ? (
                      <div className="flex gap-2 w-full">
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          className="p-2 text-sm bg-dark-900 border border-dark-600 rounded-xl text-text-primary flex-1"
                        />
                        <button
                          onClick={() => handleEditList(list.id)}
                          className="text-limeyellow-500 hover:text-limeyellow-400 transition text-sm"
                        >
                          Guardar
                        </button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-lg font-semibold truncate">
                          {list.title} ({list.cards.length})
                        </h2>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingListId(list.id);
                              setEditedTitle(list.title);
                            }}
                            className="text-text-muted hover:text-limeyellow-400"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteList(list.id)}
                            className="text-text-muted hover:text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 🧩 Tareas */}
                  <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                    {list.cards.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => {
                        const card = (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`relative p-3 rounded-xl border text-sm select-none animate-fade-in transition-all duration-200 
                              ${
                              snapshot.isDragging
                                ? "bg-dark-700 border-dark-600 shadow-[0_0_10px_2px_rgba(79,70,229,0.6)] scale-[1.02] z-[9999]"
                                : "bg-dark-800 border-dark-600 hover:shadow-[0_0_8px_1px_rgba(79,70,229,0.4)]"
                              }`}
                          >
                            <h3 className="font-medium text-text-primary truncate">
                              {task.title}
                            </h3>
                            <p className="text-xs text-text-muted mt-1 line-clamp-2">
                              {task.description}
                            </p>

                            <button
                              onClick={() => handleDeleteTask(list.id, task.id)}
                              className="absolute top-2 right-2 text-text-muted hover:text-red-400 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                        return snapshot.isDragging ? (
                          <DragOverlayPortal>{card}</DragOverlayPortal>
                        ) : (
                          card
                        );
                      }}
                    </Draggable>

                    ))}
                    {provided.placeholder}

                    {/* 🆕 Crear nueva tarea */}
                    {activeListId === list.id ? (
                      <div className="mt-3 space-y-2 p-2 bg-dark-900 rounded-lg border border-dark-600">
                        <input
                          type="text"
                          placeholder="Título de la tarea"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="w-full p-2 rounded-lg bg-dark-800 text-sm text-text-primary border border-dark-600"
                        />
                        <textarea
                          placeholder="Descripción (opcional)"
                          value={newTaskDescription}
                          onChange={(e) => setNewTaskDescription(e.target.value)}
                          className="w-full p-2 rounded-lg bg-dark-800 text-sm text-text-primary border border-dark-600"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCreateTask(list.id)}
                            disabled={isCreating}
                            className="px-3 py-1 bg-limeyellow-500 text-white rounded-lg text-sm hover:bg-limeyellow-600 disabled:opacity-50"
                          >
                            {isCreating ? "Creando..." : "Añadir"}
                          </button>
                          <button
                            onClick={() => {
                              setActiveListId(null);
                              setNewTaskTitle("");
                              setNewTaskDescription("");
                            }}
                            className="px-3 py-1 bg-dark-600 text-text-muted rounded-lg text-sm hover:bg-dark-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveListId(list.id);
                          setNewTaskTitle("");
                          setNewTaskDescription("");
                        }}
                        className="mt-4 w-full text-sm text-text-muted hover:text-text-primary p-2 border border-dashed border-dark-600 rounded-xl hover:border-limeyellow-500"
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
