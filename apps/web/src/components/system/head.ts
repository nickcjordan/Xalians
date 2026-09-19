import * as React from "react"

/**
 * usePageTitle(title, description?) - per-route document title and meta
 * description (docs/design/site-audit-2026-09-18.md, issue #430).
 *
 * `title` becomes `document.title = "<title> · Xalians"`. Pass nothing (or
 * an empty string) for the home route, which gets plain "Xalians" instead
 * of "Xalians · Xalians". When `description` is given, it is written to
 * `meta[name=description]`. Both the title and the description are restored
 * to whatever they were before this hook ran when the component unmounts,
 * so a route change back out of a page does not leave its title behind.
 */
function usePageTitle(title?: string, description?: string) {
  React.useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} · Xalians` : "Xalians";

    let meta: HTMLMetaElement | null = null;
    let previousDescription: string | null = null;
    let hadMeta = false;
    if (description) {
      meta = document.querySelector('meta[name="description"]');
      hadMeta = !!meta;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      previousDescription = meta.getAttribute("content");
      meta.setAttribute("content", description);
    }

    return () => {
      document.title = previousTitle;
      if (meta) {
        if (hadMeta) {
          if (previousDescription === null) meta.removeAttribute("content");
          else meta.setAttribute("content", previousDescription);
        } else {
          meta.remove();
        }
      }
    };
  }, [title, description]);
}

export { usePageTitle }
