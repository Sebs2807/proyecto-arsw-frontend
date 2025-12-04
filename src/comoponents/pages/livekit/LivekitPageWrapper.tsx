import React from "react";
import { useLocation, useParams } from "react-router-dom";
import LivekitPage from "./LivekitPage";
import { LIVEKIT_ACTIVE_BOARD_KEY, LIVEKIT_ACTIVE_ROOM_KEY } from "../../../constants/livekit";

const LivekitPageWrapper: React.FC = () => {
  const { room, token } = useParams<{ room: string; token: string }>();
  const location = useLocation();
  const state = location.state as { boardId?: string; cardId?: string } | null;

  const storedRoom =
    globalThis.window === undefined
      ? undefined
      : globalThis.window.sessionStorage.getItem(LIVEKIT_ACTIVE_ROOM_KEY) ?? undefined;
  const storedBoard =
    globalThis.window === undefined
      ? undefined
      : globalThis.window.sessionStorage.getItem(LIVEKIT_ACTIVE_BOARD_KEY) ?? undefined;

  const boardId = state?.boardId ?? storedBoard;
  const cardId = state?.cardId ?? storedRoom ?? room;

  const defaultLivekitUrl = "ws://localhost:7880";
  const envLivekitUrl = import.meta.env.VITE_LIVEKIT_URL;
  const url =
    import.meta.env.MODE === "test"
      ? defaultLivekitUrl
      : envLivekitUrl?.trim() || defaultLivekitUrl;

  if (!room || !token)
    return (
      <p className="text-text-error font-poppins p-6">
        Token o room inválido
      </p>
    );

  return <LivekitPage token={token} url={url} boardId={boardId} cardId={cardId} />;
};

export default LivekitPageWrapper;
