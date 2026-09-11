declare module 'virtual:xalians-home-data' {
	export type HomeWorld = {
		key: string;
		name: string;
		element: string;
		planetImage: string;
	};

	export type HomeSpecies = {
		id: string;
		name: string;
		type: string;
	};

	export const worlds: HomeWorld[];
	export const species: HomeSpecies[];
}
