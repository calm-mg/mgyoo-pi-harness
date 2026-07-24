export interface SecretFinding {
  path: string;
  line: number;
  rule: string;
}

export function scanFiles(
  root: string,
  relativePaths: string[],
): Promise<SecretFinding[]>;
