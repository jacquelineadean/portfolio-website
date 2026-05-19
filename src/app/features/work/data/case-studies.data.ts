import { CaseStudy } from '../../../core/models/case-study.model';

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'legacy-accessories-platform',
    title: 'Modernizing a Legacy Accessories Platform',
    subtitle:
      'Re-architecting a business-critical CMS platform into modular Spring Boot microservices.',
    tags: ['Spring Boot', 'PostgreSQL', 'Angular', 'REST APIs', 'Microservices'],
    sections: [
      {
        title: 'Context',
        content: [
          'A business-critical accessories platform relied on aging CMS infrastructure with unsupported dependencies, tight coupling, and limited scalability. The system supported high-volume product search, reporting, and internal workflows — but had become increasingly difficult to maintain and extend.',
        ],
      },
      {
        title: 'Goal',
        content: [
          'Eliminate unsupported dependencies and reduce operational risk.',
          'Improve maintainability and deployment reliability.',
          'Enable future feature development without increasing system fragility.',
        ],
      },
      {
        title: 'System Design',
        content: [
          'Re-architected core functionality into Spring Boot microservices with clear domain boundaries.',
          'Designed REST APIs to support search, reporting, and user workflows with standardized payloads.',
          'Migrated data access patterns to PostgreSQL, replacing legacy file-based storage.',
          'Integrated Angular frontend with backend services through well-defined API contracts.',
        ],
      },
      {
        title: 'Technical Decisions & Tradeoffs',
        content: [
          'Chose incremental service extraction over a full rewrite to reduce risk and preserve business continuity during migration.',
          'Adopted an API-first design to establish clear service contracts, decoupling frontend and backend evolution.',
          'Developed a careful data migration strategy that preserved historical reporting accuracy while transitioning away from legacy storage.',
        ],
      },
      {
        title: 'Ownership',
        content: [
          'Implemented backend services for product detail search and part search functionality.',
          'Designed and built the Archived Sales Reports feature end-to-end: backend APIs, frontend UI, and legacy data migration.',
          'Implemented Contact Us workflow: custom database schema, backend logic, and secure SMTP email notifications.',
          'Ensured all implementations aligned with enterprise standards for security, testing, and maintainability.',
        ],
      },
      {
        title: 'Impact',
        content: [
          'Removed reliance on unsupported legacy platforms.',
          'Improved system reliability and deployment confidence.',
          'Enabled faster feature development through modular service boundaries.',
          'Preserved historical business data without regressions.',
        ],
      },
    ],
  },
  {
    slug: 'user-package-management',
    title: 'Consolidating User & Package Management',
    subtitle:
      'Unifying duplicated user and package logic across multiple applications into a single backend system.',
    tags: ['Backend', 'API Design', 'Authorization', 'Migration'],
    sections: [
      {
        title: 'Context',
        content: [
          'Multiple applications maintained overlapping user and package management logic, resulting in duplicated code, inconsistent behavior, and increased operational overhead. Each application handled user lifecycle and package management slightly differently, making maintenance costly and error-prone.',
        ],
      },
      {
        title: 'Goal',
        content: [
          'Consolidate user and package management into a single backend system.',
          'Establish consistent authorization and lifecycle management.',
          'Reduce duplication across consuming applications.',
        ],
      },
      {
        title: 'System Design',
        content: [
          'Centralized backend services for user management and package management into a unified API layer.',
          'Designed APIs to support multiple consuming applications with consistent contracts.',
          'Aligned permission models with enterprise access control standards.',
        ],
      },
      {
        title: 'Ownership',
        content: [
          'Backend development for consolidated user and package management services.',
          'API contract definition to support multiple client applications.',
          'Ensured backward compatibility during migration to minimize disruption.',
        ],
      },
      {
        title: 'Impact',
        content: [
          'Reduced duplicated logic across platforms.',
          'Improved consistency in user and package lifecycle behavior.',
          'Simplified future enhancements and reduced maintenance burden.',
        ],
      },
    ],
  },
];
