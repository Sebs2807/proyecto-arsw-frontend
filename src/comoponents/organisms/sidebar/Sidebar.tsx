// src/components/organisms/Sidebar.tsx
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import Home from "../../../assets/house.svg?react";
import Calendar from "../../../assets/calendar.svg?react";
import Bot from "../../../assets/bot-message-square.svg?react";
import Columns from "../../../assets/columns-3.svg?react";
import HomeSidebar from "./HomeSidebar";
import SynapseButton from "../../atoms/SynapseButton";
import { setSection } from "../../../store/slices/sidebarSlice";
import type { RootState, AppDispatch } from "../../../store";
import BoardsSidebar from "./BoardsSidebar";

const Sidebar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { selectedWorkspace } = useSelector(
    (state: RootState) => state.workspace
  );

  const selectedSection = useSelector(
    (state: RootState) => state.sidebar.section
  );

  const handleSelect = (id: string, navigationPath?: string) => {
    dispatch(setSection(id));
    navigate(navigationPath!);
  };

  const navButtons = [
    {
      id: "home",
      icon: <Home className="h-4 w-4 inline-block" />,
      sideMenuComponent: selectedWorkspace ? <HomeSidebar /> : null,
      navigationPath: "/home",
      text: "Inicio",
    },
    {
      id: "columns",
      icon: <Columns className="h-4 w-4 inline-block" />,
      sideMenuComponent: selectedWorkspace ? <BoardsSidebar /> : null,
      navigationPath: "/boards",
      text: "Tableros",
    },
    {
      id: "calendar",
      icon: <Calendar className="h-4 w-4 inline-block" />,
      sideMenuComponent: null,
      navigationPath: "/calendar",
      text: "Calendario",
    },
    {
      id: "bot",
      icon: <Bot className="h-4 w-4 inline-block" />,
      sideMenuComponent: null,
      navigationPath: "/assistant",
      text: "Asistente",
    },
  ];

  const activeNav = navButtons.find((btn) => btn.id === selectedSection);

  return (
    <div className="h-full flex flex-col flex-1">
      <div className="flex gap-4 mb-1 justify-center text-text-primary">
        {navButtons.map(({ id, icon, navigationPath }) => (
          <SynapseButton
            key={id}
            id={id}
            icon={icon}
            selected={selectedSection}
            navigationPath={navigationPath}
            handleSelect={handleSelect}
          />
        ))}
      </div>

      <div className="flex flex-col flex-1 bg-dark-600 rounded-xl p-2 overflow-hidden">
        <p className="text-lg font-semibold text-text-primary text-center">
          {activeNav?.text}
        </p>
        <div className="mb-4">{activeNav?.sideMenuComponent}</div>
      </div>
    </div>
  );
};

export default Sidebar;
