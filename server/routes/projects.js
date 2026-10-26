import { Router } from 'express';
import { requireAccount } from '../auth/sessions.js';
import { noStore, protectWrites, requireDatabase } from '../middleware/accountApi.js';
import { MAX_PROJECTS, validateProject } from '../../shared/projects.js';
import { toProject } from '../serializers/project.js';

const responseData = (user) => ({ projects: user.projects.map(toProject), version: user.__v });
const fail = (response, status, code, message, fields) =>
  response.status(status).json({ error: { code, message, ...(fields ? { fields } : {}) } });
const conflict = (response) =>
  fail(
    response,
    409,
    'EDIT_CONFLICT',
    'Your account changed in another tab. Reload saved projects before trying again.',
  );

export function createProjectsRouter({ production, origins, getDatabaseStatus }) {
  const router = Router();
  router.use(
    noStore,
    protectWrites(origins),
    requireDatabase(getDatabaseStatus),
    requireAccount(production),
  );
  router.use((request, response, next) => {
    if (Object.keys(request.query).length)
      return fail(
        response,
        400,
        'INVALID_REQUEST',
        'Project requests do not accept account selectors.',
      );
    next();
  });
  router.get('/', (request, response) => response.json(responseData(request.account)));

  const mutate = (action) => async (request, response) => {
    const body = request.body;
    const keys = action === 'delete' ? ['version'] : ['project', 'version'];
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.keys(body).some((key) => !keys.includes(key)) ||
      !Number.isSafeInteger(body.version) ||
      body.version < 0
    ) {
      return fail(
        response,
        400,
        'INVALID_REQUEST',
        'Provide only the project content and its saved version.',
      );
    }
    const user = request.account; // Identity always comes from the server-side session.
    let existing;
    if (action !== 'create') {
      if (!/^[a-f0-9]{24}$/i.test(request.params.projectId))
        return fail(response, 404, 'PROJECT_NOT_FOUND', 'Project not found.');
      existing = user.projects.id(request.params.projectId);
      // Searching the owned array prevents editing or deleting another account's project.
      if (!existing) return fail(response, 404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }
    if (user.__v !== body.version) return conflict(response);
    if (action === 'delete') user.projects.pull(existing._id);
    else {
      const result = validateProject(body.project);
      if (Object.keys(result.fields).length)
        return fail(
          response,
          400,
          'VALIDATION_ERROR',
          'Please check the project fields.',
          result.fields,
        );
      if (action === 'create') {
        if (user.projects.length >= MAX_PROJECTS)
          return fail(response, 400, 'PROJECT_LIMIT', 'You can save at most 50 projects.');
        user.projects.push(result.project);
      } else existing.set(result.project); // Preserve the stable subdocument ID.
    }
    user.markModified('projects');
    try {
      await user.save();
    } catch (error) {
      if (error.name === 'VersionError') return conflict(response);
      throw error;
    }
    response.status(action === 'create' ? 201 : 200).json(responseData(user));
  };
  router.post('/', mutate('create'));
  router.put('/:projectId', mutate('update'));
  router.delete('/:projectId', mutate('delete'));
  return router;
}
