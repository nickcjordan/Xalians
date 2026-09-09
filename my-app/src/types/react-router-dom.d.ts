// react-router-dom 5 ships no types and `@types/react-router-dom` is not
// installed in this worktree's (shared, symlinked) node_modules. This is
// the first .tsx file to import it (`Link` in xalianRecord.tsx); untyped
// rather than blocking `tsc --noEmit` for every consumer after it.
declare module 'react-router-dom';
