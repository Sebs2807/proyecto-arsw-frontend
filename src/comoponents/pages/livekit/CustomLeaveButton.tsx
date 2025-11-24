import { useRoomContext } from "@livekit/components-react";
import { FaPhoneSlash } from "react-icons/fa";

function CustomLeaveButton() {
  const room = useRoomContext();

  const disconnect = () => {
    room.disconnect();
  };

  return (
    <button
      onClick={disconnect}
      className="transition flex items-center justify-center"
    >
      <FaPhoneSlash size={18} />
    </button>
  );
}

export default CustomLeaveButton;