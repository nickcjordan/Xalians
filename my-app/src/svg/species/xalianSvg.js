import React, { useRef } from 'react';
import SVG, { Props as SVGProps } from 'react-inlinesvg';


class XalianSVG extends React.Component {

    render() {
            const figz = require(`./${this.props.name}.svg`).default;
        return (<React.Fragment>
            {figz &&
                <SVG src={figz} onError={(error) => console.log(error.message)} style={this.props.style} className={this.props.className}/>
            }
        </React.Fragment>
        );
    }
}



export default XalianSVG;