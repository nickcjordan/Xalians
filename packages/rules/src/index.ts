/*
	@xalians/rules: the ratified creature generator (packages/rules), currently the only
	member of this package. Re-exported here so a consumer that wants "the rules package"
	rather than "the generator specifically" has one import; `@xalians/rules/generator` is
	the more precise import most call sites use.
*/
export * from './generator/index.ts';
