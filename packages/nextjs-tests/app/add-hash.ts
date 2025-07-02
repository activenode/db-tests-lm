import { v4 } from "uuid";

export function addHash<T extends object>(
  obj: T,
): T & { hash: string } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (obj as any).hash = v4();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return obj as any;
}
