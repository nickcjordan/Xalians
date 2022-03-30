import React from 'react';
import { Row, Col } from 'react-bootstrap';
import textFit from '../utils/textFit';
import * as styleUtil from '../utils/styleUtil';
import * as svgUtil from '../utils/svgUtil';

class XalianSpeciesBadge extends React.Component {

	state = { symbol: null 	}

	getBgClassFromType = (type) => {
		return ` ${type.toLowerCase()}-color `;
	};

	componentDidMount() {
		this.setState({ 
			symbol: svgUtil.getSpeciesTypeSymbol(this.props.type, false, 30)
		});
		
		document.addEventListener('DOMContentLoaded', function () {
			let badgeText = document.getElementById('fitted-badge-text');
			if (badgeText) {
				// textFit(badgeText, { multiLine: false, alignHoriz: true, alignVert: true, minFontSize:12, maxFontSize: 24});
			}
		});
	}

	render() {
		var badgeWidth = this.props.hideSymbol ? 0 : 30;
		badgeWidth += this.props.hideName ? 0 : 100;
		let primaryColor = styleUtil.getTypeColor(this.props.type);
		return (
			<div className={this.getBgClassFromType(this.props.type) + ' xalian-species-badge vertically-center-contents'} style={{ width: badgeWidth, background: primaryColor, background: `radial-gradient(circle, ${primaryColor} 60%, ${primaryColor + '85'} 100%)` }}>
				<div id={this.props.id} className={'species-badge-wrapper'}>
					<Row style={{ margin: '0px', padding: '0px', height: '100%', width: '100%' }}>
						{!this.props.hideSymbol && (
							<Col xs={!this.props.hideName ? 4 : true} style={{}} className="species-badge-icon-col">
								{/* <div> */}
									{this.state.symbol}
								{/* </div> */}
							</Col>
						)}
						{!this.props.hideName && (
							<Col xs={!this.props.hideSymbol ? 8 : true} style={{  }} className="species-badge-text-col">
								<h6 className="xalian-badge-text" id="fitted-badge-text" style={{ margin: '0px' }}>
									{this.props.type.toUpperCase()}
								</h6>
								{/* <h6 className="xalian-badge-text" id='fitted-badge-text' style={{ margin: '0px', width: `${this.props.hideName ? 0 : 100}px` }} >{this.props.type.toUpperCase()}</h6> */}
							</Col>
						)}
					</Row>
				</div>
			</div>
		);
	}
}

export default XalianSpeciesBadge;
