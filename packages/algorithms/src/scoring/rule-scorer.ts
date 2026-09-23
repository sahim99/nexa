export interface ScorerUserProfile {
  targetRoles: string[];
  skills: string[];
  preferredStages?: string[];
  locations?: string[];
  minSalary?: number;
}

export interface ScorableJob {
  id?: string;
  title: string;
  description?: string;
  company?: string;
  companyStage?: string;
  location?: string;
  postedAt?: Date | string;
  salaryMin?: number;
  salaryMax?: number;
}

export interface RuleScoreResult {
  score: number;
  reasons: string[];
  breakdown: {
    role: number;
    skills: number;
    stage: number;
    location: number;
    recency: number;
    salary: number;
  };
}

export class RuleScorer {
  /**
   * Deterministic rule-based scoring across 6 dimensions (Max 100 points).
   * Execution time < 1ms.
   */
  public score(job: ScorableJob, profile: ScorerUserProfile): RuleScoreResult {
    const reasons: string[] = [];

    // 1. Role match: 0-30 points
    const { roleScore, roleReason } = this.scoreRole(job.title, profile.targetRoles);
    if (roleReason) reasons.push(roleReason);

    // 2. Skills match: 0-20 points
    const { skillsScore, skillsReason } = this.scoreSkills(job.description || '', profile.skills);
    if (skillsReason) reasons.push(skillsReason);

    // 3. Company stage: 0-15 points
    const { stageScore, stageReason } = this.scoreStage(job.companyStage, profile.preferredStages);
    if (stageReason) reasons.push(stageReason);

    // 4. Location: 0-10 points
    const { locationScore, locationReason } = this.scoreLocation(job.location, profile.locations);
    if (locationReason) reasons.push(locationReason);

    // 5. Recency: 0-15 points
    const { recencyScore, recencyReason } = this.scoreRecency(job.postedAt);
    if (recencyReason) reasons.push(recencyReason);

    // 6. Salary: 0-10 points
    const { salaryScore, salaryReason } = this.scoreSalary(job.salaryMin, profile.minSalary);
    if (salaryReason) reasons.push(salaryReason);

    const totalScore = roleScore + skillsScore + stageScore + locationScore + recencyScore + salaryScore;

    return {
      score: Math.min(100, totalScore),
      reasons,
      breakdown: {
        role: roleScore,
        skills: skillsScore,
        stage: stageScore,
        location: locationScore,
        recency: recencyScore,
        salary: salaryScore
      }
    };
  }

  private scoreRole(rawTitle: string, targetRoles: string[]): { roleScore: number; roleReason: string } {
    if (!rawTitle) return { roleScore: 0, roleReason: '' };
    const title = rawTitle.toLowerCase();

    // Check exact target roles match
    for (const target of targetRoles) {
      if (title.includes(target.toLowerCase())) {
        return { roleScore: 30, roleReason: `Role matches target: '${target}'` };
      }
    }

    // Partial keywords match
    const keywords = ['engineer', 'developer', 'backend', 'fullstack', 'platform', 'architect'];
    for (const kw of keywords) {
      if (title.includes(kw)) {
        return { roleScore: 15, roleReason: `Role contains keyword: '${kw}'` };
      }
    }

    return { roleScore: 0, roleReason: '' };
  }

  private scoreSkills(description: string, userSkills: string[]): { skillsScore: number; skillsReason: string } {
    if (!description || !userSkills || userSkills.length === 0) {
      return { skillsScore: 0, skillsReason: '' };
    }

    const desc = description.toLowerCase();
    const matched: string[] = [];

    for (const skill of userSkills) {
      if (desc.includes(skill.toLowerCase())) {
        matched.push(skill);
      }
    }

    if (matched.length >= 5) {
      return { skillsScore: 20, skillsReason: `${matched.length} key skills match (${matched.slice(0, 4).join(', ')}...)` };
    } else if (matched.length >= 3) {
      return { skillsScore: 15, skillsReason: `${matched.length} key skills match (${matched.join(', ')})` };
    } else if (matched.length >= 1) {
      return { skillsScore: 10, skillsReason: `${matched.length} key skills match (${matched.join(', ')})` };
    }

    return { skillsScore: 0, skillsReason: '' };
  }

  private scoreStage(companyStage?: string, preferredStages?: string[]): { stageScore: number; stageReason: string } {
    if (!companyStage || !preferredStages || preferredStages.length === 0) {
      return { stageScore: 0, stageReason: '' };
    }

    const stage = companyStage.toLowerCase();
    for (const pref of preferredStages) {
      if (stage.includes(pref.toLowerCase())) {
        return { stageScore: 15, stageReason: `Company stage aligns with preference: ${companyStage}` };
      }
    }

    return { stageScore: 0, stageReason: '' };
  }

  private scoreLocation(location?: string, preferredLocations?: string[]): { locationScore: number; locationReason: string } {
    if (!location) return { locationScore: 0, locationReason: '' };
    const loc = location.toLowerCase();

    if (loc.includes('remote')) {
      return { locationScore: 10, locationReason: 'Remote position available' };
    }

    if (preferredLocations) {
      for (const pref of preferredLocations) {
        if (loc.includes(pref.toLowerCase())) {
          return { locationScore: 10, locationReason: `Location matched: ${location}` };
        }
      }
    }

    return { locationScore: 0, locationReason: '' };
  }

  private scoreRecency(postedAt?: Date | string): { recencyScore: number; recencyReason: string } {
    if (!postedAt) {
      return { recencyScore: 5, recencyReason: 'Posting date unspecified' };
    }

    const date = new Date(postedAt);
    if (isNaN(date.getTime())) {
      return { recencyScore: 5, recencyReason: 'Posting date unspecified' };
    }

    const msDiff = Date.now() - date.getTime();
    const daysOld = Math.floor(msDiff / (1000 * 60 * 60 * 24));

    if (daysOld <= 3) {
      return { recencyScore: 15, recencyReason: 'Posted recently within 3 days' };
    } else if (daysOld <= 7) {
      return { recencyScore: 12, recencyReason: 'Posted within 1 week' };
    } else if (daysOld <= 14) {
      return { recencyScore: 8, recencyReason: 'Posted within 2 weeks' };
    } else if (daysOld <= 30) {
      return { recencyScore: 5, recencyReason: 'Posted within 1 month' };
    }

    return { recencyScore: 0, recencyReason: `Posted ${daysOld} days ago` };
  }

  private scoreSalary(salaryMin?: number, targetMinSalary?: number): { salaryScore: number; salaryReason: string } {
    if (!salaryMin || !targetMinSalary) {
      return { salaryScore: 0, salaryReason: '' };
    }

    if (salaryMin >= targetMinSalary) {
      return { salaryScore: 10, salaryReason: `Salary meets target ($${salaryMin.toLocaleString()})` };
    } else if (salaryMin >= targetMinSalary * 0.8) {
      return { salaryScore: 5, salaryReason: `Salary within 80% of target ($${salaryMin.toLocaleString()})` };
    }

    return { salaryScore: 0, salaryReason: '' };
  }
}
