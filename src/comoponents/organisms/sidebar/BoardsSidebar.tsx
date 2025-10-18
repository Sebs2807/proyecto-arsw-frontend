import React from "react";
import BoardPreviewCard from "../../atoms/BoardPreviewCard";
import SearchInput from "../../atoms/SearchInput";

const BoardsSidebar: React.FC = () => {
  return (
    <aside className="flex flex-col border-r border-dark-600 w-full h-screen">
      <div className="p-3 border-b border-dark-600">
        <SearchInput />
      </div>

      <div
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-3"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{`
      div::-webkit-scrollbar {
        display: none;
      }
    `}</style>

        <BoardPreviewCard title="Ventas Q4" color="#FACC15" />
        <BoardPreviewCard title="Clientes Premium" isActive color="#60A5FA" />
        <BoardPreviewCard title="Campaña Octubre" color="#FB7185" />
        <BoardPreviewCard title="Marketing LATAM" color="#34D399" />
      </div>
    </aside>
  );
};

export default BoardsSidebar;
