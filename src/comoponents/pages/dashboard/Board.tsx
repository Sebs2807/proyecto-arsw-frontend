import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { Trash2, Pencil } from "lucide-react";
import { apiService } from "../../../services/api/ApiService";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";
import { useNavigate } from "react-router-dom";
import ModalBase from "../../atoms/ModalBase";
import { RiCalendarScheduleFill } from "react-icons/ri";
import { IoIosSend } from "react-icons/io";
import { FaPhone } from "react-icons/fa";
import { BsFillTelephoneForwardFill } from "react-icons/bs";
// Asegúrate de definir esta constante o reemplazarla con un valor fijo si no usas el archivo de constantes
const LIVEKIT_ACTIVE_ROOM_KEY = "livekit_active_room_id";
const LIVEKIT_ACTIVE_BOARD_KEY = "livekit_active_board_id";

// --- Interfaces de Datos (Tomadas del primer bloque, más completas) ---

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string; // Se mantiene por si se usa en el backend, aunque no se usa en la UI directamente
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
  priority?: "low" | "medium" | "high";
  listId: string;
  dueDate?: string;
}

export interface List {
  id: string;
  title: string;
  description?: string;
  order: number;
  cards: Task[];
}

// --- Portal para el Drag Overlay ---
const DragOverlayPortal: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Uso de globalThis para mejor compatibilidad universal (navegador/SSR)
  if (globalThis.window === undefined) return null;
  const portal = document.getElementById("drag-portal");
  return ReactDOM.createPortal(children, portal || document.body);
};

// --- Helper Functions (Extracted to reduce nesting) ---
const listHasId = (id: string) => (list: List) => list.id === id;
const updateListItem = (updated: List) => (l: List) =>
  l.id === updated.id ? { ...l, ...updated } : l;
const isNotId = (id: string) => (l: List) => l.id !== id;
const cardExists = (cardId: string) => (c: Task) => c.id === cardId;
const updateCard = (updatedCard: Task) => (c: Task) =>
  c.id === updatedCard.id ? { ...c, ...updatedCard } : c;
const isNotCard = (card: Task, cardId: string): boolean =>
  card.id !== cardId;

const addCardToList = (listId: string, card: Task) => (l: List) => {
  if (l.id !== listId) return l;
  if (l.cards.some(cardExists(card.id))) return l;
  return { ...l, cards: [...l.cards, card] };
};

const updateListCards = (listId: string, card: Task) => (l: List) =>
  l.id === listId ? { ...l, cards: l.cards.map(updateCard(card)) } : l;

const removeCard = (lists: List[], cardId: string): List[] =>
  lists.map((list) => ({
    ...list,
    cards: list.cards.filter((c) => isNotCard(c, cardId)),
  }));

const addCard = (lists: List[], destListId: string, card: Task): List[] =>
  lists.map((list) =>
    list.id === destListId
      ? { ...list, cards: [...list.cards, card] }
      : list
  );

const moveCard = (lists: List[], destListId: string, card: Task): List[] =>
  addCard(removeCard(lists, card.id), destListId, card);

const applyDrag = (lists: List[], data: any): List[] => {
  const card = lists
    .flatMap((l) => l.cards)
    .find((c) => c.id === data.cardId);
  if (!card) return lists;
  const moved = moveCard(lists, data.destListId, card);
  const listIndex = moved.findIndex((l) => l.id === data.destListId);
  if (listIndex === -1) return lists;

  const newLists = [...moved];
  const list = { ...newLists[listIndex] };
  list.cards = list.cards.filter((c) => c.id !== data.cardId);
  list.cards.splice(data.destIndex, 0, card);
  newLists[listIndex] = list;

  return newLists;
};

const applyDragEnd = (
  lists: List[],
  cardId: string,
  destListId: string,
  destIndex: number
): List[] => {
  const sourceIndex = lists.findIndex((l) =>
    l.cards.some((c) => c.id === cardId)
  );
  const destIndexList = lists.findIndex((l) => l.id === destListId);
  if (sourceIndex === -1 || destIndexList === -1) return lists;

  const card = lists[sourceIndex].cards.find((c) => c.id === cardId);
  if (!card) return lists;

  const newLists = [...lists];
  const sourceList = { ...newLists[sourceIndex] };
  const destList = { ...newLists[destIndexList] };

  sourceList.cards = sourceList.cards.filter((c) => c.id !== cardId);
  destList.cards = destList.cards.filter((c) => c.id !== cardId);
  destList.cards.splice(destIndex, 0, card);

  newLists[sourceIndex] = sourceList;
  newLists[destIndexList] = destList;
  return newLists;
};




// --- Componente de Tarjeta Draggable (del segundo bloque, con indicador de llamada) ---
const renderDraggableCard = ({
  task,
  user,
  provided,
  snapshot,
  draggingCards,
  draggingNames,
  activeCalls,
  setEditingTask,
  setModalTitle,
  setModalDescription,
  // Campos extra del primer bloque
  setModalContactName,
  setModalContactEmail,
  setModalContactPhone,
  setModalIndustry,
  setModalPriority,
}: any) => {
  const isBeingDraggedByAnother =
    draggingCards[task.id] && draggingCards[task.id].user !== user?.email;

  const handleClick = () => {
    if (!isBeingDraggedByAnother) {
      setEditingTask(task);
      setModalTitle(task.title ?? "");
      setModalDescription(task.description ?? "");
      // Inicializar campos adicionales del modal
      setModalContactName(task.contactName ?? "");
      setModalContactEmail(task.contactEmail ?? "");
      setModalContactPhone(task.contactPhone ?? "");
      setModalIndustry(task.industry ?? "");
      setModalPriority(task.priority ?? "");
    }
  };

  const card = (
    <button
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      type="button"
      onClick={handleClick}
      className={`relative text-left w-full p-3 rounded-lg border text-sm transition-all duration-300
        ${snapshot.isDragging
          ? "bg-dark-800 border-limeyellow-500 scale-[1.02] shadow-md"
          : "bg-dark-800 border-dark-600 hover:border-limeyellow-400"
        }
        ${isBeingDraggedByAnother ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isBeingDraggedByAnother && (
        <span className="absolute top-1 left-1 text-xs bg-limeyellow-600 text-text-primary px-2 py-0.5 rounded-md shadow-md">
          {draggingNames[task.id] || "Cargando..."}
        </span>
      )}

      {activeCalls[task.id] && (
        <span className="absolute top-1 right-1 text-[10px] transform -translate-y-1">
          <BsFillTelephoneForwardFill size={16} color="rgb(101, 163, 13)" />{" "}
          {/* Color verde/lima */}
        </span>
      )}

      <h3 className="font-medium truncate text-text-primary">{task.title}</h3>

      <p className="text-xs mt-1 line-clamp-2 text-text-muted">
        {task.description}
      </p>
    </button>
  );

  return snapshot.isDragging ? (
    <DragOverlayPortal>
      <div className="pointer-events-none">{card}</div>
    </DragOverlayPortal>
  ) : (
    card
  );
};

// Curry function para el renderizado
const draggableRenderer =
  ({
    task,
    user,
    draggingCards,
    draggingNames,
    activeCalls,
    setEditingTask,
    setModalTitle,
    setModalDescription,
    // Campos extra
    setModalContactName,
    setModalContactEmail,
    setModalContactPhone,
    setModalIndustry,
    setModalPriority,
  }: any) =>
    (provided: any, snapshot: any) =>
      renderDraggableCard({
        task,
        user,
        provided,
        snapshot,
        draggingCards,
        draggingNames,
        activeCalls,
        setEditingTask,
        setModalTitle,
        setModalDescription,
        setModalContactName,
        setModalContactEmail,
        setModalContactPhone,
        setModalIndustry,
        setModalPriority,
      });

// --- Componente Principal Board ---

const Board: React.FC = () => {
  const { selectedBoard } = useSelector((state: RootState) => state.workspace);
  const user = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();

  // Estados del primer bloque
  const [memberCache, setMemberCache] = useState<
    Record<string, { firstName: string; lastName: string }>
  >({});
  const [draggingNames, setDraggingNames] = useState<Record<string, string>>(
    {}
  );
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingList, setIsAddingList] = useState(false);

  // Campos de edición de tarea (del primer bloque)
  const [modalContactName, setModalContactName] = useState("");
  const [modalContactEmail, setModalContactEmail] = useState("");
  const [modalContactPhone, setModalContactPhone] = useState("");
  const [modalIndustry, setModalIndustry] = useState("");
  const [modalPriority, setModalPriority] = useState("");

  // Estados del segundo bloque
  const [activeCalls, setActiveCalls] = useState<
    Record<string, { roomId: string; startedBy?: string }>
  >({});
  const [draggingCards, setDraggingCards] = useState<
    Record<string, { user: string; destListId: string; destIndex: number }>
  >({});

  // Estados del modal de programación de llamadas
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [scheduleDurationMinutes, setScheduleDurationMinutes] =
    useState<number>(30);
  const [scheduleAttendees, setScheduleAttendees] = useState<string>("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledLinks, setScheduledLinks] = useState<{
    htmlLink?: string;
    googleAddUrl?: string;
    icsUrl?: string;
    shareLink?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [scheduleRoomId, setScheduleRoomId] = useState<string | null>(null);
  const [isJoiningCall, setIsJoiningCall] = useState(false);

  // Dependencia del modal de edición para inicializar campos adicionales
  useEffect(() => {
    if (editingTask) {
      setModalContactName(editingTask.contactName ?? "");
      setModalContactEmail(editingTask.contactEmail ?? "");
      setModalContactPhone(editingTask.contactPhone ?? "");
      setModalIndustry(editingTask.industry ?? "");
      setModalPriority(editingTask.priority ?? "");
    }
  }, [editingTask]);

  // Lógica de Sockets (Basada en el segundo bloque, más limpia)
  useEffect(() => {
    // ... Lógica para cargar listas inicialmente
    if (!selectedBoard?.id) {
      setError("No hay tablero seleccionado.");
      setLists([]);
      setActiveCalls({});
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

  // Lógica de sincronización de nombres de arrastre
  useEffect(() => {
    const syncNames = async () => {
      for (const [cardId, info] of Object.entries(draggingCards)) {
        if (!draggingNames[cardId]) {
          const name = await getUserName(info.user);
          setDraggingNames((prev) => ({ ...prev, [cardId]: name }));
        }
      }
    };
    syncNames();
  }, [draggingCards]);

  // Lógica de Sockets (Combinada y refactorizada)
  useEffect(() => {
    if (!selectedBoard?.id) return;
    const boardId = selectedBoard.id;

    // --- Manejadores de Sockets (del segundo bloque) ---
    const handleNewList = (newList: List) =>
      setLists((prev) =>
        prev.some(listHasId(newList.id))
          ? prev
          : [...prev, { ...newList, cards: [] }]
      );
    const handleUpdatedList = (updatedList: List) =>
      setLists((prev) => prev.map(updateListItem(updatedList)));
    const handleDeletedList = (id: string) =>
      setLists((prev) => prev.filter(isNotId(id)));
    const handleCardCreated = (listId: string, card: Task) =>
      setLists((prev) => prev.map(addCardToList(listId, card)));
    const handleCardUpdated = (listId: string, card: Task) =>
      setLists((prev) => prev.map(updateListCards(listId, card)));
    const handleCardDeleted = (_listId: string, cardId: string) =>
      setLists((prev) => removeCard(prev, cardId));
    const handleCardMovedExternally = (
      _sourceListId: string,
      destListId: string,
      card: Task
    ) => setLists((prevLists) => moveCard(prevLists, destListId, card));

    apiService.initSocket(boardId, {
      onListCreated: handleNewList,
      onListUpdated: handleUpdatedList,
      onListDeleted: handleDeletedList,
      onCardCreated: handleCardCreated,
      onCardUpdated: handleCardUpdated,
      onCardDeleted: handleCardDeleted,
      onCardMoved: handleCardMovedExternally,
    });

    const requestActiveCalls = () => {
      apiService.socket?.emit("call:requestState", { boardId });
    };
    const handleCallActiveSet = ({
      boardId: payloadBoardId,
      calls,
    }: {
      boardId: string;
      calls: Array<{ cardId: string; roomId: string; startedBy?: string }>;
    }) => {
      if (payloadBoardId !== boardId) return;
      const mapped: Record<string, { roomId: string; startedBy?: string }> = {};
      for (const call of calls) {
        if (call.cardId && call.roomId) {
          mapped[call.cardId] = {
            roomId: call.roomId,
            startedBy: call.startedBy,
          };
        }
      }
      const activeRoomForThisClient =
        globalThis.window === undefined
          ? null
          : globalThis.window.sessionStorage.getItem(LIVEKIT_ACTIVE_ROOM_KEY);
      const cleaned = { ...mapped };

      // Lógica para limpiar llamadas que el usuario inició pero no está activo
      for (const [cardId, info] of Object.entries(mapped)) {
        const sameUser =
          info.startedBy && info.startedBy === (user?.email ?? "");
        const clientCurrentlyInRoom =
          activeRoomForThisClient && activeRoomForThisClient === cardId;
        if (sameUser && !clientCurrentlyInRoom) {
          apiService.socket?.emit("call:ended", {
            boardId,
            cardId,
            user: user?.email ?? "anonymous@example.com",
          });
          delete cleaned[cardId];
        }
      }
      setActiveCalls(cleaned);
    };

    apiService.socket?.on("connect", requestActiveCalls);
    apiService.socket?.on("call:activeSet", handleCallActiveSet);
    requestActiveCalls();

    apiService.socket?.on("card:dragStart", ({ cardId, user }) => {
      setDraggingCards((prev) => ({
        ...prev,
        [cardId]: { user, destListId: "", destIndex: -1 },
      }));
    });

    apiService.socket?.on("call:started", ({ cardId, roomId, user }) => {
      if (!cardId) return;
      setActiveCalls((prev) => ({
        ...prev,
        [cardId]: { roomId, startedBy: user },
      }));
    });

    function removeActiveCall(cardId: string) {
      setActiveCalls((prev) => {
        const copy = { ...prev };
        delete copy[cardId];
        return copy;
      });
    }

    function redirectToBoards() {
      const path = globalThis.window?.location?.pathname;
      const base = import.meta.env.VITE_FRONTEND_URL ?? "/"; // Asegúrate de que esto se resuelva
      if (path?.startsWith("/livekit")) {
        globalThis.window.location.href = `${base}/boards`;
      } else {
        navigate("/boards");
      }
    }
    function clearSession() {
      globalThis.window.sessionStorage.removeItem(LIVEKIT_ACTIVE_ROOM_KEY);
      globalThis.window.sessionStorage.removeItem(LIVEKIT_ACTIVE_BOARD_KEY);
    }
    function handleRoomCleanup(cardId: string, endedBy: string) {
      if (!globalThis.window) return;
      const activeRoomId = globalThis.window.sessionStorage.getItem(
        LIVEKIT_ACTIVE_ROOM_KEY
      );
      const isSameActiveRoom = activeRoomId === cardId;
      const endedByMe = endedBy === cardId; // Asumiendo que el socket 'call:ended' ya hace la limpieza del estado
      if (isSameActiveRoom || endedByMe) {
        clearSession();
        redirectToBoards();
      }
    }

    apiService.socket?.on(
      "call:ended",
      ({
        boardId: payloadBoardId,
        cardId,
        user: endedBy,
      }: {
        boardId?: string;
        cardId?: string;
        user?: string;
      }) => {
        if (!cardId || payloadBoardId !== boardId) return;
        removeActiveCall(cardId);
        handleRoomCleanup(cardId, endedBy ?? "");
      }
    );

    function updateDraggingCards(data: any) {
      setDraggingCards((prev) => ({
        ...prev,
        [data.cardId]: {
          user: data.user,
          destListId: data.destListId,
          destIndex: data.destIndex,
        },
      }));
    }



    apiService.socket?.on("card:dragUpdate", (data) => {
      updateDraggingCards(data);
      setLists((prevLists) => applyDrag(prevLists, data));
    });

    function clearDraggingCard(cardId: string) {
      setDraggingCards((prev) => {
        const copy = { ...prev };
        delete copy[cardId];
        return copy;
      });
    }



    apiService.socket?.on(
      "card:dragEnd",
      ({ cardId, destListId, destIndex }) => {
        clearDraggingCard(cardId);
        if (!destListId || destIndex === undefined) return;
        setLists((prevLists) =>
          applyDragEnd(prevLists, cardId, destListId, destIndex)
        );
      }
    );

    return () => {
      apiService.socket?.off("connect", requestActiveCalls);
      apiService.socket?.off("call:activeSet", handleCallActiveSet);
      apiService.disconnectSocket();
    };
  }, [selectedBoard?.id, user?.email]);

  // --- Funciones del Board (Combinadas) ---

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

    // Actualización optimista de la UI
    const newLists = [...lists];
    const [movedTask] = newLists[sourceListIndex].cards.splice(source.index, 1);
    const taskWithNewListId = { ...movedTask, listId: destination.droppableId };
    newLists[destListIndex].cards.splice(
      destination.index,
      0,
      taskWithNewListId
    );
    setLists(newLists);

    // Notificación a otros clientes (tiempo real)
    apiService.socket?.emit("card:moved", {
      boardId: selectedBoard?.id,
      cardId: draggableId,
      sourceListId: source.droppableId,
      destListId: destination.droppableId,
      destinationIndex: destination.index,
    });

    // Petición al backend
    try {
      // El segundo bloque usa PUT, el primero PATCH/PUT. Usamos PATCH para actualizar solo listId.
      await apiService.patch(`/v1/cards/${draggableId}`, {
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

  const getUserName = async (email?: string) => {
    if (!email) return "Anónimo";

    if (memberCache[email]) {
      return `${memberCache[email].firstName} ${memberCache[email].lastName}`;
    }

    try {
      const member = await apiService.get<{
        firstName: string;
        lastName: string;
      }>(`/v1/users/${encodeURIComponent(email)}`);
      setMemberCache((prev) => ({ ...prev, [email]: member }));
      return `${member.firstName} ${member.lastName}`;
    } catch {
      return "Anónimo";
    }
  };

  const handleLiveKit = async (roomId: string, email: string) => {
    setIsJoiningCall(true);
    try {
      let name = memberCache[email]
        ? `${memberCache[email].firstName} ${memberCache[email].lastName}`
        : null;
      if (!name) {
        const member = await apiService.get<{
          firstName: string;
          lastName: string;
        }>(`/v1/users/${encodeURIComponent(email)}`);
        name = `${member.firstName} ${member.lastName}`;
        setMemberCache((prev) => ({ ...prev, [email]: member }));
      }

      const baseIdentity = (
        user?.email ||
        name ||
        `guest-${Date.now()}`
      ).replaceAll(/[^a-zA-Z0-9_-]/g, "_");
      const randomSuffix =
        globalThis.crypto?.randomUUID?.()?.slice(0, 8) ??
        Date.now().toString(16).slice(0, 8);
      const uniqueIdentity = `${baseIdentity}-${randomSuffix}`;
      const displayName = name ?? "Invitado";

      const params = new URLSearchParams({
        room: roomId,
        identity: uniqueIdentity,
        name: displayName,
      });

      const { token } = await apiService.get<{ token: string }>(
        `/livekit/token?${params.toString()}`
      );

      // Notificar inicio de llamada
      try {
        apiService.socket?.emit("call:started", {
          boardId: selectedBoard?.id,
          cardId: roomId,
          roomId,
          user: user?.email ?? "anonymous@example.com",
        });
        setActiveCalls((prev) => ({
          ...prev,
          [roomId]: { roomId, startedBy: user?.email },
        }));
      } catch (e) {
        console.error("Error starting call:", e);
      }

      // Almacenar en sesión (para manejo de limpieza)
      if (globalThis.window !== undefined) {
        globalThis.window.sessionStorage.setItem(
          LIVEKIT_ACTIVE_ROOM_KEY,
          roomId
        );
        if (selectedBoard?.id) {
          globalThis.window.sessionStorage.setItem(
            LIVEKIT_ACTIVE_BOARD_KEY,
            selectedBoard.id
          );
        }
      }

      navigate(`/livekit/${roomId}/${token}`, {
        state: { boardId: selectedBoard?.id, cardId: roomId },
      });
    } catch (err) {
      console.error("Error al generar token de LiveKit:", err);
      if (globalThis.window !== undefined) {
        globalThis.window.sessionStorage.removeItem(LIVEKIT_ACTIVE_ROOM_KEY);
        globalThis.window.sessionStorage.removeItem(LIVEKIT_ACTIVE_BOARD_KEY);
      }
      setActiveCalls((prev) => {
        const copy = { ...prev };
        delete copy[roomId];
        return copy;
      });
    } finally {
      setIsJoiningCall(false);
    }
  };

  const formatForGoogleDates = (d: Date) =>
    d.toISOString().replaceAll(/-|:|\.\d{3}/g, "");

  const generateICS = (opts: {
    uid: string;
    title: string;
    description?: string;
    start: Date;
    end: Date;
    url?: string;
    attendees?: string[];
  }) => {
    const {
      uid,
      title,
      description = "",
      start,
      end,
      url = "",
      attendees = [],
    } = opts;
    const dtstamp = new Date().toISOString().replaceAll(/-|:|\.\d{3}/g, "");
    const dtstart = start.toISOString().replaceAll(/-|:|\.\d{3}/g, "");
    const dtend = end.toISOString().replaceAll(/-|:|\.\d{3}/g, "");
    const attendeesLines = attendees
      .map((a) => `ATTENDEE:mailto:${a}`)
      .join("\r\n");
    const ics = [
      `BEGIN:VCALENDAR`,
      `VERSION:2.0`,
      `PRODID:-//Synapse//EN`,
      `CALSCALE:GREGORIAN`,
      `BEGIN:VEVENT`,
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      attendeesLines,
      url ? `URL:${url}` : "",
      `END:VEVENT`,
      `END:VCALENDAR`,
    ]
      .filter(Boolean)
      .join("\r\n");
    return ics;
  };

  const createCalendarEvent = async (opts: {
    title: string;
    description?: string;
    start: Date;
    end: Date;
    attendees?: string[];
  }) => {
    setIsScheduling(true);
    try {
      const payload = {
        summary: opts.title,
        description: opts.description,
        start: { dateTime: opts.start.toISOString() },
        end: { dateTime: opts.end.toISOString() },
        attendees: (opts.attendees || []).map((e) => ({ email: e })),
      };

      const resp = await apiService.post<any>(
        `/v1/calendar/google-events`,
        payload
      );
      const created = resp && (resp.data || resp) ? resp.data || resp : resp;
      const htmlLink: string | undefined =
        created?.htmlLink ||
        created?.data?.htmlLink ||
        created?.result?.htmlLink;

      const googleDates = `${formatForGoogleDates(
        opts.start
      )}/${formatForGoogleDates(opts.end)}`;
      const addUrl = new URL("https://calendar.google.com/calendar/render");
      addUrl.searchParams.set("action", "TEMPLATE");
      addUrl.searchParams.set("text", opts.title);
      if (opts.description)
        addUrl.searchParams.set("details", opts.description);
      addUrl.searchParams.set("dates", googleDates);
      if (opts.attendees?.length) {
        addUrl.searchParams.set("add", opts.attendees.join(","));
      }

      const uid = created?.id || `synapse-${Date.now()}`;
      const ics = generateICS({
        uid,
        title: opts.title,
        description: opts.description,
        start: opts.start,
        end: opts.end,
        url: htmlLink,
        attendees: opts.attendees,
      });
      const blob = new Blob([ics], { type: "text/calendar" });
      const icsUrl = URL.createObjectURL(blob);
      const shareLink = htmlLink || addUrl.toString();

      setScheduledLinks({
        htmlLink,
        googleAddUrl: addUrl.toString(),
        icsUrl,
        shareLink,
      });

      // Notify other UI components (notifications float, etc.) to refresh
      try {
        globalThis.dispatchEvent(new CustomEvent('calendar:updated'));
      } catch (e) {
        console.error("Error dispatching calendar:updated event:", e);
      }

      return { htmlLink, googleAddUrl: addUrl.toString(), icsUrl };
    } catch (err) {
      console.error("Error creando evento en calendario:", err);
      throw err;
    } finally {
      setIsScheduling(false);
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

  const handleEditListTitle = async (list: List) => {
    const title = globalThis?.window?.prompt(
      "Nuevo título de la lista:",
      list.title
    );
    const newTitle = title?.trim();
    if (!newTitle) return;
    try {
      await apiService.put<List>(`/v1/lists/${list.id}`, { title: newTitle });
      setLists((prev) =>
        prev.map((l) => (l.id === list.id ? { ...l, title: newTitle } : l))
      );
    } catch {
      alert("No se pudo actualizar la lista");
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!globalThis.window?.confirm("¿Seguro que deseas eliminar esta lista?"))
      return;
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
        title: newTaskTitle,
        description: newTaskDescription || "Sin descripción",
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

  const handleDeleteTask = async () => {
    if (!editingTask) return;
    if (!globalThis.window?.confirm("¿Seguro que deseas eliminar esta tarea?"))
      return;

    try {
      await apiService.delete(`/v1/cards/${editingTask.id}`);
      setLists((prev) => removeCard(prev, editingTask.id));
      setEditingTask(null);
    } catch (err) {
      console.error("Error eliminando tarea:", err);
      alert("Error al eliminar la tarea");
    }
  };

  const updateCardInList = (
    list: List,
    cardId: string,
    updatedCard: Partial<Task>
  ): List => ({
    ...list,
    cards: list.cards.map((c) =>
      c.id === cardId
        ? {
          ...c,
          ...updatedCard,
        }
        : c
    ),
  });

  const applyCardUpdate = (
    cardId: string,
    updatedCard: Partial<Task>
  ): void => {
    setLists((prev) =>
      prev.map((l) => updateCardInList(l, cardId, updatedCard))
    );
  };

  const handleSaveTask = async () => {
    if (!editingTask) return;
    setIsSaving(true);
    const editingId = editingTask.id;

    try {
      const payload: Partial<Task> = {
        title: modalTitle.trim(),
        description: modalDescription.trim(),
        contactName: modalContactName.trim(),
        contactEmail: modalContactEmail.trim() || undefined,
        contactPhone: modalContactPhone.trim(),
        industry: modalIndustry.trim(),
        priority: (modalPriority.trim() || undefined) as any,
      };

      // Eliminar claves undefined
      Object.keys(payload).forEach((key) => {
        if (payload[key as keyof Task] === undefined) {
          delete payload[key as keyof Task];
        }
      });

      if (!payload.title && editingTask.title) {
        alert("El título de la tarea no puede estar vacío.");
        setIsSaving(false);
        return;
      }

      const resp = await apiService.patch(`/v1/cards/${editingId}`, payload);
      const updated = resp && (resp as any).data ? (resp as any).data : payload;

      applyCardUpdate(editingId, updated);
      setEditingTask(null);
    } catch (err) {
      console.error(err);
      alert("Error al guardar la tarea");
    } finally {
      setIsSaving(false);
    }
  };

  const currentScheduleCardId =
    scheduleRoomId ?? (editingTask ? editingTask.id : null);
  const hasActiveCall = currentScheduleCardId
    ? Boolean(activeCalls[currentScheduleCardId])
    : false;

  const actionLabel = (() => {
    if (isScheduling || isJoiningCall) {
      return "Procesando...";
    }
    if (hasActiveCall) {
      return (
        <>
          Unirse a llamada <FaPhone />
        </>
      );
    }
    return (
      <>
        Crear llamada <FaPhone />
      </>
    );
  })();

  // --- Renderizado ---
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

      {/* Kanban Board Layout */}
      <DragDropContext
        onDragStart={(start) => {
          apiService.socket?.emit("card:dragStart", {
            boardId: selectedBoard?.id,
            cardId: start.draggableId,
            user: user?.email ?? "anonymous@example.com",
          });

          // Agregar listener de mousemove para notificar 'dragUpdate' (del primer bloque)
          const handleMouseMove = (e: MouseEvent) => {
            apiService.socket?.emit("card:dragUpdate", {
              boardId: selectedBoard?.id,
              cardId: start.draggableId,
              x: e.clientX,
              y: e.clientY,
              user: user?.email ?? "anonymous@example.com",
            });
          };

          globalThis.window?.addEventListener("mousemove", handleMouseMove);

          globalThis.window?.addEventListener(
            "mouseup",
            () => {
              globalThis.window?.removeEventListener(
                "mousemove",
                handleMouseMove
              );
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
                    {/* Encabezado de la lista */}
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold truncate">
                        {list.title} ({list.cards.length})
                      </h2>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditListTitle(list)}>
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDeleteList(list.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Contenedor de tarjetas */}
                    <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
                      {list.cards.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                          isDragDisabled={
                            draggingCards[task.id] &&
                            draggingCards[task.id].user !== user?.email
                          }
                        >
                          {draggableRenderer({
                            task,
                            user,
                            draggingCards,
                            draggingNames,
                            activeCalls,
                            setEditingTask,
                            setModalTitle,
                            setModalDescription,
                            setModalContactName,
                            setModalContactEmail,
                            setModalContactPhone,
                            setModalIndustry,
                            setModalPriority,
                          })}
                        </Draggable>
                      ))}

                      {provided.placeholder}
                      {/* Formulario de creación de tarea */}
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
            {/* Tarjeta para Añadir Lista */}
            <div className="flex-shrink-0 w-[300px] bg-dark-800 rounded-lg border border-dark-600 p-4 flex flex-col self-start">
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

      {/* Modal de Edición de Tarea (combinado) */}
      <ModalBase
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title={modalTitle}
        width="max-w-xl"
      >
        <div className="space-y-4 mt-2">
          {/* Título */}
          <input
            type="text"
            value={modalTitle}
            onChange={(e) => setModalTitle(e.target.value)}
            className="w-full p-2 rounded-lg bg-dark-800 text-sm border border-dark-600 focus:outline-none focus:ring-2 focus:ring-limeyellow-500"
            placeholder="Título"
          />

          {/* Descripción */}
          <textarea
            value={modalDescription}
            onChange={(e) => setModalDescription(e.target.value)}
            className="w-full p-2 rounded-lg bg-dark-800 text-sm border border-dark-600 focus:outline-none focus:ring-2 focus:ring-limeyellow-500 h-32"
            placeholder="Descripción"
          />

          {/* Campos adicionales (del primer bloque) */}
          <input
            type="text"
            value={modalContactName}
            onChange={(e) => setModalContactName(e.target.value)}
            className="w-full p-2 rounded-lg bg-dark-800 text-sm border border-dark-600"
            placeholder="Nombre del contacto"
          />

          <input
            type="email"
            value={modalContactEmail}
            onChange={(e) => setModalContactEmail(e.target.value)}
            className="w-full p-2 rounded-lg bg-dark-800 text-sm border border-dark-600"
            placeholder="Correo del contacto"
          />

          <input
            type="text"
            value={modalContactPhone}
            onChange={(e) => setModalContactPhone(e.target.value)}
            className="w-full p-2 rounded-lg bg-dark-800 text-sm border border-dark-600"
            placeholder="Teléfono del contacto"
          />

          {/* Industry */}
          <input
            type="text"
            value={modalIndustry}
            onChange={(e) => setModalIndustry(e.target.value)}
            className="w-full p-2 rounded-lg bg-dark-800 text-sm border border-dark-600"
            placeholder="Industria (ej. Fintech, SaaS, Salud)"
          />

          {/* Prioridad */}
          <select
            value={modalPriority}
            onChange={(e) => setModalPriority(e.target.value)}
            className="w-full p-2 rounded-lg bg-dark-800 text-sm border border-dark-600"
          >
            <option value="">Sin prioridad</option>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>

          {/* Footer de Acciones */}
          <div className="flex justify-between items-center mt-3">
            {/* Botón eliminar */}
            <button
              onClick={handleDeleteTask}
              className="px-2 py-1 text-text-error hover:text-text-secondary rounded transition flex items-center gap-2"
            >
              <Trash2 size={16} /> Eliminar
            </button>

            <div className="flex gap-2 items-center">
              {/* Agendar llamada */}
              <button
                onClick={() => {
                  if (!editingTask) return;
                  setScheduleRoomId(editingTask.id);
                  setScheduleDateTime(new Date().toISOString().slice(0, 16));
                  setScheduleAttendees(editingTask.contactEmail || ""); // Usa el email del contacto como asistente predeterminado
                  setScheduledLinks(null);
                  setIsScheduleModalOpen(true);
                }}
                className="px-2 py-1 text-text-accent hover:text-text-secondary rounded transition flex items-center gap-2"
              >
                <RiCalendarScheduleFill size={16} /> Agendar Llamada
              </button>

              {/* Cancelar */}
              <button
                onClick={() => setEditingTask(null)}
                className="px-2 py-1 text-text-muted hover:text-text-primary rounded transition"
              >
                Cancelar
              </button>

              {/* Guardar */}
              <button
                onClick={handleSaveTask}
                disabled={isSaving}
                className="px-2 py-1 text-limeyellow-500 hover:text-limeyellow-400 rounded transition"
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      </ModalBase>

      {/* Modal de Programación/Unión de Llamada (combinado) */}
      <ModalBase
        isOpen={isScheduleModalOpen}
        onClose={() => {
          if (scheduledLinks?.icsUrl) {
            try {
              URL.revokeObjectURL(scheduledLinks.icsUrl);
            } catch (err) {
              console.error("Error revocando URL:", err);
            }
          }
          setIsScheduleModalOpen(false);
          setScheduledLinks(null);
          setScheduleRoomId(null);
          setIsJoiningCall(false);
        }}
        title={"Agendar/Iniciar Llamada"}
        width="max-w-lg"
      >
        <div className="space-y-4 mt-2">
          {hasActiveCall && (
            <div className="p-2 rounded border border-limeyellow-600 bg-dark-900 text-xs text-limeyellow-400">
              Ya existe una llamada activa para esta tarjeta. Únete para
              continuar.
            </div>
          )}
          <label
            htmlFor="scheduleDateTime"
            className="block text-sm text-text-muted"
          >
            Fecha y hora
          </label>
          <input
            id="scheduleDateTime"
            type="datetime-local"
            value={scheduleDateTime}
            onChange={(e) => setScheduleDateTime(e.target.value)}
            className="w-full p-2 rounded-lg bg-dark-800 text-sm border border-dark-600"
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <label
                htmlFor="scheduleDurationMinutes"
                className="block text-sm text-text-muted"
              >
                Duración (min)
              </label>
              <input
                id="scheduleDurationMinutes"
                type="number"
                value={scheduleDurationMinutes}
                onChange={(e) =>
                  setScheduleDurationMinutes(Number(e.target.value || 0))
                }
                className="w-full p-2 rounded-lg bg-dark-800 text-sm border border-dark-600"
                min={1}
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="scheduleAttendees"
                className="block text-sm text-text-muted"
              >
                Asistentes (coma-separado)
              </label>
              <input
                id="scheduleAttendees"
                type="text"
                value={scheduleAttendees}
                onChange={(e) => setScheduleAttendees(e.target.value)}
                className="w-full p-2 rounded-lg bg-dark-800 text-sm border border-dark-600"
                placeholder="ej: a@ejemplo.com, b@ejemplo.com"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={async () => {
                try {
                  const start = new Date(scheduleDateTime);
                  const end = new Date(
                    start.getTime() + scheduleDurationMinutes * 60 * 1000
                  );
                  const attendees = scheduleAttendees
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  await createCalendarEvent({
                    title: modalTitle || "Llamada",
                    description: modalDescription,
                    start,
                    end,
                    attendees,
                  });
                } catch (err) {
                  console.error("Error creando invitación:", err);
                  alert("Error creando invitación. Revisa la consola.");
                }
              }}
              disabled={isScheduling || isJoiningCall}
              className="inline-flex items-center gap-2 whitespace-nowrap px-3 py-1 bg-limeyellow-500 text-white rounded-lg"
            >
              {isScheduling ? (
                "Creando..."
              ) : (
                <>
                  {" "}
                  Crear invitación <IoIosSend />
                </>
              )}
            </button>

            <button
              onClick={async () => {
                if (!scheduleRoomId) return;
                try {
                  if (!hasActiveCall) {
                    const start = new Date(scheduleDateTime);
                    const end = new Date(
                      start.getTime() + scheduleDurationMinutes * 60 * 1000
                    );
                    const attendees = scheduleAttendees
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    await createCalendarEvent({
                      title: modalTitle || "Llamada",
                      description: modalDescription,
                      start,
                      end,
                      attendees,
                    });
                  }
                  await handleLiveKit(scheduleRoomId, user?.email || "");
                } catch (err) {
                  console.error("Error al procesar la llamada:", err);
                  alert("Error al procesar la llamada. Revisa la consola.");
                }
              }}
              disabled={isScheduling || isJoiningCall}
              className="inline-flex items-center gap-2 whitespace-nowrap px-3 py-1 bg-dark-600 text-text-primary rounded-lg"
            >
              {actionLabel}
            </button>

            <button
              onClick={() => {
                if (scheduledLinks?.icsUrl) {
                  try {
                    URL.revokeObjectURL(scheduledLinks.icsUrl);
                  } catch (err) {
                    console.error("Error revocando URL:", err);
                  }
                }
                setIsScheduleModalOpen(false);
                setScheduledLinks(null);
                setScheduleRoomId(null);
                setIsJoiningCall(false);
              }}
              className="px-3 py-1 bg-dark-900 text-text-muted rounded-lg"
            >
              Cerrar
            </button>
          </div>

          {scheduledLinks && (
            <div className="mt-3 p-3 bg-dark-800 rounded border border-dark-600">
              {scheduledLinks.htmlLink && (
                <div className="mb-2">
                  <a
                    href={scheduledLinks.htmlLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-limeyellow-400 underline"
                  >
                    Abrir evento en Google Calendar (creado)
                  </a>
                </div>
              )}
              {scheduledLinks.shareLink && (
                <div className="mb-2 flex items-center gap-3">
                  <input
                    type="text"
                    readOnly
                    value={scheduledLinks.shareLink}
                    className="flex-1 p-2 rounded bg-dark-900 text-sm border border-dark-600"
                  />
                  <button
                    onClick={async () => {
                      const text = scheduledLinks.shareLink || "";
                      try {
                        await navigator.clipboard.writeText(text);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch (e) {
                        // If clipboard API fails, inform the user
                        console.error("Failed to copy to clipboard:", e);
                        alert("No se pudo copiar al portapapeles. Por favor, copia el enlace manualmente.");
                      }
                    }}
                    className="px-3 py-1 bg-limeyellow-500 text-white rounded"
                  >
                    Copiar
                  </button>
                  {copied && (
                    <span className="text-sm text-text-muted">Copiado</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </ModalBase>
    </div>
  );
};

export default Board;
