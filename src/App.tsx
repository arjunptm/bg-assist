import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { GameEditorPage } from "./pages/GameEditorPage";
import { GameSetupPage } from "./pages/GameSetupPage";
import { GroupPage } from "./pages/GroupPage";
import { HomePage } from "./pages/HomePage";

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/g/:capability", element: <GroupPage /> },
  { path: "/g/:capability/games/new", element: <GameEditorPage /> },
  { path: "/g/:capability/games/:gameId/edit", element: <GameEditorPage /> },
  { path: "/g/:capability/games/:gameId/setup", element: <GameSetupPage /> }
]);

export default function App() {
  return <RouterProvider router={router} />;
}

