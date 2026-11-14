import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (hash) {
      // A link like /docs#env-committed: scroll to that element once the page has rendered
      const id = decodeURIComponent(hash.slice(1));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
      return;
    }

    // POP means the Back or Forward button: leave the browser to restore the old position
    if (navigationType !== "POP") window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);

  return null; // renders nothing, it only has an effect
}