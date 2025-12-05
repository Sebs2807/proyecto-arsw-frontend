import React, { useState, useEffect } from "react";
import CloseIcon from "../../../assets/x.svg?react";
import { apiService } from "../../../services/api/ApiService";

export interface KnowledgeItem {
  id: string;
  title: string;
  text: string;
  category:
  | "product_feature"
  | "pricing"
  | "objection"
  | "flow_step"
  | "legal"
  | "faq";
  tags?: string[];
}

interface KnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  knowledge?: KnowledgeItem | null;
  mode: "add" | "edit" | "delete";
  agentId: string;
}

const categories = [
  "product_feature",
  "pricing",
  "objection",
  "flow_step",
  "legal",
  "faq",
] as const;

const modalTitles = {
  add: "Agregar conocimiento",
  edit: "Editar conocimiento",
  delete: "Eliminar conocimiento",
} as const;

const KnowledgeModal: React.FC<KnowledgeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  knowledge,
  mode,
  agentId,
}) => {


  const isEditing = mode === "edit";
  const isDeleting = mode === "delete";

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [category, setCategory] =
    useState<KnowledgeItem["category"]>("product_feature");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (knowledge && (isEditing || isDeleting)) {
      setTitle(knowledge.title);
      setText(knowledge.text);
      setCategory(knowledge.category);
      setTags(knowledge.tags || []);
    } else {
      setTitle("");
      setText("");
      setCategory("product_feature");
      setTags([]);
    }
  }, [knowledge, isEditing, isDeleting]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !tags.includes(newTag)) setTags([...tags, newTag]);
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const isFormValid = () => {
    if (isDeleting) return true;
    return !!title.trim() && !!text.trim();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isFormValid()) return;

    setLoading(true);
    const payload = {
      title: title.trim(),
      text: text.trim(),
      category,
      tags,
      agentId: agentId,
    };

    try {
      if (isDeleting && knowledge) {
        await apiService.delete(`/v1/knowledges/${knowledge.id}`);
      } else if (isEditing && knowledge) {
        await apiService.patch(`/v1/knowledges/${knowledge.id}`, payload);
      } else {
        await apiService.post(`/v1/knowledges`, payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error handling knowledge item:", err);
    } finally {
      setLoading(false);
    }
  };

  const getSubmitButtonText = () => {
    if (loading) return "Guardando...";
    if (isEditing) return "Actualizar";
    return "Crear";
  };

  const submitButtonText = getSubmitButtonText();

  return (
    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl p-6 w-full max-w-xl shadow-xl border border-dark-600 max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">
            {modalTitles[mode]}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-dark-700 text-text-secondary"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {isDeleting ? (
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">
              ¿Seguro que quieres eliminar el conocimiento{" "}
              <span className="text-limeyellow-500 font-semibold">
                {knowledge?.title}
              </span>{" "}
              ?
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg bg-dark-700 text-text-secondary hover:bg-dark-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm text-text-secondary mb-1">
                Título
              </label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500"
              />
            </div>

            <div>
              <label htmlFor="text" className="block text-sm text-text-secondary mb-1">
                Texto
              </label>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loading}
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500"
                rows={4}
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm text-text-secondary mb-1">
                Categoría
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as KnowledgeItem["category"])
                }
                disabled={loading}
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm text-text-secondary mb-1">
                Tags
              </label>
              <div className="flex gap-2 flex-wrap">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="bg-dark-700 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1"
                  >
                    {t}{" "}
                    <button type="button" onClick={() => handleRemoveTag(t)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Agregar tag y presiona Enter"
                disabled={loading}
                className="w-full mt-1 bg-dark-600 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-3 py-2 bg-dark-700 text-text-secondary rounded-lg text-sm hover:bg-dark-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !isFormValid()}
                className="px-3 py-2 bg-limeyellow-500 hover:bg-limeyellow-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {submitButtonText}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default KnowledgeModal;
