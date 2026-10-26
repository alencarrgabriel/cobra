export const THEME_KEY = "cobra-theme";

/**
 * Inline, synchronous script for <head>: applies the saved theme before the first paint.
 * Without a saved choice it does nothing and CSS follows `prefers-color-scheme`.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t;}catch(e){}})();`;
