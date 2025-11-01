import React from "react";
import { useParams } from "react-router-dom";
import LivekitPage from "./LivekitPage";

const LivekitPageWrapper: React.FC = () => {
  const { room, token } = useParams<{ room: string; token: string }>();
  const url = "https://localhost/livekit";

  if (!room || !token) return <p>Token o room inválido</p>;

  return <LivekitPage token={token} url={url} />;
};

export default LivekitPageWrapper;
