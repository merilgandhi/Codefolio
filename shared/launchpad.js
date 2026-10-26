import { resolveTemplateId, SKILL_CATEGORIES, TEMPLATE_OPTIONS } from './portfolio.js';

// Readiness describes saved setup essentials; it never marks a draft as saved.
export function launchpadProgress(portfolio) {
  const projectCount = portfolio.projects.length;
  const skillCount = SKILL_CATEGORIES.reduce(
    (count, category) => count + portfolio.skills[category].length,
    0,
  );
  const template = TEMPLATE_OPTIONS.find(
    (option) => option.id === resolveTemplateId(portfolio.templateId),
  );
  const steps = [
    {
      id: 'profile',
      label: 'Tell your story',
      done: Boolean(portfolio.profile.name.trim() && portfolio.profile.bio.trim()),
      detail: 'Your name and introduction',
      title: 'Introduce the person behind the code.',
      description:
        'A few good lines about what you build can make all the difference. Add an introduction that sounds like you.',
      action: 'Write your introduction',
    },
    {
      id: 'projects',
      label: 'Add your work',
      done: projectCount > 0,
      detail: `${projectCount} ${projectCount === 1 ? 'project' : 'projects'} saved`,
      title: 'Let your work do the talking.',
      description:
        'Give visitors something to explore. Add a project, describe the idea and share the tools behind it.',
      action: 'Add your first project',
    },
    {
      id: 'skills',
      label: 'Show your toolkit',
      done: skillCount > 0,
      detail: `${skillCount} ${skillCount === 1 ? 'skill' : 'skills'} listed`,
      title: 'Show the tools behind your craft.',
      description:
        'Organize the technologies you use into Frontend, Backend and DevOps. Make your strengths easy to discover.',
      action: 'Organize your skills',
    },
    // Every account has a usable layout, including the default and legacy fallback.
    {
      id: 'templates',
      label: 'Make it yours',
      done: true,
      detail: template.name,
      title: 'Find a layout that feels like you.',
      description:
        'Explore both layouts with your saved content, then save the one that best represents your work.',
      action: 'Explore templates',
    },
  ];
  return {
    steps,
    completed: steps.filter((step) => step.done).length,
    next: steps.find((step) => !step.done) || null,
    template,
    projectCount,
    skillCount,
  };
}
