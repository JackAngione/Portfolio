import { useEffect, useState } from "react";

const STORAGE_KEY = "epilepsyWarningSeen";

function EpilepsyWarningModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  if (!open) {
    return null;
  }

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="epilepsy-warning-title"
      className="fixed top-1/2 left-1/2 z-50 flex h-screen w-screen -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-background mx-4 flex max-w-md flex-col items-center gap-4 rounded-md p-6 text-center">
        <h2 id="epilepsy-warning-title" className="text-lg font-bold">
          Photosensitivity Warning
        </h2>
        <p>
          This site contains rapidly flashing images that may trigger seizures
          for people with photosensitive epilepsy. Viewer discretion is
          advised.
        </p>
        <button className="bg-background/70" onClick={dismiss} autoFocus>
          I understand, continue
        </button>
      </div>
    </div>
  );
}

export default EpilepsyWarningModal;
