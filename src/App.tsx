import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { GameEditorPage } from "./pages/GameEditorPage";
import { GameSetupPage } from "./pages/GameSetupPage";
import { GroupPage } from "./pages/GroupPage";
import { HomePage } from "./pages/HomePage";
import { RouteErrorPage } from "./pages/RouteErrorPage";

const router = createBrowserRouter([
  { path: "/", element: <HomePage />, errorElement: <RouteErrorPage /> },
  { path: "/g/:capability", element: <GroupPage />, errorElement: <RouteErrorPage /> },
  {
    path: "/g/:capability/games/new",
    element: <GameEditorPage />,
    errorElement: <RouteErrorPage />
  },
  {
    path: "/g/:capability/games/:gameId/edit",
    element: <GameEditorPage />,
    errorElement: <RouteErrorPage />
  },
  {
    path: "/g/:capability/games/:gameId/setup",
    element: <GameSetupPage />,
    errorElement: <RouteErrorPage />
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}

