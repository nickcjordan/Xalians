// Re-exports every schema in this package plus its z.infer type. This is the single
// import surface both apps/api and apps/web use ("@xalians/content/schema"); import
// individual files directly only from inside this package.
export * from './registries.ts';
export * from './record.ts';
export * from './speciesTemplate.ts';
export * from './abilityCatalog.ts';
export * from './species.ts';
export * from './elements.ts';
export * from './planets.ts';
export * from './typeEffectiveness.ts';
export * from './glossary.ts';
export * from './encyclopedia.ts';
export * from './user.ts';
export * from './lore.ts';
export * from './legacy.ts';
