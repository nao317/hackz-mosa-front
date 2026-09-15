import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("search", "routes/search.tsx"),
	route("mypage", "routes/mypage.tsx"),
	route("map", "routes/map.tsx"),
	route("playlists", "routes/playlists.tsx"),
	route("playlists/:feedback", "routes/feedback-playlist.tsx"),
] satisfies RouteConfig;
