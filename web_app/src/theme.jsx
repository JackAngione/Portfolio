import { useCallback, useEffect, useRef, useState } from "react";

/*
  Site-wide color theme. The stored *preference* is "dark" | "light" |
  "system"; the *resolved* theme ("dark" | "light") is stamped on
  <html data-theme> (plus a "dark" class for HeroUI) — index.html runs the
  same stamping logic inline before first paint so there is no flash.
  All CSS reacts via the variable overrides in main.css; JS-driven colors
  (shaders, wavesurfer, motion animations) react through useResolvedTheme,
  which watches the attribute.
*/

const STORAGE_KEY = "theme-preference";
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

export function getThemePreference() {
  let stored = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* storage unavailable -> fall through to system */
  }
  return stored === "light" || stored === "dark" ? stored : "system";
}

function resolveTheme(preference) {
  if (preference === "system") return darkQuery.matches ? "dark" : "light";
  return preference;
}

function applyTheme(preference) {
  const theme = resolveTheme(preference);
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function useThemePreference() {
  const [preference, setPreferenceState] = useState(getThemePreference);

  const setPreference = useCallback((next) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* preference just won't persist */
    }
    setPreferenceState(next);
    applyTheme(next);
  }, []);

  //in system mode, follow live OS theme changes
  useEffect(() => {
    if (preference !== "system") return;
    const onChange = () => applyTheme("system");
    darkQuery.addEventListener("change", onChange);
    return () => darkQuery.removeEventListener("change", onChange);
  }, [preference]);

  return [preference, setPreference];
}

//the resolved theme currently stamped on <html>, kept live across both
//toggle clicks and OS changes by observing the attribute itself
export function useResolvedTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme ?? "dark",
  );
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setTheme(document.documentElement.dataset.theme ?? "dark"),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return theme;
}

//read a theme CSS variable (e.g. "--color-primary") at its current value
export function themeColor(varName) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
}

const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const MODES = [
  {
    id: "light",
    label: "Light theme",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
  {
    id: "system",
    label: "Follow system theme",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8m-4-4v4" />
      </svg>
    ),
  },
  {
    id: "dark",
    label: "Dark theme",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    ),
  },
];

/*
  Collapsed, the island shows only the mode that is currently in effect;
  clicking it blooms the other two out sideways (staggered, the sun
  spinning and the moon rising into place). Picking a mode collapses it
  again, as does clicking away or pressing Escape.
*/
export function ThemeToggle() {
  const [preference, setPreference] = useThemePreference();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const activeIndex = MODES.findIndex(({ id }) => id === preference);

  return (
    <div
      ref={rootRef}
      className="themeToggle"
      data-open={open || undefined}
      role="group"
      aria-label="Color theme"
    >
      {MODES.map(({ id, label, icon }, index) => {
        const active = id === preference;
        return (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={open ? label : `Color theme: ${label}`}
            aria-pressed={active}
            aria-expanded={active && !open ? false : undefined}
            //hidden peers stay out of the tab order while collapsed
            tabIndex={open || active ? 0 : -1}
            className={active ? "active" : ""}
            //peers fan out from the active one, the nearest leading
            style={{ "--stagger": `${Math.abs(index - activeIndex) * 60}ms` }}
            onClick={() => {
              if (!open) {
                setOpen(true);
                return;
              }
              setPreference(id);
              setOpen(false);
            }}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
