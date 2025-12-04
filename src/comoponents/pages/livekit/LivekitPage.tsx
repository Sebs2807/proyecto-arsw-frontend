import React from "react";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";
import { apiService } from "../../../services/api/ApiService";
import { LIVEKIT_ACTIVE_BOARD_KEY, LIVEKIT_ACTIVE_ROOM_KEY } from "../../../constants/livekit";
import { Track } from "livekit-client";
import CustomLeaveButton from "./CustomLeaveButton";

interface Props {
  token: string;
  url: string;
  boardId?: string;
  cardId?: string;
}

const LivekitPage: React.FC<Props> = ({ token, url, boardId, cardId }) => {
  const userEmail = useSelector((state: RootState) => state.auth.user?.email);
  const hasIdentifiers = Boolean(boardId && cardId);
  const endedRef = React.useRef(false);

  const notifyCallEnded = React.useCallback(
    (shouldEmit: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;

      if (shouldEmit && hasIdentifiers) {
        apiService.socket?.emit("call:ended", {
          boardId,
          cardId,
          user: userEmail ?? "anonymous@example.com",
        });
      }

      if (globalThis.window !== undefined) {
        globalThis.sessionStorage.removeItem(LIVEKIT_ACTIVE_ROOM_KEY);
        globalThis.sessionStorage.removeItem(LIVEKIT_ACTIVE_BOARD_KEY);
      }
    },
    [boardId, cardId, hasIdentifiers, userEmail]
  );

  const redirectToBoards = React.useCallback(() => {
    if (globalThis.window !== undefined) {
      globalThis.setTimeout(() => {
      globalThis.location.href = import.meta.env.VITE_FRONTEND_URL + "/boards";
      }, 50);
    }
  }, []);

  const handleDisconnect = React.useCallback(() => {
    notifyCallEnded(true);
    redirectToBoards();
  }, [notifyCallEnded, redirectToBoards]);

  const handleRemoteCallEnded = React.useCallback(
    ({ cardId: endedCardId }: { cardId?: string }) => {
      if (!endedCardId || endedCardId !== cardId) return;
      notifyCallEnded(false);
      redirectToBoards();
    },
    [cardId, notifyCallEnded, redirectToBoards]
  );

  React.useEffect(() => {
    if (!boardId) return;

    if (apiService.socket?.connected) {
      apiService.socket?.emit("joinBoard", boardId);
      return;
    }

  const noop = () => {};

  apiService.initSocket(boardId, {
    onListCreated: noop,
    onListUpdated: noop,
    onListDeleted: noop,
    onCardCreated: noop,
    onCardUpdated: noop,
    onCardDeleted: noop,
    onCardMoved: noop,
    onCardDragStart: noop,
    onCardDragUpdate: noop,
    onCardDragEnd: noop,
  });
  }, [boardId]);

  React.useEffect(
    () => () => {
      notifyCallEnded(true);
      apiService.disconnectSocket();
    },
    [notifyCallEnded]
  );

  React.useEffect(() => {
    if (!boardId || !cardId) return;

    apiService.socket?.on("call:ended", handleRemoteCallEnded);

    return () => {
      apiService.socket?.off("call:ended", handleRemoteCallEnded);
    };
  }, [boardId, cardId, handleRemoteCallEnded]);

  return (
    <div className="min-h-screen bg-dark-900 font-poppins text-text-primary flex items-center justify-center p-6">
      <LiveKitRoom
        token={token}
        serverUrl={url}
        connect
        onDisconnected={handleDisconnect}
        onError={(err) => console.error("LiveKit error:", err)}
      >
        <LiveKitCallLayout />
      </LiveKitRoom>
    </div>
  );
};

const LiveKitCallLayout: React.FC = () => {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  return (
    <div className="w-full max-w-[1100px] h-[70vh] bg-dark-900 text-text-primary flex flex-col gap-4 p-4 animate-fade-in">

      <div className="w-full flex items-center justify-center">
        <div className="rounded-2xl border border-dark-600 bg-dark-900 px-4 py-2 flex items-center gap-4">
          <ControlBar
            variation="minimal"
            controls={{ leave: false }}
            className="!flex !flex-row !items-center !justify-center gap-4"
          />
          <CustomLeaveButton />
        </div>
      </div>

      <div className="flex-1 rounded-2xl shadow-2xl bg-dark-800 border border-dark-600 overflow-hidden relative">
        <RoomAudioRenderer />
        <GridLayout tracks={tracks} className="w-full h-full">
          <ParticipantTile />
        </GridLayout>
      </div>
    </div>
  );
};


export default LivekitPage;
