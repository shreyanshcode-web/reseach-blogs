import React from "react";
import { getYoutubeEmbedUrl } from "./blogEditorSchema";

/**
 * Renders inline rich text spans (bold, italic, links, etc.)
 */
const InlineText = ({ content }) => {
  if (!content || !Array.isArray(content)) return null;

  return content.map((span, index) => {
    let element = <span key={index}>{span.text}</span>;

    if (span.styles) {
      if (span.styles.bold) element = <strong key={index}>{element}</strong>;
      if (span.styles.italic) element = <em key={index}>{element}</em>;
      if (span.styles.underline) element = <u key={index}>{element}</u>;
      if (span.styles.strikethrough) element = <s key={index}>{element}</s>;
      if (span.styles.code) element = <code key={index} className="ed-code-inline">{element}</code>;
    }

    if (span.type === "link" && span.href) {
      element = (
        <a key={index} href={span.href} target="_blank" rel="noopener noreferrer" className="ed-link">
          {element}
        </a>
      );
    }

    return element;
  });
};

/**
 * Renders individual blocks based on their type
 */
const Block = ({ block }) => {
  const { type, props, content, children } = block;

  const renderChildren = () => {
    if (!children || children.length === 0) return null;
    return (
      <div className="ed-block-children">
        {children.map((child) => (
          <Block key={child.id} block={child} />
        ))}
      </div>
    );
  };

  const textAlign = props?.textAlignment || "left";
  const style = { textAlign };

  switch (type) {
    case "paragraph":
      return (
        <div className="ed-block ed-paragraph" style={style}>
          <p><InlineText content={content} /></p>
          {renderChildren()}
        </div>
      );

    case "heading":
      const Level = `h${Math.min(Math.max(props.level || 1, 1), 3)}`;
      return (
        <div className="ed-block ed-heading" style={style}>
          <Level><InlineText content={content} /></Level>
          {renderChildren()}
        </div>
      );

    case "bulletListItem":
      return (
        <div className="ed-block ed-list-item ed-bullet-list" style={style}>
          <li><InlineText content={content} /></li>
          {renderChildren()}
        </div>
      );

    case "numberedListItem":
      return (
        <div className="ed-block ed-list-item ed-numbered-list" style={style}>
          <li><InlineText content={content} /></li>
          {renderChildren()}
        </div>
      );

    case "blockquote":
      return (
        <div className="ed-block ed-blockquote" style={style}>
          <InlineText content={content} />
          {renderChildren()}
        </div>
      );

    case "image":
      return (
        <figure className="ed-block ed-image-block" style={style}>
          <img src={props.url} alt={props.caption || "Blog image"} loading="lazy" />
          {props.caption && <figcaption>{props.caption}</figcaption>}
          {renderChildren()}
        </figure>
      );

    case "youtube":
      const embedUrl = getYoutubeEmbedUrl(props.url);
      return (
        <figure className="ed-block ed-youtube-block" style={style}>
          {embedUrl ? (
            <div className="ed-video-container">
              <iframe
                src={embedUrl}
                title={props.caption || "YouTube video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}
          {props.caption && <figcaption>{props.caption}</figcaption>}
          {renderChildren()}
        </figure>
      );

    case "codeBlock":
      return (
          <div className="ed-block ed-code-block" style={style}>
              <pre><code><InlineText content={content} /></code></pre>
              {renderChildren()}
          </div>
      )

    default:
      // Fallback for unknown types
      return (
        <div className="ed-block ed-unknown" style={style}>
          <InlineText content={content} />
          {renderChildren()}
        </div>
      );
  }
};

/**
 * Main Renderer Component
 */
export default function PostContentRenderer({ content }) {
  if (!content) return null;

  let parsedContent = content;
  
  // Safety check: if content is stringified JSON, parse it
  if (typeof content === "string") {
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      // If it's not JSON, it's likely already the plain text fallback
      return <div className="ed-block ed-paragraph"><p>{content}</p></div>;
    }
  }

  // Extract blocks from content. BlockNote content usually looks like { blocks: [...] } or just an array
  const blocks = Array.isArray(parsedContent) ? parsedContent : (parsedContent.blocks || []);

  if (!blocks || blocks.length === 0) {
      return <p className="ed-copy ed-muted">No content available.</p>;
  }

  return (
    <div className="ed-content-renderer">
      {blocks.map((block) => (
        <Block key={block.id} block={block} />
      ))}
    </div>
  );
}
