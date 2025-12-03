const SearchInput: React.FC = () => {
  return (
    <input
      type="text"
      placeholder="Buscar..."
      className="w-full h-8 py-1 px-3 rounded-full bg-dark-800 text-sm text-text-primary placeholder-text-muted border border-dark-600 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-limeyellow-500"
    />
  );
};

export default SearchInput;
