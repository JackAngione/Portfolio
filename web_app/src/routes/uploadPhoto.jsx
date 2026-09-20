import { useContext, useEffect, useMemo, useRef, useState } from "react";
import "./upload.css";
import CreatableSelect from "react-select/creatable";
import { backend_address } from "../serverInfo.jsx";
import { AuthContext } from "../useAuth.jsx";
import { Link } from "react-router";

//Only JPEG and AVIF photo uploads are accepted.
const VALID_IMAGE_TYPES = ["image/avif", "image/jpeg"];
const HIGH_RES_LONG_EDGE = 2500;
const LOW_RES_LONG_EDGE = 1200;

//reads the long edge of an image file; null when it can't be decoded
async function readLongEdge(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const longEdge = Math.max(bitmap.width, bitmap.height);
    bitmap.close();
    return longEdge;
  } catch {
    return null;
  }
}

function UploadPhoto() {
  //existing photo categories (folder names on the server)
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [highResFile, setHighResFile] = useState(null);
  const [lowResFile, setLowResFile] = useState(null);
  const [generateLowRes, setGenerateLowRes] = useState(false);
  //per-input validation errors (invalid type) and soft warnings (dimensions)
  const [fileErrors, setFileErrors] = useState({});
  const [fileWarnings, setFileWarnings] = useState({});

  //Upload result feedback: {ok: bool, message: string}
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  const { token } = useContext(AuthContext);

  useEffect(() => {
    fetch(backend_address + "/photo-categories")
      .then((response) => response.json())
      .then((list) => setCategories(list.sort()))
      .catch(() => {});
  }, []);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ label: category, value: category })),
    [categories],
  );

  //validate type immediately and check dimensions against the expected long edge
  async function handleFileChange(event, kind, expectedLongEdge, setFile) {
    const file = event.target.files?.[0] ?? null;
    setStatus(null);
    setFile(file);
    setFileErrors((prev) => ({ ...prev, [kind]: null }));
    setFileWarnings((prev) => ({ ...prev, [kind]: null }));
    if (!file) return;

    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      const message =
        "Only JPG/JPEG and AVIF images are accepted. Please choose a supported image.";
      setFile(null);
      event.target.value = "";
      setFileErrors((prev) => ({ ...prev, [kind]: message }));
      window.alert(message);
      return;
    }

    const warnings = [];
    if (file.type !== "image/avif") {
      warnings.push("AVIF is the preferred format.");
    }
    const longEdge = await readLongEdge(file);
    if (longEdge !== null && longEdge !== expectedLongEdge) {
      warnings.push(
        `Long edge is ${longEdge}px, expected ${expectedLongEdge}px.`,
      );
    }
    if (warnings.length) {
      setFileWarnings((prev) => ({ ...prev, [kind]: warnings.join(" ") }));
    }
  }

  const hasErrors = Boolean(
    fileErrors.highRes || (!generateLowRes && fileErrors.lowRes),
  );

  function submitUpload(e) {
    e.preventDefault();
    if (
      submitting ||
      !selectedCategory ||
      !highResFile ||
      (!generateLowRes && !lowResFile) ||
      hasErrors
    )
      return;
    setSubmitting(true);
    setStatus(null);

    const formData = new FormData();
    formData.append("category", selectedCategory.value);
    formData.append("highRes", highResFile);
    formData.append("generateLowRes", String(generateLowRes));
    if (!generateLowRes) formData.append("lowRes", lowResFile);

    fetch(backend_address + "/photos", {
      method: "POST",
      //no Content-Type: the browser sets the multipart boundary itself
      headers: { authorization: `Bearer ${token}` },
      body: formData,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error((await response.text()) || "upload failed");
        }
        //keep the category selected so batch uploads into it are quick
        setHighResFile(null);
        setLowResFile(null);
        setFileWarnings({});
        setFileErrors({});
        setGenerateLowRes(false);
        formRef.current?.reset();
        setStatus({
          ok: true,
          message: `Photo uploaded to "${selectedCategory.value}".`,
        });
        //a brand-new category folder now exists on the server
        if (!categories.includes(selectedCategory.value)) {
          setCategories((prev) => [...prev, selectedCategory.value].sort());
        }
      })
      .catch((err) => {
        window.alert(`Upload failed: ${err.message}`);
        setStatus({ ok: false, message: `Upload failed: ${err.message}` });
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="mb-14 flex flex-col items-center">
      <h1>Upload Photo</h1>
      <p className="mb-4 text-sm">
        Upload the pair: high-res ({HIGH_RES_LONG_EDGE}px long edge) and low-res
        ({LOW_RES_LONG_EDGE}px), or generate the low-res copy from your
        original. AVIF preferred.
      </p>

      <form onSubmit={submitUpload} id="uploadForm" ref={formRef}>
        <label>
          Category (type to create a new one):
          <CreatableSelect
            className="react-select-container"
            classNamePrefix="react-select"
            isSearchable={true}
            isDisabled={submitting}
            name="category"
            options={categoryOptions}
            value={selectedCategory}
            placeholder="Select or create a category"
            onChange={(option) => setSelectedCategory(option)}
            onCreateOption={(title) =>
              setSelectedCategory({ label: title, value: title })
            }
          />
        </label>
        <label>
          High-res image ({HIGH_RES_LONG_EDGE}px long edge):
          <input
            className="border-secondary rounded-[2px] border-1"
            disabled={submitting}
            type="file"
            name="highRes"
            required
            accept={VALID_IMAGE_TYPES.join(",")}
            onChange={(e) =>
              handleFileChange(e, "highRes", HIGH_RES_LONG_EDGE, setHighResFile)
            }
          />
        </label>
        {fileErrors.highRes && <p role="alert">✗ {fileErrors.highRes}</p>}
        {fileWarnings.highRes && <p role="status">⚠ {fileWarnings.highRes}</p>}
        <label className="photo-resize-option">
          <input
            type="checkbox"
            checked={generateLowRes}
            disabled={submitting}
            onChange={(event) => {
              setGenerateLowRes(event.target.checked);
              setLowResFile(null);
              setFileErrors((prev) => ({ ...prev, lowRes: null }));
              setFileWarnings((prev) => ({ ...prev, lowRes: null }));
              setStatus(null);
            }}
          />
          <span>Generate a 1200px low-res copy</span>
        </label>
        {generateLowRes && (
          <p role="status">
            HDR AVIF stays HDR. Smaller images are not enlarged. Processing may
            take several minutes.
          </p>
        )}
        {!generateLowRes && (
          <>
            <label>
              Low-res image ({LOW_RES_LONG_EDGE}px long edge, same format as
              high-res):
              <input
                className="border-secondary rounded-[2px] border-1"
                disabled={submitting}
                type="file"
                name="lowRes"
                required
                accept={VALID_IMAGE_TYPES.join(",")}
                onChange={(e) =>
                  handleFileChange(
                    e,
                    "lowRes",
                    LOW_RES_LONG_EDGE,
                    setLowResFile,
                  )
                }
              />
            </label>
            {fileErrors.lowRes && <p role="alert">✗ {fileErrors.lowRes}</p>}
            {fileWarnings.lowRes && (
              <p role="status">⚠ {fileWarnings.lowRes}</p>
            )}
          </>
        )}
        <button
          className="m-4"
          type="submit"
          disabled={
            submitting ||
            hasErrors ||
            !selectedCategory ||
            !highResFile ||
            (!generateLowRes && !lowResFile)
          }
        >
          {submitting
            ? generateLowRes
              ? "Resizing and uploading..."
              : "Uploading..."
            : "Upload Photo"}
        </button>
        {status && (
          <p role="status">
            {status.ok ? "✓" : "✗"} {status.message}
          </p>
        )}
      </form>

      <Link className="mt-8 underline" to="/hdrphotos">
        View photo gallery →
      </Link>
    </div>
  );
}

export default UploadPhoto;
