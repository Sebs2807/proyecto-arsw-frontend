import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { Trash2, Pencil, Headset } from "lucide-react";
import { apiService } from "../../../services/api/ApiService";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";
import { useNavigate } from "react-router-dom";

export interface Task {
  id: string;
  title: string;
  description?: string;
  listId: string;
}

interface List {
  id: string;
  title: string;
  description?: string;
  order: number;
  cards: Task[];
}

// Portal para el Drag Overlay
const DragOverlayPortal: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  if (typeof window === "undefined") return null;
  const portal = document.getElementById("drag-portal");
  return ReactDOM.createPortal(children, portal ?? document.body);
};

const Board: React.FC = () => {
  // 1. OBTENER ESTADO DE REDUX
  const { selectedBoard } = useSelector((state: RootState) => state.workspace);

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

  // 2. FETCH DE LISTAS BASADO EN selectedBoard
  useEffect(() => {
    if (!selectedBoard?.id) {
      setError("No hay tablero seleccionado.");
      setLists([]);
      setLoading(false);
      return;
    }

    const fetchLists = async (boardId: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiService.get<List[]>(`/v1/lists/board/${boardId}`);
        setLists(data);
      } catch (err) {
        console.error("Error al cargar las listas:", err);
        setError("No se pudieron cargar las listas del tablero.");
      } finally {
        setLoading(false);
      }
    };

    fetchLists(selectedBoard.id);
  }, [selectedBoard?.id]); // Depende del ID del tablero

  useEffect(() => {
    if (!selectedBoard?.id) return;

    const boardId = selectedBoard.id;

    apiService.initSocket(
      (newList) =>
        setLists((prev) =>
          prev.some((l) => l.id === newList.id)
            ? prev
            : [...prev, { ...newList, cards: [] }]
        ),
      (updatedList) =>
        setLists((prev) =>
          prev.map((l) =>
            l.id === updatedList.id ? { ...l, ...updatedList } : l
          )
        ),
      (id) => setLists((prev) => prev.filter((l) => l.id !== id)),
      (listId, card) =>
        setLists((prev) =>
          prev.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  cards: l.cards.some((c) => c.id === card.id)
                    ? l.cards
                    : [...l.cards, card],
                }
              : l
          )
        ),
      (listId, card) =>
        setLists((prev) =>
          prev.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  cards: l.cards.map((c) =>
                    c.id === card.id ? { ...c, ...card } : c
                  ),
                }
              : l
          )
        ),
      (listId, cardId) =>
        setLists((prev) =>
          prev.map((l) =>
            l.id === listId
              ? { ...l, cards: l.cards.filter((c) => c.id !== cardId) }
              : l
          )
        ),
      (sourceListId, destListId, card) =>
        setLists((prev) =>
          prev.map((l) => {
            if (l.id === sourceListId)
              return { ...l, cards: l.cards.filter((c) => c.id !== card.id) };
            if (l.id === destListId)
              return {
                ...l,
                cards: l.cards.some((c) => c.id === card.id)
                  ? l.cards
                  : [...l.cards, card],
              };
            return l;
          })
        ),
      boardId
    );

    return () => {
      apiService.disconnectSocket();
    };
  }, [selectedBoard?.id]);

  // 4. MANEJO DE DRAG AND DROP
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
    const taskWithNewListId = {
      ...movedTask,
      listId: destination.droppableId,
    };
    newLists[destListIndex].cards.splice(
      destination.index,
      0,
      taskWithNewListId
    );
    setLists(newLists);

    try {
      await apiService.put(`/v1/cards/${draggableId}`, {
        listId: destination.droppableId,
        sourceListId: source.droppableId,
      });
    } catch (err) {
      console.error("Error al mover la tarea:", err);
    }
  };

  const navigate = useNavigate();

  const handleLiveKit = async (roomId: string) => {
    try {
      const { token } = await apiService.get<{ token: string }>(
        `/livekit/token?room=${roomId}&name=Santiago`
      );

      navigate(`/livekit/${roomId}/${token}`);
    } catch (err) {
      console.error("Error al generar token de LiveKit:", err);
    }
  };

  const handleCreateList = async () => {
    if (!newListTitle.trim()) return;
    try {
      await apiService.post<List>("/v1/lists", {
        title: newListTitle,
        order: lists.length,
        boardId: selectedBoard?.id,
      });

      setNewListTitle("");
    } catch {
      alert("No se pudo crear la lista");
    }
  };

  const handleEditList = async (listId: string) => {
    if (!editedTitle.trim()) return;
    try {
      await apiService.put<List>(`/v1/lists/${listId}`, {
        title: editedTitle,
      });
      setEditingListId(null);
    } catch {
      alert("No se pudo actualizar la lista");
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta lista?")) return;
    try {
      await apiService.delete(`/v1/lists/${listId}`);
    } catch {
      alert("No se pudo eliminar la lista");
    }
  };

  const handleCreateTask = async (listId: string) => {
    if (!newTaskTitle.trim()) return;
    setIsCreating(true);
    try {
      await apiService.post<Task>("/v1/cards", {
        cardData: {
          title: newTaskTitle,
          description: newTaskDescription || "Sin descripción",
        },
        listId,
      });
      setNewTaskTitle("");
      setNewTaskDescription("");
      setActiveListId(null);
    } catch {
      alert("Error al crear la tarea");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta tarea?")) return;
    try {
      await apiService.delete(`/v1/cards/${taskId}`);
    } catch {
      alert("Error al eliminar la tarea");
    }
  };

  if (error) return <p className="text-center text-text-error">{error}</p>;

  if (!selectedBoard)
    return (
      <p className="text-center text-text-muted">
        Selecciona un tablero para comenzar.
      </p>
    );

  if (loading)
    return <p className="text-center text-text-muted">Cargando tablero...</p>;

  return (
    <div className="bg-dark-900 text-text-primary font-poppins h-full flex flex-col">
      <h1 className="text-2xl font-semibold mb-5 text-text-secondary">
        {selectedBoard.title}
      </h1>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-row gap-6 overflow-x-auto h-full pb-0 scrollbar-custom">
            {lists.map((list) => (
              <Droppable droppableId={list.id} key={list.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    // ✅ TAILWIND CORREGIDO: Ancho fijo para scroll horizontal
                    className="flex-shrink-0 w-[300px] bg-dark-800 rounded-lg border border-dark-600 p-4 flex flex-col"
                  >
                    <div className="flex justify-between items-center mb-4">
                      {editingListId === list.id ? (
                        <div className="flex gap-2 w-full">
                          <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            className="p-2 text-sm bg-dark-900 border border-dark-600 rounded-lg flex-1"
                          />
                          <button
                            onClick={() => handleEditList(list.id)}
                            className="text-limeyellow-500 text-sm"
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
                            >
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => handleDeleteList(list.id)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1 scrollbar-hide">
                      {list.cards.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(provided, snapshot) => {
                            // El handler de prueba de edición asume que ya lo definiste en el componente Board:
                            // const handleEditTaskTest = async (taskId: string, currentTitle: string) => { ... }

                            const card = (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`relative p-3 rounded-lg border text-sm select-none transition-all duration-300 ease-out transform ${
                                  snapshot.isDragging
                                    ? "bg-dark-800 border-limeyellow-500 scale-[1.02] shadow-md shadow-dark-700/50"
                                    : "bg-dark-800 border-dark-600 hover:border-limeyellow-400 hover:shadow-sm"
                                }`}
                              >
                                <h3 className="font-medium truncate text-text-primary">
                                  {task.title}
                                </h3>
                                <p className="text-xs mt-1 line-clamp-2 text-text-muted">
                                  {task.description}
                                </p>

                                <div className="absolute top-2 right-2 flex gap-1">
                                  <button
                                    onClick={() => handleLiveKit(task.id)}
                                    className="text-text-muted hover:text-limeyellow-500 transition-colors z-10"
                                    title="Lanzar prueba de edición (PUT)"
                                  >
                                    <Headset size={14} />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteTask(list.id)}
                                    className="text-text-muted hover:text-red-400 transition-colors z-10"
                                    title="Eliminar tarea (DELETE)"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                {/* FIN CONTENEDOR DE BOTONES */}
                              </div>
                            );
                            return snapshot.isDragging ? (
                              <DragOverlayPortal>
                                <div className="pointer-events-none">
                                  {card}
                                </div>
                              </DragOverlayPortal>
                            ) : (
                              card
                            );
                          }}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {activeListId === list.id ? (
                        <div className="mt-3 space-y-2 p-2 bg-dark-900 rounded-lg border border-dark-600">
                          <input
                            type="text"
                            placeholder="Título de la tarea"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            className="w-full p-2 rounded-lg bg-dark-800 text-sm"
                          />
                          <textarea
                            placeholder="Descripción (opcional)"
                            value={newTaskDescription}
                            onChange={(e) =>
                              setNewTaskDescription(e.target.value)
                            }
                            className="w-full p-2 rounded-lg bg-dark-800 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCreateTask(list.id)}
                              disabled={isCreating}
                              className="px-3 py-1 bg-limeyellow-500 text-white rounded-lg text-sm"
                            >
                              {isCreating ? "Creando..." : "Añadir"}
                            </button>
                            <button
                              onClick={() => {
                                setActiveListId(null);
                                setNewTaskTitle("");
                                setNewTaskDescription("");
                              }}
                              className="px-3 py-1 bg-dark-600 text-sm"
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
                          className="mt-4 w-full text-sm text-text-muted hover:text-text-primary p-2 border border-dashed border-dark-600 rounded-lg"
                        >
                          + Añadir tarea
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}

            <Droppable droppableId="new-list-placeholder">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-shrink-0 w-[300px] bg-dark-900 border-2 p-4 flex flex-col items-stretch text-text-muted transition-all rounded-lg  duration-200
                    ${
                      snapshot.isDraggingOver
                        ? "border-limeyellow-500"
                        : "border-dashed border-dark-600"
                    }
                  `}
                >
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Nueva lista..."
                      value={newListTitle}
                      onChange={(e) => setNewListTitle(e.target.value)}
                      className="w-full p-2 rounded-lg bg-dark-800 border border-dark-600 text-sm"
                    />
                    <button
                      onClick={handleCreateList}
                      className="px-3 py-1 bg-limeyellow-500 text-dark-900 rounded-lg text-sm"
                    >
                      Crear lista
                    </button>
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

export default Board;
