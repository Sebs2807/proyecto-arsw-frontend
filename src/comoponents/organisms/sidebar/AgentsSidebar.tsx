import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";

import SynapseButton from "../../atoms/SynapseButton";
import BrainIcon from "../../../assets/brain.svg?react";
import type { RootState, AppDispatch } from "../../../store";
import { setActiveItem } from "../../../store/slices/sidebarSlice";
import AgentPicker from "../../molecules/AgentPicker";

const AssistantSidebar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const activeItem = useSelector(
    (state: RootState) => state.sidebar.activeItem
  );
  const selectedAgent = useSelector(
    (state: RootState) => state.workspace.selectedAgent
  );

  useEffect(() => {
    if (!activeItem && selectedAgent) {
      dispatch(setActiveItem("assistant-knowledge"));
    }
  }, [activeItem, selectedAgent, dispatch]);

  const handleSelect = (id: string) => {
    dispatch(setActiveItem(id));
  };

  return (
    <div className="flex flex-col rounded-md m-1 p-1 h-full max-h-screen">
      <AgentPicker />
      <div className="flex flex-col gap-2 my-3">
        <SynapseButton
          id="assistant-knowledge"
          selected={activeItem}
          navigationPath="assistant/knowledge"
          handleSelect={handleSelect}
          disabled={!selectedAgent}
          icon={<BrainIcon className="h-5 w-5" />}
          text="Conocimientos"
        />
      </div>
    </div>
  );
};

export default AssistantSidebar;
