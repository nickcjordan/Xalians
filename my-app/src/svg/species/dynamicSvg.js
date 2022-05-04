import React from 'react';
const XalianSVGIcon = ({ name, ...rest }) => {
    const [path, setPath] = React.useState(false);
    React.useEffect(() => {
        const importIcon = async () => {
            try {
                const { default: _path } = await import(`./${name}.svg`);
                setPath(_path);
            } catch (err) {
                console.error(err);
            }
        };
        importIcon();
    }, [name]);
    return <>{path && <img src={path} alt=" " />}</>;
};
export default XalianSVGIcon;