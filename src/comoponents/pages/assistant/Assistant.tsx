import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";

import AgentsManager from "../../AgentsManager";
import KnowledgeManager from "../../KnowledgeManager";

const AssistantPage: React.FC = () => {
  const { activeItem } = useSelector((state: RootState) => state.sidebar);

  const ALL_CONFIGS = useMemo(
    () => ({
      "assistant-knowledge": {
        title: "Knowledge Base",
        description: "Manage knowledge and FAQs for the assistant.",
      },
      agents: {
        title: "AI Agents",
        description: "View and manage AI agents.",
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
      case "assistant-knowledge":
        return <KnowledgeManager />;

      case "agents":
        return <AgentsManager />;

      default:
        return (
          <div className="mt-6 text-text-secondary text-center">
            Manager for **{activeItem}** not implemented.
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-dark-900">
      {renderManager()}
    </div>
  );
};

export default AssistantPage;
