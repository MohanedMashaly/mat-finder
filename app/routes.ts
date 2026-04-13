import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  // Public auth routes
  route("signup", "routes/signup.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),

  // Requires auth — onboarding (no sidebar)
  route("onboarding", "routes/onboarding.tsx"),

  // Requires auth + profile — main app with sidebar
  layout("components/AppLayout.tsx", [
    index("routes/home.tsx"),
    route("my-belt", "routes/my-belt.tsx"),
    route("settings", "routes/settings.tsx"),
  ]),
] satisfies RouteConfig;
