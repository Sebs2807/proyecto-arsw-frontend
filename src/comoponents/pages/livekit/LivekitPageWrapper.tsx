import React from "react";
import { useLocation, useParams } from "react-router-dom";
import LivekitPage from "./LivekitPage";
import { LIVEKIT_ACTIVE_BOARD_KEY, LIVEKIT_ACTIVE_ROOM_KEY } from "../../../constants/livekit";

const LivekitPageWrapper: React.FC = () => {
  const { room, token } = useParams<{ room: string; token: string }>();
  const location = useLocation();
  const state = location.state as { boardId?: string; cardId?: string } | null;

  const storedRoom =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem(LIVEKIT_ACTIVE_ROOM_KEY) ?? undefined
      : undefined;
  const storedBoard =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem(LIVEKIT_ACTIVE_BOARD_KEY) ?? undefined
      : undefined;

  const boardId = state?.boardId ?? storedBoard;
  const cardId = state?.cardId ?? storedRoom ?? room;

  const url = "ws://localhost:7880";

  if (!room || !token)
    return (
      <p className="text-text-error font-poppins p-6">
        Token o room inválido
      </p>
    );

  return <LivekitPage token={token} url={url} boardId={boardId} cardId={cardId} />;
};

export default LivekitPageWrapper;
