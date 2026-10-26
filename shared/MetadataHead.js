import { createElement } from 'react';
import { Helmet } from 'react-helmet-async';

// One shared Helmet component for the initial server document and the client head.
export default function MetadataHead({ metadata }) {
  const owned = { 'data-codefolio-seo': 'true' };
  return createElement(
    Helmet,
    null,
    createElement('title', owned, metadata.title),
    createElement('meta', { ...owned, name: 'description', content: metadata.description }),
    createElement('meta', { ...owned, name: 'robots', content: metadata.robots }),
  );
}
