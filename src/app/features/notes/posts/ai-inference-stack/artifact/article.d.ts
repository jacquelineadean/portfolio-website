/**
 * Builds the article's figures and wires its rack, tabs and labs inside `root`,
 * which must already hold article.html. Returns a teardown that removes the
 * window listeners, timers and animation frames it started.
 */
export declare function mountArticle(root: ShadowRoot): () => void;
