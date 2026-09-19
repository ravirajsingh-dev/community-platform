import { useContext, useEffect, useRef } from "react";
import { UNSAFE_NavigationContext } from "react-router-dom";

/**
 * Blocks in-app navigation when shouldBlock is true (works with BrowserRouter).
 * onBlock receives proceed() to call after the user confirms leaving.
 */
export function useBrowserNavigationBlocker(shouldBlock, onBlock) {
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const onBlockRef = useRef(onBlock);
  onBlockRef.current = onBlock;

  useEffect(() => {
    if (!shouldBlock) return undefined;

    const originalPush = navigator.push;
    const originalReplace = navigator.replace;

    navigator.push = (...args) => {
      onBlockRef.current(() => originalPush.apply(navigator, args));
    };
    navigator.replace = (...args) => {
      onBlockRef.current(() => originalReplace.apply(navigator, args));
    };

    return () => {
      navigator.push = originalPush;
      navigator.replace = originalReplace;
    };
  }, [navigator, shouldBlock]);
}
