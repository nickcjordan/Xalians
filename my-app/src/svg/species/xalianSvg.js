import React, { useRef } from 'react';
import SVG, { Props as SVGProps } from 'react-inlinesvg';


class XalianSVG extends React.Component {

    render() {
            const elem = require(`./${this.props.name}.svg`).default;
        return (<React.Fragment>
            {elem &&
                <SVG src={elem} onError={(error) => console.log(error.message)} style={this.props.style} className={this.props.className}/>
            }
        </React.Fragment>
        );
    }
}



export default XalianSVG;