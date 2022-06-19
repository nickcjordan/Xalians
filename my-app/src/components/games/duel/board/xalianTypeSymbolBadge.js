import React from 'react';
import { Row, Col } from 'react-bootstrap';
import textFit from '../../../../utils/textFit';
import * as styleUtil from '../../../../utils/styleUtil';
import * as svgUtil from '../../../../utils/svgUtil';
import gsap from 'gsap';

class XalianTypeSymbolBadge extends React.Component {

	state = { symbol: null 	}

	componentDidMount() {
	}

	render() {
		var badgeWidth = this.props.size || 30;
		var classes = this.props.classes || 'duel-type-badge';
		let newSize = Math.max(20, badgeWidth);
		let primaryColor = styleUtil.getTypeColor(this.props.type);
		return (
			<div  className={` ${this.props.type.toLowerCase()}-color ` + ' vertically-center-contents ' + classes} style={{ height: newSize, width: newSize, background: primaryColor,  pointerEvents: 'none', background: `radial-gradient(circle, ${primaryColor} 60%, ${primaryColor + '85'} 100%)`, filter: 'drop-shadow(0px 0px 3px #000000)' }}>
             { svgUtil.getSpeciesTypeSymbol(this.props.type, false, newSize - (newSize * 0.2), "duel-type-badge-symbol") }
			</div>
		);
	}
}

export default XalianTypeSymbolBadge;
