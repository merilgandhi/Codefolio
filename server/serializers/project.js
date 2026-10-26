export function toProject(project) {
  return {
    id: String(project._id),
    title: project.title,
    description: project.description,
    techStack: [...project.techStack],
    repoLink: project.repoLink,
    liveLink: project.liveLink,
    screenshot: project.screenshot,
  };
}
