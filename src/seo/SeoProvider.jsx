import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import MetadataHead from '../../shared/MetadataHead.js';
import { publicPageMetadata, routeMetadata } from '../../shared/seo.js';
import { publicUsername } from '../../shared/publicRoutes.js';

const PublishMetadata = createContext(null);

export default function SeoProvider({ children }) {
  const location = useLocation();
  const [published, setPublished] = useState(() => {
    try {
      const element = document.getElementById('codefolio-public-data');
      const initial = element ? JSON.parse(element.textContent) : null;
      if (
        initial &&
        [200, 404, 503].includes(initial.status) &&
        initial.username === publicUsername(location.pathname.slice(1))
      ) {
        return {
          pathname: location.pathname,
          key: location.key,
          metadata: publicPageMetadata(initial),
        };
      }
    } catch {
      /* Fall back to route metadata if the document has no usable bootstrap. */
    }
    return null;
  });
  const metadata =
    published?.key === location.key && published?.pathname === location.pathname
      ? published.metadata
      : routeMetadata(location.pathname);
  return (
    <HelmetProvider>
      <PublishMetadata.Provider value={setPublished}>
        <MetadataHead metadata={metadata} />
        {children}
      </PublishMetadata.Provider>
    </HelmetProvider>
  );
}

export function usePublicPageMetadata(result) {
  const publish = useContext(PublishMetadata);
  const { pathname, key } = useLocation();
  useEffect(() => {
    publish({ pathname, key, metadata: publicPageMetadata(result) });
  }, [publish, pathname, key, result]);
}
