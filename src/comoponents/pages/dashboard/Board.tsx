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
import { RiCalendarScheduleFill } from "react-icons/ri";
import { IoIosSend } from "react-icons/io";
import { FaPhone } from "react-icons/fa";
import { BsFillTelephoneForwardFill } from "react-icons/bs";
import { LIVEKIT_ACTIVE_BOARD_KEY, LIVEKIT_ACTIVE_ROOM_KEY } from "../../../constants/livekit";


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
  const navigate = useNavigate();
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
  const [activeCalls, setActiveCalls] = React.useState<Record<string, { roomId: string; startedBy?: string }>>({});


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
          const withoutCard = prev.map((l) => ({ ...l, cards: l.cards.filter((c) => c.id !== card.id) }));

          return withoutCard.map((l) =>
            l.id === destListId ? { ...l, cards: [...l.cards, card] } : l
          );
        }),
      boardId
    );

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
      calls.forEach((call) => {
        if (call.cardId && call.roomId) {
          mapped[call.cardId] = {
            roomId: call.roomId,
            startedBy: call.startedBy,
          };
        }
      });

      const activeRoomForThisClient =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem(LIVEKIT_ACTIVE_ROOM_KEY)
          : null;

      const cleaned = { ...mapped };

      Object.entries(mapped).forEach(([cardId, info]) => {
        const sameUser = info.startedBy && info.startedBy === (user?.email ?? "");
        const clientCurrentlyInRoom = activeRoomForThisClient && activeRoomForThisClient === cardId;

        if (sameUser && !clientCurrentlyInRoom) {
          apiService.socket?.emit("call:ended", {
            boardId,
            cardId,
            user: user?.email ?? "anonymous@example.com",
          });
          delete cleaned[cardId];
        }
      });

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
      setActiveCalls((prev) => ({ ...prev, [cardId]: { roomId, startedBy: user } }));
    });

    apiService.socket?.on("call:ended", ({ boardId: payloadBoardId, cardId, user: endedBy }: { boardId?: string; cardId?: string; user?: string }) => {
      if (payloadBoardId && payloadBoardId !== boardId) return;
      if (!cardId) return;
      setActiveCalls((prev) => {
        const copy = { ...prev };
        delete copy[cardId];
        return copy;
      });

      if (typeof window !== "undefined") {
        const activeRoomId = window.sessionStorage.getItem(LIVEKIT_ACTIVE_ROOM_KEY);
        if (activeRoomId && activeRoomId === cardId) {
          window.sessionStorage.removeItem(LIVEKIT_ACTIVE_ROOM_KEY);
          window.sessionStorage.removeItem(LIVEKIT_ACTIVE_BOARD_KEY);
          if (window.location.pathname.startsWith("/livekit")) {
            window.location.href = "https://localhost:5173/boards";
          } else {
            navigate("/boards");
          }
          return;
        }

        if (endedBy && endedBy === (user?.email ?? "")) {
          window.sessionStorage.removeItem(LIVEKIT_ACTIVE_ROOM_KEY);
          window.sessionStorage.removeItem(LIVEKIT_ACTIVE_BOARD_KEY);
          if (window.location.pathname.startsWith("/livekit")) {
            window.location.href = "https://localhost:5173/boards";
          } else {
            navigate("/boards");
          }
        }
      }
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
      apiService.socket?.off("connect", requestActiveCalls);
      apiService.socket?.off("call:activeSet", handleCallActiveSet);
      apiService.disconnectSocket();
    };
  }, [selectedBoard?.id, user?.email]);

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

  const handleLiveKit = async (roomId: string, email: string) => {
    try {
      let name = memberCache[email]
        ? `${memberCache[email].firstName} ${memberCache[email].lastName}`
        : null;

      if (!name) {
        const member = await apiService.get<{ firstName: string; lastName: string }>(
          `/v1/users/${encodeURIComponent(email)}`
        );

        const fullName = `${member.firstName} ${member.lastName}`;
        name = fullName;

        setMemberCache((prev) => ({
          ...prev,
          [email]: member,
        }));
      }

      const baseIdentity = (user?.email || name || `guest-${Date.now()}`)
        .replace(/[^a-zA-Z0-9_-]/g, "_");

      function getSecureRandomSuffix() {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
          return crypto.randomUUID().slice(0, 8);
        }

        if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
          const arr = new Uint32Array(1);
          window.crypto.getRandomValues(arr);
          return arr[0].toString(16).slice(0, 8);
        }

        throw new Error("Secure random generator unavailable");
      }

      const randomSuffix = getSecureRandomSuffix();
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

      try {
        apiService.socket?.emit("call:started", {
          boardId: selectedBoard?.id,
          cardId: roomId,
          roomId,
          user: user?.email ?? "anonymous@example.com",
        });
        setActiveCalls((prev) => ({ ...prev, [roomId]: { roomId, startedBy: user?.email } }));
      } catch (e) {
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(LIVEKIT_ACTIVE_ROOM_KEY, roomId);
        if (selectedBoard?.id) {
          window.sessionStorage.setItem(LIVEKIT_ACTIVE_BOARD_KEY, selectedBoard.id);
        }
      }

      navigate(`/livekit/${roomId}/${token}`, {
        state: {
          boardId: selectedBoard?.id,
          cardId: roomId,
        },
      });

    } catch (err) {
      console.error("Error al generar token de LiveKit:", err);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(LIVEKIT_ACTIVE_ROOM_KEY);
        window.sessionStorage.removeItem(LIVEKIT_ACTIVE_BOARD_KEY);
      }
      setActiveCalls((prev) => {
        const copy = { ...prev };
        delete copy[roomId];
        return copy;
      });
    }
  };



  const [isScheduleModalOpen, setIsScheduleModalOpen] = React.useState(false);
  const [scheduleDateTime, setScheduleDateTime] = React.useState<string>(new Date().toISOString().slice(0,16));
  const [scheduleDurationMinutes, setScheduleDurationMinutes] = React.useState<number>(30);
  const [scheduleAttendees, setScheduleAttendees] = React.useState<string>("");
  const [isScheduling, setIsScheduling] = React.useState(false);
  const [scheduledLinks, setScheduledLinks] = React.useState<{ htmlLink?: string; googleAddUrl?: string; icsUrl?: string; shareLink?: string } | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [scheduleRoomId, setScheduleRoomId] = React.useState<string | null>(null);
  const [isJoiningCall, setIsJoiningCall] = React.useState(false);

  const currentScheduleCardId = scheduleRoomId ?? (editingTask ? editingTask.id : null);
  const hasActiveCall = currentScheduleCardId ? Boolean(activeCalls[currentScheduleCardId]) : false;

  const formatForGoogleDates = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d{3}/g, "");
  };

  const generateICS = (opts: { uid: string; title: string; description?: string; start: Date; end: Date; url?: string; attendees?: string[] }) => {
    const { uid, title, description = "", start, end, url = "", attendees = [] } = opts;
    const dtstamp = new Date().toISOString().replace(/-|:|\.\d{3}/g, "");
    const dtstart = start.toISOString().replace(/-|:|\.\d{3}/g, "");
    const dtend = end.toISOString().replace(/-|:|\.\d{3}/g, "");
    const attendeesLines = attendees.map(a => `ATTENDEE:mailto:${a}`).join("\r\n");
    const ics = [`BEGIN:VCALENDAR`,`VERSION:2.0`,`PRODID:-//Synapse//EN`,`CALSCALE:GREGORIAN`,`BEGIN:VEVENT`,
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      attendeesLines,
      url ? `URL:${url}` : "",
      `END:VEVENT`,`END:VCALENDAR`].filter(Boolean).join("\r\n");
    return ics;
  };

  const createCalendarEvent = async (opts: { title: string; description?: string; start: Date; end: Date; attendees?: string[] }) => {
    setIsScheduling(true);
    try {
      const payload = {
        summary: opts.title,
        description: opts.description,
        start: { dateTime: opts.start.toISOString() },
        end: { dateTime: opts.end.toISOString() },
        attendees: (opts.attendees || []).map(e => ({ email: e })),
      };

      const resp = await apiService.post<any>(`/v1/calendar/google-events`, payload);

      const created = resp && (resp.data || resp) ? (resp.data || resp) : resp;
      const htmlLink: string | undefined = created?.htmlLink || created?.data?.htmlLink || created?.result?.htmlLink;

      const googleDates = `${formatForGoogleDates(opts.start)}/${formatForGoogleDates(opts.end)}`;
      const addUrl = new URL('https://calendar.google.com/calendar/render');
      addUrl.searchParams.set('action', 'TEMPLATE');
      addUrl.searchParams.set('text', opts.title);
      if (opts.description) addUrl.searchParams.set('details', opts.description);
      addUrl.searchParams.set('dates', googleDates);
      if (opts.attendees && opts.attendees.length) addUrl.searchParams.set('add', opts.attendees.join(','));

      const uid = created?.id || `synapse-${Date.now()}`;
      const ics = generateICS({ uid, title: opts.title, description: opts.description, start: opts.start, end: opts.end, url: htmlLink, attendees: opts.attendees });
      const blob = new Blob([ics], { type: 'text/calendar' });
      const icsUrl = URL.createObjectURL(blob);

  const shareLink = htmlLink || addUrl.toString();
  setScheduledLinks({ htmlLink, googleAddUrl: addUrl.toString(), icsUrl, shareLink });

      return { htmlLink, googleAddUrl: addUrl.toString(), icsUrl };
    } catch (err) {
      console.error('Error creando evento en calendario:', err);
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

                                {activeCalls[task.id] && (
                                  <span className="absolute top-1 right-1 text-[10px]">
                                    <BsFillTelephoneForwardFill color="green" size={16}/>
                                  </span>
                                )}

                                <h3 className="font-medium truncate text-text-primary">
                                  {task.title}
                                </h3>
                                <p className="text-xs mt-1 line-clamp-2 text-text-muted">
                                  {task.description}
                                </p>
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
        <button
          onClick={() => {
            if (!editingTask) return;
            setScheduleRoomId(editingTask.id);
            setScheduleDateTime(new Date().toISOString().slice(0,16));
            setScheduleAttendees("");
            setScheduledLinks(null);
            setIsScheduleModalOpen(true);
          }}
          className="px-2 py-1 text-text-accent hover:text-text-secondary rounded transition flex items-center gap-2"
        >
          <RiCalendarScheduleFill size={16}/> Agendar Llamada
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
              const resp = await apiService.put<Partial<Task>>(`/v1/cards/${editingId}`, {
                title: modalTitle,
                description: modalDescription,
              });

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

    <ModalBase
      isOpen={isScheduleModalOpen}
      onClose={() => {
        if (scheduledLinks?.icsUrl) try { URL.revokeObjectURL(scheduledLinks.icsUrl); } catch {};
        setIsScheduleModalOpen(false);
        setScheduledLinks(null);
        setScheduleRoomId(null);
        setIsJoiningCall(false);
      }}
      title={"Agendar llamada"}
      width="max-w-lg"
    >
      <div className="space-y-4 mt-2">
        {hasActiveCall && (
          <div className="p-2 rounded border border-limeyellow-600 bg-dark-900 text-xs text-limeyellow-400">
            Ya existe una llamada activa para esta tarjeta. Únete para continuar.
          </div>
        )}
        <label className="block text-sm text-text-muted">Fecha y hora</label>
        <input
          type="datetime-local"
          value={scheduleDateTime}
          onChange={(e) => setScheduleDateTime(e.target.value)}
          className="w-full p-2 rounded-lg bg-dark-800 text-sm border border-dark-600"
        />

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm text-text-muted">Duración (min)</label>
            <input
              type="number"
              value={scheduleDurationMinutes}
              onChange={(e) => setScheduleDurationMinutes(Number(e.target.value || 0))}
              className="w-full p-2 rounded-lg bg-dark-800 text-sm border border-dark-600"
              min={1}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-text-muted">Asistentes (coma-separado)</label>
            <input
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
                const end = new Date(start.getTime() + scheduleDurationMinutes * 60 * 1000);
                const attendees = scheduleAttendees.split(',').map(s=>s.trim()).filter(Boolean);
                await createCalendarEvent({ title: modalTitle || 'Llamada', description: modalDescription, start, end, attendees });
              } catch (err) {
                alert('Error creando invitación. Revisa la consola.');
              }
            }}
            disabled={isScheduling}
            className="inline-flex items-center gap-2 whitespace-nowrap px-3 py-1 bg-limeyellow-500 text-white rounded-lg"
          >
            {isScheduling ? 'Creando...' : <> Crear invitación <IoIosSend /></>}
          </button>

          <button
            onClick={async () => {
              if (!scheduleRoomId) return;
              setIsJoiningCall(true);
              try {
                if (!hasActiveCall) {
                  const start = new Date(scheduleDateTime);
                  const end = new Date(start.getTime() + scheduleDurationMinutes * 60 * 1000);
                  const attendees = scheduleAttendees.split(',').map(s=>s.trim()).filter(Boolean);
                  await createCalendarEvent({ title: modalTitle || 'Llamada', description: modalDescription, start, end, attendees });
                }
                await handleLiveKit(scheduleRoomId, user?.email || '');
              } catch (err) {
                alert('Error al procesar la llamada. Revisa la consola.');
              } finally {
                setIsJoiningCall(false);
              }
            }}
            disabled={isScheduling || isJoiningCall}
            className="inline-flex items-center gap-2 whitespace-nowrap px-3 py-1 bg-dark-600 text-text-primary rounded-lg"
          >
            {isScheduling || isJoiningCall ? 'Procesando...' : hasActiveCall ? <>Unirse a llamada <FaPhone /></> : <>Crear llamada <FaPhone /></>}
          </button>

          <button
            onClick={() => {
              if (scheduledLinks?.icsUrl) try { URL.revokeObjectURL(scheduledLinks.icsUrl); } catch {};
              setIsScheduleModalOpen(false);
              setScheduledLinks(null);
              setScheduleRoomId(null);
              setIsJoiningCall(false);
            }}
            className="px-3 py-1 bg-dark-900 text-text-muted rounded-lg"
          >Cerrar</button>
        </div>

        {scheduledLinks && (
          <div className="mt-3 p-3 bg-dark-800 rounded border border-dark-600">
            {scheduledLinks.htmlLink && (
              <div className="mb-2">
                <a href={scheduledLinks.htmlLink} target="_blank" rel="noreferrer" className="text-limeyellow-400 underline">Abrir evento en Google Calendar (creado)</a>
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
                    try {
                      await navigator.clipboard.writeText(scheduledLinks.shareLink || '');
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch (e) {
                      const el = document.createElement('textarea');
                      el.value = scheduledLinks.shareLink || '';
                      document.body.appendChild(el);
                      el.select();
                      document.execCommand('copy');
                      document.body.removeChild(el);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  className="px-3 py-1 bg-limeyellow-500 text-white rounded"
                >Copiar</button>
                {copied && <span className="text-sm text-text-muted">Copiado</span>}
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

