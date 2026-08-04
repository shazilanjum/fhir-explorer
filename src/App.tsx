import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ServerProvider } from './context/ServerContext';
import { ThemeProvider } from './context/ThemeContext';
import { ExperienceProvider } from './context/ExperienceContext';
import { Layout } from './components/Layout';
import { WelcomeView } from './components/WelcomeView';
import { SearchView } from './components/SearchView';
import { ResourceDetail } from './components/ResourceDetail';
import { PatientDossier } from './components/PatientDossier';
import { LandingPage } from './components/landing/LandingPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const router = createBrowserRouter([
  // Standalone — deliberately outside <Layout>, so it owns the full viewport
  // rather than sitting inside the explorer's command-bar/rail shell.
  { path: '/', element: <LandingPage /> },
  {
    path: '/explore',
    element: <Layout />,
    children: [
      { index: true, element: <WelcomeView /> },
      // More specific than :resourceType/:id, so it must be declared first.
      { path: 'Patient/:id/dossier', element: <PatientDossier /> },
      { path: ':resourceType', element: <SearchView /> },
      { path: ':resourceType/:id', element: <ResourceDetail /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ExperienceProvider>
          <ServerProvider>
            <RouterProvider router={router} />
            <Toaster position="bottom-right" richColors closeButton />
          </ServerProvider>
        </ExperienceProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
