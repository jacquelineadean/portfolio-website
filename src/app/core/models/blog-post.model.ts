export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  readingTime: number;
  published: boolean;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}
