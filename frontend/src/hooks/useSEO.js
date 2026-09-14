import { useEffect } from 'react';

// Dependency-free per-page SEO: sets document.title, meta description, and
// canonical URL on mount, and restores the site defaults on unmount.
// (No react-helmet-async — this SPA is client-rendered, so these tags help
// the browser tab/bookmark/history and search engines that execute JS when
// crawling, but won't appear in link-preview scrapers that don't run JS —
// see the SEO section of the README for what that means in practice and how
// to get real previews if you need them.)
export const useSEO = ({ title, description, jsonLd } = {}) => {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) document.title = title;

    let descTag = document.querySelector('meta[name="description"]');
    const previousDescription = descTag?.getAttribute('content');
    if (description && descTag) {
      descTag.setAttribute('content', description);
    }

    let jsonLdTag;
    if (jsonLd) {
      jsonLdTag = document.createElement('script');
      jsonLdTag.type = 'application/ld+json';
      jsonLdTag.text = JSON.stringify(jsonLd);
      jsonLdTag.setAttribute('data-page-seo', 'true');
      document.head.appendChild(jsonLdTag);
    }

    return () => {
      document.title = previousTitle;
      if (descTag && previousDescription !== undefined) {
        descTag.setAttribute('content', previousDescription);
      }
      if (jsonLdTag) jsonLdTag.remove();
    };
  }, [title, description, jsonLd]);
};

export default useSEO;
