import {
    type RouteConfig,
    index, prefix, route,
} from "@react-router/dev/routes";

export default [
    index("./home.tsx"),

    ...prefix("bus", [
        index("./buses.tsx"),
        route(":ServiceNo", "./bus.tsx"),
    ])
] satisfies RouteConfig;