import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MetadataHead from '../shared/MetadataHead.js';

export function withDocumentMetadata(html, metadata) {
  const head = renderToStaticMarkup(createElement(MetadataHead, { metadata }));
  return html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, '')
    .replace(/<meta\b(?=[^>]*\bname\s*=\s*["'](?:description|robots)["'])[^>]*>/gi, '')
    .replace('</head>', `${head}</head>`);
}
