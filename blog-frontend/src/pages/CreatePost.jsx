import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BlockNoteView } from "@blocknote/mantine";
import {
  FormattingToolbarController,
  LinkToolbarController,
  SideMenuController,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";

import "../styles.css";
import "../create-post.css";
import { API_BASE, getAuthToken } from "../lib/api";
import { useTheme } from "../lib/theme";
import {
  blogEditorSchema,
  getBlogSlashMenuItems,
  insertYoutubeBlock,
  isYoutubeUrl,
} from "../components/editor/blogEditorSchema.jsx";

const DRAFT_KEY = "blog-editor-draft-v2";
const DEFAULT_BLOCKS = [
  {
    type: "paragraph",
    content: "Type / to open the slash menu, add media, and shape the story block by block.",
  },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function extractPlainText(value) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(extractPlainText).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.values(value).map(extractPlainText).join(" ");
  }

  return "";
}

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function estimateReadingMinutes(wordCount) {
  return Math.max(1, Math.ceil(wordCount / 220));
}

function parseTags(value) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatSavedTime(value) {
  if (!value) {
    return "Not saved yet";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function loadDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(DRAFT_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function createEmptyEditorState() {
  return {
    blocks: DEFAULT_BLOCKS,
    html: "<p></p>",
    markdown: "",
    plainText: "",
    wordCount: 0,
    readingMinutes: 1,
  };
}

function getInitialFormState(draft) {
  return {
    title: draft?.title || "",
    subtitle: draft?.subtitle || "",
    description: draft?.description || "",
    category: draft?.category || "Product",
    tagsInput: Array.isArray(draft?.tags) ? draft.tags.join(", ") : "",
    authorName: draft?.authorName || "",
  };
}

function buildPostPayload({ form, editorState, cover, serverId }) {
  return {
    serverId,
    title: form.title.trim() || "Untitled Story",
    subtitle: form.subtitle.trim(),
    description: form.description.trim(),
    category: form.category,
    tags: parseTags(form.tagsInput),
    authorName: form.authorName.trim(),
    cover,
    content: {
      version: 1,
      metadata: {
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        category: form.category,
        tags: parseTags(form.tagsInput),
        author: form.authorName.trim() || undefined,
        coverImage: cover.image
          ? {
              url: cover.image,
              positionX: cover.offsetX,
              positionY: cover.offsetY,
              zoom: cover.zoom,
            }
          : null,
        seo: {
          excerpt: editorState.plainText.slice(0, 180),
          readingMinutes: editorState.readingMinutes,
          wordCount: editorState.wordCount,
        },
      },
      blocks: editorState.blocks,
      markdown: editorState.markdown,
    },
  };
}

export default function CreatePost() {
  const initialDraftRef = useRef(loadDraft());
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const { isDark, toggleTheme } = useTheme();
  const [form, setForm] = useState(() => getInitialFormState(initialDraftRef.current));
  const [cover, setCover] = useState(() => ({
    image: initialDraftRef.current?.cover?.image || "",
    offsetX: initialDraftRef.current?.cover?.offsetX || 0,
    offsetY: initialDraftRef.current?.cover?.offsetY || 0,
    zoom: initialDraftRef.current?.cover?.zoom || 1,
  }));
  const [editorState, setEditorState] = useState(() => createEmptyEditorState());
  const [saveState, setSaveState] = useState(initialDraftRef.current ? "restored" : "idle");
  const [lastSavedAt, setLastSavedAt] = useState(initialDraftRef.current?.updatedAt || "");
  const [publishState, setPublishState] = useState({
    kind: initialDraftRef.current ? "info" : "",
    message: initialDraftRef.current ? "Draft restored from local storage." : "",
  });
  const [serverId, setServerId] = useState(initialDraftRef.current?.serverId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [authorProfile, setAuthorProfile] = useState(null);
  const [dragState, setDragState] = useState(null);

  const editor = useCreateBlockNote(
    {
      schema: blogEditorSchema,
      initialContent:
        initialDraftRef.current?.content?.blocks?.length > 0
          ? initialDraftRef.current.content.blocks
          : DEFAULT_BLOCKS,
      uploadFile: async (file) => {
        return fileToDataUrl(file);
      },
      pasteHandler: ({ event, editor: currentEditor, defaultPasteHandler }) => {
        const text = event.clipboardData?.getData("text/plain")?.trim();
        if (isYoutubeUrl(text)) {
          insertYoutubeBlock(currentEditor, text, "Embedded from paste");
          return true;
        }

        return defaultPasteHandler({
          prioritizeMarkdownOverHTML: true,
          plainTextAsMarkdown: true,
        });
      },
      tables: {
        headers: true,
        splitCells: true,
      },
    },
    [],
  );

  function syncEditorState(currentEditor) {
    const blocks = currentEditor.document;
    const plainText = extractPlainText(blocks).replace(/\s+/g, " ").trim();
    const wordCount = countWords(plainText);

    setEditorState({
      blocks,
      html: currentEditor.blocksToHTMLLossy(blocks),
      markdown: currentEditor.blocksToMarkdownLossy(blocks),
      plainText,
      wordCount,
      readingMinutes: estimateReadingMinutes(wordCount),
    });
  }

  useEffect(() => {
    syncEditorState(editor);
  }, [editor]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      return;
    }

    fetch(`${API_BASE}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) {
          return;
        }

        setAuthorProfile(data);
        setForm((current) => ({
          ...current,
          authorName: current.authorName || data.username || "",
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const hasContent =
      form.title.trim() ||
      form.subtitle.trim() ||
      form.description.trim() ||
      editorState.wordCount > 0 ||
      cover.image;

    if (!hasContent) {
      return;
    }

    setSaveState((current) => (current === "publishing" ? current : "saving"));

    const timeout = window.setTimeout(() => {
      const payload = buildPostPayload({ form, editorState, cover, serverId });
      const storedDraft = {
        ...payload,
        updatedAt: new Date().toISOString(),
      };

      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(storedDraft));
      setLastSavedAt(storedDraft.updatedAt);
      setSaveState((current) => (current === "publishing" ? current : "saved"));
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [cover, editorState, form, serverId]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    function onPointerMove(event) {
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      setCover((current) => ({
        ...current,
        offsetX: clamp(dragState.initialOffsetX + deltaX * 0.18, -120, 120),
        offsetY: clamp(dragState.initialOffsetY + deltaY * 0.18, -90, 90),
      }));
    }

    function onPointerUp() {
      setDragState(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragState]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCoverChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const image = await fileToDataUrl(file);
    setCover({
      image,
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
    });
    setPublishState({
      kind: "info",
      message: "Cover image updated. Drag it to reposition the framing.",
    });
    event.target.value = "";
  }

  async function handleInlineImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const url = await fileToDataUrl(file);
    const currentBlock = editor.getTextCursorPosition().block;
    editor.insertBlocks(
      [
        {
          type: "image",
          props: {
            url,
            caption: file.name.replace(/\.[^.]+$/, ""),
          },
        },
      ],
      currentBlock,
      "after",
    );
    event.target.value = "";
  }

  function insertBlock(type, props = {}, content = "") {
    const currentBlock = editor.getTextCursorPosition().block;
    editor.insertBlocks(
      [
        {
          type,
          props,
          content,
        },
      ],
      currentBlock,
      "after",
    );
    editor.focus();
  }

  function handleToolbarAction(action) {
    if (action === "image") {
      fileInputRef.current?.click();
      return;
    }

    if (action === "video") {
      const url = window.prompt("Paste a YouTube link");
      if (!url) {
        return;
      }

      if (!insertYoutubeBlock(editor, url, "Embedded from toolbar")) {
        setPublishState({
          kind: "error",
          message: "That does not look like a valid YouTube URL.",
        });
      }
      return;
    }

    if (action === "quote") {
      insertBlock("quote", {}, "Call out a sharp insight, a pull quote, or a key takeaway.");
      return;
    }

    if (action === "code") {
      insertBlock("codeBlock", {}, "const story = 'shape the narrative block by block';");
      return;
    }

    if (action === "h1" || action === "h2" || action === "h3") {
      const level = Number(action.replace("h", ""));
      insertBlock("heading", { level }, "Section heading");
      return;
    }

    if (action === "bullet") {
      insertBlock("bulletListItem", {}, "List item");
    }
  }

  async function persistPost(published) {
    const token = getAuthToken();
    const payload = buildPostPayload({ form, editorState, cover, serverId });

    if (!token) {
      setPublishState({
        kind: "info",
        message: published
          ? "Draft is safely stored locally. Add a saved auth token before publishing to the API."
          : "Draft stored locally. Sign in to sync it with the backend.",
      });
      return null;
    }

    const method = serverId ? "PUT" : "POST";
    const endpoint = serverId ? `${API_BASE}/api/posts/${serverId}` : `${API_BASE}/api/posts/`;
    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: payload.title,
        content: payload.content,
        published,
      }),
    });

    if (!response.ok) {
      let detail = "The server rejected the request.";
      try {
        const body = await response.json();
        detail = body?.detail?.message || body?.detail || detail;
      } catch {
        detail = response.statusText || detail;
      }
      throw new Error(detail);
    }

    return response.json();
  }

  async function handleSubmit(published) {
    setIsSubmitting(true);
    setSaveState("publishing");
    setPublishState({ kind: "", message: "" });

    try {
      const result = await persistPost(published);
      if (result?.id) {
        setServerId(result.id);
      }

      if (published && result?.id) {
        window.localStorage.removeItem(DRAFT_KEY);
        setPublishState({
          kind: "success",
          message: "Story published successfully and removed from local drafts.",
        });
      } else if (result?.id) {
        setPublishState({
          kind: "success",
          message: "Draft synced with the backend and kept locally for quick recovery.",
        });
      }

      setLastSavedAt(new Date().toISOString());
      setSaveState("saved");
    } catch (error) {
      setSaveState("saved");
      setPublishState({
        kind: "error",
        message: error.message || "Something went wrong while saving the story.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const tags = parseTags(form.tagsInput);
  const statusLabel =
    saveState === "saving"
      ? "Autosaving"
      : saveState === "publishing"
        ? "Publishing"
        : saveState === "restored"
          ? "Draft restored"
          : saveState === "saved"
            ? "Saved"
            : "Ready";

  return (
    <div
      className={[
        "editor-page",
        isDark ? "editor-page--dark" : "",
        focusMode ? "editor-page--focus" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <nav className="nav nav--solid">
        <Link to="/" className="logo">
          The Making<span>.</span>Of
        </Link>
        <div className="nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/">Home</Link>
        </div>
      </nav>

      <div className="editor-shell">
        <div className="editor-grid">
          <aside className="editor-sidebar">
            <h3>Workspace</h3>
            <div className="editor-status-row">
              <div className="editor-status-pill">
                <strong>{statusLabel}</strong>
                <span className="editor-muted">Last local save {formatSavedTime(lastSavedAt)}</span>
              </div>
              <div className="editor-status-pill">
                <strong>{serverId ? `Post #${serverId}` : "Unsynced"}</strong>
                <span className="editor-muted">
                  {authorProfile?.username ? `by ${authorProfile.username}` : "local draft only"}
                </span>
              </div>
            </div>

            <div className="editor-toggle-row">
              <div className="editor-toggle">
                <div>
                  <strong>Focus mode</strong>
                  <p className="editor-muted">Hide side panels for distraction-free writing.</p>
                </div>
                <button
                  type="button"
                  className={`editor-switch ${focusMode ? "editor-switch--active" : ""}`}
                  onClick={() => setFocusMode((current) => !current)}
                />
              </div>
              <div className="editor-toggle">
                <div>
                  <strong>Dark mode</strong>
                  <p className="editor-muted">Flip the writing surface for late-night sessions.</p>
                </div>
                <button
                  type="button"
                    className={`editor-switch ${isDark ? "editor-switch--active" : ""}`}
                    onClick={toggleTheme}
                  />
                </div>
              </div>

            <h3>Live stats</h3>
            <div className="editor-stat-grid">
              <div className="editor-stat">
                <strong>{editorState.wordCount}</strong>
                <span>Words</span>
              </div>
              <div className="editor-stat">
                <strong>{editorState.readingMinutes}</strong>
                <span>Minutes</span>
              </div>
              <div className="editor-stat">
                <strong>{editorState.blocks.length}</strong>
                <span>Blocks</span>
              </div>
              <div className="editor-stat">
                <strong>{tags.length || 0}</strong>
                <span>Tags</span>
              </div>
            </div>

            <h3>Publishing notes</h3>
            <ul className="editor-sidebar-list">
              <li>Use `/` to open Notion-style block insertion anywhere in the editor.</li>
              <li>Paste images directly, drag blocks with the side handle, and resize media inline.</li>
              <li>YouTube links pasted into the editor turn into responsive embedded video blocks.</li>
              <li>Autosave stores a recoverable draft locally even when the API is unavailable.</li>
            </ul>
          </aside>

          <section className="editor-column">
            <div className="editor-meta-bar">
              <div>
                <span className="editor-kicker">Notion-style Editor</span>
                <h1>Craft the story.</h1>
                <p>
                  Shape long-form posts with block editing, cover art, inline embeds, real-time preview,
                  and autosave designed for a modern publishing flow.
                </p>
              </div>
              <div className="editor-actions">
                <button type="button" className="editor-button--ghost" onClick={() => handleSubmit(false)}>
                  Save Draft
                </button>
                <button
                  type="button"
                  className="editor-button"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Publishing..." : "Publish Story"}
                </button>
              </div>
            </div>

            <div className="editor-content">
              <div className="editor-panel">
                <div className="editor-cover">
                  {cover.image ? (
                    <img
                      src={cover.image}
                      alt="Post cover"
                      onPointerDown={(event) =>
                        setDragState({
                          startX: event.clientX,
                          startY: event.clientY,
                          initialOffsetX: cover.offsetX,
                          initialOffsetY: cover.offsetY,
                        })
                      }
                      style={{
                        transform: `scale(${cover.zoom}) translate(${cover.offsetX}px, ${cover.offsetY}px)`,
                      }}
                    />
                  ) : (
                    <div className="editor-upload-empty">
                      Upload a cover image to set the tone for the article. You can replace, remove, and drag the
                      crop after upload.
                    </div>
                  )}
                  <div className="editor-cover-overlay">
                    {cover.image ? (
                      <div className="editor-cover-hint">Drag the image to reposition the focal point.</div>
                    ) : (
                      <div />
                    )}
                    <div className="editor-cover-actions">
                      <button
                        type="button"
                        className="editor-button--ghost"
                        onClick={() => coverInputRef.current?.click()}
                      >
                        {cover.image ? "Replace Cover" : "Upload Cover"}
                      </button>
                      {cover.image ? (
                        <button
                          type="button"
                          className="editor-button--ghost"
                          onClick={() => setCover({ image: "", offsetX: 0, offsetY: 0, zoom: 1 })}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {cover.image ? (
                  <div className="editor-cover-slider">
                    <label htmlFor="coverZoom">Cover zoom</label>
                    <input
                      id="coverZoom"
                      type="range"
                      min="1"
                      max="1.6"
                      step="0.01"
                      value={cover.zoom}
                      onChange={(event) =>
                        setCover((current) => ({
                          ...current,
                          zoom: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                ) : null}
              </div>

              <div className="editor-panel">
                <div className="editor-field editor-field--full">
                  <label htmlFor="title">Title</label>
                  <textarea
                    id="title"
                    className="editor-title-input"
                    rows={2}
                    value={form.title}
                    placeholder="Give the post a magnetic title"
                    onChange={(event) => updateForm("title", event.target.value)}
                  />
                </div>

                <div className="editor-field editor-field--full">
                  <label htmlFor="subtitle">Subtitle</label>
                  <textarea
                    id="subtitle"
                    className="editor-subtitle-input"
                    rows={2}
                    value={form.subtitle}
                    placeholder="Add a concise subtitle or standfirst that frames the piece"
                    onChange={(event) => updateForm("subtitle", event.target.value)}
                  />
                </div>

                <div className="editor-meta-grid">
                  <div className="editor-field">
                    <label htmlFor="category">Category</label>
                    <select
                      id="category"
                      value={form.category}
                      onChange={(event) => updateForm("category", event.target.value)}
                    >
                      <option>Product</option>
                      <option>Engineering</option>
                      <option>Design</option>
                      <option>AI</option>
                      <option>Culture</option>
                    </select>
                  </div>

                  <div className="editor-field">
                    <label htmlFor="authorName">Author</label>
                    <input
                      id="authorName"
                      value={form.authorName}
                      placeholder="Author name"
                      onChange={(event) => updateForm("authorName", event.target.value)}
                    />
                  </div>

                  <div className="editor-field editor-field--full">
                    <label htmlFor="description">Description</label>
                    <textarea
                      id="description"
                      rows={3}
                      value={form.description}
                      placeholder="A short description for cards, SEO snippets, and feed previews"
                      onChange={(event) => updateForm("description", event.target.value)}
                    />
                  </div>

                  <div className="editor-field editor-field--full">
                    <label htmlFor="tags">Tags</label>
                    <input
                      id="tags"
                      value={form.tagsInput}
                      placeholder="notion-style, editor, product-design"
                      onChange={(event) => updateForm("tagsInput", event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="editor-panel">
                <h2>Quick insert</h2>
                <div className="editor-toolbar">
                  <button type="button" className="editor-chip" onClick={() => handleToolbarAction("h1")}>
                    H1
                  </button>
                  <button type="button" className="editor-chip" onClick={() => handleToolbarAction("h2")}>
                    H2
                  </button>
                  <button type="button" className="editor-chip" onClick={() => handleToolbarAction("h3")}>
                    H3
                  </button>
                  <button type="button" className="editor-chip" onClick={() => handleToolbarAction("bullet")}>
                    Bullet list
                  </button>
                  <button type="button" className="editor-chip" onClick={() => handleToolbarAction("quote")}>
                    Callout
                  </button>
                  <button type="button" className="editor-chip" onClick={() => handleToolbarAction("code")}>
                    Code block
                  </button>
                  <button type="button" className="editor-chip" onClick={() => handleToolbarAction("image")}>
                    Image
                  </button>
                  <button type="button" className="editor-chip" onClick={() => handleToolbarAction("video")}>
                    YouTube
                  </button>
                </div>

                <div className="editor-workspace">
                  <BlockNoteView
                    editor={editor}
                    theme={isDark ? "dark" : "light"}
                    onChange={() => syncEditorState(editor)}
                    formattingToolbar={false}
                    linkToolbar={false}
                    sideMenu={false}
                  >
                    <FormattingToolbarController />
                    <LinkToolbarController />
                    <SideMenuController />
                    <SuggestionMenuController triggerCharacter="/" getItems={getBlogSlashMenuItems(editor)} />
                  </BlockNoteView>
                </div>
              </div>

              {publishState.message ? (
                <div className="editor-panel">
                  <div className="editor-status-pill">
                    <strong>{publishState.kind || "info"}</strong>
                    <span className="editor-muted">{publishState.message}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <aside className="editor-preview">
            <h3>Live preview</h3>
            <div className="editor-preview-card">
              {cover.image ? (
                <img
                  src={cover.image}
                  alt="Cover preview"
                  style={{
                    transform: `scale(${cover.zoom}) translate(${cover.offsetX}px, ${cover.offsetY}px)`,
                  }}
                />
              ) : null}

              <div className="editor-preview-body">
                <div className="editor-preview-meta">
                  {form.category} {authorProfile?.username ? `• ${authorProfile.username}` : ""}
                </div>
                <h2>{form.title || "Untitled story"}</h2>
                <p>{form.subtitle || form.description || "A subtle subtitle or preview description will appear here."}</p>

                {tags.length > 0 ? (
                  <div className="editor-tag-row">
                    {tags.map((tag) => (
                      <span className="editor-tag" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div
                  className="editor-preview-render"
                  dangerouslySetInnerHTML={{ __html: editorState.html }}
                />
              </div>
            </div>

            <div style={{ height: 18 }} />

            <div className="editor-panel">
              <h2>Scales well with</h2>
              <ul className="editor-sidebar-list">
                <li>Server-side draft persistence keyed by post id and user id.</li>
                <li>S3 or Cloudinary uploads by swapping the local `uploadFile` handler for signed URLs.</li>
                <li>Rendered HTML caching from the stored block JSON for fast public post delivery.</li>
                <li>Realtime collaboration or AI suggestions through BlockNote extensions on the same schema.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <input
        ref={coverInputRef}
        className="editor-hidden-input"
        type="file"
        accept="image/*"
        onChange={handleCoverChange}
      />
      <input
        ref={fileInputRef}
        className="editor-hidden-input"
        type="file"
        accept="image/*"
        onChange={handleInlineImageUpload}
      />
    </div>
  );
}
