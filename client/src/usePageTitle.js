import { useEffect } from "react";

const APP_NAME = "RepoGuard";

// Sets the browser tab title: "Repositories · RepoGuard"
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}