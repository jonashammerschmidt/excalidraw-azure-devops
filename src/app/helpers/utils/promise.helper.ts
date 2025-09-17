export type MaybePromise<T> = T | PromiseLike<T>;
export type Thunk<T> = () => MaybePromise<T>;
export type ThunkOrValue<T> = Thunk<T> | MaybePromise<T>;

export async function resolveThunkOrValue<T>(input?: ThunkOrValue<T | null> | null): Promise<T | null | undefined> {
  if (input == null) return input;
  const value = typeof input === "function" ? (input as Thunk<T | null>)() : input;
  return await value;
}
