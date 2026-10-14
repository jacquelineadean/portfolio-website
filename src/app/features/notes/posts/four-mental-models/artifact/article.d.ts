/**
 * Builds the article's figures and wires its controls inside `root`, which must
 * already hold article.html. Returns a teardown that removes the window
 * listeners, timers and observers it started.
 */
export declare function mountArticle(root: ShadowRoot): () => void;
