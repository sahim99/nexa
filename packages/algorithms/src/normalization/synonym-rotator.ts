export class SynonymRotator {
  private static readonly TECH_THESAURUS: Record<string, string[]> = {
    'Node.js': ['Node.js', 'NodeJS', 'Node', 'node.js'],
    'React.js': ['React.js', 'ReactJS', 'React', 'react.js'],
    'TypeScript': ['TypeScript', 'TS', 'typescript'],
    'JavaScript': ['JavaScript', 'JS', 'javascript'],
    'PostgreSQL': ['PostgreSQL', 'Postgres', 'postgres', 'pgsql'],
    'MongoDB': ['MongoDB', 'Mongo', 'mongodb'],
    'Kubernetes': ['Kubernetes', 'K8s', 'kubernetes', 'k8s'],
    'Amazon Web Services': ['Amazon Web Services', 'AWS', 'aws'],
    'Google Cloud': ['Google Cloud', 'GCP', 'Google Cloud Platform'],
    'Docker': ['Docker', 'docker containerization', 'docker'],
    'TailwindCSS': ['TailwindCSS', 'Tailwind CSS', 'Tailwind']
  };

  /**
   * Deterministically rotates a skill synonym based on day of year.
   * If dayOfYear is omitted, uses the current day of year.
   */
  public static rotate(skill: string, dayOfYear?: number): string {
    const list = SynonymRotator.TECH_THESAURUS[skill] || [skill];
    const day = dayOfYear !== undefined ? dayOfYear : SynonymRotator.getDayOfYear();
    const index = Math.abs(day) % list.length;
    return list[index];
  }

  public static getDayOfYear(date: Date = new Date()): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }
}
