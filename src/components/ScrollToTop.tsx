import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls the window (and any scrollable main region) to the top on every route change. */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
  return null;
};

export default ScrollToTop;
