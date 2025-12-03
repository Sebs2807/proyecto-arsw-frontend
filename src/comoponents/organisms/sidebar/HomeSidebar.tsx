// src/components/organisms/HomeSidebar.tsx
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import Bot from "../../../assets/bot.svg?react";
import UserCog from "../../../assets/user-cog.svg?react";
import ColumnsCog from "../../../assets/columns-3-cog.svg?react";
import SynapseButton from "../../atoms/SynapseButton";
import { setActiveItem } from "../../../store/slices/sidebarSlice";
import type { RootState, AppDispatch } from "../../../store";

const HomeSidebar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const selectedWorkspace = useSelector(
    (state: RootState) => state.workspace.selectedWorkspace
  );

  const activeItem = useSelector(
    (state: RootState) => state.sidebar.activeItem
  );

  const handleSelect = (id: string) => {
    dispatch(setActiveItem(id));
  };

  if (!selectedWorkspace) return null;

  return (
    <div className="flex flex-col rounded-md m-1 p-1 h-full max-h-screen">
      <div className="flex flex-col gap-5">
        <SynapseButton
          id="members"
          selected={activeItem}
          navigationPath="users"
          handleSelect={handleSelect}
          icon={<UserCog className="h-5 w-5" />}
          text="Gestión de miembros"
        />

        <SynapseButton
          id="boards"
          selected={activeItem}
          navigationPath="boards"
          handleSelect={handleSelect}
          icon={<ColumnsCog className="h-5 w-5" />}
          text="Gestión de tableros"
        />

        <SynapseButton
          id="agents"
          selected={activeItem}
          navigationPath="agents"
          handleSelect={handleSelect}
          icon={<Bot className="h-5 w-5" />}
          text="Agentes de IA"
        />
      </div>
    </div>
  );
};

export default HomeSidebar;
