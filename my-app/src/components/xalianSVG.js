import React from 'react';

const XalianSVG = ({ name, ...rest }) => {
	const ImportedXalianSVGRef = React.useRef(null);
	const [loading, setLoading] = React.useState(false);

	React.useEffect(() => {
		setLoading(true);
		const importXalianSVG = async () => {
			try {
				ImportedXalianSVGRef.current = (await import(`../svg/${name.toLowerCase()}.svg`)).ReactComponent;
                console.log();
			} catch (err) {
				// Your own error handling logic, throwing error for the sake of
				// simplicity
				throw err;
			} finally {
				setLoading(false);
			}
		};
		importXalianSVG();
	}, [name]);

	if (!loading && ImportedXalianSVGRef.current) {
		const { current: ImportedXalianSVG } = ImportedXalianSVGRef;
		return <ImportedXalianSVG {...rest} />;
	}

	return null;
};


// export default XalianSVG;

// import React, { useEffect, useRef, useState, useCallback } from "react";

// function useDynamicSVGImport(name, options = {}) {
//   const ImportedIconRef = useRef();
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState();

//   const { onCompleted, onError } = options;
//   useEffect(() => {
//     setLoading(true);
//     const importIcon = async () => {
//       try {
//         ImportedIconRef.current = (
//           await import(`../svg/${name.toLowerCase()}.svg`)
//         ).ReactComponent;
//         if (onCompleted) {
//           onCompleted(name, ImportedIconRef.current);
//         }
//       } catch (err) {
//         if (onError) {
//           onError(err);
//         }
//         setError(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     importIcon();
//   }, [name, onCompleted, onError]);

//   return { error, loading, SvgIcon: ImportedIconRef.current };
// }

// /**
//  * Simple wrapper for dynamic SVG import hook. You can implement your own wrapper,
//  * or even use the hook directly in your components.
//  */
// const XalianSVG = ({ name, onCompleted, onError, ...rest }) => {
//   const { error, loading, SvgIcon } = useDynamicSVGImport(name, {
//     onCompleted,
//     onError
//   });
//   if (error) {
//     return error.message;
//   }
//   if (loading) {
//     return "Loading...";
//   }
//   if (SvgIcon) {
//     return <SvgIcon {...rest} />;
//   }
//   return null;
// };
export default XalianSVG;