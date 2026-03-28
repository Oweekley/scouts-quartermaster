export async function resolveParams<T>(params: T | Promise<T>): Promise<T> {
  return await params;
}

