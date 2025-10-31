import React from "react";
import ReactDOM from "react-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { Trash2, Plus, Pencil } from "lucide-react";
import { apiService } from "../../../services/api/ApiService";
import { io, Socket } from "socket.io-client";

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
  const [editingListId, setEditingListId] = React.useState<string | null>(
    null
  );
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

  React.useEffect(() => {
    const socket: Socket = io("https://localhost:3000", {
      transports: ["websocket"],
      secure: true,
      rejectUnauthorized: false,
    });

    socket.on("connect", () => console.log("🟢 Conectado a WebSocket"));
    socket.on("disconnect", () =>
      console.log("🔴 Desconectado de WebSocket")
    );

    socket.on("list:created", (newList: List) => {
      setLists((prev) => {
        const exists = prev.some((l) => l.id === newList.id);
        if (exists) return prev;
        return [...prev, { ...newList, cards: [] }];
      });
    });

    socket.on("list:updated", (updatedList: List) => {
      setLists((prev) =>
        prev.map((l) =>
          l.id === updatedList.id ? { ...l, ...updatedList } : l
        )
      );
    });

    socket.on("list:deleted", ({ id }: { id: string }) => {
      setLists((prev) => prev.filter((l) => l.id !== id));
    });

    socket.on("card:created", ({ listId, card }) => {
      setLists((prev) =>
        prev.map((l) => {
          if (l.id !== listId) return l;
          const exists = l.cards.some((c) => c.id === card.id);
          if (exists) return l;
          return { ...l, cards: [...l.cards, card] };
        })
      );
    });

    socket.on("card:updated", ({ listId, card }) => {
      setLists((prev) =>
        prev.map((l) => {
          if (l.id !== listId) return l;
          return {
            ...l,
            cards: l.cards.map((c) =>
              c.id === card.id ? { ...c, ...card } : c
            ),
          };
        })
      );
    });

    socket.on("card:deleted", ({ listId, cardId }) => {
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? {
              ...l,
              cards: l.cards.filter((c) => c.id !== cardId),
            }
            : l
        )
      );
    });

    socket.on("card:moved", ({ sourceListId, destListId, card }) => {
      setLists((prev) => {
        const updated = prev.map((l) => {
          if (l.id === sourceListId) {
            return {
              ...l,
              cards: l.cards.filter((c) => c.id !== card.id),
            };
          } else if (l.id === destListId) {
            const exists = l.cards.some((c) => c.id === card.id);
            if (exists) return l;
            return { ...l, cards: [...l.cards, card] };
          }
          return l;
        });
        return updated;
      });
    });

    return () => {
      console.log("🧹 Cerrando conexión WebSocket...");
      socket.disconnect();
    };
  }, []);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const sourceListIndex = lists.findIndex(
      (l) => l.id === source.droppableId
    );
    const destListIndex = lists.findIndex(
      (l) => l.id === destination.droppableId
    );
    if (sourceListIndex === -1 || destListIndex === -1) return;

    const newLists = [...lists];
    const [movedTask] = newLists[sourceListIndex].cards.splice(
      source.index,
      1
    );
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


  const handleCreateList = async () => {
    if (!newListTitle.trim()) return;
    try {
      await apiService.post<List>("/lists", {
        title: newListTitle,
        order: lists.length,
      });
      setNewListTitle("");
    } catch {
      alert("No se pudo crear la lista");
    }
  };


  const handleEditList = async (listId: string) => {
    if (!editedTitle.trim()) return;
    try {
      await apiService.put<List>(`/lists/${listId}`, {
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
      await apiService.delete(`/lists/${listId}`);
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

  const handleDeleteTask = async (listId: string, taskId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta tarea?")) return;
    try {
      await apiService.delete(`/v1/cards/${taskId}`);
    } catch {
      alert("Error al eliminar la tarea");
    }
  };

  if (loading)
    return <p className="text-center text-text-muted">Cargando...</p>;
  if (error) return <p className="text-center text-text-error">{error}</p>;

  return (
    <div className="bg-dark-900 p-6 text-text-primary font-poppins h-screen flex flex-col">
      <h1 className="text-2xl font-semibold mb-6 text-text-secondary">
        Tablero CRM Dinámico
      </h1>

      <div className="mb-6 flex gap-2 items-center">
        <input
          type="text"
          placeholder="Nombre lista"
          value={newListTitle}
          onChange={(e) => setNewListTitle(e.target.value)}
          className="p-2 rounded-xl bg-dark-800 border border-dark-600 text-sm w-60"
        />
        <button
          onClick={handleCreateList}
          className="text-sm text-text-muted hover:text-text-primary transition flex items-center gap-1"
        >
          <Plus size={16} /> Añadir lista
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-row gap-6 overflow-x-auto flex-1">
          {lists.map((list) => (
            <Droppable droppableId={list.id} key={list.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-shrink-0 min-w-[300px] max-w-[350px] bg-dark-800 rounded-2xl border border-dark-600 p-4 flex flex-col"
                >
                  <div className="flex justify-between items-center mb-4">
                    {editingListId === list.id ? (
                      <div className="flex gap-2 w-full">
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={(e) =>
                            setEditedTitle(
                              e.target.value
                            )
                          }
                          className="p-2 text-sm bg-dark-900 border border-dark-600 rounded-xl flex-1"
                        />
                        <button
                          onClick={() =>
                            handleEditList(list.id)
                          }
                          className="text-limeyellow-500 text-sm"
                        >
                          Guardar
                        </button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-lg font-semibold truncate">
                          {list.title} (
                          {list.cards.length})
                        </h2>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingListId(
                                list.id
                              );
                              setEditedTitle(
                                list.title
                              );
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteList(
                                list.id
                              )
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                    {list.cards.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided, snapshot) => {
                          const card = (
                            <div
                              ref={
                                provided.innerRef
                              }
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`relative p-3 rounded-2xl border text-sm select-none transition-all duration-300 ease-out transform ${snapshot.isDragging
                                  ? "bg-dark-800 border-limeyellow-500 scale-[1.02] shadow-md shadow-dark-700/50"
                                  : "bg-dark-800 border-dark-600 hover:border-limeyellow-400 hover:shadow-sm"
                                }`}
                            >
                              <h3 className="font-medium truncate text-text-primary">
                                {task.title}
                              </h3>
                              <p className="text-xs mt-1 line-clamp-2 text-text-muted">
                                {
                                  task.description
                                }
                              </p>

                              <button
                                onClick={() =>
                                  handleDeleteTask(
                                    list.id,
                                    task.id
                                  )
                                }
                                className="absolute top-2 right-2 text-text-muted hover:text-red-400 transition-colors"
                              >
                                <Trash2
                                  size={14}
                                />
                              </button>
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
                          onChange={(e) =>
                            setNewTaskTitle(
                              e.target.value
                            )
                          }
                          className="w-full p-2 rounded-lg bg-dark-800 text-sm"
                        />
                        <textarea
                          placeholder="Descripción (opcional)"
                          value={newTaskDescription}
                          onChange={(e) =>
                            setNewTaskDescription(
                              e.target.value
                            )
                          }
                          className="w-full p-2 rounded-lg bg-dark-800 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleCreateTask(
                                list.id
                              )
                            }
                            disabled={isCreating}
                            className="px-3 py-1 bg-limeyellow-500 text-white rounded-lg text-sm"
                          >
                            {isCreating
                              ? "Creando..."
                              : "Añadir"}
                          </button>
                          <button
                            onClick={() => {
                              setActiveListId(
                                null
                              );
                              setNewTaskTitle("");
                              setNewTaskDescription(
                                ""
                              );
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
                        className="mt-4 w-full text-sm text-text-muted hover:text-text-primary p-2 border border-dashed border-dark-600 rounded-xl"
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
