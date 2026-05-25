type TransformInput = {
  value: unknown;
};

export function trimString({ value }: TransformInput) {
  return typeof value === 'string' ? value.trim() : value;
}

export function normalizeEmail({ value }: TransformInput) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}
