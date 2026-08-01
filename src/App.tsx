import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ServerProvider } from './context/ServerContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { WelcomeView } from './components/WelcomeView';
import { SearchView } from './components/SearchView';
import { ResourceDetail } from './components/ResourceDetail';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <WelcomeView /> },
      { path: ':resourceType', element: <SearchView /> },
      { path: ':resourceType/:id', element: <ResourceDetail /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ServerProvider>
          <RouterProvider router={router} />
          <Toaster position="bottom-right" richColors closeButton />
        </ServerProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
