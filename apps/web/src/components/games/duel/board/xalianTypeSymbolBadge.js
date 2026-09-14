import React from 'react';
import * as styleUtil from '../../../../utils/styleUtil';
import * as svgUtil from '../../../../utils/svgUtil';

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
			<div className={classes} style={{ display: 'flex', alignItems: 'center', alignContent: 'center', height: newSize, width: newSize, pointerEvents: 'none', background: `radial-gradient(circle, ${primaryColor} 60%, ${primaryColor + '85'} 100%)`, filter: 'drop-shadow(0px 0px 3px #000000)' }}>
             { svgUtil.getSpeciesTypeSymbol(this.props.type, false, newSize - (newSize * 0.2), "duel-type-badge-symbol") }
			</div>
		);
	}
}

export default XalianTypeSymbolBadge;
