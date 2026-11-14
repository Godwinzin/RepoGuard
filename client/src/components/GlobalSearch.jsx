import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchIcon } from "./icons";

export default function GlobalSearch() {
  const [value, setValue] = useState("");
  const navigate = useNavigate();

  function submit(event) {
    event.preventDefault();
    const q = value.trim();
    navigate(q ? `/repositories?q=${encodeURIComponent(q)}` : "/repositories");
  }

  return (
    <form className="search-global" role="search" onSubmit={submit}>
      <SearchIcon size={16} />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search repositories…"
        aria-label="Search repositories"
      />
    </form>
  );
}
