import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { FavoritesProvider } from './features/favorites/favorites-provider';
import { ThemeProvider } from './features/theme/theme-provider';
import { router } from './router';
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FavoritesProvider>
          <RouterProvider router={router} />
        </FavoritesProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
