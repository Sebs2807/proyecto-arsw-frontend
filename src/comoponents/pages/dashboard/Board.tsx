import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { Trash2, Pencil } from "lucide-react";
import { apiService } from "../../../services/api/ApiService";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";
import { useNavigate } from "react-router-dom";
import ModalBase from "../../atoms/ModalBase";
import { FaPhone } from "react-icons/fa";


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

const DragOverlayPortal: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  if (typeof window === "undefined") return null;
  const portal = document.getElementById("drag-portal");
  return ReactDOM.createPortal(children, portal ?? document.body);
};

const Board: React.FC = () => {
  const { selectedBoard } = useSelector((state: RootState) => state.workspace);
  const user = useSelector((state: RootState) => state.auth.user);
  const [memberCache, setMemberCache] = React.useState<Record<string, { firstName: string; lastName: string }>>({});
  const [draggingNames, setDraggingNames] = React.useState<Record<string, string>>({});
  const [lists, setLists] = React.useState<List[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeListId, setActiveListId] = React.useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskDescription, setNewTaskDescription] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [newListTitle, setNewListTitle] = React.useState("");
  
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [modalTitle, setModalTitle] = React.useState("");
  const [modalDescription, setModalDescription] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isAddingList, setIsAddingList] = React.useState(false);


  const [draggingCards, setDraggingCards] = React.useState<
    Record<string, { user: string; destListId: string; destIndex: number }>
  >({});

  useEffect(() => {
    Object.entries(draggingCards).forEach(async ([cardId, info]) => {
      if (!draggingNames[cardId]) {
        const name = await getUserName(info.user);
        setDraggingNames(prev => ({ ...prev, [cardId]: name }));
      }
    });
  }, [draggingCards]);

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
  }, [selectedBoard?.id]);

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
  (_sourceListId, destListId, card) =>
        setLists((prev) => {
          // Remove the card from any list where it exists
          const withoutCard = prev.map((l) => ({ ...l, cards: l.cards.filter((c) => c.id !== card.id) }));

          // Insert or replace the card in the destination list
          return withoutCard.map((l) =>
            l.id === destListId ? { ...l, cards: [...l.cards, card] } : l
          );
        }),
      boardId
    );

    apiService.socket?.on("card:dragStart", ({ cardId, user }) => {
      setDraggingCards((prev) => ({
        ...prev,
        [cardId]: { user, destListId: "", destIndex: -1 },
      }));
    });

    apiService.socket?.on("card:dragUpdate", (data) => {
      setDraggingCards((prev) => ({
        ...prev,
        [data.cardId]: {
          user: data.user,
          destListId: data.destListId,
          destIndex: data.destIndex,
        },
      }));

      setLists((prevLists) => {
        const sourceListIndex = prevLists.findIndex((list) =>
          list.cards.some((card) => card.id === data.cardId)
        );
        if (sourceListIndex === -1) return prevLists;

        const destListIndex = prevLists.findIndex(
          (list) => list.id === data.destListId
        );
        if (destListIndex === -1) return prevLists;

        const newLists = [...prevLists];
        const sourceList = { ...newLists[sourceListIndex] };
        const destList = { ...newLists[destListIndex] };

        const card = sourceList.cards.find((c) => c.id === data.cardId);
        if (!card) return prevLists;

        sourceList.cards = sourceList.cards.filter((c) => c.id !== card.id);
        destList.cards = destList.cards.filter((c) => c.id !== card.id);

        destList.cards.splice(data.destIndex, 0, card);

        newLists[sourceListIndex] = sourceList;
        newLists[destListIndex] = destList;

        return newLists;
      });
    });


    apiService.socket?.on("card:dragEnd", ({ cardId, destListId, destIndex }) => {
      setDraggingCards((prev) => {
        const copy = { ...prev };
        delete copy[cardId];
        return copy;
      });

      if (destListId && destIndex !== undefined) {
        setLists((prevLists) => {
          const allLists = [...prevLists];
          const sourceListIndex = allLists.findIndex((l) =>
            l.cards.some((c) => c.id === cardId)
          );
          const destListIndex = allLists.findIndex(
            (l) => l.id === destListId
          );
          if (sourceListIndex === -1 || destListIndex === -1) return prevLists;

          const newLists = [...allLists];
          const sourceList = { ...newLists[sourceListIndex] };
          const destList = { ...newLists[destListIndex] };

          const card = sourceList.cards.find((c) => c.id === cardId);
          if (!card) return prevLists;

          sourceList.cards = sourceList.cards.filter((c) => c.id !== cardId);
          destList.cards = destList.cards.filter((c) => c.id !== cardId);
          destList.cards.splice(destIndex, 0, card);

          newLists[sourceListIndex] = sourceList;
          newLists[destListIndex] = destList;
          return newLists;
        });
      }
    });


    return () => {
      apiService.disconnectSocket();
    };
  }, [selectedBoard?.id]);

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

    apiService.socket?.emit("card:moved", {
      boardId: selectedBoard?.id,
      cardId: draggableId,
      sourceListId: source.droppableId,
      destListId: destination.droppableId,
      destinationIndex: destination.index,
    });

    try {
      await apiService.put(`/v1/cards/${draggableId}`, {
        listId: destination.droppableId,
        sourceListId: source.droppableId,
      });
    } catch (err) {
      console.error("Error al mover la tarea:", err);
    }

    apiService.socket?.emit("card:dragEnd", {
      boardId: selectedBoard?.id,
      cardId: draggableId,
      destListId: destination.droppableId,
      destIndex: destination.index,
      user: user?.email ?? "anonymous@example.com",
    });
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

  

  const handleDeleteList = async (listId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta lista?")) return;
    try {
      await apiService.delete(`/v1/lists/${listId}`);
    } catch {
      alert("No se pudo eliminar la lista");
    }
  };

  const getUserName = async (email?: string) => {
    if (!email) return "Anónimo";

    if (memberCache[email]) {
      return `${memberCache[email].firstName} ${memberCache[email].lastName}`;
    }

    try {
      const member = await apiService.get<{ firstName: string; lastName: string }>(`/v1/users/${encodeURIComponent(email)}`);
      setMemberCache((prev) => ({ ...prev, [email]: member }));
      return `${member.firstName} ${member.lastName}`;
    } catch {
      return "Anónimo";
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

      <DragDropContext
        onDragStart={(start) => {
          apiService.socket?.emit("card:dragStart", {
            boardId: selectedBoard?.id,
            cardId: start.draggableId,
            user: user?.email ?? "anonymous@example.com",
          });

          const handleMouseMove = (e: MouseEvent) => {
            apiService.socket?.emit("card:dragUpdate", {
              boardId: selectedBoard?.id,
              cardId: start.draggableId,
              x: e.clientX,
              y: e.clientY,
              user: user?.email ?? "anonymous@example.com",
            });
          };

          window.addEventListener("mousemove", handleMouseMove);

          window.addEventListener(
            "mouseup",
            () => {
              window.removeEventListener("mousemove", handleMouseMove);
            },
            { once: true }
          );
        }}

        onDragUpdate={(update) => {
          if (!update.destination) return;

          apiService.socket?.emit("card:dragUpdate", {
            boardId: selectedBoard?.id,
            cardId: update.draggableId,
            destListId: update.destination.droppableId,
            destIndex: update.destination.index,
            user: user?.email ?? "anonymous@example.com",
          });
        }}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-row gap-6 overflow-x-auto h-full pb-0 scrollbar-custom">
            {lists.map((list) => (
              <Droppable droppableId={list.id} key={list.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-shrink-0 w-[300px] bg-dark-800 rounded-lg border border-dark-600 p-4 flex flex-col"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold truncate">
                        {list.title} ({list.cards.length})
                      </h2>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const title = window.prompt("Nuevo título de la lista:", list.title);
                            if (!title || !title.trim()) return;
                            try {
                              await apiService.put<List>(`/v1/lists/${list.id}`, { title: title.trim() });
                              setLists((prev) => prev.map(l => l.id === list.id ? { ...l, title: title.trim() } : l));
                            } catch {
                              alert("No se pudo actualizar la lista");
                            }
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDeleteList(list.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
                      {list.cards.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={draggingCards[task.id] && draggingCards[task.id].user !== user?.email}>
                          {(provided, snapshot) => {
                            const isBeingDraggedByAnother = draggingCards[task.id] && draggingCards[task.id].user !== user?.email;

                            const card = (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`relative p-3 rounded-lg border text-sm transition-all duration-300 
                                    ${snapshot.isDragging
                                    ? "bg-dark-800 border-limeyellow-500 scale-[1.02] shadow-md"
                                    : "bg-dark-800 border-dark-600 hover:border-limeyellow-400"}
                                    ${isBeingDraggedByAnother ? "opacity-50 cursor-not-allowed" : ""}`}
                                onClick={() => {
                                    if (!isBeingDraggedByAnother) {
                                      setEditingTask(task);
                                      setModalTitle(task.title ?? "");
                                      setModalDescription(task.description ?? "");
                                    }
                                  }}
                              >
                                {isBeingDraggedByAnother && (
                                  <span className="absolute top-1 left-1 text-xs bg-limeyellow-600 text-text-primary px-2 py-0.5 rounded-md shadow-md">
                                    {draggingNames[task.id] || "Cargando..."}{""}
                                  </span>
                                )}

                                <h3 className="font-medium truncate text-text-primary">
                                  {task.title}
                                </h3>
                                <p className="text-xs mt-1 line-clamp-2 text-text-muted">
                                  {task.description}
                                </p>
                                {/* action buttons moved into modal */}
                              </div>
                            );

                            return snapshot.isDragging ? (
                              <DragOverlayPortal>
                                <div className="pointer-events-none">{card}</div>
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
            {/* Add-list card */}
            <div className="flex-shrink-0 w-[300px] bg-dark-800 rounded-lg border border-dark-600 p-4 flex flex-col">
              {isAddingList ? (
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Título de la lista"
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    className="w-full p-2 rounded-lg bg-dark-900 text-sm border border-dark-600"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await handleCreateList();
                        setIsAddingList(false);
                      }}
                      className="px-3 py-1 bg-limeyellow-500 text-white rounded-lg text-sm"
                    >
                      Crear lista
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingList(false);
                        setNewListTitle("");
                      }}
                      className="px-3 py-1 bg-dark-600 text-sm rounded-lg"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingList(true)}
                  className="w-full text-left p-3 rounded-lg border border-dashed border-dark-600 text-text-muted hover:text-text-primary"
                >
                  + Añadir lista
                </button>
              )}
            </div>
          </div>
        </div>
      </DragDropContext>
      {/* Modal for viewing/editing a task (basic box for now) */}
      <ModalBase
  isOpen={!!editingTask}
  onClose={() => setEditingTask(null)}
  title={modalTitle}
  width="max-w-xl"
>
  <div className="space-y-4 mt-2">
    <input
      type="text"
      value={modalTitle}
      onChange={(e) => setModalTitle(e.target.value)}
      className="w-full p-2 rounded-lg bg-dark-800 text-sm border border-dark-600 focus:outline-none focus:ring-2 focus:ring-limeyellow-500"
      placeholder="Título"
    />

    <textarea
      value={modalDescription}
      onChange={(e) => setModalDescription(e.target.value)}
      className="w-full p-2 rounded-lg bg-dark-800 text-sm border border-dark-600 focus:outline-none focus:ring-2 focus:ring-limeyellow-500 h-32"
      placeholder="Descripción"
    />

    <div className="flex justify-between items-center mt-3">
      {/* Botón eliminar (sin fondo) */}
      <button
        onClick={async () => {
          if (!editingTask) return;
          if (!window.confirm("¿Seguro que deseas eliminar esta tarea?")) return;
          try {
            await apiService.delete(`/v1/cards/${editingTask.id}`);
            setLists((prev) =>
              prev.map((l) => ({
                ...l,
                cards: l.cards.filter((c) => c.id !== editingTask.id),
              }))
            );
            setEditingTask(null);
          } catch (err) {
            alert("Error al eliminar la tarea");
          }
        }}
        className="px-2 py-1 text-text-error hover:text-text-secondary rounded transition flex items-center gap-2"
      >
        <Trash2 size={16} /> Eliminar
      </button>

      <div className="flex gap-2 items-center">
        {/* Botón LiveKit (sin fondo) */}
        <button
          onClick={async () => {
            if (!editingTask) return;
            await handleLiveKit(editingTask.id);
          }}
          className="px-2 py-1 text-text-accent hover:text-text-secondary rounded transition flex items-center gap-2"
        >
          <FaPhone size={16} /> Llamada
        </button>

        <button
          onClick={() => setEditingTask(null)}
          className="px-2 py-1 text-text-muted hover:text-text-primary rounded transition"
        >
          Cancelar
        </button>

        <button
          onClick={async () => {
            if (!editingTask) return;
            const editingId = editingTask.id;
            setIsSaving(true);
            try {
              // Try to update on server and prefer returned updated card if provided
              const resp = await apiService.put<Partial<Task>>(`/v1/cards/${editingId}`, {
                title: modalTitle,
                description: modalDescription,
              });

              // If API returns the updated card, use it; otherwise fallback to our local values
              const updatedCard = resp && (resp as any).data ? (resp as any).data : { id: editingId, title: modalTitle, description: modalDescription };

              setLists((prev) =>
                prev.map((l) => ({
                  ...l,
                  cards: l.cards.map((c) =>
                    c.id === editingId
                      ? { ...c, title: (updatedCard.title ?? modalTitle), description: (updatedCard.description ?? modalDescription) }
                      : c
                  ),
                }))
              );

              setEditingTask(null);
            } catch (err) {
              console.error(err);
              alert("Error al guardar la tarea");
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={isSaving}
          className="px-2 py-1 text-text-accent hover:text-text-secondary rounded transition"
        >
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  </div>
</ModalBase>

    </div>
  );
};

export default Board;
