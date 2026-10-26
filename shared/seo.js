import { publicUsername } from './publicRoutes.js';

export const HOME_METADATA = Object.freeze({
  title: 'CodeFolio — Your next chapter',
  description: 'CodeFolio helps developers build a portfolio that tells their story.',
  robots: 'index, follow',
});

function compact(value) {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';
}

function shorten(value, limit) {
  const characters = Array.from(value);
  return characters.length > limit
    ? `${characters
        .slice(0, limit - 1)
        .join('')
        .trimEnd()}…`
    : value;
}

export function portfolioMetadata(portfolio) {
  const name = compact(portfolio.profile?.name) || compact(portfolio.username) || 'Developer';
  return {
    title: `${shorten(name, 80)} | Developer Portfolio`,
    description: shorten(
      compact(portfolio.profile?.bio) || `Explore ${name}'s projects, skills and development work.`,
      160,
    ),
    robots: 'index, follow',
  };
}

export function publicPageMetadata(result) {
  if (result?.status === 200 && result.portfolio) return portfolioMetadata(result.portfolio);
  if (result?.status === 404)
    return {
      title: 'Portfolio not found | CodeFolio',
      description: 'This developer portfolio could not be found. Check the username in the link.',
      robots: 'noindex, nofollow',
    };
  return {
    title:
      result?.status === 503
        ? 'Portfolio unavailable | CodeFolio'
        : 'Loading portfolio | CodeFolio',
    description:
      result?.status === 503
        ? 'This developer portfolio is temporarily unavailable. Please try again shortly.'
        : 'Loading a developer portfolio on CodeFolio.',
    robots: 'noindex, nofollow',
  };
}

export function routeMetadata(pathname) {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (path === '/') return HOME_METADATA;
  const accountTitles = {
    '/login': 'Sign in',
    '/register': 'Create an account',
    '/dashboard': 'Your workspace',
  };
  if (Object.hasOwn(accountTitles, path))
    return {
      title: `${accountTitles[path]} | CodeFolio`,
      description: 'Manage your developer portfolio in your private CodeFolio workspace.',
      robots: 'noindex, nofollow',
    };
  if (publicUsername(path.slice(1)) || /^\/user\/[^/]+$/.test(path))
    return publicPageMetadata(null);
  return {
    title: 'Page not found | CodeFolio',
    description: 'The page you requested could not be found on CodeFolio.',
    robots: 'noindex, nofollow',
  };
}
