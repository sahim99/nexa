export const CORE_SKILL_TAXONOMY: string[] = [
  // Languages
  'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'Kotlin', 'Swift', 'C++', 'C#', 'PHP', 'Ruby', 'Scala', 'Elixir', 'Dart', 'SQL', 'HTML', 'CSS', 'Bash', 'Shell',
  
  // Frontend
  'React.js', 'React', 'Next.js', 'Vue.js', 'Vue', 'Angular', 'Svelte', 'TailwindCSS', 'Redux', 'Zustand', 'React Native', 'Flutter', 'Webpack', 'Vite', 'GraphQL',
  
  // Backend & APIs
  'Node.js', 'NodeJS', 'NestJS', 'Express.js', 'Express', 'FastAPI', 'Django', 'Flask', 'Spring Boot', 'Gin', 'gRPC', 'REST API', 'WebSockets', 'TRPC',
  
  // Databases & Caches
  'PostgreSQL', 'Postgres', 'MySQL', 'MongoDB', 'Redis', 'Cassandra', 'Elasticsearch', 'DynamoDB', 'Neo4j', 'ClickHouse', 'Prisma', 'TypeORM', 'Mongoose', 'pgvector',
  
  // Cloud & DevOps
  'AWS', 'Amazon Web Services', 'GCP', 'Google Cloud', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Helm', 'CI/CD', 'GitHub Actions', 'GitLab CI', 'Prometheus', 'Grafana', 'Kafka', 'RabbitMQ', 'NATS', 'Temporal',
  
  // Architecture & Practices
  'Microservices', 'Distributed Systems', 'Event-Driven Architecture', 'Clean Architecture', 'Domain-Driven Design', 'TDD', 'Agile', 'System Design'
];

export class SkillExtractor {
  private taxonomy: string[];

  constructor(customTaxonomy?: string[]) {
    this.taxonomy = customTaxonomy || CORE_SKILL_TAXONOMY;
  }

  /**
   * Extracts recognized technical skills from text using boundary-aware regex.
   * Zero LLM dependencies, running in < 2ms.
   */
  public extract(text: string): string[] {
    if (!text) return [];

    const foundSkills = new Set<string>();

    for (const skill of this.taxonomy) {
      // Escape special characters in skill (e.g. C++, Node.js, .js)
      const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      
      // Boundary check that handles punctuation like C++, Node.js, React.js
      const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, 'i');

      if (regex.test(text)) {
        foundSkills.add(this.canonicalize(skill));
      }
    }

    return Array.from(foundSkills);
  }

  private canonicalize(skill: string): string {
    const s = skill.toLowerCase();
    if (s === 'react' || s === 'react.js') return 'React.js';
    if (s === 'node' || s === 'node.js' || s === 'nodejs') return 'Node.js';
    if (s === 'postgres' || s === 'postgresql') return 'PostgreSQL';
    if (s === 'vue' || s === 'vue.js') return 'Vue.js';
    if (s === 'next' || s === 'next.js') return 'Next.js';
    if (s === 'express' || s === 'express.js') return 'Express.js';
    return skill;
  }
}
