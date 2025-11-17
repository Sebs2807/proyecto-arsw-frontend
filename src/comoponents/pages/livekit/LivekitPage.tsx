import React from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";

interface Props {
  token: string;
  url: string;
}

const LivekitPage: React.FC<Props> = ({ token, url }) => {
  return (
    <div className="w-screen h-screen bg-dark-900 font-poppins text-text-primary">
      <LiveKitRoom
        token={token}
        serverUrl={url}
        connect
        onError={(err) => console.error("LiveKit error:", err)}
      >
        <div
          className="
            w-full h-full 
            bg-dark-900 
            text-text-primary 
            flex flex-col 
            p-4
            animate-fade-in
          "
        >
          <div
            className="
              flex-1 
              rounded-2xl 
              shadow-2xl 
              bg-dark-800 
              border border-dark-600
              overflow-visible
            "
          >
            <VideoConference />
          </div>
        </div>
      </LiveKitRoom>
    </div>
  );
};

export default LivekitPage;
