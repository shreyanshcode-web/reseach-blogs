import React from "react";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core";
import {
  BlockContentWrapper,
  createReactBlockSpec,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";

const YOUTUBE_MATCHERS = [
  /(?:youtube\.com\/watch\?v=)([\w-]{6,})/i,
  /(?:youtu\.be\/)([\w-]{6,})/i,
  /(?:youtube\.com\/embed\/)([\w-]{6,})/i,
  /(?:youtube\.com\/shorts\/)([\w-]{6,})/i,
];

export function getYoutubeEmbedUrl(url) {
  if (!url) {
    return "";
  }

  for (const matcher of YOUTUBE_MATCHERS) {
    const match = url.match(matcher);
    if (match?.[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }

  return "";
}

export function isYoutubeUrl(url) {
  return Boolean(getYoutubeEmbedUrl(url));
}

const youtubeBlockConfig = {
  type: "youtube",
  propSchema: {
    url: {
      default: "",
    },
    caption: {
      default: "",
    },
    textAlignment: {
      default: "center",
      values: ["left", "center", "right", "justify"],
    },
  },
  content: "none",
};

const youtubeBlock = createReactBlockSpec(
  youtubeBlockConfig,
  {
    render: ({ block }) => {
      const embedUrl = getYoutubeEmbedUrl(block.props.url);

      return (
        <BlockContentWrapper
          blockType={block.type}
          blockProps={block.props}
          propSchema={youtubeBlockConfig.propSchema}
        >
          <figure className="blog-youtube-block" data-youtube-url={block.props.url}>
            {embedUrl ? (
              <div className="blog-youtube-frame">
                <iframe
                  src={embedUrl}
                  title={block.props.caption || "Embedded YouTube video"}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="blog-youtube-empty">
                Paste a valid YouTube link to preview the embed.
              </div>
            )}
            {block.props.caption ? (
              <figcaption>{block.props.caption}</figcaption>
            ) : null}
          </figure>
        </BlockContentWrapper>
      );
    },
    toExternalHTML: ({ block }) => {
      const embedUrl = getYoutubeEmbedUrl(block.props.url);

      return (
        <figure className="blog-youtube-block" data-youtube-url={block.props.url}>
          {embedUrl ? (
            <div className="blog-youtube-frame">
              <iframe
                src={embedUrl}
                title={block.props.caption || "Embedded YouTube video"}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : null}
          {block.props.caption ? <figcaption>{block.props.caption}</figcaption> : null}
        </figure>
      );
    },
    parse: (element) => {
      const url = element.getAttribute("data-youtube-url");
      if (!url) {
        return undefined;
      }

      return {
        url,
        caption: element.querySelector("figcaption")?.textContent || "",
      };
    },
  },
);

export const blogEditorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    youtube: youtubeBlock(),
  },
});

export function insertYoutubeBlock(editor, url, caption = "") {
  const embedUrl = getYoutubeEmbedUrl(url);
  if (!embedUrl) {
    return false;
  }

  insertOrUpdateBlockForSlashMenu(editor, {
    type: "youtube",
    props: {
      url,
      caption,
    },
  });

  return true;
}

export function getBlogSlashMenuItems(editor) {
  const defaultItems = getDefaultReactSlashMenuItems(editor);
  const customItems = [
    {
      title: "Callout Quote",
      subtext: "Insert a highlighted quote or note block",
      aliases: ["callout", "quote", "note"],
      group: "Basic blocks",
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: "quote",
          content: "A pull quote, insight, or callout lives nicely here.",
        });
      },
    },
    {
      title: "YouTube Embed",
      subtext: "Paste a YouTube link and render it inline",
      aliases: ["youtube", "video", "embed"],
      group: "Media",
      onItemClick: () => {
        const url = window.prompt("Paste a YouTube link");
        if (!url) {
          return;
        }

        insertYoutubeBlock(editor, url, "Embedded from YouTube");
      },
    },
  ];

  return async (query) => {
    return filterSuggestionItems([...customItems, ...defaultItems], query);
  };
}
