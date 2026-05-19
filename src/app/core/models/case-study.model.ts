export interface CaseStudySection {
  title: string;
  content: string[];
}

export interface CaseStudy {
  slug: string;
  title: string;
  subtitle: string;
  tags: string[];
  sections: CaseStudySection[];
}
