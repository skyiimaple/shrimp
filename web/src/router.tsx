import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { AppShell } from './components/app-shell'
import { HomePage } from './routes/index'
import { ToolPage } from './routes/tool'
const rootRoute = createRootRoute({ component: AppShell })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage })
const toolRoute = createRoute({ getParentRoute: () => rootRoute, path: '/tools/$slug', component: ToolPage })
const routeTree = rootRoute.addChildren([indexRoute, toolRoute])
export const router = createRouter({ routeTree, defaultPreload: 'intent' })
declare module '@tanstack/react-router' { interface Register { router: typeof router } }
