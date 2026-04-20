function walkText(value, output) {
  if (typeof value === "string") {
    output.push(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => walkText(item, output));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  if (typeof value.text === "string") {
    output.push(value.text);
  }

  if (typeof value.caption === "string") {
    output.push(value.caption);
  }

  // Only walk into keys that contain user-generated content
  const contentKeys = ["content", "children"];
  contentKeys.forEach((key) => {
    if (value[key]) {
      walkText(value[key], output);
    }
  });
}

function findImageUrl(value) {
  if (!value || typeof value !== "object") {
    return "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findImageUrl(item);
      if (url) {
        return url;
      }
    }
    return "";
  }

  if (value.type === "image" && value.props?.url) {
    return value.props.url;
  }

  if (value.metadata?.coverImage?.url) {
    return value.metadata.coverImage.url;
  }

  for (const item of Object.values(value)) {
    const url = findImageUrl(item);
    if (url) {
      return url;
    }
  }

  return "";
}

export function getPostPlainText(content) {
  const output = [];
  walkText(content, output);
  return output.join(" ").replace(/\s+/g, " ").trim();
}

export function getPostExcerpt(post, maxLength = 160) {
  const description = post?.content?.metadata?.description || post?.description || "";
  const text = description || getPostPlainText(post?.content);
  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

export function getPostCoverImage(post) {
  return post?.content?.metadata?.coverImage?.url || findImageUrl(post?.content) || "";
}

export function normalizePost(post) {
  return {
    ...post,
    plainText: getPostPlainText(post?.content),
    excerpt: getPostExcerpt(post),
    coverImage: getPostCoverImage(post),
    category: post?.content?.metadata?.category || "Story",
    tags: post?.content?.metadata?.tags || [],
    subtitle: post?.content?.metadata?.subtitle || "",
  };
}

export function normalizePosts(posts) {
  return Array.isArray(posts) ? posts.map(normalizePost) : [];
}
