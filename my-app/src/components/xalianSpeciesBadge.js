import React from 'react';

class XalianSpeciesBadge extends React.Component {
	getBgClassFromType = (type) => {
		return ` ${type.toLowerCase()}-color `;
	};

	render() {
		return (
			<div className={this.getBgClassFromType(this.props.type) + ' xalian-species-badge vertically-center-contents'}>
				<h6 className="xalian-badge-text">{this.props.type.toUpperCase()}</h6>
			</div>
		);
	}
}

export default XalianSpeciesBadge;
