import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";

// Importa ambos gestores
import MembersManager from "./../../MembersManager";
import BoardsManager from "./../../BoardsManager";

const Home: React.FC = () => {
  const { activeItem } = useSelector((state: RootState) => state.sidebar);

  const ALL_CONFIGS = useMemo(
    () => ({
      members: {
        title: "Members",
        description: "View and manage workspace members.",
      },
      boards: {
        title: "Boards",
        description: "View and manage workspace boards.",
      },
    }),
    []
  );

  const config = ALL_CONFIGS[activeItem as keyof typeof ALL_CONFIGS];

  if (!config) {
    return (
      <div className="mt-6 text-text-secondary text-center">
        Select an option from the sidebar.
      </div>
    );
  }

  const renderManager = () => {
    switch (activeItem) {
      case "members":
        return <MembersManager />;

      case "boards":
        return <BoardsManager />;

      default:
        return (
          <div className="mt-6 text-text-secondary text-center">
            Manager for **{activeItem}** not implemented.
          </div>
        );
    }
  };

  return (
    // CLASE CLAVE: overflow-y-auto
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-dark-900">
      {renderManager()}
    </div>
  );
};

export default Home;
