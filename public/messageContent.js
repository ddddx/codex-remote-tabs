export function getAttachmentFileName(value) {
  const normalized = String(value || '').replace(/[\\/]+$/, '');
  if (!normalized) {
    return '';
  }
  const parts = normalized.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] || normalized;
}

export function createBuildUploadPreviewUrl(withAuthTokenQuery) {
  return function buildUploadPreviewUrl(fileName) {
    const normalized = getAttachmentFileName(fileName);
    if (!normalized) {
      return '';
    }
    return withAuthTokenQuery(`/api/uploads/${encodeURIComponent(normalized)}`);
  };
}

export function normalizeUserMessageContent(item, helpers = {}) {
  const buildUploadPreviewUrl = helpers.buildUploadPreviewUrl || (() => '');
  const normalized = [];
  const seen = new Set();

  function pushText(text) {
    if (typeof text !== 'string') {
      return;
    }
    const value = text.trim();
    if (!value) {
      return;
    }
    const key = `text:${value}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    normalized.push({ type: 'text', text: value });
  }

  function pushLocalImage(entry) {
    const rawPath = typeof entry === 'string'
      ? entry
      : (entry?.path || entry?.filePath || entry?.filepath || entry?.local_path || entry?.localPath || '');
    const filePath = String(rawPath || '').trim();
    if (!filePath) {
      return;
    }
    const name = String(
      (typeof entry === 'object' && entry)
        ? (entry.name || entry.fileName || getAttachmentFileName(filePath))
        : getAttachmentFileName(filePath)
    ).trim();
    const previewUrl = typeof entry === 'object' && entry
      ? (entry.previewUrl || entry.url || buildUploadPreviewUrl(filePath))
      : buildUploadPreviewUrl(filePath);
    const key = `localImage:${filePath}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    normalized.push({
      type: 'localImage',
      path: filePath,
      name,
      previewUrl,
    });
  }

  function pushRemoteImage(entry) {
    const url = String(
      (typeof entry === 'string' ? entry : (entry?.url || entry?.uri || entry?.src || ''))
    ).trim();
    if (!url) {
      return;
    }
    const name = String(
      (typeof entry === 'object' && entry)
        ? (entry.name || entry.fileName || getAttachmentFileName(url))
        : getAttachmentFileName(url)
    ).trim();
    const key = `image:${url}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    normalized.push({
      type: 'image',
      url,
      name,
    });
  }

  for (const entry of Array.isArray(item?.content) ? item.content : []) {
    if (entry?.type === 'text') {
      pushText(entry.text);
      continue;
    }
    if (entry?.type === 'localImage' || entry?.type === 'local_image') {
      pushLocalImage(entry);
      continue;
    }
    if (entry?.type === 'image') {
      pushRemoteImage(entry);
    }
  }

  for (const entry of Array.isArray(item?.local_images) ? item.local_images : []) {
    pushLocalImage(entry);
  }
  for (const entry of Array.isArray(item?.localImages) ? item.localImages : []) {
    pushLocalImage(entry);
  }
  for (const entry of Array.isArray(item?.images) ? item.images : []) {
    pushRemoteImage(entry);
  }

  return normalized;
}

export function createUserMessageFingerprint(content) {
  const normalized = Array.isArray(content) ? content : [];
  return JSON.stringify(normalized.map((entry) => {
    if (entry.type === 'text') {
      return { type: 'text', text: entry.text || '' };
    }
    if (entry.type === 'localImage') {
      return { type: 'localImage', path: entry.path || '' };
    }
    if (entry.type === 'image') {
      return { type: 'image', url: entry.url || '' };
    }
    return { type: entry.type || 'unknown' };
  }));
}

export function buildComposerMessageContent(text, attachments, helpers = {}) {
  const buildUploadPreviewUrl = helpers.buildUploadPreviewUrl || (() => '');
  const content = [];
  if (text) {
    content.push({ type: 'text', text });
  }
  for (const attachment of attachments) {
    content.push({
      type: 'localImage',
      path: attachment.path,
      name: attachment.name || getAttachmentFileName(attachment.path),
      previewUrl: attachment.previewUrl || buildUploadPreviewUrl(attachment.path),
    });
  }
  return content;
}

export function renderMarkdown(text) {
  if (!text) {
    return '';
  }

  let html = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  html = html.replace(/\n/g, '<br>');

  if (window.DOMPurify) {
    return window.DOMPurify.sanitize(html);
  }
  return html;
}
