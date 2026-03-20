// Unusual but realistic trait combinations that make personas memorable
export type UnusualCombination = {
  id: string;
  description: string;
  requires: {
    age_min?: number;
    age_max?: number;
    educations?: string[];
    job_industries?: string[];
    locations?: string[];
    genders?: string[];
    relationship_statuses?: string[];
  };
  traits: {
    personality_quirks?: string[];
    unusual_hobbies?: string[];
    communication_styles?: string[];
    life_philosophies?: string[];
  };
  weight: number; // Base likelihood
};

export const CONTRADICTORY_COMBINATIONS: UnusualCombination[] = [
  {
    id: 'tech_luddite',
    description: 'Technology expert who refuses to own a smartphone',
    requires: {
      job_industries: ['Technology', 'Engineering', 'Telecommunications'],
    },
    traits: {
      personality_quirks: ['Uses a flip phone from 2005', 'Writes everything by hand first'],
      life_philosophies: ['Digital minimalism - believes technology should serve, not control'],
    },
    weight: 0.8,
  },
  {
    id: 'vegan_leather_crafter',
    description:
      'Passionate vegan who creates beautiful leather-like goods from mushroom materials',
    requires: {},
    traits: {
      unusual_hobbies: ['Mushroom leather crafting', 'Sustainable fashion design'],
      life_philosophies: ["Zero waste living - hasn't thrown away trash in 2 years"],
    },
    weight: 0.6,
  },
  {
    id: 'introverted_performer',
    description: 'Extreme introvert who is a professional public speaker',
    requires: {
      job_industries: ['Education', 'Media & Entertainment', 'Business Services'],
    },
    traits: {
      personality_quirks: ['Needs 2 hours alone time after any social interaction'],
      communication_styles: ['Transforms completely on stage vs. off stage'],
    },
    weight: 0.7,
  },
  {
    id: 'fitness_instructor_gym_phobia',
    description: 'Certified fitness instructor who is terrified of gyms',
    requires: {
      job_industries: ['Sports & Recreation', 'Healthcare'],
    },
    traits: {
      unusual_hobbies: ['Outdoor fitness training only', 'Bodyweight exercise specialist'],
      personality_quirks: ['Only exercises in natural settings'],
    },
    weight: 0.5,
  },
  {
    id: 'chef_cant_cook_for_self',
    description: "Professional chef who can't cook simple meals for themselves",
    requires: {
      job_industries: ['Hospitality'],
    },
    traits: {
      personality_quirks: [
        'Lives on takeout and restaurant meals',
        'Only cooks elaborate dishes for others',
      ],
    },
    weight: 0.6,
  },
  {
    id: 'wealthy_minimalist',
    description: 'Millionaire who owns less than 50 items total',
    requires: {
      age_min: 35,
      job_industries: ['Technology', 'Finance', 'Business Services'],
    },
    traits: {
      life_philosophies: ['Extreme minimalism - owns less than 100 items'],
      personality_quirks: ['Donates 90% of income to charity'],
    },
    weight: 0.4,
  },
];

export const AGE_DEFYING_COMBINATIONS: UnusualCombination[] = [
  {
    id: 'elderly_tiktok_star',
    description: '70-year-old TikTok influencer with 2 million followers',
    requires: {
      age_min: 65,
    },
    traits: {
      unusual_hobbies: ['Social media content creation', 'Dance choreography'],
      communication_styles: ['Uses current slang correctly', 'Masters new platforms quickly'],
    },
    weight: 0.3,
  },
  {
    id: 'young_old_soul',
    description: "22-year-old who collects antiques and speaks like they're from the 1940s",
    requires: {
      age_max: 25,
    },
    traits: {
      personality_quirks: ['Collects vintage items from before they were born'],
      communication_styles: ['Uses formal language from past eras'],
      unusual_hobbies: ['Vintage dance lessons', 'Historical reenactment'],
    },
    weight: 0.7,
  },
  {
    id: 'senior_startup_founder',
    description: '68-year-old who started their first tech company after retirement',
    requires: {
      age_min: 65,
      job_industries: ['Technology', 'Business Services'],
    },
    traits: {
      life_philosophies: ['Age is just a number - learning never stops'],
    },
    weight: 0.4,
  },
  {
    id: 'teen_philosophy_professor',
    description: 'Became university philosophy professor at age 19',
    requires: {
      age_max: 25,
      job_industries: ['Education'],
      educations: ['Doctorate (PhD or equivalent)'],
    },
    traits: {
      personality_quirks: ['Youngest person in every professional setting'],
    },
    weight: 0.2,
  },
];

export const CAREER_EDUCATION_MISMATCHES: UnusualCombination[] = [
  {
    id: 'phd_food_truck_owner',
    description: 'PhD in Philosophy who runs a successful food truck empire',
    requires: {
      educations: ['Doctorate (PhD or equivalent)'],
      job_industries: ['Hospitality', 'Business Services'],
    },
    traits: {
      life_philosophies: ['Found more meaning in feeding people than academic research'],
      unusual_hobbies: ['Applies philosophical principles to business decisions'],
    },
    weight: 0.6,
  },
  {
    id: 'harvard_mba_janitor',
    description: 'Harvard MBA who chose to work as a school janitor for personal fulfillment',
    requires: {
      educations: ["Master's degree", 'Professional degree (e.g., JD, MD)'],
      job_industries: ['Education', 'Government'],
    },
    traits: {
      life_philosophies: ['Values meaningful work over high salary'],
      personality_quirks: ['Mentors students during breaks'],
    },
    weight: 0.4,
  },
  {
    id: 'dropout_ceo',
    description: 'High school dropout who built a multi-million dollar company',
    requires: {
      educations: ['High school diploma or equivalent', 'Some college or university'],
      job_industries: ['Technology', 'Business Services', 'Retail'],
    },
    traits: {
      life_philosophies: ['Street smarts beat book smarts'],
      personality_quirks: ['Self-taught expert in their field'],
    },
    weight: 0.5,
  },
  {
    id: 'overqualified_barista',
    description: 'Former surgeon who became a coffee shop barista after burnout',
    requires: {
      educations: ['Professional degree (e.g., JD, MD)'],
      job_industries: ['Hospitality', 'Retail'],
    },
    traits: {
      life_philosophies: ['Chose happiness over prestige'],
      personality_quirks: ['Applies surgical precision to latte art'],
    },
    weight: 0.5,
  },
];

export const LIFESTYLE_CONTRADICTIONS: UnusualCombination[] = [
  {
    id: 'social_media_hermit',
    description: 'Social media manager who lives completely off-grid',
    requires: {
      job_industries: ['Marketing & Advertising', 'Media & Entertainment', 'Technology'],
    },
    traits: {
      life_philosophies: ['Lives off-grid but manages online presence for others'],
      personality_quirks: ['Drives 2 hours to town for internet access'],
    },
    weight: 0.4,
  },
  {
    id: 'wealthy_dumpster_diver',
    description: 'Millionaire who still dumpster dives for food to reduce waste',
    requires: {
      age_min: 35,
      job_industries: ['Technology', 'Finance', 'Business Services'],
    },
    traits: {
      life_philosophies: ["Zero waste living - hasn't thrown away trash in 2 years"],
      personality_quirks: ['Rescues perfectly good food from waste streams'],
    },
    weight: 0.3,
  },
  {
    id: 'nomad_hoarder',
    description: 'Digital nomad who somehow travels with 47 suitcases',
    requires: {
      job_industries: ['Technology', 'Marketing & Advertising', 'Media & Entertainment'],
    },
    traits: {
      personality_quirks: ["Can't throw anything away", 'Pays more in shipping than rent'],
      unusual_hobbies: ['Collecting souvenirs from every location'],
    },
    weight: 0.4,
  },
];

export const PERSONALITY_PARADOXES: UnusualCombination[] = [
  {
    id: 'shy_motivational_speaker',
    description: 'Cripplingly shy person who became a successful motivational speaker',
    requires: {
      job_industries: ['Education', 'Business Services', 'Media & Entertainment'],
    },
    traits: {
      communication_styles: ['Transforms completely when speaking publicly'],
      personality_quirks: ['Avoids eye contact in personal conversations'],
    },
    weight: 0.6,
  },
  {
    id: 'pessimist_life_coach',
    description: 'Natural pessimist who helps others find optimism',
    requires: {
      job_industries: ['Healthcare', 'Education', 'Business Services'],
    },
    traits: {
      life_philosophies: ['Helps others by showing them worst-case scenarios'],
      communication_styles: ['Uses reverse psychology effectively'],
    },
    weight: 0.5,
  },
  {
    id: 'organized_chaos_lover',
    description: 'Obsessively organized person who thrives in chaotic environments',
    requires: {
      job_industries: ['Healthcare', 'Media & Entertainment', 'Government'],
    },
    traits: {
      personality_quirks: ['Color-codes everything but loves unpredictable situations'],
      unusual_hobbies: ['Emergency response volunteering'],
    },
    weight: 0.7,
  },
];

// Combine all unusual combinations
export const ALL_UNUSUAL_COMBINATIONS: UnusualCombination[] = [
  ...CONTRADICTORY_COMBINATIONS,
  ...AGE_DEFYING_COMBINATIONS,
  ...CAREER_EDUCATION_MISMATCHES,
  ...LIFESTYLE_CONTRADICTIONS,
  ...PERSONALITY_PARADOXES,
];

// Helper function to check if a combination applies to a persona profile
export type PersonaProfile = {
  age_range: [number, number];
  genders: string[];
  locations: string[];
  educations: string[];
  job_industries: string[];
  relationship_statuses: string[];
};

export function isUnusualCombinationApplicable(
  combination: UnusualCombination,
  profile: PersonaProfile
): boolean {
  const { requires } = combination;
  const age = (profile.age_range[0] + profile.age_range[1]) / 2;

  // Check age requirements
  if (requires.age_min && age < requires.age_min) {
    return false;
  }
  if (requires.age_max && age > requires.age_max) {
    return false;
  }

  // Check array requirements
  if (requires.educations && !requires.educations.some(ed => profile.educations.includes(ed))) {
    return false;
  }
  if (
    requires.job_industries &&
    !requires.job_industries.some(job => profile.job_industries.includes(job))
  ) {
    return false;
  }
  if (requires.locations && !requires.locations.some(loc => profile.locations.includes(loc))) {
    return false;
  }
  if (requires.genders && !requires.genders.some(gender => profile.genders.includes(gender))) {
    return false;
  }
  if (
    requires.relationship_statuses &&
    !requires.relationship_statuses.some(status => profile.relationship_statuses.includes(status))
  ) {
    return false;
  }

  return true;
}
