import { useContext, useEffect, useMemo, useRef, useState } from "react";
import "./upload.css";
import CreatableSelect from "react-select/creatable";
import { backend_address, media_server_address } from "../serverInfo.jsx";
import { AuthContext } from "../useAuth.jsx";
import { Link } from "react-router";

//AVIF is the preferred format; the others are accepted
const VALID_IMAGE_TYPES = ["image/avif", "image/jpeg", "image/png", "image/webp"];
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
  //per-input validation errors (invalid type) and soft warnings (dimensions)
  const [fileErrors, setFileErrors] = useState({});
  const [fileWarnings, setFileWarnings] = useState({});

  //inline feedback instead of alert() popups: {ok: bool, message: string}
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  const { token } = useContext(AuthContext);

  useEffect(() => {
    fetch(media_server_address + "/photo-categories")
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
      setFileErrors((prev) => ({
        ...prev,
        [kind]: `Not a valid image type (${file.type || "unknown"}). Use AVIF (preferred), JPEG, PNG, or WebP.`,
      }));
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

  const hasErrors = Boolean(fileErrors.highRes || fileErrors.lowRes);

  function submitUpload(e) {
    e.preventDefault();
    if (!selectedCategory || !highResFile || !lowResFile || hasErrors) return;
    setSubmitting(true);
    setStatus(null);

    const formData = new FormData();
    formData.append("category", selectedCategory.value);
    formData.append("highRes", highResFile);
    formData.append("lowRes", lowResFile);

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
        setStatus({ ok: false, message: `Upload failed: ${err.message}` });
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="mb-14 flex flex-col items-center">
      <h1>Upload Photo</h1>
      <p className="mb-4 text-sm">
        Upload the pair: high-res ({HIGH_RES_LONG_EDGE}px long edge) and
        low-res ({LOW_RES_LONG_EDGE}px). AVIF preferred.
      </p>

      <form onSubmit={submitUpload} id="uploadForm" ref={formRef}>
        <label>
          Category (type to create a new one):
          <CreatableSelect
            className="react-select-container"
            classNamePrefix="react-select"
            isSearchable={true}
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
        <label>
          Low-res image ({LOW_RES_LONG_EDGE}px long edge):
          <input
            className="border-secondary rounded-[2px] border-1"
            type="file"
            name="lowRes"
            required
            accept={VALID_IMAGE_TYPES.join(",")}
            onChange={(e) =>
              handleFileChange(e, "lowRes", LOW_RES_LONG_EDGE, setLowResFile)
            }
          />
        </label>
        {fileErrors.lowRes && <p role="alert">✗ {fileErrors.lowRes}</p>}
        {fileWarnings.lowRes && <p role="status">⚠ {fileWarnings.lowRes}</p>}
        <button
          className="m-4"
          type="submit"
          disabled={
            submitting ||
            hasErrors ||
            !selectedCategory ||
            !highResFile ||
            !lowResFile
          }
        >
          {submitting ? "Uploading..." : "Upload Photo"}
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
