import React from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";

interface Props {
  token: string;
  url: string;
}

const LivekitPage: React.FC<Props> = ({ token, url }) => {
  return (
    <div className="w-screen h-screen bg-gray-100">
      <LiveKitRoom
        token={token}
        serverUrl={url}
        connect={true}
        onError={(err) => console.error("LiveKit error:", err)}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
};

export default LivekitPage;
