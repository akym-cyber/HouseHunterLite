export type AppPageParams = Record<string, string>;

export type AppSearchParams = Record<string, string | string[] | undefined>;

export type AppPageProps<
  TParams extends AppPageParams = Record<string, never>,
  TSearchParams extends AppSearchParams = AppSearchParams
> = {
  params?: Promise<TParams>;
  searchParams?: Promise<TSearchParams>;
};
