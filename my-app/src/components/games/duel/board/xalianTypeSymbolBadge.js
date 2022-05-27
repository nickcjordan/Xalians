import React from 'react';
import { Row, Col } from 'react-bootstrap';
import textFit from '../../../../utils/textFit';
import * as styleUtil from '../../../../utils/styleUtil';
import * as svgUtil from '../../../../utils/svgUtil';

class XalianTypeSymbolBadge extends React.Component {

	state = { symbol: null 	}

	componentDidMount() {
	}

	render() {
		var badgeWidth = this.props.size || 30;
		var classes = this.props.classes || 'duel-type-badge';
		let primaryColor = styleUtil.getTypeColor(this.props.type);
		return (
			<div  className={` ${this.props.type.toLowerCase()}-color ` + ' vertically-center-contents ' + classes} style={{ height: badgeWidth, width: badgeWidth, background: primaryColor,  pointerEvents: 'none', background: `radial-gradient(circle, ${primaryColor} 60%, ${primaryColor + '85'} 100%)` }}>
             { svgUtil.getSpeciesTypeSymbol(this.props.type, false, badgeWidth - (badgeWidth * 0.25), "duel-type-badge-symbol") }
			</div>
		);
	}
}

export default XalianTypeSymbolBadge;
