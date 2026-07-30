import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
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
import { API_BASE, clearAuthToken, getAuthToken, setAuthToken } from "../lib/api";
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

function getDraftKey(draftId) {
  return draftId ? `${DRAFT_KEY}-${draftId}` : DRAFT_KEY;
}

function loadDraft(draftId = null) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(getDraftKey(draftId));
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
  const { postId } = useParams();
  const navigate = useNavigate();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const draftId = postId || null;
  const initialDraftRef = useRef(loadDraft(draftId));
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
  const [serverId, setServerId] = useState(
    postId && Number.isFinite(Number(postId)) ? Number(postId) : initialDraftRef.current?.serverId || null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [authorProfile, setAuthorProfile] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [postLoadError, setPostLoadError] = useState("");
  const [isLoadingPost, setIsLoadingPost] = useState(Boolean(postId));
  const [hasLoadedPost, setHasLoadedPost] = useState(false);

  async function getEditorToken() {
    if (isLoaded && isSignedIn) {
      try {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
          return token;
        }
      } catch {
        // Fall back to stored token only if Clerk was not able to provide a fresh one.
      }
    }

    const storedToken = getAuthToken();
    return storedToken || "";
  }

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

  function restoreEditorContent(blocks) {
    if (!editor || !Array.isArray(blocks) || blocks.length === 0) {
      return;
    }

    editor.replaceBlocks(editor.document, blocks);
    syncEditorState(editor);
  }

  function buildFormStateFromContent(content) {
    const metadata = content?.metadata || {};

    return {
      title: metadata.title || "",
      subtitle: metadata.subtitle || "",
      description: metadata.description || "",
      category: metadata.category || "Product",
      tagsInput: Array.isArray(metadata.tags) ? metadata.tags.join(", ") : "",
      authorName: metadata.author || "",
    };
  }

  function buildCoverStateFromContent(content) {
    const coverImage = content?.metadata?.coverImage;
    return {
      image: coverImage?.url || "",
      offsetX: coverImage?.positionX || 0,
      offsetY: coverImage?.positionY || 0,
      zoom: coverImage?.zoom || 1,
    };
  }

  useEffect(() => {
    syncEditorState(editor);
  }, [editor]);

  useEffect(() => {
    if (!postId || initialDraftRef.current || hasLoadedPost) {
      return;
    }

    const parsedPostId = Number(postId);
    if (!Number.isFinite(parsedPostId) || parsedPostId <= 0) {
      setPostLoadError("Invalid post identifier.");
      setIsLoadingPost(false);
      return;
    }

    async function fetchPost() {
      setIsLoadingPost(true);
      setPostLoadError("");

      const token = await getEditorToken();
      if (!token) {
        setPostLoadError("Sign in to load this post for editing.");
        setIsLoadingPost(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/posts/${parsedPostId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const detail = body?.detail || response.statusText || "Unable to load the post.";
          throw new Error(detail);
        }

        const post = await response.json();
        const content = post.content || {};
        const blocks = Array.isArray(content.blocks) ? content.blocks : DEFAULT_BLOCKS;

        setForm((current) => ({
          ...current,
          title: post.title || current.title,
          subtitle: content?.metadata?.subtitle || current.subtitle,
          description: content?.metadata?.description || current.description,
          category: content?.metadata?.category || current.category,
          tagsInput: Array.isArray(content?.metadata?.tags) ? content.metadata.tags.join(", ") : current.tagsInput,
          authorName: content?.metadata?.author || current.authorName,
        }));

        setCover(buildCoverStateFromContent(content));
        setServerId(parsedPostId);
        restoreEditorContent(blocks);
        setSaveState("saved");
        setLastSavedAt(post.updated_at || new Date().toISOString());
        setPublishState({ kind: "info", message: "Draft loaded for editing." });
        setHasLoadedPost(true);
      } catch (error) {
        setPostLoadError(error.message || "Unable to load this post.");
      } finally {
        setIsLoadingPost(false);
      }
    }

    fetchPost();
  }, [editor, postId, hasLoadedPost, isLoaded, isSignedIn]);

  useEffect(() => {
    let isMounted = true;

    async function loadAuthorProfile() {
      const token = await getEditorToken();
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
          if (!isMounted || !data) {
            return;
          }

          setAuthorProfile(data);
          setForm((current) => ({
            ...current,
            authorName: current.authorName || data.username || "",
          }));
        })
        .catch(() => {});
    }

    loadAuthorProfile();

    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn]);

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

      window.localStorage.setItem(getDraftKey(serverId), JSON.stringify(storedDraft));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [form, editorState, cover, serverId]);

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
    const token = await getEditorToken();

    if (!token) {
      setPublishState({
        kind: "info",
        message: published
          ? "Please sign in to publish your post. Draft saved locally."
          : "Draft stored locally. Sign in to sync it with the backend.",
      });
      return null;
    }

    const payload = buildPostPayload({ form, editorState, cover, serverId });

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
      
      // If credentials are invalid, clear the token and suggest signing in
      if (response.status === 401 && detail.includes("credentials")) {
        clearAuthToken();
        setPublishState({
          kind: "error",
          message: "Your session has expired. Please sign in again to publish.",
        });
        return null;
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
        window.localStorage.removeItem(getDraftKey(null));
      }

      if (published && result?.id) {
        window.localStorage.removeItem(getDraftKey(result.id));
        setPublishState({
          kind: "success",
          message: "Story published successfully and removed from local drafts.",
        });
        navigate(`/post/${result.id}`);
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
    <div className={`editor-page${isDark ? " editor-page--dark" : ""}${focusMode ? " editor-page--focus" : ""}`}>
      <input ref={fileInputRef} type="file" accept="image/*" className="editor-hidden-input" onChange={handleInlineImageUpload} />
      <input ref={coverInputRef} type="file" accept="image/*" className="editor-hidden-input" onChange={handleCoverChange} />

      <div className="editor-shell">
        <div className="editor-grid">
          <main className="editor-column">
            <div className="editor-meta-bar">
              <div>
                <span className="editor-kicker">{serverId ? "Edit Story" : "New Story"}</span>
                <h1>{form.title.trim() || "Shape your next blog post"}</h1>
                <p>
                  Build, revise, and publish from one place. This editor now supports local draft recovery, backend sync,
                  cover image framing, and live post publishing.
                </p>
              </div>

              <div className="editor-actions">
                <button type="button" className="editor-button--ghost" onClick={() => setFocusMode((current) => !current)}>
                  {focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
                </button>
                <button type="button" className="editor-button--ghost" onClick={toggleTheme}>
                  {isDark ? "Light Surface" : "Dark Surface"}
                </button>
                <button type="button" className="editor-button--ghost" disabled={isSubmitting} onClick={() => handleSubmit(false)}>
                  Save Draft
                </button>
                <button type="button" className="editor-button" disabled={isSubmitting} onClick={() => handleSubmit(true)}>
                  {isSubmitting ? "Publishing..." : "Publish Story"}
                </button>
              </div>
            </div>

            <div className="editor-content">
              {postLoadError ? <div className="editor-panel">{postLoadError}</div> : null}
              {publishState.message ? (
                <div className="editor-panel" style={{ borderColor: publishState.kind === "error" ? "rgba(185, 28, 28, 0.32)" : undefined }}>
                  {publishState.message}
                </div>
              ) : null}

              <section className="editor-panel">
                <h2>Story Setup</h2>
                <div className="editor-cover">
                  {cover.image ? (
                    <img
                      src={cover.image}
                      alt="Cover preview"
                      style={{
                        transform: `translate(${cover.offsetX}px, ${cover.offsetY}px) scale(${cover.zoom})`,
                      }}
                      onPointerDown={(event) =>
                        setDragState({
                          startX: event.clientX,
                          startY: event.clientY,
                          initialOffsetX: cover.offsetX,
                          initialOffsetY: cover.offsetY,
                        })
                      }
                    />
                  ) : (
                    <div className="editor-upload-empty">
                      Add a cover image so the post feels complete in feeds, previews, and profile listings.
                    </div>
                  )}

                  <div className="editor-cover-overlay">
                    <div className="editor-cover-hint">
                      {cover.image ? "Drag the image to reposition it inside the frame." : "Upload a wide image for the cleanest crop."}
                    </div>
                    <div className="editor-cover-actions">
                      <button type="button" className="editor-button--ghost" onClick={() => coverInputRef.current?.click()}>
                        {cover.image ? "Replace Cover" : "Upload Cover"}
                      </button>
                      {cover.image ? (
                        <button
                          type="button"
                          className="editor-button--ghost"
                          onClick={() => setCover({ image: "", offsetX: 0, offsetY: 0, zoom: 1 })}
                        >
                          Remove Cover
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="editor-cover-slider">
                  <label htmlFor="cover-zoom">Cover Zoom</label>
                  <input
                    id="cover-zoom"
                    type="range"
                    min="1"
                    max="1.8"
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

                <div className="editor-meta-grid" style={{ marginTop: 20 }}>
                  <div className="editor-field editor-field--full">
                    <label htmlFor="story-title">Title</label>
                    <textarea
                      id="story-title"
                      className="editor-title-input"
                      rows={2}
                      value={form.title}
                      onChange={(event) => updateForm("title", event.target.value)}
                      placeholder="Write the headline readers will remember"
                    />
                  </div>

                  <div className="editor-field editor-field--full">
                    <label htmlFor="story-subtitle">Subtitle</label>
                    <textarea
                      id="story-subtitle"
                      className="editor-subtitle-input"
                      rows={3}
                      value={form.subtitle}
                      onChange={(event) => updateForm("subtitle", event.target.value)}
                      placeholder="Summarize the angle, stakes, or takeaway in one sharp sentence."
                    />
                  </div>

                  <div className="editor-field editor-field--full">
                    <label htmlFor="story-description">Description</label>
                    <textarea
                      id="story-description"
                      rows={4}
                      value={form.description}
                      onChange={(event) => updateForm("description", event.target.value)}
                      placeholder="Short summary for previews, search, and SEO."
                    />
                  </div>

                  <div className="editor-field">
                    <label htmlFor="story-category">Category</label>
                    <select id="story-category" value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
                      {["Product", "Engineering", "Design", "Culture", "Story", "Tutorial", "Opinion"].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="editor-field">
                    <label htmlFor="story-author">Author Name</label>
                    <input
                      id="story-author"
                      value={form.authorName}
                      onChange={(event) => updateForm("authorName", event.target.value)}
                      placeholder={authorProfile?.username || "Author name"}
                    />
                  </div>

                  <div className="editor-field editor-field--full">
                    <label htmlFor="story-tags">Tags</label>
                    <input
                      id="story-tags"
                      value={form.tagsInput}
                      onChange={(event) => updateForm("tagsInput", event.target.value)}
                      placeholder="react, writing, product, backend"
                    />
                  </div>
                </div>
              </section>

              <section className="editor-panel">
                <h2>Writing Workspace</h2>
                <div className="editor-toolbar">
                  {[
                    ["h1", "H1"],
                    ["h2", "H2"],
                    ["h3", "H3"],
                    ["quote", "Quote"],
                    ["code", "Code"],
                    ["bullet", "List"],
                    ["image", "Image"],
                    ["video", "YouTube"],
                  ].map(([action, label]) => (
                    <button key={action} type="button" className="editor-chip" onClick={() => handleToolbarAction(action)}>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="editor-workspace">
                  <BlockNoteView
                    editor={editor}
                    slashMenu={false}
                    onChange={() => syncEditorState(editor)}
                  >
                    <FormattingToolbarController />
                    <LinkToolbarController />
                    <SideMenuController />
                    <SuggestionMenuController triggerCharacter="/" getItems={async (query) => getBlogSlashMenuItems(editor, query)} />
                  </BlockNoteView>
                </div>
              </section>
            </div>
          </main>

          <aside className="editor-sidebar">
            <h3>Publishing Status</h3>
            <div className="editor-status-row">
              <div className="editor-status-pill">
                <strong>{statusLabel}</strong>
                <span className="editor-muted">Last saved: {formatSavedTime(lastSavedAt)}</span>
              </div>
              <div className="editor-status-pill">
                <strong>{serverId ? `Server ID #${serverId}` : "Local draft only"}</strong>
                <span className="editor-muted">
                  {serverId ? "This story is connected to the backend." : "Sign in and save to sync it to the API."}
                </span>
              </div>
            </div>

            <div className="editor-toggle-row" style={{ marginTop: 20 }}>
              <div className="editor-toggle">
                <div>
                  <strong>Focus mode</strong>
                  <div className="editor-muted">Hide the side rails while you write.</div>
                </div>
                <button
                  type="button"
                  className={`editor-switch${focusMode ? " editor-switch--active" : ""}`}
                  onClick={() => setFocusMode((current) => !current)}
                  aria-label="Toggle focus mode"
                />
              </div>
              <div className="editor-toggle">
                <div>
                  <strong>Theme</strong>
                  <div className="editor-muted">{isDark ? "Dark editing surface is active." : "Light editing surface is active."}</div>
                </div>
                <button
                  type="button"
                  className={`editor-switch${isDark ? " editor-switch--active" : ""}`}
                  onClick={toggleTheme}
                  aria-label="Toggle editor theme"
                />
              </div>
            </div>

            <div className="editor-stat-grid" style={{ marginTop: 20 }}>
              <div className="editor-stat">
                <strong>{editorState.wordCount}</strong>
                <span>Words</span>
              </div>
              <div className="editor-stat">
                <strong>{editorState.readingMinutes}</strong>
                <span>Read time</span>
              </div>
              <div className="editor-stat">
                <strong>{tags.length}</strong>
                <span>Tags</span>
              </div>
              <div className="editor-stat">
                <strong>{cover.image ? "Yes" : "No"}</strong>
                <span>Cover set</span>
              </div>
            </div>

            <ul className="editor-sidebar-list" style={{ marginTop: 20, paddingLeft: 0 }}>
              <li>Autosave writes to local storage while you work so accidental refreshes do not wipe your progress.</li>
              <li>Save Draft syncs to the backend without publishing, which makes it appear in your draft shelf.</li>
              <li>Publish Story sends the post live so it can appear in feeds, profile pages, and dashboards.</li>
            </ul>

            {serverId ? (
              <div className="editor-status-row" style={{ marginTop: 20 }}>
                <Link to={`/post/${serverId}`} className="editor-button--ghost">
                  Open Published View
                </Link>
              </div>
            ) : null}
          </aside>

          <aside className="editor-preview">
            <h3>Live Preview</h3>
            <div className="editor-preview-card">
              {cover.image ? <img src={cover.image} alt="Story cover preview" /> : null}
              <div className="editor-preview-body">
                <div className="editor-preview-meta">
                  {form.category} {form.authorName ? `· ${form.authorName}` : ""}
                </div>
                <h2>{form.title.trim() || "Your headline appears here"}</h2>
                <p>{form.subtitle.trim() || form.description.trim() || "Your subtitle and summary will appear here as you write."}</p>
                {tags.length ? (
                  <div className="editor-tag-row">
                    {tags.slice(0, 6).map((tag) => (
                      <span key={tag} className="editor-tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div
                  className="editor-preview-render"
                  dangerouslySetInnerHTML={{
                    __html:
                      editorState.html && editorState.html !== "<p></p>"
                        ? editorState.html
                        : "<p>Start writing in the editor and your live preview will appear here.</p>",
                  }}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
