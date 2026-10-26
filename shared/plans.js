export const isProTier = (tier) => tier === 'pro';
export const normalizeTier = (tier) => (isProTier(tier) ? 'pro' : 'free');
export function validatePlanSelection(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !['planId', 'version'].includes(key)) ||
    !['free', 'pro'].includes(input.planId) ||
    !Number.isSafeInteger(input.version) ||
    input.version < 0
  )
    return {
      error:
        'Choose Free or Pro and provide the saved account version. Account selectors and other fields are not accepted.',
    };
  return { planId: input.planId, version: input.version };
}
export function accountPlan(tier) {
  const isPro = isProTier(tier);
  return {
    id: normalizeTier(tier),
    label: isPro ? 'Pro' : 'Free',
    features: { proBadge: isPro, customDomain: isPro },
  };
}
